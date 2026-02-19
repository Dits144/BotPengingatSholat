const { DateTime } = require('luxon');
const { db } = require('../db/database');
const { env } = require('../config/env');
const { prayers } = require('../constants/messages');

function today() {
  return DateTime.now().setZone(env.timezone).toISODate();
}

function ensureRow(userJid, date = today()) {
  db.prepare('INSERT OR IGNORE INTO prayer_status (user_jid, date) VALUES (?, ?)').run(userJid, date);
}

function markPrayer(userJid, prayer, done, date = today()) {
  ensureRow(userJid, date);
  db.prepare(`UPDATE prayer_status SET ${prayer} = ? WHERE user_jid = ? AND date = ?`).run(done ? 1 : 0, userJid, date);
}

function getDayStatus(userJid, date = today()) {
  ensureRow(userJid, date);
  return db.prepare('SELECT * FROM prayer_status WHERE user_jid = ? AND date = ?').get(userJid, date);
}

function resetDayStatus(userJid, date = today()) {
  ensureRow(userJid, date);
  db.prepare('UPDATE prayer_status SET subuh = NULL, dzuhur = NULL, ashar = NULL, maghrib = NULL, isya = NULL WHERE user_jid = ? AND date = ?').run(userJid, date);
}

function createPendingPrompt(userJid, prayer, date = today()) {
  db.prepare('INSERT INTO pending_prompts (user_jid, prayer_name, date, status, created_at) VALUES (?, ?, ?, ?, ?)')
    .run(userJid, prayer, date, 'pending', DateTime.now().setZone(env.timezone).toISO());
}

function markUnansweredAsMissed(userJid, date = today()) {
  const pendings = db.prepare('SELECT * FROM pending_prompts WHERE user_jid = ? AND date = ? AND status = ?').all(userJid, date, 'pending');
  for (const pending of pendings) {
    markPrayer(userJid, pending.prayer_name, false, date);
    db.prepare('UPDATE pending_prompts SET status = ? WHERE id = ?').run('missed', pending.id);
  }
}

function resolvePending(userJid, done, prayer, date = today()) {
  const row = prayer
    ? db.prepare('SELECT * FROM pending_prompts WHERE user_jid = ? AND date = ? AND prayer_name = ? AND status = ? ORDER BY id DESC LIMIT 1').get(userJid, date, prayer, 'pending')
    : db.prepare('SELECT * FROM pending_prompts WHERE user_jid = ? AND date = ? AND status = ? ORDER BY id DESC LIMIT 1').get(userJid, date, 'pending');
  if (!row) return null;
  markPrayer(userJid, row.prayer_name, done, date);
  db.prepare('UPDATE pending_prompts SET status = ? WHERE id = ?').run(done ? 'answered_yes' : 'answered_no', row.id);
  return row.prayer_name;
}

function monthlyRecap(userJid) {
  const now = DateTime.now().setZone(env.timezone);
  const start = now.startOf('month').toISODate();
  const end = now.endOf('month').toISODate();
  return db.prepare('SELECT * FROM prayer_status WHERE user_jid = ? AND date BETWEEN ? AND ? ORDER BY date ASC').all(userJid, start, end).map((row) => {
    const bolong = prayers.map((p) => row[p]).filter((v) => v === 0 || v === null).length;
    return { date: row.date, bolong, full: bolong === 0 };
  });
}

function hasSentKind(userJid, date, kind) {
  return !!db.prepare('SELECT id FROM sent_notifications WHERE user_jid = ? AND date = ? AND kind = ?').get(userJid, date, kind);
}

function markSentKind(userJid, date, kind) {
  db.prepare('INSERT OR IGNORE INTO sent_notifications (user_jid, date, kind) VALUES (?, ?, ?)').run(userJid, date, kind);
}

module.exports = { getDayStatus, resetDayStatus, createPendingPrompt, markUnansweredAsMissed, resolvePending, monthlyRecap, hasSentKind, markSentKind };
