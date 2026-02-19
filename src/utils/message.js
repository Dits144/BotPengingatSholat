export function getRemoteJid(message) {
  return message?.key?.remoteJid || message?.remoteJid || "";
}

export function getMessageText(message) {
  const m = message?.message;
  if (!m) return "";

  if (m.conversation) return m.conversation;
  if (m.extendedTextMessage?.text) return m.extendedTextMessage.text;

  if (m.imageMessage?.caption) return m.imageMessage.caption;
  if (m.videoMessage?.caption) return m.videoMessage.caption;

  if (m.buttonsResponseMessage?.selectedButtonId) return m.buttonsResponseMessage.selectedButtonId;
  if (m.listResponseMessage?.singleSelectReply?.selectedRowId) return m.listResponseMessage.singleSelectReply.selectedRowId;

  if (m.ephemeralMessage?.message) {
    return getMessageText({ message: m.ephemeralMessage.message });
  }

  if (m.viewOnceMessage?.message) {
    return getMessageText({ message: m.viewOnceMessage.message });
  }

  return "";
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
