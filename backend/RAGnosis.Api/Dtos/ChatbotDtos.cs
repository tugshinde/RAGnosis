using System.ComponentModel.DataAnnotations;

namespace RAGnosis.Api.Dtos;

public sealed class ChatRequest
{
    [Required, StringLength(2000, MinimumLength = 1)]
    public string Message { get; set; } = string.Empty;

    /// <summary>Scopes the answer to one report. Omit for general questions.</summary>
    public string? ReportId { get; set; }

    /// <summary>Recent turns supplied by the client; the server also keeps its own copy.</summary>
    public List<ChatTurn>? History { get; set; }
}

public sealed class ChatTurn
{
    public string Role { get; set; } = "user";
    public string Content { get; set; } = string.Empty;
}

public sealed class ChatResponse
{
    /// <summary>The assistant's reply. Named "response" to match the chat panel.</summary>
    public string Response { get; set; } = string.Empty;

    public List<string> Citations { get; set; } = [];
    public string? ReportId { get; set; }
    public DateTime CreatedAt { get; set; }
}
