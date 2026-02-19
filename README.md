# WhatsApp Bot Pengingat Sholat (JavaScript + Baileys)

Bot WhatsApp berbasis **Node.js JavaScript** (tanpa TypeScript) dengan fitur:
- Pengingat sholat otomatis.
- Sistem sewa user.
- Tracking ibadah harian.
- Rekap bulanan.
- Jadwal sholat dinamis dari Aladhan API.

## Stack
- Node.js (JavaScript CommonJS)
- `@whiskeysockets/baileys`
- SQLite (`better-sqlite3`)
- `node-cron`
- `axios`

## Struktur Folder

```txt
src/
  bootstrap/setup.js
  config/env.js
  constants/messages.js
  db/database.js
  handlers/commandHandler.js
  scheduler/scheduler.js
  services/
    prayerService.js
    rentalService.js
    trackingService.js
  utils/
    formatter.js
    jid.js
  index.js
```

Setelah build:

```txt
dist/
  ...copy dari src...
  index.js
```

## Install & Jalankan

```bash
npm install
cp .env.example .env
npm run build
npm start
```

> `npm start` otomatis menjalankan `prestart` (`npm run build`) supaya `dist/index.js` selalu ada.

## Development

```bash
npm run dev
```

## Deploy VPS

```bash
npm install
npm run build
npm start
```

Atau pakai PM2:

```bash
pm2 start dist/index.js --name bot-sholat
```
