require('dotenv').config();
const pino = require('pino');
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const { authDir } = require('./src/config');
const { ensureDataFiles } = require('./src/services/storage');
const { handleMessage } = require('./src/handlers/message');

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

async function startBot() {
  ensureDataFiles();

  const { state, saveCreds } = await useMultiFileAuthState(authDir);
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    auth: state,
    logger,
    printQRInTerminal: true,
    markOnlineOnConnect: false,
    syncFullHistory: false,
    browser: ['Ditstore Bot', 'Chrome', '1.0.0'],
  });

  sock.ev.on('creds.update', saveCreds);
  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;
    const msg = messages[0];
    if (!msg.message || msg.key.fromMe) return;
    try {
      await handleMessage(sock, msg);
    } catch (error) {
      logger.error({ err: error }, 'message handler failed');
    }
  });

  sock.ev.on('connection.update', ({ connection, lastDisconnect }) => {
    if (connection === 'open') logger.info('Ditstore Bot connected ✅');
    if (connection === 'close') {
      const reason = new Boom(lastDisconnect?.error)?.output?.statusCode;
      const shouldReconnect = reason !== DisconnectReason.loggedOut;
      logger.warn({ reason, shouldReconnect }, 'connection closed');
      if (shouldReconnect) setTimeout(startBot, 2000);
    }
  });
}

startBot().catch((err) => {
  logger.error({ err }, 'fatal startup error');
  process.exit(1);
});
