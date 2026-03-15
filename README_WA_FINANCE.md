# WhatsApp Bot Keuangan Kegiatan (Baileys + SQLite)

## Perubahan Struktur Folder

```txt
.
├── index.js
├── config.js
├── package.json
├── db/
│   └── database.js
├── commands/
│   ├── finance.js
│   ├── participants.js
│   ├── customCommands.js
│   ├── reminder.js
│   ├── todo.js
│   ├── weather.js
│   ├── rental.js
│   ├── owner.js
│   ├── calc.js
│   ├── help.js
│   └── info.js
└── utils/
    ├── jid.js
    ├── format.js
    └── parser.js
```

## Schema Database Baru / Update

- `group_rentals`: status sewa grup (gate utama).
- `transactions`: data keuangan.
- `participants`: data peserta.
- `custom_commands`: keyword -> response + `media_url`, `media_type`.
- `group_settings`: `header_text`, `weather_location`.
- `reminders`: jadwal reminder (`remind_type`, `remind_value`, `remind_text`, `created_by`).
- `reminder_dispatch`: anti duplikat kirim reminder otomatis.
- `todos`: todo list grup.
- `bot_owners`: daftar owner dinamis.

## Aturan Gate Sewa
Jika grup belum aktif / expired:
- command user/admin diblok (menu/help/listpeserta/riwayat/saldo/kalkulator/todo/reminder/weather/custom command).
- Bot balas:

```txt
🔒 BOT BELUM DIAKTIFKAN

Bot belum aktif di grup ini atau masa sewa sudah habis.

Hubungi owner untuk aktivasi.

Perintah owner:
#aktif (idgrup) (hari)
```

Yang tetap jalan hanya command `#...` dan hanya owner.

## Role

### USER
- `listpeserta`
- `riwayat`
- kalkulator (`tambah/kurang/kali/bagi`)
- jalankan keyword custom (exact)
- `weather` / `cuaca`
- `todolist` / `todo lihat`

### ADMIN GROUP
- `addpeserta`, `updatepeserta`, `delpeserta`
- transaksi keuangan (`+`, `-`, `saldo`, `edit/hapus/detail`)
- `command`, `delcommand`, `setheader`
- `todo tambah`, `todo selesai`, `doto`
- `remind`, `listremind`, `noremind`
- `lokweather`

### OWNER
- semua akses + command `#infogroup`, `#aktif`, `#nonaktif`, `#statussewa`

## Fitur Baru / Perbaikan

### 1) Help lebih rapi + emoji
- menu dipisah USER / ADMIN / REMINDER / TODO / CUACA.
- claim owner dihapus dari help.

### 2) Kalkulator UX
Jika user ketik hanya `tambah` / `kurang` / `kali` / `bagi`:

```txt
🧮 FORMAT KALKULATOR

tambah 10 5
kurang 10 5
kali 10 5
bagi 10 5
```

### 3) Header peserta dinamis
- default header dipakai jika belum diset.
- admin bisa set:
  - `setheader@(text)`

### 4) Custom command bisa foto
- Simpan command text: `command KEYWORD@(text)`
- Jika command dibuat sambil reply foto, media disimpan.
- Saat keyword dipanggil:
  - jika ada media: kirim foto + caption
  - jika tidak: kirim text saja

### 5) Reminder otomatis (Asia/Jakarta)
- tambah reminder:
  - `remind 05:00@bangun sholat subuh` (harian)
  - `remind 17/08/2026@Peringatan Kemerdekaan` (tanggal)
- list: `listremind`
- hapus: `noremind 05:00`
- bot kirim otomatis saat waktunya.

### 6) To-Do List
- tambah: `todo tambah revisi skripsi`
- lihat: `todolist` / `todo lihat`
- selesai: `todo selesai 1` atau `doto 1`

### 7) Weather
- cek: `weather` / `cuaca`
- ubah lokasi: `lokweather Bogor` atau share lokasi dengan caption `lokweather`

## Cara Run

```bash
npm install
npm start
```

## Error Handling & Parsing
- validasi format command dengan regex + pesan contoh.
- soft delete untuk data mutable (participant/custom/reminder/todo/transaksi).
- fallback pesan error umum saat exception.
