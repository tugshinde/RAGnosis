using System.Globalization;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MongoDB.Driver;
using RAGnosis.Api.Data;
using RAGnosis.Api.Dtos;
using RAGnosis.Api.Helpers;
using RAGnosis.Api.Models;
using RAGnosis.Api.Services.Abstractions;

namespace RAGnosis.Api.Controllers;

[Route("api/reminders")]
[Authorize]
public sealed class RemindersController(
    MongoContext context,
    ICurrentUser currentUser) : ApiControllerBase(currentUser)
{
    [HttpGet("")]
    public async Task<ActionResult<ReminderListResponse>> List(
        [FromQuery(Name = "")] PageRequest paging,
        [FromQuery(Name = "active_only")] bool activeOnly = false,
        CancellationToken ct = default)
    {
        if (!TryGetUserId(out var userId, out var error)) return error!;

        var filter = Builders<Reminder>.Filter.Eq(r => r.UserId, userId);
        if (activeOnly)
            filter &= Builders<Reminder>.Filter.Eq(r => r.IsActive, true);

        var query = context.Reminders.Find(filter);

        var total = await query.CountDocumentsAsync(ct);

        var reminders = await query
            .SortByDescending(r => r.CreatedAt)
            .Skip(paging.Skip)
            .Limit(paging.Size)
            .ToListAsync(ct);

        return Ok(new ReminderListResponse
        {
            Reminders = reminders.Select(Map).ToList(),
            Pagination = PageInfo.From(paging, total)
        });
    }

    /// <summary>Doses due today, expanded per scheduled time and sorted chronologically.</summary>
    [HttpGet("today")]
    public async Task<ActionResult<object>> Today(CancellationToken ct)
    {
        if (!TryGetUserId(out var userId, out var error)) return error!;

        var today = DateTime.UtcNow.Date;

        var reminders = await context.Reminders
            .Find(r => r.UserId == userId && r.IsActive)
            .ToListAsync(ct);

        var due = reminders
            .Where(r => r.StartDate.Date <= today && (r.EndDate is null || r.EndDate.Value.Date >= today))
            .SelectMany(r => r.Times.Select(t => new
            {
                reminder_id = r.Id,
                medicine_name = r.MedicineName,
                dosage = r.Dosage,
                time = t,
                notes = r.Notes
            }))
            .OrderBy(x => x.time, StringComparer.Ordinal)
            .ToList();

        return Ok(new { doses = due });
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<ReminderResponse>> GetById(string id, CancellationToken ct)
    {
        var (reminder, failure) = await LoadOwnedAsync(id, ct);
        return failure ?? Ok(Map(reminder!));
    }

    [HttpPost("")]
    public async Task<ActionResult<ReminderResponse>> Create([FromBody] CreateReminderRequest request, CancellationToken ct)
    {
        if (!TryGetUserId(out var userId, out var error)) return error!;

        if (!TryNormalizeTimes(request.Times, out var times, out var timeError))
            return BadRequestError(timeError!);

        var start = (request.StartDate ?? DateTime.UtcNow).Date;
        if (request.EndDate is not null && request.EndDate.Value.Date < start)
            return BadRequestError("The end date cannot fall before the start date.");

        var reminder = new Reminder
        {
            UserId = userId,
            MedicineName = request.MedicineName.Trim(),
            Dosage = request.Dosage,
            Notes = request.Notes,
            Times = times,
            Frequency = string.IsNullOrWhiteSpace(request.Frequency) ? "daily" : request.Frequency,
            StartDate = start,
            EndDate = request.EndDate?.Date,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };

        await context.Reminders.InsertOneAsync(reminder, cancellationToken: ct);
        return Ok(Map(reminder));
    }

    [HttpPut("{id}")]
    [HttpPatch("{id}")]
    public async Task<ActionResult<ReminderResponse>> Update(string id, [FromBody] UpdateReminderRequest request, CancellationToken ct)
    {
        var (reminder, failure) = await LoadOwnedAsync(id, ct);
        if (failure is not null) return failure;

        var updates = new List<UpdateDefinition<Reminder>>();

        if (!string.IsNullOrWhiteSpace(request.MedicineName))
            updates.Add(Builders<Reminder>.Update.Set(r => r.MedicineName, request.MedicineName.Trim()));

        if (request.Dosage is not null) updates.Add(Builders<Reminder>.Update.Set(r => r.Dosage, request.Dosage));
        if (request.Notes is not null) updates.Add(Builders<Reminder>.Update.Set(r => r.Notes, request.Notes));
        if (request.Frequency is not null) updates.Add(Builders<Reminder>.Update.Set(r => r.Frequency, request.Frequency));

        if (request.Times is not null)
        {
            if (!TryNormalizeTimes(request.Times, out var times, out var timeError))
                return BadRequestError(timeError!);
            updates.Add(Builders<Reminder>.Update.Set(r => r.Times, times));
        }

        if (request.Active is not null)
            updates.Add(Builders<Reminder>.Update.Set(r => r.IsActive, request.Active.Value));

        if (updates.Count == 0)
            return BadRequestError("No supported fields were supplied.");

        var updated = await context.Reminders.FindOneAndUpdateAsync(
            Builders<Reminder>.Filter.Eq(r => r.Id, reminder!.Id),
            Builders<Reminder>.Update.Combine(updates),
            new FindOneAndUpdateOptions<Reminder> { ReturnDocument = ReturnDocument.After },
            ct);

        return Ok(Map(updated));
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(string id, CancellationToken ct)
    {
        var (reminder, failure) = await LoadOwnedAsync(id, ct);
        if (failure is not null) return failure;

        await context.Reminders.DeleteOneAsync(r => r.Id == reminder!.Id, ct);
        return Ok(new { message = "Reminder deleted." });
    }

    private async Task<(Reminder? Reminder, ActionResult? Failure)> LoadOwnedAsync(string id, CancellationToken ct)
    {
        if (!TryGetUserId(out var userId, out var error)) return (null, error);

        if (!BsonJson.IsValidObjectId(id))
            return (null, BadRequestError("The reminder id is not valid."));

        var reminder = await context.Reminders.Find(r => r.Id == id).FirstOrDefaultAsync(ct);
        if (reminder is null)
            return (null, NotFoundError("Reminder not found."));

        if (reminder.UserId != userId)
            return (null, ForbiddenError("You do not have access to this reminder."));

        return (reminder, null);
    }

    /// <summary>Accepts "9:00" or "09:00" and normalises everything to zero-padded 24-hour time.</summary>
    internal static bool TryNormalizeTimes(List<string> input, out List<string> normalized, out string? error)
    {
        normalized = [];

        if (input.Count == 0)
        {
            error = "At least one reminder time is required.";
            return false;
        }

        foreach (var raw in input)
        {
            if (!TimeOnly.TryParse(raw?.Trim(), CultureInfo.InvariantCulture, out var parsed))
            {
                error = $"'{raw}' is not a valid time. Use 24-hour HH:mm format.";
                return false;
            }
            normalized.Add(parsed.ToString("HH\\:mm", CultureInfo.InvariantCulture));
        }

        normalized = normalized.Distinct().OrderBy(t => t, StringComparer.Ordinal).ToList();
        error = null;
        return true;
    }

    private static ReminderResponse Map(Reminder r) => new()
    {
        Id = r.Id ?? string.Empty,
        MedicineName = r.MedicineName,
        Dosage = r.Dosage,
        Notes = r.Notes,
        Times = r.Times,
        Frequency = r.Frequency,
        Active = r.IsActive,
        CreatedAt = r.CreatedAt
    };
}
