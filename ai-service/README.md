# Deepwell AI Classifier (MVP)

Minimal FastAPI service for message classification.

## Run locally

Copy `.env.example` to `.env` if you use a tool that loads it, or set `INTERNAL_TOKEN` in your shell (must match the ASP.NET Core setting `AiClassifier:InternalToken`).

```bash
cd ai-service
python -m venv .venv
.venv\\Scripts\\activate
pip install -r requirements.txt
set INTERNAL_TOKEN=dev-internal-token
uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```

## Endpoints

- `GET /health`
- `POST /classify`

Request payload:

```json
{
  "message_id": "optional-guid",
  "content": "message text",
  "sender_role": "student",
  "source": "web_portal"
}
```

Response payload:

```json
{
  "category": "course_inquiry",
  "confidence": 0.85,
  "model_version": "rule_v1",
  "classified_at_utc": "2026-04-16T20:00:00Z",
  "detected_language": null,
  "suggested_level": null
}
```

## Auth

Callers must pass header:

- `X-Internal-Token: <INTERNAL_TOKEN>`

