function normalizeJid(jid = '') {
  let normalized = String(jid).trim();
  normalized = normalized.replace(/:\d+(?=@)/, '');
  if (normalized.endsWith('@c.us')) {
    normalized = normalized.replace('@c.us', '@s.whatsapp.net');
  }
  return normalized;
}

function getSenderJid(msg) {
  return msg?.key?.participant || msg?.key?.remoteJid || '';
}

function isOwner(senderJid, ownerJids = []) {
  const sender = normalizeJid(senderJid);
  const owners = ownerJids.map(normalizeJid);
  return owners.includes(sender);
}

module.exports = {
  normalizeJid,
  getSenderJid,
  isOwner
};
