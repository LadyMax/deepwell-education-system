using Microsoft.EntityFrameworkCore;

namespace DeepwellEducation.Data;

/// <summary>
/// Repairs older Messages rows that have AI enrichment but missing AiSuggestedPriority,
/// or placeholder AiModelVersion (e.g. unknown).
/// Idempotent: safe to run on every startup; after the first run typically updates 0 rows.
/// </summary>
public static class MessageAiAssistBackfill
{
    public static async Task ApplyIfNeededAsync(AppDbContext db, CancellationToken ct = default)
    {
        await db.Database.ExecuteSqlRawAsync(
            """
            UPDATE Messages
            SET AiSuggestedPriority = 'normal'
            WHERE AiSuggestedPriority IS NULL
              AND (
                AiSuggestedCategory IS NOT NULL
                OR (AiSummary IS NOT NULL AND length(trim(AiSummary)) > 0)
                OR (AiSuggestedReplyDraft IS NOT NULL AND length(trim(AiSuggestedReplyDraft)) > 0)
                OR (AiExtractedJson IS NOT NULL AND length(trim(AiExtractedJson)) > 0)
              )
            """,
            cancellationToken: ct);

        await db.Database.ExecuteSqlRawAsync(
            """
            UPDATE Messages
            SET AiModelVersion = 'rule_v1'
            WHERE AiSuggestedCategory IS NOT NULL
              AND (
                AiModelVersion IS NULL
                OR length(trim(AiModelVersion)) = 0
                OR lower(trim(AiModelVersion)) = 'unknown'
              )
            """,
            cancellationToken: ct);
    }
}
