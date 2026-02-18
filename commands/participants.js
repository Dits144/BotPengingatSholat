const { DateTime } = require('luxon');
const { db } = require('../db/database');
const { TIMEZONE } = require('../config');

const PAGE_SIZE = 14;
const lastParticipantList = new Map();

function cacheKey(groupId, senderId) {
  return `${groupId}::${senderId}`;
}

function templateHeader() {
  return [
    'PESERTA',
    'ONE DAY TRIP',
    'MOUNT PAPANDAYAN',
    '',
    '🗓️ Tanggal: 28 Maret 2026',
    '⏰ Durasi: 1 Hari (PP)',
    '📍 Meeting Point: Kab.Bogor',
    '',
    'List of names:'
  ];
}

function nowIso() {
  return DateTime.now().setZone(TIMEZONE).toISO();
}

function handleListPeserta(ctx) {
  const m = ctx.text.trim().match(/^listpeserta(?:\s+(\d+))?$/i);
  if (!m) return null;

  const page = Math.max(1, Number.parseInt(m[1] || '1', 10));
  const offset = (page - 1) * PAGE_SIZE;

  const total = db.prepare('SELECT COUNT(*) as total FROM participants WHERE group_id=? AND deleted_at IS NULL').get(ctx.groupId).total;
  if (!total) {
    return [...templateHeader(), '- Belum ada peserta.'].join('\n');
  }

  const rows = db.prepare(`
    SELECT * FROM participants
    WHERE group_id=? AND deleted_at IS NULL
    ORDER BY datetime(created_at) ASC
    LIMIT ? OFFSET ?
  `).all(ctx.groupId, PAGE_SIZE, offset);

  if (!rows.length) return `Halaman ${page} kosong. Total peserta: ${total}.`;

  lastParticipantList.set(cacheKey(ctx.groupId, ctx.senderId), rows.map((r) => r.id));

  const startNo = offset + 1;
  const lines = rows.map((r, idx) => `${startNo + idx}) ${r.name}`);

  const pageCount = Math.ceil(total / PAGE_SIZE);
  const suffix = [
    '',
    'Ketik nomor untuk lihat data peserta.'
  ];
  if (page < pageCount) {
    suffix.push(`Ketik listpeserta ${page + 1} untuk halaman ${page + 1}.`);
  }

  return [...templateHeader(), ...lines, ...suffix].join('\n');
}

function resolveIdFromCache(ctx, no) {
  const ids = lastParticipantList.get(cacheKey(ctx.groupId, ctx.senderId)) || [];
  const idx = no - 1;
  return ids[idx] || null;
}

function handleNumericDetail(ctx) {
  if (!/^\d+$/.test(ctx.text.trim())) return null;
  const no = Number.parseInt(ctx.text.trim(), 10);
  if (no <= 0) return null;

  const id = resolveIdFromCache(ctx, no);
  if (!id) return null;

  const row = db.prepare('SELECT * FROM participants WHERE id=? AND deleted_at IS NULL').get(id);
  if (!row) return 'Peserta tidak ditemukan / sudah dihapus.';

  return [
    `👤 DETAIL PESERTA #${no}`,
    `Nama: ${row.name}`,
    'Data:',
    row.data
  ].join('\n');
}

function handleAddPeserta(ctx, canManage) {
  if (!/^addpeserta\s+/i.test(ctx.text.trim())) return null;
  if (!canManage) return '⛔ Hanya admin grup atau owner bot yang boleh addpeserta.';

  const raw = ctx.text.trim().replace(/^addpeserta\s+/i, '');
  const atIndex = raw.indexOf('@');
  if (atIndex <= 0 || atIndex === raw.length - 1) {
    return 'Format salah. Contoh: addpeserta Raditya@(No HP: 08xxx | Alamat: ... | Info: ...)';
  }

  const name = raw.slice(0, atIndex).trim();
  const data = raw.slice(atIndex + 1).trim();
  if (!name || !data) {
    return 'Nama dan data wajib diisi. Contoh: addpeserta Raditya@(No HP: 08xxx | Alamat: ... | Info: ...)';
  }

  const now = nowIso();
  const result = db.prepare(`
    INSERT INTO participants (group_id, name, data, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(ctx.groupId, name, data, now, now);

  const position = db.prepare('SELECT COUNT(*) as total FROM participants WHERE group_id=? AND deleted_at IS NULL').get(ctx.groupId).total;

  return [
    '✅ Peserta ditambahkan',
    `Nama: ${name}`,
    `No urut: ${position}`,
    `ID: ${result.lastInsertRowid}`
  ].join('\n');
}

function handleDeletePeserta(ctx, canManage) {
  const m = ctx.text.trim().match(/^delpeserta\s+no\s+(\d+)$/i);
  if (!m) return null;
  if (!canManage) return '⛔ Hanya admin grup atau owner bot yang boleh delpeserta.';

  const no = Number.parseInt(m[1], 10);
  const id = resolveIdFromCache(ctx, no);
  if (!id) return 'Nomor peserta tidak ditemukan. Jalankan listpeserta dulu.';

  const updated = db.prepare('UPDATE participants SET deleted_at=?, updated_at=? WHERE id=? AND deleted_at IS NULL').run(nowIso(), nowIso(), id);
  if (!updated.changes) return 'Peserta tidak ditemukan / sudah dihapus.';

  return `🗑️ Peserta #${no} berhasil dihapus`;
}

function handleUpdatePeserta(ctx, canManage) {
  const raw = ctx.text.trim();
  if (!/^updatepeserta\s+no\s+/i.test(raw)) return null;
  if (!canManage) return '⛔ Hanya admin grup atau owner bot yang boleh updatepeserta.';

  const m = raw.match(/^updatepeserta\s+no\s+(\d+)@([\s\S]+)$/i);
  if (!m) {
    return 'Format salah. Contoh: updatepeserta no 4@(No HP: ... | Update data ...)';
  }

  const no = Number.parseInt(m[1], 10);
  const newData = m[2].trim();
  if (!newData) return 'Data baru wajib diisi.';

  const id = resolveIdFromCache(ctx, no);
  if (!id) return 'Nomor peserta tidak ditemukan. Jalankan listpeserta dulu.';

  const updated = db.prepare('UPDATE participants SET data=?, updated_at=? WHERE id=? AND deleted_at IS NULL').run(newData, nowIso(), id);
  if (!updated.changes) return 'Peserta tidak ditemukan / sudah dihapus.';

  return `✏️ Peserta #${no} berhasil diupdate`;
}

module.exports = {
  handleListPeserta,
  handleNumericDetail,
  handleAddPeserta,
  handleDeletePeserta,
  handleUpdatePeserta
};
