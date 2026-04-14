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
            FullName = "  new_register_user  "
        });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var body = await response.Content.ReadFromJsonAsync<AuthResponse>();
        Assert.NotNull(body);
        Assert.False(string.IsNullOrWhiteSpace(body!.Token));
        Assert.Equal(email, body.User.Email);
        Assert.Equal(UserRole.Visitor, body.User.Role);
        Assert.Equal("new_register_user", body.User.FullName);
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
            FullName = "duplicate_try_user"
        });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Register_WeakPassword_ReturnsBadRequest()
    {
        await using var factory = new TestWebApplicationFactory();
        using var client = factory.CreateClient();

        var response = await client.PostAsJsonAsync("/api/auth/register", new RegisterRequest
        {
            Email = $"{Guid.NewGuid():N}@example.com",
            Password = "noupper1!",
            FullName = "weak_pw_user"
        });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Register_PasswordTooShort_ReturnsBadRequest()
    {
        await using var factory = new TestWebApplicationFactory();
        using var client = factory.CreateClient();

        var response = await client.PostAsJsonAsync("/api/auth/register", new RegisterRequest
        {
            Email = $"{Guid.NewGuid():N}@example.com",
            Password = "Abcd1!x",
            FullName = "short_pw_user"
        });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task VerifyCurrentPassword_WrongPassword_ReturnsBadRequest()
    {
        await using var factory = new TestWebApplicationFactory();
        using var client = factory.CreateClient();

        var email = $"{Guid.NewGuid():N}@example.com";
        const string pw = "GoodPassword!123";
        await factory.SeedUserAsync(email, pw, fullName: "verify_pw_user");
        var token = await TestAuthHelper.LoginAndGetTokenAsync(client, email, pw);
        client.SetBearerToken(token);

        var response = await client.PostAsJsonAsync("/api/auth/verify-current-password", new VerifyCurrentPasswordRequest
        {
            Password = "WrongPassword!999"
        });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task VerifyCurrentPassword_CorrectPassword_ReturnsOk()
    {
        await using var factory = new TestWebApplicationFactory();
        using var client = factory.CreateClient();

        var email = $"{Guid.NewGuid():N}@example.com";
        const string pw = "GoodPassword!123";
        await factory.SeedUserAsync(email, pw, fullName: "verify_pw_ok_user");
        var token = await TestAuthHelper.LoginAndGetTokenAsync(client, email, pw);
        client.SetBearerToken(token);

        var response = await client.PostAsJsonAsync("/api/auth/verify-current-password", new VerifyCurrentPasswordRequest
        {
            Password = pw
        });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task ChangePassword_WithValidCurrent_ReturnsNewToken()
    {
        await using var factory = new TestWebApplicationFactory();
        using var client = factory.CreateClient();

        var email = $"{Guid.NewGuid():N}@example.com";
        const string oldPw = "OldPassword!123";
        await factory.SeedUserAsync(email, oldPw, fullName: "pwd_change_user");
        var token = await TestAuthHelper.LoginAndGetTokenAsync(client, email, oldPw);
        client.SetBearerToken(token);

        var response = await client.PostAsJsonAsync("/api/auth/change-password", new ChangePasswordRequest
        {
            CurrentPassword = oldPw,
            NewPassword = "NewPassword!456"
        });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<AuthResponse>();
        Assert.NotNull(body);
        Assert.False(string.IsNullOrWhiteSpace(body!.Token));
        Assert.NotEqual(token, body.Token);
    }

    [Fact]
    public async Task Register_DuplicateUsername_ReturnsBadRequest()
    {
        await using var factory = new TestWebApplicationFactory();
        using var client = factory.CreateClient();

        var taken = "taken_username_abc";
        await factory.SeedUserAsync($"{Guid.NewGuid():N}@example.com", "ExistingPassword!123", fullName: taken);

        var response = await client.PostAsJsonAsync("/api/auth/register", new RegisterRequest
        {
            Email = $"{Guid.NewGuid():N}@example.com",
            Password = "AnotherPassword!123",
            FullName = taken
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
        var user = await factory.SeedUserAsync(email, password, UserRole.Student, fullName: "student_me_test");
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
