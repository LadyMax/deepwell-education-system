using DeepwellEducation.Domain.Enums;

namespace DeepwellEducation.Domain.Entities;

public class Message
{
    public Guid Id { get; set; }

    public Guid SenderUserId { get; set; }

    public Guid ReceiverUserId { get; set; }

    public string Subject { get; set; } = string.Empty;

    public string Content { get; set; } = string.Empty;

    /// <summary>Sender-selected topic at compose time. Immutable after send; helps staff triage before AI is enabled.</summary>
    public MessageCategory? SenderSuggestedCategory { get; set; }

    /// <summary>Future AI pipeline: raw label or enum name from the model (separate from sender and final admin choice).</summary>
    public string? AiSuggestedCategory { get; set; }

    /// <summary>Future AI pipeline: model confidence 0–1.</summary>
    public double? AiConfidence { get; set; }

    /// <summary>AI classifier version identifier (e.g. rule_v1, llm_v2).</summary>
    public string? AiModelVersion { get; set; }

    /// <summary>When AI classification was produced (UTC).</summary>
    public DateTime? AiClassifiedAtUtc { get; set; }

    /// <summary>AI triage hint: normal, high, urgent (staff decides actual handling order).</summary>
    public string? AiSuggestedPriority { get; set; }

    /// <summary>Short plain-language summary for staff (AI assist, not authoritative).</summary>
    public string? AiSummary { get; set; }

    /// <summary>Optional suggested reply for staff to edit; never sent automatically by the system.</summary>
    public string? AiSuggestedReplyDraft { get; set; }

    /// <summary>Optional structured hints as JSON (e.g. sentiment, flags).</summary>
    public string? AiExtractedJson { get; set; }

    /// <summary>Admin-confirmed category from fixed set (authoritative for reporting).</summary>
    public MessageCategory? FinalCategory { get; set; }

    public Guid? ReviewedBy { get; set; }

    public DateTime? ReviewedAt { get; set; }

    /// <summary>When the receiver opened the message; null = unread.</summary>
    public DateTime? ReadAt { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}