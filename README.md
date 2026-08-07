# DeepwellEducation

Role-based language school management: ASP.NET Core 8 Web API, EF Core + SQLite, and a static HTML/CSS/JS frontend served from `wwwroot/frontend/`.

## Stack and features

- **Backend**: .NET 8, EF Core, SQLite, JWT Bearer auth (issuer/audience validation; password-change stamp invalidates old tokens), Swashbuckle **Swagger UI** (Development only), global authorization fallback, Problem Details + centralized exception handling, fixed-window **rate limiting** on auth and sensitive actions, OWASP-oriented **security headers**, **SixLabors.ImageSharp** for admin course cover uploads  
- **Frontend**: server-hosted static assets under `wwwroot/frontend/`; root `/` redirects to `/frontend/`  
- **Domain**: Visitor / Student / Admin; courses; enrollments; join/leave **course requests** with approval; **messages** with categories and optional **AI classification** via `ai-service/`  
- **Message categories** (enum): course inquiry, complaint, feedback, other, technical support, general question  
- **Optional AI**: FastAPI service in `ai-service/` (pytest in CI); main app calls it when `AiClassifier:Enabled` is true—see `ai-service/README.md`

## Repository layout

| Path | Purpose |
|------|---------|
| `DeepwellEducation/` | Web app (`Controllers/`, `Services/`, `Data/`, `Domain/`, `Security/`, `Migrations/`) and `wwwroot/frontend/` |
| `DeepwellEducation.Tests/` | Unit and integration tests (`Unit/`, `Integration/`, `TestSupport/`) |
| `ai-service/` | Optional FastAPI message classifier |
| `scripts/dev/` | Regular dev checks (e.g. CSS header guard) |
| `scripts/legacy/` | One-off migration helpers; not part of normal workflows |
| `scripts/` | Other tooling (e.g. `check-phone-flag-mapping.js`) |
| `docs/` | Conventions: `repo-structure.md`, `frontend-pages.md`; third-party texts under `docs/licenses/` |

## Local run

From the repository root:

```bash
dotnet restore
dotnet build
dotnet test DeepwellEducation.sln
dotnet run --project DeepwellEducation/DeepwellEducation.csproj
```

With the default Development profile, the API listens on `https://localhost:7169` and `http://localhost:5190` and opens **Swagger** (`/swagger`). Use **one origin** locally if you rely on JWT in `localStorage` (avoid mixing HTTP and HTTPS URLs for the same app).

### Demo login 

Login Admin uses **email + password** 

Sign in with:

| Email | `admin@deepwell.se` |
| Password | `Admin123!` |

CI (`.github/workflows/ci.yml`): `dotnet` job restores/builds/tests the solution; `ai-service` job runs pytest.

## Starting ai-service (optional)

When **`AiClassifier:Enabled`** is true in the main app, run the FastAPI classifier so it listens on **`http://127.0.0.1:8000`** (matches default `AiClassifier:BaseUrl` in `DeepwellEducation/appsettings.json`). Use a **second terminal** beside `dotnet run`.

1. **One-time setup** (from the repository root):

   ```bash
   cd ai-service
   python -m venv .venv
   ```

2. **Activate the venv and install dependencies**

   **Windows (PowerShell):**

   ```powershell
   cd ai-service
   .\.venv\Scripts\Activate.ps1
   pip install -r requirements.txt
   ```

   **macOS / Linux:**

   ```bash
   cd ai-service
   source .venv/bin/activate
   pip install -r requirements.txt
   ```

3. **Environment**: copy `ai-service/.env.example` to `ai-service/.env`. Set **`INTERNAL_TOKEN`** to the same value as **`AiClassifier:InternalToken`** in the ASP.NET app (repo default is `dev-internal-token`). Optionally set **`OPENAI_API_KEY`** for LLM classification; if unset or the call fails, the service uses the keyword rule fallback (`rule_v1`).

4. **Start the service** (each time):

   ```powershell
   cd ai-service
   .\.venv\Scripts\Activate.ps1
   uvicorn main:app --host 127.0.0.1 --port 8000 --reload
   ```

   ```bash
   cd ai-service
   source .venv/bin/activate
   uvicorn main:app --host 127.0.0.1 --port 8000 --reload
   ```

5. **Smoke check**: open `http://127.0.0.1:8000/health` or run `curl http://127.0.0.1:8000/health`.

Endpoints, auth header (`X-Internal-Token`), request/response shapes, and pytest: **`ai-service/README.md`**.

## Configuration

- **Database**: `ConnectionStrings:DefaultConnection` in `DeepwellEducation/appsettings.json` → SQLite file `Data/DeepwellEducation.db`.  
- **Local overrides**: copy `DeepwellEducation/appsettings.Development.json.example` to `appsettings.Development.json` (typically gitignored).  
- **JWT**: `Jwt:Key` must be **at least 32 characters**. The repo default is for **development/demo only**. For production or any public host, use a strong random secret (e.g. environment variable `Jwt__Key`); never ship the sample key.  
- **AiClassifier** (main app ↔ `ai-service`):  
  - `Enabled` — `appsettings.json` defaults to `true` for dev; `appsettings.Production.json` sets `false` until you wire a real service.  
  - `BaseUrl`, `ClassifyPath`, `TimeoutSeconds` — HTTP client to the classifier.  
  - `InternalToken` — must match the FastAPI service’s `INTERNAL_TOKEN` / `X-Internal-Token` (see `ai-service/README.md`).  
- **Startup (optional)**: set `StartupTasks:RunOnStartup` to `true` (e.g. in user secrets or env-specific JSON) to run EF **`Migrate()`**, **`MessageAiAssistBackfill`**, and **`AdminSeeder`** when the app starts. If omitted/false, apply the database with `dotnet ef database update` yourself.

## More

- EF migrations: `DeepwellEducation/Migrations/` — do not rename or delete migrations that may already be applied. Apply: `dotnet ef database update --project DeepwellEducation/DeepwellEducation.csproj`.  
- Frontend CSS guard: `powershell -ExecutionPolicy Bypass -File .\scripts\dev\check-app-css-header.ps1`  
- AI classifier API details and tests: **`ai-service/README.md`**
