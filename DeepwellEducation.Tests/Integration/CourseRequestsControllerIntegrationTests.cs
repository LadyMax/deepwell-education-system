using System.Net;
using System.Net.Http.Json;
using DeepwellEducation.Controllers;
using DeepwellEducation.Data;
using DeepwellEducation.Domain.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace DeepwellEducation.Tests;

public class CourseRequestsControllerIntegrationTests
{
    [Fact]
    public async Task Submit_WithoutToken_ReturnsUnauthorized()
    {
        await using var factory = new TestWebApplicationFactory();
        using var client = factory.CreateClient();
        var course = await factory.SeedCourseAsync();

        var response = await client.PostAsJsonAsync("/api/courserequests", new SubmitCourseRequestRequest
        {
            CourseId = course.Id,
            Type = RequestType.Join
        });

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Submit_WithValidJoin_ReturnsCreatedRequest()
    {
        await using var factory = new TestWebApplicationFactory();
        using var client = factory.CreateClient();

        var email = $"{Guid.NewGuid():N}@example.com";
        var password = "CourseReqPassword!123";
        var user = await factory.SeedUserAsync(email, password, UserRole.Visitor);
        var course = await factory.SeedCourseAsync(name: "Spanish Beginner");
        var token = await TestAuthHelper.LoginAndGetTokenAsync(client, email, password);
        client.SetBearerToken(token);

        var response = await client.PostAsJsonAsync("/api/courserequests", new SubmitCourseRequestRequest
        {
            CourseId = course.Id,
            Type = RequestType.Join
        });

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<CourseRequestDto>();
        Assert.NotNull(body);
        Assert.Equal(user.Id, body!.UserId);
        Assert.Equal(course.Id, body.CourseId);
        Assert.Equal(RequestType.Join, body.Type);
        Assert.Equal(RequestStatus.Pending, body.Status);
    }

    [Fact]
    public async Task Submit_AdminJoin_ReturnsForbidden()
    {
        await using var factory = new TestWebApplicationFactory();
        using var client = factory.CreateClient();

        var email = $"{Guid.NewGuid():N}@example.com";
        var password = "CourseReqPassword!123";
        await factory.SeedUserAsync(email, password, UserRole.Admin);
        var course = await factory.SeedCourseAsync(name: "French Beginner");
        var token = await TestAuthHelper.LoginAndGetTokenAsync(client, email, password);
        client.SetBearerToken(token);

        var response = await client.PostAsJsonAsync("/api/courserequests", new SubmitCourseRequestRequest
        {
            CourseId = course.Id,
            Type = RequestType.Join
        });

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task Review_AsAdminApproveJoin_CreatesActiveEnrollment()
    {
        await using var factory = new TestWebApplicationFactory();
        using var client = factory.CreateClient();

        var adminEmail = $"{Guid.NewGuid():N}@example.com";
        var studentEmail = $"{Guid.NewGuid():N}@example.com";
        var adminPassword = "AdminPassword!123";
        var studentPassword = "StudentPassword!123";

        var admin = await factory.SeedUserAsync(adminEmail, adminPassword, UserRole.Admin);
        var student = await factory.SeedUserAsync(studentEmail, studentPassword, UserRole.Visitor);
        var course = await factory.SeedCourseAsync(name: "German Intermediate");
        var request = await factory.SeedCourseRequestAsync(student.Id, course.Id, RequestType.Join, RequestStatus.Pending);

        var token = await TestAuthHelper.LoginAndGetTokenAsync(client, adminEmail, adminPassword);
        client.SetBearerToken(token);

        var response = await client.PostAsJsonAsync($"/api/courserequests/{request.Id}/review", new ReviewRequest
        {
            Approve = true
        });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<CourseRequestDto>();
        Assert.NotNull(body);
        Assert.Equal(RequestStatus.Approved, body!.Status);
        Assert.Equal(admin.Id, body.ReviewedBy);

        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var enrollment = await db.Enrollments.AsNoTracking()
            .SingleOrDefaultAsync(e => e.UserId == student.Id && e.CourseId == course.Id);
        Assert.NotNull(enrollment);
        Assert.True(enrollment!.IsActive);
    }

    [Fact]
    public async Task List_AsAdminWithStatusFilter_ReturnsFilteredRequests()
    {
        await using var factory = new TestWebApplicationFactory();
        using var client = factory.CreateClient();

        var adminEmail = $"{Guid.NewGuid():N}@example.com";
        var adminPassword = "AdminPassword!123";
        var user = await factory.SeedUserAsync($"{Guid.NewGuid():N}@example.com", "UserPassword!123", UserRole.Student, "student_user");
        var admin = await factory.SeedUserAsync(adminEmail, adminPassword, UserRole.Admin);
        var course = await factory.SeedCourseAsync(name: "Italian Advanced");
        await factory.SeedCourseRequestAsync(user.Id, course.Id, RequestType.Join, RequestStatus.Pending);
        await factory.SeedCourseRequestAsync(user.Id, course.Id, RequestType.Leave, RequestStatus.Rejected);
        _ = admin;

        var token = await TestAuthHelper.LoginAndGetTokenAsync(client, adminEmail, adminPassword);
        client.SetBearerToken(token);

        var response = await client.GetAsync("/api/courserequests?status=Pending");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<List<CourseRequestListItemDto>>();
        Assert.NotNull(body);
        Assert.Single(body!);
        Assert.Equal(RequestStatus.Pending, body[0].Status);
        Assert.Equal(RequestType.Join, body[0].Type);
    }

    [Fact]
    public async Task Submit_WhenDuplicatePendingExists_ReturnsBadRequest()
    {
        await using var factory = new TestWebApplicationFactory();
        using var client = factory.CreateClient();

        var email = $"{Guid.NewGuid():N}@example.com";
        var password = "CourseReqPassword!123";
        var user = await factory.SeedUserAsync(email, password, UserRole.Student);
        var course = await factory.SeedCourseAsync(name: "Duplicate Pending Course");
        await factory.SeedCourseRequestAsync(user.Id, course.Id, RequestType.Join, RequestStatus.Pending);

        var token = await TestAuthHelper.LoginAndGetTokenAsync(client, email, password);
        client.SetBearerToken(token);

        var response = await client.PostAsJsonAsync("/api/courserequests", new SubmitCourseRequestRequest
        {
            CourseId = course.Id,
            Type = RequestType.Join
        });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Submit_WhenCourseNotFound_ReturnsNotFound()
    {
        await using var factory = new TestWebApplicationFactory();
        using var client = factory.CreateClient();

        var email = $"{Guid.NewGuid():N}@example.com";
        var password = "CourseReqPassword!123";
        await factory.SeedUserAsync(email, password, UserRole.Student);
        var token = await TestAuthHelper.LoginAndGetTokenAsync(client, email, password);
        client.SetBearerToken(token);

        var response = await client.PostAsJsonAsync("/api/courserequests", new SubmitCourseRequestRequest
        {
            CourseId = Guid.NewGuid(),
            Type = RequestType.Join
        });

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task Review_WhenAlreadyReviewed_ReturnsBadRequest()
    {
        await using var factory = new TestWebApplicationFactory();
        using var client = factory.CreateClient();

        var adminEmail = $"{Guid.NewGuid():N}@example.com";
        var adminPassword = "AdminPassword!123";
        var student = await factory.SeedUserAsync($"{Guid.NewGuid():N}@example.com", "StudentPassword!123", UserRole.Student);
        await factory.SeedUserAsync(adminEmail, adminPassword, UserRole.Admin);
        var course = await factory.SeedCourseAsync(name: "Already Reviewed Course");
        var request = await factory.SeedCourseRequestAsync(student.Id, course.Id, RequestType.Join, RequestStatus.Approved);

        var token = await TestAuthHelper.LoginAndGetTokenAsync(client, adminEmail, adminPassword);
        client.SetBearerToken(token);

        var response = await client.PostAsJsonAsync($"/api/courserequests/{request.Id}/review", new ReviewRequest
        {
            Approve = true
        });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task List_AsAdmin_WithCourseTypeStatusAndApplicantFilters_ReturnsOnlyMatches()
    {
        await using var factory = new TestWebApplicationFactory();
        using var client = factory.CreateClient();

        var adminEmail = $"{Guid.NewGuid():N}@example.com";
        var adminPassword = "AdminPassword!123";
        await factory.SeedUserAsync(adminEmail, adminPassword, UserRole.Admin);

        var alice = await factory.SeedUserAsync($"{Guid.NewGuid():N}@example.com", "StudentPassword!123", UserRole.Student, userName: "alice_walker");
        var bob = await factory.SeedUserAsync($"{Guid.NewGuid():N}@example.com", "StudentPassword!123", UserRole.Student, userName: "bob_smith");

        var spanish = await factory.SeedCourseAsync(name: "Spanish Beginner");
        var german = await factory.SeedCourseAsync(name: "German Beginner");

        await factory.SeedCourseRequestAsync(alice.Id, spanish.Id, RequestType.Join, RequestStatus.Pending);
        await factory.SeedCourseRequestAsync(alice.Id, german.Id, RequestType.Join, RequestStatus.Pending);
        await factory.SeedCourseRequestAsync(bob.Id, spanish.Id, RequestType.Join, RequestStatus.Pending);
        await factory.SeedCourseRequestAsync(alice.Id, spanish.Id, RequestType.Leave, RequestStatus.Approved);

        var token = await TestAuthHelper.LoginAndGetTokenAsync(client, adminEmail, adminPassword);
        client.SetBearerToken(token);

        var response = await client.GetAsync(
            $"/api/courserequests?status=Pending&type=Join&courseId={spanish.Id}&applicant=Alice");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<List<CourseRequestListItemDto>>();
        Assert.NotNull(body);
        Assert.Single(body!);
        Assert.Equal(alice.Id, body[0].UserId);
        Assert.Equal(spanish.Id, body[0].CourseId);
        Assert.Equal(RequestType.Join, body[0].Type);
        Assert.Equal(RequestStatus.Pending, body[0].Status);
    }

    [Fact]
    public async Task List_AsAdmin_WithCreatedAscSort_ReturnsOldestFirst()
    {
        await using var factory = new TestWebApplicationFactory();
        using var client = factory.CreateClient();

        var adminEmail = $"{Guid.NewGuid():N}@example.com";
        var adminPassword = "AdminPassword!123";
        var learner = await factory.SeedUserAsync($"{Guid.NewGuid():N}@example.com", "StudentPassword!123", UserRole.Student, userName: "sort_user");
        await factory.SeedUserAsync(adminEmail, adminPassword, UserRole.Admin);
        var courseA = await factory.SeedCourseAsync(name: "Sort A");
        var courseB = await factory.SeedCourseAsync(name: "Sort B");

        var older = await factory.SeedCourseRequestAsync(
            learner.Id,
            courseA.Id,
            RequestType.Join,
            RequestStatus.Pending,
            createdAt: new DateTime(2025, 1, 1, 0, 0, 0, DateTimeKind.Utc));
        var newer = await factory.SeedCourseRequestAsync(
            learner.Id,
            courseB.Id,
            RequestType.Join,
            RequestStatus.Pending,
            createdAt: new DateTime(2025, 6, 1, 0, 0, 0, DateTimeKind.Utc));

        var token = await TestAuthHelper.LoginAndGetTokenAsync(client, adminEmail, adminPassword);
        client.SetBearerToken(token);

        var response = await client.GetAsync("/api/courserequests?status=Pending&type=Join&applicant=Sort&created=asc");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<List<CourseRequestListItemDto>>();
        Assert.NotNull(body);
        Assert.Equal(2, body!.Count);
        Assert.Equal(older.Id, body[0].Id);
        Assert.Equal(newer.Id, body[1].Id);
    }
}
