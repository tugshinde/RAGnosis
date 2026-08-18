using RAGnosis.Api.Models;
using RAGnosis.Api.Services.Abstractions;

namespace RAGnosis.Api.Services;

/// <summary>
/// Turns flagged parameters into plain-language guidance. Deliberately conservative:
/// it explains what a result means and points to a clinician rather than advising treatment.
/// </summary>
public sealed class RecommendationService : IRecommendationService
{
    private const string Disclaimer =
        "This analysis is an explanation of your report, not a diagnosis. Please review the results with a qualified clinician before acting on them.";

    public List<string> Build(IReadOnlyCollection<ReportParameter> parameters)
    {
        var recommendations = new List<string>();

        if (parameters.Count == 0)
        {
            recommendations.Add("No recognised clinical parameters were found in this report, so no result-specific guidance can be given.");
            recommendations.Add(Disclaimer);
            return recommendations;
        }

        var abnormal = parameters
            .Where(p => p.Flag is ParameterFlag.Low or ParameterFlag.High)
            .ToList();

        if (abnormal.Count == 0)
        {
            recommendations.Add("Every recognised parameter in this report falls within its reference range.");
            recommendations.Add("Keeping up regular activity, a balanced diet and routine check-ups helps maintain these results.");
            recommendations.Add(Disclaimer);
            return recommendations;
        }

        foreach (var parameter in abnormal.OrderBy(p => p.Name))
        {
            var range = ReferenceRangeCatalog.Match(parameter.Name);
            var advice = parameter.Flag == ParameterFlag.Low ? range?.LowAdvice : range?.HighAdvice;

            var direction = parameter.Flag == ParameterFlag.Low ? "below" : "above";
            var reference = DescribeRange(parameter);

            var line = $"{parameter.Name} is {parameter.Value:0.##} {parameter.Unit}, {direction} the reference range{reference}.";

            if (!string.IsNullOrWhiteSpace(advice))
                line += $" {advice}";

            recommendations.Add(line);
        }

        if (abnormal.Count >= 3)
        {
            recommendations.Add(
                $"{abnormal.Count} parameters fall outside their reference ranges. Bringing the full report to a clinician is worthwhile so the results can be read together rather than one by one.");
        }

        recommendations.Add(Disclaimer);
        return recommendations;
    }

    public string BuildSummary(IReadOnlyCollection<ReportParameter> parameters)
    {
        if (parameters.Count == 0)
            return "No recognised clinical parameters were detected in this report.";

        var low = parameters.Count(p => p.Flag == ParameterFlag.Low);
        var high = parameters.Count(p => p.Flag == ParameterFlag.High);
        var normal = parameters.Count(p => p.Flag == ParameterFlag.Normal);

        if (low == 0 && high == 0)
            return $"All {normal} detected parameters are within their reference ranges.";

        var parts = new List<string>();
        if (high > 0) parts.Add($"{high} above range");
        if (low > 0) parts.Add($"{low} below range");

        return $"{parameters.Count} parameters detected: {string.Join(" and ", parts)}, {normal} within range.";
    }

    private static string DescribeRange(ReportParameter p) => (p.ReferenceLow, p.ReferenceHigh) switch
    {
        (not null, not null) => $" of {p.ReferenceLow:0.##}–{p.ReferenceHigh:0.##}",
        (not null, null)     => $" (expected at least {p.ReferenceLow:0.##})",
        (null, not null)     => $" (expected up to {p.ReferenceHigh:0.##})",
        _                    => string.Empty
    };
}
