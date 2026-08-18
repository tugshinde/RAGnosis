using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace RAGnosis.Api.Dtos;

// The global policy serialises PascalCase properties as snake_case.
// Mongo's "_id" is surfaced explicitly with [JsonPropertyName] where the client expects it.

/// <summary>
/// Field constraints shared by registration and profile updates.
///
/// The browser applies the same rules for immediate feedback, but these are the ones that
/// count: anyone can post straight to the API and skip the form entirely.
/// </summary>
internal static class ProfileRules
{
    /// <summary>Indian mobile numbering: ten digits, leading digit 6-9.</summary>
    public const string MobilePattern = "^[6-9][0-9]{9}$";
    public const string MobileMessage = "Enter a 10-digit mobile number starting with 6, 7, 8 or 9.";

    /// <summary>Systolic/diastolic, e.g. 120/80.</summary>
    public const string BloodPressurePattern = @"^\d{2,3}\s*/\s*\d{2,3}$";
    public const string BloodPressureMessage = "Use the format systolic/diastolic, for example 120/80.";

    public const string BloodGroupPattern = "^(A|B|AB|O)[+-]$";
    public const string BloodGroupMessage = "Blood group must be one of A+, A-, B+, B-, AB+, AB-, O+, O-.";
}

public sealed class RegisterRequest
{
    [Required, StringLength(120, MinimumLength = 2)]
    public string Name { get; set; } = string.Empty;

    [Required, EmailAddress, StringLength(200)]
    public string Email { get; set; } = string.Empty;

    [Required, StringLength(128, MinimumLength = 6)]
    public string Password { get; set; } = string.Empty;

    [RegularExpression(ProfileRules.MobilePattern, ErrorMessage = ProfileRules.MobileMessage)]
    public string? Mobile { get; set; }

    [Range(1, 120, ErrorMessage = "Age must be between 1 and 120 years.")]
    public int? Age { get; set; }

    public string? Gender { get; set; }

    [Range(20, 100, ErrorMessage = "Height must be between 20 and 100 inches.")]
    public double? HeightInches { get; set; }

    [Range(2, 400, ErrorMessage = "Weight must be between 2 and 400 kg.")]
    public double? WeightKg { get; set; }

    [RegularExpression(ProfileRules.BloodPressurePattern, ErrorMessage = ProfileRules.BloodPressureMessage)]
    public string? BloodPressure { get; set; }

    [RegularExpression(ProfileRules.BloodGroupPattern, ErrorMessage = ProfileRules.BloodGroupMessage)]
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

    [RegularExpression(ProfileRules.MobilePattern, ErrorMessage = ProfileRules.MobileMessage)]
    public string? Mobile { get; set; }

    [Range(1, 120, ErrorMessage = "Age must be between 1 and 120 years.")]
    public int? Age { get; set; }

    public string? Gender { get; set; }

    [Range(20, 100, ErrorMessage = "Height must be between 20 and 100 inches.")]
    public double? HeightInches { get; set; }

    [Range(2, 400, ErrorMessage = "Weight must be between 2 and 400 kg.")]
    public double? WeightKg { get; set; }

    /// <summary>Null leaves the stored value unchanged; empty string clears it.</summary>
    [RegularExpression(ProfileRules.BloodPressurePattern, ErrorMessage = ProfileRules.BloodPressureMessage)]
    public string? BloodPressure { get; set; }

    /// <summary>Null leaves the stored value unchanged; empty string clears it.</summary>
    [RegularExpression(ProfileRules.BloodGroupPattern, ErrorMessage = ProfileRules.BloodGroupMessage)]
    public string? BloodGroup { get; set; }
}
