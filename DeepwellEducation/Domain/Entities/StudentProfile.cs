namespace DeepwellEducation.Domain.Entities;

/// <summary>
/// User entity. There is no separate Student entity;
/// a Student is represented by a User with Role = Student.
/// </summary>
public class StudentProfile
{
    public Guid UserId { get; set; }

    public string StudentNumber { get; set; } = string.Empty;

    public string FirstName { get; set; } = string.Empty;

    public string LastName { get; set; } = string.Empty;

    public string Phone { get; set; } = string.Empty;

    public DateTime? DateOfBirth { get; set; }

    public string Address { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime? UpdatedAt { get; set; }

    public User User { get; set; } = null!;
}