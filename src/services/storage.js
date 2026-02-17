import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_PATH = path.join(__dirname, "..", "..", "data", "store.json");

const defaultData = {
  users: {},
  rentals: {},
  logs: {}
};

async function readData() {
  try {
    const raw = await fs.readFile(DATA_PATH, "utf-8");
    return JSON.parse(raw);
  } catch {
    await fs.mkdir(path.dirname(DATA_PATH), { recursive: true });
    await fs.writeFile(DATA_PATH, JSON.stringify(defaultData, null, 2));
    return { ...defaultData };
  }
}

async function writeData(data) {
  await fs.writeFile(DATA_PATH, JSON.stringify(data, null, 2));
}

export async function getUser(userId) {
  const data = await readData();
  return data.users[userId] ?? null;
}

export async function upsertUser(userId, payload) {
  const data = await readData();
  data.users[userId] = { ...(data.users[userId] ?? {}), ...payload };
  await writeData(data);
  return data.users[userId];
}

export async function getRental(userId) {
  const data = await readData();
  return data.rentals[userId] ?? null;
}

export async function setRental(userId, rental) {
  const data = await readData();
  data.rentals[userId] = rental;
  await writeData(data);
}

export async function getActiveRentals() {
  const data = await readData();
  return Object.entries(data.rentals)
    .filter(([, rental]) => rental?.status === "aktif")
    .map(([userId, rental]) => ({ userId, rental }));
}

export async function setPrayerLog(userId, dateKey, payload) {
  const data = await readData();
  if (!data.logs[userId]) data.logs[userId] = {};
  data.logs[userId][dateKey] = payload;
  await writeData(data);
}

export async function getPrayerLog(userId, dateKey) {
  const data = await readData();
  return data.logs[userId]?.[dateKey] ?? null;
}

export async function getMonthlyLogs(userId, monthKey) {
  const data = await readData();
  const logs = data.logs[userId] ?? {};
  return Object.entries(logs)
    .filter(([date]) => date.startsWith(monthKey))
    .reduce((acc, [date, value]) => {
      acc[date] = value;
      return acc;
    }, {});
}
