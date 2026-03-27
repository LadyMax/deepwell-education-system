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
    public static async Task SeedAsync(IServiceProvider services, CancellationToken cancellationToken = default)
    {
        var env = services.GetRequiredService<IHostEnvironment>();
        if (!env.IsDevelopment())
            return;

        var db = services.GetRequiredService<AppDbContext>();
        var logger = services.GetRequiredService<ILoggerFactory>().CreateLogger(nameof(AdminSeeder));

        await SeedAdminAsync(services, db, logger, cancellationToken);
        await SeedCoursesAsync(db, logger, cancellationToken);
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
            FullName = "Administrator",
            Role = UserRole.Admin,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };
        user.PasswordHash = passwordHasher.HashPassword(user, password);

        db.Users.Add(user);
        await db.SaveChangesAsync(cancellationToken);

        logger.LogInformation("Seeded default admin user {Email} (Development only).", normalizedEmail);
    }

    private static async Task SeedCoursesAsync(AppDbContext db, ILogger logger, CancellationToken cancellationToken)
    {
        var templates = new[]
        {
            new Course
            {
                Name = "Chinese Foundations",
                Description = "Build practical Mandarin for greetings, daily routines, and classroom communication.",
                SubjectCode = "zh",
                SubjectName = "Chinese",
                Level = CourseLevel.Beginner,
                Category = CourseCategory.Language,
                IsActive = true
            },
            new Course
            {
                Name = "English Communication Lab",
                Description = "Strengthen spoken fluency, listening confidence, and real-world vocabulary for study and work.",
                SubjectCode = "en",
                SubjectName = "English",
                Level = CourseLevel.Intermediate,
                Category = CourseCategory.Language,
                IsActive = true
            },
            new Course
            {
                Name = "French Advanced Writing",
                Description = "Refine advanced grammar, essay structure, and argumentation in academic and professional contexts.",
                SubjectCode = "fr",
                SubjectName = "French",
                Level = CourseLevel.Advanced,
                Category = CourseCategory.Language,
                IsActive = true
            },
            new Course
            {
                Name = "Swedish for Everyday Life",
                Description = "Learn practical Swedish for conversations, services, and social situations in Sweden.",
                SubjectCode = "sv",
                SubjectName = "Swedish",
                Level = CourseLevel.Beginner,
                Category = CourseCategory.Language,
                IsActive = true
            },
            new Course
            {
                Name = "Italian Conversation Essentials",
                Description = "Develop practical Italian speaking and listening skills for travel, social life, and everyday communication.",
                SubjectCode = "it",
                SubjectName = "Italian",
                Level = CourseLevel.Beginner,
                Category = CourseCategory.Language,
                IsActive = true
            },
            new Course
            {
                Name = "Japanese Communication Starter",
                Description = "Start speaking and understanding Japanese through structured dialogues and real-life scenarios.",
                SubjectCode = "ja",
                SubjectName = "Japanese",
                Level = CourseLevel.Beginner,
                Category = CourseCategory.Language,
                IsActive = true
            },
            new Course
            {
                Name = "Spanish for Global Communication",
                Description = "Build confidence in Spanish for travel, study, and communication across Spanish-speaking regions.",
                SubjectCode = "es",
                SubjectName = "Spanish",
                Level = CourseLevel.Intermediate,
                Category = CourseCategory.Language,
                IsActive = true
            },
            new Course
            {
                Name = "German Professional Foundations",
                Description = "Learn core German language skills for academic pathways and professional communication in Europe.",
                SubjectCode = "de",
                SubjectName = "German",
                Level = CourseLevel.Intermediate,
                Category = CourseCategory.Language,
                IsActive = true
            }
        };

        var existingCodes = await db.Courses
            .Select(c => c.SubjectCode.ToLower())
            .Distinct()
            .ToListAsync(cancellationToken);
        var existing = new HashSet<string>(existingCodes);

        var toAdd = templates
            .Where(t => !existing.Contains(t.SubjectCode))
            .Select(t => new Course
            {
                Id = Guid.NewGuid(),
                Name = t.Name,
                Description = t.Description,
                SubjectCode = t.SubjectCode,
                SubjectName = t.SubjectName,
                Level = t.Level,
                Category = t.Category,
                IsActive = t.IsActive
            })
            .ToList();

        if (!toAdd.Count.Equals(0))
        {
            await db.Courses.AddRangeAsync(toAdd, cancellationToken);
            await db.SaveChangesAsync(cancellationToken);
            logger.LogInformation("Seeded {Count} missing default language courses (Development only).", toAdd.Count);
        }
    }
}
