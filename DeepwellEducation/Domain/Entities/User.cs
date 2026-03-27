using DeepwellEducation.Domain.Enums;

namespace DeepwellEducation.Domain.Entities;

/// <summary>
/// User entity. There is no separate Student entity;
/// a Student is a User with Role = Student.
/// </summary>
public class User
{
    public Guid Id { get; set; }

    public string Email { get; set; } = string.Empty;

    public string PasswordHash { get; set; } = string.Empty;

    public string FullName { get; set; } = string.Empty;

    public UserRole Role { get; set; } = UserRole.Visitor;

    public bool IsActive { get; set; } = true;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public StudentProfile? StudentProfile { get; set; }

    public ICollection<Enrollment> Enrollments { get; set; } = new List<Enrollment>();

    public ICollection<CourseRequest> CourseRequests { get; set; } = new List<CourseRequest>();
}