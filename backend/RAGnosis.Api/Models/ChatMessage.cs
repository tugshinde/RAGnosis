using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace RAGnosis.Api.Models;

public static class ChatRole
{
    public const string User = "user";
    public const string Assistant = "assistant";
    public const string System = "system";
}

/// <summary>One turn of a report-scoped chat session, persisted so the thread survives reloads.</summary>
[BsonIgnoreExtraElements]
public sealed class ChatMessage
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string? Id { get; set; }

    [BsonElement("user_id")]
    [BsonRepresentation(BsonType.ObjectId)]
    public string UserId { get; set; } = string.Empty;

    /// <summary>Null for general medical questions not tied to a specific report.</summary>
    [BsonElement("report_id")]
    [BsonRepresentation(BsonType.ObjectId)]
    [BsonIgnoreIfNull]
    public string? ReportId { get; set; }

    [BsonElement("role")]
    public string Role { get; set; } = ChatRole.User;

    [BsonElement("content")]
    public string Content { get; set; } = string.Empty;

    /// <summary>Knowledge-base passages the answer was grounded in.</summary>
    [BsonElement("citations")]
    public List<string> Citations { get; set; } = [];

    [BsonElement("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

/// <summary>A chunk of curated medical reference text plus its cached embedding vector.</summary>
[BsonIgnoreExtraElements]
public sealed class KnowledgeChunk
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string? Id { get; set; }

    [BsonElement("title")]
    public string Title { get; set; } = string.Empty;

    [BsonElement("content")]
    public string Content { get; set; } = string.Empty;

    [BsonElement("source")]
    [BsonIgnoreIfNull]
    public string? Source { get; set; }

    [BsonElement("embedding")]
    public float[] Embedding { get; set; } = [];

    [BsonElement("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
