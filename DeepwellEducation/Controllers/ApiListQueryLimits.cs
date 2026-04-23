namespace DeepwellEducation.Controllers;

/// <summary>Bounds for optional list/search query parameters (abuse resistance for filter strings).</summary>
public static class ApiListQueryLimits
{
    public const int MaxSearchTermLength = 120;
}
