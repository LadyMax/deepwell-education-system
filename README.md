# DeepwellEducation

Role-based language school management system built with ASP.NET Core Web API, EF Core, and a static HTML/CSS/JS frontend.

## Tech Stack
- ASP.NET Core Web API (.NET 8)
- EF Core + SQLite
- HTML/CSS/JS frontend (server-hosted static files)

## Core Features
- Role-based access (Visitor / Student / Admin)
- Course request workflow with approval
- Messaging workflow with category support
- Student profile and enrollment management

## Repository Structure
- `DeepwellEducation/` - Web API project and static frontend resources
- `DeepwellEducation.Tests/` - Automated tests
  - `Integration/` - Controller/integration tests
  - `Unit/` - Service-level unit tests
  - `TestSupport/` - Shared test factory/auth helpers
- `scripts/dev/` - Developer utility scripts used during normal development
- `scripts/legacy/` - Historical migration helpers kept for reference only
- `docs/` - Project documentation and maintenance conventions
  - `docs/licenses/` - Third-party template/vendor license texts

See `docs/repo-structure.md` for detailed file placement rules.
See `docs/frontend-pages.md` for frontend page-level inventory.

## Local Development
1. Restore/build:
   - `dotnet restore`
   - `dotnet build`
2. Run tests:
   - `dotnet test "DeepwellEducation.Tests/DeepwellEducation.Tests.csproj"`
3. Run app:
   - `dotnet run --project "DeepwellEducation/DeepwellEducation.csproj"`

## Configuration Notes
- Main local DB connection is configured in `DeepwellEducation/appsettings.json`:
  - `Data Source=Data/DeepwellEducation.db`
- Environment-specific secrets should stay out of source control.
- `DeepwellEducation/appsettings.Development.json` is ignored; use
  `DeepwellEducation/appsettings.Development.json.example` as a template.

## Frontend CSS Guard
Use the dev script to detect accidental `app.css` header/import duplication:

- `powershell -ExecutionPolicy Bypass -File ".\\scripts\\dev\\check-app-css-header.ps1"`

## Migrations Maintenance
- Keep migration history under `DeepwellEducation/Migrations/`.
- Do not rename or delete already-applied migrations.
- Add focused migration names that describe intent (for example, `AddStudentProfileDetails`).
- Verify with:
  - `dotnet ef database update`
  - `dotnet test`
