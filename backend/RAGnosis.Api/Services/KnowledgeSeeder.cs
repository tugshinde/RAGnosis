using MongoDB.Driver;
using RAGnosis.Api.Data;
using RAGnosis.Api.Models;
using RAGnosis.Api.Services.Abstractions;

namespace RAGnosis.Api.Services;

/// <summary>
/// Seeds the retrieval corpus from the reference-range catalog on first run and
/// backfills embedding vectors once the ONNX model becomes available.
/// </summary>
public sealed class KnowledgeSeeder(
    MongoContext context,
    IEmbeddingService embeddings,
    ILogger<KnowledgeSeeder> logger)
{
    public async Task SeedAsync(CancellationToken ct = default)
    {
        try
        {
            var existing = await context.KnowledgeChunks.CountDocumentsAsync(
                FilterDefinition<KnowledgeChunk>.Empty, cancellationToken: ct);

            if (existing == 0)
            {
                var chunks = BuildChunks();
                await context.KnowledgeChunks.InsertManyAsync(chunks, cancellationToken: ct);
                logger.LogInformation("Seeded {Count} knowledge chunks.", chunks.Count);
            }

            await BackfillEmbeddingsAsync(ct);
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Knowledge base seeding was skipped.");
        }
    }

    private static List<KnowledgeChunk> BuildChunks()
    {
        var chunks = new List<KnowledgeChunk>();

        foreach (var range in ReferenceRangeCatalog.All)
        {
            var interval = (range.Low, range.High) switch
            {
                (not null, not null) => $"The typical adult reference range is {range.Low:0.##} to {range.High:0.##} {range.Unit}.",
                (not null, null)     => $"The typical adult target is at least {range.Low:0.##} {range.Unit}.",
                (null, not null)     => $"The typical adult target is below {range.High:0.##} {range.Unit}.",
                _                    => "Reference ranges vary between laboratories."
            };

            var body = $"{range.CanonicalName} is reported in {range.Unit}. {interval}";

            if (!string.IsNullOrWhiteSpace(range.LowAdvice))
                body += $" When the result is below range: {range.LowAdvice}";

            if (!string.IsNullOrWhiteSpace(range.HighAdvice))
                body += $" When the result is above range: {range.HighAdvice}";

            body += " Reference ranges differ between laboratories, and results should always be interpreted by a clinician alongside symptoms and history.";

            chunks.Add(new KnowledgeChunk
            {
                Title = range.CanonicalName,
                Content = body,
                Source = "RAGnosis reference range catalogue"
            });
        }

        chunks.Add(new KnowledgeChunk
        {
            Title = "Reading a lab report",
            Content = "A laboratory report lists each measured parameter with its value, unit and reference range. "
                    + "A result marginally outside its range is common and not automatically a sign of disease. "
                    + "Trends across repeated tests are usually more informative than any single reading, and results "
                    + "should be interpreted together rather than one at a time.",
            Source = "RAGnosis guidance"
        });

        chunks.Add(new KnowledgeChunk
        {
            Title = "Scope of this analysis",
            Content = "RAGnosis explains what the values in a report mean in plain language. It does not diagnose "
                    + "conditions, recommend medication or replace a clinician. Any result that is significantly "
                    + "outside its reference range, or that comes with symptoms, should be reviewed by a qualified "
                    + "medical professional.",
            Source = "RAGnosis guidance"
        });

        return chunks;
    }

    /// <summary>Computes vectors for any chunk that does not yet have one.</summary>
    private async Task BackfillEmbeddingsAsync(CancellationToken ct)
    {
        if (!embeddings.IsAvailable)
        {
            logger.LogInformation(
                "Embedding model unavailable — knowledge chunks are stored without vectors and retrieval will use keyword matching.");
            return;
        }

        var pending = await context.KnowledgeChunks
            .Find(Builders<KnowledgeChunk>.Filter.Size(c => c.Embedding, 0))
            .ToListAsync(ct);

        if (pending.Count == 0) return;

        var texts = pending.Select(c => $"{c.Title}. {c.Content}").ToList();
        var vectors = await embeddings.EmbedBatchAsync(texts, ct);

        var writes = pending.Select((chunk, i) => new UpdateOneModel<KnowledgeChunk>(
            Builders<KnowledgeChunk>.Filter.Eq(c => c.Id, chunk.Id),
            Builders<KnowledgeChunk>.Update.Set(c => c.Embedding, vectors[i])));

        await context.KnowledgeChunks.BulkWriteAsync(writes, cancellationToken: ct);
        logger.LogInformation("Backfilled embeddings for {Count} knowledge chunks.", pending.Count);
    }
}
