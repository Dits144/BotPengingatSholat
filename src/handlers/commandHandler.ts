import { DateTime } from 'luxon';
import { doaList, motivasiList } from '../constants/messages';
import { env } from '../config/env';
import { addOrUpdateRental, deactivateRentalById, getRentalByUser, listRentals } from '../services/rentalService';
import { getTodaySchedule } from '../services/prayerService';
import { getDayStatus, monthlyRecap, resetDayStatus, resolvePending } from '../services/trackingService';
import { formatListStatus, formatRecapBulanan, formatSchedule, parsePrayerFromText } from '../utils/formatter';
import { displayNumber, normalizeUserJid } from '../utils/jid';

function randomOf<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function isOwner(sender: string) {
  return sender === normalizeUserJid(env.ownerNumber);
}

export async function handleCommand(sock: any, sender: string, chatId: string, text: string) {
  const lower = text.trim().toLowerCase();
  const parts = text.trim().split(/\s+/);

  if (lower.startsWith('addsewa')) {
    if (!isOwner(sender)) return;
    const target = parts[1];
    const days = Number(parts[2]);
    if (!target || Number.isNaN(days)) {
      await sock.sendMessage(chatId, { text: 'Format: addsewa 628xxxxxx@c.us 5' });
      return;
    }
    const jid = normalizeUserJid(target);
    addOrUpdateRental(jid, days);
    await sock.sendMessage(chatId, { text: `✅ Sewa untuk ${displayNumber(jid)} aktif ${days} hari.` });
    return;
  }

  if (lower.startsWith('delsewa')) {
    if (!isOwner(sender)) return;
    const id = Number(parts[1]);
    if (Number.isNaN(id)) {
      await sock.sendMessage(chatId, { text: 'Format: delsewa 1' });
      return;
    }
    const ok = deactivateRentalById(id);
    await sock.sendMessage(chatId, { text: ok ? '✅ Sewa dinonaktifkan.' : 'ID tidak ditemukan.' });
    return;
  }

  if (lower === 'listsewa') {
    if (!isOwner(sender)) return;
    const rentals = listRentals();
    const today = DateTime.now().setZone(env.timezone).startOf('day');
    const lines = ['📋 *DATA SEWA BOT SHOLAT*', ''];
    rentals.forEach((item) => {
      const end = DateTime.fromISO(item.end_date).startOf('day');
      const diff = Math.ceil(end.diff(today, 'days').days);
      lines.push(`${item.id}. ${displayNumber(item.user_jid)}`);
      lines.push(`   Sisa: ${item.active === 0 || diff < 0 ? 'Habis' : `${diff} hari`}`);
      lines.push('');
    });
    await sock.sendMessage(chatId, { text: lines.join('\n') });
    return;
  }

  if (lower === 'waktusholat') {
    const schedule = await getTodaySchedule();
    await sock.sendMessage(chatId, { text: formatSchedule(schedule) });
    return;
  }

  if (lower === 'listsholat' || lower === 'status') {
    const data = getDayStatus(sender);
    await sock.sendMessage(chatId, { text: formatListStatus(data) });
    return;
  }

  if (lower === 'rekapbulan') {
    const recap = monthlyRecap(sender);
    await sock.sendMessage(chatId, { text: formatRecapBulanan(recap) });
    return;
  }

  if (lower === 'resetsholat') {
    resetDayStatus(sender);
    await sock.sendMessage(chatId, { text: '✅ Data sholat hari ini direset.' });
    return;
  }

  if (lower === 'motivasi') {
    await sock.sendMessage(chatId, { text: `✨ ${randomOf(motivasiList)}` });
    return;
  }

  if (lower === 'doa') {
    await sock.sendMessage(chatId, { text: randomOf(doaList) });
    return;
  }

  if (lower === 'ceksewa') {
    const rental = getRentalByUser(sender);
    if (!rental) {
      await sock.sendMessage(chatId, { text: 'Kamu belum terdaftar sewa bot.' });
      return;
    }
    const today = DateTime.now().setZone(env.timezone).startOf('day');
    const diff = Math.ceil(DateTime.fromISO(rental.end_date).startOf('day').diff(today, 'days').days);
    await sock.sendMessage(chatId, { text: `📌 Sisa sewa kamu: ${rental.active === 0 || diff < 0 ? 'Habis' : `${diff} hari`}` });
    return;
  }

  if (lower.startsWith('✅ sudah') || lower.startsWith('sudah')) {
    const prayer = parsePrayerFromText(lower);
    const resolved = resolvePending(sender, true, prayer);
    await sock.sendMessage(chatId, {
      text: resolved
        ? 'MasyaAllah 🤍\nSemoga Allah menerima sholatmu dan melapangkan rezekimu hari ini.\nTetap istiqomah ya!'
        : 'Belum ada pengingat sholat yang menunggu jawaban.'
    });
    return;
  }

  if (lower.startsWith('❌ belum') || lower.startsWith('belum')) {
    const prayer = parsePrayerFromText(lower);
    const resolved = resolvePending(sender, false, prayer);
    await sock.sendMessage(chatId, {
      text: resolved
        ? 'Yuk segera sholat 🙏\nSholat itu penenang hati.\nAllah sedang menunggumu menghadap-Nya 🤍'
        : 'Belum ada pengingat sholat yang menunggu jawaban.'
    });
    return;
  }

  if (lower === 'menu' || lower === 'help') {
    await sock.sendMessage(chatId, {
      text: [
        `🤖 *${env.botName}*`,
        '',
        'Perintah:',
        '- waktusholat',
        '- listsholat / status',
        '- rekapbulan',
        '- resetsholat',
        '- motivasi',
        '- doa',
        '- ceksewa',
        '- sudah <subuh/dzuhur/ashar/maghrib/isya>',
        '- belum'
      ].join('\n')
    });
  }
}
