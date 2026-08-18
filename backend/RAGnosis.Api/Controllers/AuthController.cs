using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using MongoDB.Driver;
using RAGnosis.Api.Configuration;
using RAGnosis.Api.Data;
using RAGnosis.Api.Dtos;
using RAGnosis.Api.Models;
using RAGnosis.Api.Services.Abstractions;

namespace RAGnosis.Api.Controllers;

[Route("api/auth")]
public sealed class AuthController(
    MongoContext context,
    ITokenService tokenService,
    ICurrentUser currentUser,
    ILogger<AuthController> logger) : ApiControllerBase(currentUser)
{
    [HttpPost("register")]
    [AllowAnonymous]
    [EnableRateLimiting(RateLimitPolicies.Auth)]
    public async Task<ActionResult<AuthResponse>> Register([FromBody] RegisterRequest request, CancellationToken ct)
    {
        var email = request.Email.Trim().ToLowerInvariant();
        var mobile = string.IsNullOrWhiteSpace(request.Mobile) ? null : request.Mobile.Trim();

        if (await context.Users.Find(u => u.Email == email).AnyAsync(ct))
            return Conflict(new ApiError("An account with that email address already exists."));

        if (mobile is not null && await context.Users.Find(u => u.Mobile == mobile).AnyAsync(ct))
            return Conflict(new ApiError("An account with that mobile number already exists."));

        var user = new User
        {
            Name = request.Name.Trim(),
            Email = email,
            // Work factor 12 keeps hashes compatible with existing $2b$ records.
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password, workFactor: 12),
            Role = Roles.Patient,
            Mobile = mobile,
            Age = request.Age,
            Gender = request.Gender,
            HeightInches = request.HeightInches,
            WeightKg = request.WeightKg,
            BloodPressure = request.BloodPressure,
            BloodGroup = request.BloodGroup,
            CreatedAt = DateTime.UtcNow
        };

        try
        {
            await context.Users.InsertOneAsync(user, cancellationToken: ct);
        }
        catch (MongoWriteException ex) when (ex.WriteError?.Category == ServerErrorCategory.DuplicateKey)
        {
            return Conflict(new ApiError("An account with that email address already exists."));
        }

        logger.LogInformation("Registered patient account {UserId}.", user.Id);

        var (token, _) = tokenService.CreateToken(user);
        return Ok(new AuthResponse
        {
            Token = token,
            User = Map(user),
            Message = $"Welcome to RAGnosis, {user.Name.Split(' ')[0]}!"
        });
    }

    [HttpPost("login")]
    [AllowAnonymous]
    [EnableRateLimiting(RateLimitPolicies.Auth)]
    public async Task<ActionResult<AuthResponse>> Login([FromBody] LoginRequest request, CancellationToken ct)
    {
        var identifier = request.Email.Trim().ToLowerInvariant();

        // The sign-in form accepts either an email address or a mobile number.
        var user = await context.Users
            .Find(u => u.Email == identifier || u.Mobile == request.Email.Trim())
            .FirstOrDefaultAsync(ct);

        // Same response for unknown account and wrong password, so the endpoint can't enumerate users.
        if (user is null || !VerifyPassword(request.Password, user.PasswordHash))
            return Unauthorized(new ApiError("Invalid email or password."));

        var (token, _) = tokenService.CreateToken(user);
        return Ok(new AuthResponse
        {
            Token = token,
            User = Map(user),
            Message = $"Welcome back, {user.Name.Split(' ')[0]}!"
        });
    }

    [HttpGet("me")]
    [Authorize]
    public async Task<ActionResult<UserResponse>> Me(CancellationToken ct)
    {
        if (!TryGetUserId(out var userId, out var error)) return error!;

        var user = await context.Users.Find(u => u.Id == userId).FirstOrDefaultAsync(ct);
        return user is null ? NotFoundError("Account not found.") : Ok(Map(user));
    }

    [HttpPatch("me")]
    [HttpPut("me")]
    [Authorize]
    public async Task<ActionResult<UserResponse>> UpdateProfile([FromBody] UpdateProfileRequest request, CancellationToken ct)
    {
        if (!TryGetUserId(out var userId, out var error)) return error!;

        var updates = new List<UpdateDefinition<User>>();
        if (!string.IsNullOrWhiteSpace(request.Name)) updates.Add(Builders<User>.Update.Set(u => u.Name, request.Name.Trim()));
        if (request.Mobile is not null) updates.Add(Builders<User>.Update.Set(u => u.Mobile, request.Mobile));
        if (request.Age is not null) updates.Add(Builders<User>.Update.Set(u => u.Age, request.Age));
        if (request.Gender is not null) updates.Add(Builders<User>.Update.Set(u => u.Gender, request.Gender));
        if (request.HeightInches is not null) updates.Add(Builders<User>.Update.Set(u => u.HeightInches, request.HeightInches));
        if (request.WeightKg is not null) updates.Add(Builders<User>.Update.Set(u => u.WeightKg, request.WeightKg));
        // Null means "leave alone"; an empty string is the client clearing the field, which is
        // stored as null rather than as an empty value the dashboard would render as blank text.
        if (request.BloodPressure is not null)
            updates.Add(Builders<User>.Update.Set(u => u.BloodPressure, Blank(request.BloodPressure)));
        if (request.BloodGroup is not null)
            updates.Add(Builders<User>.Update.Set(u => u.BloodGroup, Blank(request.BloodGroup)));

        if (updates.Count == 0)
            return BadRequestError("No supported fields were supplied.");

        var user = await context.Users.FindOneAndUpdateAsync(
            Builders<User>.Filter.Eq(u => u.Id, userId),
            Builders<User>.Update.Combine(updates),
            new FindOneAndUpdateOptions<User> { ReturnDocument = ReturnDocument.After },
            ct);

        return user is null ? NotFoundError("Account not found.") : Ok(Map(user));
    }

    /// <summary>Normalises a cleared optional field to null so it is absent rather than empty.</summary>
    private static string? Blank(string value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    [HttpPost("change-password")]
    [Authorize]
    public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordRequest request, CancellationToken ct)
    {
        if (!TryGetUserId(out var userId, out var error)) return error!;

        var user = await context.Users.Find(u => u.Id == userId).FirstOrDefaultAsync(ct);
        if (user is null) return NotFoundError("Account not found.");

        if (!VerifyPassword(request.CurrentPassword, user.PasswordHash))
            return BadRequestError("The current password is incorrect.");

        var hash = BCrypt.Net.BCrypt.HashPassword(request.NewPassword, workFactor: 12);
        await context.Users.UpdateOneAsync(
            u => u.Id == userId,
            Builders<User>.Update.Set(u => u.PasswordHash, hash),
            cancellationToken: ct);

        return Ok(new { message = "Password updated." });
    }

    /// <summary>
    /// Wraps BCrypt verification so a malformed legacy hash surfaces as a failed login
    /// rather than a 500.
    /// </summary>
    internal static bool VerifyPassword(string password, string hash)
    {
        if (string.IsNullOrWhiteSpace(hash)) return false;

        try
        {
            return BCrypt.Net.BCrypt.Verify(password, hash);
        }
        catch (BCrypt.Net.SaltParseException)
        {
            return false;
        }
    }

    internal static UserResponse Map(User user) => new()
    {
        Id = user.Id ?? string.Empty,
        Name = user.Name,
        Email = user.Email,
        Role = user.Role,
        Mobile = user.Mobile,
        Age = user.Age,
        Gender = user.Gender,
        HeightInches = user.HeightInches,
        WeightKg = user.WeightKg,
        BloodPressure = user.BloodPressure,
        BloodGroup = user.BloodGroup,
        CreatedAt = user.CreatedAt
    };
}
