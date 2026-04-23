using System.Security.Claims;
using DeepwellEducation.Data;
using DeepwellEducation.Domain.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DeepwellEducation.Controllers;

[ApiController]
[Route("api/[controller]")]
public class StudentProfilesController : ControllerBase
{
    private readonly AppDbContext _db;

    public StudentProfilesController(AppDbContext db)
    {
        _db = db;
    }

    private Guid? GetCurrentUserId()
    {
        var sub = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return string.IsNullOrEmpty(sub) || !Guid.TryParse(sub, out var id) ? null : id;
    }

    /// <summary>Get current user's student profile details.</summary>
    [Authorize]
    [HttpGet("me")]
    [ProducesResponseType(typeof(StudentProfileDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<StudentProfileDto>> GetMyProfile(CancellationToken ct)
    {
        var userId = GetCurrentUserId();
        if (userId == null)
            return Unauthorized();

        var profile = await _db.StudentProfiles
            .AsNoTracking()
            .FirstOrDefaultAsync(p => p.UserId == userId.Value, ct);
        if (profile == null)
            return NotFound("Student profile not found. It is created after your first approved Join request.");

        return Ok(new StudentProfileDto(profile));
    }

    /// <summary>Update current user's student profile details.</summary>
    [Authorize]
    [HttpPut("me")]
    [ProducesResponseType(typeof(StudentProfileDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<StudentProfileDto>> UpdateMyProfile([FromBody] UpdateStudentProfileRequest body, CancellationToken ct)
    {
        var userId = GetCurrentUserId();
        if (userId == null)
            return Unauthorized();

        var profile = await _db.StudentProfiles.FirstOrDefaultAsync(p => p.UserId == userId.Value, ct);
        if (profile == null)
            return NotFound("Student profile not found. It is created after your first approved Join request.");

        var firstName = (body.FirstName ?? string.Empty).Trim();
        var lastName = (body.LastName ?? string.Empty).Trim();
        var phone = (body.Phone ?? string.Empty).Trim();
        var city = (body.City ?? string.Empty).Trim();
        var address = (body.Address ?? string.Empty).Trim();

        if (firstName.Length > 20 || lastName.Length > 20 || phone.Length > 20 || city.Length > 20 || address.Length > 40)
            return BadRequest("One or more fields exceed the allowed length.");
        if (string.IsNullOrWhiteSpace(firstName))
            return BadRequest("First name is required.");
        if (string.IsNullOrWhiteSpace(lastName))
            return BadRequest("Last name is required.");
        if (string.IsNullOrWhiteSpace(phone))
            return BadRequest("Phone is required.");
        if (!IsLettersOnlyOrEmpty(firstName))
            return BadRequest("First name may only contain letters");
        if (!IsLettersOnlyOrEmpty(lastName))
            return BadRequest("Last name may only contain letters");
        if (!IsLettersOnlyOrEmpty(city))
            return BadRequest("City may only contain letters");
        if (!IsPhoneDigitsOnlyOrEmpty(phone))
            return BadRequest("Phone may only contain digits (with an optional leading +).");

        if (body.DateOfBirth.HasValue)
        {
            var d = body.DateOfBirth.Value.Date;
            if (d > DateTime.UtcNow.Date)
                return BadRequest("Date of birth cannot be in the future");
        }

        profile.FirstName = firstName;
        profile.LastName = lastName;
        profile.Phone = phone;
        profile.DateOfBirth = body.DateOfBirth?.Date;
        profile.City = city;
        profile.Address = address;
        profile.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync(ct);
        return Ok(new StudentProfileDto(profile));
    }

    private static bool IsLettersOnlyOrEmpty(string value) =>
        string.IsNullOrEmpty(value) || value.All(char.IsLetter);

    private static bool IsPhoneDigitsOnlyOrEmpty(string value)
    {
        if (string.IsNullOrEmpty(value))
            return true;
        var start = value.StartsWith("+", StringComparison.Ordinal) ? 1 : 0;
        return start < value.Length && value.Skip(start).All(char.IsDigit);
    }
}

public class StudentProfileDto
{
    public Guid UserId { get; set; }
    public string StudentNumber { get; set; } = "";
    public string FirstName { get; set; } = "";
    public string LastName { get; set; } = "";
    public string Phone { get; set; } = "";
    public DateTime? DateOfBirth { get; set; }
    public string City { get; set; } = "";
    public string Address { get; set; } = "";
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }

    public StudentProfileDto() { }

    public StudentProfileDto(StudentProfile p)
    {
        UserId = p.UserId;
        StudentNumber = p.StudentNumber;
        FirstName = p.FirstName;
        LastName = p.LastName;
        Phone = p.Phone;
        DateOfBirth = p.DateOfBirth;
        City = p.City;
        Address = p.Address;
        CreatedAt = p.CreatedAt;
        UpdatedAt = p.UpdatedAt;
    }
}

public class UpdateStudentProfileRequest
{
    public string? FirstName { get; set; }
    public string? LastName { get; set; }
    public string? Phone { get; set; }
    public DateTime? DateOfBirth { get; set; }
    public string? City { get; set; }
    public string? Address { get; set; }
}
