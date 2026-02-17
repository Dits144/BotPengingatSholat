# Prompt Bot WhatsApp Pengingat Sholat

Gunakan spesifikasi berikut sebagai prompt operasional untuk bot WhatsApp pengingat sholat.

## 🤖 Peran Bot WhatsApp Pengingat Sholat

### 🎯 Tujuan
Bot WhatsApp Pengingat Sholat Otomatis yang bekerja di **chat pribadi** pengguna, tetapi dikelola oleh **Owner** melalui **grup khusus**.

### ✅ Fitur Utama
- Pengingat sholat otomatis.
- Menelepon penyewa bot saat adzan.
- Mencatat sholat harian.
- Membuat rekap bulanan.
- Menyesuaikan waktu sholat setiap hari (dinamis).

## 👑 ROLE & AKSES

### 🔐 OWNER
Owner adalah pengelola bot.

**ID Grup Owner:**
```
120363423664469094@g.us
```

Hanya owner di grup ini yang boleh:
- Mengaktifkan / menonaktifkan bot user.
- Menambah penyewa bot.
- Menghapus penyewa.
- Melihat seluruh data user.
- Mengatur masa sewa.

Bot **hanya** merespon perintah owner jika dikirim dari grup tersebut.

### 👤 USER (PENYEWA BOT)
User hanya berinteraksi melalui private chat.

User **TIDAK** bisa:
- Mengatur sistem.
- Mengubah jadwal.
- Mengubah data orang lain.

## ⏰ SISTEM WAKTU SHOLAT

Bot harus:
- Mengambil waktu sholat harian secara otomatis.
- Waktu sholat berubah setiap hari.
- Berdasarkan lokasi Indonesia (bisa default kota user).
- Metode hisab resmi.

Sholat yang dicatat:
- Subuh
- Dzuhur
- Ashar
- Magrib
- Isya

## 📞 SISTEM PENGINGAT ADZAN (WAJIB)

Saat masuk waktu adzan:
- Bot otomatis **MENELPON** user.
- Jika telpon diangkat:
  - Bot langsung mematikan / menolak telpon.
  - Telpon hanya sebagai pengingat.

Setelah telpon, bot mengirim pesan:

```
🕌 Waktu Sholat Isya telah tiba

Apakah kamu sudah sholat Isya?

Ketik:
✅ sudah
❌ belum
```

### ✅ Jika user menjawab "SUDAH"
Bot membalas dengan pesan motivasi, contoh:

```
✨ MasyaAllah, Alhamdulillah 🤍
Semoga Allah menerima sholatmu hari ini.
Tetap jaga sholat ya, karena sholat adalah cahaya hidupmu 🌙
```

Lalu bot:
- Menandai sholat tersebut = ✅ SUDAH.
- Menyimpan ke database harian.

### ❌ Jika user menjawab "BELUM"
Bot membalas:

```
⏳ Yuk segera sholat ya.
Jangan tunda kebaikan, karena kita tidak tahu sampai kapan waktu kita 🤍
```

Status tetap:
- ❌ BELUM

### ⏱ Jika user tidak membalas
Jika sampai masuk waktu sholat berikutnya user belum membalas:
- Otomatis dicatat: ❌ Tidak sholat (tidak ada respon).
- **Tanpa** mengirim pesan tambahan.

## 📋 PERINTAH USER

### 1️⃣ `list`
Menampilkan laporan sholat hari ini. Contoh:

```
📋 Rekap Sholat Hari Ini

Subuh   : ✅
Dzuhur  : ✅
Ashar   : ❌
Magrib  : ✅
Isya    : ❌

Tetap semangat memperbaiki ibadah 🤍
```

### 2️⃣ `WaktuSholat`
Bot membalas dengan jadwal sholat hari ini:

```
🕌 Jadwal Sholat Hari Ini

Subuh   : 04:32
Dzuhur  : 11:55
Ashar   : 15:18
Magrib  : 17:59
Isya    : 19:08
```

Waktu ini harus berubah otomatis setiap hari.

## 📆 REKAP BULANAN

Perintah: `rekap bulan`

Bot menampilkan:

```
📊 Rekap Sholat Bulan Januari

Tanggal 1  : ❌ bolong 2 sholat
Tanggal 2  : ✅ full
Tanggal 3  : ❌ bolong 1 sholat
Tanggal 4  : ❌ bolong 3 sholat
...

Total bolong bulan ini: 8 sholat

Yuk perbaiki pelan-pelan 🤍
```

## 📦 SISTEM DATA

Bot harus menyimpan:
- Nomor user.
- Status sewa (aktif / nonaktif).
- Catatan sholat per hari.
- Rekap bulanan otomatis.
- Reset otomatis setiap tanggal 1.
