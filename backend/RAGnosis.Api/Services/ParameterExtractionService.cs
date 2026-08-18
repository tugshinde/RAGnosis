using System.Globalization;
using System.Text.RegularExpressions;
using RAGnosis.Api.Models;
using RAGnosis.Api.Services.Abstractions;

namespace RAGnosis.Api.Services;

/// <summary>
/// Pulls "label - value - unit - range" rows out of OCR'd report text.
/// Lab layouts vary wildly, so the parser works line by line and only keeps rows whose
/// label matches a known clinical parameter.
/// </summary>
public sealed partial class ParameterExtractionService(ILogger<ParameterExtractionService> logger) : IParameterExtractionService
{
    // Label, then the first numeric token: "Haemoglobin 13.4 g/dL 13.0 - 17.0"
    // The separator before the value is mandatory. Without it the lazy label would stop
    // inside a name that contains digits — "HbA1c" would split as label "HbA" / value "1".
    [GeneratedRegex(@"^\s*(?<label>[A-Za-z][A-Za-z0-9\s\(\)\/\.\-\+',]{1,60}?)(?:\s*[:\-–]\s*|\s+)(?<value>\d+(?:[.,]\d+)?)\s*(?<rest>.*)$",
        RegexOptions.Compiled | RegexOptions.CultureInvariant)]
    private static partial Regex LineRegex();

    // An inline reference interval: "13.0 - 17.0", "13.0 to 17.0", "(13-17)"
    [GeneratedRegex(@"(?<low>\d+(?:[.,]\d+)?)\s*(?:-|–|to)\s*(?<high>\d+(?:[.,]\d+)?)",
        RegexOptions.Compiled | RegexOptions.CultureInvariant)]
    private static partial Regex RangeRegex();

    // A one-sided limit: "< 200", "≤ 150", "> 40"
    [GeneratedRegex(@"(?<op><=?|>=?|≤|≥)\s*(?<bound>\d+(?:[.,]\d+)?)",
        RegexOptions.Compiled | RegexOptions.CultureInvariant)]
    private static partial Regex BoundRegex();

    [GeneratedRegex(@"^[A-Za-z%\^\/\.\d]{1,12}", RegexOptions.Compiled | RegexOptions.CultureInvariant)]
    private static partial Regex UnitRegex();

    public List<ReportParameter> Extract(string text)
    {
        var results = new List<ReportParameter>();
        if (string.IsNullOrWhiteSpace(text)) return results;

        var seen = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        foreach (var rawLine in text.Split('\n'))
        {
            var line = rawLine.Trim();
            if (line.Length < 3) continue;

            var match = LineRegex().Match(line);
            if (!match.Success) continue;

            var label = match.Groups["label"].Value.Trim();
            var range = ReferenceRangeCatalog.Match(label);
            if (range is null) continue;

            // Only the first occurrence of a parameter is kept — later mentions are
            // usually the reference table repeated at the foot of the report.
            if (!seen.Add(range.CanonicalName)) continue;

            if (!TryParseNumber(match.Groups["value"].Value, out var value)) continue;

            var rest = match.Groups["rest"].Value.Trim();

            var parameter = new ReportParameter
            {
                Name = range.CanonicalName,
                Value = value,
                Unit = ParseUnit(rest) ?? range.Unit,
                SourceLine = line
            };

            // Prefer the interval printed on the report; fall back to the catalog.
            var (low, high) = ParseInlineRange(rest);
            parameter.ReferenceLow = low ?? range.Low;
            parameter.ReferenceHigh = high ?? range.High;
            parameter.Flag = Classify(parameter.Value, parameter.ReferenceLow, parameter.ReferenceHigh);

            results.Add(parameter);
        }

        logger.LogInformation("Extracted {Count} clinical parameters from report text.", results.Count);
        return results;
    }

    private static bool TryParseNumber(string raw, out double value) =>
        double.TryParse(raw.Replace(',', '.'), NumberStyles.Float, CultureInfo.InvariantCulture, out value);

    private static string? ParseUnit(string rest)
    {
        if (string.IsNullOrWhiteSpace(rest)) return null;

        var candidate = UnitRegex().Match(rest).Value.Trim();
        if (candidate.Length == 0) return null;

        // A bare number here is the start of the reference range, not a unit.
        return double.TryParse(candidate, NumberStyles.Float, CultureInfo.InvariantCulture, out _) ? null : candidate;
    }

    private static (double? Low, double? High) ParseInlineRange(string rest)
    {
        if (string.IsNullOrWhiteSpace(rest)) return (null, null);

        var range = RangeRegex().Match(rest);
        if (range.Success
            && TryParseNumber(range.Groups["low"].Value, out var low)
            && TryParseNumber(range.Groups["high"].Value, out var high)
            && low <= high)
        {
            return (low, high);
        }

        var bound = BoundRegex().Match(rest);
        if (bound.Success && TryParseNumber(bound.Groups["bound"].Value, out var value))
        {
            var op = bound.Groups["op"].Value;
            return op is "<" or "<=" or "≤" ? (null, value) : (value, null);
        }

        return (null, null);
    }

    public static string Classify(double value, double? low, double? high)
    {
        if (low is null && high is null) return ParameterFlag.Unknown;
        if (low is not null && value < low) return ParameterFlag.Low;
        if (high is not null && value > high) return ParameterFlag.High;
        return ParameterFlag.Normal;
    }
}
