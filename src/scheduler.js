const cron = require('node-cron');
const { fetchScheduleForDate } = require('./prayer');
const { read, update } = require('./db');
const { toDateKey, nowMs } = require('./utils');
const { REMINDER_TEXT } = require('./config');

const PRAYER_ORDER = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];

function hmToTodayMs(hm) {
  const [h, m] = String(hm).split(':').map(Number);
  const d = new Date();
  d.setSeconds(0, 0);
  d.setHours(h, m, 0, 0);
  return d.getTime();
}

function formatReminder(prayerKey) {
  const map = {
    Fajr: { label: 'Subuh', cmd: 'subuh' },
    Dhuhr: { label: 'Dzuhur', cmd: 'dzuhur' },
    Asr: { label: 'Ashar', cmd: 'ashar' },
    Maghrib: { label: 'Maghrib', cmd: 'maghrib' },
    Isha: { label: 'Isya', cmd: 'isya' }
  };
  const p = map[prayerKey];
  return REMINDER_TEXT.replace('{prayer}', p.label).replace('{cmd}', p.cmd);
}

function isRentalActive(db, userJid) {
  const r = db.rentals[userJid];
  if (!r?.active) return false;
  if (typeof r.endAt !== 'number') return false;
  return nowMs() <= r.endAt;
}

function ensureDayStatus(db, dateKey, userJid) {
  if (!db.prayerStatus[dateKey]) db.prayerStatus[dateKey] = {};
  if (!db.prayerStatus[dateKey][userJid]) {
    db.prayerStatus[dateKey][userJid] = {
      Fajr: 'pending',
      Dhuhr: 'pending',
      Asr: 'pending',
      Maghrib: 'pending',
      Isha: 'pending'
    };
  }
  if (!db.sentNotifications[dateKey]) db.sentNotifications[dateKey] = {};
  if (!db.sentNotifications[dateKey][userJid]) db.sentNotifications[dateKey][userJid] = {};
}

function autoExpireRentals() {
  update((db) => {
    for (const r of Object.values(db.rentals)) {
      if (r.active && nowMs() > r.endAt) r.active = false;
    }
  });
}

function autoMarkMissed(db, dateKey) {
  for (const [userJid, pending] of Object.entries(db.pendingPrompts)) {
    if (pending?.date !== dateKey) continue;
    if (nowMs() > pending.expiresAt) {
      ensureDayStatus(db, dateKey, userJid);
      db.prayerStatus[dateKey][userJid][pending.prayer] = 'missed';
      delete db.pendingPrompts[userJid];
    }
  }
}

function startScheduler(sock) {
  cron.schedule('* * * * *', async () => {
    try {
      autoExpireRentals();
      const dateKey = toDateKey(new Date());
      const schedule = await fetchScheduleForDate(new Date());
      const db = read();

      update((db2) => autoMarkMissed(db2, dateKey));

      for (const userJid of Object.keys(db.rentals)) {
        if (!isRentalActive(db, userJid)) continue;

        const timings = schedule.timings;
        for (let i = 0; i < PRAYER_ORDER.length; i++) {
          const prayer = PRAYER_ORDER[i];
          const t = timings[prayer];
          if (!t) continue;

          const fireAt = hmToTodayMs(t);
          const now = nowMs();
          const sameMinute = Math.abs(now - fireAt) < 60 * 1000;

          if (prayer === 'Fajr' && timings.Imsak) {
            const imsakAt = hmToTodayMs(timings.Imsak);
            const oneMinBefore = imsakAt - 60 * 1000;
            const imsakMinute = Math.abs(now - oneMinBefore) < 60 * 1000;
            if (imsakMinute) {
              update((db2) => {
                ensureDayStatus(db2, dateKey, userJid);
                if (db2.sentNotifications[dateKey][userJid].IMSAK_MINUS_1) return;
                db2.sentNotifications[dateKey][userJid].IMSAK_MINUS_1 = true;
              });
              await sock.sendMessage(userJid, { text: '⏰ Imsak 1 menit lagi.\nSegera selesaikan sahur ya 🤍' });
            }
          }

          if (!sameMinute) continue;
          if (db.sentNotifications[dateKey]?.[userJid]?.[prayer]) continue;

          const nextPrayer = PRAYER_ORDER[i + 1];
          const expiresAt = nextPrayer ? hmToTodayMs(timings[nextPrayer]) : fireAt + 3 * 60 * 60 * 1000;

          update((db2) => {
            ensureDayStatus(db2, dateKey, userJid);
            db2.sentNotifications[dateKey][userJid][prayer] = true;
            db2.pendingPrompts[userJid] = { date: dateKey, prayer, expiresAt };
          });

          await sock.sendMessage(userJid, { text: formatReminder(prayer) });

          if (prayer === 'Maghrib') {
            await sock.sendMessage(userJid, { text: '🌙 Setelah Maghrib, semoga hatimu tenang.\nJangan lupa dzikir ringan ya 🤍' });
          }
          if (prayer === 'Fajr') {
            await sock.sendMessage(userJid, { text: '🌅 Semoga harimu penuh berkah hari ini 🤍' });
          }
        }
      }
    } catch (e) {
      console.error('[scheduler] error:', e?.message || e);
    }
  });

  console.log('[scheduler] aktif: cek tiap menit ✅');
}

module.exports = { startScheduler, PRAYER_ORDER };
