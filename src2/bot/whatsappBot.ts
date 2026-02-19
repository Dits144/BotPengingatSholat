import cron from 'node-cron';
import qrcode from 'qrcode-terminal';
import { Client, LocalAuth } from 'whatsapp-web.js';
import { DateTime } from 'luxon';
import { env } from '../config/env';
import { prayerDisplay, PrayerName, PRAYERS } from '../config/constants';
import { addRental, expireAndGetToNotify, isRentalActive, listRentals, markExpiredNotified, normalizeJid, removeRentalById } from '../services/rentalService';
import { fetchTodaySchedule } from '../services/prayerApiService';
import { createPrompt, getTodayStatus, markPrayer, monthlyRecap, prayerFromText, todayDate, closePendingAsMissed } from '../services/trackingService';
import { doaList, motivasiList } from '../services/texts';

const client = new Client({ authStrategy: new LocalAuth() });

function pickRandom(arr: string[]): string {
  return arr[Math.floor(Math.random() * arr.length)];
}

const toClientId = (jid: string): string => jid.replace('@s.whatsapp.net', '@c.us');
const fromClientId = (id: string): string => normalizeJid(id);

async function sendText(toJid: string, text: string): Promise<void> {
  await client.sendMessage(toClientId(toJid), text);
}

async function handleOwnerCommand(message: any, text: string): Promise<boolean> {
  const lower = text.toLowerCase();

  if (lower.startsWith('addsewa ')) {
    const [, rawJid, daysRaw] = text.split(/\s+/);
    const days = Number(daysRaw);
    if (!rawJid || Number.isNaN(days)) {
      await message.reply('Format: addsewa 628xxx@c.us 5');
      return true;
    }
    const data = addRental(rawJid, days);
    await message.reply(`✅ Sewa ditambahkan untuk ${data.user_jid}\nBerakhir: ${data.end_date}`);
    return true;
  }

  if (lower.startsWith('delsewa ')) {
    const id = Number(text.split(/\s+/)[1]);
    removeRentalById(id);
    await message.reply(`✅ Sewa id ${id} dihapus.`);
    return true;
  }

  if (lower === 'listsewa') {
    const rows = listRentals();
    const lines = rows.map((r, i) => `${i + 1}. ${r.user_jid.replace('@s.whatsapp.net', '')}\n   Sisa: ${r.sisaHari < 0 ? 'Habis' : `${r.sisaHari} hari`}`);
    await message.reply(`📋 *DATA SEWA BOT SHOLAT*\n\n${lines.join('\n\n') || '- kosong -'}`);
    return true;
  }

  return false;
}

async function handleUserMessage(message: any): Promise<void> {
  const text = message.body.trim();
  const lower = text.toLowerCase();
  const senderJid = fromClientId(message.from);

  if (!isRentalActive(senderJid)) {
    if (['ceksewa', 'status', 'listsholat', 'rekapbulan', 'waktusholat', 'motivasi', 'doa'].includes(lower)) {
      await message.reply('Masa sewa kamu tidak aktif. Hubungi owner untuk aktivasi 🙏');
    }
    return;
  }

  if (lower.startsWith('sudah ') || lower.startsWith('✅ sudah')) {
    const p = prayerFromText(lower);
    if (p) {
      markPrayer(senderJid, p, true, todayDate());
      await message.reply('MasyaAllah 🤍\nSemoga Allah menerima sholatmu dan melapangkan rezekimu hari ini.\nTetap istiqomah ya!');
    }
    return;
  }

  if (lower.startsWith('belum ') || lower.startsWith('❌ belum')) {
    const p = prayerFromText(lower);
    if (p) {
      markPrayer(senderJid, p, false, todayDate());
      await message.reply('Yuk segera sholat 🙏\nSholat itu penenang hati.\nAllah sedang menunggumu menghadap-Nya 🤍');
    }
    return;
  }

  if (lower === 'listsholat' || lower === 'status') {
    const stat = getTodayStatus(senderJid);
    await message.reply(`📊 *REKAP SHOLAT HARI INI*\n\nSubuh : ${stat.subuh}\nDzuhur : ${stat.dzuhur}\nAshar : ${stat.ashar}\nMaghrib : ${stat.maghrib}\nIsya : ${stat.isya}`);
    return;
  }

  if (lower === 'rekapbulan') {
    const recap = monthlyRecap(senderJid);
    await message.reply(`📅 *REKAP SHOLAT BULAN INI*\n\n${recap.lines.join('\n') || 'Belum ada data.'}\n\nTotal bolong bulan ini: ${recap.totalMissed} sholat`);
    return;
  }

  if (lower === 'waktusholat') {
    const s = await fetchTodaySchedule();
    await message.reply(`🕌 *JADWAL SHOLAT HARI INI*\nLokasi: ${env.locationLabel}\n\nSubuh : ${s.subuh}\nDzuhur : ${s.dzuhur}\nAshar : ${s.ashar}\nMaghrib : ${s.maghrib}\nIsya : ${s.isya}\nImsak : ${s.imsak}`);
    return;
  }

  if (lower === 'resetsholat') {
    const d = todayDate();
    for (const p of PRAYERS) markPrayer(senderJid, p, false, d);
    await message.reply('Data sholat hari ini berhasil direset ke ❌.');
    return;
  }

  if (lower === 'motivasi') {
    await message.reply(`✨ ${pickRandom(motivasiList)}`);
    return;
  }

  if (lower === 'doa') {
    await message.reply(pickRandom(doaList));
    return;
  }

  if (lower === 'ceksewa') {
    const me = listRentals().find((x) => x.user_jid === senderJid);
    await message.reply(me ? `Sisa masa sewa: ${me.sisaHari < 0 ? 'Habis' : `${me.sisaHari} hari`}` : 'Data sewa tidak ditemukan.');
  }
}

async function runScheduler(): Promise<void> {
  cron.schedule('* * * * *', async () => {
    const now = DateTime.now().setZone(env.timezone);
    const hhmm = now.toFormat('HH:mm');
    const schedule = await fetchTodaySchedule();
    const rentals = listRentals().filter((x) => x.sisaHari >= 0 && isRentalActive(x.user_jid));

    for (const r of rentals) {
      const sendPrayer = async (prayer: PrayerName) => {
        closePendingAsMissed(prayer);
        await sendText(r.user_jid, `🕌 *WAKTU SHOLAT ${prayerDisplay[prayer].toUpperCase()} TELAH TIBA*\n\nApakah kamu sudah sholat?\n\nKetik:\n✅ sudah ${prayer}\n❌ belum ${prayer}`);
        createPrompt(r.user_jid, prayer);
      };

      if (hhmm === schedule.subuh) {
        await sendPrayer('subuh');
        await sendText(r.user_jid, '🌅 Semoga harimu penuh berkah hari ini 🤍');
      }
      if (hhmm === schedule.dzuhur) await sendPrayer('dzuhur');
      if (hhmm === schedule.ashar) await sendPrayer('ashar');
      if (hhmm === schedule.maghrib) {
        await sendPrayer('maghrib');
        await sendText(r.user_jid, '🌙 Sudah berbuka? Jangan lupa sholat Maghrib ya 🤍');
      }
      if (hhmm === schedule.isya) await sendPrayer('isya');

      const imsakMinus1 = DateTime.fromFormat(schedule.imsak, 'HH:mm', { zone: env.timezone }).minus({ minute: 1 }).toFormat('HH:mm');
      if (hhmm === imsakMinus1) {
        await sendText(r.user_jid, '⏰ Imsak 1 menit lagi\nSegera selesaikan sahur ya 🤍');
      }
    }

    if (hhmm === '00:05') {
      const expired = expireAndGetToNotify();
      for (const x of expired) {
        await sendText(x.user_jid, '⚠️ Masa sewa bot pengingat sholat kamu telah habis. Hubungi owner untuk perpanjangan.');
        markExpiredNotified(x.id);
      }
    }
  }, { timezone: env.timezone });
}

export async function startBot(): Promise<void> {
  client.on('qr', (qr: string) => qrcode.generate(qr, { small: true }));
  client.on('ready', async () => {
    console.log('Bot WhatsApp siap digunakan ✅');
    await runScheduler();
  });

  client.on('message', async (message: any) => {
    try {
      const from = fromClientId(message.from);
      const body = message.body.trim();
      const isOwner = from === normalizeJid(env.ownerNumber);

      if (isOwner && (body.startsWith('addsewa ') || body.startsWith('delsewa ') || body === 'listsewa')) {
        const done = await handleOwnerCommand(message, body);
        if (done) return;
      }

      if (message.from.endsWith('@g.us') && !isOwner) return;
      await handleUserMessage(message);
    } catch (error) {
      console.error('Message handler error:', error);
    }
  });

  await client.initialize();
}
