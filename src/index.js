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

function extractText(msg) {
  return (
    msg.message?.conversation ||
    msg.message?.extendedTextMessage?.text ||
    msg.message?.imageMessage?.caption ||
    msg.message?.videoMessage?.caption ||
    ''
  );
}

async function startBot() {
  ensureDirs();

  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    auth: state,
    logger: P({ level: 'silent' }),
    printQRInTerminal: false,
    markOnlineOnConnect: false
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

  // Penting: proses SEMUA messages, jangan hanya messages[0],
  // supaya command tidak miss saat ada message yang gagal decrypt (Bad MAC).
  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    try {
      if (type !== 'notify') return;

      for (const msg of messages) {
        if (!msg?.message || msg.key?.fromMe) continue;

        const text = extractText(msg);
        if (!text) continue;

        await handleCommand(sock, msg, text);
      }
    } catch (e) {
      const message = e?.message || String(e);
      if (message.includes('Bad MAC')) {
        console.log('⚠️ Sesi enkripsi berubah (Bad MAC), bot akan lanjut otomatis.');
        return;
      }
      console.error('[messages.upsert] error:', message);
    }
  });

  return sock;
}

startBot().catch((e) => {
  const message = e?.message || String(e);
  if (message.includes('Bad MAC')) {
    console.log('⚠️ Startup sempat kena Bad MAC, coba lagi otomatis...');
    setTimeout(() => startBot().catch(console.error), 2000);
    return;
  }
  console.error('❌ Startup error:', e);
});
