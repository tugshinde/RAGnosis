using Microsoft.Extensions.Options;
using Microsoft.ML.OnnxRuntime;
using Microsoft.ML.OnnxRuntime.Tensors;
using RAGnosis.Api.Configuration;
using RAGnosis.Api.Services.Abstractions;

namespace RAGnosis.Api.Services;

/// <summary>
/// Sentence embeddings through ONNX Runtime: WordPiece encode -> transformer forward pass ->
/// attention-masked mean pooling -> L2 normalisation, which is the standard
/// sentence-transformers recipe.
///
/// The model weights are not committed to the repository. Until an ONNX model and vocab file
/// are present at the configured paths, <see cref="IsAvailable"/> is false and callers are
/// expected to fall back to lexical retrieval.
/// </summary>
public sealed class OnnxEmbeddingService : IEmbeddingService, IDisposable
{
    private readonly EmbeddingSettings _settings;
    private readonly ILogger<OnnxEmbeddingService> _logger;
    private readonly InferenceSession? _session;
    private readonly WordPieceTokenizer? _tokenizer;
    private readonly string[] _inputNames = [];
    private readonly SemaphoreSlim _gate = new(1, 1);

    public bool IsAvailable => _session is not null && _tokenizer is not null;
    public int Dimensions => _settings.Dimensions;

    public OnnxEmbeddingService(
        IOptions<EmbeddingSettings> options,
        IWebHostEnvironment env,
        ILogger<OnnxEmbeddingService> logger)
    {
        _settings = options.Value;
        _logger = logger;

        var modelPath = Resolve(env, _settings.ModelPath);
        var vocabPath = Resolve(env, _settings.VocabPath);

        if (!File.Exists(modelPath) || !File.Exists(vocabPath))
        {
            _logger.LogWarning(
                "Embedding model not found (model: {ModelPath}, vocab: {VocabPath}). "
                + "Semantic retrieval is disabled and the chatbot will fall back to keyword matching.",
                modelPath, vocabPath);
            return;
        }

        try
        {
            var sessionOptions = new Microsoft.ML.OnnxRuntime.SessionOptions
            {
                GraphOptimizationLevel = GraphOptimizationLevel.ORT_ENABLE_ALL,
                InterOpNumThreads = 1,
                IntraOpNumThreads = Math.Max(1, Environment.ProcessorCount / 2)
            };

            _session = new InferenceSession(modelPath, sessionOptions);
            _inputNames = [.. _session.InputMetadata.Keys];
            _tokenizer = WordPieceTokenizer.FromFile(vocabPath);

            _logger.LogInformation(
                "ONNX embedding model loaded from {ModelPath}. Inputs: {Inputs}.",
                modelPath, string.Join(", ", _inputNames));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to initialise the ONNX embedding session. Semantic retrieval is disabled.");
            _session?.Dispose();
            _session = null;
            _tokenizer = null;
        }
    }

    private static string Resolve(IWebHostEnvironment env, string path) =>
        Path.IsPathRooted(path) ? path : Path.Combine(env.ContentRootPath, path);

    public async Task<float[]> EmbedAsync(string text, CancellationToken ct = default)
    {
        var batch = await EmbedBatchAsync([text], ct);
        return batch[0];
    }

    public async Task<IReadOnlyList<float[]>> EmbedBatchAsync(IReadOnlyList<string> texts, CancellationToken ct = default)
    {
        if (!IsAvailable)
            throw new InvalidOperationException("The ONNX embedding model is not loaded.");

        if (texts.Count == 0) return [];

        // InferenceSession is thread-safe for Run, but serialising keeps memory predictable
        // on the small instances this is deployed to.
        await _gate.WaitAsync(ct);
        try
        {
            return Run(texts, ct);
        }
        finally
        {
            _gate.Release();
        }
    }

    private List<float[]> Run(IReadOnlyList<string> texts, CancellationToken ct)
    {
        var maxLen = _settings.MaxSequenceLength;
        var batch = texts.Count;

        var inputIds = new DenseTensor<long>([batch, maxLen]);
        var attentionMask = new DenseTensor<long>([batch, maxLen]);
        var tokenTypeIds = new DenseTensor<long>([batch, maxLen]);

        for (var b = 0; b < batch; b++)
        {
            var (ids, mask, types) = _tokenizer!.Encode(texts[b] ?? string.Empty, maxLen);
            for (var t = 0; t < maxLen; t++)
            {
                inputIds[b, t] = ids[t];
                attentionMask[b, t] = mask[t];
                tokenTypeIds[b, t] = types[t];
            }
        }

        var inputs = new List<NamedOnnxValue>
        {
            NamedOnnxValue.CreateFromTensor("input_ids", inputIds),
            NamedOnnxValue.CreateFromTensor("attention_mask", attentionMask)
        };

        // Some exported graphs omit token_type_ids; only supply what the model declares.
        if (_inputNames.Contains("token_type_ids"))
            inputs.Add(NamedOnnxValue.CreateFromTensor("token_type_ids", tokenTypeIds));

        ct.ThrowIfCancellationRequested();

        using var results = _session!.Run(inputs);
        var hidden = results.First().AsTensor<float>();

        // hidden is [batch, sequence, hiddenSize]
        var hiddenSize = hidden.Dimensions[2];
        var output = new List<float[]>(batch);

        for (var b = 0; b < batch; b++)
        {
            var pooled = new float[hiddenSize];
            var counted = 0f;

            for (var t = 0; t < maxLen; t++)
            {
                if (attentionMask[b, t] == 0) continue;
                counted++;
                for (var h = 0; h < hiddenSize; h++)
                    pooled[h] += hidden[b, t, h];
            }

            if (counted > 0)
            {
                for (var h = 0; h < hiddenSize; h++)
                    pooled[h] /= counted;
            }

            output.Add(Normalize(pooled));
        }

        return output;
    }

    /// <summary>L2-normalises in place so cosine similarity reduces to a dot product.</summary>
    private static float[] Normalize(float[] vector)
    {
        var sum = 0d;
        foreach (var v in vector) sum += v * v;

        var magnitude = Math.Sqrt(sum);
        if (magnitude < 1e-9) return vector;

        for (var i = 0; i < vector.Length; i++)
            vector[i] = (float)(vector[i] / magnitude);

        return vector;
    }

    public void Dispose()
    {
        _session?.Dispose();
        _gate.Dispose();
    }
}

public static class VectorMath
{
    /// <summary>Cosine similarity. Returns 0 for mismatched or empty vectors.</summary>
    public static double CosineSimilarity(ReadOnlySpan<float> a, ReadOnlySpan<float> b)
    {
        if (a.Length == 0 || a.Length != b.Length) return 0d;

        double dot = 0, magA = 0, magB = 0;
        for (var i = 0; i < a.Length; i++)
        {
            dot += a[i] * b[i];
            magA += a[i] * a[i];
            magB += b[i] * b[i];
        }

        if (magA < 1e-12 || magB < 1e-12) return 0d;
        return dot / (Math.Sqrt(magA) * Math.Sqrt(magB));
    }
}
