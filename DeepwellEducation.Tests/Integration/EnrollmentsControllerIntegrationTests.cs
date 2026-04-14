using System.Net;
using System.Net.Http.Json;
using DeepwellEducation.Controllers;
using DeepwellEducation.Domain.Enums;
using Xunit;

namespace DeepwellEducation.Tests;

public class EnrollmentsControllerIntegrationTests
{
    [Fact]
    public async Task GetMyEnrollments_WithoutToken_ReturnsUnauthorized()
    {
        await using var factory = new TestWebApplicationFactory();
        using var client = factory.CreateClient();

        var response = await client.GetAsync("/api/enrollments/me");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task GetMyEnrollments_ReturnsOnlyCurrentUsersActiveEnrollmentsOrderedByCourseName()
    {
        await using var factory = new TestWebApplicationFactory();
        using var client = factory.CreateClient();

        var email = $"{Guid.NewGuid():N}@example.com";
        var password = "EnrollmentPassword!123";
        var user = await factory.SeedUserAsync(email, password, UserRole.Student);
        var otherUser = await factory.SeedUserAsync($"{Guid.NewGuid():N}@example.com", "OtherPassword!123", UserRole.Student);

        var courseB = await factory.SeedCourseAsync(name: "Zulu Course");
        var courseA = await factory.SeedCourseAsync(name: "Alpha Course");
        var otherCourse = await factory.SeedCourseAsync(name: "Other User Course");

        await factory.SeedEnrollmentAsync(user.Id, courseB.Id, isActive: true);
        await factory.SeedEnrollmentAsync(user.Id, courseA.Id, isActive: true);
        await factory.SeedEnrollmentAsync(user.Id, otherCourse.Id, isActive: false);
        await factory.SeedEnrollmentAsync(otherUser.Id, otherCourse.Id, isActive: true);

        var token = await TestAuthHelper.LoginAndGetTokenAsync(client, email, password);
        client.SetBearerToken(token);

        var response = await client.GetAsync("/api/enrollments/me");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<List<MyEnrollmentDto>>();
        Assert.NotNull(body);
        Assert.Equal(2, body!.Count);
        Assert.Equal("Alpha Course", body[0].CourseName);
        Assert.Equal("Zulu Course", body[1].CourseName);
    }

    [Fact]
    public async Task GetByCourse_AsStudent_ReturnsForbidden()
    {
        await using var factory = new TestWebApplicationFactory();
        using var client = factory.CreateClient();

        var email = $"{Guid.NewGuid():N}@example.com";
        var password = "EnrollmentPassword!123";
        await factory.SeedUserAsync(email, password, UserRole.Student);
        var course = await factory.SeedCourseAsync(name: "Forbidden Course");

        var token = await TestAuthHelper.LoginAndGetTokenAsync(client, email, password);
        client.SetBearerToken(token);

        var response = await client.GetAsync($"/api/enrollments/course/{course.Id}");

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task GetByCourse_AsAdmin_ReturnsActiveMembersWithStudentNumber()
    {
        await using var factory = new TestWebApplicationFactory();
        using var client = factory.CreateClient();

        var adminEmail = $"{Guid.NewGuid():N}@example.com";
        var adminPassword = "AdminPassword!123";
        await factory.SeedUserAsync(adminEmail, adminPassword, UserRole.Admin);

        var student = await factory.SeedUserAsync($"{Guid.NewGuid():N}@example.com", "StudentPassword!123", UserRole.Student, "student_one");
        await factory.SeedStudentProfileAsync(student.Id, "S-112233");
        var course = await factory.SeedCourseAsync(name: "Admin Course");
        await factory.SeedEnrollmentAsync(student.Id, course.Id, isActive: true);

        var token = await TestAuthHelper.LoginAndGetTokenAsync(client, adminEmail, adminPassword);
        client.SetBearerToken(token);

        var response = await client.GetAsync($"/api/enrollments/course/{course.Id}");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<List<CourseEnrollmentDto>>();
        Assert.NotNull(body);
        Assert.Single(body!);
        Assert.Equal(student.Id, body[0].UserId);
        Assert.Equal("S-112233", body[0].StudentNumber);
    }

    [Fact]
    public async Task GetByCourse_AsAdmin_WhenCourseNotFound_ReturnsNotFound()
    {
        await using var factory = new TestWebApplicationFactory();
        using var client = factory.CreateClient();

        var adminEmail = $"{Guid.NewGuid():N}@example.com";
        var adminPassword = "AdminPassword!123";
        await factory.SeedUserAsync(adminEmail, adminPassword, UserRole.Admin);

        var token = await TestAuthHelper.LoginAndGetTokenAsync(client, adminEmail, adminPassword);
        client.SetBearerToken(token);

        var response = await client.GetAsync($"/api/enrollments/course/{Guid.NewGuid()}");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }
}
