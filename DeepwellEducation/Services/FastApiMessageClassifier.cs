using System.Net.Http.Json;
using Microsoft.Extensions.Options;

namespace DeepwellEducation.Services;

public sealed class FastApiMessageClassifier : IAiMessageClassifier
{
    private static readonly HashSet<string> AllowedCategories = new(StringComparer.OrdinalIgnoreCase)
    {
        "course_inquiry",
        "technical_support",
        "complaint",
        "feedback",
        "general_question"
    };

    private readonly HttpClient _http;
    private readonly AiClassifierOptions _options;
    private readonly ILogger<FastApiMessageClassifier> _logger;

    public FastApiMessageClassifier(
        HttpClient http,
        IOptions<AiClassifierOptions> options,
        ILogger<FastApiMessageClassifier> logger)
    {
        _http = http;
        _options = options.Value;
        _logger = logger;
    }

    public async Task<AiClassificationResult?> ClassifyAsync(
        Guid messageId,
        string content,
        string? senderRole,
        string source,
        CancellationToken ct = default)
    {
        if (!_options.Enabled || string.IsNullOrWhiteSpace(content))
            return null;

        try
        {
            using var req = new HttpRequestMessage(HttpMethod.Post, _options.ClassifyPath)
            {
                Content = JsonContent.Create(new ClassifyRequest
                {
                    MessageId = messageId,
                    Content = content,
                    SenderRole = senderRole,
                    Source = source
                })
            };

            if (!string.IsNullOrWhiteSpace(_options.InternalToken))
                req.Headers.Add("X-Internal-Token", _options.InternalToken);

            using var res = await _http.SendAsync(req, ct);
            if (!res.IsSuccessStatusCode)
            {
                _logger.LogWarning(
                    "AI classify failed for message {MessageId}: HTTP {StatusCode}",
                    messageId,
                    (int)res.StatusCode);
                return null;
            }

            var body = await res.Content.ReadFromJsonAsync<ClassifyResponse>(cancellationToken: ct);
            if (body == null || string.IsNullOrWhiteSpace(body.Category))
            {
                _logger.LogWarning("AI classify empty response for message {MessageId}", messageId);
                return null;
            }

            var category = body.Category.Trim().ToLowerInvariant();
            if (!AllowedCategories.Contains(category))
            {
                _logger.LogWarning(
                    "AI classify invalid category for message {MessageId}: {Category}",
                    messageId,
                    body.Category);
                return null;
            }

            if (double.IsNaN(body.Confidence) || double.IsInfinity(body.Confidence) ||
                body.Confidence < 0 || body.Confidence > 1)
            {
                _logger.LogWarning(
                    "AI classify invalid confidence for message {MessageId}: {Confidence}",
                    messageId,
                    body.Confidence);
                return null;
            }

            var classifiedAtUtc = body.ClassifiedAtUtc ?? DateTime.UtcNow;
            if (classifiedAtUtc.Kind != DateTimeKind.Utc)
                classifiedAtUtc = DateTime.SpecifyKind(classifiedAtUtc, DateTimeKind.Utc);

            return new AiClassificationResult
            {
                Category = category,
                Confidence = body.Confidence,
                ModelVersion = string.IsNullOrWhiteSpace(body.ModelVersion) ? "unknown" : body.ModelVersion.Trim(),
                ClassifiedAtUtc = classifiedAtUtc,
                DetectedLanguage = body.DetectedLanguage,
                SuggestedLevel = body.SuggestedLevel
            };
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "AI classify exception for message {MessageId}", messageId);
            return null;
        }
    }

    private sealed class ClassifyRequest
    {
        public Guid MessageId { get; init; }
        public string Content { get; init; } = "";
        public string? SenderRole { get; init; }
        public string Source { get; init; } = "web_portal";
    }

    private sealed class ClassifyResponse
    {
        public string Category { get; init; } = "";
        public double Confidence { get; init; }
        public string? ModelVersion { get; init; }
        public DateTime? ClassifiedAtUtc { get; init; }
        public string? DetectedLanguage { get; init; }
        public string? SuggestedLevel { get; init; }
    }
}

public sealed class AiClassifierOptions
{
    public bool Enabled { get; set; } = true;
    public string BaseUrl { get; set; } = "http://127.0.0.1:8000";
    public string ClassifyPath { get; set; } = "/classify";
    public string? InternalToken { get; set; }
    public int TimeoutSeconds { get; set; } = 5;
}

