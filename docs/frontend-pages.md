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
- `admin.html` - Staff/admin dashboard.

## Shared Layout Fragments

- `partials/header.html` - Shared navigation/header loaded by `js/layout.js`.
- `partials/footer.html` - Shared footer/back-to-top loaded by `js/layout.js`.

## Asset Directories

- `css/` - Application and template stylesheets.
- `js/` - Frontend runtime modules and page logic.
- `images/` - Image assets.
- `lib/` - Third-party frontend libraries.

## Notes

- Keep the `frontend` root focused on page entry files and top-level asset
  directories only.
- Place licenses and maintenance documents in `docs/` (for example,
  `docs/licenses/`), not in `frontend` root.
