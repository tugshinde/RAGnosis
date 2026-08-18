using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace RAGnosis.Api.Models;

public static class AppointmentStatus
{
    public const string Requested = "requested";
    public const string Confirmed = "confirmed";
    public const string Cancelled = "cancelled";
    public const string Completed = "completed";
}

[BsonIgnoreExtraElements]
public sealed class Appointment
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string? Id { get; set; }

    [BsonElement("patient_id")]
    [BsonRepresentation(BsonType.ObjectId)]
    public string PatientId { get; set; } = string.Empty;

    [BsonElement("doctor_id")]
    [BsonRepresentation(BsonType.ObjectId)]
    public string DoctorId { get; set; } = string.Empty;

    [BsonElement("patient_name")]
    public string PatientName { get; set; } = string.Empty;

    [BsonElement("doctor_name")]
    public string DoctorName { get; set; } = string.Empty;

    [BsonElement("scheduled_for")]
    public DateTime ScheduledFor { get; set; }

    /// <summary>"yyyy-MM-dd" as entered at the desk, kept verbatim to avoid timezone drift.</summary>
    [BsonElement("appointment_date")]
    public string AppointmentDate { get; set; } = string.Empty;

    /// <summary>"HH:mm" as entered at the desk.</summary>
    [BsonElement("appointment_time")]
    public string AppointmentTime { get; set; } = string.Empty;

    [BsonElement("patient_email")]
    [BsonIgnoreIfNull]
    public string? PatientEmail { get; set; }

    [BsonElement("patient_mobile")]
    [BsonIgnoreIfNull]
    public string? PatientMobile { get; set; }

    [BsonElement("reason")]
    [BsonIgnoreIfNull]
    public string? Reason { get; set; }

    [BsonElement("status")]
    public string Status { get; set; } = AppointmentStatus.Requested;

    [BsonElement("created_by")]
    [BsonRepresentation(BsonType.ObjectId)]
    public string CreatedBy { get; set; } = string.Empty;

    [BsonElement("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

[BsonIgnoreExtraElements]
public sealed class Prescription
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string? Id { get; set; }

    [BsonElement("appointment_id")]
    [BsonRepresentation(BsonType.ObjectId)]
    [BsonIgnoreIfNull]
    public string? AppointmentId { get; set; }

    [BsonElement("patient_id")]
    [BsonRepresentation(BsonType.ObjectId)]
    public string PatientId { get; set; } = string.Empty;

    [BsonElement("doctor_id")]
    [BsonRepresentation(BsonType.ObjectId)]
    public string DoctorId { get; set; } = string.Empty;

    [BsonElement("doctor_name")]
    public string DoctorName { get; set; } = string.Empty;

    [BsonElement("doctor_specialization")]
    [BsonIgnoreIfNull]
    public string? DoctorSpecialization { get; set; }

    [BsonElement("notes")]
    [BsonIgnoreIfNull]
    public string? Notes { get; set; }

    [BsonElement("diagnosis")]
    [BsonIgnoreIfNull]
    public string? Diagnosis { get; set; }

    /// <summary>Named "medicines" to match the prescription pad in the doctor portal.</summary>
    [BsonElement("medicines")]
    public List<PrescriptionItem> Items { get; set; } = [];

    [BsonElement("advice")]
    [BsonIgnoreIfNull]
    public string? Advice { get; set; }

    [BsonElement("created_at")]
    public DateTime IssuedAt { get; set; } = DateTime.UtcNow;
}

[BsonIgnoreExtraElements]
public sealed class PrescriptionItem
{
    [BsonElement("name")]
    public string MedicineName { get; set; } = string.Empty;

    [BsonElement("dosage")]
    [BsonIgnoreIfNull]
    public string? Dosage { get; set; }

    [BsonElement("frequency")]
    [BsonIgnoreIfNull]
    public string? Frequency { get; set; }

    /// <summary>Free text as written on the pad, e.g. "5 days".</summary>
    [BsonElement("duration")]
    [BsonIgnoreIfNull]
    public string? Duration { get; set; }

    [BsonElement("instructions")]
    [BsonIgnoreIfNull]
    public string? Instructions { get; set; }
}
