using DeepwellEducation.Domain.Enums;

namespace DeepwellEducation.Domain.Entities;

public class Message
{
    public Guid Id { get; set; }

    public Guid SenderUserId { get; set; }

    public Guid ReceiverUserId { get; set; }

    public string Subject { get; set; } = string.Empty;

    public string Content { get; set; } = string.Empty;

    /// <summary>AI raw suggestion; keep as string for flexibility.</summary>
    public string? AiSuggestedCategory { get; set; }

    public double? AiConfidence { get; set; }

    /// <summary>Admin-confirmed category from fixed set.</summary>
    public MessageCategory? FinalCategory { get; set; }

    public Guid? ReviewedBy { get; set; }

    public DateTime? ReviewedAt { get; set; }

    /// <summary>When the receiver opened the message; null = unread.</summary>
    public DateTime? ReadAt { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}