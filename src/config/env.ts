import dotenv from 'dotenv';

dotenv.config();

const required = [
  'OWNER_NUMBER',
  'OWNER_GROUP_ID'
] as const;

for (const key of required) {
  if (!process.env[key]) {
    throw new Error(`Missing env: ${key}`);
  }
}

export const env = {
  ownerNumber: process.env.OWNER_NUMBER as string,
  ownerGroupId: process.env.OWNER_GROUP_ID as string,
  timezone: process.env.TIMEZONE ?? 'Asia/Jakarta',
  dbPath: process.env.DATABASE_PATH ?? './data/bot.db',
  prayerAddress: process.env.PRAYER_ADDRESS ?? 'Sasakpanjang Tajurhalang Bogor',
  prayerMethod: Number(process.env.PRAYER_METHOD ?? '11'),
  botName: process.env.BOT_NAME ?? 'Bot Pengingat Sholat'
};
