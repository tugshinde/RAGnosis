using MongoDB.Driver;
using RAGnosis.Api.Data;
using RAGnosis.Api.Models;
using RAGnosis.Api.Services.Abstractions;

namespace RAGnosis.Api.Services;

/// <summary>
/// Runs the analysis pipeline for one report: extract text, detect parameters,
/// flag them against reference ranges, and build recommendations.
/// Failures are recorded on the report rather than thrown away, so the UI can show why.
/// </summary>
public sealed class ReportAnalysisService(
    MongoContext context,
    ITextExtractionService extraction,
    IParameterExtractionService parameters,
    IRecommendationService recommendations,
    ILogger<ReportAnalysisService> logger)
{
    /// <summary>
    /// A report is only worth keeping if the text could be read and at least one clinical
    /// parameter was recognised. Anything else — a corrupt scan, a holiday photo, a non-medical
    /// PDF — is not a medical record and must not occupy a slot in the patient's history.
    /// </summary>
    public static bool IsUsable(Report report) =>
        report.Status != ReportStatus.Failed && report.Parameters.Count > 0;

    /// <summary>
    /// Runs the pipeline against the stored file and fills in the report, touching no
    /// database. Callers use this to decide whether a report is worth persisting at all.
    /// </summary>
    public async Task<Report> AnalyzeInMemoryAsync(Report report, CancellationToken ct = default)
    {
        try
        {
            var text = await extraction.ExtractAsync(report.StoredPath, report.ContentType, ct);
            var detected = parameters.Extract(text);

            report.ExtractedText = text;
            report.Parameters = detected;

            // Flat metric map the dashboard charts directly, plus a best-guess panel name.
            report.Metrics = BuildMetrics(detected);
            if (string.IsNullOrWhiteSpace(report.ReportType))
                report.ReportType = ReferenceRangeCatalog.InferReportType(detected.Select(p => p.Name));
            report.Recommendations = recommendations.Build(detected);
            report.Summary = recommendations.BuildSummary(detected);
            report.Status = ReportStatus.Completed;
            report.ErrorMessage = null;
            report.AnalyzedAt = DateTime.UtcNow;

            logger.LogInformation(
                "Analysed {File}: {Count} parameters detected.", report.OriginalName, detected.Count);
        }
        catch (Exception ex)
        {
            // Recorded on the report rather than thrown, so the caller can explain the failure.
            logger.LogError(ex, "Analysis failed for {File}.", report.OriginalName);
            report.Status = ReportStatus.Failed;
            report.ErrorMessage = ex.Message;
        }

        return report;
    }

    /// <summary>Re-runs analysis for a report that is already stored, writing the result back.</summary>
    public async Task<Report> AnalyzeAsync(Report report, CancellationToken ct = default)
    {
        await SetStatusAsync(report.Id!, ReportStatus.Processing, null, ct);

        await AnalyzeInMemoryAsync(report, ct);

        if (report.Status == ReportStatus.Failed)
        {
            await SetStatusAsync(report.Id!, ReportStatus.Failed, report.ErrorMessage, ct);
            return report;
        }

        try
        {
            var update = Builders<Report>.Update
                .Set(r => r.ExtractedText, report.ExtractedText)
                .Set(r => r.Parameters, report.Parameters)
                .Set(r => r.Metrics, report.Metrics)
                .Set(r => r.ReportType, report.ReportType)
                .Set(r => r.Recommendations, report.Recommendations)
                .Set(r => r.Summary, report.Summary)
                .Set(r => r.Status, report.Status)
                .Set(r => r.ErrorMessage, report.ErrorMessage)
                .Set(r => r.AnalyzedAt, report.AnalyzedAt);

            await context.Reports.UpdateOneAsync(r => r.Id == report.Id, update, cancellationToken: ct);
            return report;
        }
        catch (Exception ex)
        {
            // The analysis itself succeeded; only writing the result back failed.
            logger.LogError(ex, "Could not persist analysis for report {ReportId}.", report.Id);

            report.Status = ReportStatus.Failed;
            report.ErrorMessage = ex.Message;

            await SetStatusAsync(report.Id!, ReportStatus.Failed, ex.Message, ct);
            return report;
        }
    }

    /// <summary>Projects detected parameters onto the dashboard's metric keys.</summary>
    private static Dictionary<string, double> BuildMetrics(IEnumerable<ReportParameter> parameters)
    {
        var metrics = new Dictionary<string, double>();

        foreach (var p in parameters)
        {
            var key = ReferenceRangeCatalog.MetricKeyFor(p.Name);
            if (key is not null) metrics[key] = p.Value;
        }

        return metrics;
    }

    private Task SetStatusAsync(string reportId, string status, string? error, CancellationToken ct)
    {
        var update = Builders<Report>.Update
            .Set(r => r.Status, status)
            .Set(r => r.ErrorMessage, error);

        return context.Reports.UpdateOneAsync(r => r.Id == reportId, update, cancellationToken: ct);
    }
}
