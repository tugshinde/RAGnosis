using RAGnosis.Api.Models;
using RAGnosis.Api.Services;
using Xunit;

namespace RAGnosis.Tests;

public class VectorMathTests
{
    [Fact]
    public void Identical_vectors_score_one()
    {
        float[] v = [0.1f, 0.5f, -0.3f, 0.8f];
        Assert.Equal(1.0, VectorMath.CosineSimilarity(v, v), 5);
    }

    [Fact]
    public void Orthogonal_vectors_score_zero()
    {
        Assert.Equal(0.0, VectorMath.CosineSimilarity([1, 0], [0, 1]), 5);
    }

    [Fact]
    public void Opposite_vectors_score_minus_one()
    {
        Assert.Equal(-1.0, VectorMath.CosineSimilarity([1, 2, 3], [-1, -2, -3]), 5);
    }

    [Fact]
    public void Magnitude_does_not_affect_the_score()
    {
        Assert.Equal(1.0, VectorMath.CosineSimilarity([1, 2, 3], [10, 20, 30]), 5);
    }

    [Fact]
    public void Mismatched_or_empty_vectors_score_zero_rather_than_throwing()
    {
        Assert.Equal(0.0, VectorMath.CosineSimilarity([1, 2, 3], [1, 2]));
        Assert.Equal(0.0, VectorMath.CosineSimilarity([], []));
        Assert.Equal(0.0, VectorMath.CosineSimilarity([0, 0], [1, 1]));
    }
}

public class WordPieceTokenizerTests
{
    // A miniature vocabulary in the same layout as a real vocab.txt (index = line number).
    private static readonly string[] Vocab =
    [
        "[PAD]", "[UNK]", "[CLS]", "[SEP]",
        "blood", "sugar", "level", "high", "##s", "##ing", "test", "low", "he", "##mo", "##globin", "."
    ];

    private static WordPieceTokenizer Sut() => new(Vocab);

    [Fact]
    public void Encoding_wraps_the_sequence_in_cls_and_sep()
    {
        var tok = Sut();
        var (ids, mask, _) = tok.Encode("blood sugar", 8);

        Assert.Equal(tok.ClsId, ids[0]);
        Assert.Equal(tok.SepId, ids[3]);
        Assert.Equal([1, 1, 1, 1, 0, 0, 0, 0], mask);
    }

    [Fact]
    public void Output_is_always_padded_to_the_requested_length()
    {
        var (ids, mask, types) = Sut().Encode("blood", 16);

        Assert.Equal(16, ids.Length);
        Assert.Equal(16, mask.Length);
        Assert.Equal(16, types.Length);
    }

    [Fact]
    public void Padding_positions_are_masked_out()
    {
        var tok = Sut();
        var (ids, mask, _) = tok.Encode("blood", 8);

        for (var i = 3; i < 8; i++)
        {
            if (mask[i] == 0) Assert.Equal(tok.PadId, ids[i]);
        }
    }

    [Fact]
    public void Unknown_words_map_to_the_unk_token()
    {
        var tok = Sut();
        var (ids, _, _) = tok.Encode("xyzzy", 8);

        Assert.Equal(tok.UnkId, ids[1]);
    }

    [Fact]
    public void Long_words_are_split_into_subword_pieces()
    {
        var tok = Sut();
        var (ids, mask, _) = tok.Encode("hemoglobin", 8);

        // he + ##mo + ##globin, between [CLS] and [SEP]
        Assert.Equal(5, mask.Count(m => m == 1));
        Assert.DoesNotContain(tok.UnkId, ids[1..4]);
    }

    [Fact]
    public void Text_is_lowercased_before_lookup()
    {
        var tok = Sut();
        var (upper, _, _) = tok.Encode("BLOOD", 8);
        var (lower, _, _) = tok.Encode("blood", 8);

        Assert.Equal(lower, upper);
    }

    [Fact]
    public void Sequences_longer_than_the_limit_are_truncated_but_still_closed_with_sep()
    {
        var tok = Sut();
        var (ids, mask, _) = tok.Encode("blood sugar level high test low blood sugar level", 6);

        Assert.Equal(6, ids.Length);
        Assert.All(mask, m => Assert.Equal(1, m));
        Assert.Equal(tok.SepId, ids[^1]);
    }

    [Fact]
    public void Empty_input_still_produces_a_valid_cls_sep_pair()
    {
        var tok = Sut();
        var (ids, mask, _) = tok.Encode("", 4);

        Assert.Equal(tok.ClsId, ids[0]);
        Assert.Equal(tok.SepId, ids[1]);
        Assert.Equal(2, mask.Count(m => m == 1));
    }

    [Fact]
    public void A_vocabulary_missing_special_tokens_is_rejected_at_construction()
    {
        Assert.Throws<InvalidOperationException>(() => new WordPieceTokenizer(["blood", "sugar"]));
    }
}

public class RecommendationServiceTests
{
    private static readonly RecommendationService Sut = new();

    private static ReportParameter Param(string name, double value, string flag, double? low = null, double? high = null) =>
        new() { Name = name, Value = value, Unit = "g/dL", Flag = flag, ReferenceLow = low, ReferenceHigh = high };

    [Fact]
    public void An_all_normal_report_says_so_and_still_carries_the_disclaimer()
    {
        var result = Sut.Build([Param("Haemoglobin", 14, ParameterFlag.Normal, 13, 17)]);

        Assert.Contains(result, r => r.Contains("within its reference range"));
        Assert.Contains(result, r => r.Contains("not a diagnosis"));
    }

    [Fact]
    public void Every_abnormal_parameter_produces_its_own_line()
    {
        var result = Sut.Build([
            Param("Haemoglobin", 10.2, ParameterFlag.Low, 13, 17),
            Param("Total Cholesterol", 215, ParameterFlag.High, null, 200)
        ]);

        Assert.Contains(result, r => r.StartsWith("Haemoglobin") && r.Contains("below"));
        Assert.Contains(result, r => r.StartsWith("Total Cholesterol") && r.Contains("above"));
    }

    [Fact]
    public void Three_or_more_abnormal_results_prompt_a_combined_review()
    {
        var result = Sut.Build([
            Param("Haemoglobin", 10.2, ParameterFlag.Low, 13, 17),
            Param("Vitamin D", 18, ParameterFlag.Low, 30, 100),
            Param("Total Cholesterol", 215, ParameterFlag.High, null, 200)
        ]);

        Assert.Contains(result, r => r.Contains("3 parameters fall outside"));
    }

    [Fact]
    public void Guidance_never_names_a_medication_or_a_dose()
    {
        var result = Sut.Build([
            Param("Haemoglobin", 10.2, ParameterFlag.Low, 13, 17),
            Param("Fasting Blood Glucose", 118, ParameterFlag.High, 70, 99)
        ]);

        var text = string.Join(" ", result).ToLowerInvariant();

        Assert.DoesNotContain(" mg twice", text);
        Assert.DoesNotContain("prescribe", text);
        Assert.Contains("clinician", text);
    }

    [Fact]
    public void An_empty_report_reports_nothing_found_rather_than_inventing_advice()
    {
        var result = Sut.Build([]);
        Assert.Contains(result, r => r.Contains("No recognised clinical parameters"));
    }

    [Fact]
    public void Summary_counts_results_by_direction()
    {
        var summary = Sut.BuildSummary([
            Param("Haemoglobin", 10.2, ParameterFlag.Low),
            Param("Total Cholesterol", 215, ParameterFlag.High),
            Param("TSH", 2.1, ParameterFlag.Normal)
        ]);

        Assert.Contains("1 above range", summary);
        Assert.Contains("1 below range", summary);
        Assert.Contains("1 within range", summary);
    }
}

public class ReferenceRangeCatalogTests
{
    [Theory]
    [InlineData("hb", "Haemoglobin")]
    [InlineData("HGB", "Haemoglobin")]
    [InlineData("Hemoglobin", "Haemoglobin")]
    [InlineData("Serum Creatinine (enzymatic)", "Serum Creatinine")]
    [InlineData("TOTAL CHOLESTEROL", "Total Cholesterol")]
    [InlineData("vitamin b12", "Vitamin B12")]
    public void Aliases_resolve_to_the_canonical_parameter(string input, string expected)
    {
        Assert.Equal(expected, ReferenceRangeCatalog.Match(input)?.CanonicalName);
    }

    [Fact]
    public void An_unrelated_label_matches_nothing()
    {
        Assert.Null(ReferenceRangeCatalog.Match("Invoice Number"));
        Assert.Null(ReferenceRangeCatalog.Match(""));
    }

    [Fact]
    public void Every_catalog_entry_has_a_usable_range()
    {
        foreach (var range in ReferenceRangeCatalog.All)
        {
            Assert.False(string.IsNullOrWhiteSpace(range.CanonicalName));
            Assert.False(string.IsNullOrWhiteSpace(range.Unit));
            Assert.True(range.Low is not null || range.High is not null,
                $"{range.CanonicalName} has no bound and could never be flagged.");

            if (range.Low is not null && range.High is not null)
                Assert.True(range.Low < range.High, $"{range.CanonicalName} has an inverted range.");
        }
    }

    [Fact]
    public void Canonical_names_are_unique()
    {
        var names = ReferenceRangeCatalog.All.Select(r => r.CanonicalName).ToList();
        Assert.Equal(names.Count, names.Distinct().Count());
    }
}
