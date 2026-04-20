# Deepwell AI Classifier (MVP)

Minimal FastAPI service for message classification.

## Run locally

Copy `.env.example` to `.env` in this folder. `settings.py` loads that file automatically on startup. You can also set variables in the shell (must match the ASP.NET Core setting `AiClassifier:InternalToken` for `INTERNAL_TOKEN`).

Optional: set `OPENAI_API_KEY` to use the LangChain + OpenAI classifier; if it is empty or the model call fails, the service falls back to keyword rules (`model_version` = `rule_v1`).

```bash
cd ai-service
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```

### PowerShell (Windows, each time you start the service)

After the venv exists and dependencies are installed, from a new terminal:

```powershell
cd c:\Users\brend\source\repos\DeepwellEducation\ai-service
.\.venv\Scripts\Activate.ps1
uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```

If your repo is checked out elsewhere, change the `cd` path to your local `ai-service` folder (or `cd ai-service` from the repository root).

**Exit the virtual environment:** in the same terminal, run `deactivate`. Closing the terminal window also ends the activated session.

PowerShell without a `.env` file (set variables before `uvicorn` if needed):

```powershell
$env:INTERNAL_TOKEN = "dev-internal-token"
$env:OPENAI_API_KEY = "sk-..."   # optional
uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```

## Endpoints

- `GET /health`
- `POST /classify`

Request payload:

```json
{
  "messageId": "optional-guid",
  "subject": "optional subject line",
  "content": "message text",
  "senderRole": "student",
  "source": "web_portal"
}
```

Response payload (extra fields are always present; `suggestedReplyDraft` is often null when using rule fallback without an API key):

```json
{
  "category": "course_inquiry",
  "confidence": 0.85,
  "modelVersion": "rule_v1",
  "classifiedAtUtc": "2026-04-16T20:00:00Z",
  "detectedLanguage": null,
  "suggestedLevel": null,
  "priority": "normal",
  "summary": "Short plain-language summary for staff.",
  "suggestedReplyDraft": null,
  "extracted": { "time_sensitive": false, "sentiment": "calm" }
}
```

## Auth

Callers must pass header:

- `X-Internal-Token: <INTERNAL_TOKEN>`

## Tests (optional)

```bash
cd ai-service
.venv\Scripts\activate
pip install -r requirements.txt -r requirements-dev.txt
python -m pytest tests -q
```

Uses **no** `OPENAI_API_KEY` (rule path only) and a fixed test token from `tests/conftest.py`.

## Legacy rows (main ASP.NET app)

Older `Messages` rows may lack `AiSuggestedPriority` or have `AiModelVersion = unknown` while still having AI text fields. The main app runs **`MessageAiAssistBackfill.ApplyIfNeededAsync`** right after `Migrate()` on startup: it **idempotently** sets missing priority to `normal` and normalizes `unknown`/empty model version to `rule_v1` when a category is present. No manual SQL is required for typical dev databases.

