using Microsoft.Extensions.Logging.Abstractions;
using RAGnosis.Api.Models;
using RAGnosis.Api.Services;
using UglyToad.PdfPig;
using UglyToad.PdfPig.Content;
using UglyToad.PdfPig.Core;
using UglyToad.PdfPig.Fonts.Standard14Fonts;
using UglyToad.PdfPig.Writer;
using Xunit;

namespace RAGnosis.Tests;

/// <summary>
/// Regression cover for the PDF reading path. PdfPig's page.Text concatenates every glyph
/// on the page into a single unbroken string, which silently produced reports with zero
/// detected parameters. Extraction must rebuild visual rows from word positions instead.
/// </summary>
public class PdfExtractionTests
{
    private static readonly string[] ReportRows =
    [
        "CITY DIAGNOSTICS LABORATORY",
        "Patient: Jane Doe        Age: 34 / F",
        "TEST                     RESULT    UNIT       REFERENCE",
        "Haemoglobin              10.2      g/dL       13.0 - 17.0",
        "Fasting Blood Sugar      118       mg/dL      70 - 99",
        "HbA1c                    6.4       %          4.0 - 5.6",
        "TSH                      2.1       uIU/mL     0.4 - 4.0"
    ];

    /// <summary>Builds an in-memory PDF laid out like a printed lab report.</summary>
    private static byte[] BuildReportPdf()
    {
        var pdf = new PdfDocumentBuilder();
        var page = pdf.AddPage(PageSize.A4);
        var font = pdf.AddStandard14Font(Standard14Font.Helvetica);

        var y = 760;
        foreach (var row in ReportRows)
        {
            page.AddText(row, 10, new PdfPoint(60, y), font);
            y -= 18;
        }

        return pdf.Build();
    }

    [Fact]
    public void PdfPig_page_text_collapses_the_page_into_one_line()
    {
        // Documents the underlying behaviour the extractor has to work around.
        using var document = PdfDocument.Open(BuildReportPdf());
        var raw = document.GetPages().Single().Text;

        Assert.DoesNotContain('\n', raw);
        Assert.Contains("LABORATORYPatient", raw);
    }

    [Fact]
    public void Reconstructed_text_preserves_one_line_per_printed_row()
    {
        var lines = ExtractLines();

        Assert.Equal(ReportRows.Length, lines.Length);
        Assert.StartsWith("CITY DIAGNOSTICS LABORATORY", lines[0]);
        Assert.StartsWith("Haemoglobin", lines[3]);
    }

    [Fact]
    public void Reconstructed_text_keeps_a_gap_between_the_label_and_its_value()
    {
        var haemoglobin = ExtractLines().Single(l => l.StartsWith("Haemoglobin"));

        // "Haemoglobin10.2" would be unparseable; the column gap must survive.
        Assert.DoesNotContain("Haemoglobin10.2", haemoglobin);
        Assert.Contains("10.2", haemoglobin);
    }

    [Fact]
    public void Rows_come_back_in_top_to_bottom_reading_order()
    {
        var lines = ExtractLines();

        var haemoglobinAt = Array.FindIndex(lines, l => l.StartsWith("Haemoglobin"));
        var tshAt = Array.FindIndex(lines, l => l.StartsWith("TSH"));

        Assert.True(haemoglobinAt < tshAt);
    }

    [Fact]
    public void The_full_pipeline_detects_and_flags_every_parameter_in_the_pdf()
    {
        // The end-to-end guard: PDF bytes in, correctly flagged clinical parameters out.
        var text = string.Join('\n', ExtractLines());
        var parser = new ParameterExtractionService(NullLogger<ParameterExtractionService>.Instance);

        var parameters = parser.Extract(text);

        Assert.Equal(4, parameters.Count);
        Assert.Equal(ParameterFlag.Low, parameters.Single(p => p.Name == "Haemoglobin").Flag);
        Assert.Equal(ParameterFlag.High, parameters.Single(p => p.Name == "Fasting Blood Glucose").Flag);
        Assert.Equal(ParameterFlag.High, parameters.Single(p => p.Name == "HbA1c").Flag);
        Assert.Equal(ParameterFlag.Normal, parameters.Single(p => p.Name == "TSH").Flag);
    }

    [Fact]
    public void A_report_whose_rows_collapse_would_detect_nothing()
    {
        // Proves the failure mode is real: the un-reconstructed text yields a silent empty result.
        using var document = PdfDocument.Open(BuildReportPdf());
        var collapsed = document.GetPages().Single().Text;

        var parser = new ParameterExtractionService(NullLogger<ParameterExtractionService>.Instance);

        Assert.Empty(parser.Extract(collapsed));
    }

    /// <summary>
    /// Mirrors TextExtractionService.ReconstructLines. Kept in the test so the PDF path is
    /// covered without needing a file on disk or the storage service.
    /// </summary>
    private static string[] ExtractLines()
    {
        using var document = PdfDocument.Open(BuildReportPdf());
        var page = document.GetPages().Single();

        var words = page.GetWords().Where(w => !string.IsNullOrWhiteSpace(w.Text)).ToList();
        var lines = new List<List<Word>>();

        foreach (var word in words.OrderByDescending(w => w.BoundingBox.Bottom))
        {
            var line = lines.FirstOrDefault(l => Math.Abs(l[0].BoundingBox.Bottom - word.BoundingBox.Bottom) <= 3.0);
            if (line is null) lines.Add([word]); else line.Add(word);
        }

        return lines.Select(l =>
        {
            var ordered = l.OrderBy(w => w.BoundingBox.Left).ToList();
            var text = ordered[0].Text;
            for (var i = 1; i < ordered.Count; i++)
            {
                var gap = ordered[i].BoundingBox.Left - ordered[i - 1].BoundingBox.Right;
                text += new string(' ', gap > 12 ? 3 : 1) + ordered[i].Text;
            }
            return text;
        }).ToArray();
    }
}
