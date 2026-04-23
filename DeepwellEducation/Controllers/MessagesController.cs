using System.Security.Claims;
using DeepwellEducation.Domain.Enums;
using DeepwellEducation.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace DeepwellEducation.Controllers;

[ApiController]
[Route("api/[controller]")]
public class MessagesController : ControllerBase
{
    private readonly IMessageService _messageService;

    public MessagesController(IMessageService messageService)
    {
        _messageService = messageService;
    }

    private Guid? GetCurrentUserId()
    {
        var sub = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return string.IsNullOrEmpty(sub) || !Guid.TryParse(sub, out var id) ? null : id;
    }

    /// <summary>Send a message; you are the sender. Receiver defaults to an active Admin if omitted.</summary>
    [Authorize]
    [EnableRateLimiting("messages-send")]
    [HttpPost]
    [ProducesResponseType(typeof(SentMessageResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<SentMessageResponse>> Send([FromBody] SendMessageRequest body, CancellationToken ct)
    {
        var userId = GetCurrentUserId();
        if (userId == null)
            return Unauthorized();

        var result = await _messageService.SendAsync(
            userId.Value,
            body.Subject,
            body.Content,
            body.ReceiverUserId,
            body.SenderSuggestedCategory,
            ct);
        if (result.Error != SendMessageError.None)
        {
            return result.Error switch
            {
                SendMessageError.InvalidPayload => BadRequest("Subject and content are required."),
                SendMessageError.SenderNotFound => NotFound("Sender not found or inactive."),
                SendMessageError.ReceiverNotFound => NotFound("Receiver not found or inactive."),
                SendMessageError.NoAdminAvailable => BadRequest("No active administrator is available to receive messages."),
                _ => BadRequest()
            };
        }

        var m = result.Message!;
        return Created($"{Request.Path}/{m.Id}", new SentMessageResponse(m.Id, m.ReceiverUserId, m.CreatedAt, m.Subject, m.Content));
    }

    /// <summary>Your inbox (you are the receiver), newest first, paginated.</summary>
    [Authorize]
    [HttpGet("inbox")]
    [ProducesResponseType(typeof(PagedResult<MessageInboxItemDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<PagedResult<MessageInboxItemDto>>> Inbox(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = MessageService.DefaultPageSize,
        CancellationToken ct = default)
    {
        var userId = GetCurrentUserId();
        if (userId == null)
            return Unauthorized();

        var result = await _messageService.GetInboxAsync(userId.Value, page, pageSize, ct);
        return Ok(result);
    }

    /// <summary>Unread inbox count for the current user (messages received, not yet opened).</summary>
    [Authorize]
    [HttpGet("inbox/unread-count")]
    [ProducesResponseType(typeof(InboxUnreadCountResponse), StatusCodes.Status200OK)]
    public async Task<ActionResult<InboxUnreadCountResponse>> InboxUnreadCount(CancellationToken ct)
    {
        var userId = GetCurrentUserId();
        if (userId == null)
            return Unauthorized();

        var count = await _messageService.GetUnreadInboxCountAsync(userId.Value, ct);
        return Ok(new InboxUnreadCountResponse(count));
    }

    /// <summary>Messages you sent, newest first, paginated.</summary>
    [Authorize]
    [HttpGet("sent")]
    [ProducesResponseType(typeof(PagedResult<MessageSentItemDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<PagedResult<MessageSentItemDto>>> Sent(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = MessageService.DefaultPageSize,
        CancellationToken ct = default)
    {
        var userId = GetCurrentUserId();
        if (userId == null)
            return Unauthorized();

        var result = await _messageService.GetSentAsync(userId.Value, page, pageSize, ct);
        return Ok(result);
    }

    /// <summary>Mark a message as read (you must be the receiver). Idempotent.</summary>
    [Authorize]
    [HttpPost("{id:guid}/read")]
    [ProducesResponseType(typeof(MessageReadResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<MessageReadResponse>> MarkRead(Guid id, CancellationToken ct)
    {
        var userId = GetCurrentUserId();
        if (userId == null)
            return Unauthorized();

        var result = await _messageService.MarkAsReadAsync(id, userId.Value, ct);
        if (result.Error != MarkReadError.None)
        {
            return result.Error switch
            {
                MarkReadError.NotFound => NotFound(),
                MarkReadError.NotReceiver => Forbid(),
                _ => BadRequest()
            };
        }

        var m = result.Message!;
        return Ok(new MessageReadResponse(m.Id, m.ReadAt!.Value));
    }

    /// <summary>Admin: list all messages. Use <paramref name="uncategorizedOnly"/> or <paramref name="finalCategory"/>, not both.</summary>
    [Authorize(Roles = "Admin")]
    [HttpGet("admin")]
    [ProducesResponseType(typeof(PagedResult<MessageAdminItemDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<PagedResult<MessageAdminItemDto>>> AdminList(
        [FromQuery] bool uncategorizedOnly = false,
        [FromQuery] bool unreadOnly = false,
        [FromQuery] MessageCategory? finalCategory = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = MessageService.DefaultPageSize,
        CancellationToken ct = default)
    {
        if (uncategorizedOnly && finalCategory.HasValue)
            return BadRequest("Use either uncategorizedOnly or finalCategory, not both.");

        var result = await _messageService.GetAllForAdminAsync(uncategorizedOnly, unreadOnly, finalCategory, page, pageSize, ct);
        return Ok(result);
    }

    /// <summary>Admin: set final category and review fields.</summary>
    [Authorize(Roles = "Admin")]
    [HttpPost("{id:guid}/categorize")]
    [ProducesResponseType(typeof(CategorizedMessageResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<CategorizedMessageResponse>> Categorize(Guid id, [FromBody] CategorizeMessageRequest body, CancellationToken ct)
    {
        var adminId = GetCurrentUserId();
        if (adminId == null)
            return Unauthorized();

        var result = await _messageService.CategorizeAsync(id, adminId.Value, body.FinalCategory, ct);
        if (result.Error != CategorizeError.None)
            return NotFound();

        var m = result.Message!;
        return Ok(new CategorizedMessageResponse(
            m.Id,
            m.FinalCategory!.Value,
            m.ReviewedBy!.Value,
            m.ReviewedAt!.Value));
    }

    /// <summary>Admin: re-run AI assist (calls configured classifier; best-effort).</summary>
    [Authorize(Roles = "Admin")]
    [HttpPost("{id:guid}/reassist-ai")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status502BadGateway)]
    public async Task<IActionResult> ReassistAi(Guid id, CancellationToken ct)
    {
        var result = await _messageService.ReassistAiAsync(id, ct);
        return result.Error switch
        {
            ReassistAiError.None => NoContent(),
            ReassistAiError.NotFound => NotFound(),
            ReassistAiError.ClassifierUnavailable =>
                StatusCode(StatusCodes.Status502BadGateway, "AI service did not return a result."),
            _ => BadRequest()
        };
    }
}

public class SendMessageRequest
{
    public string Subject { get; set; } = "";
    public string Content { get; set; } = "";
    /// <summary>If omitted, the first active Admin (by creation time) receives the message.</summary>
    public Guid? ReceiverUserId { get; set; }
    /// <summary>Optional sender-chosen topic; admin final category from categorize endpoint remains authoritative.</summary>
    public MessageCategory? SenderSuggestedCategory { get; set; }
}

public class CategorizeMessageRequest
{
    public MessageCategory FinalCategory { get; set; }
}

public sealed record SentMessageResponse(Guid Id, Guid ReceiverUserId, DateTime CreatedAt, string Subject, string Content);

public sealed record CategorizedMessageResponse(Guid Id, MessageCategory FinalCategory, Guid ReviewedBy, DateTime ReviewedAt);

public sealed record MessageReadResponse(Guid Id, DateTime ReadAt);

public sealed record InboxUnreadCountResponse(int Count);
