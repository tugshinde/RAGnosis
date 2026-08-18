using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Mvc;

namespace RAGnosis.Api.Dtos;

/// <summary>
/// Page selection for list endpoints. Both values are optional: a caller that sends neither
/// gets the first page at the default size, which is what the existing client does.
/// </summary>
/// <remarks>
/// Bind this with <c>[FromQuery(Name = "")]</c> and never name the action parameter after one
/// of its own properties. Given a parameter called <c>page</c>, the complex-type binder finds
/// the query key <c>page</c>, treats it as a prefix match, tries to build the whole object out
/// of that one scalar, fails, and hands back an all-defaults instance — so <c>?page_size=1</c>
/// works while <c>?page=1&amp;page_size=1</c> silently returns the default page size.
/// </remarks>
public sealed class PageRequest
{
    public const int DefaultSize = 50;
    public const int MaxSize = 200;

    [FromQuery(Name = "page")]
    public int? Page { get; set; }

    [FromQuery(Name = "page_size")]
    public int? PageSize { get; set; }

    /// <summary>Clamped page number, 1-based.</summary>
    public int Number => Page is > 0 ? Page.Value : 1;

    /// <summary>Clamped page size. An out-of-range request is corrected rather than rejected.</summary>
    public int Size => PageSize switch
    {
        null or < 1 => DefaultSize,
        > MaxSize => MaxSize,
        _ => PageSize.Value
    };

    public int Skip => (Number - 1) * Size;
}

/// <summary>
/// Pagination metadata attached to list responses. Omitted from the JSON when null, so
/// endpoints that have not adopted paging keep their exact previous shape.
/// </summary>
public sealed class PageInfo
{
    public int Page { get; set; }
    public int PageSize { get; set; }
    public long TotalItems { get; set; }
    public int TotalPages { get; set; }
    public bool HasNext { get; set; }

    public static PageInfo From(PageRequest request, long totalItems) => new()
    {
        Page = request.Number,
        PageSize = request.Size,
        TotalItems = totalItems,
        TotalPages = (int)Math.Ceiling(totalItems / (double)request.Size),
        HasNext = (long)request.Number * request.Size < totalItems
    };
}

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
