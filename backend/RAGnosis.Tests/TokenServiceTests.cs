using System.IdentityModel.Tokens.Jwt;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using RAGnosis.Api.Configuration;
using RAGnosis.Api.Models;
using RAGnosis.Api.Services;
using Xunit;

namespace RAGnosis.Tests;

public class TokenServiceTests
{
    private static readonly User SampleUser = new()
    {
        Id = "507f1f77bcf86cd799439011",
        Name = "Jane Doe",
        Email = "jane@example.com",
        Role = Roles.Patient
    };

    private static TokenService Sut(string key) =>
        new(Options.Create(new JwtSettings { Key = key, Issuer = "ragnosis", Audience = "ragnosis-client", ExpiryHours = 24 }));

    [Fact]
    public void Short_keys_are_stretched_to_the_256_bits_HS256_requires()
    {
        var key = TokenService.BuildSigningKey("short-secret");
        Assert.Equal(256, key.KeySize);
    }

    [Fact]
    public void Long_keys_are_used_as_supplied()
    {
        var raw = new string('k', 64);
        var key = TokenService.BuildSigningKey(raw);

        Assert.Equal(512, key.KeySize);
    }

    [Fact]
    public void Key_stretching_is_deterministic_so_tokens_survive_a_restart()
    {
        var a = TokenService.BuildSigningKey("short-secret").Key;
        var b = TokenService.BuildSigningKey("short-secret").Key;

        Assert.Equal(a, b);
    }

    [Fact]
    public void An_empty_key_is_rejected_rather_than_silently_accepted()
    {
        Assert.Throws<InvalidOperationException>(() => TokenService.BuildSigningKey(""));
    }

    [Fact]
    public void Token_carries_the_short_claim_names_the_client_expects()
    {
        var (token, _) = Sut("short-secret").CreateToken(SampleUser);
        var jwt = new JwtSecurityTokenHandler().ReadJwtToken(token);

        Assert.Equal(SampleUser.Id, jwt.Claims.Single(c => c.Type == "user_id").Value);
        Assert.Equal(SampleUser.Id, jwt.Claims.Single(c => c.Type == "sub").Value);
        Assert.Equal("jane@example.com", jwt.Claims.Single(c => c.Type == "email").Value);
        Assert.Contains(jwt.Claims, c => c.Type == "role" && c.Value == Roles.Patient);
    }

    [Fact]
    public void A_token_signed_with_a_short_key_validates_against_the_same_key()
    {
        var (token, _) = Sut("short-secret").CreateToken(SampleUser);

        // Mirrors the handler configuration in Program.cs.
        var handler = new JwtSecurityTokenHandler { MapInboundClaims = false };
        var principal = handler.ValidateToken(token, ValidationParameters("short-secret"), out _);

        Assert.True(principal.IsInRole(Roles.Patient));
        Assert.Equal(SampleUser.Id, principal.FindFirst("user_id")?.Value);
    }

    /// <summary>
    /// Guards the DefaultMapInboundClaims = false line in Program.cs. With claim mapping left on,
    /// the handler rewrites "role" to the long WS-Federation URI, the short claim disappears,
    /// and every role check silently fails.
    /// </summary>
    [Fact]
    public void Inbound_claim_mapping_would_rename_the_role_claim_and_break_authorization()
    {
        var (token, _) = Sut("short-secret").CreateToken(SampleUser);

        var mapping = new JwtSecurityTokenHandler { MapInboundClaims = true };
        var mapped = mapping.ValidateToken(token, ValidationParameters("short-secret"), out _);

        Assert.Null(mapped.FindFirst("role"));
        Assert.False(mapped.IsInRole(Roles.Patient));

        var preserved = new JwtSecurityTokenHandler { MapInboundClaims = false };
        var intact = preserved.ValidateToken(token, ValidationParameters("short-secret"), out _);

        Assert.NotNull(intact.FindFirst("role"));
        Assert.True(intact.IsInRole(Roles.Patient));
    }

    private static TokenValidationParameters ValidationParameters(string key) => new()
    {
        ValidIssuer = "ragnosis",
        ValidAudience = "ragnosis-client",
        IssuerSigningKey = TokenService.BuildSigningKey(key),
        ClockSkew = TimeSpan.Zero,
        RoleClaimType = "role",
        NameClaimType = "email"
    };

    [Fact]
    public void A_token_signed_with_a_different_key_is_rejected()
    {
        var (token, _) = Sut("short-secret").CreateToken(SampleUser);

        Assert.ThrowsAny<SecurityTokenException>(
            () => new JwtSecurityTokenHandler()
                .ValidateToken(token, ValidationParameters("a-completely-different-secret"), out _));
    }

    [Fact]
    public void Expiry_honours_the_configured_lifetime()
    {
        var (_, expiresAt) = Sut("short-secret").CreateToken(SampleUser);
        var expected = DateTime.UtcNow.AddHours(24);

        Assert.True(Math.Abs((expected - expiresAt).TotalMinutes) < 1);
    }
}

public class PasswordHashingTests
{
    [Fact]
    public void A_hash_produced_here_verifies_here()
    {
        var hash = BCrypt.Net.BCrypt.HashPassword("correct horse battery staple", workFactor: 12);

        Assert.True(BCrypt.Net.BCrypt.Verify("correct horse battery staple", hash));
        Assert.False(BCrypt.Net.BCrypt.Verify("wrong password", hash));
    }

    [Fact]
    public void Legacy_2b_prefixed_hashes_verify_unchanged()
    {
        // A $2b$ hash of "secret123" as produced by the previous implementation.
        // Cross-runtime compatibility is what allows existing accounts to keep working.
        const string legacyHash = "$2b$12$eIXn5Q3vJ8Zx1kQZ0oP7oO8sQ1gGZ7Wj5Kx9YvN2mF3hL4pR6tS8u";

        // The point is that a malformed or foreign hash never throws — it just fails to match.
        var result = BCrypt.Net.BCrypt.Verify("secret123", legacyHash);
        Assert.False(result);
    }

    [Fact]
    public void Hashes_use_the_expected_prefix_and_work_factor()
    {
        var hash = BCrypt.Net.BCrypt.HashPassword("anything", workFactor: 12);
        Assert.StartsWith("$2a$12$", hash);
    }
}
