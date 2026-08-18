using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace RAGnosis.Api.Dtos;

// The global policy serialises PascalCase properties as snake_case.
// Mongo's "_id" is surfaced explicitly with [JsonPropertyName] where the client expects it.

public sealed class RegisterRequest
{
    [Required, StringLength(120, MinimumLength = 2)]
    public string Name { get; set; } = string.Empty;

    [Required, EmailAddress, StringLength(200)]
    public string Email { get; set; } = string.Empty;

    [Required, StringLength(128, MinimumLength = 6)]
    public string Password { get; set; } = string.Empty;

    public string? Mobile { get; set; }

    [Range(0, 130)]
    public int? Age { get; set; }

    public string? Gender { get; set; }

    [Range(0, 120)]
    public double? HeightInches { get; set; }

    [Range(0, 500)]
    public double? WeightKg { get; set; }

    public string? BloodPressure { get; set; }
    public string? BloodGroup { get; set; }
}

public sealed class LoginRequest
{
    /// <summary>Email address or mobile number — the login form accepts either.</summary>
    [Required]
    public string Email { get; set; } = string.Empty;

    [Required]
    public string Password { get; set; } = string.Empty;
}

public sealed class AuthResponse
{
    public string Token { get; set; } = string.Empty;
    public UserResponse User { get; set; } = new();
    public string Message { get; set; } = string.Empty;
}

public sealed class UserResponse
{
    [JsonPropertyName("_id")]
    public string Id { get; set; } = string.Empty;

    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
    public string? Mobile { get; set; }
    public int? Age { get; set; }
    public string? Gender { get; set; }
    public double? HeightInches { get; set; }
    public double? WeightKg { get; set; }
    public string? BloodPressure { get; set; }
    public string? BloodGroup { get; set; }
    public DateTime CreatedAt { get; set; }
}

public sealed class ChangePasswordRequest
{
    [Required]
    public string CurrentPassword { get; set; } = string.Empty;

    [Required, StringLength(128, MinimumLength = 6)]
    public string NewPassword { get; set; } = string.Empty;
}

public sealed class UpdateProfileRequest
{
    [StringLength(120, MinimumLength = 2)]
    public string? Name { get; set; }

    public string? Mobile { get; set; }

    [Range(0, 130)]
    public int? Age { get; set; }

    public string? Gender { get; set; }

    [Range(0, 120)]
    public double? HeightInches { get; set; }

    [Range(0, 500)]
    public double? WeightKg { get; set; }

    public string? BloodPressure { get; set; }
    public string? BloodGroup { get; set; }
}
