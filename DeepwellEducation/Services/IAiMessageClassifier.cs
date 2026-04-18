namespace DeepwellEducation.Services;

public interface IAiMessageClassifier
{
    Task<AiClassificationResult?> ClassifyAsync(
        Guid messageId,
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
}

