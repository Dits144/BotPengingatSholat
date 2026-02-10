import dotenv from 'dotenv';

dotenv.config();

function must(name: string, value?: string): string {
  if (!value) throw new Error(`Missing env: ${name}`);
  return value;
}

const encryptionKey = must('ENCRYPTION_KEY', process.env.ENCRYPTION_KEY);
if (encryptionKey.length < 32) {
  throw new Error('ENCRYPTION_KEY must be at least 32 characters');
}

export const env = {
  botToken: must('BOT_TOKEN', process.env.BOT_TOKEN),
  adminIds: must('ADMIN_IDS', process.env.ADMIN_IDS)
    .split(',')
    .map((v) => Number(v.trim())),
  timezone: process.env.TIMEZONE || 'Asia/Jakarta',
  encryptionKey,
  databaseClient: process.env.DATABASE_CLIENT || 'sqlite',
  databaseUrl: process.env.DATABASE_URL || './data/bot.db',
  rateLimitSeconds: Number(process.env.RATE_LIMIT_SECONDS || 3)
};
