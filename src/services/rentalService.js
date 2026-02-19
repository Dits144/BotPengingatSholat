const { DateTime } = require('luxon');
const { db } = require('../db/database');
const { env } = require('../config/env');

function addOrUpdateRental(userJid, days) {
  const now = DateTime.now().setZone(env.timezone).toISODate();
  const endDate = DateTime.now().setZone(env.timezone).plus({ days }).toISODate();
  const existing = db.prepare('SELECT * FROM rentals WHERE user_jid = ?').get(userJid);
  if (existing) {
    db.prepare('UPDATE rentals SET start_date = ?, end_date = ?, active = 1, notified_expired = 0 WHERE user_jid = ?').run(now, endDate, userJid);
    return;
  }
  db.prepare('INSERT INTO rentals (user_jid, start_date, end_date, active) VALUES (?, ?, ?, 1)').run(userJid, now, endDate);
}

function deactivateRentalById(id) {
  return db.prepare('UPDATE rentals SET active = 0 WHERE id = ?').run(id).changes > 0;
}

function listRentals() {
  return db.prepare('SELECT * FROM rentals ORDER BY id ASC').all();
}

function getActiveRentalUsers() {
  const today = DateTime.now().setZone(env.timezone).toISODate();
  return db.prepare('SELECT user_jid FROM rentals WHERE active = 1 AND end_date >= ?').all(today).map((r) => r.user_jid);
}

function getRentalByUser(userJid) {
  return db.prepare('SELECT * FROM rentals WHERE user_jid = ?').get(userJid);
}

function expireDueRentals() {
  const today = DateTime.now().setZone(env.timezone).toISODate();
  const expired = db.prepare('SELECT * FROM rentals WHERE active = 1 AND end_date < ?').all(today);
  for (const row of expired) db.prepare('UPDATE rentals SET active = 0 WHERE id = ?').run(row.id);
  return expired;
}

module.exports = { addOrUpdateRental, deactivateRentalById, listRentals, getActiveRentalUsers, getRentalByUser, expireDueRentals };
