import dotenv from 'dotenv';

dotenv.config();

function must(name: string, value?: string): string {
  if (!value) throw new Error(`Missing env: ${name}`);
  return value;
}

const encryptionKey = must('ENCRYPTION_KEY', process.env.ENCRYPTION_KEY);
if (encryptionKey.length < 32) throw new Error('ENCRYPTION_KEY minimal 32 karakter');

export const env = {
  botToken: must('BOT_TOKEN', process.env.BOT_TOKEN),
  ownerId: Number(process.env.OWNER_ID || '1370163983'),
  timezone: process.env.TIMEZONE || 'Asia/Jakarta',
  encryptionKey,
  databaseClient: process.env.DATABASE_CLIENT || 'sqlite',
  databaseUrl: process.env.DATABASE_URL || './data/bot.db',
  rateLimitSeconds: Number(process.env.RATE_LIMIT_SECONDS || '2'),
  qrisImage: process.env.QRIS_IMAGE || '',
  topupPresets: (process.env.TOPUP_PRESETS || '5000,10000,20000,50000,100000')
    .split(',')
    .map((v) => Number(v.trim()))
    .filter((v) => Number.isFinite(v) && v > 0)
};
