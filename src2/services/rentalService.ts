import { DateTime } from 'luxon';
import { db, upsertRental } from '../db/database';
import { env } from '../config/env';

export type Rental = { id: number; user_jid: string; start_date: string; end_date: string; active: number; notified_expired: number };

export function normalizeJid(raw: string): string {
  const cleaned = raw.replace(/\s+/g, '').replace('@c.us', '').replace('@s.whatsapp.net', '');
  return `${cleaned}@s.whatsapp.net`;
}

export function addRental(rawJid: string, days: number): Rental {
  const now = DateTime.now().setZone(env.timezone);
  const end = now.plus({ days });
  const jid = normalizeJid(rawJid);
  upsertRental(jid, days, now.toISODate()!, end.toISODate()!);
  return db.prepare('SELECT * FROM rentals WHERE user_jid=?').get(jid) as Rental;
}

export function removeRentalById(id: number): void {
  db.prepare('DELETE FROM rentals WHERE id=?').run(id);
}

export function listRentals(): Array<Rental & { sisaHari: number }> {
  const today = DateTime.now().setZone(env.timezone).startOf('day');
  const rows = db.prepare('SELECT * FROM rentals ORDER BY id').all() as Rental[];
  return rows.map((x) => ({
    ...x,
    sisaHari: Math.ceil(DateTime.fromISO(x.end_date).diff(today, 'days').days),
  }));
}

export function isRentalActive(jid: string): boolean {
  const row = db.prepare('SELECT * FROM rentals WHERE user_jid=?').get(jid) as Rental | undefined;
  if (!row) return false;
  const active = DateTime.fromISO(row.end_date).endOf('day') >= DateTime.now().setZone(env.timezone);
  if (!active) db.prepare('UPDATE rentals SET active=0 WHERE id=?').run(row.id);
  return active;
}

export function expireAndGetToNotify(): Rental[] {
  const now = DateTime.now().setZone(env.timezone);
  db.prepare('UPDATE rentals SET active=0 WHERE date(end_date) < date(?)').run(now.toISODate());
  return db.prepare('SELECT * FROM rentals WHERE active=0 AND notified_expired=0').all() as Rental[];
}

export function markExpiredNotified(id: number): void {
  db.prepare('UPDATE rentals SET notified_expired=1 WHERE id=?').run(id);
}
