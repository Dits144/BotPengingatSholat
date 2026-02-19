const axios = require('axios');
const { read, update } = require('./db');
const { toDateKey } = require('./utils');
const { LAT, LON, TIMEZONE } = require('./config');

async function fetchScheduleForDate(date = new Date()) {
  const dateKey = toDateKey(date);
  const db = read();
  if (db.scheduleCache[dateKey]?.timings) return db.scheduleCache[dateKey];

  const url = 'https://api.aladhan.com/v1/timings';
  const params = {
    latitude: LAT,
    longitude: LON,
    method: 2,
    timezonestring: TIMEZONE
  };

  const res = await axios.get(url, { params, timeout: 15000 });
  const data = res.data?.data;
  if (!data?.timings) throw new Error('Gagal ambil jadwal sholat (Aladhan)');

  const payload = {
    timings: {
      Fajr: data.timings.Fajr,
      Dhuhr: data.timings.Dhuhr,
      Asr: data.timings.Asr,
      Maghrib: data.timings.Maghrib,
      Isha: data.timings.Isha,
      Imsak: data.timings.Imsak
    },
    meta: {
      dateKey,
      fetchedAt: new Date().toISOString(),
      timezone: TIMEZONE,
      lat: LAT,
      lon: LON
    }
  };

  update((db2) => {
    db2.scheduleCache[dateKey] = payload;
  });

  return payload;
}

module.exports = { fetchScheduleForDate };
