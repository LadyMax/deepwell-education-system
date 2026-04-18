using System.Security.Claims;
using DeepwellEducation.Data;
using DeepwellEducation.Domain.Entities;
using DeepwellEducation.Domain.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DeepwellEducation.Controllers;

[ApiController]
[Route("api/[controller]")]
public class EnrollmentsController : ControllerBase
{
    private readonly AppDbContext _db;

    public EnrollmentsController(AppDbContext db)
    {
        _db = db;
    }

    private Guid? GetCurrentUserId()
    {
        var sub = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return string.IsNullOrEmpty(sub) || !Guid.TryParse(sub, out var id) ? null : id;
    }

    /// <summary>Active enrollments for the current user (with course summary).</summary>
    [Authorize]
    [HttpGet("me")]
    public async Task<ActionResult<IEnumerable<MyEnrollmentDto>>> GetMyEnrollments(CancellationToken ct)
    {
        var userId = GetCurrentUserId();
        if (userId == null)
            return Unauthorized();

        var list = await _db.Enrollments
            .AsNoTracking()
            .Where(e => e.UserId == userId.Value && e.IsActive)
            .Include(e => e.Course)
            .OrderBy(e => e.Course.Name)
            .Select(e => new MyEnrollmentDto
            {
                EnrollmentId = e.Id,
                CourseId = e.CourseId,
                CourseName = e.Course.Name,
                LanguageCode = e.Course.LanguageCode,
                LanguageName = e.Course.LanguageName,
                Level = e.Course.Level,
                EnrolledAt = e.CreatedAt
            })
            .ToListAsync(ct);

        return Ok(list);
    }

    /// <summary>Active enrollments for a course (Admin).</summary>
    [Authorize(Roles = "Admin")]
    [HttpGet("course/{courseId:guid}")]
    public async Task<ActionResult<IEnumerable<CourseEnrollmentDto>>> GetByCourse(Guid courseId, CancellationToken ct)
    {
        var courseExists = await _db.Courses.AnyAsync(c => c.Id == courseId, ct);
        if (!courseExists)
            return NotFound();

        var list = await _db.Enrollments
            .AsNoTracking()
            .Where(e => e.CourseId == courseId && e.IsActive)
            .Include(e => e.User)
            .ThenInclude(u => u.StudentProfile)
            .OrderBy(e => e.User.Email)
            .Select(e => new CourseEnrollmentDto
            {
                EnrollmentId = e.Id,
                UserId = e.UserId,
                Email = e.User.Email,
                UserName = e.User.UserName,
                StudentNumber = e.User.StudentProfile != null ? e.User.StudentProfile.StudentNumber : null,
                Role = e.User.Role,
                EnrolledAt = e.CreatedAt
            })
            .ToListAsync(ct);

        return Ok(list);
    }
}

public class MyEnrollmentDto
{
    public Guid EnrollmentId { get; set; }
    public Guid CourseId { get; set; }
    public string CourseName { get; set; } = "";
    public string LanguageCode { get; set; } = "";
    public string LanguageName { get; set; } = "";
    public CourseLevel Level { get; set; }
    public DateTime EnrolledAt { get; set; }
}

public class CourseEnrollmentDto
{
    public Guid EnrollmentId { get; set; }
    public Guid UserId { get; set; }
    public string Email { get; set; } = "";
    public string UserName { get; set; } = "";
    public string? StudentNumber { get; set; }
    public UserRole Role { get; set; }
    public DateTime EnrolledAt { get; set; }
}
