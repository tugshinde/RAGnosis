using System.Text;

namespace RAGnosis.Api.Middleware;

/// <summary>
/// Gives every request a correlation id, echoes it back on the response, and attaches it to
/// each log scope so a single user-visible failure can be traced through the whole request.
/// An inbound id is honoured so a caller can correlate across services.
/// </summary>
public sealed class CorrelationIdMiddleware(RequestDelegate next, ILogger<CorrelationIdMiddleware> logger)
{
    public const string HeaderName = "X-Correlation-ID";
    public const string ItemKey = "CorrelationId";

    private const int MaxLength = 64;

    public async Task InvokeAsync(HttpContext context)
    {
        var correlationId = Sanitize(context.Request.Headers[HeaderName]) ?? Guid.NewGuid().ToString("n");

        context.Items[ItemKey] = correlationId;

        // Set on the response before the body starts, since headers are immutable after that.
        context.Response.OnStarting(() =>
        {
            context.Response.Headers[HeaderName] = correlationId;
            return Task.CompletedTask;
        });

        using (logger.BeginScope(new Dictionary<string, object> { [ItemKey] = correlationId }))
        {
            await next(context);
        }
    }

    /// <summary>
    /// Inbound header values are attacker-controlled and end up in log files, so anything
    /// that could forge a log line (newlines, control characters) is rejected outright
    /// rather than escaped.
    /// </summary>
    private static string? Sanitize(string? value)
    {
        if (string.IsNullOrWhiteSpace(value)) return null;

        var trimmed = value.Trim();
        if (trimmed.Length > MaxLength) return null;

        var builder = new StringBuilder(trimmed.Length);
        foreach (var c in trimmed)
        {
            if (!char.IsAsciiLetterOrDigit(c) && c != '-' && c != '_' && c != '.') return null;
            builder.Append(c);
        }

        return builder.ToString();
    }
}

/// <summary>Logs one line per request with method, path, status, and elapsed milliseconds.</summary>
public sealed class RequestLoggingMiddleware(RequestDelegate next, ILogger<RequestLoggingMiddleware> logger)
{
    public async Task InvokeAsync(HttpContext context)
    {
        var started = TimeProvider.System.GetTimestamp();

        try
        {
            await next(context);
        }
        finally
        {
            var elapsed = TimeProvider.System.GetElapsedTime(started);
            var status = context.Response.StatusCode;

            // Client and server faults deserve attention; routine traffic stays at a quiet level.
            var level = status >= 500 ? LogLevel.Error
                      : status >= 400 ? LogLevel.Warning
                      : LogLevel.Information;

            logger.Log(level, "{Method} {Path} responded {StatusCode} in {ElapsedMs:0.0} ms",
                context.Request.Method,
                context.Request.Path.Value,
                status,
                elapsed.TotalMilliseconds);
        }
    }
}
