using System.Net;
using System.Net.Http.Json;
using DeepwellEducation.Controllers;
using DeepwellEducation.Domain.Enums;
using Xunit;

namespace DeepwellEducation.Tests;

public class AdminUsersControllerIntegrationTests
{
    [Fact]
    public async Task GetUser_AsAdmin_ReturnsOkWithUserFields()
    {
        await using var factory = new TestWebApplicationFactory();
        using var client = factory.CreateClient();

        var adminEmail = $"{Guid.NewGuid():N}@example.com";
        const string adminPw = "AdminPassword!123";
        await factory.SeedUserAsync(adminEmail, adminPw, UserRole.Admin);

        var studentEmail = $"{Guid.NewGuid():N}@example.com";
        var student = await factory.SeedUserAsync(
            studentEmail,
            "StudentPassword!123",
            UserRole.Student,
            userName: "lookup_student");

        var token = await TestAuthHelper.LoginAndGetTokenAsync(client, adminEmail, adminPw);
        client.SetBearerToken(token);

        var response = await client.GetAsync($"/api/admin/users/{student.Id}");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<AdminUserDetailDto>();
        Assert.NotNull(body);
        Assert.Equal(studentEmail, body!.Email);
        Assert.Equal("lookup_student", body.UserName);
        Assert.Equal(UserRole.Student, body.Role);
    }

    [Fact]
    public async Task GetUser_AsStudent_ReturnsForbidden()
    {
        await using var factory = new TestWebApplicationFactory();
        using var client = factory.CreateClient();

        var email = $"{Guid.NewGuid():N}@example.com";
        await factory.SeedUserAsync(email, "StudentPassword!123", UserRole.Student);
        var other = await factory.SeedUserAsync(
            $"{Guid.NewGuid():N}@example.com",
            "OtherPassword!123",
            UserRole.Student);

        var token = await TestAuthHelper.LoginAndGetTokenAsync(client, email, "StudentPassword!123");
        client.SetBearerToken(token);

        var response = await client.GetAsync($"/api/admin/users/{other.Id}");
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }
}
