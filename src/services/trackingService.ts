import { DateTime } from 'luxon';
import { db } from '../db/database';
import { env } from '../config/env';
import { PrayerName, prayers } from '../constants/messages';

type PrayerRow = {
  user_jid: string;
  date: string;
  subuh: number | null;
  dzuhur: number | null;
  ashar: number | null;
  maghrib: number | null;
  isya: number | null;
};

function today() {
  return DateTime.now().setZone(env.timezone).toISODate()!;
}

function ensureRow(userJid: string, date = today()) {
  db.prepare('INSERT OR IGNORE INTO prayer_status (user_jid, date) VALUES (?, ?)').run(userJid, date);
}

export function markPrayer(userJid: string, prayer: PrayerName, done: boolean, date = today()) {
  ensureRow(userJid, date);
  db.prepare(`UPDATE prayer_status SET ${prayer} = ? WHERE user_jid = ? AND date = ?`).run(done ? 1 : 0, userJid, date);
}

export function getDayStatus(userJid: string, date = today()): PrayerRow {
  ensureRow(userJid, date);
  return db.prepare('SELECT * FROM prayer_status WHERE user_jid = ? AND date = ?').get(userJid, date) as PrayerRow;
}

export function resetDayStatus(userJid: string, date = today()) {
  ensureRow(userJid, date);
  db.prepare('UPDATE prayer_status SET subuh = NULL, dzuhur = NULL, ashar = NULL, maghrib = NULL, isya = NULL WHERE user_jid = ? AND date = ?').run(userJid, date);
}

export function createPendingPrompt(userJid: string, prayer: PrayerName, date = today()) {
  db.prepare('INSERT INTO pending_prompts (user_jid, prayer_name, date, status, created_at) VALUES (?, ?, ?, ?, ?)')
    .run(userJid, prayer, date, 'pending', DateTime.now().setZone(env.timezone).toISO());
}

export function markUnansweredAsMissed(userJid: string, date = today()) {
  const pendings = db.prepare('SELECT * FROM pending_prompts WHERE user_jid = ? AND date = ? AND status = ?')
    .all(userJid, date, 'pending') as { id: number; prayer_name: PrayerName }[];

  for (const pending of pendings) {
    markPrayer(userJid, pending.prayer_name, false, date);
    db.prepare('UPDATE pending_prompts SET status = ? WHERE id = ?').run('missed', pending.id);
  }
}

export function resolvePending(userJid: string, done: boolean, prayer?: PrayerName, date = today()): PrayerName | null {
  const target = prayer
    ? db.prepare('SELECT * FROM pending_prompts WHERE user_jid = ? AND date = ? AND prayer_name = ? AND status = ? ORDER BY id DESC LIMIT 1').get(userJid, date, prayer, 'pending')
    : db.prepare('SELECT * FROM pending_prompts WHERE user_jid = ? AND date = ? AND status = ? ORDER BY id DESC LIMIT 1').get(userJid, date, 'pending');

  const row = target as { id: number; prayer_name: PrayerName } | undefined;
  if (!row) return null;

  markPrayer(userJid, row.prayer_name, done, date);
  db.prepare('UPDATE pending_prompts SET status = ? WHERE id = ?').run(done ? 'answered_yes' : 'answered_no', row.id);
  return row.prayer_name;
}

export function monthlyRecap(userJid: string): { date: string; bolong: number; full: boolean }[] {
  const now = DateTime.now().setZone(env.timezone);
  const start = now.startOf('month').toISODate()!;
  const end = now.endOf('month').toISODate()!;

  const rows = db.prepare('SELECT * FROM prayer_status WHERE user_jid = ? AND date BETWEEN ? AND ? ORDER BY date ASC').all(userJid, start, end) as PrayerRow[];
  return rows.map((row) => {
    const values = prayers.map((p) => row[p]);
    const bolong = values.filter((v) => v === 0 || v === null).length;
    return { date: row.date, bolong, full: bolong === 0 };
  });
}

export function hasSentKind(userJid: string, date: string, kind: string): boolean {
  const row = db.prepare('SELECT id FROM sent_notifications WHERE user_jid = ? AND date = ? AND kind = ?').get(userJid, date, kind);
  return !!row;
}

export function markSentKind(userJid: string, date: string, kind: string) {
  db.prepare('INSERT OR IGNORE INTO sent_notifications (user_jid, date, kind) VALUES (?, ?, ?)').run(userJid, date, kind);
}
