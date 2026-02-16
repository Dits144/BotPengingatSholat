const os = require('os');

function formatWibTime(date = new Date()) {
  return new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Jakarta',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(date) + ' WIB';
}

function formatWibDate(date = new Date()) {
  return new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Jakarta',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

function formatUptime(seconds = process.uptime()) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${h} hours, ${m} minutes, ${s} seconds`;
}

function formatRam() {
  const usedMB = ((os.totalmem() - os.freemem()) / 1024 / 1024).toFixed(2);
  const totalMB = (os.totalmem() / 1024 / 1024).toFixed(2);
  return `${usedMB}MB / ${totalMB}MB`;
}

module.exports = { formatWibTime, formatWibDate, formatUptime, formatRam };
