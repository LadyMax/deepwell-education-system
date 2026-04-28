using DeepwellEducation.Data;
using DeepwellEducation.Domain.Entities;
using DeepwellEducation.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace DeepwellEducation.Services;

/// <summary>
/// Messaging: <see cref="Message.SenderSuggestedCategory"/> is set at send; <see cref="Message.AiSuggestedCategory"/> /
/// <see cref="Message.AiConfidence"/> are AI-assist metadata only; <see cref="Message.FinalCategory"/> is staff-confirmed.
/// </summary>
public class MessageService : IMessageService
{
    public const int DefaultPageSize = 20;
    public const int MaxPageSize = 100;

    /// <summary>OWASP-style input bounds; SQLite TEXT is unbounded without explicit limits.</summary>
    public const int MaxSubjectLength = 200;

    public const int MaxContentLength = 12000;

    private readonly AppDbContext _db;
    private readonly IAiMessageClassifier _aiMessageClassifier;

    public MessageService(AppDbContext db, IAiMessageClassifier aiMessageClassifier)
    {
        _db = db;
        _aiMessageClassifier = aiMessageClassifier;
    }

    private static (int page, int pageSize) NormalizePaging(int page, int pageSize)
    {
        var p = page < 1 ? 1 : page;
        var s = pageSize < 1 ? DefaultPageSize : pageSize > MaxPageSize ? MaxPageSize : pageSize;
        return (p, s);
    }

    public async Task<SendMessageResult> SendAsync(
        Guid senderUserId,
        string subject,
        string content,
        Guid? receiverUserId,
        MessageCategory? senderSuggestedCategory,
        CancellationToken ct = default)
    {
        subject = subject.Trim();
        content = content.Trim();
        if (string.IsNullOrEmpty(subject) || string.IsNullOrEmpty(content))
            return SendMessageResult.Fail(SendMessageError.InvalidPayload);

        if (subject.Length > MaxSubjectLength || content.Length > MaxContentLength)
            return SendMessageResult.Fail(SendMessageError.PayloadTooLarge);

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
            SenderSuggestedCategory = senderSuggestedCategory,
            AiSuggestedCategory = null,
            AiConfidence = null,
            AiModelVersion = null,
            AiClassifiedAtUtc = null,
            AiSuggestedPriority = null,
            AiSummary = null,
            AiSuggestedReplyDraft = null,
            AiExtractedJson = null,
            FinalCategory = null,
            ReviewedBy = null,
            ReviewedAt = null,
            ReadAt = null,
            CreatedAt = DateTime.UtcNow
        };

        _db.Messages.Add(message);
        await _db.SaveChangesAsync(ct);

        // AI is best-effort enrichment: do not block primary send flow.
        var ai = await _aiMessageClassifier.ClassifyAsync(
            message.Id,
            message.Subject,
            message.Content,
            sender.Role.ToString().ToLowerInvariant(),
            "web_portal",
            ct);
        if (ai != null)
        {
            message.AiSuggestedCategory = ai.Category;
            message.AiConfidence = ai.Confidence;
            message.AiModelVersion = ai.ModelVersion;
            message.AiClassifiedAtUtc = ai.ClassifiedAtUtc;
            message.AiSuggestedPriority = ai.SuggestedPriority;
            message.AiSummary = ai.Summary;
            message.AiSuggestedReplyDraft = ai.SuggestedReplyDraft;
            message.AiExtractedJson = ai.ExtractedJson;
            await _db.SaveChangesAsync(ct);
        }

        return SendMessageResult.Ok(message);
    }

    public Task<int> GetUnreadInboxCountAsync(Guid receiverUserId, CancellationToken ct = default) =>
        _db.Messages.AsNoTracking()
            .CountAsync(m => m.ReceiverUserId == receiverUserId && m.ReadAt == null, ct);

    public async Task<PagedResult<MessageInboxItemDto>> GetInboxAsync(Guid receiverUserId, int page, int pageSize, CancellationToken ct = default)
    {
        (page, pageSize) = NormalizePaging(page, pageSize);

        var baseQ =
            from m in _db.Messages.AsNoTracking()
            where m.ReceiverUserId == receiverUserId
            join s in _db.Users.AsNoTracking() on m.SenderUserId equals s.Id
            orderby m.CreatedAt descending
            select new MessageInboxItemDto
            {
                Id = m.Id,
                SenderUserId = m.SenderUserId,
                SenderEmail = s.Email,
                SenderUserName = s.UserName,
                Subject = m.Subject,
                Content = m.Content,
                CreatedAt = m.CreatedAt,
                ReadAt = m.ReadAt,
                SenderSuggestedCategory = m.SenderSuggestedCategory,
                FinalCategory = m.FinalCategory,
                ReviewedBy = m.ReviewedBy,
                ReviewedAt = m.ReviewedAt
            };

        var total = await baseQ.CountAsync(ct);
        var items = await baseQ.Skip((page - 1) * pageSize).Take(pageSize).ToListAsync(ct);

        return new PagedResult<MessageInboxItemDto>
        {
            Items = items,
            Page = page,
            PageSize = pageSize,
            TotalCount = total
        };
    }

    public async Task<PagedResult<MessageSentItemDto>> GetSentAsync(Guid senderUserId, int page, int pageSize, CancellationToken ct = default)
    {
        (page, pageSize) = NormalizePaging(page, pageSize);

        var baseQ =
            from m in _db.Messages.AsNoTracking()
            where m.SenderUserId == senderUserId
            join r in _db.Users.AsNoTracking() on m.ReceiverUserId equals r.Id
            orderby m.CreatedAt descending
            select new MessageSentItemDto
            {
                Id = m.Id,
                ReceiverUserId = m.ReceiverUserId,
                ReceiverEmail = r.Email,
                ReceiverUserName = r.UserName,
                Subject = m.Subject,
                Content = m.Content,
                CreatedAt = m.CreatedAt,
                ReadAt = m.ReadAt,
                SenderSuggestedCategory = m.SenderSuggestedCategory,
                FinalCategory = m.FinalCategory
            };

        var total = await baseQ.CountAsync(ct);
        var items = await baseQ.Skip((page - 1) * pageSize).Take(pageSize).ToListAsync(ct);

        return new PagedResult<MessageSentItemDto>
        {
            Items = items,
            Page = page,
            PageSize = pageSize,
            TotalCount = total
        };
    }

    public async Task<MarkReadResult> MarkAsReadAsync(Guid messageId, Guid receiverUserId, CancellationToken ct = default)
    {
        var message = await _db.Messages.FirstOrDefaultAsync(m => m.Id == messageId, ct);
        if (message == null)
            return MarkReadResult.Fail(MarkReadError.NotFound);

        if (message.ReceiverUserId != receiverUserId)
            return MarkReadResult.Fail(MarkReadError.NotReceiver);

        if (message.ReadAt == null)
        {
            message.ReadAt = DateTime.UtcNow;
            await _db.SaveChangesAsync(ct);
        }

        return MarkReadResult.Ok(message);
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

    public async Task<ReassistAiResult> ReassistAiAsync(Guid messageId, CancellationToken ct = default)
    {
        var message = await _db.Messages.FirstOrDefaultAsync(m => m.Id == messageId, ct);
        if (message == null)
            return ReassistAiResult.Fail(ReassistAiError.NotFound);

        var sender = await _db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == message.SenderUserId, ct);
        var senderRole = sender?.Role.ToString().ToLowerInvariant();

        var ai = await _aiMessageClassifier.ClassifyAsync(
            message.Id,
            message.Subject,
            message.Content,
            senderRole,
            "web_portal",
            ct);
        if (ai == null)
            return ReassistAiResult.Fail(ReassistAiError.ClassifierUnavailable);

        message.AiSuggestedCategory = ai.Category;
        message.AiConfidence = ai.Confidence;
        message.AiModelVersion = ai.ModelVersion;
        message.AiClassifiedAtUtc = ai.ClassifiedAtUtc;
        message.AiSuggestedPriority = ai.SuggestedPriority;
        message.AiSummary = ai.Summary;
        message.AiSuggestedReplyDraft = ai.SuggestedReplyDraft;
        message.AiExtractedJson = ai.ExtractedJson;
        await _db.SaveChangesAsync(ct);

        return ReassistAiResult.Ok(message);
    }

    public async Task<PagedResult<MessageAdminItemDto>> GetAllForAdminAsync(
        Guid adminUserId,
        AdminMessageDirection direction,
        bool uncategorizedOnly,
        bool unreadOnly,
        MessageCategory? category,
        int page,
        int pageSize,
        CancellationToken ct = default)
    {
        (page, pageSize) = NormalizePaging(page, pageSize);

        var query =
            from m in _db.Messages.AsNoTracking()
            join s in _db.Users.AsNoTracking() on m.SenderUserId equals s.Id
            join r in _db.Users.AsNoTracking() on m.ReceiverUserId equals r.Id
            select new { m, s, r };

        if (direction == AdminMessageDirection.Inbox)
            query = query.Where(x => x.m.ReceiverUserId == adminUserId);
        else if (direction == AdminMessageDirection.Sent)
            query = query.Where(x => x.m.SenderUserId == adminUserId);

        if (uncategorizedOnly)
            query = query.Where(x => x.m.FinalCategory == null);
        else if (category.HasValue)
            query = query.Where(x => x.m.FinalCategory == category.Value);
        if (unreadOnly)
            query = query.Where(x => x.m.ReadAt == null);

        var projected =
            from x in query
            orderby x.m.CreatedAt descending
            select new MessageAdminItemDto
            {
                Id = x.m.Id,
                SenderUserId = x.m.SenderUserId,
                SenderEmail = x.s.Email,
                SenderUserName = x.s.UserName,
                ReceiverUserId = x.m.ReceiverUserId,
                ReceiverEmail = x.r.Email,
                ReceiverUserName = x.r.UserName,
                Subject = x.m.Subject,
                Content = x.m.Content,
                CreatedAt = x.m.CreatedAt,
                ReadAt = x.m.ReadAt,
                SenderSuggestedCategory = x.m.SenderSuggestedCategory,
                AiSuggestedCategory = x.m.AiSuggestedCategory,
                AiConfidence = x.m.AiConfidence,
                AiModelVersion = x.m.AiModelVersion,
                AiClassifiedAtUtc = x.m.AiClassifiedAtUtc,
                AiSuggestedPriority = x.m.AiSuggestedPriority,
                AiSummary = x.m.AiSummary,
                AiSuggestedReplyDraft = x.m.AiSuggestedReplyDraft,
                AiExtractedJson = x.m.AiExtractedJson,
                FinalCategory = x.m.FinalCategory,
                ReviewedBy = x.m.ReviewedBy,
                ReviewedAt = x.m.ReviewedAt
            };

        var total = await projected.CountAsync(ct);
        var items = await projected.Skip((page - 1) * pageSize).Take(pageSize).ToListAsync(ct);

        return new PagedResult<MessageAdminItemDto>
        {
            Items = items,
            Page = page,
            PageSize = pageSize,
            TotalCount = total
        };
    }
}
