using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace RAGnosis.Api.Models;

/// <summary>Canonical role names. Persisted lower-case to match the existing JSON contract.</summary>
public static class Roles
{
    public const string Patient = "patient";
    public const string Doctor = "doctor";
    public const string Receptionist = "receptionist";
    public const string Admin = "admin";

    public static readonly string[] All = [Patient, Doctor, Receptionist, Admin];
    public static bool IsValid(string? role) => role is not null && All.Contains(role.ToLowerInvariant());
}

[BsonIgnoreExtraElements]
public sealed class User
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string? Id { get; set; }

    [BsonElement("name")]
    public string Name { get; set; } = string.Empty;

    [BsonElement("email")]
    public string Email { get; set; } = string.Empty;

    /// <summary>BCrypt hash. Legacy Python hashes use the $2b$ prefix and verify fine with BCrypt.Net.</summary>
    [BsonElement("password")]
    public string PasswordHash { get; set; } = string.Empty;

    [BsonElement("role")]
    public string Role { get; set; } = Roles.Patient;

    [BsonElement("mobile")]
    [BsonIgnoreIfNull]
    public string? Mobile { get; set; }

    [BsonElement("age")]
    [BsonIgnoreIfNull]
    public int? Age { get; set; }

    [BsonElement("gender")]
    [BsonIgnoreIfNull]
    public string? Gender { get; set; }

    [BsonElement("height_inches")]
    [BsonIgnoreIfNull]
    public double? HeightInches { get; set; }

    [BsonElement("weight_kg")]
    [BsonIgnoreIfNull]
    public double? WeightKg { get; set; }

    [BsonElement("blood_pressure")]
    [BsonIgnoreIfNull]
    public string? BloodPressure { get; set; }

    [BsonElement("blood_group")]
    [BsonIgnoreIfNull]
    public string? BloodGroup { get; set; }

    /// <summary>Doctor-only: specialisation shown in the booking portal.</summary>
    [BsonElement("specialization")]
    [BsonIgnoreIfNull]
    public string? Specialization { get; set; }

    /// <summary>Doctor-only: hospital or clinic name.</summary>
    [BsonElement("hospital")]
    [BsonIgnoreIfNull]
    public string? Hospital { get; set; }

    /// <summary>Receptionist-only: the doctor whose desk they staff.</summary>
    [BsonElement("doctor_id")]
    [BsonIgnoreIfNull]
    public string? DoctorId { get; set; }

    /// <summary>
    /// Denormalised report stubs kept on the user document.
    /// Half of the two-write pattern carried over from the original data model.
    /// </summary>
    [BsonElement("reports")]
    public List<UserReportRef> Reports { get; set; } = [];

    [BsonElement("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

[BsonIgnoreExtraElements]
public sealed class UserReportRef
{
    [BsonElement("report_id")]
    [BsonRepresentation(BsonType.ObjectId)]
    public string ReportId { get; set; } = string.Empty;

    [BsonElement("file_name")]
    public string FileName { get; set; } = string.Empty;

    [BsonElement("report_type")]
    [BsonIgnoreIfNull]
    public string? ReportType { get; set; }

    [BsonElement("uploaded_at")]
    public DateTime UploadedAt { get; set; } = DateTime.UtcNow;
}
