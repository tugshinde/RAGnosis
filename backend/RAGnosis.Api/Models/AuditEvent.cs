using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace RAGnosis.Api.Models;

/// <summary>Actions worth keeping a durable record of. Values are stored, so do not rename them.</summary>
public static class AuditActions
{
    public const string ReportRead = "report.read";
    public const string ReportDownload = "report.download";
    public const string ReportDelete = "report.delete";
    public const string ReportUpload = "report.upload";
    public const string ReportUploadOnBehalf = "report.upload_on_behalf";
    public const string PrescriptionRead = "prescription.read";
    public const string PrescriptionIssue = "prescription.issue";
    public const string PatientSearch = "patient.search";
    public const string ChatOnReport = "chat.report_scoped";
}

/// <summary>
/// An append-only record of access to clinical data: who touched which patient's records,
/// when, and from where. Routine list calls are deliberately not recorded — the dashboard
/// polls them on every render, and the entries that matter are the ones naming a specific
/// patient or a specific document.
/// </summary>
public sealed class AuditEvent
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string? Id { get; set; }

    [BsonElement("occurred_at")]
    public DateTime OccurredAt { get; set; } = DateTime.UtcNow;

    /// <summary>One of <see cref="AuditActions"/>.</summary>
    [BsonElement("action")]
    public string Action { get; set; } = string.Empty;

    [BsonElement("actor_id")]
    public string ActorId { get; set; } = string.Empty;

    [BsonElement("actor_role")]
    public string ActorRole { get; set; } = string.Empty;

    /// <summary>The patient whose records were involved.</summary>
    [BsonElement("subject_user_id")]
    public string? SubjectUserId { get; set; }

    /// <summary>The specific document, where the action names one.</summary>
    [BsonElement("resource_id")]
    public string? ResourceId { get; set; }

    /// <summary>False when a member of staff read someone else's records — the entries auditors look for first.</summary>
    [BsonElement("self_access")]
    public bool SelfAccess { get; set; }

    [BsonElement("correlation_id")]
    public string? CorrelationId { get; set; }

    [BsonElement("ip_address")]
    public string? IpAddress { get; set; }

    /// <summary>Free-form context, e.g. the query behind a patient search.</summary>
    [BsonElement("detail")]
    public string? Detail { get; set; }
}
