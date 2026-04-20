using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using DeepwellEducation.Controllers;
using DeepwellEducation.Domain.Enums;
using Xunit;

namespace DeepwellEducation.Tests;

public class CoursesControllerIntegrationTests
{
    /// <summary>Startup seeds the catalog; use a unique name prefix so assertions ignore those rows.</summary>
    private static string CourseMarker() => "itest-" + Guid.NewGuid().ToString("N");

    [Fact]
    public async Task GetAll_Anonymous_ReturnsOnlyActiveCourses_OrderedByLanguageCodeLevelName()
    {
        await using var factory = new TestWebApplicationFactory();
        using var client = factory.CreateClient();

        var m = CourseMarker();
        await factory.SeedCourseAsync(name: $"{m}-Zebra", languageCode: "es", languageName: "Spanish", level: CourseLevel.Intermediate);
        await factory.SeedCourseAsync(name: $"{m}-Alpha", languageCode: "en", languageName: "English", level: CourseLevel.Beginner);
        await factory.SeedCourseAsync(name: $"{m}-Hidden", languageCode: "fr", isActive: false);

        var response = await client.GetAsync("/api/courses");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var list = await response.Content.ReadFromJsonAsync<List<CourseDto>>();
        Assert.NotNull(list);
        var ours = list!
            .Where(c => c.Name.StartsWith(m + "-", StringComparison.Ordinal))
            .Where(c => c.IsActive)
            .OrderBy(c => c.LanguageCode)
            .ThenBy(c => c.Level)
            .ThenBy(c => c.Name)
            .ToList();
        Assert.Equal(2, ours.Count);
        Assert.Equal($"{m}-Alpha", ours[0].Name);
        Assert.Equal($"{m}-Zebra", ours[1].Name);
    }

    [Fact]
    public async Task GetById_Anonymous_WhenActive_ReturnsOk()
    {
        await using var factory = new TestWebApplicationFactory();
        using var client = factory.CreateClient();

        var course = await factory.SeedCourseAsync(name: "Detail Course");

        var response = await client.GetAsync($"/api/courses/{course.Id}");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var dto = await response.Content.ReadFromJsonAsync<CourseDto>();
        Assert.NotNull(dto);
        Assert.Equal(course.Id, dto!.Id);
        Assert.Equal("Detail Course", dto.Name);
    }

    [Fact]
    public async Task GetById_Anonymous_WhenInactive_ReturnsNotFound()
    {
        await using var factory = new TestWebApplicationFactory();
        using var client = factory.CreateClient();

        var course = await factory.SeedCourseAsync(name: "Inactive", isActive: false);

        var response = await client.GetAsync($"/api/courses/{course.Id}");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task GetAdminList_AsAdmin_DefaultExcludesInactive()
    {
        await using var factory = new TestWebApplicationFactory();
        using var client = factory.CreateClient();

        var adminEmail = $"{Guid.NewGuid():N}@example.com";
        await factory.SeedUserAsync(adminEmail, "AdminPassword!123", UserRole.Admin);
        var m = CourseMarker();
        await factory.SeedCourseAsync(name: $"{m}-ActiveA");
        await factory.SeedCourseAsync(name: $"{m}-InactiveB", isActive: false);

        var token = await TestAuthHelper.LoginAndGetTokenAsync(client, adminEmail, "AdminPassword!123");
        client.SetBearerToken(token);

        var response = await client.GetAsync("/api/courses/admin");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var list = await response.Content.ReadFromJsonAsync<List<CourseDto>>();
        Assert.NotNull(list);
        var ours = list!.Where(c => c.Name.StartsWith(m + "-", StringComparison.Ordinal)).ToList();
        Assert.Single(ours);
        Assert.Equal($"{m}-ActiveA", ours[0].Name);
    }

    [Fact]
    public async Task GetAdminList_AsAdmin_WhenIncludeInactive_ReturnsAll()
    {
        await using var factory = new TestWebApplicationFactory();
        using var client = factory.CreateClient();

        var adminEmail = $"{Guid.NewGuid():N}@example.com";
        await factory.SeedUserAsync(adminEmail, "AdminPassword!123", UserRole.Admin);
        var m = CourseMarker();
        await factory.SeedCourseAsync(name: $"{m}-On");
        await factory.SeedCourseAsync(name: $"{m}-Off", isActive: false);

        var token = await TestAuthHelper.LoginAndGetTokenAsync(client, adminEmail, "AdminPassword!123");
        client.SetBearerToken(token);

        var response = await client.GetAsync("/api/courses/admin?includeInactive=true");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var list = await response.Content.ReadFromJsonAsync<List<CourseDto>>();
        Assert.NotNull(list);
        var ours = list!.Where(c => c.Name.StartsWith(m + "-", StringComparison.Ordinal)).ToList();
        Assert.Equal(2, ours.Count);
    }

    [Fact]
    public async Task GetAdminList_AsStudent_ReturnsForbidden()
    {
        await using var factory = new TestWebApplicationFactory();
        using var client = factory.CreateClient();

        var email = $"{Guid.NewGuid():N}@example.com";
        await factory.SeedUserAsync(email, "StudentPassword!123", UserRole.Student);
        var token = await TestAuthHelper.LoginAndGetTokenAsync(client, email, "StudentPassword!123");
        client.SetBearerToken(token);

        var response = await client.GetAsync("/api/courses/admin");

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task Create_AsAdmin_ValidRequest_ReturnsCreatedWithLocation()
    {
        await using var factory = new TestWebApplicationFactory();
        using var client = factory.CreateClient();

        var adminEmail = $"{Guid.NewGuid():N}@example.com";
        await factory.SeedUserAsync(adminEmail, "AdminPassword!123", UserRole.Admin);
        var token = await TestAuthHelper.LoginAndGetTokenAsync(client, adminEmail, "AdminPassword!123");
        client.SetBearerToken(token);

        var response = await client.PostAsJsonAsync("/api/courses", new CreateCourseRequest
        {
            Name = "  New Spanish  ",
            Description = "Desc",
            LanguageCode = "es",
            LanguageName = "Spanish",
            Level = CourseLevel.Beginner,
            Category = CourseCategory.Language
        });

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var dto = await response.Content.ReadFromJsonAsync<CourseDto>();
        Assert.NotNull(dto);
        Assert.Equal("New Spanish", dto!.Name);
        Assert.NotEqual(Guid.Empty, dto.Id);
        Assert.True(response.Headers.Location?.ToString().Contains(dto.Id.ToString()) == true);
    }

    [Fact]
    public async Task Create_AsAdmin_EmptyName_ReturnsBadRequest()
    {
        await using var factory = new TestWebApplicationFactory();
        using var client = factory.CreateClient();

        var adminEmail = $"{Guid.NewGuid():N}@example.com";
        await factory.SeedUserAsync(adminEmail, "AdminPassword!123", UserRole.Admin);
        var token = await TestAuthHelper.LoginAndGetTokenAsync(client, adminEmail, "AdminPassword!123");
        client.SetBearerToken(token);

        var response = await client.PostAsJsonAsync("/api/courses", new CreateCourseRequest
        {
            Name = "   ",
            Level = CourseLevel.Beginner
        });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Create_AsAdmin_InvalidCategory_ReturnsBadRequest()
    {
        await using var factory = new TestWebApplicationFactory();
        using var client = factory.CreateClient();

        var adminEmail = $"{Guid.NewGuid():N}@example.com";
        await factory.SeedUserAsync(adminEmail, "AdminPassword!123", UserRole.Admin);
        var token = await TestAuthHelper.LoginAndGetTokenAsync(client, adminEmail, "AdminPassword!123");
        client.SetBearerToken(token);

        var payload = JsonSerializer.Serialize(new { name = "Bad Cat", category = 999, level = 0 });
        using var content = new StringContent(payload, System.Text.Encoding.UTF8, "application/json");
        var response = await client.PostAsync("/api/courses", content);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Update_AsAdmin_UpdatesFields()
    {
        await using var factory = new TestWebApplicationFactory();
        using var client = factory.CreateClient();

        var adminEmail = $"{Guid.NewGuid():N}@example.com";
        await factory.SeedUserAsync(adminEmail, "AdminPassword!123", UserRole.Admin);
        var course = await factory.SeedCourseAsync(name: "Old Name");

        var token = await TestAuthHelper.LoginAndGetTokenAsync(client, adminEmail, "AdminPassword!123");
        client.SetBearerToken(token);

        var response = await client.PutAsJsonAsync($"/api/courses/{course.Id}", new UpdateCourseRequest
        {
            Name = "New Name",
            Description = "D2",
            LanguageCode = "de",
            LanguageName = "German",
            Level = CourseLevel.Advanced,
            Category = CourseCategory.Language
        });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var dto = await response.Content.ReadFromJsonAsync<CourseDto>();
        Assert.NotNull(dto);
        Assert.Equal("New Name", dto!.Name);
        Assert.Equal("D2", dto.Description);
        Assert.Equal("de", dto.LanguageCode);
        Assert.Equal(CourseLevel.Advanced, dto.Level);
    }

    [Fact]
    public async Task Update_AsAdmin_WhenCourseMissing_ReturnsNotFound()
    {
        await using var factory = new TestWebApplicationFactory();
        using var client = factory.CreateClient();

        var adminEmail = $"{Guid.NewGuid():N}@example.com";
        await factory.SeedUserAsync(adminEmail, "AdminPassword!123", UserRole.Admin);
        var token = await TestAuthHelper.LoginAndGetTokenAsync(client, adminEmail, "AdminPassword!123");
        client.SetBearerToken(token);

        var response = await client.PutAsJsonAsync($"/api/courses/{Guid.NewGuid()}", new UpdateCourseRequest
        {
            Name = "X",
            Level = CourseLevel.Beginner
        });

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task SetActive_AsAdmin_CanReactivate()
    {
        await using var factory = new TestWebApplicationFactory();
        using var client = factory.CreateClient();

        var adminEmail = $"{Guid.NewGuid():N}@example.com";
        await factory.SeedUserAsync(adminEmail, "AdminPassword!123", UserRole.Admin);
        var course = await factory.SeedCourseAsync(name: "Reopen", isActive: false);

        var token = await TestAuthHelper.LoginAndGetTokenAsync(client, adminEmail, "AdminPassword!123");
        client.SetBearerToken(token);

        var response = await client.PatchAsJsonAsync($"/api/courses/{course.Id}/active", new SetCourseActiveRequest { IsActive = true });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var dto = await response.Content.ReadFromJsonAsync<CourseDto>();
        Assert.NotNull(dto);
        Assert.True(dto!.IsActive);
    }

    [Fact]
    public async Task SoftDelete_AsAdmin_HidesFromPublicCatalog()
    {
        await using var factory = new TestWebApplicationFactory();
        using var client = factory.CreateClient();

        var adminEmail = $"{Guid.NewGuid():N}@example.com";
        await factory.SeedUserAsync(adminEmail, "AdminPassword!123", UserRole.Admin);
        var course = await factory.SeedCourseAsync(name: "To Remove");

        var token = await TestAuthHelper.LoginAndGetTokenAsync(client, adminEmail, "AdminPassword!123");
        client.SetBearerToken(token);

        var deleteResponse = await client.DeleteAsync($"/api/courses/{course.Id}");
        Assert.Equal(HttpStatusCode.NoContent, deleteResponse.StatusCode);

        client.DefaultRequestHeaders.Authorization = null;
        var getResponse = await client.GetAsync($"/api/courses/{course.Id}");
        Assert.Equal(HttpStatusCode.NotFound, getResponse.StatusCode);
    }
}
