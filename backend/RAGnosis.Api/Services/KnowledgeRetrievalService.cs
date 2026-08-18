using MongoDB.Driver;
using RAGnosis.Api.Data;
using RAGnosis.Api.Models;
using RAGnosis.Api.Services.Abstractions;

namespace RAGnosis.Api.Services;

/// <summary>
/// Retrieval half of the RAG pipeline. Embeds the query, scores it against cached
/// chunk embeddings with cosine similarity, and degrades to keyword overlap when the
/// ONNX layer is unavailable so the chatbot still returns grounded passages.
/// </summary>
public sealed class KnowledgeRetrievalService(
    MongoContext context,
    IEmbeddingService embeddings,
    ILogger<KnowledgeRetrievalService> logger) : IKnowledgeRetrievalService
{
    private const double MinimumScore = 0.25;

    public async Task<IReadOnlyList<RetrievedPassage>> RetrieveAsync(string query, int topK = 4, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(query)) return [];

        var chunks = await context.KnowledgeChunks.Find(FilterDefinition<KnowledgeChunk>.Empty).ToListAsync(ct);
        if (chunks.Count == 0)
        {
            logger.LogWarning("The knowledge base is empty — the chatbot will answer without retrieved context.");
            return [];
        }

        if (embeddings.IsAvailable)
        {
            try
            {
                return await SemanticSearchAsync(query, chunks, topK, ct);
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Semantic retrieval failed; falling back to keyword matching.");
            }
        }

        return KeywordSearch(query, chunks, topK);
    }

    private async Task<IReadOnlyList<RetrievedPassage>> SemanticSearchAsync(
        string query, List<KnowledgeChunk> chunks, int topK, CancellationToken ct)
    {
        var queryVector = await embeddings.EmbedAsync(query, ct);

        var scored = chunks
            .Where(c => c.Embedding.Length > 0)
            .Select(c => new RetrievedPassage(
                c.Title, c.Content, c.Source,
                VectorMath.CosineSimilarity(queryVector, c.Embedding)))
            .Where(p => p.Score >= MinimumScore)
            .OrderByDescending(p => p.Score)
            .Take(topK)
            .ToList();

        // Chunks predate the embedding layer if none carry vectors — fall back rather than return nothing.
        if (scored.Count == 0)
            return KeywordSearch(query, chunks, topK);

        return scored;
    }

    /// <summary>Jaccard-style term overlap. Crude, but keeps answers grounded without a model.</summary>
    private static IReadOnlyList<RetrievedPassage> KeywordSearch(string query, List<KnowledgeChunk> chunks, int topK)
    {
        var terms = Tokenize(query);
        if (terms.Count == 0) return [];

        return chunks
            .Select(c =>
            {
                var haystack = Tokenize($"{c.Title} {c.Content}");
                if (haystack.Count == 0) return new RetrievedPassage(c.Title, c.Content, c.Source, 0);

                var overlap = terms.Count(haystack.Contains);
                return new RetrievedPassage(c.Title, c.Content, c.Source, (double)overlap / terms.Count);
            })
            .Where(p => p.Score > 0)
            .OrderByDescending(p => p.Score)
            .Take(topK)
            .ToList();
    }

    private static readonly HashSet<string> StopWords = new(StringComparer.OrdinalIgnoreCase)
    {
        "the", "is", "at", "which", "on", "a", "an", "and", "or", "of", "to", "in", "for",
        "what", "why", "how", "does", "do", "my", "i", "me", "it", "this", "that", "are", "be", "with", "can"
    };

    private static HashSet<string> Tokenize(string text) =>
        text.Split([' ', '\t', '\n', ',', '.', '?', '!', ';', ':', '(', ')', '/', '-'],
                StringSplitOptions.RemoveEmptyEntries)
            .Select(t => t.ToLowerInvariant())
            .Where(t => t.Length > 2 && !StopWords.Contains(t))
            .ToHashSet(StringComparer.OrdinalIgnoreCase);
}
