using System.Text.Json;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using RAGnosis.Api.Dtos;

namespace RAGnosis.Api.Middleware;

/// <summary>
/// Turns any unhandled exception into the same snake_case error envelope every other
/// endpoint returns, so the client's single error path keeps working instead of meeting
/// an empty body or an HTML stack trace. Internal detail is only echoed in Development.
/// </summary>
public sealed class GlobalExceptionHandler(
    IHostEnvironment environment,
    IOptions<JsonOptions> jsonOptions,
    ILogger<GlobalExceptionHandler> logger) : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(
        HttpContext httpContext, Exception exception, CancellationToken cancellationToken)
    {
        var correlationId = httpContext.Items[CorrelationIdMiddleware.ItemKey] as string;

        logger.LogError(exception,
            "Unhandled exception on {Method} {Path} (correlation {CorrelationId})",
            httpContext.Request.Method, httpContext.Request.Path.Value, correlationId);

        // A cancelled request has no client left to answer, and 499 keeps it out of the error budget.
        if (exception is OperationCanceledException && httpContext.RequestAborted.IsCancellationRequested)
        {
            httpContext.Response.StatusCode = 499;
            return true;
        }

        // The response may have already begun streaming, in which case the status line is gone.
        if (httpContext.Response.HasStarted)
        {
            logger.LogWarning("Response had already started; the error envelope could not be written.");
            return false;
        }

        var (status, code, message) = Map(exception);

        // Never surface raw exception text outside Development — messages routinely carry
        // connection strings, file paths, and other internals.
        var detail = environment.IsDevelopment() ? exception.Message : message;

        httpContext.Response.Clear();
        httpContext.Response.StatusCode = status;
        httpContext.Response.ContentType = "application/json";

        var payload = new ApiError(code, detail);

        await JsonSerializer.SerializeAsync(
            httpContext.Response.Body, payload, jsonOptions.Value.JsonSerializerOptions, cancellationToken);

        return true;
    }

    private static (int Status, string Code, string Message) Map(Exception exception) => exception switch
    {
        // Thrown by services when a precondition fails (missing OCR data, unavailable model).
        InvalidOperationException => (StatusCodes.Status409Conflict, "invalid_operation",
            "The request could not be completed in the current state."),

        ArgumentException => (StatusCodes.Status400BadRequest, "invalid_request",
            "The request was not valid."),

        UnauthorizedAccessException => (StatusCodes.Status403Forbidden, "forbidden",
            "You do not have access to this resource."),

        TimeoutException => (StatusCodes.Status504GatewayTimeout, "upstream_timeout",
            "An upstream service did not respond in time."),

        _ => (StatusCodes.Status500InternalServerError, "internal_error",
            "Something went wrong. Please try again.")
    };
}
