using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MongoDB.Driver;
using RAGnosis.Api.Data;
using RAGnosis.Api.Dtos;
using RAGnosis.Api.Helpers;
using RAGnosis.Api.Models;
using RAGnosis.Api.Services;
using RAGnosis.Api.Services.Abstractions;

namespace RAGnosis.Api.Controllers;

[Route("api/reports")]
[Authorize]
public sealed class ReportsController(
    MongoContext context,
    IFileStorageService storage,
    ReportAnalysisService analysis,
    ICurrentUser currentUser,
    IAuditService audit,
    ILogger<ReportsController> logger) : ApiControllerBase(currentUser)
{
    /// <summary>Uploads a report and runs the analysis pipeline over it.</summary>
    [HttpPost("upload")]
    [HttpPost("")]
    [RequestSizeLimit(30 * 1024 * 1024)]
    public async Task<ActionResult<ReportResponse>> Upload([FromForm] UploadReportRequest request, CancellationToken ct)
    {
        if (!TryGetUserId(out var userId, out var error)) return error!;

        if (request.File is null)
            return BadRequestError("No file was supplied.");

        if (!storage.IsAllowed(request.File, out var reason))
            return BadRequest(new ApiError("unreadable", reason!));

        var report = await CreateAndAnalyzeAsync(request.File, userId, request.ReportType, ct);

        await audit.RecordAsync(AuditActions.ReportUpload, userId, report.Id, ct: ct);

        // The dashboard shows a dedicated panel when a report can't be read at all.
        if (report.Status == ReportStatus.Failed)
            return BadRequest(new ApiError("unreadable", report.ErrorMessage ?? "The report could not be read."));

        if (report.Parameters.Count == 0)
            return StatusCode(StatusCodes.Status422UnprocessableEntity, new ApiError(
                "out_of_knowledge_base",
                "No recognised clinical parameters were found in this document. "
                + "RAGnosis currently understands common blood panels — please upload a lab report."));

        return Ok(ReportMapper.Map(report));
    }

    /// <summary>Shared by the patient upload and the receptionist's on-behalf upload.</summary>
    internal async Task<Report> CreateAndAnalyzeAsync(IFormFile file, string ownerId, string? reportType, CancellationToken ct)
    {
        var (storedPath, _) = await storage.SaveAsync(file, ownerId, ct);

        var report = new Report
        {
            UserId = ownerId,
            FileName = Path.GetFileName(storedPath),
            OriginalName = Path.GetFileName(file.FileName),
            StoredPath = storedPath,
            ContentType = file.ContentType,
            ReportType = reportType,
            Status = ReportStatus.Pending,
            UploadedAt = DateTime.UtcNow
        };

        // --- Two-write pattern -------------------------------------------------
        // Write 1: the report document itself, which is the source of truth.
        await context.Reports.InsertOneAsync(report, cancellationToken: ct);

        // Write 2: a denormalised stub pushed onto the owning user, so the dashboard can
        // list reports without a second query. The report is still valid if this fails,
        // so the failure is logged rather than surfaced.
        try
        {
            await context.Users.UpdateOneAsync(
                u => u.Id == ownerId,
                Builders<User>.Update.Push(u => u.Reports, new UserReportRef
                {
                    ReportId = report.Id!,
                    FileName = report.OriginalName,
                    ReportType = report.ReportType,
                    UploadedAt = report.UploadedAt
                }),
                cancellationToken: ct);
        }
        catch (Exception ex)
        {
            logger.LogError(ex,
                "Report {ReportId} was created but the user stub write failed for {UserId}.", report.Id, ownerId);
        }
        // -----------------------------------------------------------------------

        return await analysis.AnalyzeAsync(report, ct);
    }

    [HttpGet("")]
    public async Task<ActionResult<ReportListResponse>> List(
        [FromQuery(Name = "")] PageRequest paging, CancellationToken ct)
    {
        if (!TryGetUserId(out var userId, out var error)) return error!;

        var query = context.Reports.Find(r => r.UserId == userId);

        var total = await query.CountDocumentsAsync(ct);

        var reports = await query
            .SortByDescending(r => r.UploadedAt)
            .Skip(paging.Skip)
            .Limit(paging.Size)
            .ToListAsync(ct);

        return Ok(new ReportListResponse
        {
            Reports = reports.Select(ReportMapper.Map).ToList(),
            Pagination = PageInfo.From(paging, total)
        });
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<ReportResponse>> GetById(string id, CancellationToken ct)
    {
        var (report, failure) = await LoadOwnedReportAsync(id, ct);
        if (failure is not null) return failure;

        await audit.RecordAsync(AuditActions.ReportRead, report!.UserId, report.Id, ct: ct);
        return Ok(ReportMapper.Map(report));
    }

    /// <summary>Streams the originally uploaded file back to its owner.</summary>
    [HttpGet("{id}/file")]
    public async Task<IActionResult> Download(string id, CancellationToken ct)
    {
        var (report, failure) = await LoadOwnedReportAsync(id, ct);
        if (failure is not null) return failure;

        var stream = await storage.OpenReadAsync(report!.StoredPath, ct);
        if (stream is null)
            return NotFoundError("The stored file is no longer available.");

        // Recorded before streaming: once the body starts the response cannot be failed,
        // and an unrecorded download is exactly what the trail exists to catch.
        await audit.RecordAsync(AuditActions.ReportDownload, report.UserId, report.Id, ct: ct);

        return File(stream, report.ContentType ?? "application/octet-stream", report.OriginalName);
    }

    /// <summary>Re-runs analysis, useful after the extraction rules change.</summary>
    [HttpPost("{id}/reanalyze")]
    public async Task<ActionResult<ReportResponse>> Reanalyze(string id, CancellationToken ct)
    {
        var (report, failure) = await LoadOwnedReportAsync(id, ct);
        if (failure is not null) return failure;

        var updated = await analysis.AnalyzeAsync(report!, ct);
        return Ok(ReportMapper.Map(updated));
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(string id, CancellationToken ct)
    {
        var (report, failure) = await LoadOwnedReportAsync(id, ct);
        if (failure is not null) return failure;

        await context.Reports.DeleteOneAsync(r => r.Id == report!.Id, ct);

        // Mirror of the two-write pattern: keep the user stub list consistent.
        await context.Users.UpdateOneAsync(
            u => u.Id == report!.UserId,
            Builders<User>.Update.PullFilter(u => u.Reports, r => r.ReportId == report!.Id),
            cancellationToken: ct);

        try { storage.Delete(report!.StoredPath); }
        catch (Exception ex) { logger.LogWarning(ex, "Could not delete stored file for report {ReportId}.", report!.Id); }

        await audit.RecordAsync(AuditActions.ReportDelete, report!.UserId, report.Id, ct: ct);

        return Ok(new { message = "Report deleted." });
    }

    /// <summary>Loads a report and enforces that the caller owns it, or is clinical staff.</summary>
    private async Task<(Report? Report, ActionResult? Failure)> LoadOwnedReportAsync(string id, CancellationToken ct)
    {
        if (!TryGetUserId(out var userId, out var error)) return (null, error);

        if (!BsonJson.IsValidObjectId(id))
            return (null, BadRequestError("The report id is not valid."));

        var report = await context.Reports.Find(r => r.Id == id).FirstOrDefaultAsync(ct);
        if (report is null)
            return (null, NotFoundError("Report not found."));

        if (report.UserId != userId && !CurrentUser.IsInRole(Roles.Doctor, Roles.Admin))
            return (null, ForbiddenError("You do not have access to this report."));

        return (report, null);
    }
}
