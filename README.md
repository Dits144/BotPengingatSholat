# Bot Pengingat Sholat WhatsApp (JavaScript + Baileys)

## 1) Install
```powershell
cd C:\xampp\htdocs\BotSholat
npm install
```

## 2) Setup ENV
Copy `.env.example` jadi `.env` lalu isi minimal `OWNER_GROUP_JID`.
`OWNER_JID` opsional.

`REMINDER_TEXT` sekarang otomatis support newline asli dari `\n`.

## 3) Jalankan Bot
```powershell
npm start
```

## 4) Scan QR
- Buka WhatsApp > Linked devices > Link a device
- Scan QR yang muncul di terminal.

## Owner Commands (di group owner)
- `addsewa 628xxxx@c.us 5`
- `nonaktifsewa 628xxxx@c.us`
- `listsewa`
- `helpsholat`

Saat `addsewa` berhasil, bot otomatis kirim notif ke user:
`✅ Bot sholat kamu sudah aktif...`

## User Commands (private chat)
- `waktusholat`
- `listsholat` / `status`
- `rekapbulan`
- `ceksewa`
- `motivasi`
- `doa`
- `sudah isya / sudah subuh / sudah dzuhur / sudah ashar / sudah maghrib`
- `belum`
- `helpsholat`

Jika user salah ketik command, bot akan membalas:
`Perintah tidak dikenali. Ketik helpsholat untuk melihat command.`

---

## ✅ LANGKAH MENJALANKAN (ringkas)
1. Masuk folder:
```powershell
cd C:\xampp\htdocs\BotSholat
```

2. Install:
```powershell
npm install
```

3. Buat `.env` dari `.env.example`, isi owner/group.

4. Start:
```powershell
npm start
```

5. Scan QR yang tampil.

### Kalau QR tidak muncul
```powershell
rmdir /s /q auth
npm start
```
