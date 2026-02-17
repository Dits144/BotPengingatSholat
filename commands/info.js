async function infoGroup(sock, groupId) {
  if (!groupId.endsWith('@g.us')) return 'Perintah ini hanya di grup.';
  const meta = await sock.groupMetadata(groupId);
  return ['ℹ️ INFO GROUP', `Nama: ${meta.subject}`, `ID: ${meta.id}`, `Member: ${meta.participants.length}`].join('\n');
}

module.exports = { infoGroup };
