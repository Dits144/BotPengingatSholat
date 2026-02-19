import dotenv from 'dotenv';

dotenv.config();

const required = ['OWNER_NUMBER'];
for (const key of required) {
  if (!process.env[key]) throw new Error(`Missing env: ${key}`);
}

export const env = {
  ownerNumber: process.env.OWNER_NUMBER as string,
  ownerGroupId: process.env.OWNER_GROUP_ID ?? '120363423664469094@g.us',
  timezone: process.env.TIMEZONE ?? 'Asia/Jakarta',
  locationLabel: process.env.LOCATION_LABEL ?? 'Sasakpanjang Tajurhalang Bogor',
  latitude: Number(process.env.LATITUDE ?? '-6.4699'),
  longitude: Number(process.env.LONGITUDE ?? '106.7019'),
  dbPath: process.env.DB_PATH ?? './data/bot.sqlite',
};
