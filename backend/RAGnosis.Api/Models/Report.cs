using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace RAGnosis.Api.Models;

public static class ReportStatus
{
    public const string Pending = "pending";
    public const string Processing = "processing";
    public const string Completed = "completed";
    public const string Failed = "failed";
}

/// <summary>Where a measured value sits relative to its reference range.</summary>
public static class ParameterFlag
{
    public const string Low = "low";
    public const string Normal = "normal";
    public const string High = "high";
    public const string Unknown = "unknown";
}

[BsonIgnoreExtraElements]
public sealed class Report
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string? Id { get; set; }

    [BsonElement("user_id")]
    [BsonRepresentation(BsonType.ObjectId)]
    public string UserId { get; set; } = string.Empty;

    /// <summary>Stored file name (generated).</summary>
    [BsonElement("filename")]
    public string FileName { get; set; } = string.Empty;

    /// <summary>The name the file had on the patient's machine.</summary>
    [BsonElement("original_name")]
    public string OriginalName { get; set; } = string.Empty;

    [BsonElement("stored_path")]
    public string StoredPath { get; set; } = string.Empty;

    [BsonElement("content_type")]
    [BsonIgnoreIfNull]
    public string? ContentType { get; set; }

    [BsonElement("report_type")]
    [BsonIgnoreIfNull]
    public string? ReportType { get; set; }

    [BsonElement("status")]
    public string Status { get; set; } = ReportStatus.Pending;

    [BsonElement("error_message")]
    [BsonIgnoreIfNull]
    public string? ErrorMessage { get; set; }

    /// <summary>Raw OCR / PdfPig text. Drives both parameter extraction and chatbot retrieval.</summary>
    [BsonElement("extracted_text")]
    [BsonIgnoreIfNull]
    public string? ExtractedText { get; set; }

    [BsonElement("parameters")]
    public List<ReportParameter> Parameters { get; set; } = [];

    /// <summary>
    /// Flat metric-key to value map (hemoglobin, glucose, ldl, ...) that the dashboard
    /// charts directly. Derived from Parameters at analysis time.
    /// </summary>
    [BsonElement("metrics")]
    public Dictionary<string, double> Metrics { get; set; } = [];

    [BsonElement("recommendations")]
    public List<string> Recommendations { get; set; } = [];

    [BsonElement("summary")]
    [BsonIgnoreIfNull]
    public string? Summary { get; set; }

    [BsonElement("uploaded_at")]
    public DateTime UploadedAt { get; set; } = DateTime.UtcNow;

    [BsonElement("analyzed_at")]
    [BsonIgnoreIfNull]
    public DateTime? AnalyzedAt { get; set; }
}

[BsonIgnoreExtraElements]
public sealed class ReportParameter
{
    [BsonElement("name")]
    public string Name { get; set; } = string.Empty;

    [BsonElement("value")]
    public double Value { get; set; }

    [BsonElement("unit")]
    [BsonIgnoreIfNull]
    public string? Unit { get; set; }

    [BsonElement("reference_low")]
    [BsonIgnoreIfNull]
    public double? ReferenceLow { get; set; }

    [BsonElement("reference_high")]
    [BsonIgnoreIfNull]
    public double? ReferenceHigh { get; set; }

    [BsonElement("flag")]
    public string Flag { get; set; } = ParameterFlag.Unknown;

    /// <summary>Line of source text the value was lifted from — useful for showing provenance in the UI.</summary>
    [BsonElement("source_line")]
    [BsonIgnoreIfNull]
    public string? SourceLine { get; set; }
}
