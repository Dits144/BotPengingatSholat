# WhatsApp Bot Pengingat Sholat (Baileys + SQLite)

Bot WhatsApp production-ready berbasis **Node.js + TypeScript + Baileys** dengan fitur:

- Pengingat sholat otomatis (Subuh, Dzuhur, Ashar, Maghrib, Isya)
- Tracking ibadah harian per user
- Rekap bulanan sholat
- Sistem sewa (aktif/nonaktif otomatis)
- Perintah owner (`addsewa`, `delsewa`, `listsewa`)
- Perintah user (`status`, `listsholat`, `rekapbulan`, `waktusholat`, `motivasi`, `doa`, `ceksewa`, `resetsholat`)
- Auto reconnect WhatsApp
- Logging error dan scheduler berjalan stabil

## 1) Struktur Folder

```bash
src2/
├── bot/
│   └── whatsappBot.ts
├── config/
│   ├── constants.ts
│   └── env.ts
├── db/
│   └── database.ts
├── services/
│   ├── prayerApiService.ts
│   ├── rentalService.ts
│   ├── texts.ts
│   └── trackingService.ts
└── index.ts
```

## 2) Setup

```bash
npm install
```

Buat file `.env`:

```env
OWNER_NUMBER=62812xxxxxxx
OWNER_GROUP_ID=120363423664469094@g.us
TIMEZONE=Asia/Jakarta
LOCATION_LABEL=Sasakpanjang Tajurhalang Bogor
LATITUDE=-6.4699
LONGITUDE=106.7019
DB_PATH=./data/bot.sqlite
```

Lalu jalankan:

```bash
npm run dev
```

Scan QR dari terminal untuk koneksi WhatsApp.

## 3) Perintah Bot

### Owner
- `addsewa 628xxxxxx@c.us 5`
- `delsewa 1`
- `listsewa`

### User
- `status` / `listsholat`
- `rekapbulan`
- `waktusholat`
- `motivasi`
- `doa`
- `ceksewa`
- `resetsholat`
- Respon pengingat: `sudah isya`, `belum dzuhur`, dll.

## 4) Database Schema (SQLite)

Tabel otomatis dibuat saat bot start:

- `rentals`: data masa sewa user
- `daily_status`: status 5 waktu sholat per hari
- `pending_prompts`: tracking pesan pertanyaan sholat yang belum dijawab
- `prayer_schedule`: cache jadwal sholat harian dari API Aladhan

## 5) Deploy VPS

1. Upload project ke VPS
2. Install Node.js 20+
3. Jalankan:

```bash
npm install
npm run build
npm start
```

4. Gunakan PM2 agar proses tetap hidup:

```bash
npm i -g pm2
pm2 start dist/index.js --name bot-sholat
pm2 save
pm2 startup
```

## 6) Ganti Owner

Edit `.env` bagian:

- `OWNER_NUMBER`
- `OWNER_GROUP_ID`

## 7) Ubah Lokasi Jadwal Sholat

Edit `.env`:

- `LOCATION_LABEL`
- `LATITUDE`
- `LONGITUDE`
- `TIMEZONE`

Bot mengambil jadwal dari **Aladhan API** berdasarkan koordinat.

---

Semoga bermanfaat dan jadi amal jariyah 🤍
