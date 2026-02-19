import { DateTime } from 'luxon';
import { env } from '../config/env';
import { db } from '../db/database';

export type Schedule = {
  date: string;
  imsak: string;
  subuh: string;
  dzuhur: string;
  ashar: string;
  maghrib: string;
  isya: string;
};

function clean(value: string): string {
  return value.split(' ')[0];
}

export async function fetchTodaySchedule(): Promise<Schedule> {
  const today = DateTime.now().setZone(env.timezone).toISODate()!;
  const existing = db.prepare('SELECT * FROM prayer_schedule WHERE date=?').get(today) as Schedule | undefined;
  if (existing) return existing;

  const url = `https://api.aladhan.com/v1/timings/${Math.floor(Date.now() / 1000)}?latitude=${env.latitude}&longitude=${env.longitude}&method=11`;
  const res = await fetch(url);
  const data = await res.json() as any;
  const t = data.data.timings;

  const schedule: Schedule = {
    date: today,
    imsak: clean(t.Imsak),
    subuh: clean(t.Fajr),
    dzuhur: clean(t.Dhuhr),
    ashar: clean(t.Asr),
    maghrib: clean(t.Maghrib),
    isya: clean(t.Isha),
  };

  db.prepare('INSERT OR REPLACE INTO prayer_schedule (date,imsak,subuh,dzuhur,ashar,maghrib,isya) VALUES (?,?,?,?,?,?,?)').run(
    schedule.date,
    schedule.imsak,
    schedule.subuh,
    schedule.dzuhur,
    schedule.ashar,
    schedule.maghrib,
    schedule.isya,
  );

  return schedule;
}
