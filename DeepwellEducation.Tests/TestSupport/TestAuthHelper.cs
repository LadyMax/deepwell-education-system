using System.Net.Http.Headers;
using System.Net.Http.Json;
using DeepwellEducation.Controllers;
using DeepwellEducation.Data;
using DeepwellEducation.Domain.Entities;
using DeepwellEducation.Domain.Enums;
using DeepwellEducation.Services;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace DeepwellEducation.Tests;

internal static class TestAuthHelper
{
    public static async Task<User> SeedUserAsync(
        this TestWebApplicationFactory factory,
        string email,
        string password,
        UserRole role = UserRole.Visitor,
        string fullName = "Test User",
        bool isActive = true)
    {
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var hasher = scope.ServiceProvider.GetRequiredService<IPasswordHasher<User>>();

        var user = new User
        {
            Id = Guid.NewGuid(),
            Email = email.Trim().ToLowerInvariant(),
            FullName = fullName,
            Role = role,
            IsActive = isActive,
            CreatedAt = DateTime.UtcNow
        };
        user.PasswordHash = hasher.HashPassword(user, password);

        db.Users.Add(user);
        await db.SaveChangesAsync();
        return user;
    }

    public static async Task<StudentProfile> SeedStudentProfileAsync(
        this TestWebApplicationFactory factory,
        Guid userId,
        string studentNumber = "S-000001")
    {
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var profile = new StudentProfile
        {
            UserId = userId,
            StudentNumber = studentNumber,
            FirstName = "Before",
            LastName = "Update",
            Phone = "100200300",
            Address = "Initial Address",
            CreatedAt = DateTime.UtcNow
        };

        db.StudentProfiles.Add(profile);
        await db.SaveChangesAsync();
        return profile;
    }

    public static async Task<StudentProfile?> FindStudentProfileAsync(this TestWebApplicationFactory factory, Guid userId)
    {
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        return await db.StudentProfiles.AsNoTracking().FirstOrDefaultAsync(p => p.UserId == userId);
    }

    public static async Task<Course> SeedCourseAsync(
        this TestWebApplicationFactory factory,
        string name = "Test Course",
        string languageCode = "en",
        string languageName = "English",
        CourseLevel level = CourseLevel.Beginner,
        bool isActive = true)
    {
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var course = new Course
        {
            Id = Guid.NewGuid(),
            Name = name,
            Description = "Test description",
            LanguageCode = languageCode,
            LanguageName = languageName,
            Level = level,
            Category = CourseCategory.Language,
            IsActive = isActive
        };

        db.Courses.Add(course);
        await db.SaveChangesAsync();
        return course;
    }

    public static async Task<Enrollment> SeedEnrollmentAsync(
        this TestWebApplicationFactory factory,
        Guid userId,
        Guid courseId,
        bool isActive = true,
        DateTime? createdAt = null)
    {
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var enrollment = new Enrollment
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            CourseId = courseId,
            IsActive = isActive,
            CreatedAt = createdAt ?? DateTime.UtcNow
        };

        db.Enrollments.Add(enrollment);
        await db.SaveChangesAsync();
        return enrollment;
    }

    public static async Task<CourseRequest> SeedCourseRequestAsync(
        this TestWebApplicationFactory factory,
        Guid userId,
        Guid courseId,
        RequestType type = RequestType.Join,
        RequestStatus status = RequestStatus.Pending,
        DateTime? createdAt = null)
    {
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var request = new CourseRequest
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            CourseId = courseId,
            Type = type,
            Status = status,
            CreatedAt = createdAt ?? DateTime.UtcNow
        };

        db.CourseRequests.Add(request);
        await db.SaveChangesAsync();
        return request;
    }

    public static async Task<Message> SeedMessageAsync(
        this TestWebApplicationFactory factory,
        Guid senderUserId,
        Guid receiverUserId,
        string subject = "Subject",
        string content = "Content",
        DateTime? createdAt = null,
        MessageCategory? senderSuggestedCategory = null,
        MessageCategory? finalCategory = null)
    {
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var message = new Message
        {
            Id = Guid.NewGuid(),
            SenderUserId = senderUserId,
            ReceiverUserId = receiverUserId,
            Subject = subject,
            Content = content,
            CreatedAt = createdAt ?? DateTime.UtcNow,
            SenderSuggestedCategory = senderSuggestedCategory,
            FinalCategory = finalCategory
        };

        db.Messages.Add(message);
        await db.SaveChangesAsync();
        return message;
    }

    public static async Task<PagedResult<T>?> ReadPagedResultAsync<T>(HttpResponseMessage response)
    {
        return await response.Content.ReadFromJsonAsync<PagedResult<T>>();
    }

    public static async Task<string> LoginAndGetTokenAsync(HttpClient client, string email, string password)
    {
        var loginResponse = await client.PostAsJsonAsync("/api/auth/login", new LoginRequest
        {
            Email = email,
            Password = password
        });

        Assert.True(
            loginResponse.IsSuccessStatusCode,
            $"Expected login success, got {(int)loginResponse.StatusCode}: {await loginResponse.Content.ReadAsStringAsync()}");

        var body = await loginResponse.Content.ReadFromJsonAsync<AuthResponse>();
        Assert.NotNull(body);
        Assert.False(string.IsNullOrWhiteSpace(body!.Token));
        return body.Token;
    }

    public static void SetBearerToken(this HttpClient client, string token)
    {
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
    }
}
