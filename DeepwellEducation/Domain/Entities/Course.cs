using DeepwellEducation.Domain.Enums;

namespace DeepwellEducation.Domain.Entities;

public class Course
{
    public Guid Id { get; set; }

    public string Name { get; set; } = string.Empty;

    public string Description { get; set; } = string.Empty;

    public string LanguageCode { get; set; } = string.Empty;

    public string LanguageName { get; set; } = string.Empty;

    public CourseLevel Level { get; set; }

    public CourseCategory Category { get; set; } = CourseCategory.Language;

    public bool IsActive { get; set; } = true;
}