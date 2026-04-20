using DeepwellEducation.Data;
using DeepwellEducation.Domain.Enums;
using DeepwellEducation.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DeepwellEducation.Controllers;

[ApiController]
[Route("api/admin/users")]
[Authorize(Roles = "Admin")]
public class AdminUsersController : ControllerBase
{
    public const int DefaultUserListPageSize = 20;
    private const int MaxUserListPageSize = 100;

    private readonly AppDbContext _db;

    public AdminUsersController(AppDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    [ProducesResponseType(typeof(PagedResult<AdminUserListItemDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<PagedResult<AdminUserListItemDto>>> List(
        [FromQuery] string? q,
        [FromQuery] UserRole? role,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = DefaultUserListPageSize,
        CancellationToken ct = default)
    {
        (page, pageSize) = NormalizeUserListPaging(page, pageSize);

        var query = _db.Users.AsNoTracking().AsQueryable();
        if (role.HasValue)
            query = query.Where(u => u.Role == role.Value);

        var term = q?.Trim();
        if (!string.IsNullOrEmpty(term))
        {
            var lower = term.ToLowerInvariant();
            query = query.Where(u => u.Email.ToLower().Contains(lower) || u.UserName.ToLower().Contains(lower));
        }

        var projected =
            from u in query
            orderby u.CreatedAt descending
            select new AdminUserListItemDto
            {
                Id = u.Id,
                Email = u.Email,
                UserName = u.UserName,
                Role = u.Role,
                IsActive = u.IsActive,
                CreatedAt = u.CreatedAt,
                StudentNumber = u.StudentProfile != null ? u.StudentProfile.StudentNumber : null
            };

        var total = await projected.CountAsync(ct);
        var items = await projected.Skip((page - 1) * pageSize).Take(pageSize).ToListAsync(ct);

        return Ok(new PagedResult<AdminUserListItemDto>
        {
            Items = items,
            Page = page,
            PageSize = pageSize,
            TotalCount = total
        });
    }

    private static (int page, int pageSize) NormalizeUserListPaging(int page, int pageSize)
    {
        var p = page < 1 ? 1 : page;
        var s = pageSize < 1 ? DefaultUserListPageSize : pageSize > MaxUserListPageSize ? MaxUserListPageSize : pageSize;
        return (p, s);
    }

    /// <summary>Look up a user by id (staff only). Includes student profile when present.</summary>
    [HttpGet("{id:guid}")]
    [ProducesResponseType(typeof(AdminUserDetailDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<AdminUserDetailDto>> GetUser(Guid id, CancellationToken ct)
    {
        var user = await _db.Users
            .AsNoTracking()
            .Include(u => u.StudentProfile)
            .FirstOrDefaultAsync(u => u.Id == id, ct);

        if (user == null)
            return NotFound();

        return Ok(new AdminUserDetailDto
        {
            Id = user.Id,
            Email = user.Email,
            UserName = user.UserName,
            Role = user.Role,
            IsActive = user.IsActive,
            CreatedAt = user.CreatedAt,
            StudentProfile = user.StudentProfile != null ? new StudentProfileDto(user.StudentProfile) : null
        });
    }
}

public class AdminUserDetailDto
{
    public Guid Id { get; set; }
    public string Email { get; set; } = "";
    public string UserName { get; set; } = "";
    public UserRole Role { get; set; }
    public bool IsActive { get; set; }
    public DateTime CreatedAt { get; set; }
    public StudentProfileDto? StudentProfile { get; set; }
}

public class AdminUserListItemDto
{
    public Guid Id { get; set; }
    public string Email { get; set; } = "";
    public string UserName { get; set; } = "";
    public UserRole Role { get; set; }
    public bool IsActive { get; set; }
    public DateTime CreatedAt { get; set; }
    public string? StudentNumber { get; set; }
}
