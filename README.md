# Ditstore Bot (WhatsApp + Baileys)

Bot WhatsApp untuk operasional order produk digital Ditstore, fokus pemakaian di grup.

## Jalankan

```bash
npm install
npm start
```

## Login bot (barcode/QR)
Saat `npm start`, bot akan menampilkan barcode QR di terminal (`printQRInTerminal: true`).
Scan QR tersebut dari WhatsApp agar sesi login tersimpan di folder `./auth` (multi-file auth).

## Konfigurasi

```bash
cp .env.example .env
```

Data lokal otomatis dibuat:
- `data/owner.json`
- `data/store.json`
- `data/orders.json`
- `data/users.json`
- `data/groups.json`

## Claim owner di semua grup
Claim owner pertama bisa dilakukan dari grup mana pun dengan mengetik code berikut:

```text
qwertyuiopasdfghjklzxcvbnm
```

Alternatif command tetap didukung:

```text
a claimowner qwertyuiopasdfghjklzxcvbnm
```

Setelah owner ter-claim, klaim berikutnya ditolak sampai di-reset manual pada `data/owner.json`.

## Format command
- Prefix utama: `a`
- Shortcut store: `.p`, `.d`, `.b`, `.r`
