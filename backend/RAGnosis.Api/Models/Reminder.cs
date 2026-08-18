using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace RAGnosis.Api.Models;

[BsonIgnoreExtraElements]
public sealed class Reminder
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string? Id { get; set; }

    [BsonElement("user_id")]
    [BsonRepresentation(BsonType.ObjectId)]
    public string UserId { get; set; } = string.Empty;

    [BsonElement("medicine_name")]
    public string MedicineName { get; set; } = string.Empty;

    [BsonElement("dosage")]
    [BsonIgnoreIfNull]
    public string? Dosage { get; set; }

    /// <summary>24h "HH:mm" strings, kept as text so the client can render without timezone maths.</summary>
    [BsonElement("times")]
    public List<string> Times { get; set; } = [];

    [BsonElement("start_date")]
    public DateTime StartDate { get; set; } = DateTime.UtcNow.Date;

    [BsonElement("end_date")]
    [BsonIgnoreIfNull]
    public DateTime? EndDate { get; set; }

    [BsonElement("frequency")]
    public string Frequency { get; set; } = "daily";

    [BsonElement("notes")]
    [BsonIgnoreIfNull]
    public string? Notes { get; set; }

    [BsonElement("is_active")]
    public bool IsActive { get; set; } = true;

    [BsonElement("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
