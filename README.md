# Bot Pengingat Sholat WhatsApp (JavaScript)

Project ini sudah dirombak total ke **JavaScript CommonJS** dan **build script lintas OS** (Windows/Linux/Mac).

## Kenapa sekarang tidak error `rm is not recognized`?
Karena build **tidak** pakai command shell `rm/cp` lagi.
Build sekarang pakai Node script: `node scripts/build.js`.

## Struktur Project

```txt
scripts/
  build.js
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
dist/
  ...hasil build dari src...
```

## Install

```bash
npm install
cp .env.example .env
```

Windows PowerShell:
```powershell
copy .env.example .env
```

## Jalankan

```bash
npm start
```

`npm start` akan otomatis:
1. build dulu (`prestart`)
2. jalankan `node dist/index.js`

## Perintah penting

```bash
npm run build
npm run dev
npm start
```

## Deploy VPS

```bash
npm install
npm run build
npm start
```

PM2:
```bash
pm2 start dist/index.js --name bot-sholat
```

## Catatan
- Jika login pertama, QR akan tampil di terminal.
- Folder `data`, `cache`, `auth`, `logs` dibuat otomatis saat startup.
