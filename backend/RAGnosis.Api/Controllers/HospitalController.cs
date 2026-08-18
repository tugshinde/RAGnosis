using System.Globalization;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using MongoDB.Bson;
using MongoDB.Driver;
using RAGnosis.Api.Configuration;
using RAGnosis.Api.Data;
using RAGnosis.Api.Dtos;
using RAGnosis.Api.Helpers;
using RAGnosis.Api.Models;
using RAGnosis.Api.Services.Abstractions;

namespace RAGnosis.Api.Controllers;

/// <summary>
/// Hospital-side workflows: staff sign-in, patient lookup, appointment booking,
/// digital prescriptions, and reports uploaded on a patient's behalf.
/// Doctors and receptionists authenticate through their own endpoints and hold
/// separate tokens from patients, though all three are users distinguished by role.
/// </summary>
[Route("api/hospital")]
public sealed class HospitalController(
    MongoContext context,
    ITokenService tokenService,
    ReportsController reports,
    ICurrentUser currentUser,
    IAuditService audit,
    IWebHostEnvironment environment,
    ILogger<HospitalController> logger) : ApiControllerBase(currentUser)
{
    // ── Doctor authentication ────────────────────────────────────────────────

    [HttpPost("doctor/register")]
    [AllowAnonymous]
    [EnableRateLimiting(RateLimitPolicies.Auth)]
    public async Task<ActionResult<DoctorAuthResponse>> DoctorRegister(
        [FromBody] DoctorRegisterRequest request, CancellationToken ct)
    {
        var email = request.Email.Trim().ToLowerInvariant();
        if (await context.Users.Find(u => u.Email == email).AnyAsync(ct))
            return Conflict(new ApiError("An account with that email address already exists."));

        var doctor = new User
        {
            Name = request.Name.Trim(),
            Email = email,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password, workFactor: 12),
            Role = Roles.Doctor,
            Specialization = request.Specialization,
            Hospital = request.Hospital,
            CreatedAt = DateTime.UtcNow
        };

        await context.Users.InsertOneAsync(doctor, cancellationToken: ct);
        var (token, _) = tokenService.CreateToken(doctor);

        return Ok(new DoctorAuthResponse
        {
            Token = token,
            Doctor = MapDoctor(doctor),
            Message = $"Welcome, Dr {doctor.Name.Split(' ').Last()}!"
        });
    }

    [HttpPost("doctor/login")]
    [AllowAnonymous]
    [EnableRateLimiting(RateLimitPolicies.Auth)]
    public async Task<ActionResult<DoctorAuthResponse>> DoctorLogin(
        [FromBody] StaffLoginRequest request, CancellationToken ct)
    {
        var email = request.Email.Trim().ToLowerInvariant();
        var doctor = await context.Users.Find(u => u.Email == email && u.Role == Roles.Doctor).FirstOrDefaultAsync(ct);

        if (doctor is null || !AuthController.VerifyPassword(request.Password, doctor.PasswordHash))
            return Unauthorized(new ApiError("Invalid email or password."));

        var (token, _) = tokenService.CreateToken(doctor);
        return Ok(new DoctorAuthResponse
        {
            Token = token,
            Doctor = MapDoctor(doctor),
            Message = $"Welcome back, Dr {doctor.Name.Split(' ').Last()}!"
        });
    }

    [HttpGet("doctor/me")]
    [Authorize]
    public async Task<ActionResult<DoctorEnvelope>> DoctorMe(CancellationToken ct)
    {
        if (!TryGetStaffId(Roles.Doctor, out var doctorId, out var error)) return error!;

        var doctor = await context.Users.Find(u => u.Id == doctorId).FirstOrDefaultAsync(ct);
        return doctor is null
            ? NotFoundError("Doctor account not found.")
            : Ok(new DoctorEnvelope { Doctor = MapDoctor(doctor) });
    }

    // ── Receptionist authentication ──────────────────────────────────────────

    [HttpPost("receptionist/register")]
    [AllowAnonymous]
    [EnableRateLimiting(RateLimitPolicies.Auth)]
    public async Task<ActionResult<ReceptionistAuthResponse>> ReceptionistRegister(
        [FromBody] ReceptionistRegisterRequest request, CancellationToken ct)
    {
        var email = request.Email.Trim().ToLowerInvariant();
        if (await context.Users.Find(u => u.Email == email).AnyAsync(ct))
            return Conflict(new ApiError("An account with that email address already exists."));

        // An unassigned receptionist falls back to the first registered doctor,
        // which keeps the demo usable without a manual linking step.
        var doctorId = request.DoctorId;
        if (!BsonJson.IsValidObjectId(doctorId))
        {
            var anyDoctor = await context.Users.Find(u => u.Role == Roles.Doctor).FirstOrDefaultAsync(ct);
            doctorId = anyDoctor?.Id;
        }

        var receptionist = new User
        {
            Name = request.Name.Trim(),
            Email = email,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password, workFactor: 12),
            Role = Roles.Receptionist,
            DoctorId = doctorId,
            CreatedAt = DateTime.UtcNow
        };

        await context.Users.InsertOneAsync(receptionist, cancellationToken: ct);
        var (token, _) = tokenService.CreateToken(receptionist);

        return Ok(new ReceptionistAuthResponse
        {
            Token = token,
            Receptionist = MapReceptionist(receptionist, await ResolveDoctorNameAsync(receptionist.DoctorId, ct)),
            Message = $"Welcome, {receptionist.Name.Split(' ')[0]}!"
        });
    }

    [HttpPost("receptionist/login")]
    [AllowAnonymous]
    [EnableRateLimiting(RateLimitPolicies.Auth)]
    public async Task<ActionResult<ReceptionistAuthResponse>> ReceptionistLogin(
        [FromBody] StaffLoginRequest request, CancellationToken ct)
    {
        var email = request.Email.Trim().ToLowerInvariant();
        var user = await context.Users.Find(u => u.Email == email && u.Role == Roles.Receptionist).FirstOrDefaultAsync(ct);

        if (user is null || !AuthController.VerifyPassword(request.Password, user.PasswordHash))
            return Unauthorized(new ApiError("Invalid email or password."));

        var (token, _) = tokenService.CreateToken(user);
        return Ok(new ReceptionistAuthResponse
        {
            Token = token,
            Receptionist = MapReceptionist(user, await ResolveDoctorNameAsync(user.DoctorId, ct)),
            Message = $"Welcome back, {user.Name.Split(' ')[0]}!"
        });
    }

    [HttpGet("receptionist/me")]
    [Authorize]
    public async Task<ActionResult<ReceptionistEnvelope>> ReceptionistMe(CancellationToken ct)
    {
        if (!TryGetStaffId(Roles.Receptionist, out var id, out var error)) return error!;

        var user = await context.Users.Find(u => u.Id == id).FirstOrDefaultAsync(ct);
        return user is null
            ? NotFoundError("Receptionist account not found.")
            : Ok(new ReceptionistEnvelope { Receptionist = MapReceptionist(user, await ResolveDoctorNameAsync(user.DoctorId, ct)) });
    }

    // ── Patient lookup ───────────────────────────────────────────────────────

    [HttpGet("patients/search")]
    [Authorize]
    public async Task<ActionResult<PatientSearchResponse>> SearchPatients(
        [FromQuery] string q, CancellationToken ct)
    {
        if (!TryGetUserId(out _, out var error)) return error!;

        if (!CurrentUser.IsInRole(Roles.Receptionist, Roles.Doctor, Roles.Admin))
            return ForbiddenError("Patient lookup is restricted to hospital staff.");

        if (string.IsNullOrWhiteSpace(q) || q.Trim().Length < 2)
            return Ok(new PatientSearchResponse());

        // Escaped so a name containing regex characters can't alter the query.
        var pattern = new BsonRegularExpression(System.Text.RegularExpressions.Regex.Escape(q.Trim()), "i");

        var filter = Builders<User>.Filter.Eq(u => u.Role, Roles.Patient)
                   & (Builders<User>.Filter.Regex(u => u.Name, pattern)
                    | Builders<User>.Filter.Regex(u => u.Email, pattern)
                    | Builders<User>.Filter.Regex(u => u.Mobile, pattern));

        var patients = await context.Users.Find(filter).Limit(10).ToListAsync(ct);

        // Searching the patient directory is itself a disclosure of who is a patient here,
        // so the query is recorded alongside the reads it leads to.
        await audit.RecordAsync(AuditActions.PatientSearch, detail: q.Trim(), ct: ct);

        return Ok(new PatientSearchResponse
        {
            Patients = patients.Select(p => new PatientSummary
            {
                Id = p.Id ?? string.Empty,
                Name = p.Name,
                Email = p.Email,
                Mobile = p.Mobile,
                Age = p.Age
            }).ToList()
        });
    }

    // ── Appointments ─────────────────────────────────────────────────────────

    [HttpPost("appointments")]
    [Authorize]
    public async Task<ActionResult<BookAppointmentResponse>> Book(
        [FromBody] BookAppointmentRequest request, CancellationToken ct)
    {
        if (!TryGetUserId(out var callerId, out var error)) return error!;

        if (!BsonJson.IsValidObjectId(request.PatientId))
            return BadRequestError("Please select a patient.");

        var patient = await context.Users.Find(u => u.Id == request.PatientId).FirstOrDefaultAsync(ct);
        if (patient is null) return NotFoundError("Patient not found.");

        // A receptionist books against the doctor they are assigned to unless told otherwise.
        var doctorId = request.DoctorId;
        if (!BsonJson.IsValidObjectId(doctorId))
        {
            var caller = await context.Users.Find(u => u.Id == callerId).FirstOrDefaultAsync(ct);
            doctorId = caller?.Role == Roles.Doctor ? caller.Id : caller?.DoctorId;
        }

        if (!BsonJson.IsValidObjectId(doctorId))
            return BadRequestError("No doctor is assigned to this desk. Register a doctor account first.");

        var doctor = await context.Users.Find(u => u.Id == doctorId && u.Role == Roles.Doctor).FirstOrDefaultAsync(ct);
        if (doctor is null) return NotFoundError("Doctor not found.");

        if (!TryParseSlot(request.AppointmentDate, request.AppointmentTime, out var scheduledFor, out var slotError))
            return BadRequestError(slotError!);

        var clash = await context.Appointments.Find(a =>
            a.DoctorId == doctorId &&
            a.AppointmentDate == request.AppointmentDate &&
            a.AppointmentTime == request.AppointmentTime &&
            a.Status != AppointmentStatus.Cancelled).AnyAsync(ct);

        if (clash)
            return Conflict(new ApiError("That slot is already booked. Please choose another time."));

        var appointment = new Appointment
        {
            PatientId = patient.Id!,
            DoctorId = doctor.Id!,
            PatientName = patient.Name,
            PatientEmail = patient.Email,
            PatientMobile = patient.Mobile,
            DoctorName = doctor.Name,
            ScheduledFor = scheduledFor,
            AppointmentDate = request.AppointmentDate,
            AppointmentTime = request.AppointmentTime,
            Reason = request.Notes,
            Status = AppointmentStatus.Confirmed,
            CreatedBy = callerId,
            CreatedAt = DateTime.UtcNow
        };

        await context.Appointments.InsertOneAsync(appointment, cancellationToken: ct);

        return Ok(new BookAppointmentResponse
        {
            Message = $"Appointment booked for {patient.Name} on {request.AppointmentDate} at {request.AppointmentTime}.",
            Appointment = MapAppointment(appointment)
        });
    }

    /// <summary>The signed-in doctor's schedule for today.</summary>
    [HttpGet("appointments/today")]
    [Authorize]
    public async Task<ActionResult<AppointmentListResponse>> Today(CancellationToken ct)
    {
        if (!TryGetStaffId(Roles.Doctor, out var doctorId, out var error)) return error!;

        var today = DateTime.UtcNow.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);

        var appointments = await context.Appointments
            .Find(a => a.DoctorId == doctorId && a.AppointmentDate == today)
            .SortBy(a => a.AppointmentTime)
            .ToListAsync(ct);

        return Ok(new AppointmentListResponse { Appointments = appointments.Select(MapAppointment).ToList() });
    }

    /// <summary>Distinct patients the signed-in doctor has ever seen.</summary>
    [HttpGet("appointments/all-patients")]
    [Authorize]
    public async Task<ActionResult<PatientRosterResponse>> AllPatients(CancellationToken ct)
    {
        if (!TryGetStaffId(Roles.Doctor, out var doctorId, out var error)) return error!;

        var appointments = await context.Appointments
            .Find(a => a.DoctorId == doctorId)
            .SortByDescending(a => a.ScheduledFor)
            .ToListAsync(ct);

        var roster = appointments
            .GroupBy(a => a.PatientId)
            .Select(g =>
            {
                var latest = g.First();
                return new PatientRosterEntry
                {
                    PatientId = g.Key,
                    PatientName = latest.PatientName,
                    PatientEmail = latest.PatientEmail,
                    PatientMobile = latest.PatientMobile,
                    LastVisit = latest.AppointmentDate
                };
            })
            .ToList();

        return Ok(new PatientRosterResponse { Patients = roster });
    }

    /// <summary>Every appointment booked at this desk.</summary>
    [HttpGet("receptionist/my-patients")]
    [Authorize]
    public async Task<ActionResult<AppointmentListResponse>> MyPatients(
        [FromQuery(Name = "")] PageRequest paging, CancellationToken ct)
    {
        if (!TryGetStaffId(Roles.Receptionist, out var id, out var error)) return error!;

        var user = await context.Users.Find(u => u.Id == id).FirstOrDefaultAsync(ct);

        var filter = Builders<Appointment>.Filter.Eq(a => a.CreatedBy, id);
        if (BsonJson.IsValidObjectId(user?.DoctorId))
            filter |= Builders<Appointment>.Filter.Eq(a => a.DoctorId, user!.DoctorId);

        var query = context.Appointments.Find(filter);

        var total = await query.CountDocumentsAsync(ct);

        var appointments = await query
            .SortByDescending(a => a.ScheduledFor)
            .Skip(paging.Skip)
            .Limit(paging.Size)
            .ToListAsync(ct);

        return Ok(new AppointmentListResponse
        {
            Appointments = appointments.Select(MapAppointment).ToList(),
            Pagination = PageInfo.From(paging, total)
        });
    }

    // ── Reports uploaded on a patient's behalf ───────────────────────────────

    [HttpPost("reports/upload")]
    [Authorize]
    [RequestSizeLimit(30 * 1024 * 1024)]
    public async Task<ActionResult<ReportResponse>> StaffUpload(
        [FromForm] StaffUploadReportRequest request, CancellationToken ct)
    {
        if (!TryGetUserId(out _, out var error)) return error!;

        if (!CurrentUser.IsInRole(Roles.Receptionist, Roles.Doctor, Roles.Admin))
            return ForbiddenError("Uploading on a patient's behalf is restricted to hospital staff.");

        if (!BsonJson.IsValidObjectId(request.PatientId))
            return BadRequestError("Please select a patient.");

        var patient = await context.Users.Find(u => u.Id == request.PatientId).FirstOrDefaultAsync(ct);
        if (patient is null) return NotFoundError("Patient not found.");

        // Reuse the patient pipeline so the report lands in their dashboard unchanged — and so
        // an unreadable or non-clinical document is refused here for the same reasons.
        var (report, stored) = await reports.CreateAndAnalyzeAsync(request.File, patient.Id!, null, ct);

        if (!stored) return reports.RejectedUpload(report);

        await audit.RecordAsync(AuditActions.ReportUploadOnBehalf, patient.Id, report.Id, ct: ct);

        return Ok(ReportMapper.Map(report));
    }

    // ── Prescriptions ────────────────────────────────────────────────────────

    [HttpPost("prescriptions")]
    [Authorize]
    public async Task<ActionResult<object>> CreatePrescription(
        [FromBody] CreatePrescriptionRequest request, CancellationToken ct)
    {
        if (!TryGetStaffId(Roles.Doctor, out var doctorId, out var error)) return error!;

        if (!BsonJson.IsValidObjectId(request.PatientId))
            return BadRequestError("Please select a patient.");

        var patient = await context.Users.Find(u => u.Id == request.PatientId).FirstOrDefaultAsync(ct);
        if (patient is null) return NotFoundError("Patient not found.");

        var doctor = await context.Users.Find(u => u.Id == doctorId).FirstOrDefaultAsync(ct);

        var prescription = new Prescription
        {
            PatientId = patient.Id!,
            DoctorId = doctorId,
            DoctorName = doctor?.Name ?? "Doctor",
            DoctorSpecialization = doctor?.Specialization,
            AppointmentId = BsonJson.IsValidObjectId(request.AppointmentId) ? request.AppointmentId : null,
            Notes = request.Notes,
            IssuedAt = DateTime.UtcNow,
            Items = request.Medicines.Select(m => new PrescriptionItem
            {
                MedicineName = m.Name.Trim(),
                Dosage = m.Dosage,
                Frequency = m.Frequency,
                Duration = m.Duration,
                Instructions = m.Instructions
            }).ToList()
        };

        await context.Prescriptions.InsertOneAsync(prescription, cancellationToken: ct);

        await audit.RecordAsync(AuditActions.PrescriptionIssue, patient.Id, prescription.Id, ct: ct);

        if (request.CreateReminders)
            await CreateRemindersForAsync(prescription, ct);

        return Ok(new
        {
            message = $"Prescription saved for {patient.Name}.",
            prescription = MapPrescription(prescription)
        });
    }

    /// <summary>The signed-in patient's own prescriptions.</summary>
    [HttpGet("prescriptions/me")]
    [Authorize]
    public async Task<ActionResult<PrescriptionListResponse>> MyPrescriptions(
        [FromQuery(Name = "")] PageRequest paging, CancellationToken ct)
    {
        if (!TryGetUserId(out var userId, out var error)) return error!;

        var query = context.Prescriptions.Find(p => p.PatientId == userId);

        var total = await query.CountDocumentsAsync(ct);

        var prescriptions = await query
            .SortByDescending(p => p.IssuedAt)
            .Skip(paging.Skip)
            .Limit(paging.Size)
            .ToListAsync(ct);

        return Ok(new PrescriptionListResponse
        {
            Prescriptions = prescriptions.Select(MapPrescription).ToList(),
            Pagination = PageInfo.From(paging, total)
        });
    }

    [HttpGet("prescriptions/patient/{patientId}")]
    [Authorize]
    public async Task<ActionResult<PrescriptionListResponse>> PatientPrescriptions(
        string patientId, [FromQuery(Name = "")] PageRequest paging, CancellationToken ct)
    {
        if (!TryGetStaffId(Roles.Doctor, out var doctorId, out var error)) return error!;

        if (!BsonJson.IsValidObjectId(patientId))
            return BadRequestError("The patient id is not valid.");

        // A doctor sees the prescriptions they issued, not another clinician's.
        var query = context.Prescriptions.Find(p => p.PatientId == patientId && p.DoctorId == doctorId);

        var total = await query.CountDocumentsAsync(ct);

        var prescriptions = await query
            .SortByDescending(p => p.IssuedAt)
            .Skip(paging.Skip)
            .Limit(paging.Size)
            .ToListAsync(ct);

        await audit.RecordAsync(AuditActions.PrescriptionRead, patientId, ct: ct);

        return Ok(new PrescriptionListResponse
        {
            Prescriptions = prescriptions.Select(MapPrescription).ToList(),
            Pagination = PageInfo.From(paging, total)
        });
    }

    // ── Demo data ────────────────────────────────────────────────────────────

    /// <summary>
    /// Creates a demo doctor and receptionist so the portals can be explored immediately.
    /// Development only: the accounts use a published password, so exposing this in any
    /// deployed environment would hand anonymous callers staff access to clinical records.
    /// </summary>
    [HttpPost("demo/seed")]
    [AllowAnonymous]
    public async Task<ActionResult<object>> SeedDemo(CancellationToken ct)
    {
        if (!environment.IsDevelopment())
        {
            logger.LogWarning("Demo seed endpoint was called in {Environment} and refused.", environment.EnvironmentName);
            return NotFound(new ApiError("not_found", "No such endpoint."));
        }

        const string doctorEmail = "doctor@ragnosis.dev";
        const string receptionEmail = "reception@ragnosis.dev";
        const string password = "demo1234";

        var doctor = await context.Users.Find(u => u.Email == doctorEmail).FirstOrDefaultAsync(ct);
        if (doctor is null)
        {
            doctor = new User
            {
                Name = "Dr Asha Rao",
                Email = doctorEmail,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(password, workFactor: 12),
                Role = Roles.Doctor,
                Specialization = "General Medicine",
                Hospital = "RAGnosis Demo Clinic",
                CreatedAt = DateTime.UtcNow
            };
            await context.Users.InsertOneAsync(doctor, cancellationToken: ct);
        }

        var reception = await context.Users.Find(u => u.Email == receptionEmail).FirstOrDefaultAsync(ct);
        if (reception is null)
        {
            reception = new User
            {
                Name = "Front Desk",
                Email = receptionEmail,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(password, workFactor: 12),
                Role = Roles.Receptionist,
                DoctorId = doctor.Id,
                CreatedAt = DateTime.UtcNow
            };
            await context.Users.InsertOneAsync(reception, cancellationToken: ct);
        }

        logger.LogInformation("Demo staff accounts ensured.");

        return Ok(new
        {
            message = "Demo accounts ready.",
            doctor = new { email = doctorEmail, password },
            receptionist = new { email = receptionEmail, password }
        });
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    /// <summary>Turns each prescribed medicine into an active reminder for the patient.</summary>
    private async Task CreateRemindersForAsync(Prescription prescription, CancellationToken ct)
    {
        var today = DateTime.UtcNow.Date;

        var reminders = prescription.Items.Select(item => new Reminder
        {
            UserId = prescription.PatientId,
            MedicineName = item.MedicineName,
            Dosage = item.Dosage,
            Times = TimesForFrequency(item.Frequency),
            Frequency = item.Frequency ?? "daily",
            StartDate = today,
            EndDate = EndDateFor(item.Duration, today),
            Notes = item.Instructions,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        }).ToList();

        if (reminders.Count == 0) return;

        try
        {
            await context.Reminders.InsertManyAsync(reminders, cancellationToken: ct);
            logger.LogInformation(
                "Created {Count} reminders from prescription {PrescriptionId}.", reminders.Count, prescription.Id);
        }
        catch (Exception ex)
        {
            // The prescription is already saved; reminder creation is a convenience.
            logger.LogError(ex, "Could not create reminders for prescription {PrescriptionId}.", prescription.Id);
        }
    }

    /// <summary>Maps a free-text frequency from the prescription pad onto clock times.</summary>
    internal static List<string> TimesForFrequency(string? frequency)
    {
        var f = (frequency ?? string.Empty).ToLowerInvariant();

        if (f.Contains("thrice") || f.Contains("three") || f.Contains("8 hour")) return ["08:00", "14:00", "20:00"];
        if (f.Contains("twice") || f.Contains("12 hour")) return ["08:00", "20:00"];
        if (f.Contains("6 hour")) return ["06:00", "12:00", "18:00", "00:00"];
        if (f.Contains("bedtime")) return ["22:00"];

        return ["09:00"];
    }

    /// <summary>Reads a leading day count out of free text such as "5 days" or "2 weeks".</summary>
    internal static DateTime? EndDateFor(string? duration, DateTime start)
    {
        if (string.IsNullOrWhiteSpace(duration)) return null;

        var match = System.Text.RegularExpressions.Regex.Match(duration, @"(\d+)");
        if (!match.Success || !int.TryParse(match.Groups[1].Value, out var n) || n <= 0) return null;

        var lower = duration.ToLowerInvariant();
        var days = lower.Contains("week") ? n * 7
                 : lower.Contains("month") ? n * 30
                 : n;

        return days > 365 ? start.AddDays(365) : start.AddDays(days);
    }

    private static bool TryParseSlot(string date, string time, out DateTime scheduledFor, out string? error)
    {
        scheduledFor = default;

        if (!DateOnly.TryParseExact(date, "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out var d))
        {
            error = "The appointment date must be in yyyy-MM-dd format.";
            return false;
        }

        if (!TimeOnly.TryParse(time, CultureInfo.InvariantCulture, out var t))
        {
            error = "The appointment time must be in 24-hour HH:mm format.";
            return false;
        }

        scheduledFor = DateTime.SpecifyKind(d.ToDateTime(t), DateTimeKind.Utc);
        error = null;
        return true;
    }

    private static DoctorResponse MapDoctor(User u) => new()
    {
        Id = u.Id ?? string.Empty,
        Name = u.Name,
        Email = u.Email,
        Specialization = u.Specialization,
        Hospital = u.Hospital
    };

    private static ReceptionistResponse MapReceptionist(User u, string? doctorName = null) => new()
    {
        Id = u.Id ?? string.Empty,
        Name = u.Name,
        Email = u.Email,
        DoctorId = u.DoctorId,
        DoctorName = doctorName
    };

    private async Task<string?> ResolveDoctorNameAsync(string? doctorId, CancellationToken ct)
    {
        if (string.IsNullOrEmpty(doctorId)) return null;
        var doctor = await context.Users.Find(u => u.Id == doctorId).FirstOrDefaultAsync(ct);
        return doctor?.Name;
    }

    private static AppointmentResponse MapAppointment(Appointment a) => new()
    {
        Id = a.Id ?? string.Empty,
        PatientId = a.PatientId,
        PatientName = a.PatientName,
        PatientEmail = a.PatientEmail,
        PatientMobile = a.PatientMobile,
        DoctorId = a.DoctorId,
        DoctorName = a.DoctorName,
        AppointmentDate = a.AppointmentDate,
        AppointmentTime = a.AppointmentTime,
        Notes = a.Reason,
        Status = a.Status,
        CreatedAt = a.CreatedAt
    };

    private static PrescriptionResponse MapPrescription(Prescription p) => new()
    {
        Id = p.Id ?? string.Empty,
        PatientId = p.PatientId,
        DoctorId = p.DoctorId,
        DoctorName = p.DoctorName,
        DoctorSpecialization = p.DoctorSpecialization,
        AppointmentId = p.AppointmentId,
        Notes = p.Notes,
        CreatedAt = p.IssuedAt,
        Medicines = p.Items.Select(i => new PrescriptionMedicineResponse
        {
            Name = i.MedicineName,
            Dosage = i.Dosage,
            Frequency = i.Frequency,
            Duration = i.Duration,
            Instructions = i.Instructions
        }).ToList()
    };
}
