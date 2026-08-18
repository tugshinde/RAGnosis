using System.Text.Json.Serialization;

namespace RAGnosis.Api.Dtos;

/// <summary>
/// Error envelope. The client reads `error` for the short code and falls back to `message`,
/// so both are always populated.
/// </summary>
public sealed class ApiError
{
    public string Error { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;

    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public Dictionary<string, string[]>? Errors { get; set; }

    public ApiError() { }

    public ApiError(string message)
    {
        Error = message;
        Message = message;
    }

    public ApiError(string error, string message)
    {
        Error = error;
        Message = message;
    }
}
