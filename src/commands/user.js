import dayjs from "dayjs";
import { DEFAULT_CITY } from "../config.js";
import { formatSchedule, getDateKey, getMonthKey, getPrayerSchedule } from "../services/prayerTimes.js";
import { formatDailyReport, formatMonthlyReport } from "../services/reminder.js";
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

  if (!command) {
    console.log(`[CMD] skip empty text jid=${userId}`);
    return;
  }

  try {
    const rental = await getRental(userId);
    const isActive = rental?.status === "aktif";

    if (command === "list") {
      const log = await getPrayerLog(userId, getDateKey());
      const hasAnyData = log && Object.keys(log).length > 0;

      if (!isActive) {
        await sendWithDebug(
          client,
          userId,
          "📋 Rekap Sholat Hari Ini\nBelum ada catatan hari ini.\nKetik: waktusholat untuk lihat jadwal.\n\nℹ️ Status sewa kamu belum aktif, hubungi owner ya.",
          "list"
        );
        return;
      }

      const report = hasAnyData ? formatDailyReport(log) : "Belum ada catatan hari ini.\nKetik: waktusholat untuk lihat jadwal.";
      await sendWithDebug(
        client,
        userId,
        `📋 Rekap Sholat Hari Ini\n\n${report}\n\nTetap semangat memperbaiki ibadah 🤍`,
        "list"
      );
      return;
    }

    if (["waktusholat", "waktu sholat", "jadwalsholat", "jadwal sholat"].includes(command)) {
      try {
        const schedule = await getPrayerSchedule(new Date(), DEFAULT_CITY);
        await sendWithDebug(
          client,
          userId,
          `🕌 Jadwal Sholat Hari Ini (${DEFAULT_CITY.name})\n\n${formatSchedule(schedule)}`,
          "waktusholat"
        );
      } catch (error) {
        await sendWithDebug(
          client,
          userId,
          "⚠️ Gagal ambil jadwal sholat sementara. Coba lagi 1-2 menit ya.",
          "waktusholat"
        );
        console.error(`[CMD ERROR] waktusholat jid=${userId}:`, error?.message ?? error);
      }
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
      await sendWithDebug(
        client,
        userId,
        `${title}\n\n${body}\n\nTotal bolong bulan ini: ${totalMisses} sholat\n\nYuk perbaiki pelan-pelan 🤍`,
        "rekap bulan"
      );
      return;
    }

    await sendWithDebug(
      client,
      userId,
      "🤖 Perintah belum dikenali.\n\nGunakan:\n- list\n- waktusholat\n- rekap bulan",
      "unknown"
    );
  } catch (error) {
    console.error(`[CMD ERROR] jid=${userId} command="${command}":`, error?.message ?? error);
    await sendWithDebug(client, userId, "⚠️ Terjadi kendala memproses perintah. Coba lagi ya.", "error");
  }
}
