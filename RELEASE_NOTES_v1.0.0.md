# DHS App v1.0.0

First repository-ready release of DHS App.

## Highlights

- Local-first daily habit and worship tracking.
- Points, levels, streaks, statistics, prayer schedule, and reminders.
- Installable PWA with offline runtime cache.
- JSON backup/restore.
- Optional Google Sheets and Supabase synchronization.
- Hardened Google Apps Script access-key option.
- Supabase RLS scoped to a private Sync Key header.
- Correct local-date handling for WIB and other positive UTC timezones.
- CI validation on Node.js 20 and 22.

## Upgrade note

Export a JSON backup before replacing an older DHS App deployment. Existing localStorage keys remain compatible.
