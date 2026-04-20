using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using DeepwellEducation.Domain.Entities;
using DeepwellEducation.Domain.Enums;
using DeepwellEducation.Services;
using Microsoft.Extensions.Configuration;
using Xunit;

namespace DeepwellEducation.Tests;

public class JwtServiceTests
{
    private const string TestKey = "YourSecretKeyForSigningTokens_MustBeLongEnough_32Chars";

    private static IConfiguration CreateConfig(string? key = TestKey, string issuer = "TestIssuer", string audience = "TestAudience")
    {
        return new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Jwt:Key"] = key,
                ["Jwt:Issuer"] = issuer,
                ["Jwt:Audience"] = audience
            })
            .Build();
    }

    [Fact]
    public void Constructor_WhenJwtKeyMissing_ThrowsInvalidOperationException()
    {
        var empty = new ConfigurationBuilder().AddInMemoryCollection(Array.Empty<KeyValuePair<string, string?>>()).Build();
        Assert.Throws<InvalidOperationException>(() => new JwtService(empty));
    }

    [Fact]
    public void GenerateToken_ContainsNameIdentifierEmailRoleAndPasswordStamp_FromCreatedAtWhenNoPasswordChange()
    {
        var jwt = new JwtService(CreateConfig());
        var created = new DateTime(2025, 6, 1, 12, 0, 0, DateTimeKind.Utc);
        var user = new User
        {
            Id = Guid.Parse("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"),
            Email = "student@example.com",
            UserName = "stu",
            Role = UserRole.Student,
            IsActive = true,
            CreatedAt = created,
            PasswordChangedAt = null
        };

        var token = jwt.GenerateToken(user);
        var jwtToken = new JwtSecurityTokenHandler().ReadJwtToken(token);

        Assert.Equal(user.Id.ToString(), jwtToken.Claims.First(c => c.Type == ClaimTypes.NameIdentifier).Value);
        Assert.Equal("student@example.com", jwtToken.Claims.First(c => c.Type == ClaimTypes.Email).Value);
        Assert.Equal("Student", jwtToken.Claims.First(c => c.Type == ClaimTypes.Role).Value);
        var stamp = jwtToken.Claims.First(c => c.Type == JwtService.PasswordStampClaimType).Value;
        Assert.Equal(created.Ticks.ToString(), stamp);
    }

    [Fact]
    public void GenerateToken_PasswordStampUsesPasswordChangedAtWhenSet()
    {
        var jwt = new JwtService(CreateConfig());
        var created = new DateTime(2025, 1, 1, 0, 0, 0, DateTimeKind.Utc);
        var changed = new DateTime(2025, 3, 15, 8, 30, 0, DateTimeKind.Utc);
        var user = new User
        {
            Id = Guid.NewGuid(),
            Email = "a@b.c",
            UserName = "u",
            Role = UserRole.Admin,
            IsActive = true,
            CreatedAt = created,
            PasswordChangedAt = changed
        };

        var token = jwt.GenerateToken(user);
        var jwtToken = new JwtSecurityTokenHandler().ReadJwtToken(token);
        var stamp = jwtToken.Claims.First(c => c.Type == JwtService.PasswordStampClaimType).Value;
        Assert.Equal(changed.Ticks.ToString(), stamp);
    }

    [Fact]
    public void GenerateToken_IssuerAndAudienceMatchConfiguration()
    {
        var jwt = new JwtService(CreateConfig(issuer: "MyIss", audience: "MyAud"));
        var user = new User
        {
            Id = Guid.NewGuid(),
            Email = "x@y.z",
            UserName = "x",
            Role = UserRole.Visitor,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };

        var token = jwt.GenerateToken(user);
        var jwtToken = new JwtSecurityTokenHandler().ReadJwtToken(token);
        Assert.Equal("MyIss", jwtToken.Issuer);
        Assert.Equal("MyAud", jwtToken.Audiences.First());
    }
}
