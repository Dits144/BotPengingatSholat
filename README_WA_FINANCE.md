# WhatsApp Bot Keuangan + Peserta Opentrip + Custom Command

## Arsitektur Singkat

- `index.js`: entrypoint Baileys, routing command, auth owner/admin, sewa grup, auto-response.
- `db/database.js`: schema SQLite + helper DB.
- `commands/finance.js`: fitur keuangan (input transaksi, riwayat, CRUD, saldo).
- `commands/participants.js`: fitur peserta opentrip (list, detail via nomor cache, add/update/delete).
- `commands/customCommands.js`: keyword custom per grup (save/list/detail/delete + trigger exact-match).
- `commands/owner.js`: command owner `#infogroup`, `#aktif`, `#nonaktif`, `#statussewa`.
- `commands/rental.js`: status sewa + warning masa sewa.
- `commands/calc.js`: kalkulator.
- `utils/`: parser/format/jid helper.

## Struktur Folder (update)

```txt
.
├── index.js
├── config.js
├── package.json
├── db/
│   └── database.js
├── commands/
│   ├── finance.js
│   ├── participants.js      # baru
│   ├── customCommands.js    # baru
│   ├── rental.js
│   ├── owner.js
│   ├── calc.js
│   ├── help.js
│   └── info.js
└── utils/
    ├── parser.js
    ├── format.js
    └── jid.js
```

## Schema DB (SQLite)

### `transactions`
- `id`, `group_id`, `type`, `amount`, `note`, `sender_id`, `sender_name`, `created_at`, `edited_at`, `deleted_at`

### `group_rentals`
- `group_id`, `is_active`, `start_at`, `expire_at`, `updated_by`, `updated_at`, `last_warned_at`

### `bot_owners`
- `user_number`, `user_jid`, `claimed_at`

### `participants` (baru)
- `id`, `group_id`, `name`, `data`, `created_at`, `updated_at`, `deleted_at`

### `custom_commands` (baru)
- `id`, `group_id`, `keyword`, `response`, `created_at`, `updated_at`, `deleted_at`

## Cara Run

1. Install dependency:
```bash
npm install
```

2. (Opsional) `.env`:
```env
OWNER_NUMBERS=6285882846665@s.whatsapp.net,6282120196167@s.whatsapp.net
CLAIM_OWNER_CODE=Ditsanalah144
RENT_WARNING_DAYS=3
TIMEZONE=Asia/Jakarta
AUTH_DIR=auth_info_baileys
DB_PATH=./db/finance.sqlite
LOG_LEVEL=silent
```

3. Jalankan:
```bash
npm start
```

4. Scan QR di terminal.

## Contoh Pemakaian Chat (input → output)

### A) Peserta Opentrip

#### 1) `listpeserta`
**Input**
```txt
listpeserta
```

**Output**
```txt
PESERTA
ONE DAY TRIP
MOUNT PAPANDAYAN

🗓️ Tanggal: 28 Maret 2026
⏰ Durasi: 1 Hari (PP)
📍 Meeting Point: Kab.Bogor

List of names:
1) Andi
2) Budi
...
14) Siti

Ketik nomor untuk lihat data peserta.
Ketik listpeserta 2 untuk halaman 2.
```

#### 2) Detail dari nomor list terakhir
**Input**
```txt
4
```

**Output**
```txt
👤 DETAIL PESERTA #4
Nama: Siti
Data:
No HP: 08xxx | Alamat: ...
```

#### 3) Tambah peserta (admin/owner)
**Input**
```txt
addpeserta Raditya@(No HP: 08xxx | Alamat: ... | Info: ...)
```

**Output**
```txt
✅ Peserta ditambahkan
Nama: Raditya
No urut: 15
```

#### 4) Update peserta (admin/owner)
**Input**
```txt
updatepeserta no 4@(No HP: ... | Update data ...)
```

**Output**
```txt
✏️ Peserta #4 berhasil diupdate
```

#### 5) Delete peserta (admin/owner)
**Input**
```txt
delpeserta no 4
```

**Output**
```txt
🗑️ Peserta #4 berhasil dihapus
```

### B) Custom Command

#### 1) Simpan command (admin/owner)
**Input**
```txt
command RAB@RAB OT Papandayan Dst
```

**Output**
```txt
✅ Command "RAB" disimpan
```

#### 2) List command
**Input**
```txt
listcommand
```

**Output**
```txt
📌 LIST COMMAND
1) RAB
2) HTM
3) RULES
```

#### 3) Detail command
**Input**
```txt
detailcommand RAB
```

**Output**
```txt
📌 DETAIL COMMAND RAB
RAB OT Papandayan Dst
```

#### 4) Hapus command (admin/owner)
**Input**
```txt
delcommand RAB
```

**Output**
```txt
🗑️ Command "RAB" dihapus
```

#### 5) Auto trigger exact match
Jika user kirim pesan persis:
```txt
RAB
```
Bot balas output command `RAB` di grup tersebut.

---

## Hak Akses Ringkas

- `listpeserta`, ketik nomor detail, `listcommand`, `detailcommand`: semua member.
- `addpeserta`, `delpeserta`, `updatepeserta`, `command`, `delcommand`: admin grup atau owner bot.
- Keuangan (`+/-`, `riwayat`, `saldo`, `edit`, `hapus`, `detail`): hanya jika sewa grup aktif.
