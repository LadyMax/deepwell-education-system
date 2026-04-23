# DeepwellEducation

Role-based language school management: ASP.NET Core 8 Web API, EF Core + SQLite, and a static HTML/CSS/JS frontend served from `wwwroot/frontend/`.

## Stack and features

- **Backend**: .NET 8, EF Core, SQLite, JWT auth  
- **Frontend**: server-hosted static assets under `wwwroot/frontend/`  
- **Domain**: Visitor / Student / Admin; course join/leave requests and approval; messaging with categories; student profile and enrollments  
- **Optional**: `ai-service/` for message classification (pytest runs in CI)

## Repository layout

| Path | Purpose |
|------|---------|
| `DeepwellEducation/` | Web app and static frontend |
| `DeepwellEducation.Tests/` | Unit and integration tests |
| `scripts/dev/` | Day-to-day dev scripts |
| `docs/` | Conventions and notes (`repo-structure.md`, `frontend-pages.md`, etc.) |

## Local run

```bash
dotnet restore
dotnet build
dotnet test "DeepwellEducation.Tests/DeepwellEducation.Tests.csproj"
dotnet run --project "DeepwellEducation/DeepwellEducation.csproj"
```

Pushes and pull requests on GitHub run `.github/workflows/ci.yml` (dotnet test + ai-service tests).

## Configuration

- **Database**: `ConnectionStrings:DefaultConnection` in `DeepwellEducation/appsettings.json` points at SQLite, default file `Data/DeepwellEducation.db`.  
- **Local overrides**: copy `appsettings.Development.json.example` to `appsettings.Development.json` (usually gitignored).  
- **JWT**: `Jwt:Key` in `appsettings.json` is a **development/demo placeholder** (meets the 32+ character check so the app runs after clone). For **production or any public host**, set a strong random key (e.g. environment variable `Jwt__Key`); never use the repo default.

## More

- EF migrations live under `DeepwellEducation/Migrations/`; do not rename or delete migrations that may already be applied. Apply: `dotnet ef database update`.  
- Guard against duplicate `app.css` headers: `powershell -ExecutionPolicy Bypass -File ".\scripts\dev\check-app-css-header.ps1"`  
- AI classifier: see `ai-service/README` for install, run, and tests.
