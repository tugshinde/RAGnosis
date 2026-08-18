using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Mvc;

namespace RAGnosis.Api.Dtos;

/// <summary>Envelope the dashboard expects from the report list endpoint.</summary>
public sealed class ReportListResponse
{
    public List<ReportResponse> Reports { get; set; } = [];
    public PageInfo? Pagination { get; set; }
}

public sealed class ReportResponse
{
    [JsonPropertyName("_id")]
    public string Id { get; set; } = string.Empty;

    public string Filename { get; set; } = string.Empty;
    public string OriginalName { get; set; } = string.Empty;
    public string? ReportType { get; set; }
    public string Status { get; set; } = string.Empty;
    public string? Summary { get; set; }

    /// <summary>Flat metric-key to value map the dashboard charts directly.</summary>
    public Dictionary<string, double> Metrics { get; set; } = [];

    public List<ReportParameterResponse> Parameters { get; set; } = [];
    public List<string> Recommendations { get; set; } = [];
    public string? ExtractedText { get; set; }
    public DateTime UploadedAt { get; set; }
    public DateTime? AnalyzedAt { get; set; }
}

public sealed class ReportParameterResponse
{
    public string Name { get; set; } = string.Empty;
    public double Value { get; set; }
    public string? Unit { get; set; }
    public double? ReferenceLow { get; set; }
    public double? ReferenceHigh { get; set; }
    public string Flag { get; set; } = string.Empty;
    public string? MetricKey { get; set; }
}

public sealed class UploadReportRequest
{
    [Required]
    [FromForm(Name = "file")]
    public IFormFile File { get; set; } = default!;

    [FromForm(Name = "report_type")]
    public string? ReportType { get; set; }
}

/// <summary>Receptionist upload — same as above but targeted at a named patient.</summary>
public sealed class StaffUploadReportRequest
{
    [Required]
    [FromForm(Name = "file")]
    public IFormFile File { get; set; } = default!;

    [Required]
    [FromForm(Name = "patient_id")]
    public string PatientId { get; set; } = string.Empty;
}
