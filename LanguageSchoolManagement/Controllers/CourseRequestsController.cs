using System.Security.Claims;
using LanguageSchoolManagement.Data;
using LanguageSchoolManagement.Domain.Entities;
using LanguageSchoolManagement.Domain.Enums;
using LanguageSchoolManagement.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace LanguageSchoolManagement.Controllers;

[ApiController]
[Route("api/[controller]")]
public class CourseRequestsController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly ICourseRequestService _courseRequestService;

    public CourseRequestsController(AppDbContext db, ICourseRequestService courseRequestService)
    {
        _db = db;
        _courseRequestService = courseRequestService;
    }

    private Guid? GetCurrentUserId()
    {
        var sub = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return string.IsNullOrEmpty(sub) || !Guid.TryParse(sub, out var id) ? null : id;
    }

    /// <summary>Submit a Join or Leave request (requires login). UserId is taken from JWT.</summary>
    [Authorize]
    [HttpPost]
    public async Task<ActionResult<CourseRequestDto>> Submit([FromBody] SubmitCourseRequestRequest body, CancellationToken ct)
    {
        var userId = GetCurrentUserId();
        if (userId == null)
            return Unauthorized();

        var result = await _courseRequestService.SubmitAsync(userId.Value, body.CourseId, body.Type, ct);
        if (result.Error != SubmitError.None)
        {
            return result.Error switch
            {
                SubmitError.CourseNotFound => NotFound("Course not found or inactive."),
                SubmitError.UserNotFound => NotFound("User not found or inactive."),
                SubmitError.AlreadyEnrolled => BadRequest("Already enrolled in this course."),
                SubmitError.NotEnrolled => BadRequest("Not enrolled in this course."),
                SubmitError.DuplicatePending => BadRequest("You already have a pending request for this course."),
                _ => BadRequest()
            };
        }

        var request = result.Request!;
        return CreatedAtAction(nameof(GetById), new { id = request.Id }, new CourseRequestDto(request));
    }

    /// <summary>Get request by id.</summary>
    [HttpGet("{id:guid}")]
    public async Task<ActionResult<CourseRequestDto>> GetById(Guid id, CancellationToken ct)
    {
        var request = await _db.CourseRequests.FindAsync(new object[] { id }, ct);
        if (request == null)
            return NotFound();
        return Ok(new CourseRequestDto(request));
    }

    /// <summary>Approve or reject a request (Admin only). ReviewedBy is set from current user.</summary>
    [Authorize(Roles = "Admin")]
    [HttpPost("{id:guid}/review")]
    public async Task<ActionResult<CourseRequestDto>> Review(Guid id, [FromBody] ReviewRequest body, CancellationToken ct)
    {
        var result = await _courseRequestService.ReviewAsync(id, body.Approve, GetCurrentUserId(), ct);
        if (result.Error != ReviewError.None)
        {
            return result.Error switch
            {
                ReviewError.NotFound => NotFound(),
                ReviewError.AlreadyReviewed => BadRequest("Request is already reviewed."),
                ReviewError.AlreadyEnrolled => BadRequest("User already enrolled."),
                _ => BadRequest()
            };
        }
        return Ok(new CourseRequestDto(result.Request!));
    }
}

public class CourseRequestDto
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public Guid CourseId { get; set; }
    public RequestType Type { get; set; }
    public RequestStatus Status { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? ReviewedAt { get; set; }
    public Guid? ReviewedBy { get; set; }

    public CourseRequestDto() { }

    public CourseRequestDto(CourseRequest r)
    {
        Id = r.Id;
        UserId = r.UserId;
        CourseId = r.CourseId;
        Type = r.Type;
        Status = r.Status;
        CreatedAt = r.CreatedAt;
        ReviewedAt = r.ReviewedAt;
        ReviewedBy = r.ReviewedBy;
    }
}

public class SubmitCourseRequestRequest
{
    public Guid CourseId { get; set; }
    public RequestType Type { get; set; }
}

public class ReviewRequest
{
    public bool Approve { get; set; }
}
