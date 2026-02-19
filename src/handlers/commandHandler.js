const { DateTime } = require('luxon');
const { doaList, motivasiList } = require('../constants/messages');
const { env } = require('../config/env');
const { addOrUpdateRental, deactivateRentalById, getRentalByUser, listRentals } = require('../services/rentalService');
const { getTodaySchedule } = require('../services/prayerService');
const { getDayStatus, monthlyRecap, resetDayStatus, resolvePending } = require('../services/trackingService');
const { formatListStatus, formatRecapBulanan, formatSchedule, parsePrayerFromText } = require('../utils/formatter');
const { displayNumber, normalizeUserJid } = require('../utils/jid');

const randomOf = (arr) => arr[Math.floor(Math.random() * arr.length)];
const isOwner = (sender) => sender === normalizeUserJid(env.ownerNumber);

async function handleCommand(sock, sender, chatId, text) {
  const lower = text.trim().toLowerCase();
  const parts = text.trim().split(/\s+/);

  if (lower.startsWith('addsewa')) {
    if (!isOwner(sender)) return;
    const target = parts[1];
    const days = Number(parts[2]);
    if (!target || Number.isNaN(days)) return sock.sendMessage(chatId, { text: 'Format: addsewa 628xxxxxx@c.us 5' });
    const jid = normalizeUserJid(target);
    addOrUpdateRental(jid, days);
    return sock.sendMessage(chatId, { text: `✅ Sewa untuk ${displayNumber(jid)} aktif ${days} hari.` });
  }

  if (lower.startsWith('delsewa')) {
    if (!isOwner(sender)) return;
    const ok = deactivateRentalById(Number(parts[1]));
    return sock.sendMessage(chatId, { text: ok ? '✅ Sewa dinonaktifkan.' : 'ID tidak ditemukan.' });
  }

  if (lower === 'listsewa' && isOwner(sender)) {
    const today = DateTime.now().setZone(env.timezone).startOf('day');
    const lines = ['📋 *DATA SEWA BOT SHOLAT*', ''];
    for (const item of listRentals()) {
      const diff = Math.ceil(DateTime.fromISO(item.end_date).startOf('day').diff(today, 'days').days);
      lines.push(`${item.id}. ${displayNumber(item.user_jid)}`);
      lines.push(`   Sisa: ${item.active === 0 || diff < 0 ? 'Habis' : `${diff} hari`}`);
      lines.push('');
    }
    return sock.sendMessage(chatId, { text: lines.join('\n') });
  }

  if (lower === 'waktusholat') return sock.sendMessage(chatId, { text: formatSchedule(await getTodaySchedule()) });
  if (lower === 'listsholat' || lower === 'status') return sock.sendMessage(chatId, { text: formatListStatus(getDayStatus(sender)) });
  if (lower === 'rekapbulan') return sock.sendMessage(chatId, { text: formatRecapBulanan(monthlyRecap(sender)) });
  if (lower === 'resetsholat') {
    resetDayStatus(sender);
    return sock.sendMessage(chatId, { text: '✅ Data sholat hari ini direset.' });
  }
  if (lower === 'motivasi') return sock.sendMessage(chatId, { text: `✨ ${randomOf(motivasiList)}` });
  if (lower === 'doa') return sock.sendMessage(chatId, { text: randomOf(doaList) });

  if (lower === 'ceksewa') {
    const rental = getRentalByUser(sender);
    if (!rental) return sock.sendMessage(chatId, { text: 'Kamu belum terdaftar sewa bot.' });
    const diff = Math.ceil(DateTime.fromISO(rental.end_date).startOf('day').diff(DateTime.now().setZone(env.timezone).startOf('day'), 'days').days);
    return sock.sendMessage(chatId, { text: `📌 Sisa sewa kamu: ${rental.active === 0 || diff < 0 ? 'Habis' : `${diff} hari`}` });
  }

  if (lower.startsWith('✅ sudah') || lower.startsWith('sudah')) {
    const resolved = resolvePending(sender, true, parsePrayerFromText(lower));
    return sock.sendMessage(chatId, { text: resolved ? 'MasyaAllah 🤍\nSemoga Allah menerima sholatmu dan melapangkan rezekimu hari ini.\nTetap istiqomah ya!' : 'Belum ada pengingat sholat yang menunggu jawaban.' });
  }

  if (lower.startsWith('❌ belum') || lower.startsWith('belum')) {
    const resolved = resolvePending(sender, false, parsePrayerFromText(lower));
    return sock.sendMessage(chatId, { text: resolved ? 'Yuk segera sholat 🙏\nSholat itu penenang hati.\nAllah sedang menunggumu menghadap-Nya 🤍' : 'Belum ada pengingat sholat yang menunggu jawaban.' });
  }

  if (lower === 'menu' || lower === 'help') {
    return sock.sendMessage(chatId, { text: [`🤖 *${env.botName}*`, '', 'Perintah:', '- waktusholat', '- listsholat / status', '- rekapbulan', '- resetsholat', '- motivasi', '- doa', '- ceksewa', '- sudah <subuh/dzuhur/ashar/maghrib/isya>', '- belum'].join('\n') });
  }
}

module.exports = { handleCommand };
