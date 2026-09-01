# Security Policy

## Local-first data model

DHS App stores profile, checklist logs, and settings in browser `localStorage` by default. This is application storage, **not encrypted vault storage**. Anyone with control of the browser profile/device may be able to inspect it.

## Google Apps Script

The Apps Script Web App normally needs **Who has access: Anyone** so the browser can call it without Google authentication.

`Code.gs` supports an optional Script Property named `DHS_ACCESS_KEY`. When configured, read/write actions require the same key through the Web App URL query parameter:

```text
?key=YOUR_ACCESS_KEY
```

Treat the full URL and key as sensitive. The access key is a lightweight shared-secret layer, not a replacement for a full identity/authentication system.

## Supabase

The bundled schema uses the public/anon API key but does **not** use `USING (true)`. RLS compares each row's `sync_key` against the `x-dhs-sync-key` request header.

This substantially limits accidental/public row enumeration, but the Sync Key remains a bearer secret. Anyone who possesses the Project URL, anon key, and Sync Key can access that vault.

For public multi-user deployments, use Supabase Auth and per-user RLS instead of the bundled personal-use model.

## Browser notifications

Service workers are controlled by the browser. DHS App cannot guarantee that a worker remains alive indefinitely. Do not rely on the reminder system for emergency, medical, legal, or other safety-critical alerts.

## Repository hygiene

Never commit:

- real user backup files;
- private screenshots containing personal information;
- Google Apps Script deployment URLs with access keys;
- `DHS_ACCESS_KEY` values;
- private Supabase project credentials or Sync Keys;
- `.env` files;
- browser storage dumps.

## Reporting

For a security report, provide sanitized reproduction steps and avoid posting real personal data or credentials in public issues.
