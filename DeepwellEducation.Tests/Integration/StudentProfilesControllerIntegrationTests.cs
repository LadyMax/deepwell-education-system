using System.Net;
using System.Net.Http.Json;
using DeepwellEducation.Controllers;
using DeepwellEducation.Domain.Enums;
using Xunit;

namespace DeepwellEducation.Tests;

public class StudentProfilesControllerIntegrationTests
{
    [Fact]
    public async Task GetMyProfile_WithoutToken_ReturnsUnauthorized()
    {
        await using var factory = new TestWebApplicationFactory();
        using var client = factory.CreateClient();

        var response = await client.GetAsync("/api/studentprofiles/me");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task GetMyProfile_WithoutExistingProfile_ReturnsNotFound()
    {
        await using var factory = new TestWebApplicationFactory();
        using var client = factory.CreateClient();

        var email = $"{Guid.NewGuid():N}@example.com";
        var password = "ProfilePassword!123";
        await factory.SeedUserAsync(email, password, UserRole.Student);
        var token = await TestAuthHelper.LoginAndGetTokenAsync(client, email, password);
        client.SetBearerToken(token);

        var response = await client.GetAsync("/api/studentprofiles/me");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task GetMyProfile_WithProfile_ReturnsOkAndStudentNumber()
    {
        await using var factory = new TestWebApplicationFactory();
        using var client = factory.CreateClient();

        var email = $"{Guid.NewGuid():N}@example.com";
        var password = "ProfilePassword!123";
        var user = await factory.SeedUserAsync(email, password, UserRole.Student);
        await factory.SeedStudentProfileAsync(user.Id, studentNumber: "S-424242");
        var token = await TestAuthHelper.LoginAndGetTokenAsync(client, email, password);
        client.SetBearerToken(token);

        var response = await client.GetAsync("/api/studentprofiles/me");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<StudentProfileDto>();
        Assert.NotNull(body);
        Assert.Equal(user.Id, body!.UserId);
        Assert.Equal("S-424242", body.StudentNumber);
        Assert.Equal("Before", body.FirstName);
    }

    [Fact]
    public async Task UpdateMyProfile_WithValidPayload_UpdatesAndReturnsProfile()
    {
        await using var factory = new TestWebApplicationFactory();
        using var client = factory.CreateClient();

        var email = $"{Guid.NewGuid():N}@example.com";
        var password = "ProfilePassword!123";
        var user = await factory.SeedUserAsync(email, password, UserRole.Student);
        await factory.SeedStudentProfileAsync(user.Id, studentNumber: "S-987654");
        var token = await TestAuthHelper.LoginAndGetTokenAsync(client, email, password);
        client.SetBearerToken(token);

        var request = new UpdateStudentProfileRequest
        {
            FirstName = "Alice",
            LastName = "Johnson",
            Phone = "1234567890",
            DateOfBirth = new DateTime(2000, 5, 20),
            City = "Toronto",
            Address = "123 Test Street"
        };

        var response = await client.PutAsJsonAsync("/api/studentprofiles/me", request);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<StudentProfileDto>();
        Assert.NotNull(body);
        Assert.Equal("Alice", body!.FirstName);
        Assert.Equal("Johnson", body.LastName);
        Assert.Equal("1234567890", body.Phone);
        Assert.Equal("Toronto", body.City);
        Assert.Equal("123 Test Street", body.Address);

        var saved = await factory.FindStudentProfileAsync(user.Id);
        Assert.NotNull(saved);
        Assert.Equal("Alice", saved!.FirstName);
        Assert.Equal("Johnson", saved.LastName);
        Assert.Equal("1234567890", saved.Phone);
        Assert.Equal(new DateTime(2000, 5, 20), saved.DateOfBirth);
        Assert.Equal("Toronto", saved.City);
        Assert.Equal("123 Test Street", saved.Address);
        Assert.NotNull(saved.UpdatedAt);
    }

    [Fact]
    public async Task UpdateMyProfile_WithFutureDateOfBirth_ReturnsBadRequest()
    {
        await using var factory = new TestWebApplicationFactory();
        using var client = factory.CreateClient();

        var email = $"{Guid.NewGuid():N}@example.com";
        var password = "ProfilePassword!123";
        var user = await factory.SeedUserAsync(email, password, UserRole.Student);
        await factory.SeedStudentProfileAsync(user.Id, studentNumber: "S-123456");
        var token = await TestAuthHelper.LoginAndGetTokenAsync(client, email, password);
        client.SetBearerToken(token);

        var response = await client.PutAsJsonAsync("/api/studentprofiles/me", new UpdateStudentProfileRequest
        {
            DateOfBirth = DateTime.UtcNow.Date.AddDays(1)
        });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task UpdateMyProfile_WithTooLongFirstName_ReturnsBadRequest()
    {
        await using var factory = new TestWebApplicationFactory();
        using var client = factory.CreateClient();

        var email = $"{Guid.NewGuid():N}@example.com";
        var password = "ProfilePassword!123";
        var user = await factory.SeedUserAsync(email, password, UserRole.Student);
        await factory.SeedStudentProfileAsync(user.Id, studentNumber: "S-654321");
        var token = await TestAuthHelper.LoginAndGetTokenAsync(client, email, password);
        client.SetBearerToken(token);

        var response = await client.PutAsJsonAsync("/api/studentprofiles/me", new UpdateStudentProfileRequest
        {
            FirstName = new string('A', 101)
        });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task UpdateMyProfile_WithTooLongCity_ReturnsBadRequest()
    {
        await using var factory = new TestWebApplicationFactory();
        using var client = factory.CreateClient();

        var email = $"{Guid.NewGuid():N}@example.com";
        var password = "ProfilePassword!123";
        var user = await factory.SeedUserAsync(email, password, UserRole.Student);
        await factory.SeedStudentProfileAsync(user.Id, studentNumber: "S-777777");
        var token = await TestAuthHelper.LoginAndGetTokenAsync(client, email, password);
        client.SetBearerToken(token);

        var response = await client.PutAsJsonAsync("/api/studentprofiles/me", new UpdateStudentProfileRequest
        {
            City = new string('C', 101)
        });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }
}
