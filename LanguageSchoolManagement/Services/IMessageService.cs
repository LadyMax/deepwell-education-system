using LanguageSchoolManagement.Domain.Entities;
using LanguageSchoolManagement.Domain.Enums;

namespace LanguageSchoolManagement.Services;

public interface IMessageService
{
    /// <summary>Sender sends a message; receiver defaults to first active Admin if omitted.</summary>
    Task<SendMessageResult> SendAsync(Guid senderUserId, string subject, string content, Guid? receiverUserId, CancellationToken ct = default);

    /// <summary>Inbox for the current user as receiver, newest first.</summary>
    Task<IReadOnlyList<MessageInboxItemDto>> GetInboxAsync(Guid receiverUserId, CancellationToken ct = default);

    /// <summary>Admin sets final category and review metadata.</summary>
    Task<CategorizeResult> CategorizeAsync(Guid messageId, Guid adminUserId, MessageCategory finalCategory, CancellationToken ct = default);

    /// <summary>All messages for admin console with optional filters (mutually exclusive).</summary>
    Task<IReadOnlyList<MessageAdminItemDto>> GetAllForAdminAsync(bool uncategorizedOnly, MessageCategory? category, CancellationToken ct = default);
}

public enum SendMessageError
{
    None,
    InvalidPayload,
    SenderNotFound,
    ReceiverNotFound,
    NoAdminAvailable
}

public enum CategorizeError
{
    None,
    NotFound
}

public sealed class SendMessageResult
{
    public Message? Message { get; init; }
    public SendMessageError Error { get; init; }

    public static SendMessageResult Ok(Message message) => new() { Message = message, Error = SendMessageError.None };
    public static SendMessageResult Fail(SendMessageError error) => new() { Error = error };
}

public sealed class CategorizeResult
{
    public Message? Message { get; init; }
    public CategorizeError Error { get; init; }

    public static CategorizeResult Ok(Message message) => new() { Message = message, Error = CategorizeError.None };
    public static CategorizeResult Fail(CategorizeError error) => new() { Error = error };
}

public sealed class MessageInboxItemDto
{
    public Guid Id { get; init; }
    public Guid SenderUserId { get; init; }
    public string SenderEmail { get; init; } = "";
    public string SenderFullName { get; init; } = "";
    public string Subject { get; init; } = "";
    public string Content { get; init; } = "";
    public DateTime CreatedAt { get; init; }
    public MessageCategory? FinalCategory { get; init; }
    public Guid? ReviewedBy { get; init; }
    public DateTime? ReviewedAt { get; init; }
}

public sealed class MessageAdminItemDto
{
    public Guid Id { get; init; }
    public Guid SenderUserId { get; init; }
    public string SenderEmail { get; init; } = "";
    public string SenderFullName { get; init; } = "";
    public Guid ReceiverUserId { get; init; }
    public string ReceiverEmail { get; init; } = "";
    public string ReceiverFullName { get; init; } = "";
    public string Subject { get; init; } = "";
    public string Content { get; init; } = "";
    public DateTime CreatedAt { get; init; }
    public MessageCategory? FinalCategory { get; init; }
    public Guid? ReviewedBy { get; init; }
    public DateTime? ReviewedAt { get; init; }
}
