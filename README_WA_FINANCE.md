# WhatsApp Bot Opentrip (Baileys + SQLite)

## Update utama
- ✅ Semua command grup non-owner akan terkunci jika grup belum aktif sewa.
- ✅ Menu/help dirapikan + emoji, tanpa menampilkan claim owner.
- ✅ Role command dipisah jelas (user vs admin/owner).
- ✅ Header list peserta bisa di-custom (`setheader@...`).
- ✅ Fitur reminder, todo, weather + lokasi cuaca.

## Struktur folder (update)

```txt
commands/
  finance.js
  participants.js
  customCommands.js
  reminder.js
  todo.js
  weather.js
  rental.js
  owner.js
  calc.js
  info.js
  help.js
utils/
  jid.js
  format.js
  parser.js
db/
  database.js
index.js
config.js
```

## Schema DB tambahan
- `participants` => id, group_id, name, data, created_at, updated_at, deleted_at
- `custom_commands` => id, group_id, keyword, response, created_at, updated_at, deleted_at
- `group_settings` => group_id, participant_header, weather_location, updated_at
- `reminders` => id, group_id, remind_type, remind_value, remind_text, created_at, deleted_at
- `todos` => id, group_id, todo_text, is_done, created_at, updated_at, deleted_at

## Role perintah

### 👤 User
- `listpeserta`, `listpeserta 2`
- kirim nomor (detail peserta dari list terakhir)
- `riwayat`, `riwayat 50`, dst
- kalkulator: `tambah`, `kurang`, `kali`, `bagi`
- trigger custom keyword (exact match)
- `weather`

### 🛠️ Admin Grup / Owner
- semua perintah user +
- transaksi keuangan (`+/-`, `saldo`, `edit/hapus/detail`)
- `addpeserta`, `updatepeserta`, `delpeserta`
- `setheader@...`
- `command`, `delcommand`, `listcommand`, `detailcommand`
- `remind`, `listremind`, `noremind`
- `todo tambah`, `todo selesai`, `doto`, `todo lihat`, `todolist`
- `lokweather`

## Fitur peserta (header default + custom)

Default header list peserta:

```txt
PESERTA
KEGIATAN OPENTRIP
NAMA KEGIATAN

🗓️ Tanggal: -
⏰ Durasi: -
📍 Meeting Point: -
```

Custom header:
- `setheader@PESERTA\nONE DAY TRIP\nMOUNT PAPANDAYAN\n\n🗓️ Tanggal: 28 Maret 2026\n⏰ Durasi: 1 Hari (PP)\n📍 Meeting Point: Kab.Bogor`

## Reminder
- `remind 05:00@bangun sholat subuh`
- `remind 17/08/2026@Peringatan Kemerdekaan Indonesia`
- `listremind`
- `noremind 05:00`

Timezone: Asia/Jakarta.

## Todo
- `todo tambah revisi skripsi`
- `todo lihat` / `todolist`
- `todo selesai 2`
- `doto 1`

## Cuaca
- `weather` (default Jakarta atau lokasi grup yang sudah diset)
- `lokweather Bogor`

## Cara run
```bash
npm install
npm start
```
