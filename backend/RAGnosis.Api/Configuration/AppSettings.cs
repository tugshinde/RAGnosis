namespace RAGnosis.Api.Configuration;

public sealed class MongoSettings
{
    public const string SectionName = "Mongo";
    public string ConnectionString { get; set; } = "mongodb://localhost:27017";
    public string Database { get; set; } = "ragnosis";
}

public sealed class JwtSettings
{
    public const string SectionName = "Jwt";
    public string Key { get; set; } = string.Empty;
    public string Issuer { get; set; } = "ragnosis";
    public string Audience { get; set; } = "ragnosis-client";
    public int ExpiryHours { get; set; } = 24;
}

public sealed class GroqSettings
{
    public const string SectionName = "Groq";
    public string ApiKey { get; set; } = string.Empty;
    public string BaseUrl { get; set; } = "https://api.groq.com/openai/v1";
    /// <summary>
    /// Groq retires models fairly often; a stale id returns 404 with "model_not_found" rather
    /// than anything resembling a config error. Check /v1/models against your key if chat
    /// starts failing. Avoid the groq/compound* entries here: they are agentic systems that
    /// can fetch outside information, which would break this app's promise to answer only
    /// from the retrieved context.
    /// </summary>
    public string Model { get; set; } = "openai/gpt-oss-120b";
    public int MaxTokens { get; set; } = 1024;
}

public sealed class StorageSettings
{
    public const string SectionName = "Storage";
    public string UploadRoot { get; set; } = "uploads";
    public long MaxFileSizeBytes { get; set; } = 25 * 1024 * 1024;
    public string[] AllowedExtensions { get; set; } = [".pdf", ".png", ".jpg", ".jpeg", ".webp", ".tif", ".tiff"];
}

public sealed class EmbeddingSettings
{
    public const string SectionName = "Embeddings";
    /// <summary>Path to the sentence-transformer ONNX model. When missing, the embedding layer is unavailable.</summary>
    public string ModelPath { get; set; } = "Models/onnx/all-MiniLM-L6-v2.onnx";
    public string VocabPath { get; set; } = "Models/onnx/vocab.txt";
    public int Dimensions { get; set; } = 384;
    public int MaxSequenceLength { get; set; } = 256;
}

public sealed class OcrSettings
{
    public const string SectionName = "Ocr";
    public string TessDataPath { get; set; } = "tessdata";
    public string Language { get; set; } = "eng";
}
