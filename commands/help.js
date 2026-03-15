function menuText() {
  return [
    '🤖 BOT KEUANGAN KEGIATAN',
    '',
    '👤 USER COMMAND',
    '📋 listpeserta',
    '📒 riwayat',
    '🧮 kalkulator (tambah, kurang, kali, bagi)',
    '⚡ jalankan keyword command',
    '🌤 weather / cuaca',
    '📝 todolist / todo lihat',
    '',
    '👑 ADMIN GROUP',
    '➕ addpeserta',
    '✏️ updatepeserta',
    '❌ delpeserta',
    '💰 + / - transaksi, saldo, edit/hapus/detail',
    '📌 command (buat keyword)',
    '🗑 delcommand',
    '📄 listcommand',
    '⚙ setheader',
    '',
    '📅 REMINDER',
    '⏰ remind',
    '📋 listremind',
    '❌ noremind',
    '',
    '📝 TO DO LIST',
    '➕ todo tambah',
    '📋 todolist',
    '✔ doto',
    '',
    '🌤 CUACA',
    'weather',
    'lokweather'
  ].join('\n');
}

module.exports = { menuText };
