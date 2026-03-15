# WhatsApp Bot Keuangan Kegiatan (Baileys + SQLite)

## Update struktur file

- `index.js` (router utama + role + gate sewa + typo suggestion)
- `commands/help.js`
- `commands/owner.js` (`#broadcast`)
- `commands/customCommands.js` (support foto)
- `commands/reminder.js` (scheduler reminder)
- `commands/rental.js` (H-1 sewa)
- `commands/participants.js` (setheader dinamis)
- `commands/todo.js`
- `commands/weather.js`
- `db/database.js` (schema update)
- `utils/typo.js` (suggest command typo)

## Schema DB utama (baru/diupdate)

- `custom_commands`: tambah `media_type`, `media_path`, `caption_text`
- `group_rentals`: tambah `last_h1_warning_at`
- `group_settings`: pakai `header_text`, `weather_location`
- `reminders`: tambah `created_by`
- `reminder_dispatch`: anti duplikat reminder scheduler

## Logic inti

### 1) Silent rental gate
Jika grup tidak aktif sewa dan pengirim bukan owner => bot **diam** (tidak membalas).

### 2) Owner command yang tetap jalan
- `#infogroup`
- `#aktif`
- `#nonaktif`
- `#statussewa`
- `#broadcast`

### 3) Typo suggestion
Jika command typo tapi mirip (Levenshtein), bot memberi saran command paling dekat.

### 4) Broadcast owner
`#broadcast@(pesan)` mengirim ke seluruh group_id pada tabel rental.

### 5) Reminder H-1 sewa habis
Jika sisa 1 hari, kirim peringatan 1x per grup (pakai `last_h1_warning_at`).

### 6) Custom command foto
Jika `command KEYWORD@(text)` dibuat sambil kirim/reply foto:
- media didownload ke folder lokal `media/commands`
- path disimpan di DB
- saat keyword dipanggil, bot kirim foto + caption

## Contoh pemakaian

- `help`
- `setheader@PESERTA\nOPEN TRIP PAPANDAYAN\nTanggal: 28 Maret 2026`
- `addpeserta Radit@(No HP: 08xxx | Kota: Bogor)`
- `command TERIMAKASIH@thank you sudah order di DitsStore` (sambil foto)
- `terimakasih` (trigger kirim foto+caption)
- `remind 05:00@bangun sholat subuh`
- `todo tambah revisi skripsi`
- `doto 1`
- `weather`
- `lokweather Bogor`
- `#broadcast@Assalamualaikum, maintenance malam ini pukul 23.00 WIB.`

## Cara run

```bash
npm install
npm start
```
