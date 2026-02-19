function normalizeUserJid(input) {
  const cleaned = input.trim().replace(/[^\d]/g, '');
  if (!cleaned) throw new Error('Nomor tidak valid.');
  return `${cleaned}@s.whatsapp.net`;
}

function displayNumber(jid) {
  return jid.replace('@s.whatsapp.net', '');
}

function isPrivateJid(jid) {
  return jid.endsWith('@s.whatsapp.net');
}

module.exports = { normalizeUserJid, displayNumber, isPrivateJid };
