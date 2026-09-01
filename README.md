# DHS App — Daily Habit System

<p align="center">
  <strong>Local-first progressive daily habit tracker untuk membantu membangun konsistensi ibadah dan kebiasaan harian.</strong>
</p>

<p align="center">
  <a href="https://github.com/baska-pro/dhs-app/actions/workflows/ci.yml"><img alt="CI" src="https://github.com/baska-pro/dhs-app/actions/workflows/ci.yml/badge.svg"></a>
  <a href="LICENSE"><img alt="License MIT" src="https://img.shields.io/badge/License-MIT-teal.svg"></a>
  <img alt="React 19" src="https://img.shields.io/badge/React-19-149eca.svg">
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5.8-3178c6.svg">
  <img alt="Vite" src="https://img.shields.io/badge/Vite-6-646cff.svg">
  <img alt="PWA" src="https://img.shields.io/badge/PWA-offline--first-0d9488.svg">
</p>

> Bahasa Inggris: [README.en.md](README.en.md)

## Fitur utama

- **Checklist harian progresif** untuk shalat wajib, amalan sunnah, tilawah, dzikir, hidrasi, aktivitas fisik, produktivitas, dan kebiasaan kustom.
- **Poin, level, target, dan streak** untuk membantu menjaga konsistensi tanpa mengubah data menjadi kompetisi publik.
- **Jadwal shalat lokal** dengan offset menit yang dapat disesuaikan pengguna.
- **Statistik dan heatmap** untuk tren poin, konsistensi, kualitas shalat, serta hidrasi.
- **Notifikasi dan pengingat** melalui Web Notifications API, service worker, dan fallback in-app.
- **Mode sibuk dan mode libur** untuk menyesuaikan target ketika rutinitas berubah.
- **Backup/restore JSON** dan export konfigurasi.
- **Cloud sync opsional** ke Google Sheets melalui Apps Script atau Supabase/PostgreSQL.
- **Local-first dan tanpa analytics pihak ketiga** pada fungsi utama.
- **PWA** dengan asset runtime lokal dan cache offline.

## Arsitektur penyimpanan

Secara default, data disimpan hanya di browser menggunakan `localStorage`. Cloud sync tidak wajib.

| Mode | Penyimpanan | Catatan |
|---|---|---|
| Lokal | Browser `localStorage` | Default, tanpa akun |
| Google Sheets | Spreadsheet milik pengguna via `Code.gs` | Access key opsional sangat disarankan |
| Supabase | PostgreSQL melalui REST API | RLS dibatasi dengan header `x-dhs-sync-key` |

Detail keamanan dan setup tersedia di [docs/CLOUD_SYNC.md](docs/CLOUD_SYNC.md).

## Persyaratan

- Node.js **20.19+**
- npm
- Browser modern dengan dukungan ES2022

## Instalasi lokal

```bash
git clone https://github.com/baska-pro/dhs-app.git
cd dhs-app
npm install
npm run dev
```

Aplikasi development berjalan pada `http://127.0.0.1:3000`.

Validasi sebelum build:

```bash
npm run check
```

Build produksi:

```bash
npm run build
npm run preview
```

## Setup Google Sheets

1. Buat Spreadsheet baru di `sheets.new`.
2. Buka **Extensions → Apps Script**.
3. Tempel seluruh isi [`Code.gs`](Code.gs).
4. Deploy sebagai **Web app** dengan **Execute as: Me** dan **Who has access: Anyone**.
5. Untuk proteksi tambahan, buat Script Property `DHS_ACCESS_KEY` berisi string acak panjang.
6. Jika access key dipakai, masukkan URL ke DHS App dalam format:

```text
https://script.google.com/macros/s/DEPLOYMENT_ID/exec?key=ACCESS_KEY_ANDA
```

7. Buka **Profil → Setup Database Cloud → Google Sheets**, lalu uji koneksi.

## Setup Supabase

1. Buat project Supabase pribadi/dedicated.
2. Buka **SQL Editor** dan jalankan [`schema.sql`](schema.sql).
3. Salin **Project URL** dan **anon/public key** dari pengaturan API.
4. Di DHS App masukkan Project URL, anon key, nama tabel, dan **Sync Key**.
5. Simpan Sync Key sebagai rahasia bersama; RLS menggunakan key ini untuk membatasi row yang dapat diakses.

Template SQL di aplikasi berasal langsung dari `schema.sql`, sedangkan tombol salin GAS berasal langsung dari `Code.gs`. Tidak ada salinan kedua yang dapat tertinggal versinya.

## PWA dan notifikasi

DHS App dapat diinstal sebagai PWA. Service worker menangani cache offline dan membantu menyimpan jadwal reminder. Namun browser dapat menghentikan service worker kapan saja; pengingat ketika aplikasi benar-benar tertutup bergantung pada kemampuan browser/platform. Lihat [docs/PWA_NOTIFICATIONS.md](docs/PWA_NOTIFICATIONS.md).

## Struktur proyek

```text
dhs-app/
├── .github/
│   ├── ISSUE_TEMPLATE/
│   ├── pull_request_template.md
│   └── workflows/ci.yml
├── components/              # UI React
├── docs/                    # Dokumentasi teknis
├── public/
│   ├── icon.svg
│   ├── manifest.webmanifest
│   └── sw.js
├── services/
│   ├── audio.ts
│   ├── cloudSync.ts
│   ├── notifications.ts
│   ├── prayer.ts
│   └── storage.ts
├── utils/
│   ├── date.ts
│   └── ids.ts
├── App.tsx
├── Code.gs                  # Sumber tunggal template Google Apps Script
├── schema.sql               # Sumber tunggal template Supabase
├── CHANGELOG.md
├── SECURITY.md
├── VERSION
└── package.json
```

## Script npm

| Perintah | Fungsi |
|---|---|
| `npm run dev` | Development server |
| `npm run typecheck` | TypeScript validation |
| `npm run build` | Production build |
| `npm run preview` | Preview hasil build |
| `npm run check` | Typecheck + build |

## Backup dan upgrade

Sebelum update versi besar atau mengubah cloud sync:

1. Export backup JSON dari aplikasi.
2. Simpan backup di luar browser.
3. Update aplikasi.
4. Pastikan tanggal hari ini, total poin, checklist, dan cloud sync masih sesuai.
5. Hapus backup lama hanya setelah data baru terverifikasi.

## Keamanan

Baca [SECURITY.md](SECURITY.md). Jangan commit data finansial/pribadi, backup pengguna, URL GAS pribadi, `DHS_ACCESS_KEY`, Supabase anon key project pribadi, atau Sync Key.

## Kontribusi

Lihat [CONTRIBUTING.md](CONTRIBUTING.md).

## Lisensi

MIT License — lihat [LICENSE](LICENSE).
