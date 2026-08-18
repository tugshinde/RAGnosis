using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace RAGnosis.Api.Dtos;

// ── Staff authentication ─────────────────────────────────────────────────────

public sealed class DoctorRegisterRequest
{
    [Required, StringLength(120, MinimumLength = 2)]
    public string Name { get; set; } = string.Empty;

    [Required, EmailAddress]
    public string Email { get; set; } = string.Empty;

    [Required, StringLength(128, MinimumLength = 6)]
    public string Password { get; set; } = string.Empty;

    public string? Specialization { get; set; }
    public string? Hospital { get; set; }
}

public sealed class ReceptionistRegisterRequest
{
    [Required, StringLength(120, MinimumLength = 2)]
    public string Name { get; set; } = string.Empty;

    [Required, EmailAddress]
    public string Email { get; set; } = string.Empty;

    [Required, StringLength(128, MinimumLength = 6)]
    public string Password { get; set; } = string.Empty;

    /// <summary>The doctor whose desk this receptionist staffs.</summary>
    public string? DoctorId { get; set; }
}

public sealed class StaffLoginRequest
{
    [Required, EmailAddress]
    public string Email { get; set; } = string.Empty;

    [Required]
    public string Password { get; set; } = string.Empty;
}

public sealed class DoctorAuthResponse
{
    public string Token { get; set; } = string.Empty;
    public DoctorResponse Doctor { get; set; } = new();
    public string Message { get; set; } = string.Empty;
}

public sealed class ReceptionistAuthResponse
{
    public string Token { get; set; } = string.Empty;
    public ReceptionistResponse Receptionist { get; set; } = new();
    public string Message { get; set; } = string.Empty;
}

public sealed class DoctorResponse
{
    [JsonPropertyName("_id")]
    public string Id { get; set; } = string.Empty;

    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string? Specialization { get; set; }
    public string? Hospital { get; set; }
}

public sealed class DoctorEnvelope
{
    public DoctorResponse Doctor { get; set; } = new();
}

public sealed class ReceptionistResponse
{
    [JsonPropertyName("_id")]
    public string Id { get; set; } = string.Empty;

    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string? DoctorId { get; set; }
    public string? DoctorName { get; set; }
}

public sealed class ReceptionistEnvelope
{
    public ReceptionistResponse Receptionist { get; set; } = new();
}

// ── Patient lookup ───────────────────────────────────────────────────────────

public sealed class PatientSearchResponse
{
    public List<PatientSummary> Patients { get; set; } = [];
}

public sealed class PatientSummary
{
    [JsonPropertyName("_id")]
    public string Id { get; set; } = string.Empty;

    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string? Mobile { get; set; }
    public int? Age { get; set; }
}

// ── Appointments ─────────────────────────────────────────────────────────────

public sealed class BookAppointmentRequest
{
    [Required]
    public string PatientId { get; set; } = string.Empty;

    /// <summary>"yyyy-MM-dd".</summary>
    [Required]
    public string AppointmentDate { get; set; } = string.Empty;

    /// <summary>"HH:mm".</summary>
    [Required]
    public string AppointmentTime { get; set; } = string.Empty;

    public string? Notes { get; set; }

    /// <summary>Optional: defaults to the doctor the receptionist is assigned to.</summary>
    public string? DoctorId { get; set; }
}

public sealed class BookAppointmentResponse
{
    public string Message { get; set; } = string.Empty;
    public AppointmentResponse Appointment { get; set; } = new();
}

public sealed class AppointmentListResponse
{
    public List<AppointmentResponse> Appointments { get; set; } = [];
    public PageInfo? Pagination { get; set; }
}

public sealed class AppointmentResponse
{
    [JsonPropertyName("_id")]
    public string Id { get; set; } = string.Empty;

    public string PatientId { get; set; } = string.Empty;
    public string PatientName { get; set; } = string.Empty;
    public string? PatientEmail { get; set; }
    public string? PatientMobile { get; set; }
    public string DoctorId { get; set; } = string.Empty;
    public string DoctorName { get; set; } = string.Empty;
    public string AppointmentDate { get; set; } = string.Empty;
    public string AppointmentTime { get; set; } = string.Empty;
    public string? Notes { get; set; }
    public string Status { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
}

/// <summary>Distinct patients a doctor has seen, for the caseload list.</summary>
public sealed class PatientRosterResponse
{
    public List<PatientRosterEntry> Patients { get; set; } = [];
}

public sealed class PatientRosterEntry
{
    public string PatientId { get; set; } = string.Empty;
    public string PatientName { get; set; } = string.Empty;
    public string? PatientEmail { get; set; }
    public string? PatientMobile { get; set; }
    public string? LastVisit { get; set; }
}

// ── Prescriptions ────────────────────────────────────────────────────────────

public sealed class CreatePrescriptionRequest
{
    [Required]
    public string PatientId { get; set; } = string.Empty;

    public string? AppointmentId { get; set; }

    [Required, MinLength(1)]
    public List<PrescriptionMedicineRequest> Medicines { get; set; } = [];

    public string? Notes { get; set; }

    /// <summary>When true, an active medicine reminder is created for each prescribed item.</summary>
    public bool CreateReminders { get; set; } = true;
}

public sealed class PrescriptionMedicineRequest
{
    [Required, StringLength(160)]
    public string Name { get; set; } = string.Empty;

    public string? Dosage { get; set; }
    public string? Frequency { get; set; }
    public string? Duration { get; set; }
    public string? Instructions { get; set; }
}

public sealed class PrescriptionListResponse
{
    public List<PrescriptionResponse> Prescriptions { get; set; } = [];
    public PageInfo? Pagination { get; set; }
}

public sealed class PrescriptionResponse
{
    [JsonPropertyName("_id")]
    public string Id { get; set; } = string.Empty;

    public string PatientId { get; set; } = string.Empty;
    public string DoctorId { get; set; } = string.Empty;
    public string DoctorName { get; set; } = string.Empty;
    public string? DoctorSpecialization { get; set; }
    public string? AppointmentId { get; set; }
    public List<PrescriptionMedicineResponse> Medicines { get; set; } = [];
    public string? Notes { get; set; }
    public DateTime CreatedAt { get; set; }
}

public sealed class PrescriptionMedicineResponse
{
    public string Name { get; set; } = string.Empty;
    public string? Dosage { get; set; }
    public string? Frequency { get; set; }
    public string? Duration { get; set; }
    public string? Instructions { get; set; }
}
