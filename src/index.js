const makeWASocketModule = require('@whiskeysockets/baileys');
const pino = require('pino');
const { runInitialSetup } = require('./bootstrap/setup');
const { env } = require('./config/env');
const { initDb } = require('./db/database');
const { handleCommand } = require('./handlers/commandHandler');
const { startScheduler } = require('./scheduler/scheduler');
const { isPrivateJid } = require('./utils/jid');

const { default: makeWASocket, DisconnectReason, fetchLatestBaileysVersion, useMultiFileAuthState } = makeWASocketModule;
const logger = pino({ level: 'info' });

async function connectWhatsApp() {
  const { state, saveCreds } = await useMultiFileAuthState('auth');
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({ version, auth: state, printQRInTerminal: true, logger });

  sock.ev.on('creds.update', saveCreds);
  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect } = update;
    if (update.qr) console.log('\n[whatsapp] Scan QR terbaru di terminal untuk login.\n');

    if (connection === 'open') {
      console.log('[whatsapp] ✅ Koneksi berhasil dibuka.');
      startScheduler(sock);
      await sock.sendMessage(env.ownerGroupId, { text: `✅ ${env.botName} aktif dan siap bertugas.` });
    }

    if (connection === 'close') {
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
      console.error(`[whatsapp] Koneksi tertutup. reconnect=${shouldReconnect}`);
      if (shouldReconnect) setTimeout(() => void startBot(), 2000);
      else console.error('[whatsapp] Session logout. Hapus folder auth lalu scan ulang QR.');
    }
  });

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;
    for (const msg of messages) {
      if (!msg.message || msg.key.fromMe) continue;
      const chatId = msg.key.remoteJid;
      if (!chatId) continue;
      const text = msg.message.conversation || msg.message.extendedTextMessage?.text;
      if (!text) continue;
      const sender = msg.key.participant || chatId;
      const isOwnerGroup = chatId === env.ownerGroupId;
      if (!isPrivateJid(chatId) && !isOwnerGroup) continue;
      try {
        await handleCommand(sock, sender, chatId, text);
      } catch (error) {
        console.error('[message-handler] Error:', error);
        await sock.sendMessage(chatId, { text: 'Maaf, terjadi error. Coba lagi sebentar.' });
      }
    }
  });
}

async function startBot() {
  try {
    console.log('[startup] Starting WhatsApp Bot (JavaScript)...');
    runInitialSetup();
    initDb();
    console.log('[startup] Database siap.');
    await connectWhatsApp();
  } catch (err) {
    console.error('[startup] Startup error:', err);
    setTimeout(() => void startBot(), 3000);
  }
}

void startBot();
