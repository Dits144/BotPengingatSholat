const { DateTime } = require('luxon');
const { db } = require('../db/database');
const { TIMEZONE } = require('../config');

const listCache = new Map();

function nowIso() {
  return DateTime.now().setZone(TIMEZONE).toISO();
}

function key(groupId, senderId) {
  return `${groupId}::${senderId}`;
}

function handleTodo(ctx, canManage) {
  const text = ctx.text.trim();

  if (/^todo\s+lihat$/i.test(text) || /^todolist$/i.test(text)) {
    const rows = db.prepare(`SELECT * FROM todos WHERE group_id=? AND deleted_at IS NULL ORDER BY datetime(created_at) ASC`).all(ctx.groupId);
    if (!rows.length) return '📝 Todo kosong.';
    listCache.set(key(ctx.groupId, ctx.senderId), rows.map((r) => r.id));
    const lines = rows.map((r, i) => `${i + 1}) ${r.is_done ? '✅' : '⬜'} ${r.todo_text}`);
    return ['📝 TODO LIST', ...lines, '', 'Ketik: todo selesai 2 atau doto 2'].join('\n');
  }

  const add = text.match(/^todo\s+tambah\s+([\s\S]+)$/i);
  if (add) {
    if (!canManage) return '⛔ Hanya admin grup atau owner bot yang boleh tambah todo.';
    const todoText = add[1].trim();
    if (!todoText) return 'Format salah. Contoh: todo tambah revisi skripsi';
    const now = nowIso();
    db.prepare(`INSERT INTO todos (group_id, todo_text, is_done, created_at, updated_at) VALUES (?, ?, 0, ?, ?)`).run(ctx.groupId, todoText, now, now);
    return `✅ Todo ditambahkan: ${todoText}`;
  }

  const done = text.match(/^(?:todo\s+selesai|doto)\s+(\d+)$/i);
  if (done) {
    if (!canManage) return '⛔ Hanya admin grup atau owner bot yang boleh tandai todo selesai.';
    const no = Number.parseInt(done[1], 10);
    const ids = listCache.get(key(ctx.groupId, ctx.senderId)) || [];
    const id = ids[no - 1];
    if (!id) return 'Nomor todo tidak ditemukan. Jalankan todo lihat / todolist dulu.';
    const res = db.prepare(`UPDATE todos SET is_done=1, updated_at=? WHERE id=? AND deleted_at IS NULL`).run(nowIso(), id);
    if (!res.changes) return 'Todo tidak ditemukan.';
    return `✅ Todo #${no} selesai.`;
  }

  return null;
}

module.exports = { handleTodo };
