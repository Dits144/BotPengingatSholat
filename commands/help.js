function menuText() {
  return [
    '🤖 MENU BOT KEUANGAN KEGIATAN',
    '',
    '*Input Transaksi (butuh sewa aktif):*',
    '+ 15000 (Donasi Pak RT)',
    '- 12000 (Beli air mineral)',
    '',
    '*Keuangan:*',
    'riwayat | riwayat 50 | riwayat hari ini',
    'riwayat 2026-02-18 | riwayat 2026-02-01 2026-02-18',
    'edit 2 - 10000 (Revisi beli air)',
    'hapus 3 | detail 1',
    'saldo | saldo hari ini | saldo bulan ini',
    '',
    '*Kalkulator:*',
    'tambah 100 50',
    'kurang 100 20',
    'kali 10 5',
    'bagi 10 4',
    '',
    '*Owner command (#):*',
    '#infogroup [idgrup]',
    '#aktif idgrup hari',
    '#nonaktif idgrup',
    '#statussewa'
  ].join('\n');
}

module.exports = { menuText };
