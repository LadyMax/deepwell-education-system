using DeepwellEducation.Domain.Entities;
using DeepwellEducation.Domain.Enums;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace DeepwellEducation.Data;

/// <summary>
/// Seeds a default Admin from configuration <c>SeedAdmin</c> in <b>Development only</b>.
/// Production: this type does nothing (see <see cref="SeedAsync"/>). Credentials belong in appsettings.Development.json or User Secrets — never for production use.
/// </summary>
public static class AdminSeeder
{
    /// <summary>
    /// Eight school languages: <see cref="Course.LanguageCode"/> (lowercase) and English <see cref="Course.LanguageName"/>.
    /// Matches the public catalog labels so admin “Language label” and API data stay aligned without extra UI mapping.
    /// </summary>
    private static readonly (string Code, string EnglishName)[] SchoolLanguages =
    {
        ("zh", "Chinese"),
        ("en", "English"),
        ("fr", "French"),
        ("sv", "Swedish"),
        ("it", "Italian"),
        ("ja", "Japanese"),
        ("es", "Spanish"),
        ("de", "German")
    };

    private static readonly CourseLevel[] Levels =
    {
        CourseLevel.Beginner,
        CourseLevel.Intermediate,
        CourseLevel.Advanced
    };

    public static async Task SeedAsync(IServiceProvider services, CancellationToken cancellationToken = default)
    {
        var env = services.GetRequiredService<IHostEnvironment>();
        if (!env.IsDevelopment())
            return;

        var db = services.GetRequiredService<AppDbContext>();
        var logger = services.GetRequiredService<ILoggerFactory>().CreateLogger(nameof(AdminSeeder));

        await SeedAdminAsync(services, db, logger, cancellationToken);
        await SeedCoursesAsync(db, logger, cancellationToken);
        await NormalizeSchoolCourseLanguageLabelsAsync(db, logger, cancellationToken);
    }

    private static async Task SeedAdminAsync(
        IServiceProvider services,
        AppDbContext db,
        ILogger logger,
        CancellationToken cancellationToken)
    {
        if (await db.Users.AnyAsync(u => u.Role == UserRole.Admin, cancellationToken))
            return;

        var configuration = services.GetRequiredService<IConfiguration>();
        var email = configuration["SeedAdmin:Email"]?.Trim();
        var password = configuration["SeedAdmin:Password"];

        if (string.IsNullOrWhiteSpace(email) || string.IsNullOrWhiteSpace(password))
        {
            logger.LogWarning(
                "No admin in database and SeedAdmin:Email/Password are not set. Skipping admin seed. Add SeedAdmin to appsettings.Development.json for local Swagger testing.");
            return;
        }

        var normalizedEmail = email.ToLowerInvariant();
        if (await db.Users.AnyAsync(u => u.Email == normalizedEmail, cancellationToken))
        {
            logger.LogWarning(
                "No admin role user found, but SeedAdmin email {Email} is already registered. Skipping seed to avoid overwriting.",
                normalizedEmail);
            return;
        }

        var passwordHasher = services.GetRequiredService<IPasswordHasher<User>>();
        var user = new User
        {
            Id = Guid.NewGuid(),
            Email = normalizedEmail,
            UserName = "Administrator",
            Role = UserRole.Admin,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };
        user.PasswordHash = passwordHasher.HashPassword(user, password);

        db.Users.Add(user);
        await db.SaveChangesAsync(cancellationToken);

        logger.LogInformation("Seeded default admin user {Email} (Development only).", normalizedEmail);
    }

    private static string LevelWord(CourseLevel level) => level switch
    {
        CourseLevel.Beginner => "Beginner",
        CourseLevel.Intermediate => "Intermediate",
        CourseLevel.Advanced => "Advanced",
        _ => "Beginner"
    };

    private static string BuildDescription(string nameEn, CourseLevel level) => level switch
    {
        CourseLevel.Beginner =>
            $"Foundational {nameEn}: everyday communication, essential patterns, and classroom confidence.",
        CourseLevel.Intermediate =>
            $"Intermediate {nameEn}: stronger fluency, longer conversations, and clearer accuracy.",
        CourseLevel.Advanced =>
            $"Advanced {nameEn}: nuanced expression, complex texts, and near-fluent real-world use.",
        _ => ""
    };

    private static async Task SeedCoursesAsync(AppDbContext db, ILogger logger, CancellationToken cancellationToken)
    {
        var existingKeys = await db.Courses
            .Select(c => c.LanguageCode.ToLower() + ":" + (int)c.Level)
            .ToListAsync(cancellationToken);
        var have = existingKeys.ToHashSet();

        var toAdd = new List<Course>();
        foreach (var (code, englishName) in SchoolLanguages)
        {
            var codeNorm = code.ToLowerInvariant();
            foreach (var level in Levels)
            {
                var key = codeNorm + ":" + (int)level;
                if (have.Contains(key))
                    continue;

                toAdd.Add(new Course
                {
                    Id = Guid.NewGuid(),
                    Name = $"{englishName} {LevelWord(level)}",
                    Description = BuildDescription(englishName, level),
                    LanguageCode = codeNorm,
                    LanguageName = englishName,
                    Level = level,
                    Category = CourseCategory.Language,
                    IsActive = true
                });
                have.Add(key);
            }
        }

        if (toAdd.Count == 0)
            return;

        await db.Courses.AddRangeAsync(toAdd, cancellationToken);
        await db.SaveChangesAsync(cancellationToken);
        logger.LogInformation("Seeded {Count} missing language × level courses (Development only).", toAdd.Count);
    }

    /// <summary>
    /// Aligns <see cref="Course.LanguageName"/> with <see cref="Course.LanguageCode"/> for the eight school languages
    /// (fixes older dev DB rows, e.g. endonyms left from earlier seeds).
    /// </summary>
    private static async Task NormalizeSchoolCourseLanguageLabelsAsync(
        AppDbContext db,
        ILogger logger,
        CancellationToken cancellationToken)
    {
        var codeToName = SchoolLanguages.ToDictionary(
            x => x.Code.ToLowerInvariant(),
            x => x.EnglishName,
            StringComparer.Ordinal);

        var courses = await db.Courses.ToListAsync(cancellationToken);
        var changed = 0;
        foreach (var c in courses)
        {
            var key = c.LanguageCode?.ToLowerInvariant();
            if (key == null || !codeToName.TryGetValue(key, out var expected))
                continue;
            if (string.Equals(c.LanguageName, expected, StringComparison.Ordinal))
                continue;
            c.LanguageName = expected;
            changed++;
        }

        if (changed == 0)
            return;

        await db.SaveChangesAsync(cancellationToken);
        logger.LogInformation(
            "Normalized LanguageName for {Count} school course(s) to match languageCode (Development only).",
            changed);
    }
}
