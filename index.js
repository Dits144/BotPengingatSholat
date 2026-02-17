const { default: makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion, DisconnectReason } = require('baileys');
const pino = require('pino');
const qrcode = require('qrcode-terminal');
const { OWNER_NUMBERS, AUTH_DIR, LOG_LEVEL } = require('./config');
const { menuText } = require('./commands/help');
const { handleCalc } = require('./commands/calc');
const finance = require('./commands/finance');
const { handleOwnerCommand } = require('./commands/owner');
const { infoGroup } = require('./commands/info');
const { isRentalActive, lockedMessage, shouldWarnExpiring } = require('./commands/rental');

const cooldown = new Map();

function getText(msg) {
  const c = msg.message;
  return c?.conversation || c?.extendedTextMessage?.text || c?.imageMessage?.caption || c?.videoMessage?.caption || '';
}

function isAdmin(participants, senderId) {
  const p = participants.find((x) => x.id === senderId);
  return Boolean(p?.admin);
}

function inCooldown(senderId, key, ms = 1000) {
  const now = Date.now();
  const cacheKey = `${senderId}::${key}`;
  const prev = cooldown.get(cacheKey) || 0;
  if (now - prev < ms) return true;
  cooldown.set(cacheKey, now);
  return false;
}

async function start() {
  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    auth: state,
    printQRInTerminal: true,
    logger: pino({ level: LOG_LEVEL })
  });

  sock.ev.on('creds.update', saveCreds);
  sock.ev.on('connection.update', ({ connection, lastDisconnect, qr }) => {
    if (qr) {
      console.log('📱 Scan QR berikut di WhatsApp (Linked Devices):');
      qrcode.generate(qr, { small: true });
    }

    if (connection === 'open') console.log('✅ Bot connected');
    if (connection === 'close') {
      const code = lastDisconnect?.error?.output?.statusCode;
      if (code !== DisconnectReason.loggedOut) start().catch(console.error);
      else console.log('Session logged out. Scan ulang QR.');
    }
  });

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;
    const msg = messages[0];
    if (!msg?.message || msg.key.fromMe) return;

    const text = getText(msg).trim();
    if (!text) return;

    const groupId = msg.key.remoteJid;
    const isGroupMessage = groupId.endsWith('@g.us');
    const senderId = msg.key.participant || msg.key.remoteJid;
    const senderName = msg.pushName || 'Tanpa Nama';

    try {
      if (isGroupMessage) {
        const warning = shouldWarnExpiring(groupId);
        if (warning) await sock.sendMessage(groupId, { text: warning });
      }

      if (/^#/.test(text)) {
        if (!OWNER_NUMBERS.includes(senderId)) {
          await sock.sendMessage(groupId, { text: '❌ Perintah ini hanya untuk OWNER bot.' }, { quoted: msg });
          return;
        }
        const resp = await handleOwnerCommand({ sock, text, groupId, isGroupMessage });
        await sock.sendMessage(groupId, { text: resp }, { quoted: msg });
        return;
      }

      if (/^(menu|help)$/i.test(text)) {
        await sock.sendMessage(groupId, { text: menuText() }, { quoted: msg });
        return;
      }

      if (/^info$/i.test(text)) {
        const resp = await infoGroup(sock, groupId);
        await sock.sendMessage(groupId, { text: resp }, { quoted: msg });
        return;
      }

      const calc = handleCalc(text);
      if (calc) {
        await sock.sendMessage(groupId, { text: calc }, { quoted: msg });
        return;
      }

      const isFinanceCommand = /^([+-]|riwayat|edit\s+\d+|hapus\s+\d+|detail\s+\d+|saldo(\s|$))/i.test(text);
      if (isFinanceCommand && isGroupMessage && !isRentalActive(groupId)) {
        await sock.sendMessage(groupId, { text: lockedMessage() }, { quoted: msg });
        return;
      }

      const ctx = { text, groupId, senderId, senderName };

      if (/^riwayat(\s|$)/i.test(text) && inCooldown(senderId, 'riwayat', 1000)) {
        await sock.sendMessage(groupId, { text: '⏳ Tunggu 1 detik sebelum memakai command riwayat lagi.' }, { quoted: msg });
        return;
      }

      const history = await finance.riwayat(ctx);
      if (history) {
        await sock.sendMessage(groupId, { text: history }, { quoted: msg });
        return;
      }

      const summary = await finance.saldo(ctx);
      if (summary) {
        await sock.sendMessage(groupId, { text: summary }, { quoted: msg });
        return;
      }

      let admin = false;
      if (isGroupMessage && /^(edit\s+\d+|hapus\s+\d+)/i.test(text)) {
        const meta = await sock.groupMetadata(groupId);
        admin = isAdmin(meta.participants, senderId);
      }

      const edit = await finance.edit(ctx, admin);
      if (edit) {
        await sock.sendMessage(groupId, { text: edit }, { quoted: msg });
        return;
      }

      const del = await finance.remove(ctx, admin);
      if (del) {
        await sock.sendMessage(groupId, { text: del }, { quoted: msg });
        return;
      }

      const detail = await finance.detail(ctx);
      if (detail) {
        await sock.sendMessage(groupId, { text: detail }, { quoted: msg });
        return;
      }

      const tx = await finance.recordTransaction(ctx);
      if (tx) {
        await sock.sendMessage(groupId, { text: tx }, { quoted: msg });
        return;
      }

      if (/^[+-]/.test(text)) {
        await sock.sendMessage(groupId, { text: 'Format transaksi salah. Contoh:\n+ 15000 (Donasi Pak RT)\n- 12000 (Beli air mineral)' }, { quoted: msg });
      }
    } catch (err) {
      console.error(err);
      await sock.sendMessage(groupId, { text: 'Terjadi error saat memproses command.' }, { quoted: msg });
    }
  });
}

start().catch((e) => {
  console.error('Fatal error', e);
  process.exit(1);
});
