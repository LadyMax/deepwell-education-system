using System.Net;
using System.Net.Http.Json;
using DeepwellEducation.Controllers;
using DeepwellEducation.Domain.Enums;
using Xunit;

namespace DeepwellEducation.Tests;

public class AuthControllerIntegrationTests
{
    [Fact]
    public async Task Register_WithValidPayload_ReturnsTokenAndVisitorUser()
    {
        await using var factory = new TestWebApplicationFactory();
        using var client = factory.CreateClient();

        var email = $"{Guid.NewGuid():N}@example.com";
        var response = await client.PostAsJsonAsync("/api/auth/register", new RegisterRequest
        {
            Email = $"  {email.ToUpperInvariant()}  ",
            Password = "TestPassword!123",
            FullName = "  New User  "
        });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var body = await response.Content.ReadFromJsonAsync<AuthResponse>();
        Assert.NotNull(body);
        Assert.False(string.IsNullOrWhiteSpace(body!.Token));
        Assert.Equal(email, body.User.Email);
        Assert.Equal(UserRole.Visitor, body.User.Role);
        Assert.Equal("New User", body.User.FullName);
    }

    [Fact]
    public async Task Register_DuplicateEmail_ReturnsBadRequest()
    {
        await using var factory = new TestWebApplicationFactory();
        using var client = factory.CreateClient();

        var email = $"{Guid.NewGuid():N}@example.com";
        await factory.SeedUserAsync(email, "ExistingPassword!123");

        var response = await client.PostAsJsonAsync("/api/auth/register", new RegisterRequest
        {
            Email = email,
            Password = "AnotherPassword!123",
            FullName = "Duplicate User"
        });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Login_WithWrongPassword_ReturnsUnauthorized()
    {
        await using var factory = new TestWebApplicationFactory();
        using var client = factory.CreateClient();

        var email = $"{Guid.NewGuid():N}@example.com";
        await factory.SeedUserAsync(email, "CorrectPassword!123");

        var response = await client.PostAsJsonAsync("/api/auth/login", new LoginRequest
        {
            Email = email,
            Password = "WrongPassword!123"
        });

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Login_WithDisabledUser_ReturnsUnauthorized()
    {
        await using var factory = new TestWebApplicationFactory();
        using var client = factory.CreateClient();

        var email = $"{Guid.NewGuid():N}@example.com";
        await factory.SeedUserAsync(email, "CorrectPassword!123", isActive: false);

        var response = await client.PostAsJsonAsync("/api/auth/login", new LoginRequest
        {
            Email = email,
            Password = "CorrectPassword!123"
        });

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Me_WithoutToken_ReturnsUnauthorized()
    {
        await using var factory = new TestWebApplicationFactory();
        using var client = factory.CreateClient();

        var response = await client.GetAsync("/api/auth/me");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Me_WithValidToken_ReturnsCurrentUser()
    {
        await using var factory = new TestWebApplicationFactory();
        using var client = factory.CreateClient();

        var email = $"{Guid.NewGuid():N}@example.com";
        var password = "ValidPassword!123";
        var user = await factory.SeedUserAsync(email, password, UserRole.Student, fullName: "Student A");
        var token = await TestAuthHelper.LoginAndGetTokenAsync(client, email, password);
        client.SetBearerToken(token);

        var response = await client.GetAsync("/api/auth/me");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var me = await response.Content.ReadFromJsonAsync<UserDto>();
        Assert.NotNull(me);
        Assert.Equal(user.Id, me!.Id);
        Assert.Equal(user.Email, me.Email);
        Assert.Equal(UserRole.Student, me.Role);
    }
}
