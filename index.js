const { default: makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion, DisconnectReason } = require('baileys');
const pino = require('pino');
const qrcode = require('qrcode-terminal');
const { OWNER_NUMBERS, AUTH_DIR, LOG_LEVEL, CLAIM_OWNER_CODE } = require('./config');
const { addOwner, getOwnerNumbers } = require('./db/database');
const { normalizeJid, extractUserNumber, getSenderJid, isOwner } = require('./utils/jid');
const { menuText } = require('./commands/help');
const { handleCalc } = require('./commands/calc');
const finance = require('./commands/finance');
const participants = require('./commands/participants');
const customCommands = require('./commands/customCommands');
const reminder = require('./commands/reminder');
const todo = require('./commands/todo');
const weather = require('./commands/weather');
const { handleOwnerCommand } = require('./commands/owner');
const { infoGroup } = require('./commands/info');
const { isRentalActive, lockedMessage, shouldWarnExpiring } = require('./commands/rental');

const cooldown = new Map();

function getText(msg) {
  const c = msg.message;
  return c?.conversation || c?.extendedTextMessage?.text || c?.imageMessage?.caption || c?.videoMessage?.caption || '';
}

function isAdmin(participantsMeta, senderId) {
  const sender = normalizeJid(senderId);
  const p = participantsMeta.find((x) => normalizeJid(x.id) === sender);
  return Boolean(p?.admin);
}

function isSenderOwner(senderJid) {
  const ownerPool = [...OWNER_NUMBERS, ...getOwnerNumbers()];
  return isOwner(senderJid, ownerPool);
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

  const sock = makeWASocket({ version, auth: state, printQRInTerminal: true, logger: pino({ level: LOG_LEVEL }) });

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
    const senderId = normalizeJid(getSenderJid(msg));
    const senderName = msg.pushName || 'Tanpa Nama';

    try {
      const senderIsOwner = isSenderOwner(senderId);

      if (isGroupMessage) {
        const warning = shouldWarnExpiring(groupId);
        if (warning) await sock.sendMessage(groupId, { text: warning });
      }

      if (text.trim() === CLAIM_OWNER_CODE) {
        const senderNumber = extractUserNumber(senderId);
        if (!senderNumber) {
          await sock.sendMessage(groupId, { text: 'Gagal klaim owner: nomor pengirim tidak valid.' }, { quoted: msg });
          return;
        }
        addOwner(senderNumber, senderId);
        await sock.sendMessage(groupId, { text: `✅ Owner berhasil diklaim.\nNomor: ${senderNumber}` }, { quoted: msg });
        return;
      }

      if (/^#/.test(text)) {
        if (!senderIsOwner) {
          await sock.sendMessage(groupId, { text: '❌ Perintah ini hanya untuk OWNER bot.' }, { quoted: msg });
          return;
        }
        const resp = await handleOwnerCommand({ sock, text, groupId, isGroupMessage });
        await sock.sendMessage(groupId, { text: resp }, { quoted: msg });
        return;
      }

      // Semua command grup non-owner wajib sewa aktif
      if (isGroupMessage && !isRentalActive(groupId)) {
        await sock.sendMessage(groupId, { text: lockedMessage() }, { quoted: msg });
        return;
      }

      let senderIsAdmin = false;
      if (isGroupMessage) {
        const meta = await sock.groupMetadata(groupId);
        senderIsAdmin = isAdmin(meta.participants, senderId);
      }
      const canAdminManage = senderIsOwner || senderIsAdmin;

      const userAllowed = /^listpeserta(?:\s+\d+)?$/i.test(text)
        || /^\d+$/.test(text)
        || /^riwayat(\s+.*)?$/i.test(text)
        || /^(tambah|kurang|kali|bagi)(\s|$)/i.test(text)
        || /^weather$/i.test(text);

      const adminCommands = /^(menu|help|info|[+-]|saldo(\s|$)|edit\s+\d+|hapus\s+\d+|detail\s+\d+|addpeserta\s+|delpeserta\s+no\s+\d+|updatepeserta\s+no\s+\d+|setheader@|command\s+|delcommand\s+|listcommand$|detailcommand\s+|remind\s+|listremind$|noremind\s+|todo\s+|todolist$|doto\s+\d+|lokweather\s+)/i.test(text);

      if (!canAdminManage && adminCommands && !userAllowed) {
        await sock.sendMessage(groupId, { text: '⛔ Perintah ini hanya untuk admin grup / owner bot.' }, { quoted: msg });
        return;
      }

      const ctx = { text, groupId, senderId, senderName };

      if (/^tambah$/i.test(text)) {
        await sock.sendMessage(groupId, { text: 'Format kalkulator: tambah 100 50' }, { quoted: msg });
        return;
      }

      const listPeserta = participants.handleListPeserta(ctx);
      if (listPeserta) return void await sock.sendMessage(groupId, { text: listPeserta }, { quoted: msg });

      const detailPeserta = participants.handleNumericDetail(ctx);
      if (detailPeserta) return void await sock.sendMessage(groupId, { text: detailPeserta }, { quoted: msg });

      const addPeserta = participants.handleAddPeserta(ctx, canAdminManage);
      if (addPeserta) return void await sock.sendMessage(groupId, { text: addPeserta }, { quoted: msg });

      const delPeserta = participants.handleDeletePeserta(ctx, canAdminManage);
      if (delPeserta) return void await sock.sendMessage(groupId, { text: delPeserta }, { quoted: msg });

      const updatePeserta = participants.handleUpdatePeserta(ctx, canAdminManage);
      if (updatePeserta) return void await sock.sendMessage(groupId, { text: updatePeserta }, { quoted: msg });

      const setHeader = participants.handleSetHeader(ctx, canAdminManage);
      if (setHeader) return void await sock.sendMessage(groupId, { text: setHeader }, { quoted: msg });

      const saveCmd = customCommands.handleSaveCommand(ctx, canAdminManage);
      if (saveCmd) return void await sock.sendMessage(groupId, { text: saveCmd }, { quoted: msg });

      const listCmd = customCommands.handleListCommand(ctx);
      if (listCmd) return void await sock.sendMessage(groupId, { text: listCmd }, { quoted: msg });

      const detailCmd = customCommands.handleDetailCommand(ctx);
      if (detailCmd) return void await sock.sendMessage(groupId, { text: detailCmd }, { quoted: msg });

      const delCmd = customCommands.handleDeleteCommand(ctx, canAdminManage);
      if (delCmd) return void await sock.sendMessage(groupId, { text: delCmd }, { quoted: msg });

      const rem = reminder.handleRemind(ctx, canAdminManage);
      if (rem) return void await sock.sendMessage(groupId, { text: rem }, { quoted: msg });

      const listRem = reminder.handleListRemind(ctx);
      if (listRem) return void await sock.sendMessage(groupId, { text: listRem }, { quoted: msg });

      const noRem = reminder.handleNoRemind(ctx, canAdminManage);
      if (noRem) return void await sock.sendMessage(groupId, { text: noRem }, { quoted: msg });

      const todoResp = todo.handleTodo(ctx, canAdminManage);
      if (todoResp) return void await sock.sendMessage(groupId, { text: todoResp }, { quoted: msg });

      const setLoc = await weather.handleSetLocation(ctx, canAdminManage);
      if (setLoc) return void await sock.sendMessage(groupId, { text: setLoc }, { quoted: msg });

      const weatherResp = await weather.handleWeather(ctx);
      if (weatherResp) return void await sock.sendMessage(groupId, { text: weatherResp }, { quoted: msg });

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
      if (calc) return void await sock.sendMessage(groupId, { text: calc }, { quoted: msg });

      if (/^riwayat(\s|$)/i.test(text) && inCooldown(senderId, 'riwayat', 1000)) {
        await sock.sendMessage(groupId, { text: '⏳ Tunggu 1 detik sebelum memakai command riwayat lagi.' }, { quoted: msg });
        return;
      }

      const history = await finance.riwayat(ctx);
      if (history) return void await sock.sendMessage(groupId, { text: history }, { quoted: msg });

      const saldo = await finance.saldo(ctx);
      if (saldo) return void await sock.sendMessage(groupId, { text: saldo }, { quoted: msg });

      const edit = await finance.edit(ctx, canAdminManage);
      if (edit) return void await sock.sendMessage(groupId, { text: edit }, { quoted: msg });

      const del = await finance.remove(ctx, canAdminManage);
      if (del) return void await sock.sendMessage(groupId, { text: del }, { quoted: msg });

      const detail = await finance.detail(ctx);
      if (detail) return void await sock.sendMessage(groupId, { text: detail }, { quoted: msg });

      const tx = await finance.recordTransaction(ctx);
      if (tx) return void await sock.sendMessage(groupId, { text: tx }, { quoted: msg });

      const autoResp = isGroupMessage ? customCommands.handleAutoResponse(ctx) : null;
      if (autoResp) return void await sock.sendMessage(groupId, { text: autoResp }, { quoted: msg });

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
