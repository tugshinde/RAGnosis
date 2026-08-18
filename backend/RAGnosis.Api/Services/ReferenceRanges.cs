namespace RAGnosis.Api.Services;

/// <summary>
/// A clinical parameter the parser knows how to recognise, together with its
/// canonical unit and adult reference interval.
/// </summary>
public sealed record ReferenceRange(
    string CanonicalName,
    string[] Aliases,
    string Unit,
    double? Low,
    double? High,
    string LowAdvice,
    string HighAdvice,
    string? MetricKey = null,
    string? ReportType = null);

/// <summary>
/// Adult reference intervals used to flag results. Values vary between laboratories,
/// so a range printed on the report itself always takes precedence over these defaults.
/// </summary>
public static class ReferenceRangeCatalog
{
    public static readonly IReadOnlyList<ReferenceRange> All =
    [
        new("Haemoglobin", ["haemoglobin", "hemoglobin", "hb", "hgb"], "g/dL", 13.0, 17.0,
            "A low haemoglobin level can point to anaemia. Iron-rich foods help, and a clinician can identify the underlying cause.",
            "A raised haemoglobin level can follow dehydration or other conditions and is worth reviewing with a clinician.",
            "hemoglobin", "cbc"),

        new("White Blood Cell Count", ["wbc", "white blood cell", "leukocyte", "total leucocyte count", "tlc"], "10^3/uL", 4.0, 11.0,
            "A low white cell count can reduce resistance to infection and should be reviewed.",
            "A raised white cell count often accompanies infection or inflammation.",
            "wbc", "cbc"),

        new("Red Blood Cell Count", ["rbc", "red blood cell", "erythrocyte", "red cell count"], "M/uL", 4.0, 5.5,
            "A low red cell count can accompany anaemia and is usually interpreted alongside haemoglobin.",
            "A raised red cell count can follow dehydration and is worth reviewing.",
            "rbc", "cbc"),

        new("Platelet Count", ["platelet", "platelets", "plt"], "10^3/uL", 150, 450,
            "A low platelet count can increase bruising and bleeding — worth discussing promptly.",
            "A raised platelet count can follow inflammation and should be reviewed.",
            "platelets", "cbc"),

        new("Fasting Blood Glucose", ["fasting blood sugar", "fasting glucose", "fbs", "glucose fasting", "fasting plasma glucose"], "mg/dL", 70, 99,
            "A low fasting glucose reading can cause shakiness or dizziness; discuss timing of meals and any medication with a clinician.",
            "A raised fasting glucose reading may indicate prediabetes or diabetes. Reducing refined carbohydrates and staying active help, alongside clinical follow-up.",
            "glucose", "glucose"),

        new("HbA1c", ["hba1c", "glycated haemoglobin", "glycated hemoglobin", "a1c"], "%", 4.0, 5.6,
            "A low HbA1c is uncommon and generally not a concern on its own.",
            "A raised HbA1c reflects higher average blood sugar over recent months and warrants a clinical review.",
            null, "glucose"),

        new("Total Cholesterol", ["total cholesterol", "cholesterol total", "cholesterol"], "mg/dL", null, 200,
            "", "Raised total cholesterol adds to cardiovascular risk. Diet, activity and clinical review all help.",
            "cholesterol", "lipid"),

        new("LDL Cholesterol", ["ldl", "ldl cholesterol", "low density lipoprotein"], "mg/dL", null, 100,
            "", "Raised LDL is the main cholesterol driver of cardiovascular risk and is worth acting on.",
            "ldl", "lipid"),

        new("HDL Cholesterol", ["hdl", "hdl cholesterol", "high density lipoprotein"], "mg/dL", 40, null,
            "A low HDL level offers less cardiovascular protection; regular aerobic activity tends to raise it.", "",
            "hdl", "lipid"),

        new("Triglycerides", ["triglyceride", "triglycerides", "tg"], "mg/dL", null, 150,
            "", "Raised triglycerides respond well to reduced sugar and alcohol intake alongside clinical advice.",
            "triglycerides", "lipid"),

        new("Serum Creatinine", ["creatinine", "serum creatinine"], "mg/dL", 0.6, 1.3,
            "A low creatinine is usually of little concern and can reflect lower muscle mass.",
            "A raised creatinine can indicate reduced kidney function and should be reviewed.",
            "creatinine", "kidney"),

        new("Blood Urea Nitrogen", ["bun", "blood urea nitrogen", "urea"], "mg/dL", 7, 20,
            "A low urea level is rarely significant in isolation.",
            "A raised urea level can reflect dehydration or reduced kidney function.",
            "urea", "kidney"),

        new("TSH", ["tsh", "thyroid stimulating hormone"], "uIU/mL", 0.4, 4.0,
            "A low TSH can accompany an overactive thyroid and warrants review.",
            "A raised TSH can accompany an underactive thyroid and warrants review.",
            "tsh", "thyroid"),

        new("Vitamin D", ["vitamin d", "25-hydroxy vitamin d", "25 oh vitamin d", "vit d"], "ng/mL", 30, 100,
            "A low vitamin D level is common; sunlight, diet and supplementation as advised all help.",
            "A very high vitamin D level usually reflects over-supplementation and should be reviewed."),

        new("Vitamin B12", ["vitamin b12", "b12", "cobalamin"], "pg/mL", 200, 900,
            "A low B12 level can cause fatigue and tingling; dietary sources and supplementation help.",
            "A raised B12 level is usually harmless and often reflects supplementation."),

        new("Serum Iron", ["serum iron", "iron"], "ug/dL", 60, 170,
            "A low iron level can contribute to anaemia and fatigue.",
            "A raised iron level should be interpreted alongside ferritin and transferrin saturation."),

        new("Ferritin", ["ferritin"], "ng/mL", 30, 400,
            "A low ferritin level indicates depleted iron stores.",
            "A raised ferritin level can accompany inflammation as well as iron overload."),

        new("SGPT (ALT)", ["sgpt", "alt", "alanine aminotransferase", "alanine transaminase"], "U/L", 7, 56,
            "", "A raised ALT can indicate liver irritation and is worth reviewing, especially alongside other liver values.",
            "sgpt", "liver"),

        new("SGOT (AST)", ["sgot", "ast", "aspartate aminotransferase", "aspartate transaminase"], "U/L", 8, 48,
            "", "A raised AST can reflect liver or muscle stress and should be interpreted with the rest of the panel.",
            "sgot", "liver"),

        new("Total Bilirubin", ["total bilirubin", "bilirubin total", "bilirubin"], "mg/dL", 0.1, 1.2,
            "", "A raised bilirubin level can cause jaundice and needs clinical assessment."),

        new("Serum Albumin", ["albumin", "serum albumin"], "g/dL", 3.5, 5.5,
            "A low albumin level can reflect poor nutrition, liver or kidney issues.",
            "A raised albumin level most often reflects dehydration."),

        new("Uric Acid", ["uric acid"], "mg/dL", 3.5, 7.2,
            "A low uric acid level is rarely clinically significant.",
            "A raised uric acid level is associated with gout; reducing red meat, shellfish and alcohol helps."),

        new("Sodium", ["sodium", "na+", "serum sodium"], "mEq/L", 135, 145,
            "A low sodium level can cause confusion or headaches and needs review.",
            "A raised sodium level usually reflects dehydration."),

        new("Potassium", ["potassium", "k+", "serum potassium"], "mEq/L", 3.5, 5.1,
            "A low potassium level can cause weakness and cramps and should be corrected under guidance.",
            "A raised potassium level can affect heart rhythm and needs prompt clinical review."),

        new("Calcium", ["calcium", "serum calcium", "total calcium"], "mg/dL", 8.5, 10.5,
            "A low calcium level can cause cramps and tingling.",
            "A raised calcium level warrants review of parathyroid function and other causes.")
    ];

    private static readonly Dictionary<string, ReferenceRange> AliasIndex = BuildAliasIndex();

    private static Dictionary<string, ReferenceRange> BuildAliasIndex()
    {
        var index = new Dictionary<string, ReferenceRange>(StringComparer.OrdinalIgnoreCase);
        foreach (var range in All)
        {
            foreach (var alias in range.Aliases)
                index.TryAdd(Canonicalize(alias), range);

            index.TryAdd(Canonicalize(range.CanonicalName), range);
        }
        return index;
    }

    /// <summary>Strips punctuation and collapses whitespace so "Hb (Hemoglobin):" matches "hb".</summary>
    public static string Canonicalize(string raw)
    {
        var chars = raw
            .Where(c => char.IsLetterOrDigit(c) || char.IsWhiteSpace(c))
            .Select(char.ToLowerInvariant)
            .ToArray();

        return string.Join(' ', new string(chars).Split(' ', StringSplitOptions.RemoveEmptyEntries));
    }

    /// <summary>Maps a canonical parameter name to the dashboard's metric key, if it charts one.</summary>
    public static string? MetricKeyFor(string canonicalName) =>
        All.FirstOrDefault(r => r.CanonicalName == canonicalName)?.MetricKey;

    /// <summary>Best-guess panel type for a set of detected parameters, e.g. "cbc" or "lipid".</summary>
    public static string InferReportType(IEnumerable<string> canonicalNames)
    {
        var counts = canonicalNames
            .Select(n => All.FirstOrDefault(r => r.CanonicalName == n)?.ReportType)
            .Where(t => t is not null)
            .GroupBy(t => t!)
            .ToList();

        if (counts.Count == 0) return "general";

        // A report touching several panels is a general profile rather than one named panel.
        var top = counts.OrderByDescending(g => g.Count()).First();
        return counts.Count > 2 ? "general" : top.Key;
    }

    public static ReferenceRange? Match(string label)
    {
        var key = Canonicalize(label);
        if (key.Length == 0) return null;

        if (AliasIndex.TryGetValue(key, out var exact))
            return exact;

        // Fall back to the longest alias contained in the label, which handles
        // labels like "Serum Creatinine (enzymatic)".
        return AliasIndex
            .Where(kv => key.Contains(kv.Key, StringComparison.Ordinal))
            .OrderByDescending(kv => kv.Key.Length)
            .Select(kv => kv.Value)
            .FirstOrDefault();
    }
}
