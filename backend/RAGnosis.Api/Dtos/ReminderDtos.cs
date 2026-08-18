using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace RAGnosis.Api.Dtos;

public sealed class ReminderListResponse
{
    public List<ReminderResponse> Reminders { get; set; } = [];
    public PageInfo? Pagination { get; set; }
}

public sealed class CreateReminderRequest
{
    [Required, StringLength(160, MinimumLength = 1)]
    public string MedicineName { get; set; } = string.Empty;

    public string? Dosage { get; set; }
    public string? Notes { get; set; }

    /// <summary>One or more 24-hour "HH:mm" strings.</summary>
    [Required, MinLength(1)]
    public List<string> Times { get; set; } = [];

    public string? Frequency { get; set; }
    public DateTime? StartDate { get; set; }
    public DateTime? EndDate { get; set; }
}

public sealed class UpdateReminderRequest
{
    public string? MedicineName { get; set; }
    public string? Dosage { get; set; }
    public string? Notes { get; set; }
    public List<string>? Times { get; set; }
    public string? Frequency { get; set; }

    /// <summary>The dashboard toggles reminders with this flag.</summary>
    public bool? Active { get; set; }
}

public sealed class ReminderResponse
{
    [JsonPropertyName("_id")]
    public string Id { get; set; } = string.Empty;

    public string MedicineName { get; set; } = string.Empty;
    public string? Dosage { get; set; }
    public string? Notes { get; set; }
    public List<string> Times { get; set; } = [];
    public string Frequency { get; set; } = "daily";
    public bool Active { get; set; }
    public DateTime CreatedAt { get; set; }
}
