using DeepwellEducation.Data;
using DeepwellEducation.Domain.Entities;
using DeepwellEducation.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace DeepwellEducation.Services;

public class CourseRequestService : ICourseRequestService
{
    private readonly AppDbContext _db;

    public CourseRequestService(AppDbContext db)
    {
        _db = db;
    }

    public async Task<SubmitResult> SubmitAsync(Guid userId, Guid courseId, RequestType type, CancellationToken ct = default)
    {
        var course = await _db.Courses.FindAsync(new object[] { courseId }, ct);
        if (course == null || !course.IsActive)
            return SubmitResult.Fail(SubmitError.CourseNotFound);

        var user = await _db.Users.FindAsync(new object[] { userId }, ct);
        if (user == null || !user.IsActive)
            return SubmitResult.Fail(SubmitError.UserNotFound);

        if (user.Role == UserRole.Admin)
            return SubmitResult.Fail(SubmitError.AdminJoinNotAllowed);

        var isEnrolled = await _db.Enrollments.AnyAsync(e => e.UserId == userId && e.CourseId == courseId && e.IsActive, ct);

        if (type == RequestType.Join)
        {
            if (isEnrolled)
                return SubmitResult.Fail(SubmitError.AlreadyEnrolled);
        }
        else
        {
            if (!isEnrolled)
                return SubmitResult.Fail(SubmitError.NotEnrolled);
        }

        var existingPending = await _db.CourseRequests
            .AnyAsync(r => r.UserId == userId && r.CourseId == courseId && r.Status == RequestStatus.Pending, ct);
        if (existingPending)
            return SubmitResult.Fail(SubmitError.DuplicatePending);

        var request = new CourseRequest
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            CourseId = courseId,
            Type = type,
            Status = RequestStatus.Pending,
            CreatedAt = DateTime.UtcNow
        };
        _db.CourseRequests.Add(request);
        await _db.SaveChangesAsync(ct);

        return SubmitResult.Ok(request);
    }

    public async Task<ReviewResult> ReviewAsync(Guid requestId, bool approve, Guid? reviewedByUserId, CancellationToken ct = default)
    {
        var request = await _db.CourseRequests
            .Include(r => r.User)
            .Include(r => r.Course)
            .FirstOrDefaultAsync(r => r.Id == requestId, ct);
        if (request == null)
            return ReviewResult.Fail(ReviewError.NotFound);

        if (request.Status != RequestStatus.Pending)
            return ReviewResult.Fail(ReviewError.AlreadyReviewed);

        request.Status = approve ? RequestStatus.Approved : RequestStatus.Rejected;
        request.ReviewedAt = DateTime.UtcNow;
        request.ReviewedBy = reviewedByUserId;

        (StudentNumberSequence? seq, int year, StudentProfile? profile) pendingStudentNumber = (null, 0, null);

        if (approve)
        {
            if (request.Type == RequestType.Join)
            {
                var exists = await _db.Enrollments
                    .AnyAsync(e => e.UserId == request.UserId && e.CourseId == request.CourseId && e.IsActive, ct);
                if (exists)
                    return ReviewResult.Fail(ReviewError.AlreadyEnrolled);

                if (request.User.Role == UserRole.Visitor)
                {
                    request.User.Role = UserRole.Student;
                    var year = DateTime.UtcNow.Year;
                    var seq = CreateSequence();
                    var newProfile = new StudentProfile
                    {
                        UserId = request.UserId,
                        StudentNumber = "",
                        CreatedAt = DateTime.UtcNow
                    };
                    _db.StudentProfiles.Add(newProfile);
                    pendingStudentNumber = (seq, year, newProfile);
                }

                _db.Enrollments.Add(new Enrollment
                {
                    Id = Guid.NewGuid(),
                    UserId = request.UserId,
                    CourseId = request.CourseId,
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow
                });
            }
            else
            {
                var enrollment = await _db.Enrollments
                    .FirstOrDefaultAsync(e => e.UserId == request.UserId && e.CourseId == request.CourseId && e.IsActive, ct);
                if (enrollment != null)
                {
                    enrollment.IsActive = false;
                    enrollment.EndedAt = DateTime.UtcNow;
                }
            }
        }

        await _db.SaveChangesAsync(ct);

        if (pendingStudentNumber is (var s, var y, var p) && s != null && p != null)
        {
            p.StudentNumber = $"S{y}{s.Id:D5}";
            await _db.SaveChangesAsync(ct);
        }

        return ReviewResult.Ok(request);
    }

    private StudentNumberSequence CreateSequence()
    {
        var seq = new StudentNumberSequence();
        _db.StudentNumberSequences.Add(seq);
        return seq;
    }
}
