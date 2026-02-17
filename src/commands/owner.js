import dayjs from "dayjs";
import { DEFAULT_CITY, OWNER_GROUP_ID, RENT_STATUS } from "../config.js";
import { scheduleDailyReminders } from "../services/reminder.js";
import { getActiveRentals, getRental, setRental, upsertUser } from "../services/storage.js";
import { getMessageText, getRemoteJid, normalizeUserJid } from "../utils/message.js";

export async function handleOwnerCommand({ message, client }) {
  const remoteJid = getRemoteJid(message);
  if (remoteJid !== OWNER_GROUP_ID) return;

  const text = getMessageText(message);
  const [commandRaw, ...rest] = text.split(" ").filter(Boolean);
  const command = commandRaw?.toLowerCase();

  if (command === "addsewa") {
    const rawUserId = rest[0];
    const userId = normalizeUserJid(rawUserId);
    const days = Number(rest[1] ?? 30);
    const endDate = dayjs().add(days, "day").format("YYYY-MM-DD");

    if (!userId || Number.isNaN(days)) {
      await client.sendMessage(remoteJid, {
        text: "Format: addsewa 62812xxxxxx@c.us 30"
      });
      return;
    }

    await setRental(userId, { status: RENT_STATUS.ACTIVE, until: endDate });
    await upsertUser(userId, { createdAt: dayjs().toISOString() });
    await scheduleDailyReminders({ client, userId, city: DEFAULT_CITY });

    await client.sendMessage(remoteJid, {
      text: `✅ Penyewa ${userId} aktif sampai ${endDate}`
    });

    await client.sendMessage(userId, {
      text: "Hai! Selamat datang di Bot Pengingat Sholat 🤍\nBot sudah aktif untuk nomor kamu. Ketik 'list' untuk melihat rekap sholat hari ini atau 'WaktuSholat' untuk jadwal sholat hari ini."
    });
  }

  if (command === "disable") {
    const rawUserId = rest[0];
    const userId = normalizeUserJid(rawUserId);
    if (!userId) {
      await client.sendMessage(remoteJid, { text: "Format: disable 62812xxxxxx@c.us" });
      return;
    }
    await setRental(userId, { status: RENT_STATUS.INACTIVE });
    await client.sendMessage(remoteJid, {
      text: `⛔ Penyewa ${userId} dinonaktifkan.`
    });
  }

  if (command === "listsewa") {
    const rentals = await getActiveRentals();
    if (rentals.length === 0) {
      await client.sendMessage(remoteJid, { text: "Belum ada penyewa aktif." });
      return;
    }

    const lines = rentals.map(({ userId, rental }) => {
      const until = rental?.until ? `sampai ${rental.until}` : "";
      return `- ${userId} (${rental.status}) ${until}`.trim();
    });

    await client.sendMessage(remoteJid, {
      text: `📋 Daftar Penyewa Aktif\n\n${lines.join("\n")}`
    });
  }

  if (command === "ceksewa") {
    const rawUserId = rest[0];
    const userId = normalizeUserJid(rawUserId);
    if (!userId) {
      await client.sendMessage(remoteJid, { text: "Format: ceksewa 62812xxxxxx@c.us" });
      return;
    }
    const rental = await getRental(userId);
    if (!rental) {
      await client.sendMessage(remoteJid, { text: "Penyewa tidak ditemukan." });
      return;
    }
    await client.sendMessage(remoteJid, {
      text: `Status ${userId}: ${rental.status} ${rental.until ? `(hingga ${rental.until})` : ""}`
    });
  }
}
