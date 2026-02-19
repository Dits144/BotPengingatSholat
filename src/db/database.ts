import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';
import { env } from '../config/env';

const dbDir = path.dirname(env.dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

export const db = new Database(env.dbPath);
db.pragma('journal_mode = WAL');

export function initDb() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS rentals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_jid TEXT NOT NULL UNIQUE,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      active INTEGER NOT NULL DEFAULT 1,
      notified_expired INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS prayer_status (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_jid TEXT NOT NULL,
      date TEXT NOT NULL,
      subuh INTEGER,
      dzuhur INTEGER,
      ashar INTEGER,
      maghrib INTEGER,
      isya INTEGER,
      UNIQUE(user_jid, date)
    );

    CREATE TABLE IF NOT EXISTS pending_prompts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_jid TEXT NOT NULL,
      prayer_name TEXT NOT NULL,
      date TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS schedule_cache (
      date TEXT PRIMARY KEY,
      location TEXT NOT NULL,
      timezone TEXT NOT NULL,
      subuh TEXT NOT NULL,
      dzuhur TEXT NOT NULL,
      ashar TEXT NOT NULL,
      maghrib TEXT NOT NULL,
      isya TEXT NOT NULL,
      imsak TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sent_notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_jid TEXT NOT NULL,
      date TEXT NOT NULL,
      kind TEXT NOT NULL,
      UNIQUE(user_jid, date, kind)
    );
  `);
}
