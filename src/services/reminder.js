import crypto from "crypto";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import timezone from "dayjs/plugin/timezone.js";
import { PRAYER_ORDER, REMINDER_MESSAGES } from "../config.js";
import { getDateKey, getPrayerSchedule } from "./prayerTimes.js";
import { getPrayerLog, setPrayerLog } from "./storage.js";

dayjs.extend(utc);
dayjs.extend(timezone);

const scheduledTimeouts = new Map();
const PRAYER_ALIASES = {
  subuh: "subuh",
  shubuh: "subuh",
  dzuhur: "dzuhur",
  zuhur: "dzuhur",
  dhuhur: "dzuhur",
  ashar: "ashar",
  asr: "ashar",
  magrib: "magrib",
  maghrib: "magrib",
  isya: "isya",
  isha: "isya"
};

export async function scheduleDailyReminders({ client, userId, city }) {
  clearExisting(userId);

  const schedule = await getPrayerSchedule(new Date(), city);
  const jobs = [];

  jobs.push(registerJob(schedule.imsak && new Date(schedule.imsak.getTime() - 60_000), async () => {
    await sendImsakReminder({ client, userId });
  }));

  PRAYER_ORDER.forEach((prayer) => {
    jobs.push(registerJob(schedule[prayer], async () => {
      await onPrayerTime({ client, userId, prayer, schedule });
    }));
  });

  const resetAt = dayjs().tz("Asia/Jakarta").add(1, "day").startOf("day").add(1, "minute").toDate();
  jobs.push(registerJob(resetAt, async () => {
    await scheduleDailyReminders({ client, userId, city });
  }));

  scheduledTimeouts.set(userId, jobs.filter(Boolean));
}

function registerJob(when, task) {
  if (!when) return null;
  const delay = when.getTime() - Date.now();
  if (delay <= 0) return null;
  return setTimeout(task, delay);
}

export async function onPrayerTime({ client, userId, prayer, schedule }) {
  const todayKey = getDateKey();

  if (prayer === "subuh") {
    const yesterdayKey = dayjs().tz("Asia/Jakarta").subtract(1, "day").format("YYYY-MM-DD");
    await markMissedIfStillPending({ userId, dateKey: yesterdayKey, prayer: "isya" });
  }

  const previousPrayer = getPreviousPrayer(prayer);
  if (previousPrayer) {
    await markMissedIfStillPending({ userId, dateKey: todayKey, prayer: previousPrayer });
  }

  const log = (await getPrayerLog(userId, todayKey)) ?? {};
  if (log[prayer] !== "done") {
    log[prayer] = "pending";
    await setPrayerLog(userId, todayKey, log);
  }

  await tryCallWithRetry({ client, userId, prayer });
  await client.sendMessage(userId, {
    text: `🕌 Waktu Sholat ${capitalize(prayer)} telah tiba\n\nApakah kamu sudah sholat?\n\nKetik:\n✅ sudah ${prayer}\n❌ belum ${prayer}`
  });
}

async function sendImsakReminder({ client, userId }) {
  await client.sendMessage(userId, {
    text: "🌙 1 menit lagi IMSAK.\nYuk akhiri makan/minum ya 🤍\nSemoga puasanya lancar."
  });
}

export async function runTestCall({ client, userId }) {
  const result = await tryCallWithRetry({ client, userId, prayer: "tescall" });
  if (result.ok) {
    return { ok: true, message: "✅ Test call terkirim. Kalau kamu menerima panggilan berarti fitur call aman." };
  }
  return {
    ok: false,
    message: `⚠️ Test call gagal: ${result.reason}. Bot akan tetap kirim pesan pengingat jika call tidak bisa.`
  };
}

async function tryCallWithRetry({ client, userId, prayer }) {
  console.log(`[CALL] start user=${userId} prayer=${prayer}`);
  let firstError = null;

  try {
    await placeShortCall({ client, userId });
    console.log(`[CALL] success user=${userId} prayer=${prayer}`);
    return { ok: true };
  } catch (error) {
    firstError = error?.message ?? "unknown";
    console.log(`[CALL] fail user=${userId} prayer=${prayer} reason=${firstError}`);
  }

  await sleep(10_000);

  try {
    await placeShortCall({ client, userId });
    console.log(`[CALL] success user=${userId} prayer=${prayer} onRetry=true`);
    return { ok: true };
  } catch (error) {
    const secondError = error?.message ?? "unknown";
    console.log(`[CALL] fail user=${userId} prayer=${prayer} onRetry=true reason=${secondError}`);
    return { ok: false, reason: secondError || firstError || "unknown" };
  }
}

async function placeShortCall({ client, userId }) {
  if (typeof client.sendNode !== "function") {
    throw new Error("sendNode not supported");
  }

  const callId = crypto.randomUUID();
  await client.sendNode({
    tag: "call",
    attrs: { to: userId, id: callId },
    content: [
      {
        tag: "offer",
        attrs: { "call-id": callId, "call-creator": userId, count: "0" }
      }
    ]
  });

  await sleep(3000);
  await client.sendNode({
    tag: "call",
    attrs: { to: userId, id: crypto.randomUUID() },
    content: [{ tag: "terminate", attrs: { reason: "timeout" } }]
  });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function markMissedIfStillPending({ userId, dateKey, prayer }) {
  const log = (await getPrayerLog(userId, dateKey)) ?? {};
  if (log[prayer] === "pending") {
    log[prayer] = "missed";
    await setPrayerLog(userId, dateKey, log);
  }
}

function getPreviousPrayer(prayer) {
  const index = PRAYER_ORDER.indexOf(prayer);
  if (index <= 0) return null;
  return PRAYER_ORDER[index - 1];
}

export async function handlePrayerResponse({ userId, message, client }) {
  const parsed = parsePrayerResponse(message);
  if (!parsed) return false;

  if (!parsed.prayer) {
    await client.sendMessage(userId, {
      text: "Kamu sudah sholat yang mana?\nKetik: sudah subuh / sudah dzuhur / sudah ashar / sudah magrib / sudah isya"
    });
    return true;
  }

  const dateKey = getDateKey();
  const log = (await getPrayerLog(userId, dateKey)) ?? {};

  if (parsed.intent === "sudah") {
    log[parsed.prayer] = "done";
    await setPrayerLog(userId, dateKey, log);
    await client.sendMessage(userId, { text: REMINDER_MESSAGES.success });
    return true;
  }

  log[parsed.prayer] = "pending";
  await setPrayerLog(userId, dateKey, log);
  await client.sendMessage(userId, { text: REMINDER_MESSAGES.pending });
  return true;
}

export function parsePrayerResponse(rawMessage = "") {
  const text = rawMessage.toLowerCase().replace(/\s+/g, " ").trim();
  if (!text) return null;

  if (!(text.startsWith("sudah") || text.startsWith("belum"))) {
    return null;
  }

  const intent = text.startsWith("sudah") ? "sudah" : "belum";
  const rest = text.replace(/^(sudah|belum)\s*/, "").trim();

  if (!rest) return { intent, prayer: null };

  const prayer = PRAYER_ALIASES[rest] ?? null;
  return { intent, prayer };
}

function clearExisting(userId) {
  const timeouts = scheduledTimeouts.get(userId) ?? [];
  timeouts.forEach((timeout) => clearTimeout(timeout));
  scheduledTimeouts.delete(userId);
}

function capitalize(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function formatDailyReport(log = {}) {
  const safeLog = log ?? {};
  return PRAYER_ORDER.map((prayer) => {
    const status = safeLog[prayer];
    if (status === "done") return `${capitalize(prayer).padEnd(7, " ")}: ✅`;
    if (status === "missed") return `${capitalize(prayer).padEnd(7, " ")}: ❌`;
    if (status === "pending") return `${capitalize(prayer).padEnd(7, " ")}: ⏳`;
    return `${capitalize(prayer).padEnd(7, " ")}: ❗`;
  }).join("\n");
}

export function formatMonthlyReport(logs = {}) {
  const entries = Object.entries(logs).sort(([a], [b]) => a.localeCompare(b));
  const lines = entries.map(([date, log]) => {
    const misses = PRAYER_ORDER.filter((prayer) => log[prayer] !== "done").length;
    if (misses === 0) return `Tanggal ${dayjs(date).date()}  : ✅ full`;
    return `Tanggal ${dayjs(date).date()}  : ❌ bolong ${misses} sholat`;
  });
  const totalMisses = entries.reduce((total, [, log]) => {
    const misses = PRAYER_ORDER.filter((prayer) => log[prayer] !== "done").length;
    return total + misses;
  }, 0);

  return { lines, totalMisses };
}
