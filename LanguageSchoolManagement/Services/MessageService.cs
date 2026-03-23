using LanguageSchoolManagement.Data;
using LanguageSchoolManagement.Domain.Entities;
using LanguageSchoolManagement.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace LanguageSchoolManagement.Services;

public class MessageService : IMessageService
{
    private readonly AppDbContext _db;

    public MessageService(AppDbContext db)
    {
        _db = db;
    }

    public async Task<SendMessageResult> SendAsync(Guid senderUserId, string subject, string content, Guid? receiverUserId, CancellationToken ct = default)
    {
        subject = subject.Trim();
        content = content.Trim();
        if (string.IsNullOrEmpty(subject) || string.IsNullOrEmpty(content))
            return SendMessageResult.Fail(SendMessageError.InvalidPayload);

        var sender = await _db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == senderUserId, ct);
        if (sender == null || !sender.IsActive)
            return SendMessageResult.Fail(SendMessageError.SenderNotFound);

        Guid resolvedReceiverId;
        if (receiverUserId.HasValue)
        {
            var receiver = await _db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == receiverUserId.Value, ct);
            if (receiver == null || !receiver.IsActive)
                return SendMessageResult.Fail(SendMessageError.ReceiverNotFound);
            resolvedReceiverId = receiver.Id;
        }
        else
        {
            var admin = await _db.Users.AsNoTracking()
                .Where(u => u.Role == UserRole.Admin && u.IsActive)
                .OrderBy(u => u.CreatedAt)
                .FirstOrDefaultAsync(ct);
            if (admin == null)
                return SendMessageResult.Fail(SendMessageError.NoAdminAvailable);
            resolvedReceiverId = admin.Id;
        }

        var message = new Message
        {
            Id = Guid.NewGuid(),
            SenderUserId = senderUserId,
            ReceiverUserId = resolvedReceiverId,
            Subject = subject,
            Content = content,
            AiSuggestedCategory = null,
            AiConfidence = null,
            FinalCategory = null,
            ReviewedBy = null,
            ReviewedAt = null,
            CreatedAt = DateTime.UtcNow
        };

        _db.Messages.Add(message);
        await _db.SaveChangesAsync(ct);

        return SendMessageResult.Ok(message);
    }

    public async Task<IReadOnlyList<MessageInboxItemDto>> GetInboxAsync(Guid receiverUserId, CancellationToken ct = default)
    {
        return await (
            from m in _db.Messages.AsNoTracking()
            join s in _db.Users.AsNoTracking() on m.SenderUserId equals s.Id
            where m.ReceiverUserId == receiverUserId
            orderby m.CreatedAt descending
            select new MessageInboxItemDto
            {
                Id = m.Id,
                SenderUserId = m.SenderUserId,
                SenderEmail = s.Email,
                SenderFullName = s.FullName,
                Subject = m.Subject,
                Content = m.Content,
                CreatedAt = m.CreatedAt,
                FinalCategory = m.FinalCategory,
                ReviewedBy = m.ReviewedBy,
                ReviewedAt = m.ReviewedAt
            }).ToListAsync(ct);
    }

    public async Task<CategorizeResult> CategorizeAsync(Guid messageId, Guid adminUserId, MessageCategory finalCategory, CancellationToken ct = default)
    {
        var message = await _db.Messages.FirstOrDefaultAsync(m => m.Id == messageId, ct);
        if (message == null)
            return CategorizeResult.Fail(CategorizeError.NotFound);

        message.FinalCategory = finalCategory;
        message.ReviewedBy = adminUserId;
        message.ReviewedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync(ct);

        return CategorizeResult.Ok(message);
    }

    public async Task<IReadOnlyList<MessageAdminItemDto>> GetAllForAdminAsync(bool uncategorizedOnly, MessageCategory? category, CancellationToken ct = default)
    {
        var query =
            from m in _db.Messages.AsNoTracking()
            join s in _db.Users.AsNoTracking() on m.SenderUserId equals s.Id
            join r in _db.Users.AsNoTracking() on m.ReceiverUserId equals r.Id
            select new { m, s, r };

        if (uncategorizedOnly)
            query = query.Where(x => x.m.FinalCategory == null);
        else if (category.HasValue)
            query = query.Where(x => x.m.FinalCategory == category.Value);

        return await query
            .OrderByDescending(x => x.m.CreatedAt)
            .Select(x => new MessageAdminItemDto
            {
                Id = x.m.Id,
                SenderUserId = x.m.SenderUserId,
                SenderEmail = x.s.Email,
                SenderFullName = x.s.FullName,
                ReceiverUserId = x.m.ReceiverUserId,
                ReceiverEmail = x.r.Email,
                ReceiverFullName = x.r.FullName,
                Subject = x.m.Subject,
                Content = x.m.Content,
                CreatedAt = x.m.CreatedAt,
                FinalCategory = x.m.FinalCategory,
                ReviewedBy = x.m.ReviewedBy,
                ReviewedAt = x.m.ReviewedAt
            })
            .ToListAsync(ct);
    }
}
