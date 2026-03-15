const { DateTime } = require('luxon');
const { db } = require('../db/database');
const { TIMEZONE } = require('../config');

function nowIso() {
  return DateTime.now().setZone(TIMEZONE).toISO();
}

function parseRemind(raw) {
  const m = raw.match(/^remind\s+([^@]+)@([\s\S]+)$/i);
  if (!m) return null;
  const when = m[1].trim();
  const text = m[2].trim();
  if (!when || !text) return null;

  if (/^\d{2}:\d{2}$/.test(when)) return { type: 'time', value: when, text };
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(when)) return { type: 'date', value: when, text };
  return { error: 'Format waktu/tanggal salah. Pakai HH:mm atau DD/MM/YYYY.' };
}

function handleRemind(ctx, canManage) {
  if (!/^remind\s+/i.test(ctx.text.trim())) return null;
  if (!canManage) return '⛔ Hanya admin grup atau owner bot yang boleh tambah reminder.';

  const parsed = parseRemind(ctx.text.trim());
  if (!parsed) return 'Format salah. Contoh: remind 05:00@bangun sholat subuh atau remind 17/08/2026@Peringatan Kemerdekaan Indonesia';
  if (parsed.error) return parsed.error;

  db.prepare(`
    INSERT INTO reminders (group_id, remind_type, remind_value, remind_text, created_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(ctx.groupId, parsed.type, parsed.value, parsed.text, nowIso());

  return `⏰ Reminder disimpan: ${parsed.value} - ${parsed.text}`;
}

function handleListRemind(ctx) {
  if (!/^listremind$/i.test(ctx.text.trim())) return null;

  const rows = db.prepare(`
    SELECT * FROM reminders
    WHERE group_id=? AND deleted_at IS NULL
    ORDER BY datetime(created_at) ASC
  `).all(ctx.groupId);

  if (!rows.length) return '📭 Belum ada reminder.';
  const lines = rows.map((r, i) => `${i + 1}) ${r.remind_value} | ${r.remind_text}`);
  return ['⏰ LIST REMINDER', ...lines].join('\n');
}

function handleNoRemind(ctx, canManage) {
  const m = ctx.text.trim().match(/^noremind\s+(.+)$/i);
  if (!m) return null;
  if (!canManage) return '⛔ Hanya admin grup atau owner bot yang boleh hapus reminder.';

  const value = m[1].trim();
  if (!value) return 'Format salah. Contoh: noremind 05:00 atau noremind 17/08/2026';

  const now = nowIso();
  const res = db.prepare(`
    UPDATE reminders
    SET deleted_at=?
    WHERE group_id=? AND remind_value=? AND deleted_at IS NULL
  `).run(now, ctx.groupId, value);

  if (!res.changes) return `Reminder ${value} tidak ditemukan.`;
  return `🗑️ Reminder ${value} dihapus.`;
}

module.exports = { handleRemind, handleListRemind, handleNoRemind };
