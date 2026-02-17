import dayjs from "dayjs";
import { DEFAULT_CITY } from "../config.js";
import { formatSchedule, getDateKey, getMonthKey, getPrayerSchedule } from "../services/prayerTimes.js";
import { formatDailyReport, formatMonthlyReport } from "../services/reminder.js";
import { getMonthlyLogs, getPrayerLog, getRental } from "../services/storage.js";
import { getMessageText, getRemoteJid } from "../utils/message.js";

export async function handleUserCommand({ message, client }) {
  const text = getMessageText(message).toLowerCase();
  const userId = getRemoteJid(message);
  if (!userId) return;
  const rental = await getRental(userId);

  if (!rental || rental.status !== "aktif") {
    await client.sendMessage(userId, { text: "⛔ Masa sewa kamu tidak aktif. Hubungi owner." });
    return;
  }

  if (text === "list") {
    const log = await getPrayerLog(userId, getDateKey());
    const report = formatDailyReport(log ?? {});
    await client.sendMessage(userId, {
      text: `📋 Rekap Sholat Hari Ini\n\n${report}\n\nTetap semangat memperbaiki ibadah 🤍`
    });
    return;
  }

  if (text === "waktusholat") {
    const schedule = await getPrayerSchedule(new Date(), DEFAULT_CITY);
    await client.sendMessage(userId, {
      text: `🕌 Jadwal Sholat Hari Ini\n\n${formatSchedule(schedule)}`
    });
    return;
  }

  if (text === "rekap bulan") {
    const monthKey = getMonthKey();
    const logs = await getMonthlyLogs(userId, monthKey);
    const { lines, totalMisses } = formatMonthlyReport(logs);
    const title = `📊 Rekap Sholat Bulan ${dayjs().format("MMMM")}`;
    await client.sendMessage(userId, {
      text: `${title}\n\n${lines.join("\n")}\n\nTotal bolong bulan ini: ${totalMisses} sholat\n\nYuk perbaiki pelan-pelan 🤍`
    });
  }
}
