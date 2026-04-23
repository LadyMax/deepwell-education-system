using System.Security.Claims;
using System.Text.RegularExpressions;
using DeepwellEducation.Data;
using DeepwellEducation.Domain.Entities;
using DeepwellEducation.Domain.Enums;
using DeepwellEducation.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;

namespace DeepwellEducation.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IPasswordHasher<User> _passwordHasher;
    private readonly JwtService _jwt;

    public AuthController(AppDbContext db, IPasswordHasher<User> passwordHasher, JwtService jwt)
    {
        _db = db;
        _passwordHasher = passwordHasher;
        _jwt = jwt;
    }

    /// <summary>Register a new user as Visitor. Becomes Student only after first Join is approved by Admin.</summary>
    [AllowAnonymous]
    [HttpPost("register")]
    [EnableRateLimiting("auth")]
    public async Task<ActionResult<AuthResponse>> Register([FromBody] RegisterRequest request, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.Password))
            return BadRequest("Email and password are required.");
        if (!TryValidateEmail(request.Email, out var emailError))
            return BadRequest(emailError);
        if (ContainsInteriorWhitespace(request.Email))
            return BadRequest("Email must not contain spaces.");
        if (ContainsInteriorWhitespace(request.UserName))
            return BadRequest("Username must not contain spaces.");

        var normalizedEmail = request.Email.Trim().ToLowerInvariant();
        if (await _db.Users.AnyAsync(u => u.Email == normalizedEmail, ct))
            return BadRequest("Email already registered.");

        if (!TryValidatePassword(request.Password, out var passwordError))
            return BadRequest(passwordError);

        var normalizedUsername = NormalizeUsername(request.UserName);
        if (!TryValidateUsername(normalizedUsername, out var usernameError))
            return BadRequest(usernameError);
        if (await _db.Users.AnyAsync(u => u.UserName.ToLower() == normalizedUsername.ToLower(), ct))
            return BadRequest("Username is already taken.");

        var user = new User
        {
            Id = Guid.NewGuid(),
            Email = normalizedEmail,
            UserName = normalizedUsername,
            Role = UserRole.Visitor,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };
        user.PasswordHash = _passwordHasher.HashPassword(user, request.Password);

        _db.Users.Add(user);

        await _db.SaveChangesAsync(ct);

        var token = _jwt.GenerateToken(user);
        return Ok(new AuthResponse { Token = token, User = new UserDto(user) });
    }

    /// <summary>Login with email and password. Returns JWT and user info.</summary>
    [AllowAnonymous]
    [HttpPost("login")]
    [EnableRateLimiting("auth")]
    public async Task<ActionResult<AuthResponse>> Login([FromBody] LoginRequest request, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.Password))
            return BadRequest("Email and password are required.");
        if (!TryValidateEmail(request.Email, out var emailError))
            return BadRequest(emailError);

        var normalizedEmail = request.Email.Trim().ToLowerInvariant();
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Email == normalizedEmail, ct);
        if (user == null)
            return Unauthorized("Invalid email or password.");

        if (!user.IsActive)
            return Unauthorized("Account is disabled.");

        var result = _passwordHasher.VerifyHashedPassword(user, user.PasswordHash, request.Password);
        if (result == PasswordVerificationResult.Failed)
            return Unauthorized("Invalid email or password.");

        var token = _jwt.GenerateToken(user);
        return Ok(new AuthResponse { Token = token, User = new UserDto(user) });
    }

    /// <summary>Get current user info (requires valid JWT).</summary>
    [Authorize]
    [HttpGet("me")]
    public async Task<ActionResult<UserDto>> Me(CancellationToken ct)
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out var userId))
            return Unauthorized();

        var user = await _db.Users
            .AsNoTracking()
            .Include(u => u.StudentProfile)
            .FirstOrDefaultAsync(u => u.Id == userId, ct);
        if (user == null || !user.IsActive)
            return NotFound("User not found or inactive.");
        return Ok(new UserDto(user));
    }

    /// <summary>Change the public username (stored in <see cref="User.UserName"/>). Must be globally unique.</summary>
    [Authorize]
    [HttpPost("change-username")]
    public async Task<ActionResult<UserDto>> ChangeUsername([FromBody] ChangeUsernameRequest request, CancellationToken ct)
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out var userId))
            return Unauthorized();

        var normalized = NormalizeUsername(request.Username);
        if (!TryValidateUsername(normalized, out var usernameError))
            return BadRequest(usernameError);

        var user = await _db.Users
            .Include(u => u.StudentProfile)
            .FirstOrDefaultAsync(u => u.Id == userId, ct);
        if (user == null || !user.IsActive)
            return NotFound("User not found or inactive.");

        if (string.Equals(user.UserName, normalized, StringComparison.OrdinalIgnoreCase))
            return Ok(new UserDto(user));

        if (await _db.Users.AnyAsync(u => u.Id != userId && u.UserName.ToLower() == normalized.ToLower(), ct))
            return BadRequest("Username is already taken.");

        user.UserName = normalized;
        await _db.SaveChangesAsync(ct);
        return Ok(new UserDto(user));
    }

    /// <summary>Change password. Issues a new JWT; older tokens are rejected via the password stamp claim.</summary>
    [Authorize]
    [HttpPost("change-password")]
    [EnableRateLimiting("auth")]
    public async Task<ActionResult<AuthResponse>> ChangePassword([FromBody] ChangePasswordRequest request, CancellationToken ct)
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out var userId))
            return Unauthorized();

        if (string.IsNullOrWhiteSpace(request.CurrentPassword))
            return BadRequest("Current password is required.");
        if (!TryValidatePassword(request.NewPassword, out var pwError))
            return BadRequest(pwError);
        if (request.CurrentPassword == request.NewPassword)
            return BadRequest("New password must be different from your current password.");

        var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == userId, ct);
        if (user == null || !user.IsActive)
            return NotFound("User not found or inactive.");

        if (_passwordHasher.VerifyHashedPassword(user, user.PasswordHash, request.CurrentPassword) ==
            PasswordVerificationResult.Failed)
            return BadRequest("Current password is incorrect.");

        user.PasswordHash = _passwordHasher.HashPassword(user, request.NewPassword);
        user.PasswordChangedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(ct);

        await _db.Entry(user).Reference(u => u.StudentProfile).LoadAsync(ct);
        var token = _jwt.GenerateToken(user);
        return Ok(new AuthResponse { Token = token, User = new UserDto(user) });
    }

    /// <summary>Verify the password for the signed-in user (e.g. before the client asks for new password fields).</summary>
    [Authorize]
    [HttpPost("verify-current-password")]
    [EnableRateLimiting("auth")]
    public async Task<IActionResult> VerifyCurrentPassword([FromBody] VerifyCurrentPasswordRequest request, CancellationToken ct)
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out var userId))
            return Unauthorized();

        if (string.IsNullOrWhiteSpace(request.Password))
            return BadRequest("Current password is required.");

        var user = await _db.Users.AsNoTracking()
            .FirstOrDefaultAsync(u => u.Id == userId, ct);
        if (user == null || !user.IsActive)
            return NotFound("User not found or inactive.");

        if (_passwordHasher.VerifyHashedPassword(user, user.PasswordHash, request.Password.Trim()) ==
            PasswordVerificationResult.Failed)
            return BadRequest("Current password is incorrect.");

        return Ok();
    }

    /// <summary>Minimum 8 characters; upper, lower, digit, and special character.</summary>
    private static bool TryValidatePassword(string? password, out string? error)
    {
        error = null;
        if (string.IsNullOrEmpty(password))
        {
            error = "Password is required.";
            return false;
        }

        if (password.Length < 8)
        {
            error = "Password must be at least 8 characters.";
            return false;
        }

        if (!password.Any(char.IsUpper))
        {
            error = "Password must contain at least one uppercase letter.";
            return false;
        }

        if (!password.Any(char.IsLower))
        {
            error = "Password must contain at least one lowercase letter.";
            return false;
        }

        if (!password.Any(char.IsDigit))
        {
            error = "Password must contain at least one digit.";
            return false;
        }

        if (!password.Any(ch => !char.IsLetterOrDigit(ch)))
        {
            error = "Password must contain at least one special character.";
            return false;
        }

        return true;
    }

    private static bool TryValidateEmail(string? email, out string? error)
    {
        error = null;
        var normalized = (email ?? "").Trim();
        if (string.IsNullOrEmpty(normalized))
        {
            error = "Email is required.";
            return false;
        }
        if (normalized.Length > 50)
        {
            error = "Email must be 50 characters or fewer.";
            return false;
        }
        return true;
    }

    private static string NormalizeUsername(string? raw) =>
        string.IsNullOrWhiteSpace(raw) ? "" : raw.Trim();

    /// <summary>Leading/trailing spaces are trimmed later; only reject whitespace inside the value.</summary>
    private static bool ContainsInteriorWhitespace(string? raw) =>
        !string.IsNullOrEmpty(raw) && raw.Trim().Any(char.IsWhiteSpace);

    /// <summary>3–20 chars; letters, digits, period, underscore, hyphen.</summary>
    private static bool TryValidateUsername(string normalized, out string? error)
    {
        error = null;
        if (string.IsNullOrEmpty(normalized))
        {
            error = "Username is required.";
            return false;
        }

        if (normalized.Length is < 3 or > 20)
        {
            error = "Username must be 3–20 characters.";
            return false;
        }

        if (!Regex.IsMatch(normalized, @"^[A-Za-z0-9._-]+$"))
        {
            error = "Username may only contain letters, digits, and . _ -";
            return false;
        }

        return true;
    }
}

public class RegisterRequest
{
    public string Email { get; set; } = "";
    public string Password { get; set; } = "";
    public string? UserName { get; set; }
}

public class LoginRequest
{
    public string Email { get; set; } = "";
    public string Password { get; set; } = "";
}

public class ChangeUsernameRequest
{
    /// <summary>Unique username (maps to <see cref="User.UserName"/>).</summary>
    public string Username { get; set; } = "";
}

public class ChangePasswordRequest
{
    public string CurrentPassword { get; set; } = "";
    public string NewPassword { get; set; } = "";
}

public class VerifyCurrentPasswordRequest
{
    public string Password { get; set; } = "";
}

public class AuthResponse
{
    public string Token { get; set; } = "";
    public UserDto User { get; set; } = null!;
}

public class UserDto
{
    public Guid Id { get; set; }
    public string Email { get; set; } = "";
    public string UserName { get; set; } = "";
    public UserRole Role { get; set; }
    public bool IsActive { get; set; }
    public string? StudentNumber { get; set; }

    public UserDto() { }

    public UserDto(User u)
    {
        Id = u.Id;
        Email = u.Email;
        UserName = u.UserName;
        Role = u.Role;
        IsActive = u.IsActive;
        StudentNumber = u.StudentProfile?.StudentNumber;
    }
}
