using System.Text;
using Microsoft.Extensions.Options;
using RAGnosis.Api.Configuration;
using RAGnosis.Api.Services.Abstractions;
using Tesseract;
using UglyToad.PdfPig;

namespace RAGnosis.Api.Services;

/// <summary>
/// Routes a document to the right extractor: PdfPig for digital PDFs, Tesseract for images.
/// A PDF whose embedded text layer is empty (a scan saved as PDF) is reported as such rather
/// than silently returning nothing.
/// </summary>
public sealed class TextExtractionService(
    FileStorageService storage,
    IImagePreprocessor preprocessor,
    IOptions<OcrSettings> ocrOptions,
    IWebHostEnvironment env,
    ILogger<TextExtractionService> logger) : ITextExtractionService
{
    private readonly OcrSettings _ocr = ocrOptions.Value;

    private static readonly string[] ImageExtensions = [".png", ".jpg", ".jpeg", ".webp", ".tif", ".tiff", ".bmp"];

    public async Task<string> ExtractAsync(string storedPath, string? contentType, CancellationToken ct = default)
    {
        var fullPath = storage.ResolveFullPath(storedPath)
                       ?? throw new FileNotFoundException("Stored file could not be resolved.", storedPath);

        if (!File.Exists(fullPath))
            throw new FileNotFoundException("Stored file is missing from disk.", storedPath);

        var ext = Path.GetExtension(fullPath).ToLowerInvariant();

        if (ext == ".pdf")
            return await Task.Run(() => ExtractFromPdf(fullPath), ct);

        if (ImageExtensions.Contains(ext))
            return await Task.Run(() => ExtractFromImage(fullPath), ct);

        throw new NotSupportedException($"No extractor is registered for '{ext}' files.");
    }

    private string ExtractFromPdf(string path)
    {
        var builder = new StringBuilder();

        using (var document = PdfDocument.Open(path))
        {
            foreach (var page in document.GetPages())
            {
                // page.Text concatenates every glyph on the page into one unbroken string,
                // which destroys the row structure the parameter parser depends on.
                // Words are regrouped into visual lines by their baseline instead.
                builder.AppendLine(ReconstructLines(page));
            }
        }

        var text = Normalize(builder.ToString());

        if (string.IsNullOrWhiteSpace(text))
        {
            logger.LogInformation("PDF {Path} has no embedded text layer — it is likely a scan.", path);
            throw new InvalidOperationException(
                "This PDF has no selectable text. Please upload the report as an image so it can be read with OCR.");
        }

        return text;
    }

    private string ExtractFromImage(string path)
    {
        var prepared = preprocessor.Preprocess(path);

        var tessData = Path.IsPathRooted(_ocr.TessDataPath)
            ? _ocr.TessDataPath
            : Path.Combine(env.ContentRootPath, _ocr.TessDataPath);

        if (!Directory.Exists(tessData))
        {
            throw new InvalidOperationException(
                $"Tesseract language data was not found at '{tessData}'. " +
                $"Download {_ocr.Language}.traineddata into that folder to enable OCR.");
        }

        try
        {
            using var engine = new TesseractEngine(tessData, _ocr.Language, EngineMode.Default);
            engine.SetVariable("preserve_interword_spaces", "1");

            using var image = Pix.LoadFromFile(prepared);
            using var page = engine.Process(image);

            var text = Normalize(page.GetText());
            logger.LogInformation("OCR finished for {Path} with mean confidence {Confidence:P1}.", path, page.GetMeanConfidence());

            if (string.IsNullOrWhiteSpace(text))
                throw new InvalidOperationException("No readable text was found in the image.");

            return text;
        }
        finally
        {
            // Clean up the preprocessed copy, keeping the user's original upload.
            if (!string.Equals(prepared, path, StringComparison.Ordinal) && File.Exists(prepared))
            {
                try { File.Delete(prepared); } catch { /* best effort */ }
            }
        }
    }

    /// <summary>Y-tolerance in points for treating two words as sharing a line.</summary>
    private const double LineTolerance = 3.0;

    /// <summary>
    /// Rebuilds visual text rows from a page's positioned words: group by baseline,
    /// order left to right, and insert gap-proportional spacing so column boundaries survive.
    /// </summary>
    private static string ReconstructLines(UglyToad.PdfPig.Content.Page page)
    {
        var words = page.GetWords()
            .Where(w => !string.IsNullOrWhiteSpace(w.Text))
            .ToList();

        if (words.Count == 0) return string.Empty;

        var lines = new List<List<UglyToad.PdfPig.Content.Word>>();

        // Top of page downwards, so the output reads in the same order as the document.
        foreach (var word in words.OrderByDescending(w => w.BoundingBox.Bottom))
        {
            var line = lines.FirstOrDefault(l =>
                Math.Abs(l[0].BoundingBox.Bottom - word.BoundingBox.Bottom) <= LineTolerance);

            if (line is null)
                lines.Add([word]);
            else
                line.Add(word);
        }

        var builder = new StringBuilder();

        foreach (var line in lines)
        {
            var ordered = line.OrderBy(w => w.BoundingBox.Left).ToList();
            var text = new StringBuilder(ordered[0].Text);

            for (var i = 1; i < ordered.Count; i++)
            {
                var gap = ordered[i].BoundingBox.Left - ordered[i - 1].BoundingBox.Right;

                // A gap wider than roughly a character marks a column break rather than a
                // word space; padding it keeps "Haemoglobin" and "10.2" from running together.
                var spaces = gap > 12 ? 3 : 1;
                text.Append(new string(' ', spaces)).Append(ordered[i].Text);
            }

            builder.AppendLine(text.ToString());
        }

        return builder.ToString();
    }

    /// <summary>Collapses runs of blank lines and trailing whitespace that confuse the line parser.</summary>
    private static string Normalize(string raw)
    {
        if (string.IsNullOrWhiteSpace(raw)) return string.Empty;

        var lines = raw
            .Replace("\r\n", "\n")
            .Split('\n')
            .Select(l => l.TrimEnd())
            .Where(l => !string.IsNullOrWhiteSpace(l));

        return string.Join('\n', lines).Trim();
    }
}
