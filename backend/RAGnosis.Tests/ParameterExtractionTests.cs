using Microsoft.Extensions.Logging.Abstractions;
using RAGnosis.Api.Models;
using RAGnosis.Api.Services;
using Xunit;

namespace RAGnosis.Tests;

public class ParameterExtractionTests
{
    private static ParameterExtractionService Sut() =>
        new(NullLogger<ParameterExtractionService>.Instance);

    private const string SampleReport = """
        CITY DIAGNOSTICS LABORATORY
        Patient: Jane Doe          Age: 34 / F
        ------------------------------------------------------------
        TEST                     RESULT    UNIT       REFERENCE
        Haemoglobin              10.2      g/dL       13.0 - 17.0
        WBC                      7.4       10^3/uL    4.0 - 11.0
        Platelet Count           260       10^3/uL    150 - 450
        Fasting Blood Sugar      118       mg/dL      70 - 99
        Total Cholesterol        215       mg/dL      < 200
        HDL Cholesterol          38        mg/dL      > 40
        TSH                      2.1       uIU/mL     0.4 - 4.0
        Vitamin D                18.5      ng/mL      30 - 100
        ------------------------------------------------------------
        End of report
        """;

    [Fact]
    public void Detects_all_known_parameters_in_a_typical_report()
    {
        var results = Sut().Extract(SampleReport);

        Assert.Equal(8, results.Count);
        Assert.Contains(results, p => p.Name == "Haemoglobin");
        Assert.Contains(results, p => p.Name == "White Blood Cell Count");
        Assert.Contains(results, p => p.Name == "Vitamin D");
    }

    [Fact]
    public void Flags_values_below_their_reference_range_as_low()
    {
        var hb = Sut().Extract(SampleReport).Single(p => p.Name == "Haemoglobin");

        Assert.Equal(10.2, hb.Value, 3);
        Assert.Equal(ParameterFlag.Low, hb.Flag);
        Assert.Equal("g/dL", hb.Unit);
    }

    [Fact]
    public void Flags_values_above_their_reference_range_as_high()
    {
        var results = Sut().Extract(SampleReport);

        Assert.Equal(ParameterFlag.High, results.Single(p => p.Name == "Fasting Blood Glucose").Flag);
        Assert.Equal(ParameterFlag.High, results.Single(p => p.Name == "Total Cholesterol").Flag);
    }

    [Fact]
    public void Flags_in_range_values_as_normal()
    {
        var results = Sut().Extract(SampleReport);

        Assert.Equal(ParameterFlag.Normal, results.Single(p => p.Name == "TSH").Flag);
        Assert.Equal(ParameterFlag.Normal, results.Single(p => p.Name == "Platelet Count").Flag);
    }

    [Fact]
    public void Uses_the_range_printed_on_the_report_over_the_catalog_default()
    {
        // The report states 13.0-17.0 for haemoglobin; both bounds should come from the text.
        var hb = Sut().Extract("Haemoglobin 10.2 g/dL 13.0 - 17.0").Single();

        Assert.Equal(13.0, hb.ReferenceLow);
        Assert.Equal(17.0, hb.ReferenceHigh);
    }

    [Fact]
    public void Falls_back_to_the_catalog_range_when_the_report_omits_one()
    {
        var hb = Sut().Extract("Haemoglobin 10.2 g/dL").Single();

        Assert.Equal(13.0, hb.ReferenceLow);
        Assert.Equal(17.0, hb.ReferenceHigh);
        Assert.Equal(ParameterFlag.Low, hb.Flag);
    }

    [Fact]
    public void Parses_one_sided_upper_bounds()
    {
        var chol = Sut().Extract("Total Cholesterol 215 mg/dL < 200").Single();

        Assert.Null(chol.ReferenceLow);
        Assert.Equal(200, chol.ReferenceHigh);
        Assert.Equal(ParameterFlag.High, chol.Flag);
    }

    [Fact]
    public void Parses_one_sided_lower_bounds()
    {
        var hdl = Sut().Extract("HDL Cholesterol 38 mg/dL > 40").Single();

        Assert.Equal(40, hdl.ReferenceLow);
        Assert.Equal(ParameterFlag.Low, hdl.Flag);
    }

    [Theory]
    [InlineData("Hb 12.1 g/dL", "Haemoglobin")]
    [InlineData("HGB : 12.1", "Haemoglobin")]
    [InlineData("Hemoglobin 12.1", "Haemoglobin")]
    [InlineData("SGPT (ALT) 62 U/L", "SGPT (ALT)")]
    [InlineData("HbA1c 7.2 %", "HbA1c")]
    public void Recognises_common_aliases_and_abbreviations(string line, string expected)
    {
        var result = Sut().Extract(line);

        Assert.Single(result);
        Assert.Equal(expected, result[0].Name);
    }

    [Fact]
    public void Ignores_lines_that_are_not_known_clinical_parameters()
    {
        var text = """
            Patient: Jane Doe
            Age: 34
            Invoice Number 88123
            Room 402
            """;

        Assert.Empty(Sut().Extract(text));
    }

    [Fact]
    public void Keeps_only_the_first_occurrence_of_a_repeated_parameter()
    {
        // Labs often reprint the reference table at the foot of the report.
        var text = "Haemoglobin 10.2 g/dL 13.0 - 17.0\nSome notes\nHaemoglobin 13.0 - 17.0 g/dL";

        var results = Sut().Extract(text);

        Assert.Single(results);
        Assert.Equal(10.2, results[0].Value, 3);
    }

    [Fact]
    public void Handles_comma_decimal_separators()
    {
        var hb = Sut().Extract("Haemoglobin 10,2 g/dL").Single();
        Assert.Equal(10.2, hb.Value, 3);
    }

    [Fact]
    public void Returns_an_empty_list_for_blank_input()
    {
        Assert.Empty(Sut().Extract(""));
        Assert.Empty(Sut().Extract("   \n  \n "));
    }

    [Theory]
    [InlineData(10.2, 13.0, 17.0, ParameterFlag.Low)]
    [InlineData(15.0, 13.0, 17.0, ParameterFlag.Normal)]
    [InlineData(19.0, 13.0, 17.0, ParameterFlag.High)]
    [InlineData(13.0, 13.0, 17.0, ParameterFlag.Normal)]  // boundary is inclusive
    [InlineData(17.0, 13.0, 17.0, ParameterFlag.Normal)]
    public void Classify_respects_inclusive_boundaries(double value, double low, double high, string expected)
    {
        Assert.Equal(expected, ParameterExtractionService.Classify(value, low, high));
    }

    [Fact]
    public void Classify_returns_unknown_when_no_range_is_available()
    {
        Assert.Equal(ParameterFlag.Unknown, ParameterExtractionService.Classify(5, null, null));
    }
}
