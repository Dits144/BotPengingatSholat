const { commands, commandMap } = require('../registry/commands');
const { prefix } = require('../config');
const { claimOwner, getUserProfile, readJson, writeJson, files } = require('../services/storage');
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

const customValidators = {
  addlist: {
    check: (args) => args.includes('@'),
    error: `Format salah ❌\nContoh: a addlist capcut@(deskripsi)\nKeterangan: gunakan @ untuk pisahkan nama dan deskripsi.`,
  },
  bot: toggle('bot'),
  welcome: toggle('welcome'),
  left: toggle('left'),
  autopromosi: toggle('autopromosi'),
  add: num('add 628xx'),
  kick: num('kick 628xx'),
  promote: num('promote 628xx'),
  demote: num('demote 628xx'),
  slr: nonEmpty('slr <Alasan Slr>'),
  setwelcome: nonEmpty('setwelcome <teks>'),
  setleft: nonEmpty('setleft <teks>'),
  setrules: nonEmpty('setrules <teks>'),
  deskripsigrup: nonEmpty('deskripsigrup [link]'),
  brat: nonEmpty('brat <teks>'),
  bratvid: nonEmpty('bratvid <teks>'),
  iqc: {
    check: (args) => args.split('|').length === 3,
    error: 'Format salah ❌\nContoh: a iqc 17:44|90|Ditstore fast response',
  },
  ffsearch: nonEmpty('ffsearch <nickname/uid> [region]'),
  mlstalk: nonEmpty('mlstalk <id|id-server>'),
};

function toggle(name) {
  return { check: (args) => ['on', 'off'].includes(args.toLowerCase()), error: `Format salah ❌\nContoh: a ${name} <on/off>` };
}
function num(example) {
  return { check: (args) => /^\d{8,}$/.test(args.replace(/\D/g, '')), error: `Format salah ❌\nContoh: a ${example}` };
}
function nonEmpty(example) {
  return { check: (args) => Boolean(args.trim()), error: `Format salah ❌\nContoh: a ${example}` };
}

async function handleMessage(sock, msg) {
  const remoteJid = msg.key.remoteJid;
  if (remoteJid === 'status@broadcast') return;
  const senderJid = msg.key.participant || msg.key.remoteJid;
  const sender = normalizeJid(senderJid).split('@')[0];
  const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text || '';
  const parsed = parseIncoming(text);
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
    if (!parsed.args) return reply(sock, remoteJid, 'Format salah ❌\nContoh: a claimowner <password>', msg);
    const result = claimOwner(normalizeJid(senderJid), parsed.args);
    return reply(sock, remoteJid, result.ok ? `✅ ${result.message}` : `❌ ${result.message}`, msg);
  }

  const validator = customValidators[command.name];
  if (validator && !validator.check(parsed.args || '')) return reply(sock, remoteJid, validator.error, msg);
  if (!validator && command.needsArgs && !parsed.args) return reply(sock, remoteJid, `Format salah ❌\nContoh: ${command.usage}`, msg);

  if (command.name === 'allmenu' || command.name === 'menu') {
    const adminCount = getParticipantAdminSet(metadata).size;
    const menuText = renderAllMenu({
      pushName: msg.pushName,
      senderTag: sender,
      groupName: metadata?.subject || 'Private Chat',
      members: metadata?.participants?.length || 0,
      adminCount,
      userProfile,
    });
    return sock.sendMessage(remoteJid, { text: menuText, mentions: [senderJid] }, { quoted: msg });
  }

  if (command.name === 'addlist') {
    const [name, rest] = parsed.args.split('@');
    const store = readJson(files.store, { items: [], templates: {}, symbol: '✧', payments: [], testimonials: [] });
    store.items.push({ id: Date.now(), name: name.trim(), description: (rest || '').trim(), price: null });
    writeJson(files.store, store);
    return reply(sock, remoteJid, `OK, perintah diterima (stub)\nProduk *${name.trim()}* ditambahkan ke list.`, msg);
  }

  if (['list', 'viewlist', 'previewlist'].includes(command.name)) {
    const store = readJson(files.store, { items: [] });
    if (!store.items.length) return reply(sock, remoteJid, 'List produk masih kosong.', msg);
    const lines = store.items.map((i, idx) => `${idx + 1}. ${i.name} - ${i.description || '-'}`);
    return reply(sock, remoteJid, `📦 *Daftar Produk Ditstore*\n${lines.join('\n')}`, msg);
  }

  if (['proses', 'done', 'batal', 'refund'].includes(command.name)) {
    const orders = readJson(files.orders, { orders: [] });
    const found = orders.orders.find((o) => String(o.id) === parsed.args.trim());
    if (!found) return reply(sock, remoteJid, `Order ID ${parsed.args} belum ditemukan. (stub)`, msg);
    found.status = command.name;
    writeJson(files.orders, orders);
    return reply(sock, remoteJid, `OK, status order *${found.id}* diubah menjadi *${command.name}* (stub).`, msg);
  }

  if (['setpayment', 'updatepayment', 'delpayment', 'paymentdl'].includes(command.name)) {
    return reply(sock, remoteJid, 'OK, perintah pembayaran diterima (stub).', msg);
  }

  return reply(sock, remoteJid, `OK, perintah diterima (stub)\nFitur *${command.name}* dalam pengembangan.`, msg);
}

function reply(sock, jid, text, quoted) {
  return sock.sendMessage(jid, { text }, { quoted });
}

module.exports = { handleMessage, parseIncoming, commandsCount: commands.length };
