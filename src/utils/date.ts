import { DateTime } from 'luxon';
import { env } from '../config/env';

export function nowTz() {
  return DateTime.now().setZone(env.timezone);
}

export function formatDateTimeWib(iso?: string | null) {
  if (!iso) return '-';
  return DateTime.fromISO(iso, { zone: env.timezone }).toFormat('yyyy-LL-dd HH:mm:ss');
}

export function formatHumanWib(iso?: string | null) {
  const target = iso ? DateTime.fromISO(iso, { zone: env.timezone }) : nowTz();
  return target.setLocale('id').toFormat('cccc, dd LLLL yyyy HH:mm:ss') + ' WIB';
}
