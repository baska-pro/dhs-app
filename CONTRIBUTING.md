# Contributing

## Local validation

```bash
git clone https://github.com/baska-pro/dhs-app.git
cd dhs-app
npm install
npm run check
```

Development server:

```bash
npm run dev
```

## Rules

- Keep the app local-first.
- Do not commit real user data, backups, private screenshots, deployment URLs, API credentials, access keys, or Sync Keys.
- `Code.gs` is the canonical Google Apps Script source. The in-app copy action imports it with Vite `?raw`.
- `schema.sql` is the canonical Supabase schema source. The in-app SQL copy action derives from it.
- Keep `VERSION`, `package.json`, `CHANGELOG.md`, and release notes consistent.
- Run `npm run check` before submitting substantial changes.
- Avoid adding third-party analytics or tracking without explicit user-facing consent and documentation.

## Pull requests

Describe the problem, behavior change, validation performed, and any migration impact. For UI changes, include sanitized screenshots when available.
