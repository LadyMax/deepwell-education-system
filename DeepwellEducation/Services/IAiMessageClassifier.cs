namespace DeepwellEducation.Services;

public interface IAiMessageClassifier
{
    Task<AiClassificationResult?> ClassifyAsync(
        Guid messageId,
        string? subject,
        string content,
        string? senderRole,
        string source,
        CancellationToken ct = default);
}

public sealed class AiClassificationResult
{
    public string Category { get; init; } = "";
    public double Confidence { get; init; }
    public string ModelVersion { get; init; } = "";
    public DateTime ClassifiedAtUtc { get; init; }
    public string? DetectedLanguage { get; init; }
    public string? SuggestedLevel { get; init; }

    /// <summary>normal, high, or urgent (from AI service; staff may ignore).</summary>
    public string? SuggestedPriority { get; init; }

    public string? Summary { get; init; }
    public string? SuggestedReplyDraft { get; init; }
    public string? ExtractedJson { get; init; }
}

