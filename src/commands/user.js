import dayjs from "dayjs";
import { DEFAULT_CITY } from "../config.js";
import { formatSchedule, getDateKey, getMonthKey, getPrayerSchedule } from "../services/prayerTimes.js";
import { formatDailyReport, formatMonthlyReport, runTestCall } from "../services/reminder.js";
import { getMonthlyLogs, getPrayerLog, getRental } from "../services/storage.js";
import { getMessageText, getRemoteJid } from "../utils/message.js";

function normalizeCommand(text) {
  return text.toLowerCase().replace(/\s+/g, " ").trim();
}

async function sendWithDebug(client, userId, text, commandTag) {
  try {
    await client.sendMessage(userId, { text });
    console.log(`[SEND] ok jid=${userId} cmd=${commandTag}`);
  } catch (error) {
    console.error(`[SEND ERROR] jid=${userId} cmd=${commandTag}:`, error?.message ?? error);
  }
}

export async function handleUserCommand({ message, client }) {
  const userId = getRemoteJid(message);
  if (!userId) return;

  const rawText = getMessageText(message);
  const command = normalizeCommand(rawText);

  console.log(`[CMD] jid=${userId} text="${rawText}" command="${command}"`);
  if (!command) return;

  try {
    const rental = await getRental(userId);
    const isActive = rental?.status === "aktif";

    if (["listsholat", "list sholat"].includes(command)) {
      const log = await getPrayerLog(userId, getDateKey());
      const hasAnyData = log && Object.keys(log).length > 0;

      if (!isActive) {
        await sendWithDebug(client, userId, "⛔ Masa sewa kamu tidak aktif. Hubungi owner.", "listsholat");
        return;
      }

      const report = hasAnyData ? formatDailyReport(log) : "Belum ada catatan hari ini.";
      await sendWithDebug(
        client,
        userId,
        `📋 Rekap Sholat Hari Ini\n\n${report}\n\nKeterangan: ✅ sudah | ❌ terlewat | ⏳ menunggu`,
        "listsholat"
      );
      return;
    }

    if (["waktusholat", "waktu sholat", "jadwalsholat", "jadwal sholat"].includes(command)) {
      try {
        const schedule = await getPrayerSchedule(new Date(), DEFAULT_CITY);
        await sendWithDebug(
          client,
          userId,
          `🕌 Jadwal Sholat (Tajurhalang - Hari ini)\n\n${formatSchedule(schedule)}`,
          "waktusholat"
        );
      } catch (error) {
        await sendWithDebug(client, userId, "⚠️ Gagal ambil jadwal sholat sementara. Coba lagi 1-2 menit ya.", "waktusholat");
      }
      return;
    }

    if (command === "tescall" || command === "tesnotif") {
      const result = await runTestCall({ client, userId });
      await sendWithDebug(client, userId, result.message, "tescall");
      return;
    }

    if (!isActive) {
      await sendWithDebug(client, userId, "⛔ Masa sewa kamu tidak aktif. Hubungi owner.", "inactive");
      return;
    }

    if (command === "rekap bulan") {
      const monthKey = getMonthKey();
      const logs = await getMonthlyLogs(userId, monthKey);
      const { lines, totalMisses } = formatMonthlyReport(logs);
      const title = `📊 Rekap Sholat Bulan ${dayjs().format("MMMM")}`;
      const body = lines.length ? lines.join("\n") : "Belum ada catatan bulan ini.";
      await sendWithDebug(client, userId, `${title}\n\n${body}\n\nTotal bolong bulan ini: ${totalMisses} sholat`, "rekap bulan");
      return;
    }

    await sendWithDebug(client, userId, "🤖 Perintah belum dikenali.\nGunakan: listsholat, waktusholat, rekap bulan, tescall/tesnotif", "unknown");
  } catch (error) {
    console.error(`[CMD ERROR] jid=${userId} command="${command}":`, error?.message ?? error);
    await sendWithDebug(client, userId, "⚠️ Terjadi kendala memproses perintah. Coba lagi ya.", "error");
  }
}
