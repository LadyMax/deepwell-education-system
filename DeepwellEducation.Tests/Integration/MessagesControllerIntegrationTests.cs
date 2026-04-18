using System.Net;
using System.Net.Http.Json;
using DeepwellEducation.Controllers;
using DeepwellEducation.Data;
using DeepwellEducation.Domain.Enums;
using DeepwellEducation.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace DeepwellEducation.Tests;

public class MessagesControllerIntegrationTests
{
    [Fact]
    public async Task Send_WithoutReceiver_UsesActiveAdminAndReturnsCreated()
    {
        await using var factory = new TestWebApplicationFactory();
        using var client = factory.CreateClient();

        var senderEmail = $"{Guid.NewGuid():N}@example.com";
        var senderPassword = "SenderPassword!123";
        await factory.SeedUserAsync($"{Guid.NewGuid():N}@example.com", "AdminPassword!123", UserRole.Admin);
        await factory.SeedUserAsync(senderEmail, senderPassword, UserRole.Student);

        var token = await TestAuthHelper.LoginAndGetTokenAsync(client, senderEmail, senderPassword);
        client.SetBearerToken(token);

        var response = await client.PostAsJsonAsync("/api/messages", new SendMessageRequest
        {
            Subject = "Need help",
            Content = "Could you assist me?",
            SenderSuggestedCategory = MessageCategory.CourseInquiry
        });

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<SentMessageResponse>();
        Assert.NotNull(body);

        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var receiver = await db.Users.AsNoTracking().SingleAsync(u => u.Id == body!.ReceiverUserId);
        Assert.Equal(UserRole.Admin, receiver.Role);
        Assert.Equal("Need help", body.Subject);
    }

    [Fact]
    public async Task Send_WithEmptySubject_ReturnsBadRequest()
    {
        await using var factory = new TestWebApplicationFactory();
        using var client = factory.CreateClient();

        var senderEmail = $"{Guid.NewGuid():N}@example.com";
        var senderPassword = "SenderPassword!123";
        await factory.SeedUserAsync($"{Guid.NewGuid():N}@example.com", "AdminPassword!123", UserRole.Admin);
        await factory.SeedUserAsync(senderEmail, senderPassword, UserRole.Student);

        var token = await TestAuthHelper.LoginAndGetTokenAsync(client, senderEmail, senderPassword);
        client.SetBearerToken(token);

        var response = await client.PostAsJsonAsync("/api/messages", new SendMessageRequest
        {
            Subject = "   ",
            Content = "Body exists"
        });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Inbox_ReturnsCurrentUsersMessagesInDescendingOrder()
    {
        await using var factory = new TestWebApplicationFactory();
        using var client = factory.CreateClient();

        var receiverEmail = $"{Guid.NewGuid():N}@example.com";
        var receiverPassword = "ReceiverPassword!123";
        var sender = await factory.SeedUserAsync($"{Guid.NewGuid():N}@example.com", "SenderPassword!123", UserRole.Student);
        var receiver = await factory.SeedUserAsync(receiverEmail, receiverPassword, UserRole.Admin);
        var otherReceiver = await factory.SeedUserAsync($"{Guid.NewGuid():N}@example.com", "OtherPassword!123", UserRole.Student);

        await factory.SeedMessageAsync(
            sender.Id,
            receiver.Id,
            subject: "Older",
            createdAt: new DateTime(2025, 1, 1, 0, 0, 0, DateTimeKind.Utc));
        await factory.SeedMessageAsync(
            sender.Id,
            receiver.Id,
            subject: "Newer",
            createdAt: new DateTime(2025, 6, 1, 0, 0, 0, DateTimeKind.Utc));
        await factory.SeedMessageAsync(sender.Id, otherReceiver.Id, subject: "Not my inbox");

        var token = await TestAuthHelper.LoginAndGetTokenAsync(client, receiverEmail, receiverPassword);
        client.SetBearerToken(token);

        var response = await client.GetAsync("/api/messages/inbox?page=1&pageSize=10");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await TestAuthHelper.ReadPagedResultAsync<MessageInboxItemDto>(response);
        Assert.NotNull(body);
        Assert.Equal(2, body!.TotalCount);
        Assert.Equal(2, body.Items.Count);
        Assert.Equal("Newer", body.Items[0].Subject);
        Assert.Equal("Older", body.Items[1].Subject);
    }

    [Fact]
    public async Task InboxUnreadCount_ReturnsNumberOfUnreadReceivedMessages()
    {
        await using var factory = new TestWebApplicationFactory();
        using var client = factory.CreateClient();

        var receiverEmail = $"{Guid.NewGuid():N}@example.com";
        var receiverPassword = "ReceiverPassword!123";
        var sender = await factory.SeedUserAsync($"{Guid.NewGuid():N}@example.com", "SenderPassword!123", UserRole.Student);
        var receiver = await factory.SeedUserAsync(receiverEmail, receiverPassword, UserRole.Admin);

        await factory.SeedMessageAsync(sender.Id, receiver.Id, subject: "First unread");
        await factory.SeedMessageAsync(sender.Id, receiver.Id, subject: "Second unread");

        var token = await TestAuthHelper.LoginAndGetTokenAsync(client, receiverEmail, receiverPassword);
        client.SetBearerToken(token);

        var response = await client.GetAsync("/api/messages/inbox/unread-count");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<InboxUnreadCountResponse>();
        Assert.NotNull(body);
        Assert.Equal(2, body!.Count);
    }

    [Fact]
    public async Task MarkRead_ByNonReceiver_ReturnsForbidden()
    {
        await using var factory = new TestWebApplicationFactory();
        using var client = factory.CreateClient();

        var receiver = await factory.SeedUserAsync($"{Guid.NewGuid():N}@example.com", "ReceiverPassword!123", UserRole.Admin);
        var sender = await factory.SeedUserAsync($"{Guid.NewGuid():N}@example.com", "SenderPassword!123", UserRole.Student);
        var otherUserEmail = $"{Guid.NewGuid():N}@example.com";
        var otherUserPassword = "OtherPassword!123";
        await factory.SeedUserAsync(otherUserEmail, otherUserPassword, UserRole.Student);

        var message = await factory.SeedMessageAsync(sender.Id, receiver.Id, subject: "Read test");

        var token = await TestAuthHelper.LoginAndGetTokenAsync(client, otherUserEmail, otherUserPassword);
        client.SetBearerToken(token);

        var response = await client.PostAsync($"/api/messages/{message.Id}/read", content: null);

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task MarkRead_WhenMessageNotFound_ReturnsNotFound()
    {
        await using var factory = new TestWebApplicationFactory();
        using var client = factory.CreateClient();

        var email = $"{Guid.NewGuid():N}@example.com";
        var password = "ReaderPassword!123";
        await factory.SeedUserAsync(email, password, UserRole.Student);
        var token = await TestAuthHelper.LoginAndGetTokenAsync(client, email, password);
        client.SetBearerToken(token);

        var response = await client.PostAsync($"/api/messages/{Guid.NewGuid()}/read", content: null);

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task AdminList_WithConflictingFilters_ReturnsBadRequest()
    {
        await using var factory = new TestWebApplicationFactory();
        using var client = factory.CreateClient();

        var adminEmail = $"{Guid.NewGuid():N}@example.com";
        var adminPassword = "AdminPassword!123";
        await factory.SeedUserAsync(adminEmail, adminPassword, UserRole.Admin);

        var token = await TestAuthHelper.LoginAndGetTokenAsync(client, adminEmail, adminPassword);
        client.SetBearerToken(token);

        var response = await client.GetAsync("/api/messages/admin?uncategorizedOnly=true&finalCategory=Other");

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task AdminList_UnreadOnly_ReturnsOnlyUnreadMessages()
    {
        await using var factory = new TestWebApplicationFactory();
        using var client = factory.CreateClient();

        var adminEmail = $"{Guid.NewGuid():N}@example.com";
        var adminPassword = "AdminPassword!123";
        var sender = await factory.SeedUserAsync($"{Guid.NewGuid():N}@example.com", "SenderPassword!123", UserRole.Student);
        var admin = await factory.SeedUserAsync(adminEmail, adminPassword, UserRole.Admin);

        var unread = await factory.SeedMessageAsync(sender.Id, admin.Id, subject: "Unread message");
        var read = await factory.SeedMessageAsync(sender.Id, admin.Id, subject: "Read message");
        _ = unread;

        using (var scope = factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var readMsg = await db.Messages.SingleAsync(m => m.Id == read.Id);
            readMsg.ReadAt = DateTime.UtcNow;
            await db.SaveChangesAsync();
        }

        var token = await TestAuthHelper.LoginAndGetTokenAsync(client, adminEmail, adminPassword);
        client.SetBearerToken(token);

        var response = await client.GetAsync("/api/messages/admin?unreadOnly=true&page=1&pageSize=50");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await TestAuthHelper.ReadPagedResultAsync<MessageAdminItemDto>(response);
        Assert.NotNull(body);
        Assert.Single(body!.Items);
        Assert.Equal("Unread message", body.Items[0].Subject);
    }

    [Fact]
    public async Task Categorize_AsAdmin_UpdatesFinalCategoryAndReviewMetadata()
    {
        await using var factory = new TestWebApplicationFactory();
        using var client = factory.CreateClient();

        var adminEmail = $"{Guid.NewGuid():N}@example.com";
        var adminPassword = "AdminPassword!123";
        var sender = await factory.SeedUserAsync($"{Guid.NewGuid():N}@example.com", "SenderPassword!123", UserRole.Student);
        var admin = await factory.SeedUserAsync(adminEmail, adminPassword, UserRole.Admin);
        var message = await factory.SeedMessageAsync(sender.Id, admin.Id, subject: "Categorize me");

        var token = await TestAuthHelper.LoginAndGetTokenAsync(client, adminEmail, adminPassword);
        client.SetBearerToken(token);

        var response = await client.PostAsJsonAsync($"/api/messages/{message.Id}/categorize", new CategorizeMessageRequest
        {
            FinalCategory = MessageCategory.Complaint
        });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<CategorizedMessageResponse>();
        Assert.NotNull(body);
        Assert.Equal(message.Id, body!.Id);
        Assert.Equal(MessageCategory.Complaint, body.FinalCategory);
        Assert.Equal(admin.Id, body.ReviewedBy);

        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var saved = await db.Messages.AsNoTracking().SingleAsync(m => m.Id == message.Id);
        Assert.Equal(MessageCategory.Complaint, saved.FinalCategory);
        Assert.Equal(admin.Id, saved.ReviewedBy);
        Assert.NotNull(saved.ReviewedAt);
    }

    [Fact]
    public async Task Categorize_WhenMessageNotFound_ReturnsNotFound()
    {
        await using var factory = new TestWebApplicationFactory();
        using var client = factory.CreateClient();

        var adminEmail = $"{Guid.NewGuid():N}@example.com";
        var adminPassword = "AdminPassword!123";
        await factory.SeedUserAsync(adminEmail, adminPassword, UserRole.Admin);
        var token = await TestAuthHelper.LoginAndGetTokenAsync(client, adminEmail, adminPassword);
        client.SetBearerToken(token);

        var response = await client.PostAsJsonAsync($"/api/messages/{Guid.NewGuid()}/categorize", new CategorizeMessageRequest
        {
            FinalCategory = MessageCategory.Other
        });

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }
}
