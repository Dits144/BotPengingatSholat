require('dotenv').config();

const { default: makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion, DisconnectReason } = require('baileys');
const pino = require('pino');
const { createFinanceHandlers } = require('./commands/finance');
const { handleCalc } = require('./commands/calc');
const { handleInfo } = require('./commands/info');
const { getHelpText } = require('./commands/help');

function getTextFromMessage(message) {
  const content = message?.message;
  if (!content) return '';
  return content.conversation
    || content.extendedTextMessage?.text
    || content.imageMessage?.caption
    || content.videoMessage?.caption
    || '';
}

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState(process.env.AUTH_DIR || 'auth_info_baileys');
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    auth: state,
    printQRInTerminal: true,
    logger: pino({ level: process.env.LOG_LEVEL || 'silent' })
  });

  const getIsGroupAdmin = async (groupId, senderId) => {
    if (!groupId.endsWith('@g.us')) return true;
    const metadata = await sock.groupMetadata(groupId);
    const participant = metadata.participants.find((p) => p.id === senderId);
    return Boolean(participant?.admin);
  };

  const finance = createFinanceHandlers({ getIsGroupAdmin });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', ({ connection, lastDisconnect }) => {
    if (connection === 'close') {
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      if (statusCode !== DisconnectReason.loggedOut) {
        startBot().catch((err) => console.error('Reconnect error:', err));
      } else {
        console.log('Session logout. Hapus folder auth lalu scan ulang.');
      }
    }

    if (connection === 'open') {
      console.log('✅ WhatsApp bot connected');
    }
  });

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;
    const msg = messages[0];
    if (!msg?.message || msg.key.fromMe) return;

    const text = getTextFromMessage(msg).trim();
    if (!text) return;

    const groupId = msg.key.remoteJid;
    const senderId = msg.key.participant || msg.key.remoteJid;
    const senderName = msg.pushName || 'Tanpa Nama';

    const payload = { text, groupId, senderId, senderName };

    try {
      if (/^(menu|help)$/i.test(text)) {
        await sock.sendMessage(groupId, { text: getHelpText() }, { quoted: msg });
        return;
      }

      const infoResp = /^info$/i.test(text) ? await handleInfo({ sock, groupId }) : null;
      if (infoResp) {
        await sock.sendMessage(groupId, { text: infoResp }, { quoted: msg });
        return;
      }

      const calcResp = handleCalc(text);
      if (calcResp) {
        await sock.sendMessage(groupId, { text: calcResp }, { quoted: msg });
        return;
      }

      const riwayat = await finance.handleRiwayat(payload);
      if (riwayat) {
        await sock.sendMessage(groupId, { text: riwayat }, { quoted: msg });
        return;
      }

      const saldo = await finance.handleSaldo(payload);
      if (saldo) {
        await sock.sendMessage(groupId, { text: saldo }, { quoted: msg });
        return;
      }

      const edit = await finance.handleEdit(payload);
      if (edit) {
        await sock.sendMessage(groupId, { text: edit }, { quoted: msg });
        return;
      }

      const del = await finance.handleDelete(payload);
      if (del) {
        await sock.sendMessage(groupId, { text: del }, { quoted: msg });
        return;
      }

      const detail = await finance.handleDetail(payload);
      if (detail) {
        await sock.sendMessage(groupId, { text: detail }, { quoted: msg });
        return;
      }

      const txResp = await finance.handleTransactionInput(payload);
      if (txResp?.handled) {
        await sock.sendMessage(groupId, { text: txResp.reply }, { quoted: msg });
        return;
      }

      if (/^[+-]/.test(text)) {
        await sock.sendMessage(groupId, {
          text: 'Format transaksi salah. Contoh benar:\n+ 15000 (Donasi Pak RT)\n- 12000 (Beli air mineral)'
        }, { quoted: msg });
      }
    } catch (err) {
      console.error('Message handler error:', err);
      await sock.sendMessage(groupId, { text: 'Terjadi error saat proses perintah. Coba lagi.' }, { quoted: msg });
    }
  });
}

startBot().catch((err) => {
  console.error('Gagal menjalankan bot:', err);
  process.exit(1);
});
