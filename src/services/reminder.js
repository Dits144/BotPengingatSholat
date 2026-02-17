import crypto from "crypto";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import timezone from "dayjs/plugin/timezone.js";
import { PRAYER_ORDER, REMINDER_MESSAGES } from "../config.js";
import { getDateKey, getPrayerSchedule } from "./prayerTimes.js";
import { getPrayerLog, getUser, setPrayerLog, upsertUser } from "./storage.js";

dayjs.extend(utc);
dayjs.extend(timezone);

const scheduledTimeouts = new Map();

export async function scheduleDailyReminders({ client, userId, city }) {
  clearExisting(userId);

  const schedule = await getPrayerSchedule(new Date(), city);
  const jobs = [];

  jobs.push(registerJob({ jobs, when: schedule.imsak && new Date(schedule.imsak.getTime() - 10 * 60_000), task: () => sendImsakReminder({ client, userId }) }));
  PRAYER_ORDER.forEach((prayer) => {
    jobs.push(registerJob({ jobs, when: schedule[prayer], task: () => onPrayerTime({ client, userId, prayer, schedule }) }));
  });

  const resetAt = dayjs().tz("Asia/Jakarta").add(1, "day").startOf("day").add(5, "minute").toDate();
  jobs.push(registerJob({ jobs, when: resetAt, task: async () => {
    await scheduleDailyReminders({ client, userId, city });
  }}));

  scheduledTimeouts.set(userId, jobs.filter(Boolean));
}

function registerJob({ jobs, when, task }) {
  if (!when) return null;
  const delay = when.getTime() - Date.now();
  if (delay <= 0) return null;
  const timeout = setTimeout(task, delay);
  return timeout;
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

  const expiresAt = getExpiryForPrayer(prayer, schedule);
  await upsertUser(userId, {
    lastPrompt: {
      prayer,
      dateKey: todayKey,
      expiresAt: expiresAt.toISOString()
    }
  });

  await tryCallUser({ client, userId });
  await client.sendMessage(userId, {
    text: `🕌 Waktu Sholat ${capitalize(prayer)} telah tiba\n\nApakah kamu sudah sholat?\n\nKetik:\n✅ sudah\n❌ belum`
  });
}

async function sendImsakReminder({ client, userId }) {
  await client.sendMessage(userId, {
    text: "🌙 Imsak akan tiba 10 menit lagi\n\nSegera akhiri makan dan minum ya 🤍\nSemoga puasamu diterima Allah."
  });
}

async function tryCallUser({ client, userId }) {
  let called = false;

  try {
    if (typeof client.sendNode === "function") {
      const callId = crypto.randomUUID();
      await client.sendNode({
        tag: "call",
        attrs: {
          to: userId,
          id: callId
        },
        content: [
          {
            tag: "offer",
            attrs: {
              "call-id": callId,
              "call-creator": userId,
              count: "0"
            }
          }
        ]
      });
      called = true;

      setTimeout(async () => {
        try {
          await client.sendNode({
            tag: "call",
            attrs: { to: userId, id: crypto.randomUUID() },
            content: [{ tag: "terminate", attrs: { reason: "timeout" } }]
          });
        } catch {
          // ignore terminate error
        }
      }, 3000);
    }
  } catch {
    called = false;
  }

  if (!called) {
    await client.sendMessage(userId, {
      text: "📞 Panggilan pengingat belum berhasil dilakukan, jadi aku kirim pengingat lewat chat ya 🤍"
    });
  }
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

function getExpiryForPrayer(prayer, schedule) {
  const index = PRAYER_ORDER.indexOf(prayer);
  if (index < PRAYER_ORDER.length - 1) {
    return schedule[PRAYER_ORDER[index + 1]];
  }
  return dayjs(schedule.subuh).add(1, "day").toDate();
}

export async function resolveActivePrompt(userId) {
  const user = await getUser(userId);
  const prompt = user?.lastPrompt;
  if (!prompt) return null;

  const expiry = dayjs(prompt.expiresAt);
  if (dayjs().isAfter(expiry)) {
    await markMissedIfStillPending({ userId, dateKey: prompt.dateKey, prayer: prompt.prayer });
    await upsertUser(userId, { lastPrompt: null });
    return null;
  }

  return prompt;
}

export async function handlePrayerResponse({ userId, message, client }) {
  const normalized = message.trim().toLowerCase();
  const prompt = await resolveActivePrompt(userId);

  if (!prompt) {
    await client.sendMessage(userId, { text: "ℹ️ Belum ada pengingat sholat aktif saat ini." });
    return;
  }

  const log = (await getPrayerLog(userId, prompt.dateKey)) ?? {};

  if (normalized === "sudah") {
    log[prompt.prayer] = "done";
    await setPrayerLog(userId, prompt.dateKey, log);
    await upsertUser(userId, { lastPrompt: null });
    await client.sendMessage(userId, { text: REMINDER_MESSAGES.success });
    return;
  }

  if (normalized === "belum") {
    log[prompt.prayer] = "pending";
    await setPrayerLog(userId, prompt.dateKey, log);
    await client.sendMessage(userId, { text: REMINDER_MESSAGES.pending });
  }
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

  return {
    lines,
    totalMisses
  };
}
