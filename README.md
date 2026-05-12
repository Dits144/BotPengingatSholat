# DITSTORE - Telegram Bot E-Commerce Digital

Bot Telegram untuk jualan layanan premium (BUY + RENT) dengan saldo, topup QRIS manual approval, stok terenkripsi, dan panel admin.

## Tech Stack
- Node.js + TypeScript + Telegraf
- Database: PostgreSQL/SQLite (via Knex)
- Enkripsi stok: AES-256-GCM (`ENCRYPTION_KEY`)
- Timezone default: `Asia/Jakarta`

## Struktur Project

```txt
src/
  bot/
    index.ts                # command/callback/message handler utama
    keyboards.ts            # inline keyboard user
    middlewares/rateLimit.ts
    types.ts
  config/
    env.ts
    database.ts
  db/
    migrate.ts
    migrations/001_init.sql
  services/
    storeService.ts         # transaksi, topup, checkout, scheduler rental
  utils/
    encryption.ts
    date.ts
    format.ts
    mask.ts
  index.ts                  # launcher bot
.env.example
```

## Fitur Utama
- `/start` dengan box ASCII + statistik dari DB.
- List produk paginasi 10 item + input angka + pencarian.
- Detail produk + variasi harga/stok + refresh realtime.
- `/saldo` + topup QRIS (`CREATED -> PENDING -> APPROVED/REJECTED`).
- Approval topup oleh owner/admin.
- Checkout anti-double-spend memakai DB transaction.
- BUY: kirim akun stok sekali.
- RENT: simpan masa aktif dan scheduler notifikasi H-3/H-1 + expired.
- `/admin` dashboard ringkas A-J + audit log.
- Semua nominal integer rupiah.
- Log transaksi (`transaction_logs`), error (`error_logs`), audit admin (`audit_logs`).

## Database Schema
Lihat: `src/db/migrations/001_init.sql`.

Tabel minimal tersedia:
`users, products, variants, stock_items, invoices, invoice_items, topups, rentals, vouchers, audit_logs` (+ tabel log/error/admin).

## Cara Menjalankan

```bash
npm install
cp .env.example .env
npm run migrate
npm run dev
```

Production:
```bash
npm run build
npm start
```

## Seed Data Cepat (opsional)
Contoh SQL manual:
```sql
INSERT INTO products(name,description,category,active) VALUES('ALIGHT MOTION','PRIVATE / SHARING / VOUCHER','EDITING',1);
INSERT INTO variants(product_id,name,price,stock_type,duration_days,max_qty,active)
VALUES(1,'35 Hari',2500,'RENT',35,5,1);
```

## Sample Output Text

```txt
╭─ LIST PRODUK
┊ [ 1 ] ALIGHT MOTION
┊ [ 2 ] CAPCUT PRO
╰────────────
Halaman 1 dari 1
Ketik angka untuk buka detail produk.
```

```txt
TOP-UP SALDO BERHASIL ✅
╭─ Detail Transaksi
┊ ID Transaksi: TOPUP-173000000
┊ Jenis: Top-Up Saldo
┊ Nominal: Rp 10.000
┊ Total Bayar: Rp 10.000
┊ Saldo saat ini: Rp 125.000
╰────────────
```

## Catatan Kepatuhan
Gunakan sistem ini hanya untuk penjualan akses/akun yang punya izin resmi. Jika tidak, gunakan mode stok berupa voucher/kode lisensi resmi.

## Bonus yang sudah ditambahkan
- 🔎 Cari produk dari keyword.
- Riwayat transaksi sudah tercatat di `transaction_logs`.
- Pondasi auto announcement restock bisa dibuat dari trigger perubahan `stock_items`.

## Admin Module Baru
Struktur admin sekarang dipisah rapi:
- `src/admin/adminAuth.ts` (auth admin + audit log)
- `src/admin/adminMenu.ts` (renderer teks + inline keyboard)
- `src/admin/adminRouter.ts` (routing callback `admin:*`)
- `src/admin/adminFlows.ts` (state machine input text/photo)
- `src/admin/adminState.ts` (persist state admin di DB `admin_states`)

Contoh callback mapping:
- `admin:home`, `admin:dashboard`, `admin:products`, `admin:stock`, `admin:topup`
- `admin:orders`, `admin:rentals`, `admin:users`, `admin:vouchers`, `admin:broadcast`, `admin:settings`
- Upload QRIS: `admin:settings:qris` -> state `ADMIN_SETTINGS_QRIS_WAIT_PHOTO` -> simpan `settings.qris_file_id`.
