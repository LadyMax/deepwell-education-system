using DeepwellEducation.Data;
using DeepwellEducation.Domain.Entities;
using DeepwellEducation.Domain.Enums;
using DeepwellEducation.Services;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace DeepwellEducation.Tests;

public class CourseRequestServiceTests : IAsyncLifetime
{
    private SqliteConnection _connection = null!;
    private AppDbContext _db = null!;
    private CourseRequestService _sut = null!;

    public async Task InitializeAsync()
    {
        _connection = new SqliteConnection("DataSource=:memory:");
        await _connection.OpenAsync();

        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseSqlite(_connection)
            .Options;

        _db = new AppDbContext(options);
        await _db.Database.EnsureCreatedAsync();
        _sut = new CourseRequestService(_db);
    }

    public async Task DisposeAsync()
    {
        await _db.DisposeAsync();
        await _connection.DisposeAsync();
    }

    [Fact]
    public async Task ReviewAsync_ApproveJoin_CreatesActiveEnrollment()
    {
        var userId = Guid.NewGuid();
        var courseId = Guid.NewGuid();
        var adminId = Guid.NewGuid();

        _db.Users.Add(new User
        {
            Id = userId,
            Email = "student@test",
            PasswordHash = "x",
            UserName = "S",
            Role = UserRole.Student,
            IsActive = true
        });
        _db.Courses.Add(new Course
        {
            Id = courseId,
            Name = "Spanish 101",
            Description = "",
            LanguageCode = "es",
            LanguageName = "Spanish",
            Level = CourseLevel.Beginner,
            IsActive = true
        });
        var crId = Guid.NewGuid();
        _db.CourseRequests.Add(new CourseRequest
        {
            Id = crId,
            UserId = userId,
            CourseId = courseId,
            Type = RequestType.Join,
            Status = RequestStatus.Pending,
            CreatedAt = DateTime.UtcNow
        });
        await _db.SaveChangesAsync();

        var result = await _sut.ReviewAsync(crId, approve: true, reviewedByUserId: adminId);

        Assert.Equal(ReviewError.None, result.Error);
        Assert.NotNull(result.Request);

        var enrollment = await _db.Enrollments.SingleAsync(e => e.UserId == userId && e.CourseId == courseId);
        Assert.True(enrollment.IsActive);
        Assert.Null(enrollment.EndedAt);
    }

    [Fact]
    public async Task ReviewAsync_ApproveLeave_SetsEnrollmentInactive()
    {
        var userId = Guid.NewGuid();
        var courseId = Guid.NewGuid();
        var adminId = Guid.NewGuid();

        _db.Users.Add(new User
        {
            Id = userId,
            Email = "student2@test",
            PasswordHash = "x",
            UserName = "S2",
            Role = UserRole.Student,
            IsActive = true
        });
        _db.Courses.Add(new Course
        {
            Id = courseId,
            Name = "French 101",
            Description = "",
            LanguageCode = "fr",
            LanguageName = "French",
            Level = CourseLevel.Beginner,
            IsActive = true
        });
        var enrollmentId = Guid.NewGuid();
        _db.Enrollments.Add(new Enrollment
        {
            Id = enrollmentId,
            UserId = userId,
            CourseId = courseId,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        });
        var crId = Guid.NewGuid();
        _db.CourseRequests.Add(new CourseRequest
        {
            Id = crId,
            UserId = userId,
            CourseId = courseId,
            Type = RequestType.Leave,
            Status = RequestStatus.Pending,
            CreatedAt = DateTime.UtcNow
        });
        await _db.SaveChangesAsync();

        var result = await _sut.ReviewAsync(crId, approve: true, reviewedByUserId: adminId);

        Assert.Equal(ReviewError.None, result.Error);

        var enrollment = await _db.Enrollments.SingleAsync(e => e.Id == enrollmentId);
        Assert.False(enrollment.IsActive);
        Assert.NotNull(enrollment.EndedAt);
    }

    [Fact]
    public async Task SubmitAsync_SecondPendingJoinSameCourse_ReturnsDuplicatePending()
    {
        var userId = Guid.NewGuid();
        var courseId = Guid.NewGuid();

        _db.Users.Add(new User
        {
            Id = userId,
            Email = "u@test",
            PasswordHash = "x",
            UserName = "U",
            Role = UserRole.Visitor,
            IsActive = true
        });
        _db.Courses.Add(new Course
        {
            Id = courseId,
            Name = "German 101",
            Description = "",
            LanguageCode = "de",
            LanguageName = "German",
            Level = CourseLevel.Beginner,
            IsActive = true
        });
        await _db.SaveChangesAsync();

        var first = await _sut.SubmitAsync(userId, courseId, RequestType.Join);
        Assert.Equal(SubmitError.None, first.Error);

        var second = await _sut.SubmitAsync(userId, courseId, RequestType.Join);
        Assert.Equal(SubmitError.DuplicatePending, second.Error);
        Assert.Null(second.Request);
    }

    [Fact]
    public async Task SubmitAsync_AdminJoin_ReturnsAdminJoinNotAllowed()
    {
        var adminId = Guid.NewGuid();
        var courseId = Guid.NewGuid();

        _db.Users.Add(new User
        {
            Id = adminId,
            Email = "admin@test",
            PasswordHash = "x",
            UserName = "A",
            Role = UserRole.Admin,
            IsActive = true
        });
        _db.Courses.Add(new Course
        {
            Id = courseId,
            Name = "Italian 101",
            Description = "",
            LanguageCode = "it",
            LanguageName = "Italian",
            Level = CourseLevel.Beginner,
            IsActive = true
        });
        await _db.SaveChangesAsync();

        var result = await _sut.SubmitAsync(adminId, courseId, RequestType.Join);

        Assert.Equal(SubmitError.AdminJoinNotAllowed, result.Error);
        Assert.Null(result.Request);
        Assert.False(await _db.CourseRequests.AnyAsync());
    }

    [Fact]
    public async Task SubmitAsync_AdminLeave_ReturnsAdminJoinNotAllowed()
    {
        var adminId = Guid.NewGuid();
        var courseId = Guid.NewGuid();

        _db.Users.Add(new User
        {
            Id = adminId,
            Email = "admin-leave@test",
            PasswordHash = "x",
            UserName = "A2",
            Role = UserRole.Admin,
            IsActive = true
        });
        _db.Courses.Add(new Course
        {
            Id = courseId,
            Name = "Italian 201",
            Description = "",
            LanguageCode = "it",
            LanguageName = "Italian",
            Level = CourseLevel.Intermediate,
            IsActive = true
        });
        await _db.SaveChangesAsync();

        var result = await _sut.SubmitAsync(adminId, courseId, RequestType.Leave);

        Assert.Equal(SubmitError.AdminJoinNotAllowed, result.Error);
        Assert.Null(result.Request);
        Assert.False(await _db.CourseRequests.AnyAsync());
    }
}
