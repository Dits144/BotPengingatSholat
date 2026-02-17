function normalizeJid(jid = '') {
  let normalized = String(jid).trim();
  normalized = normalized.replace(/:\d+(?=@)/, '');
  if (normalized.endsWith('@c.us')) {
    normalized = normalized.replace('@c.us', '@s.whatsapp.net');
  }
  return normalized;
}

function extractUserNumber(jid = '') {
  const normalized = normalizeJid(jid);
  const local = normalized.split('@')[0] || '';
  return local.replace(/[^0-9]/g, '');
}

function getSenderJid(msg) {
  return msg?.key?.participant || msg?.key?.remoteJid || '';
}

function isOwner(senderJid, ownerJids = []) {
  const senderNumber = extractUserNumber(senderJid);
  if (!senderNumber) return false;
  const ownerNumbers = ownerJids.map(extractUserNumber).filter(Boolean);
  return ownerNumbers.includes(senderNumber);
}

module.exports = {
  normalizeJid,
  extractUserNumber,
  getSenderJid,
  isOwner
};
