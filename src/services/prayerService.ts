import axios from 'axios';
import { DateTime } from 'luxon';
import { db } from '../db/database';
import { env } from '../config/env';

export type PrayerSchedule = {
  date: string;
  location: string;
  timezone: string;
  subuh: string;
  dzuhur: string;
  ashar: string;
  maghrib: string;
  isya: string;
  imsak: string;
};

function cleanTime(value: string): string {
  return value.split(' ')[0].slice(0, 5);
}

export async function getTodaySchedule(forceRefresh = false): Promise<PrayerSchedule> {
  const today = DateTime.now().setZone(env.timezone).toISODate()!;
  const cached = db.prepare('SELECT * FROM schedule_cache WHERE date = ?').get(today) as PrayerSchedule | undefined;

  if (cached && !forceRefresh) {
    return cached;
  }

  const response = await axios.get('https://api.aladhan.com/v1/timingsByAddress', {
    params: {
      address: env.prayerAddress,
      method: env.prayerMethod
    },
    timeout: 20000
  });

  const timings = response.data?.data?.timings;
  if (!timings) {
    throw new Error('Gagal mengambil jadwal sholat dari API.');
  }

  const schedule: PrayerSchedule = {
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

  db.prepare(`
    INSERT INTO schedule_cache (date, location, timezone, subuh, dzuhur, ashar, maghrib, isya, imsak)
    VALUES (@date, @location, @timezone, @subuh, @dzuhur, @ashar, @maghrib, @isya, @imsak)
    ON CONFLICT(date) DO UPDATE SET
      location = excluded.location,
      timezone = excluded.timezone,
      subuh = excluded.subuh,
      dzuhur = excluded.dzuhur,
      ashar = excluded.ashar,
      maghrib = excluded.maghrib,
      isya = excluded.isya,
      imsak = excluded.imsak
  `).run(schedule);

  return schedule;
}
