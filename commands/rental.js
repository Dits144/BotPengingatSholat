const { DateTime } = require('luxon');
const { getRental, isRentalActive, markWarned } = require('../db/database');
const { formatWib, rentalStatusText } = require('../utils/format');
const { RENT_WARNING_DAYS, TIMEZONE } = require('../config');

function lockedMessage() {
  return '🔒 Bot belum diaktifkan di grup ini\n\nHubungi owner untuk aktivasi.';
}

function getRentalStatus(groupId) {
  const rental = getRental(groupId);
  const status = rentalStatusText(rental);
  return { rental, ...status };
}

function shouldWarnExpiring(groupId) {
  const rental = getRental(groupId);
  const status = rentalStatusText(rental);
  if (status.status !== 'AKTIF' || status.remainingDays > RENT_WARNING_DAYS) return null;

  const now = DateTime.now().setZone(TIMEZONE);
  if (rental.last_warned_at) {
    const lastWarn = DateTime.fromISO(rental.last_warned_at, { zone: TIMEZONE });
    if (lastWarn.isValid && now.diff(lastWarn, 'hours').hours < 24) return null;
  }

  markWarned(groupId);
  return [
    '⏳ Masa sewa bot hampir habis!',
    `Sisa: ${status.remainingDays} hari`,
    `Expired: ${formatWib(rental.expire_at)} WIB`,
    '',
    'Ingin perpanjang?',
    'Hubungi owner.'
  ].join('\n');
}

module.exports = {
  lockedMessage,
  getRentalStatus,
  isRentalActive,
  shouldWarnExpiring
};
