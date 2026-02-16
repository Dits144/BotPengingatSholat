const { commands, commandMap } = require('../registry/commands');
const { prefix } = require('../config');
const { CLAIM_OWNER_SECRET, claimOwner, getUserProfile, readJson, writeJson, files } = require('../services/storage');
const { normalizeJid, getParticipantAdminSet, resolveRole, hasRole } = require('../services/permissions');
const { renderAllMenu } = require('../services/menu');

function parseIncoming(text = '') {
  const clean = text.trim();
  if (!clean) return { isCommand: false };

  if (/^\.(p|d|b|r)(\s|$)/i.test(clean)) {
    const [shortcut, ...rest] = clean.split(/\s+/);
    const map = { '.p': 'proses', '.d': 'done', '.b': 'batal', '.r': 'refund' };
    return { isCommand: true, command: map[shortcut.toLowerCase()], args: rest.join(' ').trim(), raw: clean };
  }

  const prefixed = `${prefix} `;
  if (!clean.toLowerCase().startsWith(prefixed)) return { isCommand: false };

  const body = clean.slice(prefixed.length).trim();
  const [cmd = '', ...rest] = body.split(/\s+/);
  return { isCommand: true, command: cmd.toLowerCase(), args: rest.join(' ').trim(), raw: clean };
}

function formatError(example, note = 'Silakan cek format lalu kirim ulang.') {
  return `Format salah ❌\n\nContoh: ${example}\n\n${note}`;
}

function isOnOff(value) {
  return ['on', 'off'].includes((value || '').toLowerCase());
}

function isInternationalNumber(value) {
  return /^628\d{6,15}$/.test((value || '').replace(/\s+/g, ''));
}

function splitByPipe(args) {
  return (args || '').split('|').map((x) => x.trim()).filter(Boolean);
}

function validateByCommand(commandName, args) {
  const a = (args || '').trim();

  const checks = {
    addlist: () => {
      const parts = a.split('@').map((x) => x.trim());
      return parts.length >= 3 && parts[0] && parts[1] && /^\d+$/.test(parts[2])
        ? null
        : formatError('a addlist Capcut Pro@1 bulan private@35000', 'Note: gunakan @ sebagai pemisah.');
    },
    updatelist: () => {
      const parts = a.split('@').map((x) => x.trim());
      return parts.length >= 3 && parts[0] && parts[1] && /^\d+$/.test(parts[2])
        ? null
        : formatError('a updatelist Capcut Pro@1 bulan private@35000', 'Note: gunakan @ sebagai pemisah.');
    },
    add: () => (isInternationalNumber(a) ? null : formatError('a add 62812xxxx', 'Nomor wajib format internasional 628xxxx.')),
    kick: () => (isInternationalNumber(a) ? null : formatError('a kick 62812xxxx', 'Nomor wajib format internasional 628xxxx.')),
    promote: () => (isInternationalNumber(a) ? null : formatError('a promote 62812xxxx', 'Nomor wajib format internasional 628xxxx.')),
    demote: () => (isInternationalNumber(a) ? null : formatError('a demote 62812xxxx', 'Nomor wajib format internasional 628xxxx.')),
    bot: () => (isOnOff(a) ? null : formatError('a bot on', 'Pilihan hanya on/off.')),
    welcome: () => (isOnOff(a) ? null : formatError('a welcome on', 'Pilihan hanya on/off.')),
    left: () => (isOnOff(a) ? null : formatError('a left on', 'Pilihan hanya on/off.')),
    autopromosi: () => (isOnOff(a) ? null : formatError('a autopromosi on', 'Pilihan hanya on/off.')),
    slr: () => (a ? null : formatError('a slr lagi di jalan', 'Tuliskan alasan SLR.')),
    setwelcome: () => (a ? null : formatError('a setwelcome Selamat datang @user', 'Isi teks welcome.')),
    changewelcome: () => (a ? null : formatError('a changewelcome Selamat datang @user', 'Isi teks welcome baru.')),
    setleft: () => (a ? null : formatError('a setleft Sampai jumpa @user', 'Isi teks left.')),
    changeleft: () => (a ? null : formatError('a changeleft Sampai jumpa @user', 'Isi teks left baru.')),
    setrules: () => (a ? null : formatError('a setrules Dilarang toxic', 'Isi teks rules.')),
    deskripsigrup: () => (a ? null : formatError('a deskripsigrup Grup Ditstore|https://chat.whatsapp.com/...', 'Gunakan format <teks>|[link].')),
    brat: () => (a ? null : formatError('a brat halo', 'Isi teks untuk generate.')),
    bratvid: () => (a ? null : formatError('a bratvid halo', 'Isi teks untuk generate.')),
    iqc: () => {
      const p = splitByPipe(a);
      return p.length === 3 ? null : formatError('a iqc 10:10|90%|halo', 'Gunakan pemisah | (3 bagian).');
    },
    ffsearch: () => (a ? null : formatError('a ffsearch nickname [ID]', 'Isi nickname/uid, region opsional.')),
    mlstalk: () => {
      const p = splitByPipe(a);
      return p.length >= 2 ? null : formatError('a mlstalk 12345678|1234', 'Gunakan format <id>|<server>.');
    },
    proses: () => (splitByPipe(a).length >= 1 ? null : formatError('a proses ORD001|sedang diproses', 'Format: <id_order>|<catatan>.')),
    done: () => (splitByPipe(a).length >= 1 ? null : formatError('a done ORD001|pesanan selesai', 'Format: <id_order>|<catatan>.')),
    batal: () => (splitByPipe(a).length >= 1 ? null : formatError('a batal ORD001|stok habis', 'Format: <id_order>|<alasan>.')),
    refund: () => (splitByPipe(a).length >= 1 ? null : formatError('a refund ORD001|dana dikembalikan', 'Format: <id_order>|<alasan>.')),
    setpayment: () => (splitByPipe(a).length >= 4 ? null : formatError('a setpayment QRIS|DITSTORE|scan|otomatis', 'Gunakan format <metode>|<nama>|<nomor>|<note>.')),
    updatepayment: () => (splitByPipe(a).length >= 4 ? null : formatError('a updatepayment QRIS|DITSTORE|scan|otomatis', 'Gunakan format <metode>|<nama>|<nomor>|<note>.')),
    delpayment: () => (a ? null : formatError('a delpayment QRIS', 'Isi nama metode payment.')),
    hutang: () => (splitByPipe(a).length >= 3 ? null : formatError('a hutang 62812xxx|35000|capcut', 'Format: <@tag/628xxxx>|<jumlah>|<catatan>.')),
    bayarhutang: () => (splitByPipe(a).length >= 2 ? null : formatError('a bayarhutang HTG-01|15000', 'Format: <id_hutang>|<jumlah>.')),
    edithutang: () => (splitByPipe(a).length >= 3 ? null : formatError('a edithutang HTG-01|35000|revisi', 'Format: <id_hutang>|<jumlah>|<catatan>.')),
    struk: () => (splitByPipe(a).length >= 5 ? null : formatError('a struk Capcut|35000|1|35000|QRIS', 'Format: <nama>|<harga>|<qty>|<total>|<metode>.')),
    tambah: () => (a.split(/\s+/).length >= 2 ? null : formatError('a tambah 10 20', 'Isi 2 angka dipisah spasi.')),
    kurang: () => (a.split(/\s+/).length >= 2 ? null : formatError('a kurang 20 10', 'Isi 2 angka dipisah spasi.')),
    kali: () => (a.split(/\s+/).length >= 2 ? null : formatError('a kali 5 8', 'Isi 2 angka dipisah spasi.')),
    bagi: () => (a.split(/\s+/).length >= 2 ? null : formatError('a bagi 20 5', 'Isi 2 angka dipisah spasi.')),
    persen: () => (a.split(/\s+/).length >= 2 ? null : formatError('a persen 100000 10', 'Format: <angka> <persen>.')),
    pangkat: () => (a.split(/\s+/).length >= 2 ? null : formatError('a pangkat 2 3', 'Format: <angka> <pangkat>.')),
    ffstalk: () => (a ? null : formatError('a ffstalk 123456789', 'Isi ID akun Free Fire.')),
    numverif: () => (isInternationalNumber(a) ? null : formatError('a numverif 6281234567890', 'Nomor wajib format internasional 628xxxx.')),
    ssweb: () => (/^https?:\/\//.test(a) ? null : formatError('a ssweb https://ditstore.id', 'Isi URL valid.')),
  };

  if (checks[commandName]) return checks[commandName]();
  return null;
}

async function handleMessage(sock, msg) {
  const remoteJid = msg.key.remoteJid;
  if (remoteJid === 'status@broadcast') return;

  const senderJid = msg.key.participant || msg.key.remoteJid;
  const sender = normalizeJid(senderJid).split('@')[0];
  const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text || '';
  const parsed = parseIncoming(text);

  const ownerByCode = CLAIM_OWNER_SECRET.toLowerCase();
  if (text.trim().toLowerCase() === ownerByCode) {
    const result = claimOwner(normalizeJid(senderJid), CLAIM_OWNER_SECRET);
    return reply(sock, remoteJid, result.ok ? `✅ ${result.message}` : `❌ ${result.message}`, msg);
  }

  if (!parsed.isCommand) return;

  const command = commandMap.get(parsed.command);
  if (!command) return reply(sock, remoteJid, 'Perintah tidak dikenali. Ketik *a allmenu* untuk lihat daftar command.', msg);

  const metadata = remoteJid.endsWith('@g.us') ? await sock.groupMetadata(remoteJid).catch(() => null) : null;
  const userProfile = getUserProfile(normalizeJid(senderJid));
  const role = resolveRole({ senderJid, metadata, userProfile });

  if (command.premiumOnly && !userProfile.premium) return reply(sock, remoteJid, 'Fitur premium ⓟ. Hubungi admin Ditstore.', msg);
  if (command.vipOnly && !userProfile.vip) return reply(sock, remoteJid, 'Fitur premium ⓟ. Hubungi admin Ditstore.', msg);
  if (!hasRole(command.role, role)) return reply(sock, remoteJid, `Akses ditolak. Minimal role: ${command.role}.`, msg);

  if (command.name === 'claimowner') {
    const claimInput = parsed.args || CLAIM_OWNER_SECRET;
    const result = claimOwner(normalizeJid(senderJid), claimInput);
    return reply(sock, remoteJid, result.ok ? `✅ ${result.message}` : `❌ ${result.message}`, msg);
  }

  const validationError = validateByCommand(command.name, parsed.args);
  if (validationError) return reply(sock, remoteJid, validationError, msg);
  if (!validationError && command.needsArgs && !parsed.args) {
    return reply(sock, remoteJid, formatError(command.usage, 'Silakan isi argumen wajib.'), msg);
  }

  if (command.name === 'allmenu' || command.name === 'menu') {
    const adminCount = getParticipantAdminSet(metadata).size;
    const menuText = renderAllMenu({
      senderTag: sender,
      groupName: metadata?.subject || 'Private Chat',
      members: metadata?.participants?.length || 0,
      adminCount,
      userProfile,
    });
    return sock.sendMessage(remoteJid, { text: menuText, mentions: [senderJid] }, { quoted: msg });
  }

  if (command.name === 'addlist') {
    const [name, desc, price] = parsed.args.split('@').map((x) => x.trim());
    const store = readJson(files.store, { items: [], templates: {}, symbol: '✧', payments: [], testimonials: [] });
    store.items.push({ id: `ITM-${Date.now()}`, name, description: desc, price: Number(price) || 0 });
    writeJson(files.store, store);
    return reply(sock, remoteJid, `✅ Produk ditambahkan\nNama: ${name}\nDeskripsi: ${desc}\nHarga: ${price}`, msg);
  }

  if (['list', 'viewlist', 'previewlist', 'pl'].includes(command.name)) {
    const store = readJson(files.store, { items: [], symbol: '✧', templates: {} });
    if (!store.items.length) return reply(sock, remoteJid, 'List produk masih kosong.', msg);
    const header = store.templates?.listHeader ? `*${store.templates.listHeader}*\n` : '*Daftar Produk Ditstore*\n';
    const lines = store.items.map((i, idx) => `${idx + 1}. ${i.name}\n   ${store.symbol || '✧'} ${i.description}\n   ${store.symbol || '✧'} Harga: ${i.price}`);
    return reply(sock, remoteJid, `${header}${lines.join('\n')}`, msg);
  }

  if (command.name === 'setlist') {
    const store = readJson(files.store, { items: [], templates: {} });
    store.templates = store.templates || {};
    store.templates.listHeader = parsed.args;
    writeJson(files.store, store);
    return reply(sock, remoteJid, '✅ Header list berhasil disimpan.', msg);
  }

  if (command.name === 'setsymbol') {
    const store = readJson(files.store, { items: [], symbol: '✧' });
    store.symbol = parsed.args.trim();
    writeJson(files.store, store);
    return reply(sock, remoteJid, `✅ Symbol list diubah menjadi: ${store.symbol}`, msg);
  }

  if (['proses', 'done', 'batal', 'refund'].includes(command.name)) {
    const [orderId, note = '-'] = splitByPipe(parsed.args);
    const orders = readJson(files.orders, { orders: [] });
    const found = orders.orders.find((o) => String(o.id) === orderId);
    if (!found) return reply(sock, remoteJid, `Order *${orderId}* belum ada. (stub)`, msg);
    found.status = command.name;
    found.note = note;
    writeJson(files.orders, orders);
    return reply(sock, remoteJid, `✅ Order ${orderId} diubah ke *${command.name}*\nCatatan: ${note}`, msg);
  }

  if (['setpayment', 'updatepayment', 'delpayment', 'paymentdl'].includes(command.name)) {
    return reply(sock, remoteJid, 'OK, fitur payment diterima (stub) dan siap dikembangkan.', msg);
  }

  if (['tambah', 'kurang', 'kali', 'bagi', 'persen', 'pangkat'].includes(command.name)) {
    const [xRaw, yRaw] = parsed.args.split(/\s+/);
    const x = Number(xRaw);
    const y = Number(yRaw);
    if (Number.isNaN(x) || Number.isNaN(y)) return reply(sock, remoteJid, formatError(`a ${command.name} 10 20`, 'Argumen harus angka.'), msg);
    const calc = {
      tambah: x + y,
      kurang: x - y,
      kali: x * y,
      bagi: y === 0 ? 'Tak terhingga' : x / y,
      persen: x * (y / 100),
      pangkat: x ** y,
    };
    return reply(sock, remoteJid, `Hasil ${command.name}: ${calc[command.name]}`, msg);
  }

  return reply(sock, remoteJid, `OK, perintah diterima (stub)\nFitur *${command.name}* dalam pengembangan.`, msg);
}

function reply(sock, jid, text, quoted) {
  return sock.sendMessage(jid, { text }, { quoted });
}

module.exports = { handleMessage, parseIncoming, commandsCount: commands.length };
