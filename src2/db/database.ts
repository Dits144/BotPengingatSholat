import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { env } from '../config/env';
import { PRAYERS, PrayerName } from '../config/constants';

const dbDir = path.dirname(env.dbPath);
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

export const db = new Database(env.dbPath);

db.pragma('journal_mode = WAL');

db.exec(`
CREATE TABLE IF NOT EXISTS rentals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_jid TEXT UNIQUE NOT NULL,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1,
  notified_expired INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS daily_status (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_jid TEXT NOT NULL,
  date TEXT NOT NULL,
  subuh TEXT DEFAULT 'pending',
  dzuhur TEXT DEFAULT 'pending',
  ashar TEXT DEFAULT 'pending',
  maghrib TEXT DEFAULT 'pending',
  isya TEXT DEFAULT 'pending',
  UNIQUE(user_jid, date)
);
CREATE TABLE IF NOT EXISTS pending_prompts (
  user_jid TEXT NOT NULL,
  prayer TEXT NOT NULL,
  date TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  UNIQUE(user_jid, prayer, date)
);
CREATE TABLE IF NOT EXISTS prayer_schedule (
  date TEXT PRIMARY KEY,
  imsak TEXT NOT NULL,
  subuh TEXT NOT NULL,
  dzuhur TEXT NOT NULL,
  ashar TEXT NOT NULL,
  maghrib TEXT NOT NULL,
  isya TEXT NOT NULL
);
`);

export type PrayerState = 'done' | 'missed' | 'pending';

export function upsertRental(userJid: string, days: number, nowDate: string, endDate: string): void {
  db.prepare(`INSERT INTO rentals (user_jid,start_date,end_date,active,notified_expired)
    VALUES (@user_jid,@start_date,@end_date,1,0)
    ON CONFLICT(user_jid) DO UPDATE SET start_date=@start_date,end_date=@end_date,active=1,notified_expired=0`).run({
    user_jid: userJid,
    start_date: nowDate,
    end_date: endDate,
  });
}

export function ensureDaily(userJid: string, date: string): void {
  db.prepare('INSERT OR IGNORE INTO daily_status (user_jid, date) VALUES (?,?)').run(userJid, date);
}

export function setPrayerState(userJid: string, date: string, prayer: PrayerName, state: PrayerState): void {
  ensureDaily(userJid, date);
  db.prepare(`UPDATE daily_status SET ${prayer}=? WHERE user_jid=? AND date=?`).run(state, userJid, date);
}
