# Frontend Page Inventory

This file tracks page-level responsibilities under
`DeepwellEducation/wwwroot/frontend/`.

## Root Page Entries

- `index.html` - Public home page (hero, featured courses, testimonial carousel).
- `about.html` - Public organization introduction and testimonial section.
- `course.html` - Public course catalog and language filtering.
- `course-detail.html` - Public single-course detail view.
- `language-detail.html` - Public language and country context page.
- `contact.html` - Public contact and map page.
- `login.html` - Authentication page (login/register flows).
- `student.html` - Student dashboard/account area.
- `admin.html` - Staff dashboard (enrollment queue, messages, courses, students by course, search user / account lookup, password change).

## Shared Layout Fragments

- `partials/header.html` - Shared navigation/header loaded by `js/layout.js`.
- `partials/footer.html` - Shared footer/back-to-top loaded by `js/layout.js`.

## Asset Directories

- `css/` - Application and template stylesheets.
- `js/` - Frontend runtime modules and page logic.
- `js/shared-dom.js` - `DeepwellDom.escapeHtml`; load synchronously in `<head>` before `layout.js` / `course-ui.js` / `shared-dashboard.js` so body scripts see it.
- `js/shared-password-ui.js` - Password visibility toggles and authenticated change-password flow (`DeepwellPasswordUi`); load after `api.js`, before `login.js` / `admin.js` / `student.js`.
- `js/shared-dashboard.js` - Shared labels for `admin.js` / student modules; requires `shared-dom.js`, load before those page scripts.
- `js/admin-common.js` … `js/admin-messages.js` - Staff dashboard modules on `window.DeepwellAdmin`; load after `shared-dashboard.js`, in order: `admin-common` → `admin-ai-format` → `admin-users` → `admin-course-requests` → `admin-courses` → `admin-messages`, then `admin.js`.
- `js/student-enrollments.js` … `js/student-profile.js` - Student dashboard modules on `window.DeepwellStudent`; load after `shared-dashboard.js`, in order: `student-enrollments` → `student-messages` → `student-profile`, then `student.js`.
- `images/` - Image assets.
- `lib/` - Third-party frontend libraries.

## Notes

- Prefer relative asset URLs without a leading `./` (for example `js/api.js`, `css/app.css`) across HTML entry pages for consistency.
- Keep the `frontend` root focused on page entry files and top-level asset
  directories only.
- Place licenses and maintenance documents in `docs/` (for example,
  `docs/licenses/`), not in `frontend` root.
