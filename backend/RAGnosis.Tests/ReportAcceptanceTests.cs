using RAGnosis.Api.Models;
using RAGnosis.Api.Services;
using Xunit;

namespace RAGnosis.Tests;

/// <summary>
/// Which uploads are worth keeping. This gate runs before anything is written, so a document
/// that fails it leaves no report row, no stub on the owning user, and no file on disk —
/// and therefore never inflates the patient's report count.
/// </summary>
public class ReportAcceptanceTests
{
    private static Report Analysed(string status, params string[] parameterNames) => new()
    {
        OriginalName = "upload.pdf",
        Status = status,
        Parameters = parameterNames
            .Select(name => new ReportParameter { Name = name, Value = 1 })
            .ToList(),
    };

    [Fact]
    public void A_report_with_recognised_parameters_is_kept()
    {
        Assert.True(ReportAnalysisService.IsUsable(
            Analysed(ReportStatus.Completed, "Haemoglobin", "TSH")));
    }

    [Fact]
    public void A_readable_document_with_no_clinical_parameters_is_rejected()
    {
        // The classic case: a photo or a non-medical PDF. The text extracts fine, but nothing
        // in it is a lab value, so it is not a medical record.
        Assert.False(ReportAnalysisService.IsUsable(
            Analysed(ReportStatus.Completed)));
    }

    [Fact]
    public void A_document_that_could_not_be_read_is_rejected()
    {
        Assert.False(ReportAnalysisService.IsUsable(
            Analysed(ReportStatus.Failed)));
    }

    [Fact]
    public void A_failed_analysis_is_rejected_even_if_partial_parameters_survived()
    {
        // Failure wins over a partially populated list: half-extracted values must not be
        // presented to a patient as though they were a complete reading.
        Assert.False(ReportAnalysisService.IsUsable(
            Analysed(ReportStatus.Failed, "Haemoglobin")));
    }
}
