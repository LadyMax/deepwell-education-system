using System.Net;
using System.Net.Http.Json;
using DeepwellEducation.Controllers;
using DeepwellEducation.Data;
using DeepwellEducation.Domain.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
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
            UserName = "  new_register_user  "
        });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var body = await response.Content.ReadFromJsonAsync<AuthResponse>();
        Assert.NotNull(body);
        Assert.False(string.IsNullOrWhiteSpace(body!.Token));
        Assert.Equal(email, body.User.Email);
        Assert.Equal(UserRole.Visitor, body.User.Role);
        Assert.Equal("new_register_user", body.User.UserName);
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
            UserName = "duplicate_try_user"
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
            UserName = "weak_pw_user"
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
            UserName = "short_pw_user"
        });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Register_PasswordTooLong_ReturnsBadRequest()
    {
        await using var factory = new TestWebApplicationFactory();
        using var client = factory.CreateClient();

        var longPw = "Aa1!" + new string('x', AuthController.MaxPasswordLength);
        Assert.True(longPw.Length > AuthController.MaxPasswordLength);

        var response = await client.PostAsJsonAsync("/api/auth/register", new RegisterRequest
        {
            Email = $"{Guid.NewGuid():N}@example.com",
            Password = longPw,
            UserName = "long_pw_user"
        });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Login_PasswordTooLong_ReturnsUnauthorized()
    {
        await using var factory = new TestWebApplicationFactory();
        using var client = factory.CreateClient();

        var email = $"{Guid.NewGuid():N}@example.com";
        await factory.SeedUserAsync(email, "CorrectPassword!123");

        var longPw = "Aa1!" + new string('x', AuthController.MaxPasswordLength);
        var response = await client.PostAsJsonAsync("/api/auth/login", new LoginRequest
        {
            Email = email,
            Password = longPw
        });

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task VerifyCurrentPassword_WrongPassword_ReturnsBadRequest()
    {
        await using var factory = new TestWebApplicationFactory();
        using var client = factory.CreateClient();

        var email = $"{Guid.NewGuid():N}@example.com";
        const string pw = "GoodPassword!123";
        await factory.SeedUserAsync(email, pw, userName: "verify_pw_user");
        var token = await TestAuthHelper.LoginAndGetTokenAsync(client, email, pw);
        client.SetBearerToken(token);

        var response = await client.PostAsJsonAsync("/api/auth/verify-current-password", new VerifyCurrentPasswordRequest
        {
            Password = "WrongPassword!999"
        });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task VerifyCurrentPassword_PasswordTooLong_ReturnsBadRequest()
    {
        await using var factory = new TestWebApplicationFactory();
        using var client = factory.CreateClient();

        var email = $"{Guid.NewGuid():N}@example.com";
        const string pw = "GoodPassword!123";
        await factory.SeedUserAsync(email, pw, userName: "verify_long_pw_user");
        var token = await TestAuthHelper.LoginAndGetTokenAsync(client, email, pw);
        client.SetBearerToken(token);

        var longPw = "Aa1!" + new string('z', AuthController.MaxPasswordLength);
        var response = await client.PostAsJsonAsync("/api/auth/verify-current-password", new VerifyCurrentPasswordRequest
        {
            Password = longPw
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
        await factory.SeedUserAsync(email, pw, userName: "verify_pw_ok_user");
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
        await factory.SeedUserAsync(email, oldPw, userName: "pwd_change_user");
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
        await factory.SeedUserAsync($"{Guid.NewGuid():N}@example.com", "ExistingPassword!123", userName: taken);

        var response = await client.PostAsJsonAsync("/api/auth/register", new RegisterRequest
        {
            Email = $"{Guid.NewGuid():N}@example.com",
            Password = "AnotherPassword!123",
            UserName = taken
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
        var user = await factory.SeedUserAsync(email, password, UserRole.Student, userName: "student_me_test");
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

    [Fact]
    public async Task Me_WithTokenIssuedBeforeAccountDisabled_ReturnsUnauthorized()
    {
        await using var factory = new TestWebApplicationFactory();
        using var client = factory.CreateClient();

        var email = $"{Guid.NewGuid():N}@example.com";
        var password = "ValidPassword!123";
        var user = await factory.SeedUserAsync(email, password, UserRole.Student, userName: "inactive_token_me_test");
        var token = await TestAuthHelper.LoginAndGetTokenAsync(client, email, password);

        using (var scope = factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var u = await db.Users.FirstAsync(x => x.Id == user.Id);
            u.IsActive = false;
            await db.SaveChangesAsync();
        }

        client.SetBearerToken(token);
        var response = await client.GetAsync("/api/auth/me");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }
}
