const dotenv = require('dotenv');

dotenv.config();

const required = ['OWNER_NUMBER', 'OWNER_GROUP_ID'];
for (const key of required) {
  if (!process.env[key]) throw new Error(`Missing env: ${key}`);
}

exports.env = {
  ownerNumber: process.env.OWNER_NUMBER,
  ownerGroupId: process.env.OWNER_GROUP_ID,
  timezone: process.env.TIMEZONE || 'Asia/Jakarta',
  dbPath: process.env.DATABASE_PATH || './data/bot.db',
  prayerAddress: process.env.PRAYER_ADDRESS || 'Sasakpanjang Tajurhalang Bogor',
  prayerMethod: Number(process.env.PRAYER_METHOD || '11'),
  botName: process.env.BOT_NAME || 'Bot Pengingat Sholat'
};
