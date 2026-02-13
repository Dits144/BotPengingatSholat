# Telegram Bot Manajemen Akun Digital

Refactor total bot untuk role-based flow (ADMIN/USER), manajemen stok akun, proses beli/sewa, tracking masa sewa, dan notifikasi rental otomatis.

## Stack
- Node.js + TypeScript + Telegraf (Scenes/Wizard)
- Knex + SQLite (default), bisa upgrade ke PostgreSQL
- Enkripsi credential: AES-256-GCM (`ENCRYPTION_KEY`)

## Struktur Utama

```txt
src/
  bot/
    handlers/      # /start /login /logout /admin /menu
    scenes/        # addProduct, addAccount, buy, rent, myRentals
    keyboards/
    middlewares/
  services/
    authService.ts
    productService.ts
    accountService.ts
    rentalService.ts
    saleService.ts
    logService.ts
  scheduler/
    rentalNotifier.ts
  db/
    migrate.ts
    migrations/001_init.sql
    models/types.ts
  utils/
  config/
```

## Command
- `/start`
- `/login admin` atau `/login user` (password: `ditstore`)
- `/logout`
- `/admin`
- `/menu`

## Fitur
- Login role disimpan ke tabel `users` (tidak perlu login ulang setiap command).
- Admin:
  - Tambah Produk
  - Tambah Akun stok (pilih produk via tombol, input email/password, input expire date `YYYY-MM-DD` atau durasi)
  - List stok available per produk
  - List akun terjual/disewa aktif
  - List akun rent expired / expired + tombol kembalikan ke AVAILABLE
- User:
  - Lihat produk + stok
  - Beli (qty integer 1/2/3, FEFO)
  - Sewa (preset 7/30 hari, 1 bulan, atau custom)
  - Status sewa saya + riwayat
- Scheduler rental:
  - cek tiap 1 menit
  - notifikasi 24 jam sebelum habis
  - notifikasi 1 jam sebelum habis
  - saat habis: rental status `ENDED`, account status `RENT_EXPIRED`

## Stabilitas SQLite
- `PRAGMA journal_mode=WAL`
- `PRAGMA busy_timeout=5000`
- pool sqlite `max=1`

## Run
```bash
npm install
cp .env.example .env
npm run migrate
npm run dev
```
