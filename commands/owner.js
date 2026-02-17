const { db, extendRental, deactivateRental, getRental } = require('../db/database');
const { formatWib, rentalStatusText } = require('../utils/format');
const { parseOwnerActivate, parseOwnerDeactivate, parseInfoGroup } = require('../utils/parser');

async function fetchGroupMeta(sock, groupId) {
  try {
    return await sock.groupMetadata(groupId);
  } catch {
    return null;
  }
}

async function handleOwnerCommand({ sock, text, groupId, isGroupMessage }) {
  const infoReq = parseInfoGroup(text);
  if (infoReq) {
    const targetGroupId = infoReq.groupId || (isGroupMessage ? groupId : null);
    if (!targetGroupId) return 'Contoh: #infogroup 1203xxxx@g.us';
    const meta = await fetchGroupMeta(sock, targetGroupId);
    if (!meta) return 'Group tidak ditemukan / bot tidak ada di grup tersebut.';
    const rental = getRental(targetGroupId);
    const status = rentalStatusText(rental);
    return [
      'ℹ️ INFO GROUP',
      `Nama: ${meta.subject}`,
      `ID: ${meta.id}`,
      `Member: ${meta.participants.length}`,
      '',
      `🔑 Status Sewa: ${status.status}`,
      `Expired: ${rental?.expire_at ? `${formatWib(rental.expire_at)} WIB` : '-'}`,
      `Sisa: ${status.status === 'AKTIF' ? `${status.remainingDays} hari` : '-'}`
    ].join('\n');
  }

  const aktif = parseOwnerActivate(text);
  if (aktif) {
    if (!aktif.groupId.endsWith('@g.us') || aktif.days <= 0) return 'Format: #aktif 1203xxxx@g.us 30';
    const updated = extendRental(aktif.groupId, aktif.days, 'owner');
    const meta = await fetchGroupMeta(sock, aktif.groupId);
    return [
      '✅ Grup berhasil diaktifkan',
      '',
      `Nama: ${meta?.subject || aktif.groupId}`,
      `Expired: ${formatWib(updated.expire_at)} WIB`,
      `Durasi: ${aktif.days} hari`
    ].join('\n');
  }

  const nonaktif = parseOwnerDeactivate(text);
  if (nonaktif) {
    deactivateRental(nonaktif.groupId, 'owner');
    return '⛔ Grup dinonaktifkan.\nFitur keuangan terkunci.';
  }

  if (/^#statussewa$/i.test(text.trim())) {
    if (isGroupMessage) {
      const rental = getRental(groupId);
      const status = rentalStatusText(rental);
      return [
        '📌 STATUS SEWA',
        `${groupId} | ${status.status}${status.status === 'AKTIF' ? ` | sisa ${status.remainingDays} hari` : ''}`
      ].join('\n');
    }

    const rows = db.prepare('SELECT * FROM group_rentals ORDER BY updated_at DESC').all();
    if (!rows.length) return 'Belum ada data sewa grup.';
    const lines = rows.map((r, i) => {
      const status = rentalStatusText(r);
      return `${i + 1}) ${r.group_id} | ${status.status}${status.status === 'AKTIF' ? ` | sisa ${status.remainingDays} hari` : ''}`;
    });
    return ['📌 STATUS SEWA', '', ...lines].join('\n');
  }

  return 'Command owner tidak dikenali. Gunakan: #infogroup, #aktif, #nonaktif, #statussewa';
}

module.exports = { handleOwnerCommand };
