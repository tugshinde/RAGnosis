using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Options;
using RAGnosis.Api.Configuration;
using RAGnosis.Api.Services.Abstractions;

namespace RAGnosis.Api.Services;

/// <summary>Calls Groq's OpenAI-compatible chat completions endpoint.</summary>
public sealed class GroqLlmService(
    HttpClient httpClient,
    IOptions<GroqSettings> options,
    ILogger<GroqLlmService> logger) : ILlmService
{
    private readonly GroqSettings _settings = options.Value;

    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    /// <summary>
    /// Keys routinely arrive with stray whitespace — a trailing space inside the quotes of a
    /// shell command, or a newline from a copy-paste. Untrimmed, that produces a malformed
    /// Bearer header and a 401 that reads exactly like an invalid key, so it is stripped once
    /// here rather than debugged repeatedly.
    /// </summary>
    private string ApiKey => _settings.ApiKey?.Trim() ?? string.Empty;

    public bool IsConfigured => !string.IsNullOrWhiteSpace(ApiKey);

    public async Task<string> CompleteAsync(
        string systemPrompt,
        IReadOnlyList<(string Role, string Content)> messages,
        CancellationToken ct = default)
    {
        if (!IsConfigured)
            throw new InvalidOperationException("Groq:ApiKey is not configured.");

        var payload = new
        {
            model = _settings.Model,
            max_tokens = _settings.MaxTokens,
            temperature = 0.2,
            messages = new[] { new { role = "system", content = systemPrompt } }
                .Concat(messages.Select(m => new { role = m.Role, content = m.Content }))
                .ToArray()
        };

        using var request = new HttpRequestMessage(HttpMethod.Post, $"{_settings.BaseUrl.TrimEnd('/')}/chat/completions")
        {
            Content = new StringContent(JsonSerializer.Serialize(payload, JsonOptions), Encoding.UTF8, "application/json")
        };
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", ApiKey);

        using var response = await httpClient.SendAsync(request, ct);
        var body = await response.Content.ReadAsStringAsync(ct);

        if (!response.IsSuccessStatusCode)
        {
            logger.LogError("Groq returned {Status}: {Body}", (int)response.StatusCode, body);
            throw new HttpRequestException($"The language model service returned {(int)response.StatusCode}.");
        }

        using var document = JsonDocument.Parse(body);
        var content = document.RootElement
            .GetProperty("choices")[0]
            .GetProperty("message")
            .GetProperty("content")
            .GetString();

        return content?.Trim() ?? string.Empty;
    }
}
