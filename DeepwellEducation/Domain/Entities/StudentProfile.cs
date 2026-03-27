using System.ComponentModel.DataAnnotations.Schema;
using System.ComponentModel.DataAnnotations;
namespace DeepwellEducation.Domain.Entities;

/// <summary>
/// User entity. There is no separate Student entity;
/// a Student is represented by a User with Role = Student.
/// </summary>
public class StudentProfile
{
    public Guid UserId { get; set; }

    public string StudentNumber { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public User User { get; set; } = null!;
}