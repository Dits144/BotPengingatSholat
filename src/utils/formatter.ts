import { DateTime } from 'luxon';
import { labels, PrayerName, prayers } from '../constants/messages';
import { PrayerSchedule } from '../services/prayerService';

export function formatSchedule(schedule: PrayerSchedule) {
  return [
    '🕌 *JADWAL SHOLAT HARI INI*',
    `Lokasi: ${schedule.location}`,
    '',
    `Subuh : ${schedule.subuh}`,
    `Dzuhur : ${schedule.dzuhur}`,
    `Ashar : ${schedule.ashar}`,
    `Maghrib : ${schedule.maghrib}`,
    `Isya : ${schedule.isya}`,
    `Imsak : ${schedule.imsak}`
  ].join('\n');
}

export function formatPrayerPrompt(prayer: PrayerName) {
  const upper = labels[prayer].toUpperCase();
  return [
    `🕌 *WAKTU SHOLAT ${upper} TELAH TIBA*`,
    '',
    'Apakah kamu sudah sholat?',
    '',
    `Ketik:`,
    `✅ sudah ${prayer}`,
    `❌ belum`
  ].join('\n');
}

export function formatListStatus(row: Record<PrayerName, number | null>) {
  const getIcon = (v: number | null) => (v === 1 ? '✅' : v === 0 ? '❌' : '⏳ Belum');
  return [
    '📊 *REKAP SHOLAT HARI INI*',
    '',
    `Subuh : ${getIcon(row.subuh)}`,
    `Dzuhur : ${getIcon(row.dzuhur)}`,
    `Ashar : ${getIcon(row.ashar)}`,
    `Maghrib : ${getIcon(row.maghrib)}`,
    `Isya : ${getIcon(row.isya)}`
  ].join('\n');
}

export function formatRecapBulanan(items: { date: string; bolong: number; full: boolean }[]) {
  if (!items.length) {
    return '📅 *Belum ada data sholat bulan ini.*';
  }

  const lines = ['📅 *REKAP SHOLAT BULAN INI*', ''];
  let total = 0;
  for (const item of items) {
    const day = DateTime.fromISO(item.date).toFormat('d LLL');
    lines.push(`${day} : ${item.full ? 'Full' : `Bolong ${item.bolong}`}`);
    total += item.bolong;
  }
  lines.push('', `Total bolong bulan ini: ${total} sholat`);
  return lines.join('\n');
}

export function parsePrayerFromText(text: string): PrayerName | undefined {
  const lower = text.toLowerCase();
  return prayers.find((p) => lower.includes(p));
}
