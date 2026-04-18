from datetime import datetime, timezone
import os

from fastapi import FastAPI, Header, HTTPException
from pydantic import BaseModel, Field

app = FastAPI(title="Deepwell AI Classifier", version="0.1.0")

INTERNAL_TOKEN = os.getenv("INTERNAL_TOKEN", "dev-internal-token")


class ClassifyRequest(BaseModel):
    message_id: str | None = None
    content: str = Field(min_length=1)
    sender_role: str | None = None
    source: str | None = "web_portal"


class ClassifyResponse(BaseModel):
    category: str
    confidence: float = Field(ge=0.0, le=1.0)
    model_version: str
    classified_at_utc: datetime
    detected_language: str | None = None
    suggested_level: str | None = None


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/classify", response_model=ClassifyResponse)
async def classify(
    req: ClassifyRequest,
    x_internal_token: str | None = Header(default=None),
) -> ClassifyResponse:
    if INTERNAL_TOKEN and x_internal_token != INTERNAL_TOKEN:
        raise HTTPException(status_code=401, detail="invalid internal token")

    text = req.content.lower()
    category = "general_question"
    confidence = 0.6

    if any(k in text for k in ("course", "study", "class", "lesson", "level", "schedule")):
        category = "course_inquiry"
        confidence = 0.85
    elif any(k in text for k in ("login", "password", "account", "bug", "error")):
        category = "technical_support"
        confidence = 0.8
    elif any(k in text for k in ("complaint", "unhappy", "bad", "refund")):
        category = "complaint"
        confidence = 0.82
    elif any(k in text for k in ("feedback", "suggestion", "improve")):
        category = "feedback"
        confidence = 0.78

    return ClassifyResponse(
        category=category,
        confidence=confidence,
        model_version="rule_v1",
        classified_at_utc=datetime.now(timezone.utc),
        detected_language=None,
        suggested_level=None,
    )

