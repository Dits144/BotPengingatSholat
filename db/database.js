const Database = require('better-sqlite3');
const { DateTime } = require('luxon');
const { DB_PATH, TIMEZONE } = require('../config');

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

db.exec(`
CREATE TABLE IF NOT EXISTS transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  group_id TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('income', 'expense')),
  amount INTEGER NOT NULL,
  note TEXT NOT NULL,
  sender_id TEXT NOT NULL,
  sender_name TEXT,
  created_at TEXT NOT NULL,
  edited_at TEXT,
  deleted_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_transactions_group_created
ON transactions(group_id, created_at DESC);

CREATE TABLE IF NOT EXISTS group_rentals (
  group_id TEXT PRIMARY KEY,
  is_active INTEGER NOT NULL DEFAULT 0,
  start_at TEXT,
  expire_at TEXT,
  updated_by TEXT,
  updated_at TEXT NOT NULL,
  last_warned_at TEXT
);
`);

function nowWibIso() {
  return DateTime.now().setZone(TIMEZONE).toISO();
}

function insertTransaction(payload) {
  return db.prepare(`
    INSERT INTO transactions (group_id, type, amount, note, sender_id, sender_name, created_at)
    VALUES (@group_id, @type, @amount, @note, @sender_id, @sender_name, @created_at)
  `).run(payload);
}

function updateTransaction(payload) {
  return db.prepare(`
    UPDATE transactions
      SET type=@type, amount=@amount, note=@note, edited_at=@edited_at
    WHERE id=@id AND deleted_at IS NULL
  `).run(payload);
}

function softDeleteTransaction(id) {
  return db.prepare(`
    UPDATE transactions SET deleted_at=?
    WHERE id=? AND deleted_at IS NULL
  `).run(nowWibIso(), id);
}

function getRental(groupId) {
  return db.prepare('SELECT * FROM group_rentals WHERE group_id = ?').get(groupId);
}

function isRentalActive(groupId) {
  const row = getRental(groupId);
  if (!row || !row.is_active || !row.expire_at) return false;
  return DateTime.fromISO(row.expire_at, { zone: TIMEZONE }) > DateTime.now().setZone(TIMEZONE);
}

function extendRental(groupId, days, updatedBy) {
  const current = getRental(groupId);
  const now = DateTime.now().setZone(TIMEZONE);
  const start = !current || !current.expire_at || DateTime.fromISO(current.expire_at, { zone: TIMEZONE }) <= now
    ? now
    : DateTime.fromISO(current.start_at || now.toISO(), { zone: TIMEZONE });

  const baseExpire = current?.expire_at && DateTime.fromISO(current.expire_at, { zone: TIMEZONE }) > now
    ? DateTime.fromISO(current.expire_at, { zone: TIMEZONE })
    : now;

  const expireAt = baseExpire.plus({ days }).set({ hour: 23, minute: 59, second: 0, millisecond: 0 });

  db.prepare(`
    INSERT INTO group_rentals (group_id, is_active, start_at, expire_at, updated_by, updated_at)
    VALUES (?, 1, ?, ?, ?, ?)
    ON CONFLICT(group_id) DO UPDATE SET
      is_active=1,
      start_at=excluded.start_at,
      expire_at=excluded.expire_at,
      updated_by=excluded.updated_by,
      updated_at=excluded.updated_at
  `).run(groupId, start.toISO(), expireAt.toISO(), updatedBy, now.toISO());

  return getRental(groupId);
}

function deactivateRental(groupId, updatedBy) {
  const now = nowWibIso();
  db.prepare(`
    INSERT INTO group_rentals (group_id, is_active, updated_by, updated_at)
    VALUES (?, 0, ?, ?)
    ON CONFLICT(group_id) DO UPDATE SET
      is_active=0,
      updated_by=excluded.updated_by,
      updated_at=excluded.updated_at
  `).run(groupId, updatedBy, now);
}

function markWarned(groupId) {
  db.prepare('UPDATE group_rentals SET last_warned_at=? WHERE group_id=?').run(nowWibIso(), groupId);
}

module.exports = {
  db,
  insertTransaction,
  updateTransaction,
  softDeleteTransaction,
  getRental,
  isRentalActive,
  extendRental,
  deactivateRental,
  markWarned,
  nowWibIso
};
