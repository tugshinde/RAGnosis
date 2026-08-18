using Microsoft.AspNetCore.Mvc;
using RAGnosis.Api.Dtos;
using RAGnosis.Api.Helpers;
using RAGnosis.Api.Models;
using RAGnosis.Api.Services.Abstractions;

namespace RAGnosis.Api.Controllers;

[ApiController]
[Produces("application/json")]
public abstract class ApiControllerBase(ICurrentUser currentUser) : ControllerBase
{
    protected ICurrentUser CurrentUser { get; } = currentUser;

    /// <summary>Returns the caller's id, or an error result when the token carries no usable subject.</summary>
    protected bool TryGetUserId(out string userId, out ActionResult? error)
    {
        var id = CurrentUser.UserId;

        if (!BsonJson.IsValidObjectId(id))
        {
            userId = string.Empty;
            error = Unauthorized(new ApiError("The access token does not contain a valid user id."));
            return false;
        }

        userId = id!;
        error = null;
        return true;
    }

    protected ActionResult NotFoundError(string message) => NotFound(new ApiError(message));
    protected ActionResult BadRequestError(string message) => BadRequest(new ApiError(message));
    protected ActionResult ForbiddenError(string message) => StatusCode(StatusCodes.Status403Forbidden, new ApiError(message));

    /// <summary>Resolves the caller when the endpoint requires one of the staff roles.</summary>
    protected bool TryGetStaffId(string role, out string userId, out ActionResult? error)
    {
        if (!TryGetUserId(out userId, out error)) return false;

        if (!CurrentUser.IsInRole(role, Roles.Admin))
        {
            error = ForbiddenError($"This area is restricted to {role} accounts.");
            return false;
        }

        return true;
    }
}
