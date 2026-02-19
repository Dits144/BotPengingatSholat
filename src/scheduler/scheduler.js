const cron = require('node-cron');
const { DateTime } = require('luxon');
const { env } = require('../config/env');
const { getTodaySchedule } = require('../services/prayerService');
const { expireDueRentals, getActiveRentalUsers } = require('../services/rentalService');
const { createPendingPrompt, hasSentKind, markSentKind, markUnansweredAsMissed } = require('../services/trackingService');
const { formatPrayerPrompt } = require('../utils/formatter');

const prayerOrder = ['subuh', 'dzuhur', 'ashar', 'maghrib', 'isya'];

function startScheduler(sock) {
  cron.schedule('* * * * *', async () => {
    try {
      const now = DateTime.now().setZone(env.timezone);
      const current = now.toFormat('HH:mm');
      const today = now.toISODate();
      const schedule = await getTodaySchedule();
      const users = getActiveRentalUsers();

      for (const user of users) {
        for (const prayer of prayerOrder) {
          if (schedule[prayer] === current && !hasSentKind(user, today, `prayer-${prayer}`)) {
            markUnansweredAsMissed(user, today);
            createPendingPrompt(user, prayer, today);
            await sock.sendMessage(user, { text: formatPrayerPrompt(prayer) });
            markSentKind(user, today, `prayer-${prayer}`);
          }
        }

        if (schedule.imsak === DateTime.fromFormat(current, 'HH:mm').plus({ minutes: 1 }).toFormat('HH:mm') && !hasSentKind(user, today, 'imsak-minus-1')) {
          await sock.sendMessage(user, { text: '⏰ Imsak 1 menit lagi\nSegera selesaikan sahur ya 🤍' });
          markSentKind(user, today, 'imsak-minus-1');
        }
        if (schedule.maghrib === current && !hasSentKind(user, today, 'after-maghrib')) {
          await sock.sendMessage(user, { text: '🌙 Sudah berbuka?\nJangan lupa sholat Maghrib ya 🤍' });
          markSentKind(user, today, 'after-maghrib');
        }
        if (schedule.subuh === current && !hasSentKind(user, today, 'after-subuh')) {
          await sock.sendMessage(user, { text: '🌅 Semoga harimu penuh berkah hari ini 🤍' });
          markSentKind(user, today, 'after-subuh');
        }
      }
    } catch (error) {
      console.error('[scheduler-minute]', error);
    }
  }, { timezone: env.timezone });

  cron.schedule('0 0 * * *', async () => {
    try {
      await getTodaySchedule(true);
      const expired = expireDueRentals();
      for (const rental of expired) {
        await sock.sendMessage(rental.user_jid, { text: '⚠️ Masa sewa bot kamu sudah habis. Silakan hubungi owner untuk perpanjangan.' });
      }
    } catch (error) {
      console.error('[scheduler-daily]', error);
    }
  }, { timezone: env.timezone });
}

module.exports = { startScheduler };
