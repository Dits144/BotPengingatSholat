# Ditstore Bot (WhatsApp + Baileys)

Bot WhatsApp untuk operasional order produk digital Ditstore (fokus grup).

## Jalankan
```bash
npm install
npm start
```

## Login Barcode/QR
Saat start, bot menampilkan QR di terminal. Scan QR agar session tersimpan di `./auth` (multi-file auth).

## Aturan umum command
- Prefix utama: `a` → contoh `a sticker`
- Alias pakai `|` di registry → contoh `a spdl` sama dengan `a spotifydl`
- `<...>` wajib diisi, `[...]` opsional
- Nomor pakai format internasional `628xxxx`
- Mention tag: `@628xxxx`

## Claim owner lintas grup
Ketik kode berikut di grup mana pun untuk claim owner pertama:
```text
qwertyuiopasdfghjklzxcvbnm
```
Atau command:
```text
a claimowner qwertyuiopasdfghjklzxcvbnm
```

## Format error seragam
Untuk command yang butuh argumen, bot membalas template:
```text
Format salah ❌

Contoh: a <cmd> <format_benar>

Keterangan singkat
```
Contoh khusus:
```text
Format salah ❌

Contoh: a addlist Capcut Pro@1 bulan private@35000

Note: gunakan @ sebagai pemisah.
```

## Data lokal
- `data/owner.json`
- `data/store.json`
- `data/orders.json`
- `data/users.json`
- `data/groups.json`
