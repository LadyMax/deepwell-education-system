"""Rule-based fallback and optional OpenAI (LangChain) message assist."""

from __future__ import annotations

import json
import logging
from dataclasses import dataclass
from typing import Any, Final

from langchain_core.messages import HumanMessage, SystemMessage
from langchain_openai import ChatOpenAI

from settings import APP_MODEL_VERSION, OPENAI_API_KEY, OPENAI_MODEL

logger = logging.getLogger(__name__)

ALLOWED_CATEGORIES: Final[frozenset[str]] = frozenset(
    {
        "course_inquiry",
        "technical_support",
        "complaint",
        "feedback",
        "general_question",
    }
)

ALLOWED_PRIORITIES: Final[frozenset[str]] = frozenset({"normal", "high", "urgent"})

RULE_MODEL_VERSION = "rule_v1"

SYSTEM_PROMPT = """You assist staff triaging student/parent emails for an education platform. Output a single JSON object only (no markdown).

Required keys:
- "category": one of course_inquiry, technical_support, complaint, feedback, general_question
- "confidence": number 0 to 1 (how sure you are about category)

Also include:
- "priority": one of normal, high, urgent (urgent = payment/refund crisis, safety, legal threat, or extreme anger; high = schedule changes, deadlines today/tomorrow, repeated login failures; normal = everything else)
- "summary": string, max 400 characters, plain English: who is writing, what they want, any dates/courses mentioned
- "suggested_reply_draft": string, 2 to 5 short professional sentences the staff member could edit and send. Do not promise refunds or policy decisions. This is a draft only.
- "extracted": object with optional keys (use null if unknown): student_reference (string), main_request (string), mentions_schedule_change (boolean), mentions_payment_or_refund (boolean), time_sensitive (boolean), sentiment (one of calm, concerned, angry, unknown)

Category definitions:
- course_inquiry: courses, levels, schedules, enrollment, lessons, study paths
- technical_support: login, password, bugs, errors, account access
- complaint: strong dissatisfaction, refunds demanded, serious service failure
- feedback: constructive suggestions, not primarily angry
- general_question: unclear or mixed

Respond with JSON only."""


@dataclass(frozen=True)
class AssistResult:
    category: str
    confidence: float
    model_version: str
    priority: str
    summary: str | None
    suggested_reply_draft: str | None
    extracted: dict[str, Any] | None


def classify_rules(content: str) -> tuple[str, float]:
    text = content.lower()
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

    return category, confidence


def _normalize_category(raw: str | None) -> str | None:
    if not raw or not isinstance(raw, str):
        return None
    c = raw.strip().lower().replace(" ", "_")
    return c if c in ALLOWED_CATEGORIES else None


def _normalize_confidence(raw: object) -> float | None:
    try:
        v = float(raw)  # type: ignore[arg-type]
    except (TypeError, ValueError):
        return None
    if v != v or v in (float("inf"), float("-inf")):
        return None
    return max(0.0, min(1.0, v))


def _normalize_priority(raw: object) -> str:
    if raw is None or not isinstance(raw, str):
        return "normal"
    p = raw.strip().lower()
    return p if p in ALLOWED_PRIORITIES else "normal"


def _optional_text(raw: object, max_len: int) -> str | None:
    if raw is None:
        return None
    if not isinstance(raw, str):
        raw = str(raw)
    t = raw.strip()
    if not t:
        return None
    return t if len(t) <= max_len else t[: max_len - 1].rstrip() + "…"


def _coerce_extracted(raw: object) -> dict[str, Any] | None:
    if raw is None or not isinstance(raw, dict):
        return None
    out: dict[str, Any] = {}
    for k, v in raw.items():
        if not isinstance(k, str):
            continue
        key = k.strip()
        if not key:
            continue
        if isinstance(v, (str, int, float, bool)) or v is None:
            out[key] = v
        elif isinstance(v, list) and len(v) <= 20:
            out[key] = v
    return out or None


def _loads_json_object(text: str) -> dict[str, Any] | None:
    text = text.strip()
    if not text:
        return None
    try:
        data = json.loads(text)
    except json.JSONDecodeError:
        return None
    return data if isinstance(data, dict) else None


def derive_rule_priority(category: str, content: str) -> str:
    t = content.lower()
    urgent_kw = (
        "urgent",
        "asap",
        "immediately",
        "legal",
        "lawyer",
        "refund",
        "退费",
        "投诉",
        "unacceptable",
        "outrageous",
    )
    if category == "complaint" or any(k in t for k in urgent_kw):
        return "urgent"
    schedule_kw = ("schedule", "change class", "改课", "请假", "cancel", "today", "tomorrow", "今天", "明天")
    if category == "course_inquiry" and any(k in t for k in schedule_kw):
        return "high"
    if category == "technical_support" and any(k in t for k in ("today", "exam", "locked out", "cannot login")):
        return "high"
    if any(k in t for k in ("today", "tomorrow", "urgent", "紧急", "asap")):
        return "high"
    return "normal"


def rule_summary(subject: str | None, content: str, max_len: int = 320) -> str:
    s = (subject or "").strip()
    c = content.strip()
    blob = f"{s}: {c}" if s else c
    if len(blob) <= max_len:
        return blob
    return blob[: max_len - 1].rstrip() + "…"


def rule_extracted(category: str, content: str) -> dict[str, Any]:
    t = content.lower()
    time_sensitive = any(
        k in t for k in ("today", "tomorrow", "urgent", "asap", "紧急", "今天", "明天", "deadline")
    )
    sentiment = "unknown"
    if any(k in t for k in ("furious", "outrageous", "disgusted", "愤怒", "ridiculous")):
        sentiment = "angry"
    elif category == "complaint" or any(k in t for k in ("disappointed", "worried", "upset", "frustrated")):
        sentiment = "concerned"
    elif category in ("feedback", "general_question"):
        sentiment = "calm"
    return {
        "time_sensitive": time_sensitive,
        "sentiment": sentiment,
        "source": "rule_v1",
    }


def build_assist_from_dict(data: dict[str, Any], model_version: str) -> AssistResult | None:
    cat = _normalize_category(data.get("category"))
    conf = _normalize_confidence(data.get("confidence"))
    if cat is None or conf is None:
        return None
    pri = _normalize_priority(data.get("priority"))
    summary = _optional_text(data.get("summary"), 2000)
    draft = _optional_text(
        data.get("suggested_reply_draft") or data.get("suggestedReplyDraft"),
        8000,
    )
    extracted = _coerce_extracted(data.get("extracted"))
    return AssistResult(
        category=cat,
        confidence=conf,
        model_version=model_version,
        priority=pri,
        summary=summary,
        suggested_reply_draft=draft,
        extracted=extracted,
    )


def _message_text_for_llm(subject: str | None, content: str) -> str:
    s = (subject or "").strip()
    if s:
        return f"subject: {s}\n\nbody:\n{content}"
    return f"body:\n{content}"


async def assist_llm(
    subject: str | None,
    content: str,
    sender_role: str | None,
    source: str | None,
) -> AssistResult | None:
    if not OPENAI_API_KEY:
        return None

    meta_parts = []
    if sender_role:
        meta_parts.append(f"sender_role: {sender_role}")
    if source:
        meta_parts.append(f"source: {source}")
    meta = "\n".join(meta_parts)
    human_body = _message_text_for_llm(subject, content)
    human = f"{meta}\n\n{human_body}" if meta else human_body

    try:
        llm = ChatOpenAI(
            model=OPENAI_MODEL,
            api_key=OPENAI_API_KEY,
            temperature=0,
            model_kwargs={"response_format": {"type": "json_object"}},
        )
        msg = await llm.ainvoke(
            [
                SystemMessage(content=SYSTEM_PROMPT),
                HumanMessage(content=human),
            ]
        )
        raw = msg.content
        if isinstance(raw, list):
            raw = "".join(
                part.get("text", "") if isinstance(part, dict) else str(part)
                for part in raw
            )
        if not isinstance(raw, str):
            raw = str(raw)
        data = _loads_json_object(raw)
        if not data:
            logger.warning("LLM returned JSON that could not be parsed as an object")
            return None
        parsed = build_assist_from_dict(data, APP_MODEL_VERSION)
        if not parsed:
            logger.warning("LLM JSON missing valid category/confidence")
        return parsed
    except Exception:
        logger.exception("OpenAI assist failed; falling back to rules")
        return None


async def assist_message(
    subject: str | None,
    content: str,
    sender_role: str | None,
    source: str | None,
) -> AssistResult:
    llm_result = await assist_llm(subject, content, sender_role, source)
    if llm_result:
        return llm_result

    cat, conf = classify_rules(content)
    pri = derive_rule_priority(cat, content)
    summ = rule_summary(subject, content)
    draft: str | None = None
    ext = rule_extracted(cat, content)
    return AssistResult(
        category=cat,
        confidence=conf,
        model_version=RULE_MODEL_VERSION,
        priority=pri,
        summary=summ,
        suggested_reply_draft=draft,
        extracted=ext,
    )
