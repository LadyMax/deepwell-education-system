# Repository Structure and Cleanup Rules

This document defines where files should live so the repository stays maintainable.

## Directory Conventions

- `DeepwellEducation/`
  - Main ASP.NET Core application code
  - `Controllers/`, `Services/`, `Data/`, `Domain/`, `Security/`, `Migrations/`
  - `wwwroot/frontend/` static frontend
- `DeepwellEducation.Tests/`
  - `Integration/` for API/integration tests
  - `Unit/` for service/business logic tests
  - `TestSupport/` for shared test utilities/factories
- `scripts/dev/`
  - Scripts intended for daily/regular development checks
- `scripts/legacy/`
  - Historical one-off migration helpers; do not use in normal workflows
- `docs/`
  - Ongoing maintenance standards and operational notes
  - `licenses/` for third-party template/vendor license texts

## Frontend File Rules

- `wwwroot/frontend/css/app.css` is an entrypoint only.
  - It should contain only the import block for `app.*.css`.
- Actual styles belong to modular files:
  - `app.tokens.css`
  - `app.theme.css`
  - `app.utilities.css`
  - `app.shared.css`
  - `app.dashboard.css`
  - `app.tables.css`
  - `app.forms.css`
  - `app.flash.css`
  - `app.auth-menu.css`
- Keep third-party assets in `wwwroot/frontend/lib/`.
  - Remove unused vendor files to reduce noise and payload.
- Keep `wwwroot/frontend/` root focused on page entry files (`*.html`).
  - Move license texts to `docs/licenses/`.
  - Remove or archive unused one-off media assets.

## Migration Rules

- Keep all EF migrations in `DeepwellEducation/Migrations/`.
- Do not rename/delete old migrations that may already be applied.
- Add one migration per cohesive schema change.
- Use intention-revealing migration names.

## Script Rules

- Put regular checks in `scripts/dev/`.
- Keep legacy scripts in `scripts/legacy/` with clear warning comments.
- If a script path changes, update README command examples in the same PR.

## Pre-PR Verification Checklist

- `dotnet test "DeepwellEducation.Tests/DeepwellEducation.Tests.csproj"` passes.
- `scripts/dev/check-app-css-header.ps1` passes.
- No unexpected `LanguageSchool` naming leftovers outside legacy scripts.
- No local build outputs or databases staged for commit (`bin/`, `obj/`, `*.db`).
