import { DateTime } from 'luxon';
import { db } from '../db/database';
import { env } from '../config/env';

export type Rental = {
  id: number;
  user_jid: string;
  start_date: string;
  end_date: string;
  active: number;
  notified_expired: number;
};

export function addOrUpdateRental(userJid: string, days: number) {
  const now = DateTime.now().setZone(env.timezone).toISODate()!;
  const endDate = DateTime.now().setZone(env.timezone).plus({ days }).toISODate()!;

  const existing = db.prepare('SELECT * FROM rentals WHERE user_jid = ?').get(userJid) as Rental | undefined;
  if (existing) {
    db.prepare(`UPDATE rentals SET start_date = ?, end_date = ?, active = 1, notified_expired = 0 WHERE user_jid = ?`).run(now, endDate, userJid);
    return;
  }

  db.prepare(`INSERT INTO rentals (user_jid, start_date, end_date, active) VALUES (?, ?, ?, 1)`).run(userJid, now, endDate);
}

export function deactivateRentalById(id: number): boolean {
  const result = db.prepare('UPDATE rentals SET active = 0 WHERE id = ?').run(id);
  return result.changes > 0;
}

export function listRentals(): Rental[] {
  return db.prepare('SELECT * FROM rentals ORDER BY id ASC').all() as Rental[];
}

export function getActiveRentalUsers(): string[] {
  const today = DateTime.now().setZone(env.timezone).toISODate()!;
  const rows = db
    .prepare('SELECT user_jid FROM rentals WHERE active = 1 AND end_date >= ?')
    .all(today) as { user_jid: string }[];
  return rows.map((r) => r.user_jid);
}

export function getRentalByUser(userJid: string): Rental | undefined {
  return db.prepare('SELECT * FROM rentals WHERE user_jid = ?').get(userJid) as Rental | undefined;
}

export function expireDueRentals(): Rental[] {
  const today = DateTime.now().setZone(env.timezone).toISODate()!;
  const expired = db
    .prepare('SELECT * FROM rentals WHERE active = 1 AND end_date < ?')
    .all(today) as Rental[];

  for (const row of expired) {
    db.prepare('UPDATE rentals SET active = 0 WHERE id = ?').run(row.id);
  }

  return expired;
}
