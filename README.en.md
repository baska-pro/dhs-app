# DHS App — Daily Habit System

DHS App is a **local-first progressive daily habit tracker** focused on prayer routines, daily habits, points, statistics, reminders, backup/restore, and optional self-hosted cloud synchronization.

> Indonesian documentation: [README.md](README.md)

## Highlights

- Daily prayer and habit checklist
- Points, levels, targets, and streak tracking
- Configurable prayer-time offsets
- Charts and calendar heatmaps
- Browser notifications and in-app reminders
- Busy and holiday modes
- JSON backup/restore
- Optional Google Sheets and Supabase sync
- Installable PWA with offline runtime caching
- No required third-party analytics or AI runtime integration

## Requirements

- Node.js 20.19+
- npm
- Modern ES2022-capable browser

## Local development

```bash
git clone https://github.com/baska-pro/dhs-app.git
cd dhs-app
npm install
npm run check
npm run dev
```

Production build:

```bash
npm run build
npm run preview
```

## Cloud sync

Google Sheets uses [`Code.gs`](Code.gs). The optional `DHS_ACCESS_KEY` Apps Script property can protect read/write operations beyond possession of the deployment URL alone.

Supabase uses [`schema.sql`](schema.sql). Its RLS policy scopes anonymous access to the row matching the `x-dhs-sync-key` request header. Treat the Sync Key as a shared secret.

See [docs/CLOUD_SYNC.md](docs/CLOUD_SYNC.md) and [SECURITY.md](SECURITY.md).

## PWA reminders

The service worker caches application resources and persists the reminder queue. Browser background execution is still platform-dependent; guaranteed closed-app delivery requires a real push service. See [docs/PWA_NOTIFICATIONS.md](docs/PWA_NOTIFICATIONS.md).

## License

MIT License. See [LICENSE](LICENSE).
