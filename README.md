# Ditstore Bot (WhatsApp + Baileys)

Bot WhatsApp untuk operasional order produk digital Ditstore, fokus pemakaian di grup.

## Jalankan

```bash
npm install
npm start
```

> Jika `npm install` dibatasi policy registry, gunakan mirror/private registry internal.

## Konfigurasi

Copy env:

```bash
cp .env.example .env
```

Data lokal akan otomatis dibuat:
- `data/owner.json`
- `data/store.json`
- `data/orders.json`
- `data/users.json`
- `data/groups.json`

Saat first run, password owner acak dicetak ke console saja.

## Claim owner

```text
a claimowner <password>
```

Setelah owner ter-claim, command OWNER hanya bisa dipakai JID owner tersebut.

## Format command
- Prefix utama: `a`
- Shortcut store: `.p`, `.d`, `.b`, `.r`

## Contoh respons
1. `a allmenu` -> tampil box status bot + detail grup + profil user + daftar command.
2. `a addlist` (tanpa argumen):
   ```
   Format salah ❌
   Contoh: a addlist capcut@(deskripsi)
   Keterangan: gunakan @ untuk pisahkan nama dan deskripsi.
   ```
3. `a claimowner salahpassword`:
   ```
   ❌ Password claimowner salah.
   ```
4. `a claimowner <password_benar>`:
   ```
   ✅ Berhasil claim owner. Akses OWNER aktif untuk akun ini.
   ```
