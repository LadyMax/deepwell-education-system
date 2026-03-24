using LanguageSchoolManagement.Data;
using LanguageSchoolManagement.Domain.Entities;
using LanguageSchoolManagement.Domain.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace LanguageSchoolManagement.Controllers;

[ApiController]
[Route("api/[controller]")]
public class CoursesController : ControllerBase
{
    private readonly AppDbContext _db;

    public CoursesController(AppDbContext db)
    {
        _db = db;
    }

    /// <summary>Public catalog: active courses only.</summary>
    [HttpGet]
    [AllowAnonymous]
    public ActionResult<IEnumerable<CourseDto>> GetAll()
    {
        var list = _db.Courses
            .AsNoTracking()
            .Where(c => c.IsActive)
            .OrderBy(c => c.Name)
            .Select(c => new CourseDto(c))
            .ToList();
        return Ok(list);
    }

    /// <summary>Public: course details only if the course is active.</summary>
    [HttpGet("{id:guid}")]
    [AllowAnonymous]
    public async Task<ActionResult<CourseDto>> GetById(Guid id, CancellationToken ct)
    {
        var course = await _db.Courses.AsNoTracking().FirstOrDefaultAsync(c => c.Id == id && c.IsActive, ct);
        if (course == null)
            return NotFound();
        return Ok(new CourseDto(course));
    }

    /// <summary>Admin: list courses; set includeInactive to see deactivated courses.</summary>
    [Authorize(Roles = "Admin")]
    [HttpGet("admin")]
    public async Task<ActionResult<IEnumerable<CourseDto>>> GetAdminList([FromQuery] bool includeInactive = false, CancellationToken ct = default)
    {
        var q = _db.Courses.AsNoTracking().AsQueryable();
        if (!includeInactive)
            q = q.Where(c => c.IsActive);

        var list = await q.OrderBy(c => c.Name).Select(c => new CourseDto(c)).ToListAsync(ct);
        return Ok(list);
    }

    /// <summary>Create a new course (Admin only).</summary>
    [Authorize(Roles = "Admin")]
    [HttpPost]
    public async Task<ActionResult<CourseDto>> Create([FromBody] CreateCourseRequest request, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
            return BadRequest("Name is required.");

        var course = new Course
        {
            Id = Guid.NewGuid(),
            Name = request.Name.Trim(),
            Description = request.Description?.Trim() ?? "",
            LanguageCode = request.LanguageCode?.Trim() ?? "",
            LanguageName = request.LanguageName?.Trim() ?? "",
            Level = request.Level,
            IsActive = true
        };
        _db.Courses.Add(course);
        await _db.SaveChangesAsync(ct);
        return CreatedAtAction(nameof(GetById), new { id = course.Id }, new CourseDto(course));
    }

    /// <summary>Update course fields (Admin only).</summary>
    [Authorize(Roles = "Admin")]
    [HttpPut("{id:guid}")]
    public async Task<ActionResult<CourseDto>> Update(Guid id, [FromBody] UpdateCourseRequest request, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
            return BadRequest("Name is required.");

        var course = await _db.Courses.FirstOrDefaultAsync(c => c.Id == id, ct);
        if (course == null)
            return NotFound();

        course.Name = request.Name.Trim();
        course.Description = request.Description?.Trim() ?? "";
        course.LanguageCode = request.LanguageCode?.Trim() ?? "";
        course.LanguageName = request.LanguageName?.Trim() ?? "";
        course.Level = request.Level;

        await _db.SaveChangesAsync(ct);
        return Ok(new CourseDto(course));
    }

    /// <summary>Set course active flag (Admin only). Use to re-open a deactivated course.</summary>
    [Authorize(Roles = "Admin")]
    [HttpPatch("{id:guid}/active")]
    public async Task<ActionResult<CourseDto>> SetActive(Guid id, [FromBody] SetCourseActiveRequest body, CancellationToken ct)
    {
        var course = await _db.Courses.FirstOrDefaultAsync(c => c.Id == id, ct);
        if (course == null)
            return NotFound();

        course.IsActive = body.IsActive;
        await _db.SaveChangesAsync(ct);
        return Ok(new CourseDto(course));
    }

    /// <summary>Deactivate course (Admin only). Soft delete: hides from public catalog; existing data kept.</summary>
    [Authorize(Roles = "Admin")]
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> SoftDelete(Guid id, CancellationToken ct)
    {
        var course = await _db.Courses.FirstOrDefaultAsync(c => c.Id == id, ct);
        if (course == null)
            return NotFound();

        course.IsActive = false;
        await _db.SaveChangesAsync(ct);
        return NoContent();
    }
}

public class CourseDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = "";
    public string Description { get; set; } = "";
    public string LanguageCode { get; set; } = "";
    public string LanguageName { get; set; } = "";
    public CourseLevel Level { get; set; }
    public bool IsActive { get; set; }

    public CourseDto() { }

    public CourseDto(Course c)
    {
        Id = c.Id;
        Name = c.Name;
        Description = c.Description;
        LanguageCode = c.LanguageCode;
        LanguageName = c.LanguageName;
        Level = c.Level;
        IsActive = c.IsActive;
    }
}

public class CreateCourseRequest
{
    public string Name { get; set; } = "";
    public string? Description { get; set; }
    public string? LanguageCode { get; set; }
    public string? LanguageName { get; set; }
    public CourseLevel Level { get; set; }
}

public class UpdateCourseRequest
{
    public string Name { get; set; } = "";
    public string? Description { get; set; }
    public string? LanguageCode { get; set; }
    public string? LanguageName { get; set; }
    public CourseLevel Level { get; set; }
}

public class SetCourseActiveRequest
{
    public bool IsActive { get; set; }
}
