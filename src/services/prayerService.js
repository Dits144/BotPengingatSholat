const axios = require('axios');
const { DateTime } = require('luxon');
const { db } = require('../db/database');
const { env } = require('../config/env');

function cleanTime(value) {
  return value.split(' ')[0].slice(0, 5);
}

async function getTodaySchedule(forceRefresh = false) {
  const today = DateTime.now().setZone(env.timezone).toISODate();
  const cached = db.prepare('SELECT * FROM schedule_cache WHERE date = ?').get(today);
  if (cached && !forceRefresh) return cached;

  const response = await axios.get('https://api.aladhan.com/v1/timingsByAddress', {
    params: { address: env.prayerAddress, method: env.prayerMethod },
    timeout: 20000
  });

  const timings = response.data && response.data.data && response.data.data.timings;
  if (!timings) throw new Error('Gagal mengambil jadwal sholat dari API.');

  const schedule = {
    date: today,
    location: `${env.prayerAddress} (Jakarta Zone)`,
    timezone: env.timezone,
    subuh: cleanTime(timings.Fajr),
    dzuhur: cleanTime(timings.Dhuhr),
    ashar: cleanTime(timings.Asr),
    maghrib: cleanTime(timings.Maghrib),
    isya: cleanTime(timings.Isha),
    imsak: cleanTime(timings.Imsak)
  };

  db.prepare(`INSERT INTO schedule_cache (date, location, timezone, subuh, dzuhur, ashar, maghrib, isya, imsak)
    VALUES (@date, @location, @timezone, @subuh, @dzuhur, @ashar, @maghrib, @isya, @imsak)
    ON CONFLICT(date) DO UPDATE SET
      location = excluded.location,
      timezone = excluded.timezone,
      subuh = excluded.subuh,
      dzuhur = excluded.dzuhur,
      ashar = excluded.ashar,
      maghrib = excluded.maghrib,
      isya = excluded.isya,
      imsak = excluded.imsak`).run(schedule);

  return schedule;
}

module.exports = { getTodaySchedule };
