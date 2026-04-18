using DeepwellEducation.Data;
using DeepwellEducation.Domain.Entities;
using DeepwellEducation.Domain.Enums;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace DeepwellEducation.Tests;

public class MessageAiAssistBackfillTests : IAsyncLifetime
{
    private SqliteConnection _connection = null!;
    private AppDbContext _db = null!;

    public async Task InitializeAsync()
    {
        _connection = new SqliteConnection("DataSource=:memory:");
        await _connection.OpenAsync();
        _db = new AppDbContext(
            new DbContextOptionsBuilder<AppDbContext>().UseSqlite(_connection).Options);
        await _db.Database.EnsureCreatedAsync();
    }

    public async Task DisposeAsync()
    {
        await _db.DisposeAsync();
        await _connection.DisposeAsync();
    }

    [Fact]
    public async Task ApplyIfNeededAsync_SetsPriorityNormalAndModelRuleV1_WhenPartialAiRow()
    {
        var adminId = Guid.NewGuid();
        var studentId = Guid.NewGuid();
        _db.Users.AddRange(
            new User
            {
                Id = adminId,
                Email = "a-backfill@test",
                PasswordHash = "x",
                UserName = "AdminBf",
                Role = UserRole.Admin,
                IsActive = true
            },
            new User
            {
                Id = studentId,
                Email = "s-backfill@test",
                PasswordHash = "x",
                UserName = "StudentBf",
                Role = UserRole.Student,
                IsActive = true
            });

        var msgId = Guid.NewGuid();
        _db.Messages.Add(new Message
        {
            Id = msgId,
            SenderUserId = studentId,
            ReceiverUserId = adminId,
            Subject = "Q",
            Content = "Body",
            AiSuggestedCategory = "general_question",
            AiConfidence = 0.6,
            AiModelVersion = "unknown",
            AiClassifiedAtUtc = DateTime.UtcNow,
            CreatedAt = DateTime.UtcNow
        });
        await _db.SaveChangesAsync();

        await MessageAiAssistBackfill.ApplyIfNeededAsync(_db);

        var row = await _db.Messages.AsNoTracking().SingleAsync(m => m.Id == msgId);
        Assert.Equal("normal", row.AiSuggestedPriority);
        Assert.Equal("rule_v1", row.AiModelVersion);
    }
}
