# Cloud Sync

DHS App is local-first. Cloud sync is optional and should never replace a separate JSON backup.

## Google Sheets / Apps Script

### Install

1. Create a Google Sheet.
2. Open **Extensions → Apps Script**.
3. Paste the full contents of `Code.gs`.
4. Deploy as a Web App with **Execute as: Me** and **Who has access: Anyone**.
5. Copy the `/exec` URL into DHS App.

### Recommended access key

In Apps Script **Project Settings → Script Properties**, add:

```text
DHS_ACCESS_KEY = a-long-random-secret
```

Then store this URL in DHS App:

```text
https://script.google.com/macros/s/DEPLOYMENT_ID/exec?key=a-long-random-secret
```

If the property is absent, the script remains backward-compatible but possession of the deployment URL is enough to attempt read/write operations.

### Data model

`DHS_Backup` stores the complete JSON state. `DHS_Daily_Logs` stores a human-readable daily summary. Spreadsheet text fields are sanitized against leading formula characters to reduce spreadsheet formula-injection risk.

## Supabase

### Install

1. Create a dedicated Supabase project.
2. Run `schema.sql` in SQL Editor.
3. Copy Project URL and anon/public key.
4. Enter Project URL, anon key, table name, and Sync Key in DHS App.

### RLS model

Every Supabase request includes:

```text
x-dhs-sync-key: <Sync Key>
```

RLS permits access only when this header equals the row's `sync_key`. Without a matching key the row is not visible or writable.

Sync Key baru dibuat dari byte acak kriptografis ketika Web Crypto tersedia. Key lama tetap diterima untuk kompatibilitas, tetapi key baru jangan dipendekkan atau dipublikasikan.

### Custom table names

Custom table names are limited to lowercase letters, numbers, and underscores and must begin with a letter. This protects generated SQL and REST paths from malformed identifiers.

## Restore behavior

Pull/restore merges cloud logs with local logs by date, with cloud entries taking precedence for matching date keys. User settings are merged with the current local cloud-sync configuration.

Before a major restore:

1. export a JSON backup;
2. verify the target Sync Key/account;
3. pull data;
4. inspect recent logs and totals;
5. keep the backup until verification is complete.
