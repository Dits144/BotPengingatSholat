export function getMessageText(message) {
  const msg = message.message ?? {};
  return (
    msg.conversation ||
    msg.extendedTextMessage?.text ||
    msg.imageMessage?.caption ||
    msg.videoMessage?.caption ||
    ""
  ).trim();
}

export function getRemoteJid(message) {
  return message.key?.remoteJid || message.remoteJid || "";
}

export function normalizeUserJid(jid) {
  if (!jid) return jid;
  if (jid.includes("@")) {
    if (jid.endsWith("@c.us")) {
      return jid.replace("@c.us", "@s.whatsapp.net");
    }
    return jid;
  }
  return `${jid}@s.whatsapp.net`;
}
