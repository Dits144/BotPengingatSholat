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

export function parseDateYmdToEndOfDay(input: string): string {
  const dt = DateTime.fromFormat(input.trim(), 'yyyy-MM-dd', { zone: env.timezone });
  if (!dt.isValid) throw new Error('Format tanggal tidak valid. Gunakan YYYY-MM-DD');
  return dt.endOf('day').toISO() as string;
}

export function parseDurationText(text: string): { months: number; days: number } {
  const raw = text.trim().toLowerCase();
  if (!raw) throw new Error('Format durasi tidak valid. Contoh: 1 bulan 5 hari');

  const monthMatches = [...raw.matchAll(/(\d+)\s*(bulan|bln|b)\b/g)];
  const dayMatches = [...raw.matchAll(/(\d+)\s*(hari|hr|h)\b/g)];
  const months = monthMatches.reduce((sum, m) => sum + Number(m[1] || 0), 0);
  const days = dayMatches.reduce((sum, m) => sum + Number(m[1] || 0), 0);

  if (months === 0 && days === 0) throw new Error('Format durasi tidak valid. Contoh: 1 bulan 5 hari');
  return { months, days };
}

export function countdown(targetIso: string): string {
  const diff = DateTime.fromISO(targetIso).diff(nowTz(), ['days', 'hours', 'minutes']).toObject();
  const days = Math.max(0, Math.floor(diff.days ?? 0));
  const hours = Math.max(0, Math.floor(diff.hours ?? 0));
  const minutes = Math.max(0, Math.floor(diff.minutes ?? 0));
  return `${days} hari ${hours} jam ${minutes} menit`;
}
