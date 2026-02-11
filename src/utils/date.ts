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
  const raw = text.trim().toLowerCase();
  if (!raw) {
    throw new Error('Format durasi tidak valid. Contoh: 1 bulan 5 hari');
  }

  const monthMatches = [...raw.matchAll(/(\d+)\s*(bulan|bln|b)\b/g)];
  const dayMatches = [...raw.matchAll(/(\d+)\s*(hari|hr|h)\b/g)];

  const months = monthMatches.reduce((total, m) => total + Number(m[1] || 0), 0);
  const days = dayMatches.reduce((total, m) => total + Number(m[1] || 0), 0);

  if (months === 0 && days === 0) {
    throw new Error('Format durasi tidak valid. Contoh: 1 bulan 5 hari');
  }

  return { months, days };
}
