using LanguageSchoolManagement.Data;
using LanguageSchoolManagement.Domain.Entities;
using LanguageSchoolManagement.Domain.Enums;
using LanguageSchoolManagement.Services;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace LanguageSchoolManagement.Tests;

public class MessageServiceTests : IAsyncLifetime
{
    private SqliteConnection _connection = null!;
    private AppDbContext _db = null!;
    private MessageService _sut = null!;

    public async Task InitializeAsync()
    {
        _connection = new SqliteConnection("DataSource=:memory:");
        await _connection.OpenAsync();

        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseSqlite(_connection)
            .Options;

        _db = new AppDbContext(options);
        await _db.Database.EnsureCreatedAsync();
        _sut = new MessageService(_db);
    }

    public async Task DisposeAsync()
    {
        await _db.DisposeAsync();
        await _connection.DisposeAsync();
    }

    [Fact]
    public async Task SendAsync_WithoutReceiver_UsesFirstActiveAdmin()
    {
        var adminId = Guid.NewGuid();
        var senderId = Guid.NewGuid();
        _db.Users.AddRange(
            new User
            {
                Id = adminId,
                Email = "admin@test",
                PasswordHash = "x",
                FullName = "Admin",
                Role = UserRole.Admin,
                IsActive = true,
                CreatedAt = DateTime.UtcNow.AddDays(-1)
            },
            new User
            {
                Id = senderId,
                Email = "user@test",
                PasswordHash = "x",
                FullName = "User",
                Role = UserRole.Student,
                IsActive = true
            });
        await _db.SaveChangesAsync();

        var result = await _sut.SendAsync(senderId, "Hi", "Body", receiverUserId: null);

        Assert.Equal(SendMessageError.None, result.Error);
        Assert.NotNull(result.Message);
        Assert.Equal(adminId, result.Message!.ReceiverUserId);
        Assert.Null(result.Message.FinalCategory);
        Assert.Null(result.Message.ReviewedBy);
    }

    [Fact]
    public async Task GetInboxAsync_OrdersByCreatedAtDescending()
    {
        var receiverId = Guid.NewGuid();
        var senderId = Guid.NewGuid();
        _db.Users.AddRange(
            new User { Id = receiverId, Email = "r@test", PasswordHash = "x", FullName = "R", Role = UserRole.Admin, IsActive = true },
            new User { Id = senderId, Email = "s@test", PasswordHash = "x", FullName = "S", Role = UserRole.Student, IsActive = true });

        var older = Guid.NewGuid();
        var newer = Guid.NewGuid();
        _db.Messages.AddRange(
            new Message
            {
                Id = older,
                SenderUserId = senderId,
                ReceiverUserId = receiverId,
                Subject = "Old",
                Content = "A",
                CreatedAt = new DateTime(2025, 1, 1, 0, 0, 0, DateTimeKind.Utc)
            },
            new Message
            {
                Id = newer,
                SenderUserId = senderId,
                ReceiverUserId = receiverId,
                Subject = "New",
                Content = "B",
                CreatedAt = new DateTime(2025, 6, 1, 0, 0, 0, DateTimeKind.Utc)
            });
        await _db.SaveChangesAsync();

        var inbox = await _sut.GetInboxAsync(receiverId);

        Assert.Equal(2, inbox.Count);
        Assert.Equal(newer, inbox[0].Id);
        Assert.Equal(older, inbox[1].Id);
    }

    [Fact]
    public async Task CategorizeAsync_SetsFinalCategoryReviewedByAndReviewedAt()
    {
        var adminId = Guid.NewGuid();
        var senderId = Guid.NewGuid();
        _db.Users.AddRange(
            new User { Id = adminId, Email = "a@test", PasswordHash = "x", FullName = "A", Role = UserRole.Admin, IsActive = true },
            new User { Id = senderId, Email = "s2@test", PasswordHash = "x", FullName = "S", Role = UserRole.Student, IsActive = true });

        var msgId = Guid.NewGuid();
        _db.Messages.Add(new Message
        {
            Id = msgId,
            SenderUserId = senderId,
            ReceiverUserId = adminId,
            Subject = "Q",
            Content = "C",
            CreatedAt = DateTime.UtcNow
        });
        await _db.SaveChangesAsync();

        var before = DateTime.UtcNow.AddSeconds(-2);
        var result = await _sut.CategorizeAsync(msgId, adminId, MessageCategory.CourseInquiry);
        var after = DateTime.UtcNow.AddSeconds(2);

        Assert.Equal(CategorizeError.None, result.Error);
        Assert.NotNull(result.Message);
        Assert.Equal(MessageCategory.CourseInquiry, result.Message!.FinalCategory);
        Assert.Equal(adminId, result.Message.ReviewedBy);
        Assert.NotNull(result.Message.ReviewedAt);
        Assert.InRange(result.Message.ReviewedAt!.Value, before, after);
    }
}
