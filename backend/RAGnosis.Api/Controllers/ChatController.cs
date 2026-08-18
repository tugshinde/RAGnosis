using System.Text;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MongoDB.Driver;
using RAGnosis.Api.Data;
using RAGnosis.Api.Dtos;
using RAGnosis.Api.Helpers;
using RAGnosis.Api.Models;
using RAGnosis.Api.Services.Abstractions;

namespace RAGnosis.Api.Controllers;

/// <summary>
/// Report-aware chatbot. Each turn retrieves supporting passages from the medical
/// knowledge base, optionally grounds them in one of the caller's own reports, and
/// asks the language model to answer using only that context.
/// </summary>
[Route("api/chat")]
[Authorize]
public sealed class ChatController(
    MongoContext context,
    IKnowledgeRetrievalService retrieval,
    ILlmService llm,
    ICurrentUser currentUser,
    IAuditService audit,
    ILogger<ChatController> logger) : ApiControllerBase(currentUser)
{
    private const int HistoryTurns = 8;

    private const string SystemPrompt =
        """
        You are RAGnosis, an assistant that explains medical laboratory reports to patients in plain language.

        Rules you must follow:
        - Answer only from the CONTEXT and REPORT sections provided. If they do not contain the answer, say so plainly.
        - Never diagnose a condition, name a specific medication, or suggest a dose.
        - Explain what a value means and whether it sits inside its reference range.
        - Keep answers short, calm and free of alarming language.
        - Close by recommending the patient discuss the result with a qualified clinician.
        """;

    [HttpPost("")]
    public async Task<ActionResult<ChatResponse>> SendMessage([FromBody] ChatRequest request, CancellationToken ct)
    {
        if (!TryGetUserId(out var userId, out var error)) return error!;

        if (!llm.IsConfigured)
            return StatusCode(StatusCodes.Status503ServiceUnavailable, new ApiError(
                "llm_unavailable",
                "The assistant is unavailable because no Groq API key is configured on the server."));

        Report? report = null;
        if (!string.IsNullOrWhiteSpace(request.ReportId))
        {
            if (!BsonJson.IsValidObjectId(request.ReportId))
                return BadRequestError("The report id is not valid.");

            report = await context.Reports.Find(r => r.Id == request.ReportId).FirstOrDefaultAsync(ct);
            if (report is null)
                return NotFoundError("Report not found.");

            if (report.UserId != userId && !CurrentUser.IsInRole(Roles.Doctor, Roles.Admin))
                return ForbiddenError("You do not have access to this report.");

            // The prompt carries the report's measured values, so this is a read of clinical data.
            await audit.RecordAsync(AuditActions.ChatOnReport, report.UserId, report.Id, ct: ct);
        }

        var passages = await retrieval.RetrieveAsync(request.Message, topK: 4, ct);
        var history = await LoadHistoryAsync(userId, request.ReportId, ct);
        var prompt = BuildPrompt(request.Message, report, passages);

        string reply;
        try
        {
            var messages = history
                .Select(m => (m.Role, m.Content))
                .Append((ChatRole.User, prompt))
                .ToList();

            reply = await llm.CompleteAsync(SystemPrompt, messages, ct);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Chat completion failed for user {UserId}.", userId);
            return StatusCode(StatusCodes.Status502BadGateway, new ApiError(
                "llm_error", "The assistant could not be reached. Please try again."));
        }

        var citations = passages.Select(p => p.Title).Distinct().ToList();
        var now = DateTime.UtcNow;

        // Persist both turns so the thread survives a page reload.
        await context.ChatMessages.InsertManyAsync(
        [
            new ChatMessage { UserId = userId, ReportId = report?.Id, Role = ChatRole.User, Content = request.Message, CreatedAt = now },
            new ChatMessage { UserId = userId, ReportId = report?.Id, Role = ChatRole.Assistant, Content = reply, Citations = citations, CreatedAt = now.AddMilliseconds(1) }
        ], cancellationToken: ct);

        return Ok(new ChatResponse
        {
            Response = reply,
            Citations = citations,
            ReportId = report?.Id,
            CreatedAt = now
        });
    }

    [HttpGet("history")]
    public async Task<ActionResult<object>> History(
        [FromQuery(Name = "report_id")] string? reportId,
        [FromQuery] int limit = 50,
        CancellationToken ct = default)
    {
        if (!TryGetUserId(out var userId, out var error)) return error!;

        limit = Math.Clamp(limit, 1, 200);
        var messages = await context.ChatMessages
            .Find(ThreadFilter(userId, reportId))
            .SortBy(m => m.CreatedAt)
            .Limit(limit)
            .ToListAsync(ct);

        return Ok(new
        {
            messages = messages.Select(m => new
            {
                _id = m.Id,
                role = m.Role,
                content = m.Content,
                citations = m.Citations,
                created_at = m.CreatedAt
            })
        });
    }

    [HttpDelete("history")]
    public async Task<IActionResult> ClearHistory(
        [FromQuery(Name = "report_id")] string? reportId, CancellationToken ct = default)
    {
        if (!TryGetUserId(out var userId, out var error)) return error!;

        await context.ChatMessages.DeleteManyAsync(ThreadFilter(userId, reportId), ct);
        return Ok(new { message = "Conversation cleared." });
    }

    private static FilterDefinition<ChatMessage> ThreadFilter(string userId, string? reportId) =>
        Builders<ChatMessage>.Filter.Eq(m => m.UserId, userId)
        & Builders<ChatMessage>.Filter.Eq(m => m.ReportId, string.IsNullOrWhiteSpace(reportId) ? null : reportId);

    private async Task<List<ChatMessage>> LoadHistoryAsync(string userId, string? reportId, CancellationToken ct)
    {
        var recent = await context.ChatMessages
            .Find(ThreadFilter(userId, reportId))
            .SortByDescending(m => m.CreatedAt)
            .Limit(HistoryTurns)
            .ToListAsync(ct);

        recent.Reverse();
        return recent;
    }

    /// <summary>Assembles retrieved passages and the report's own findings into one grounded prompt.</summary>
    private static string BuildPrompt(string question, Report? report, IReadOnlyList<RetrievedPassage> passages)
    {
        var builder = new StringBuilder();

        if (passages.Count > 0)
        {
            builder.AppendLine("CONTEXT:");
            foreach (var passage in passages)
                builder.AppendLine($"- {passage.Title}: {passage.Content}");
            builder.AppendLine();
        }

        if (report is not null)
        {
            builder.AppendLine("REPORT:");
            builder.AppendLine($"File: {report.OriginalName}");

            if (!string.IsNullOrWhiteSpace(report.Summary))
                builder.AppendLine($"Summary: {report.Summary}");

            if (report.Parameters.Count > 0)
            {
                builder.AppendLine("Measured values:");
                foreach (var p in report.Parameters)
                {
                    var range = (p.ReferenceLow, p.ReferenceHigh) switch
                    {
                        (not null, not null) => $"{p.ReferenceLow:0.##}-{p.ReferenceHigh:0.##}",
                        (not null, null)     => $">= {p.ReferenceLow:0.##}",
                        (null, not null)     => $"<= {p.ReferenceHigh:0.##}",
                        _                    => "not established"
                    };
                    builder.AppendLine($"- {p.Name}: {p.Value:0.##} {p.Unit} (reference {range}) — {p.Flag}");
                }
            }
            builder.AppendLine();
        }

        builder.AppendLine("QUESTION:");
        builder.Append(question);

        return builder.ToString();
    }
}
