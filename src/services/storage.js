const fs = require('fs');
const path = require('path');
const { dataDir } = require('../config');

const CLAIM_OWNER_SECRET = 'qwertyuiopasdfghjklzxcvbnm';

const files = {
  owner: path.join(dataDir, 'owner.json'),
  store: path.join(dataDir, 'store.json'),
  orders: path.join(dataDir, 'orders.json'),
  users: path.join(dataDir, 'users.json'),
  groups: path.join(dataDir, 'groups.json'),
};

function ensureDataFiles() {
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  initFile(files.store, { items: [], templates: {}, symbol: '✧', payments: [], testimonials: [] });
  initFile(files.orders, { orders: [] });
  initFile(files.users, { users: {} });
  initFile(files.groups, { groups: {} });

  if (!fs.existsSync(files.owner)) {
    const payload = { ownerJid: null, ownerPassword: CLAIM_OWNER_SECRET, createdAt: new Date().toISOString() };
    fs.writeFileSync(files.owner, JSON.stringify(payload, null, 2));
    console.log('\n[Ditstore Bot] Claim owner code aktif:');
    console.log(`[Ditstore Bot] ${CLAIM_OWNER_SECRET}`);
    console.log('[Ditstore Bot] Ketik code ini di grup mana saja untuk claim owner pertama.\n');
  }
}

function initFile(filePath, fallback) {
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify(fallback, null, 2));
  }
}

function readJson(filePath, fallback = {}) {
  try {
    if (!fs.existsSync(filePath)) return fallback;
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch {
    return fallback;
  }
}

function writeJson(filePath, data) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

function getOwnerData() {
  return readJson(files.owner, { ownerJid: null, ownerPassword: CLAIM_OWNER_SECRET });
}

function claimOwner(jid, passwordInput) {
  const data = getOwnerData();
  if (data.ownerJid) return { ok: false, message: 'Owner sudah ter-claim. Reset via file data/owner.json jika diperlukan.' };
  if (passwordInput !== data.ownerPassword) return { ok: false, message: 'Password claimowner salah.' };
  data.ownerJid = jid;
  writeJson(files.owner, data);
  return { ok: true, message: 'Berhasil claim owner. Akses OWNER aktif untuk akun ini.' };
}

function getUserProfile(jid) {
  const db = readJson(files.users, { users: {} });
  if (!db.users[jid]) db.users[jid] = { premium: false, vip: false, limit: 10, level: 1, exp: 0 };
  writeJson(files.users, db);
  return db.users[jid];
}

function updateGroup(groupId, patch) {
  const db = readJson(files.groups, { groups: {} });
  db.groups[groupId] = { ...(db.groups[groupId] || {}), ...patch };
  writeJson(files.groups, db);
  return db.groups[groupId];
}

module.exports = {
  CLAIM_OWNER_SECRET,
  files,
  ensureDataFiles,
  readJson,
  writeJson,
  getOwnerData,
  claimOwner,
  getUserProfile,
  updateGroup,
};
