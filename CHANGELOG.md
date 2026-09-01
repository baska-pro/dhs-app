# Changelog

All notable changes to DHS App are documented here.

## 1.0.0 - 2026-09-01

### Added
- Production repository structure, CI validation, security policy, contribution guide, and release metadata.
- Local Tailwind/Vite build without runtime Tailwind CDN.
- Standard PWA manifest and local application icon.
- Offline runtime caching and persisted service-worker reminder queue.
- Cryptographically generated Supabase Sync Keys when Web Crypto is available.
- RLS policy scoped by `x-dhs-sync-key`.
- Optional Google Apps Script `DHS_ACCESS_KEY` protection.
- Local calendar-date helper to prevent UTC/WIB date drift.

### Fixed
- Daily records could resolve to the previous date around midnight in positive UTC timezones.
- Factory reset previously used `localStorage.clear()` and could remove unrelated origin storage.
- Duplicate root/public service-worker files.
- Duplicate Supabase JSX block in cloud database settings.
- Google Sheets sync could report success even when Apps Script returned an error payload.
- First-run service-worker scheduling could occur before the worker was active.
- Embedded GAS/SQL templates could drift from `Code.gs` and `schema.sql`.

### Changed
- Node.js requirement standardized to 20.19+.
- Vite config no longer injects unused Gemini API environment variables.
- Supabase table names and project URLs are validated before requests.
