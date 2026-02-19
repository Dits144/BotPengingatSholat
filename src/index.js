const baileys = require('@whiskeysockets/baileys');
const makeWASocket = baileys.default;
const { useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = baileys;
const P = require('pino');
const qrcode = require('qrcode-terminal');
const fs = require('fs');
const path = require('path');

const { handleCommand } = require('./commands');
const { startScheduler } = require('./scheduler');

const AUTH_DIR = path.join(process.cwd(), 'auth');

function ensureDirs() {
  if (!fs.existsSync(AUTH_DIR)) fs.mkdirSync(AUTH_DIR, { recursive: true });
  const dataDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
}

async function startBot() {
  ensureDirs();

  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    auth: state,
    logger: P({ level: 'silent' }),
    printQRInTerminal: false
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      console.log('\n📌 Scan QR ini pakai WhatsApp > Linked Devices:');
      qrcode.generate(qr, { small: true });
    }

    if (connection === 'open') {
      console.log('✅ Bot connected! WhatsApp login sukses.\n');
      startScheduler(sock);
    }

    if (connection === 'close') {
      const code = lastDisconnect?.error?.output?.statusCode;
      const shouldReconnect = code !== DisconnectReason.loggedOut;
      console.log('⚠️ connection closed:', code, 'reconnect:', shouldReconnect);

      if (shouldReconnect) {
        setTimeout(() => startBot().catch(console.error), 2000);
      } else {
        console.log('❌ Logout. Hapus folder auth/ lalu jalankan ulang untuk QR baru.');
      }
    }
  });

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    try {
      if (type !== 'notify') return;
      const msg = messages[0];
      if (!msg?.message || msg.key.fromMe) return;

      const text =
        msg.message.conversation ||
        msg.message.extendedTextMessage?.text ||
        msg.message.imageMessage?.caption ||
        msg.message.videoMessage?.caption ||
        '';

      if (!text) return;
      await handleCommand(sock, msg, text);
    } catch (e) {
      console.error('[messages.upsert] error:', e?.message || e);
    }
  });

  return sock;
}

startBot().catch((e) => {
  console.error('❌ Startup error:', e);
});
