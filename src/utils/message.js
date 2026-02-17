function readTextNode(node = {}) {
  return (
    node.conversation ||
    node.extendedTextMessage?.text ||
    node.imageMessage?.caption ||
    node.videoMessage?.caption ||
    node.documentMessage?.caption ||
    ""
  );
}

export function getMessageText(message) {
  const msg = message.message ?? {};

  const directText = readTextNode(msg);
  if (directText) return directText.trim();

  if (msg.ephemeralMessage?.message) {
    const text = readTextNode(msg.ephemeralMessage.message);
    if (text) return text.trim();
  }

  if (msg.viewOnceMessage?.message) {
    const text = readTextNode(msg.viewOnceMessage.message);
    if (text) return text.trim();
  }

  return "";
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

    if (jid.endsWith("@lid")) {
      const user = jid.split("@")[0].split(":")[0];
      return `${user}@s.whatsapp.net`;
    }

    return jid;
  }
  return `${jid}@s.whatsapp.net`;
}

export function isPrivateChatJid(jid = "") {
  return jid.endsWith("@s.whatsapp.net") || jid.endsWith("@lid");
}
