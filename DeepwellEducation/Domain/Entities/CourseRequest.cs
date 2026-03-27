using DeepwellEducation.Domain.Enums;

namespace DeepwellEducation.Domain.Entities;

public class CourseRequest
{
    public Guid Id { get; set; }

    public Guid UserId { get; set; }

    public Guid CourseId { get; set; }

    public RequestType Type { get; set; }

    public RequestStatus Status { get; set; } = RequestStatus.Pending;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime? ReviewedAt { get; set; }

    public Guid? ReviewedBy { get; set; }

    public User User { get; set; } = null!;

    public Course Course { get; set; } = null!;
}