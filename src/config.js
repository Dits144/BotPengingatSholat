require('dotenv').config();

function must(name, fallback = '') {
  const v = process.env[name] ?? fallback;
  if (!v) throw new Error(`ENV ${name} wajib diisi`);
  return v;
}

module.exports = {
  OWNER_JID: process.env.OWNER_JID ?? '',
  OWNER_GROUP_JID: must('OWNER_GROUP_JID'),
  LAT: parseFloat(process.env.LAT ?? '-6.464'),
  LON: parseFloat(process.env.LON ?? '106.778'),
  TIMEZONE: process.env.TIMEZONE ?? 'Asia/Jakarta',
  REMINDER_TEXT:
    process.env.REMINDER_TEXT ??
    '🕌 Waktu {prayer} sudah masuk.\n\nApakah kamu sudah sholat?\nKetik:\n✅ sudah {cmd}\n❌ belum'
};
