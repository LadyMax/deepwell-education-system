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

# Catalog language codes (aligned with wwwroot/frontend/js/course-ui.js LANGUAGE_BY_CODE — 24 school languages).
KNOWN_SCHOOL_LANGUAGE_CODES: Final[frozenset[str]] = frozenset(
    {
        "ar",
        "zh",
        "da",
        "nl",
        "en",
        "fi",
        "fr",
        "el",
        "he",
        "is",
        "it",
        "ja",
        "de",
        "ko",
        "no",
        "fa",
        "pl",
        "pt",
        "ru",
        "es",
        "sv",
        "th",
        "tr",
        "vi",
        "unknown",
    }
)
SCHOOL_LANGUAGE_NAMES: Final[dict[str, str]] = {
    "ar": "Arabic",
    "zh": "Chinese",
    "da": "Danish",
    "nl": "Dutch",
    "en": "English",
    "fi": "Finnish",
    "fr": "French",
    "el": "Greek",
    "he": "Hebrew",
    "is": "Icelandic",
    "it": "Italian",
    "ja": "Japanese",
    "de": "German",
    "ko": "Korean",
    "no": "Norwegian",
    "fa": "Persian",
    "pl": "Polish",
    "pt": "Portuguese",
    "ru": "Russian",
    "es": "Spanish",
    "sv": "Swedish",
    "th": "Thai",
    "tr": "Turkish",
    "vi": "Vietnamese",
    "unknown": "Not clear from message",
}

RULE_MODEL_VERSION = "rule_v1"

SYSTEM_PROMPT = """You assist staff triaging student/parent emails for an education platform. Output a single JSON object only (no markdown).

Required keys:
- "category": one of course_inquiry, technical_support, complaint, feedback, general_question
- "confidence": number 0 to 1 (how sure you are about category)

Also include:
- "priority": one of normal, high, urgent (urgent = payment/refund crisis, safety, legal threat, or extreme anger; high = schedule changes, deadlines today/tomorrow, repeated login failures; normal = everything else)
- "summary": string, max 400 characters, plain English **abstractive triage summary** (2–4 short sentences): synthesize who wrote (parent/student if inferable), the core ask or problem, and concrete details (dates, course names). Do **not** copy or lightly paraphrase the subject line or body as the summary; avoid long quotes—use your own words; short proper nouns only when needed
- "suggested_reply_draft": string, 2 to 5 short professional sentences the staff member could edit and send. Do not promise refunds or policy decisions. This is a draft only.
- "extracted": object with optional keys (use null if unknown): student_reference (string), main_request (string), mentions_schedule_change (boolean), mentions_payment_or_refund (boolean), time_sensitive (boolean), sentiment (one of calm, concerned, angry, unknown), school_language_code (one of ar, zh, da, nl, en, fi, fr, el, he, is, it, ja, de, ko, no, fa, pl, pt, ru, es, sv, th, tr, vi, unknown — which *school/catalog* language the message is mainly about, e.g. "Spanish beginner class", not the language the email is written in), school_language_name (English label matching that code, e.g. "Spanish")

Category definitions:
- course_inquiry: courses, levels, schedules, enrollment, lessons, study paths
- technical_support: login, password, bugs, errors, account access
- complaint: strong dissatisfaction, refunds demanded, serious service failure
- feedback: constructive suggestions, not primarily angry
- general_question: unclear or mixed

Always set extracted.school_language_code and extracted.school_language_name when you can infer the main school language from the text; use unknown / Not clear from message only if truly ambiguous.

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


def infer_school_language(text: str) -> tuple[str, str]:
    """Guess which catalog/school language the message is mainly about (not the prose language).

    Matches the 24 LANGUAGE_BY_CODE keys in frontend course-ui.js. Order matters: first hit wins;
    less ambiguous / rarer demonyms before very common words like "english".
    """
    t = text.lower()
    rules: list[tuple[tuple[str, ...], str]] = [
        (("norwegian", "norsk", "bokmål", "bokmal", "nynorsk"), "no"),
        (("swedish", "svenska", "瑞典语"), "sv"),
        (("danish", "dansk", "丹麦语"), "da"),
        (("finnish", "suomi", "芬兰语"), "fi"),
        (("icelandic", "íslenska", "islenska"), "is"),
        (("dutch", "nederlands", "holland", "荷兰语", "荷蘭語", "flemish", "vlaams"), "nl"),
        (("polish", "polski", "波兰语"), "pl"),
        (("greek", "ελληνικά", "ellinika", "modern greek"), "el"),
        (("hebrew", "עברית", "ivrit"), "he"),
        (("turkish", "türkçe", "turkce", "土耳其语"), "tr"),
        (("persian", "farsi", "فارسی", "dari"), "fa"),
        (
            (
                "arabic",
                "عربي",
                "العربية",
                "modern standard arabic",
                "egyptian arabic",
                "levantine",
                "levantine arabic",
            ),
            "ar",
        ),
        (("korean", "한국어", "hangul", "topik", "韩语", "韓語", "한국말"), "ko"),
        (("japanese", "日本語", "日语", "nihongo", "jlpt", "日本语"), "ja"),
        (("russian", "русский", "俄语", "torfl"), "ru"),
        (("thai", "ภาษาไทย", "泰语"), "th"),
        (("vietnamese", "tiếng việt", "tieng viet", "越南语"), "vi"),
        (
            (
                "portuguese",
                "português",
                "portugues",
                "brasileiro",
                "brazilian portuguese",
                "葡语",
                "巴西葡语",
                "葡萄牙语",
            ),
            "pt",
        ),
        (("italian", "italiano", "意大利语", "italiana"), "it"),
        (("german", "deutsch", "德语", "德文", "歌德", "goethe", "daf"), "de"),
        (("french", "français", "francais", "法语", "法文", "delf", "dalf", "tcf"), "fr"),
        (
            ("spanish", "español", "espanol", "西语", "西班牙语", "dele", "siele", "castilian"),
            "es",
        ),
        (
            (
                "chinese",
                "中文",
                "汉语",
                "普通话",
                "mandarin",
                "hsk",
                "拼音",
                "华语",
                "國語",
                "国语",
            ),
            "zh",
        ),
        (("english", "英語", "英语", "雅思", "ielts", "toefl", "esl", "cae", "fce", "pte"), "en"),
    ]
    for keys, code in rules:
        if any(k in t for k in keys):
            return code, SCHOOL_LANGUAGE_NAMES[code]
    return "unknown", SCHOOL_LANGUAGE_NAMES["unknown"]


def _normalize_school_language_code(raw: object) -> str | None:
    if raw is None:
        return None
    c = str(raw).strip().lower()
    return c if c in KNOWN_SCHOOL_LANGUAGE_CODES else None


def merge_school_language_into_extracted(
    extracted: dict[str, Any] | None, content: str
) -> dict[str, Any] | None:
    base: dict[str, Any] = dict(extracted) if extracted else {}
    code = _normalize_school_language_code(base.get("school_language_code"))
    if code is None:
        c, n = infer_school_language(content)
        base["school_language_code"] = c
        base["school_language_name"] = n
    else:
        base["school_language_code"] = code
        raw_name = base.get("school_language_name")
        if not isinstance(raw_name, str) or not raw_name.strip():
            base["school_language_name"] = SCHOOL_LANGUAGE_NAMES.get(code, code)
        else:
            base["school_language_name"] = raw_name.strip()
    return base or None


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
    lang_code, lang_name = infer_school_language(content)
    return {
        "time_sensitive": time_sensitive,
        "sentiment": sentiment,
        "source": "rule_v1",
        "school_language_code": lang_code,
        "school_language_name": lang_name,
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
            return None
        ext = merge_school_language_into_extracted(parsed.extracted, content)
        return AssistResult(
            category=parsed.category,
            confidence=parsed.confidence,
            model_version=parsed.model_version,
            priority=parsed.priority,
            summary=parsed.summary,
            suggested_reply_draft=parsed.suggested_reply_draft,
            extracted=ext,
        )
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
    # No LLM: do not fill summary with subject+body (misleading as "AI summary").
    summ: str | None = None
    draft: str | None = None
    ext = merge_school_language_into_extracted(rule_extracted(cat, content), content)
    return AssistResult(
        category=cat,
        confidence=conf,
        model_version=RULE_MODEL_VERSION,
        priority=pri,
        summary=summ,
        suggested_reply_draft=draft,
        extracted=ext,
    )
