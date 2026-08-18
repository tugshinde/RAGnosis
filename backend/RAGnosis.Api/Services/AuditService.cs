using Microsoft.AspNetCore.Http;
using RAGnosis.Api.Data;
using RAGnosis.Api.Middleware;
using RAGnosis.Api.Models;
using RAGnosis.Api.Services.Abstractions;

namespace RAGnosis.Api.Services;

/// <summary>
/// Writes the audit trail to MongoDB, and mirrors each entry to the application log so the
/// record survives even if the database write is the thing that failed.
/// </summary>
public sealed class AuditService(
    MongoContext context,
    ICurrentUser currentUser,
    IHttpContextAccessor httpContextAccessor,
    ILogger<AuditService> logger) : IAuditService
{
    public async Task RecordAsync(
        string action,
        string? subjectUserId = null,
        string? resourceId = null,
        string? detail = null,
        CancellationToken ct = default)
    {
        var http = httpContextAccessor.HttpContext;
        var actorId = currentUser.UserId ?? "anonymous";

        var entry = new AuditEvent
        {
            OccurredAt = DateTime.UtcNow,
            Action = action,
            ActorId = actorId,
            ActorRole = currentUser.Role ?? "unknown",
            SubjectUserId = subjectUserId,
            ResourceId = resourceId,
            // Only a match against a known subject counts as self-access. An event with no
            // single subject — a directory search, say — is a disclosure about other people,
            // so it must not be filed away as the actor looking at their own records.
            SelfAccess = subjectUserId is not null && subjectUserId == actorId,
            CorrelationId = http?.Items[CorrelationIdMiddleware.ItemKey] as string,
            IpAddress = http?.Connection.RemoteIpAddress?.ToString(),
            Detail = detail
        };

        // Cross-patient reads are the entries an auditor looks for first, so they are visible
        // in the log stream too rather than only in a collection someone has to go query.
        if (!entry.SelfAccess)
        {
            logger.LogInformation(
                "Audit: {ActorRole} {ActorId} performed {Action} (subject {SubjectUserId}, resource {ResourceId}, detail {Detail}).",
                entry.ActorRole, entry.ActorId, entry.Action,
                entry.SubjectUserId ?? "n/a", entry.ResourceId ?? "n/a", entry.Detail ?? "n/a");
        }

        try
        {
            await context.AuditEvents.InsertOneAsync(entry, cancellationToken: ct);
        }
        catch (Exception ex)
        {
            // Losing an audit row must not fail the clinical action the user was performing,
            // but it is a real defect: log at Error so it surfaces in monitoring.
            logger.LogError(ex,
                "Failed to persist audit entry {Action} by {ActorId} on {SubjectUserId}.",
                action, actorId, subjectUserId);
        }
    }
}
