import { DateTime } from 'luxon';
import { env } from '../config/env';
import { PrayerName, PRAYERS, prayerDisplay } from '../config/constants';
import { db, ensureDaily, setPrayerState } from '../db/database';

export function todayDate(): string {
  return DateTime.now().setZone(env.timezone).toISODate()!;
}

export function markPrayer(userJid: string, prayer: PrayerName, done: boolean, date = todayDate()): void {
  setPrayerState(userJid, date, prayer, done ? 'done' : 'missed');
  db.prepare('INSERT OR REPLACE INTO pending_prompts (user_jid,prayer,date,status) VALUES (?,?,?,?)').run(
    userJid,
    prayer,
    date,
    'answered',
  );
}

export function createPrompt(userJid: string, prayer: PrayerName, date = todayDate()): void {
  ensureDaily(userJid, date);
  db.prepare('INSERT OR REPLACE INTO pending_prompts (user_jid,prayer,date,status) VALUES (?,?,?,?)').run(userJid, prayer, date, 'pending');
}

export function closePendingAsMissed(nextPrayer: PrayerName, date = todayDate()): void {
  const pending = db
    .prepare('SELECT user_jid, prayer FROM pending_prompts WHERE date=? AND status=?')
    .all(date, 'pending') as Array<{ user_jid: string; prayer: PrayerName }>;

  for (const row of pending) {
    if (row.prayer !== nextPrayer) {
      setPrayerState(row.user_jid, date, row.prayer, 'missed');
      db.prepare('UPDATE pending_prompts SET status=? WHERE user_jid=? AND prayer=? AND date=?').run('timeout', row.user_jid, row.prayer, date);
    }
  }
}

export function getTodayStatus(userJid: string, date = todayDate()): Record<PrayerName, string> {
  ensureDaily(userJid, date);
  const row = db.prepare('SELECT * FROM daily_status WHERE user_jid=? AND date=?').get(userJid, date) as Record<string, string>;
  const conv = (v: string): string => (v === 'done' ? '✅' : v === 'missed' ? '❌' : '⏳ Belum');
  return {
    subuh: conv(row.subuh),
    dzuhur: conv(row.dzuhur),
    ashar: conv(row.ashar),
    maghrib: conv(row.maghrib),
    isya: conv(row.isya),
  };
}

export function monthlyRecap(userJid: string): { lines: string[]; totalMissed: number } {
  const now = DateTime.now().setZone(env.timezone);
  const start = now.startOf('month').toISODate();
  const end = now.endOf('month').toISODate();
  const rows = db
    .prepare('SELECT * FROM daily_status WHERE user_jid=? AND date BETWEEN ? AND ? ORDER BY date ASC')
    .all(userJid, start, end) as Array<Record<string, string>>;

  let totalMissed = 0;
  const lines = rows.map((row) => {
    const missed = PRAYERS.reduce((acc, prayer) => acc + (row[prayer] === 'missed' ? 1 : 0), 0);
    totalMissed += missed;
    const dt = DateTime.fromISO(row.date).setLocale('id');
    return `${dt.toFormat('d LLL')} : ${missed === 0 ? 'Full' : `Bolong ${missed}`}`;
  });

  return { lines, totalMissed };
}

export function prayerFromText(text: string): PrayerName | null {
  const low = text.toLowerCase();
  for (const p of PRAYERS) {
    if (low.includes(p) || low.includes(prayerDisplay[p].toLowerCase())) return p;
  }
  return null;
}
