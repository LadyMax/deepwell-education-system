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
            FullName = "S",
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
            FullName = "S2",
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
            FullName = "U",
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
}
