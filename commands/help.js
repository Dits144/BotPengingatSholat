function menuText() {
  return [
    '📚 *MENU BOT OPENTRIP*',
    '',
    '👥 *Perintah User*',
    '• listpeserta / listpeserta 2',
    '• ketik angka (contoh: 4) untuk detail peserta dari list terakhir',
    '• riwayat / riwayat 50 / riwayat hari ini',
    '• tambah 100 50 | kurang 100 20 | kali 10 5 | bagi 10 4',
    '• ketik keyword custom (exact match)',
    '',
    '🛠️ *Perintah Admin Grup / Owner*',
    '• + 15000 (catatan), - 12000 (catatan)',
    '• saldo | saldo hari ini | saldo bulan ini',
    '• edit 2 - 10000 (catatan), hapus 3, detail 1',
    '• addpeserta Nama@(Data)',
    '• updatepeserta no 4@(Data baru)',
    '• delpeserta no 4',
    '• setheader@(teks header list peserta)',
    '• command KEYWORD@OUTPUT',
    '• delcommand KEYWORD',
    '• listcommand | detailcommand KEYWORD',
    '• remind 05:00@bangun sholat subuh',
    '• remind 17/08/2026@Peringatan Kemerdekaan Indonesia',
    '• listremind | noremind 05:00',
    '• todo tambah revisi skripsi',
    '• todo lihat / todolist',
    '• todo selesai 2 / doto 2',
    '• lokweather Bogor',
    '',
    '🌤️ *Cuaca*',
    '• weather (default lokasi Jakarta / lokasi grup)'
  ].join('\n');
}

module.exports = { menuText };
