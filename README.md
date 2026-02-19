# WhatsApp Bot Pengingat Sholat (Node.js + Baileys)

Bot WhatsApp yang **stabil, modular, dan siap production** dengan fitur:
- Pengingat sholat otomatis ke private chat.
- Sistem sewa user (aktif/nonaktif otomatis).
- Tracking ibadah harian.
- Rekap bulanan.
- Jadwal sholat dinamis (Aladhan API).

## 1) Stack
- Node.js + TypeScript
- Baileys (WhatsApp Web API)
- SQLite (`better-sqlite3`)
- `node-cron` untuk scheduler
- Luxon untuk timezone Asia/Jakarta

## 2) Struktur Folder

```txt
src/
  config/
    env.ts
  constants/
    messages.ts
  db/
    database.ts
  handlers/
    commandHandler.ts
  scheduler/
    scheduler.ts
  services/
    prayerService.ts
    rentalService.ts
    trackingService.ts
  utils/
    formatter.ts
    jid.ts
  index.ts
```

## 3) Fitur & Perintah

### Owner (akses penuh)
- `addsewa 628xxxxxx@c.us 5`
- `delsewa 1`
- `listsewa`

Owner number di `.env` lewat `OWNER_NUMBER`.
Group pengelola default:
`120363423664469094@g.us`

### User
- `waktusholat`
- `listsholat`
- `status`
- `rekapbulan`
- `resetsholat`
- `motivasi`
- `doa`
- `ceksewa`
- `sudah subuh` / `✅ sudah isya`
- `belum` / `❌ belum`

## 4) Database Schema (SQLite)
- `rentals`: data sewa user.
- `prayer_status`: status sholat per user per tanggal.
- `pending_prompts`: prompt sholat yang menunggu jawaban.
- `schedule_cache`: cache jadwal sholat harian.
- `sent_notifications`: anti-duplikasi notifikasi.

Semua schema dibuat otomatis saat bot start (`initDb()`).

## 5) Cara Install

```bash
npm install
cp .env.example .env
```

Edit `.env` sesuai kebutuhan.

## 6) Menjalankan Bot

### Development
```bash
npm run dev
```

### Production
```bash
npm run build
npm start
```

Saat pertama run, terminal menampilkan QR terbaru dari Baileys. Scan dengan WhatsApp yang akan jadi bot.

## 7) Deploy VPS (Ubuntu)

1. Install Node.js 20+.
2. Upload source ke server.
3. Install dependency:
   ```bash
   npm install
   ```
4. Build:
   ```bash
   npm run build
   ```
5. Jalankan via PM2:
   ```bash
   npm i -g pm2
   pm2 start dist/index.js --name bot-sholat
   pm2 save
   pm2 startup
   ```

## 8) Cara Ganti Owner
Ubah `.env`:
```env
OWNER_NUMBER=628xxxxxxxxxx
```
Format angka tanpa `+`.

## 9) Cara Ubah Lokasi Jadwal Sholat
Ubah `.env`:
```env
PRAYER_ADDRESS=Sasakpanjang Tajurhalang Bogor
TIMEZONE=Asia/Jakarta
PRAYER_METHOD=11
```
Bot akan ambil jadwal baru otomatis setiap hari (dan bisa dipanggil manual lewat `waktusholat`).

## 10) Catatan Operasional
- Bot hanya memproses:
  - Private chat user.
  - Group owner (`OWNER_GROUP_ID`) untuk command owner.
- Jika sewa habis, bot berhenti kirim reminder dan kirim notifikasi masa sewa habis.
- Jika user tidak menjawab sampai jadwal sholat berikutnya, status sebelumnya otomatis `❌`.
