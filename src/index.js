import makeWASocket, {
  DisconnectReason,
  fetchLatestBaileysVersion,
  useMultiFileAuthState
} from "@whiskeysockets/baileys";
import qrcode from "qrcode-terminal";
import { DEFAULT_CITY, OWNER_GROUP_ID } from "./config.js";
import { handleOwnerCommand } from "./commands/owner.js";
import { handleUserCommand } from "./commands/user.js";
import { handlePrayerResponse, scheduleDailyReminders } from "./services/reminder.js";
import { getActiveRentals } from "./services/storage.js";
import { getMessageText, getRemoteJid } from "./utils/message.js";

let isStarting = false;

async function startBot() {
  if (isStarting) return;
  isStarting = true;

  try {
    const { state, saveCreds } = await useMultiFileAuthState("auth");
    const { version } = await fetchLatestBaileysVersion();

    const client = makeWASocket({ auth: state, version });

    client.ev.on("creds.update", saveCreds);

    client.ev.on("connection.update", (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        console.log("📌 Scan QR (WhatsApp > Perangkat tertaut):");
        qrcode.generate(qr, { small: true });
      }

      if (connection === "open") {
        console.log("✅ Connected to WhatsApp.");
      }

      if (connection === "close") {
        const statusCode = lastDisconnect?.error?.output?.statusCode;
        const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

        console.log("⚠️ Connection closed. status =", statusCode, "reconnect =", shouldReconnect);

        if (shouldReconnect) {
          setTimeout(() => {
            isStarting = false;
            startBot();
          }, 3000);
        } else {
          console.log("🚪 Logged out. Hapus folder auth lalu scan ulang.");
        }
      }
    });

    client.ev.on("messages.upsert", async ({ messages, type }) => {
      const message = messages?.[0];
      if (!message?.message || message.key.fromMe) return;

      const remoteJid = getRemoteJid(message);
      const text = (getMessageText(message) || "").trim();

      console.log(`[INCOMING] type=${type} jid=${remoteJid} text="${text}"`);

      if (type && type !== "notify") {
        console.log(`[INCOMING] skip type=${type} jid=${remoteJid}`);
        return;
      }

      if (!remoteJid || remoteJid === "status@broadcast") {
        console.log(`[INCOMING] skip non-chat jid=${remoteJid}`);
        return;
      }

      if (remoteJid === OWNER_GROUP_ID) {
        await handleOwnerCommand({ message, client });
        return;
      }

      if (remoteJid.endsWith("@s.whatsapp.net")) {
        const normalizedText = text.toLowerCase();

        if (normalizedText === "sudah" || normalizedText === "belum") {
          await handlePrayerResponse({ userId: remoteJid, message: normalizedText, client });
          return;
        }

        await handleUserCommand({ message, client });
      }
    });

    await bootstrapReminders(client);
  } catch (err) {
    console.error("❌ startBot error:", err);
    setTimeout(() => {
      isStarting = false;
      startBot();
    }, 3000);
    return;
  }

  isStarting = false;
}

async function bootstrapReminders(client) {
  const rentals = await getActiveRentals();
  rentals.forEach(({ userId }) => {
    scheduleDailyReminders({ client, userId, city: DEFAULT_CITY });
  });
}

startBot();
