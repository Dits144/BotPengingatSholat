const { read, update } = require('./db');
const { OWNER_GROUP_JID } = require('./config');
const { toDateKey, addDaysMs, normalizePrayerName, safeText } = require('./utils');
const { fetchScheduleForDate } = require('./prayer');
const { PRAYER_ORDER } = require('./scheduler');

const motivasiList = [
  'Sholat tepat waktu itu bukti cinta kita kepada Allah 🤍',
  'Istiqomah itu pelan-pelan, tapi terus jalan.',
  'Allah selalu dekat dengan hamba-Nya yang mengingat-Nya.'
];
const doaList = [
  '🤲 Rabbana atina fid-dunya hasanah wa fil-akhirati hasanah wa qina adzaban nar.',
  '🤲 Allahumma inni as’aluka ilman nafi’an, rizqan thayyiban, wa amalan mutaqabbalan.'
];

function isInOwnerGroup(remoteJid) {
  return remoteJid === OWNER_GROUP_JID;
}
function isRentalActive(db, userJid) {
  const r = db.rentals[userJid];
  return !!(r?.active && Date.now() <= r.endAt);
}
function ensureDayStatus(db, dateKey, userJid) {
  if (!db.prayerStatus[dateKey]) db.prayerStatus[dateKey] = {};
  if (!db.prayerStatus[dateKey][userJid]) {
    db.prayerStatus[dateKey][userJid] = { Fajr: 'pending', Dhuhr: 'pending', Asr: 'pending', Maghrib: 'pending', Isha: 'pending' };
  }
}
function formatStatusRow(label, val) {
  const map = { done: '✅', missed: '❌', pending: '⏳' };
  return `${label} : ${map[val] ?? '⏳'}`;
}

async function handleCommand(sock, msg, text) {
  const db = read();
  const remoteJid = msg.key.remoteJid;
    const body = safeText(text).toLowerCase();
  if (!body) return;

  // Owner commands: pakai validasi group JID saja
  if (isInOwnerGroup(remoteJid)) {
    if (body.startsWith('addsewa')) {
      const parts = body.split(/\s+/);
      const user = parts[1];
      const days = parseInt(parts[2], 10);
      if (!user || !days) return sock.sendMessage(remoteJid, { text: 'Format: addsewa 628xxxxxx@c.us 5' });
      update((db2) => {
        db2.rentals[user] = { startAt: Date.now(), endAt: addDaysMs(days), active: true };
      });
      return sock.sendMessage(remoteJid, { text: `✅ Sewa diaktifkan\nUser: ${user}\nDurasi: ${days} hari` });
    }

    if (body.startsWith('nonaktifsewa')) {
      const user = body.split(/\s+/)[1];
      if (!user) return sock.sendMessage(remoteJid, { text: 'Format: nonaktifsewa 628xxxx@c.us' });
      update((db2) => {
        if (db2.rentals[user]) db2.rentals[user].active = false;
      });
      return sock.sendMessage(remoteJid, { text: `✅ Sewa dinonaktifkan untuk ${user}` });
    }

    if (body === 'listsewa') {
      const entries = Object.entries(read().rentals);
      if (!entries.length) return sock.sendMessage(remoteJid, { text: 'Belum ada data sewa.' });
      let out = '📋 DATA SEWA BOT SHOLAT\n\n';
      let i = 1;
      for (const [jid, r] of entries) {
        const sisaMs = (r.endAt ?? 0) - Date.now();
        const sisaHari = Math.ceil(sisaMs / (24 * 60 * 60 * 1000));
        const status = r.active && sisaMs > 0 ? `Sisa: ${sisaHari} hari` : 'Habis/Nonaktif';
        out += `${i}. ${jid}\n   ${status}\n\n`;
        i++;
      }
      return sock.sendMessage(remoteJid, { text: out.trim() });
    }

    if (body === 'help') {
      return sock.sendMessage(remoteJid, { text: '🛠️ OWNER COMMANDS\n- addsewa 628xxxx@c.us 5\n- nonaktifsewa 628xxxx@c.us\n- listsewa\n- help' });
    }
  }

  if (remoteJid.endsWith('@s.whatsapp.net')) {
    if (!isRentalActive(db, remoteJid)) {
      if (body === 'ceksewa') {
        const r = db.rentals[remoteJid];
        if (!r) return sock.sendMessage(remoteJid, { text: 'Kamu belum punya sewa aktif.' });
        const sisaMs = (r.endAt ?? 0) - Date.now();
        const sisaHari = Math.ceil(sisaMs / (24 * 60 * 60 * 1000));
        const status = r.active && sisaMs > 0 ? `Sisa ${sisaHari} hari` : 'Habis/Nonaktif';
        return sock.sendMessage(remoteJid, { text: `📌 Status sewa: ${status}` });
      }
      if (body !== 'waktusholat' && body !== 'help') return;
    }

    if (body === 'waktusholat') {
      const t = (await fetchScheduleForDate(new Date())).timings;
      return sock.sendMessage(remoteJid, { text: `🕌 JADWAL SHOLAT HARI INI\nSubuh : ${t.Fajr}\nDzuhur: ${t.Dhuhr}\nAshar : ${t.Asr}\nMaghrib: ${t.Maghrib}\nIsya  : ${t.Isha}\nImsak : ${t.Imsak}` });
    }

    if (body === 'listsholat' || body === 'status') {
      const dateKey = toDateKey(new Date());
      const db2 = read();
      ensureDayStatus(db2, dateKey, remoteJid);
      const st = db2.prayerStatus[dateKey][remoteJid];
      return sock.sendMessage(remoteJid, { text: `📊 REKAP SHOLAT HARI INI (${dateKey})\n\n${formatStatusRow('Subuh', st.Fajr)}\n${formatStatusRow('Dzuhur', st.Dhuhr)}\n${formatStatusRow('Ashar', st.Asr)}\n${formatStatusRow('Maghrib', st.Maghrib)}\n${formatStatusRow('Isya', st.Isha)}` });
    }

    if (body === 'rekapbulan') {
      const now = new Date();
      const y = now.getFullYear();
      const m = now.getMonth();
      const db2 = read();
      const keys = Object.keys(db2.prayerStatus)
        .filter((k) => {
          const d = new Date(`${k}T00:00:00`);
          return d.getFullYear() === y && d.getMonth() === m;
        })
        .sort();
      if (!keys.length) return sock.sendMessage(remoteJid, { text: 'Belum ada data bulan ini.' });
      let out = '📅 REKAP SHOLAT BULAN INI\n\n';
      let totalBolong = 0;
      for (const dateKey of keys) {
        const st = db2.prayerStatus[dateKey]?.[remoteJid];
        if (!st) continue;
        let bolong = 0;
        for (const p of PRAYER_ORDER) if (st[p] === 'missed') bolong++;
        totalBolong += bolong;
        out += `${dateKey} : Bolong ${bolong}\n`;
      }
      out += `\nTotal bolong bulan ini: ${totalBolong} sholat`;
      return sock.sendMessage(remoteJid, { text: out });
    }

    if (body.startsWith('sudah ')) {
      const p = normalizePrayerName(body.replace('sudah', '').trim());
      if (!p) return sock.sendMessage(remoteJid, { text: 'Contoh: sudah isya / sudah subuh' });
      const dateKey = toDateKey(new Date());
      update((db2) => {
        ensureDayStatus(db2, dateKey, remoteJid);
        db2.prayerStatus[dateKey][remoteJid][p.key] = 'done';
        if (db2.pendingPrompts[remoteJid]?.prayer === p.key) delete db2.pendingPrompts[remoteJid];
      });
      return sock.sendMessage(remoteJid, { text: `Alhamdulillah 🤍\nSemoga Allah menerima sholat ${p.label} kamu, dan bikin hati kamu makin tenang.\nIstiqomah ya!` });
    }

    if (body === 'belum') {
      return sock.sendMessage(remoteJid, { text: 'Yuk segera sholat 🙏\nSholat itu penenang hati.\nAllah sedang menunggumu menghadap-Nya 🤍' });
    }

    if (body === 'motivasi') return sock.sendMessage(remoteJid, { text: `✨ ${motivasiList[Math.floor(Math.random() * motivasiList.length)]}` });
    if (body === 'doa') return sock.sendMessage(remoteJid, { text: doaList[Math.floor(Math.random() * doaList.length)] });
    if (body === 'ceksewa') {
      const r = db.rentals[remoteJid];
      if (!r) return sock.sendMessage(remoteJid, { text: 'Kamu belum punya sewa aktif.' });
      const sisaMs = (r.endAt ?? 0) - Date.now();
      const sisaHari = Math.ceil(sisaMs / (24 * 60 * 60 * 1000));
      const status = r.active && sisaMs > 0 ? `Sisa ${sisaHari} hari` : 'Habis/Nonaktif';
      return sock.sendMessage(remoteJid, { text: `📌 Status sewa: ${status}` });
    }

    if (body === 'help') {
      return sock.sendMessage(remoteJid, {
        text: '📌 COMMAND BOT SHOLAT\n- waktusholat\n- listsholat / status\n- rekapbulan\n- ceksewa\n- motivasi\n- doa\n- sudah isya / sudah subuh / sudah dzuhur / sudah ashar / sudah maghrib\n- belum\n- help'
      });
    }
  }
}

module.exports = { handleCommand };
