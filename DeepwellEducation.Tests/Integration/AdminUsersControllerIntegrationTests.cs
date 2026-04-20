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
    public async Task GetUser_AsAdmin_WhenUserMissing_ReturnsNotFound()
    {
        await using var factory = new TestWebApplicationFactory();
        using var client = factory.CreateClient();

        var adminEmail = $"{Guid.NewGuid():N}@example.com";
        await factory.SeedUserAsync(adminEmail, "AdminPassword!123", UserRole.Admin);
        var token = await TestAuthHelper.LoginAndGetTokenAsync(client, adminEmail, "AdminPassword!123");
        client.SetBearerToken(token);

        var response = await client.GetAsync($"/api/admin/users/{Guid.NewGuid()}");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
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

    [Fact]
    public async Task List_AsAdmin_ReturnsPagedUsers()
    {
        await using var factory = new TestWebApplicationFactory();
        using var client = factory.CreateClient();

        var adminEmail = $"{Guid.NewGuid():N}@example.com";
        await factory.SeedUserAsync(adminEmail, "AdminPassword!123", UserRole.Admin);
        await factory.SeedUserAsync($"{Guid.NewGuid():N}@example.com", "Pw!12345678", UserRole.Visitor);

        var token = await TestAuthHelper.LoginAndGetTokenAsync(client, adminEmail, "AdminPassword!123");
        client.SetBearerToken(token);

        var response = await client.GetAsync("/api/admin/users?page=1&pageSize=10");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var page = await TestAuthHelper.ReadPagedResultAsync<AdminUserListItemDto>(response);
        Assert.NotNull(page);
        Assert.True(page!.TotalCount >= 2);
        Assert.True(page.Items.Count >= 1);
        Assert.Equal(1, page.Page);
        Assert.Equal(10, page.PageSize);
    }

    [Fact]
    public async Task List_AsAdmin_WithQuery_FiltersByEmailOrUsername()
    {
        await using var factory = new TestWebApplicationFactory();
        using var client = factory.CreateClient();

        var adminEmail = $"{Guid.NewGuid():N}@example.com";
        await factory.SeedUserAsync(adminEmail, "AdminPassword!123", UserRole.Admin);
        var marker = "uniqfind-" + Guid.NewGuid().ToString("N");
        var targetEmail = $"{marker}@example.com";
        var target = await factory.SeedUserAsync(targetEmail, "Pw!12345678", UserRole.Student, userName: "u_" + marker);

        var token = await TestAuthHelper.LoginAndGetTokenAsync(client, adminEmail, "AdminPassword!123");
        client.SetBearerToken(token);

        var response = await client.GetAsync("/api/admin/users?q=" + Uri.EscapeDataString(marker));
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var page = await TestAuthHelper.ReadPagedResultAsync<AdminUserListItemDto>(response);
        Assert.NotNull(page);
        Assert.Contains(page!.Items, u => u.Id == target.Id);
        Assert.All(
            page.Items,
            u => Assert.True(
                u.Email.Contains(marker, StringComparison.OrdinalIgnoreCase) ||
                u.UserName.Contains(marker, StringComparison.OrdinalIgnoreCase)));
    }

    [Fact]
    public async Task List_AsAdmin_WithRole_ReturnsOnlyThatRole()
    {
        await using var factory = new TestWebApplicationFactory();
        using var client = factory.CreateClient();

        var adminEmail = $"{Guid.NewGuid():N}@example.com";
        await factory.SeedUserAsync(adminEmail, "AdminPassword!123", UserRole.Admin);
        var marker = "visonly-" + Guid.NewGuid().ToString("N");
        await factory.SeedUserAsync($"{marker}@example.com", "Pw!12345678", UserRole.Visitor);

        var token = await TestAuthHelper.LoginAndGetTokenAsync(client, adminEmail, "AdminPassword!123");
        client.SetBearerToken(token);

        var response = await client.GetAsync(
            "/api/admin/users?q=" + Uri.EscapeDataString(marker) + "&role=0&pageSize=50");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var page = await TestAuthHelper.ReadPagedResultAsync<AdminUserListItemDto>(response);
        Assert.NotNull(page);
        Assert.NotEmpty(page!.Items);
        Assert.All(page.Items, u => Assert.Equal(UserRole.Visitor, u.Role));
        Assert.All(page.Items, u => Assert.Contains(marker, u.Email, StringComparison.OrdinalIgnoreCase));
    }

    [Fact]
    public async Task List_AsStudent_ReturnsForbidden()
    {
        await using var factory = new TestWebApplicationFactory();
        using var client = factory.CreateClient();

        var email = $"{Guid.NewGuid():N}@example.com";
        await factory.SeedUserAsync(email, "StudentPassword!123", UserRole.Student);
        var token = await TestAuthHelper.LoginAndGetTokenAsync(client, email, "StudentPassword!123");
        client.SetBearerToken(token);

        var response = await client.GetAsync("/api/admin/users");
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }
}
