using DeepwellEducation.Domain.Entities;
using DeepwellEducation.Domain.Enums;

namespace DeepwellEducation.Services;

public interface ICourseRequestService
{
    /// <summary>Submit a Join or Leave request. Returns the created request or an error for the controller to map to HTTP.</summary>
    Task<SubmitResult> SubmitAsync(Guid userId, Guid courseId, RequestType type, CancellationToken ct = default);

    /// <summary>Review (approve/reject) a course request. Returns the updated request or an error.</summary>
    Task<ReviewResult> ReviewAsync(Guid requestId, bool approve, Guid? reviewedByUserId, CancellationToken ct = default);
}

public enum SubmitError
{
    None,
    CourseNotFound,
    UserNotFound,
    AlreadyEnrolled,
    NotEnrolled,
    DuplicatePending
}

public enum ReviewError
{
    None,
    NotFound,
    AlreadyReviewed,
    AlreadyEnrolled
}

public sealed class SubmitResult
{
    public CourseRequest? Request { get; init; }
    public SubmitError Error { get; init; }

    public static SubmitResult Ok(CourseRequest request) => new() { Request = request, Error = SubmitError.None };
    public static SubmitResult Fail(SubmitError error) => new() { Error = error };
}

public sealed class ReviewResult
{
    public CourseRequest? Request { get; init; }
    public ReviewError Error { get; init; }

    public static ReviewResult Ok(CourseRequest request) => new() { Request = request, Error = ReviewError.None };
    public static ReviewResult Fail(ReviewError error) => new() { Error = error };
}
