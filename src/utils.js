function pad2(n) {
  return String(n).padStart(2, '0');
}

function toDateKey(d = new Date()) {
  const y = d.getFullYear();
  const m = pad2(d.getMonth() + 1);
  const day = pad2(d.getDate());
  return `${y}-${m}-${day}`;
}

function nowMs() {
  return Date.now();
}

function addDaysMs(days) {
  return nowMs() + days * 24 * 60 * 60 * 1000;
}

function normalizePrayerName(p) {
  const s = String(p || '').toLowerCase();
  if (s.includes('subuh') || s.includes('fajr')) return { key: 'Fajr', cmd: 'subuh', label: 'Subuh' };
  if (s.includes('dzuhur') || s.includes('dhuhr') || s.includes('zuhur')) return { key: 'Dhuhr', cmd: 'dzuhur', label: 'Dzuhur' };
  if (s.includes('ashar') || s.includes('asr')) return { key: 'Asr', cmd: 'ashar', label: 'Ashar' };
  if (s.includes('maghrib') || s.includes('magrib')) return { key: 'Maghrib', cmd: 'maghrib', label: 'Maghrib' };
  if (s.includes('isya') || s.includes('isha')) return { key: 'Isha', cmd: 'isya', label: 'Isya' };
  return null;
}

function safeText(t = '') {
  return String(t).trim();
}

function normalizeJid(input) {
  const raw = String(input || '').trim();
  if (!raw) return '';
  if (raw.endsWith('@s.whatsapp.net')) return raw;
  if (raw.endsWith('@c.us')) return raw.replace('@c.us', '@s.whatsapp.net');
  if (raw.includes('@')) return raw;
  const digits = raw.replace(/[^\d]/g, '');
  if (!digits) return '';
  return `${digits}@s.whatsapp.net`;
}

module.exports = { toDateKey, nowMs, addDaysMs, normalizePrayerName, safeText, normalizeJid };
