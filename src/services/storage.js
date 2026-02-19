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

function keyDigits(value = "") {
  return value.split("@")[0].replace(/\D/g, "");
}

function findMatchingKey(container, userId) {
  if (!container || typeof container !== "object") return null;
  if (container[userId]) return userId;

  const incomingDigits = keyDigits(userId);
  if (!incomingDigits) return null;

  for (const key of Object.keys(container)) {
    const savedDigits = keyDigits(key);
    if (!savedDigits) continue;

    if (savedDigits === incomingDigits) return key;
    if (savedDigits.endsWith(incomingDigits) || incomingDigits.endsWith(savedDigits)) return key;
  }

  return null;
}

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
  const key = findMatchingKey(data.users, userId) ?? userId;
  return data.users[key] ?? null;
}

export async function upsertUser(userId, payload) {
  const data = await readData();
  const key = findMatchingKey(data.users, userId) ?? userId;
  data.users[key] = { ...(data.users[key] ?? {}), ...payload };
  await writeData(data);
  return data.users[key];
}

export async function resolveUserJid(userId) {
  const data = await readData();
  return (
    findMatchingKey(data.rentals, userId) ||
    findMatchingKey(data.logs, userId) ||
    findMatchingKey(data.users, userId) ||
    userId
  );
}

export async function getRental(userId) {
  const data = await readData();
  const key = findMatchingKey(data.rentals, userId) ?? userId;
  return data.rentals[key] ?? null;
}

export async function setRental(userId, rental) {
  const data = await readData();
  const key = findMatchingKey(data.rentals, userId) ?? userId;
  data.rentals[key] = rental;
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
  const key = findMatchingKey(data.logs, userId) ?? findMatchingKey(data.rentals, userId) ?? userId;
  if (!data.logs[key]) data.logs[key] = {};
  data.logs[key][dateKey] = payload;
  await writeData(data);
}

export async function getPrayerLog(userId, dateKey) {
  const data = await readData();
  const key = findMatchingKey(data.logs, userId) ?? findMatchingKey(data.rentals, userId) ?? userId;
  return data.logs[key]?.[dateKey] ?? null;
}

export async function getMonthlyLogs(userId, monthKey) {
  const data = await readData();
  const key = findMatchingKey(data.logs, userId) ?? findMatchingKey(data.rentals, userId) ?? userId;
  const logs = data.logs[key] ?? {};
  return Object.entries(logs)
    .filter(([date]) => date.startsWith(monthKey))
    .reduce((acc, [date, value]) => {
      acc[date] = value;
      return acc;
    }, {});
}
