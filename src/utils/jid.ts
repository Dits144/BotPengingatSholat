export function normalizeUserJid(input: string): string {
  const cleaned = input.trim().replace(/[^\d]/g, '');
  if (!cleaned) {
    throw new Error('Nomor tidak valid.');
  }
  return `${cleaned}@s.whatsapp.net`;
}

export function displayNumber(jid: string): string {
  return jid.replace('@s.whatsapp.net', '');
}

export function isPrivateJid(jid: string): boolean {
  return jid.endsWith('@s.whatsapp.net');
}
