using MongoDB.Bson;

namespace RAGnosis.Api.Helpers;

/// <summary>
/// Helpers for moving between Mongo's ObjectId and the plain strings the JSON contract uses.
/// </summary>
public static class BsonJson
{
    public static bool IsValidObjectId(string? id) =>
        !string.IsNullOrWhiteSpace(id) && ObjectId.TryParse(id, out _);

    public static ObjectId? ToObjectId(string? id) =>
        ObjectId.TryParse(id, out var parsed) ? parsed : null;

    public static string NewId() => ObjectId.GenerateNewId().ToString();

    /// <summary>Formats a UTC timestamp as ISO-8601 with a trailing Z, matching the existing contract.</summary>
    public static string ToIso(DateTime value) =>
        DateTime.SpecifyKind(value, value.Kind == DateTimeKind.Unspecified ? DateTimeKind.Utc : value.Kind)
            .ToUniversalTime()
            .ToString("yyyy-MM-ddTHH:mm:ssZ");

    public static string? ToIso(DateTime? value) => value is null ? null : ToIso(value.Value);
}
