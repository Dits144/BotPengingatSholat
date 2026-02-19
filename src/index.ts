import makeWASocket, { DisconnectReason, useMultiFileAuthState, fetchLatestBaileysVersion } from 'baileys';
import pino from 'pino';
import { initDb } from './db/database';
import { startScheduler } from './scheduler/scheduler';
import { handleCommand } from './handlers/commandHandler';
import { env } from './config/env';
import { isPrivateJid } from './utils/jid';

const logger = pino({ level: 'info' });

async function startBot() {
  initDb();

  const { state, saveCreds } = await useMultiFileAuthState('auth');
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    auth: state,
    printQRInTerminal: true,
    logger
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', async (update: any) => {
    const { connection, lastDisconnect } = update;

    if (update.qr) {
      console.log('\nScan QR ini untuk login WhatsApp:\n');
    }

    if (connection === 'close') {
      const statusCode = (lastDisconnect?.error as any)?.output?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
      console.error('Connection closed. Reconnect:', shouldReconnect);
      if (shouldReconnect) {
        setTimeout(startBot, 1500);
      }
    }

    if (connection === 'open') {
      console.log('✅ Bot WhatsApp terkoneksi.');
      startScheduler(sock);
      await sock.sendMessage(env.ownerGroupId, { text: `✅ ${env.botName} aktif dan siap bertugas.` });
    }
  });

  sock.ev.on('messages.upsert', async ({ messages, type }: any) => {
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
        console.error('[message-handler]', error);
        await sock.sendMessage(chatId, { text: 'Maaf, terjadi error. Coba lagi sebentar.' });
      }
    }
  });
}

startBot().catch((error) => {
  console.error('Fatal error', error);
  process.exit(1);
});
