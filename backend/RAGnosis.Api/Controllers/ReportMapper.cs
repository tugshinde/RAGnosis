using RAGnosis.Api.Dtos;
using RAGnosis.Api.Models;
using RAGnosis.Api.Services;

namespace RAGnosis.Api.Controllers;

/// <summary>Shared projection of a report document onto the dashboard's expected shape.</summary>
internal static class ReportMapper
{
    public static ReportResponse Map(Report r) => new()
    {
        Id = r.Id ?? string.Empty,
        Filename = r.FileName,
        OriginalName = r.OriginalName,
        ReportType = r.ReportType,
        Status = r.Status,
        Summary = r.Status == ReportStatus.Failed ? r.ErrorMessage : r.Summary,
        Metrics = r.Metrics,
        Recommendations = r.Recommendations,
        ExtractedText = r.ExtractedText,
        UploadedAt = r.UploadedAt,
        AnalyzedAt = r.AnalyzedAt,
        Parameters = r.Parameters.Select(p => new ReportParameterResponse
        {
            Name = p.Name,
            Value = p.Value,
            Unit = p.Unit,
            ReferenceLow = p.ReferenceLow,
            ReferenceHigh = p.ReferenceHigh,
            Flag = p.Flag,
            MetricKey = ReferenceRangeCatalog.MetricKeyFor(p.Name)
        }).ToList()
    };
}
