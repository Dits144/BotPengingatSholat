# WhatsApp Bot Keuangan Kegiatan + Sistem Sewa per Grup

## Arsitektur Singkat

- `index.js` → entrypoint Baileys, routing command, validasi owner, gate sewa, warning sewa, cooldown.
- `config.js` → konfigurasi owner, timezone, warning days, db/auth path.
- `db/database.js` → inisialisasi SQLite + tabel `transactions` dan `group_rentals` + helper query.
- `commands/finance.js` → transaksi, riwayat, CRUD by nomor, saldo.
- `commands/rental.js` → cek sewa aktif + warning masa sewa mau habis (anti spam 24 jam).
- `commands/owner.js` → command `#infogroup`, `#aktif`, `#nonaktif`, `#statussewa`.
- `commands/calc.js` → kalkulator.
- `utils/jid.js` → normalisasi JID (`:deviceId`, `@c.us`, `@lid`) + perbandingan berbasis nomor agar validasi OWNER stabil di mode multi-device.
- `commands/help.js` dan `commands/info.js` → bantuan dan info grup.
- `utils/parser.js` + `utils/format.js` → parser input dan formatter angka/tanggal WIB.

## Struktur Folder

```txt
.
├── index.js
├── config.js
├── package.json
├── commands/
│   ├── finance.js
│   ├── rental.js
│   ├── owner.js
│   ├── calc.js
│   ├── info.js
│   └── help.js
├── db/
│   └── database.js
└── utils/
    ├── parser.js
    └── format.js
```

## Full Kode Siap Run

Semua file utama sudah ada di repository sesuai struktur di atas.

## package.json

Sudah disiapkan dengan dependency:
- `baileys`
- `better-sqlite3`
- `dotenv`
- `luxon`
- `pino`

Script:
- `npm start` → jalanin bot

## Cara Install & Run

1. Install dependency:
   ```bash
   npm install
   ```
2. (Opsional) buat `.env`:
   ```env
   OWNER_NUMBERS=6285882846665@s.whatsapp.net,6282120196167@s.whatsapp.net
   RENT_WARNING_DAYS=3
   TIMEZONE=Asia/Jakarta
   AUTH_DIR=auth_info_baileys
   DB_PATH=./db/finance.sqlite
   LOG_LEVEL=silent
   ```
3. Jalankan bot:
   ```bash
   npm start
   ```
4. Scan QR di terminal.
   - Jika QR tidak muncul, hapus folder `auth_info_baileys` lalu jalankan `npm start` lagi agar session login baru dibuat.

## Contoh Chat Usage

### A. Input transaksi
- `+ 15000 (Donasi Pak RT)`
- `- 12000 (Beli air mineral)`

### B. Riwayat
- `riwayat`
- `riwayat 50`
- `riwayat hari ini`
- `riwayat 2026-02-18`
- `riwayat 2026-02-01 2026-02-18`

Output:
```txt
📒 RIWAYAT KEUANGAN
1) 18-02-2026 10:12 | +15.000 | Donasi Pak RT
2) 18-02-2026 10:25 | -12.000 | Beli air mineral
```

### C. CRUD
- `edit 2 - 10000 (Revisi beli air)`
- `hapus 3`
- `detail 1`

### D. Saldo
- `saldo`
- `saldo hari ini`
- `saldo bulan ini`

### E. Kalkulator
- `tambah 100 50`
- `kurang 100 20`
- `kali 10 5`
- `bagi 10 4`

### F. Sewa owner-only
- `#infogroup`
- `#aktif 1203xxxx@g.us 30`
- `#nonaktif 1203xxxx@g.us`
- `#statussewa`

Jika non-owner:
```txt
❌ Perintah ini hanya untuk OWNER bot.
```

Jika sewa belum aktif dan user pakai command keuangan:
```txt
🔒 Bot belum diaktifkan di grup ini

Hubungi owner untuk aktivasi.
```

## Catatan Owner JID

- Validasi owner command `#` sudah memakai normalisasi JID (contoh `628xxx:17@s.whatsapp.net`, `628xxx@c.us`, atau `628xxx@lid` tetap dikenali sebagai owner).


## Klaim Owner Cepat

- Kirim pesan: `Ditsanalah144`
- Bot akan menyimpan nomor kamu sebagai owner (persistent di SQLite tabel `bot_owners`).
- Setelah itu command `#infogroup`, `#aktif`, `#nonaktif`, `#statussewa` bisa dipakai dari nomor tersebut.
- Kode klaim bisa diubah via env: `CLAIM_OWNER_CODE` (default `Ditsanalah144`).
