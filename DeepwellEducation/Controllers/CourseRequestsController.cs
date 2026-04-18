using System.Security.Claims;
using DeepwellEducation.Data;
using DeepwellEducation.Domain.Entities;
using DeepwellEducation.Domain.Enums;
using DeepwellEducation.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DeepwellEducation.Controllers;

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

    /// <summary>List course requests (Admin). Optional filter, e.g. <c>?status=Pending</c>.</summary>
    [Authorize(Roles = "Admin")]
    [HttpGet]
    public async Task<ActionResult<IEnumerable<CourseRequestListItemDto>>> List(
        [FromQuery] RequestStatus? status,
        [FromQuery] RequestType? type,
        [FromQuery] Guid? courseId,
        [FromQuery] string? applicant,
        [FromQuery] string? created = "desc",
        CancellationToken ct = default)
    {
        var q =
            from r in _db.CourseRequests.AsNoTracking()
            join u in _db.Users.AsNoTracking() on r.UserId equals u.Id
            join c in _db.Courses.AsNoTracking() on r.CourseId equals c.Id
            join sp in _db.StudentProfiles.AsNoTracking() on r.UserId equals sp.UserId into spg
            from sp in spg.DefaultIfEmpty()
            select new { r, u, c, sp };

        if (status.HasValue)
            q = q.Where(x => x.r.Status == status.Value);
        if (type.HasValue)
            q = q.Where(x => x.r.Type == type.Value);
        if (courseId.HasValue)
            q = q.Where(x => x.r.CourseId == courseId.Value);
        if (!string.IsNullOrWhiteSpace(applicant))
        {
            var term = $"%{applicant.Trim()}%";
            q = q.Where(x =>
                EF.Functions.Like(x.u.Email, term) ||
                EF.Functions.Like(x.u.UserName, term) ||
                (x.sp != null && EF.Functions.Like(x.sp.StudentNumber, term)));
        }

        var createdAsc = string.Equals(created, "asc", StringComparison.OrdinalIgnoreCase);

        var ordered = createdAsc
            ? q.OrderBy(x => x.r.CreatedAt)
            : q.OrderByDescending(x => x.r.CreatedAt);

        var list = await ordered
            .Select(x => new CourseRequestListItemDto
            {
                Id = x.r.Id,
                UserId = x.r.UserId,
                UserEmail = x.u.Email,
                UserName = x.u.UserName,
                StudentNumber = x.sp != null ? x.sp.StudentNumber : null,
                CourseId = x.r.CourseId,
                CourseName = x.c.Name,
                Type = x.r.Type,
                Status = x.r.Status,
                CreatedAt = x.r.CreatedAt
            })
            .ToListAsync(ct);

        return Ok(list);
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
                SubmitError.AdminJoinNotAllowed => StatusCode(403, "Staff accounts cannot apply for courses."),
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

public class CourseRequestListItemDto
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public string UserEmail { get; set; } = "";
    public string UserName { get; set; } = "";
    public string? StudentNumber { get; set; }
    public Guid CourseId { get; set; }
    public string CourseName { get; set; } = "";
    public RequestType Type { get; set; }
    public RequestStatus Status { get; set; }
    public DateTime CreatedAt { get; set; }
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
