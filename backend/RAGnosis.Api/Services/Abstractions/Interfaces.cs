using RAGnosis.Api.Models;

namespace RAGnosis.Api.Services.Abstractions;

public interface ITokenService
{
    (string Token, DateTime ExpiresAt) CreateToken(User user);
}

public interface ICurrentUser
{
    string? UserId { get; }
    string? Email { get; }
    string? Role { get; }
    bool IsAuthenticated { get; }
    bool IsInRole(params string[] roles);
}

/// <summary>Records access to clinical data. Implementations must never throw into the request path.</summary>
public interface IAuditService
{
    /// <param name="action">One of <see cref="AuditActions"/>.</param>
    /// <param name="subjectUserId">The patient whose records were involved.</param>
    /// <param name="resourceId">The specific document, where the action names one.</param>
    /// <param name="detail">Optional context, e.g. the query behind a patient search.</param>
    Task RecordAsync(
        string action,
        string? subjectUserId = null,
        string? resourceId = null,
        string? detail = null,
        CancellationToken ct = default);
}

public interface IFileStorageService
{
    Task<(string StoredPath, long Length)> SaveAsync(IFormFile file, string userId, CancellationToken ct = default);
    bool IsAllowed(IFormFile file, out string? reason);
    Task<Stream?> OpenReadAsync(string storedPath, CancellationToken ct = default);
    void Delete(string storedPath);
}

/// <summary>Pulls text out of an uploaded document — PdfPig for PDFs, Tesseract for images.</summary>
public interface ITextExtractionService
{
    Task<string> ExtractAsync(string storedPath, string? contentType, CancellationToken ct = default);
}

/// <summary>Image clean-up (greyscale, denoise, threshold, deskew) before OCR.</summary>
public interface IImagePreprocessor
{
    /// <summary>Returns a path to a preprocessed copy, or the original path when preprocessing is unavailable.</summary>
    string Preprocess(string imagePath);
}

/// <summary>Finds clinical parameters in raw report text and flags them against reference ranges.</summary>
public interface IParameterExtractionService
{
    List<ReportParameter> Extract(string text);
}

public interface IRecommendationService
{
    List<string> Build(IReadOnlyCollection<ReportParameter> parameters);
    string BuildSummary(IReadOnlyCollection<ReportParameter> parameters);
}

/// <summary>Sentence embeddings via ONNX Runtime.</summary>
public interface IEmbeddingService
{
    /// <summary>False when the ONNX model is not present or the layer is not yet wired up.</summary>
    bool IsAvailable { get; }
    int Dimensions { get; }
    Task<float[]> EmbedAsync(string text, CancellationToken ct = default);
    Task<IReadOnlyList<float[]>> EmbedBatchAsync(IReadOnlyList<string> texts, CancellationToken ct = default);
}

public interface IKnowledgeRetrievalService
{
    Task<IReadOnlyList<RetrievedPassage>> RetrieveAsync(string query, int topK = 4, CancellationToken ct = default);
}

public sealed record RetrievedPassage(string Title, string Content, string? Source, double Score);

public interface ILlmService
{
    bool IsConfigured { get; }
    Task<string> CompleteAsync(string systemPrompt, IReadOnlyList<(string Role, string Content)> messages, CancellationToken ct = default);
}
