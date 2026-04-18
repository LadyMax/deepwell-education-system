from datetime import datetime, timezone
from typing import Any

from fastapi import FastAPI, Header, HTTPException
from pydantic import AliasChoices, BaseModel, ConfigDict, Field

from classifier import assist_message
from settings import INTERNAL_TOKEN

app = FastAPI(title="Deepwell AI Classifier", version="0.1.0")


class ClassifyRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    message_id: str | None = Field(
        default=None,
        validation_alias=AliasChoices("messageId", "message_id"),
    )
    subject: str | None = Field(
        default=None,
        validation_alias=AliasChoices("subject", "Subject"),
    )
    content: str = Field(min_length=1)
    sender_role: str | None = Field(
        default=None,
        validation_alias=AliasChoices("senderRole", "sender_role"),
    )
    source: str | None = Field(default="web_portal")


class ClassifyResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    category: str
    confidence: float = Field(ge=0.0, le=1.0)
    model_version: str = Field(serialization_alias="modelVersion")
    classified_at_utc: datetime = Field(serialization_alias="classifiedAtUtc")
    detected_language: str | None = Field(
        default=None,
        serialization_alias="detectedLanguage",
    )
    suggested_level: str | None = Field(
        default=None,
        serialization_alias="suggestedLevel",
    )
    priority: str = Field(default="normal")
    summary: str | None = None
    suggested_reply_draft: str | None = Field(
        default=None,
        serialization_alias="suggestedReplyDraft",
    )
    extracted: dict[str, Any] | None = None


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post(
    "/classify",
    response_model=ClassifyResponse,
    response_model_by_alias=True,
)
async def classify(
    req: ClassifyRequest,
    x_internal_token: str | None = Header(default=None),
) -> ClassifyResponse:
    if INTERNAL_TOKEN and x_internal_token != INTERNAL_TOKEN:
        raise HTTPException(status_code=401, detail="invalid internal token")

    r = await assist_message(
        req.subject,
        req.content,
        req.sender_role,
        req.source,
    )

    return ClassifyResponse(
        category=r.category,
        confidence=r.confidence,
        model_version=r.model_version,
        classified_at_utc=datetime.now(timezone.utc),
        detected_language=None,
        suggested_level=None,
        priority=r.priority,
        summary=r.summary,
        suggested_reply_draft=r.suggested_reply_draft,
        extracted=r.extracted,
    )
