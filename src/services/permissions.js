const { getOwnerData } = require('./storage');

function normalizeJid(jid = '') {
  return jid.split(':')[0];
}

function getParticipantAdminSet(metadata) {
  const set = new Set();
  for (const p of metadata?.participants || []) {
    if (p.admin) set.add(normalizeJid(p.id));
  }
  return set;
}

function resolveRole({ senderJid, metadata, userProfile }) {
  const ownerData = getOwnerData();
  const sender = normalizeJid(senderJid);
  if (ownerData.ownerJid && normalizeJid(ownerData.ownerJid) === sender) return 'owner';
  const admins = getParticipantAdminSet(metadata);
  if (admins.has(sender)) return 'admin';
  if (userProfile?.premium) return 'premium';
  return 'member';
}

function hasRole(required, contextRole) {
  const rank = { member: 0, premium: 1, admin: 2, owner: 3 };
  return (rank[contextRole] ?? 0) >= (rank[required] ?? 0);
}

module.exports = { normalizeJid, getParticipantAdminSet, resolveRole, hasRole };
