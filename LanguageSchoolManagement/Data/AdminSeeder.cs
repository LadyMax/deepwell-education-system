using LanguageSchoolManagement.Domain.Entities;
using LanguageSchoolManagement.Domain.Enums;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace LanguageSchoolManagement.Data;

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
        if (await db.Users.AnyAsync(u => u.Role == UserRole.Admin, cancellationToken))
            return;

        var configuration = services.GetRequiredService<IConfiguration>();
        var email = configuration["SeedAdmin:Email"]?.Trim();
        var password = configuration["SeedAdmin:Password"];

        var logger = services.GetRequiredService<ILoggerFactory>().CreateLogger(nameof(AdminSeeder));

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
}
