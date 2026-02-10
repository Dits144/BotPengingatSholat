import { DateTime } from 'luxon';
import { env } from '../config/env';

export function nowTz(): DateTime {
  return DateTime.now().setZone(env.timezone);
}

export function addDuration(base: DateTime, months: number, days: number): DateTime {
  return base.plus({ months, days });
}

export function formatDate(dateIso?: string | null): string {
  if (!dateIso) return '-';
  return DateTime.fromISO(dateIso, { zone: env.timezone }).toFormat('dd LLL yyyy HH:mm');
}

export function parseDurationText(text: string): { months: number; days: number } {
  const lower = text.toLowerCase();
  const monthMatch = lower.match(/(\d+)\s*bulan/);
  const dayMatch = lower.match(/(\d+)\s*hari/);
  const months = monthMatch ? Number(monthMatch[1]) : 0;
  const days = dayMatch ? Number(dayMatch[1]) : 0;
  if (months === 0 && days === 0) {
    throw new Error('Format durasi tidak valid. Contoh: 1 bulan 5 hari');
  }
  return { months, days };
}
