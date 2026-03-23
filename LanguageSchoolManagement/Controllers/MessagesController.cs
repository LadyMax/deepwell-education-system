using System.Security.Claims;
using LanguageSchoolManagement.Domain.Enums;
using LanguageSchoolManagement.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace LanguageSchoolManagement.Controllers;

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
    [HttpPost]
    [ProducesResponseType(typeof(SentMessageResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<SentMessageResponse>> Send([FromBody] SendMessageRequest body, CancellationToken ct)
    {
        var userId = GetCurrentUserId();
        if (userId == null)
            return Unauthorized();

        var result = await _messageService.SendAsync(userId.Value, body.Subject, body.Content, body.ReceiverUserId, ct);
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

    /// <summary>Your inbox (you are the receiver), newest first.</summary>
    [Authorize]
    [HttpGet("inbox")]
    [ProducesResponseType(typeof(IEnumerable<MessageInboxItemDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<MessageInboxItemDto>>> Inbox(CancellationToken ct)
    {
        var userId = GetCurrentUserId();
        if (userId == null)
            return Unauthorized();

        var list = await _messageService.GetInboxAsync(userId.Value, ct);
        return Ok(list);
    }

    /// <summary>Admin: list all messages. Use <paramref name="uncategorizedOnly"/> or <paramref name="finalCategory"/>, not both.</summary>
    [Authorize(Roles = "Admin")]
    [HttpGet("admin")]
    [ProducesResponseType(typeof(IEnumerable<MessageAdminItemDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<IReadOnlyList<MessageAdminItemDto>>> AdminList(
        [FromQuery] bool uncategorizedOnly = false,
        [FromQuery] MessageCategory? finalCategory = null,
        CancellationToken ct = default)
    {
        if (uncategorizedOnly && finalCategory.HasValue)
            return BadRequest("Use either uncategorizedOnly or finalCategory, not both.");

        var list = await _messageService.GetAllForAdminAsync(uncategorizedOnly, finalCategory, ct);
        return Ok(list);
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
}

public class SendMessageRequest
{
    public string Subject { get; set; } = "";
    public string Content { get; set; } = "";
    /// <summary>If omitted, the first active Admin (by creation time) receives the message.</summary>
    public Guid? ReceiverUserId { get; set; }
}

public class CategorizeMessageRequest
{
    public MessageCategory FinalCategory { get; set; }
}

public sealed record SentMessageResponse(Guid Id, Guid ReceiverUserId, DateTime CreatedAt, string Subject, string Content);

public sealed record CategorizedMessageResponse(Guid Id, MessageCategory FinalCategory, Guid ReviewedBy, DateTime ReviewedAt);
