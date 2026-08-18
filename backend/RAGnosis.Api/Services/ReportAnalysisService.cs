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
    public async Task<Report> AnalyzeAsync(Report report, CancellationToken ct = default)
    {
        await SetStatusAsync(report.Id!, ReportStatus.Processing, null, ct);

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

            logger.LogInformation(
                "Report {ReportId} analysed: {Count} parameters detected.", report.Id, detected.Count);

            return report;
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Analysis failed for report {ReportId}.", report.Id);

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
