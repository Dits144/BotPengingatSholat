const { DateTime } = require('luxon');
const { labels, prayers } = require('../constants/messages');

function formatSchedule(schedule) {
  return ['🕌 *JADWAL SHOLAT HARI INI*', `Lokasi: ${schedule.location}`, '', `Subuh : ${schedule.subuh}`, `Dzuhur : ${schedule.dzuhur}`, `Ashar : ${schedule.ashar}`, `Maghrib : ${schedule.maghrib}`, `Isya : ${schedule.isya}`, `Imsak : ${schedule.imsak}`].join('\n');
}

function formatPrayerPrompt(prayer) {
  return [`🕌 *WAKTU SHOLAT ${labels[prayer].toUpperCase()} TELAH TIBA*`, '', 'Apakah kamu sudah sholat?', '', 'Ketik:', `✅ sudah ${prayer}`, '❌ belum'].join('\n');
}

function formatListStatus(row) {
  const icon = (v) => (v === 1 ? '✅' : v === 0 ? '❌' : '⏳ Belum');
  return ['📊 *REKAP SHOLAT HARI INI*', '', `Subuh : ${icon(row.subuh)}`, `Dzuhur : ${icon(row.dzuhur)}`, `Ashar : ${icon(row.ashar)}`, `Maghrib : ${icon(row.maghrib)}`, `Isya : ${icon(row.isya)}`].join('\n');
}

function formatRecapBulanan(items) {
  if (!items.length) return '📅 *Belum ada data sholat bulan ini.*';
  const lines = ['📅 *REKAP SHOLAT BULAN INI*', ''];
  let total = 0;
  for (const item of items) {
    lines.push(`${DateTime.fromISO(item.date).toFormat('d LLL')} : ${item.full ? 'Full' : `Bolong ${item.bolong}`}`);
    total += item.bolong;
  }
  lines.push('', `Total bolong bulan ini: ${total} sholat`);
  return lines.join('\n');
}

function parsePrayerFromText(text) {
  const lower = text.toLowerCase();
  return prayers.find((p) => lower.includes(p));
}

module.exports = { formatSchedule, formatPrayerPrompt, formatListStatus, formatRecapBulanan, parsePrayerFromText };
