using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using RAGnosis.Api.Configuration;
using RAGnosis.Api.Models;
using RAGnosis.Api.Services.Abstractions;

namespace RAGnosis.Api.Services;

public sealed class TokenService(IOptions<JwtSettings> options) : ITokenService
{
    private readonly JwtSettings _settings = options.Value;

    public (string Token, DateTime ExpiresAt) CreateToken(User user)
    {
        var expiresAt = DateTime.UtcNow.AddHours(_settings.ExpiryHours);

        // Claim names are emitted verbatim so existing clients keep working.
        var claims = new List<Claim>
        {
            new("sub", user.Id ?? string.Empty),
            new("user_id", user.Id ?? string.Empty),
            new("email", user.Email),
            new("role", user.Role),
            new("name", user.Name),
            new(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString("N")),
            // ClaimTypes.Role keeps [Authorize(Roles = ...)] working alongside the short "role" claim.
            new(ClaimTypes.Role, user.Role)
        };

        var credentials = new SigningCredentials(BuildSigningKey(_settings.Key), SecurityAlgorithms.HmacSha256);

        var token = new JwtSecurityToken(
            issuer: _settings.Issuer,
            audience: _settings.Audience,
            claims: claims,
            notBefore: DateTime.UtcNow,
            expires: expiresAt,
            signingCredentials: credentials);

        var handler = new JwtSecurityTokenHandler();
        handler.SetDefaultTimesOnTokenCreation = false;

        return (handler.WriteToken(token), expiresAt);
    }

    /// <summary>
    /// HS256 requires a key of at least 256 bits. Short configured secrets are stretched with
    /// SHA-256 rather than rejected, so a secret that worked before still produces a valid key here.
    /// </summary>
    public static SymmetricSecurityKey BuildSigningKey(string configuredKey)
    {
        if (string.IsNullOrWhiteSpace(configuredKey))
            throw new InvalidOperationException("Jwt:Key is not configured.");

        var bytes = Encoding.UTF8.GetBytes(configuredKey);
        if (bytes.Length >= 32)
            return new SymmetricSecurityKey(bytes);

        var padded = new byte[32];
        var digest = SHA256.HashData(bytes);
        Buffer.BlockCopy(digest, 0, padded, 0, 32);
        return new SymmetricSecurityKey(padded);
    }
}

public sealed class CurrentUser(IHttpContextAccessor accessor) : ICurrentUser
{
    private ClaimsPrincipal? Principal => accessor.HttpContext?.User;

    public string? UserId =>
        Principal?.FindFirst("user_id")?.Value
        ?? Principal?.FindFirst("sub")?.Value
        ?? Principal?.FindFirst(ClaimTypes.NameIdentifier)?.Value;

    public string? Email =>
        Principal?.FindFirst("email")?.Value ?? Principal?.FindFirst(ClaimTypes.Email)?.Value;

    public string? Role =>
        Principal?.FindFirst("role")?.Value ?? Principal?.FindFirst(ClaimTypes.Role)?.Value;

    public bool IsAuthenticated => Principal?.Identity?.IsAuthenticated == true;

    public bool IsInRole(params string[] roles) =>
        Role is not null && roles.Any(r => string.Equals(r, Role, StringComparison.OrdinalIgnoreCase));
}
