using DeepwellEducation.Data;
using DeepwellEducation.Domain.Entities;
using DeepwellEducation.Domain.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DeepwellEducation.Controllers;

[ApiController]
[Route("api/[controller]")]
public class CoursesController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IWebHostEnvironment _env;

    public CoursesController(AppDbContext db, IWebHostEnvironment env)
    {
        _db = db;
        _env = env;
    }

    /// <summary>Public catalog: active courses only.</summary>
    [HttpGet]
    [AllowAnonymous]
    public ActionResult<IEnumerable<CourseDto>> GetAll()
    {
        var list = _db.Courses
            .AsNoTracking()
            .Where(c => c.IsActive)
            .OrderBy(c => c.LanguageCode)
            .ThenBy(c => c.Level)
            .ThenBy(c => c.Name)
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

        var list = await q
            .OrderBy(c => c.LanguageCode)
            .ThenBy(c => c.Level)
            .ThenBy(c => c.Name)
            .Select(c => new CourseDto
            {
                Id = c.Id,
                Name = c.Name,
                Description = c.Description,
                LanguageCode = c.LanguageCode,
                LanguageName = c.LanguageName,
                Level = c.Level,
                Category = c.Category,
                IsActive = c.IsActive,
                EnrollmentCount = _db.Enrollments.Count(e => e.CourseId == c.Id && e.IsActive),
                ImageUrl = c.ImageUrl
            })
            .ToListAsync(ct);
        return Ok(list);
    }

    /// <summary>Create a new course (Admin only).</summary>
    [Authorize(Roles = "Admin")]
    [HttpPost]
    public async Task<ActionResult<CourseDto>> Create([FromBody] CreateCourseRequest request, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
            return BadRequest("Name is required.");
        var category = request.Category ?? CourseCategory.Language;
        if (!Enum.IsDefined(typeof(CourseCategory), category))
            return BadRequest("Invalid Category.");

        var course = new Course
        {
            Id = Guid.NewGuid(),
            Name = request.Name.Trim(),
            Description = request.Description?.Trim() ?? "",
            LanguageCode = request.LanguageCode?.Trim() ?? "",
            LanguageName = request.LanguageName?.Trim() ?? "",
            Level = request.Level,
            Category = category,
            IsActive = true,
            ImageUrl = "images/deepwell-course.jpg"
        };
        _db.Courses.Add(course);
        await _db.SaveChangesAsync(ct);
        return CreatedAtAction(nameof(GetById), new { id = course.Id }, new CourseDto(course));
    }

    /// <summary>Admin: upload course detail hero image (stored under wwwroot/frontend/images/courses/; public catalog cards ignore this).</summary>
    [Authorize(Roles = "Admin")]
    [HttpPost("{id:guid}/cover")]
    [RequestSizeLimit(6 * 1024 * 1024)]
    public async Task<ActionResult<CourseDto>> UploadCover(Guid id, IFormFile file, CancellationToken ct)
    {
        if (file == null || file.Length == 0)
            return BadRequest("Image file is required.");

        var course = await _db.Courses.FirstOrDefaultAsync(c => c.Id == id, ct);
        if (course == null)
            return NotFound();

        var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
        var allowed = new HashSet<string> { ".jpg", ".jpeg", ".png", ".webp", ".gif" };
        if (string.IsNullOrEmpty(ext) || !allowed.Contains(ext))
            return BadRequest("Allowed types: jpg, png, webp, gif.");

        var wwwroot = _env.WebRootPath ?? Path.Combine(_env.ContentRootPath, "wwwroot");
        var rel = $"images/courses/{id:N}.jpg";
        var abs = Path.Combine(wwwroot, "frontend", rel.Replace('/', Path.DirectorySeparatorChar));
        var dir = Path.GetDirectoryName(abs);
        if (!string.IsNullOrEmpty(dir))
            Directory.CreateDirectory(dir);

        await using (var fs = new FileStream(abs, FileMode.Create, FileAccess.Write, FileShare.None))
        {
            await file.CopyToAsync(fs, ct);
        }

        course.ImageUrl = rel;
        await _db.SaveChangesAsync(ct);
        return Ok(new CourseDto(course));
    }

    /// <summary>Update course fields (Admin only).</summary>
    [Authorize(Roles = "Admin")]
    [HttpPut("{id:guid}")]
    public async Task<ActionResult<CourseDto>> Update(Guid id, [FromBody] UpdateCourseRequest request, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
            return BadRequest("Name is required.");
        var category = request.Category ?? CourseCategory.Language;
        if (!Enum.IsDefined(typeof(CourseCategory), category))
            return BadRequest("Invalid Category.");

        var course = await _db.Courses.FirstOrDefaultAsync(c => c.Id == id, ct);
        if (course == null)
            return NotFound();

        course.Name = request.Name.Trim();
        course.Description = request.Description?.Trim() ?? "";
        course.LanguageCode = request.LanguageCode?.Trim() ?? "";
        course.LanguageName = request.LanguageName?.Trim() ?? "";
        course.Level = request.Level;
        course.Category = category;

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

    /// <summary>
    /// Delete course (Admin only).
    /// Default: soft delete (deactivate).
    /// Use <c>?permanent=true</c> to hard-delete only if course is already inactive and has no enrollments/requests.
    /// </summary>
    [Authorize(Roles = "Admin")]
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> SoftDelete(Guid id, [FromQuery] bool permanent = false, CancellationToken ct = default)
    {
        var course = await _db.Courses.FirstOrDefaultAsync(c => c.Id == id, ct);
        if (course == null)
            return NotFound();

        if (permanent)
        {
            if (course.IsActive)
                return BadRequest("Only inactive courses can be permanently deleted.");
            var hasEnrollments = await _db.Enrollments.AnyAsync(e => e.CourseId == id, ct);
            var hasRequests = await _db.CourseRequests.AnyAsync(r => r.CourseId == id, ct);
            if (hasEnrollments || hasRequests)
                return Conflict("Cannot permanently delete a course with enrollments or queue requests.");
            TryDeleteCourseCoverFile(course.ImageUrl);
            _db.Courses.Remove(course);
            await _db.SaveChangesAsync(ct);
            return NoContent();
        }

        course.IsActive = false;
        await _db.SaveChangesAsync(ct);
        return NoContent();
    }

    private void TryDeleteCourseCoverFile(string? imageUrl)
    {
        if (string.IsNullOrWhiteSpace(imageUrl))
            return;
        var trimmed = imageUrl.Trim().Replace('\\', '/');
        if (!trimmed.StartsWith("images/courses/", StringComparison.OrdinalIgnoreCase))
            return;
        if (trimmed.Contains("..", StringComparison.Ordinal))
            return;

        var wwwroot = _env.WebRootPath ?? Path.Combine(_env.ContentRootPath, "wwwroot");
        var abs = Path.Combine(wwwroot, "frontend", trimmed.Replace('/', Path.DirectorySeparatorChar));
        try
        {
            if (System.IO.File.Exists(abs))
                System.IO.File.Delete(abs);
        }
        catch
        {
            // best-effort cleanup
        }
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
    public CourseCategory Category { get; set; }
    public bool IsActive { get; set; }
    public int EnrollmentCount { get; set; }

    public string? ImageUrl { get; set; }

    public CourseDto() { }

    public CourseDto(Course c)
    {
        Id = c.Id;
        Name = c.Name;
        Description = c.Description;
        LanguageCode = c.LanguageCode;
        LanguageName = c.LanguageName;
        Level = c.Level;
        Category = c.Category;
        IsActive = c.IsActive;
        ImageUrl = c.ImageUrl;
    }
}

public class CreateCourseRequest
{
    public string Name { get; set; } = "";
    public string? Description { get; set; }
    public string? LanguageCode { get; set; }
    public string? LanguageName { get; set; }
    public CourseLevel Level { get; set; }
    /// <summary>Optional; defaults to <see cref="CourseCategory.Language"/>.</summary>
    public CourseCategory? Category { get; set; }
}

public class UpdateCourseRequest
{
    public string Name { get; set; } = "";
    public string? Description { get; set; }
    public string? LanguageCode { get; set; }
    public string? LanguageName { get; set; }
    public CourseLevel Level { get; set; }
    /// <summary>Optional; defaults to <see cref="CourseCategory.Language"/>.</summary>
    public CourseCategory? Category { get; set; }
}

public class SetCourseActiveRequest
{
    public bool IsActive { get; set; }
}
