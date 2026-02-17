const makeWASocket = require("@whiskeysockets/baileys").default;
const {
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
} = require("@whiskeysockets/baileys");
const qrcode = require("qrcode-terminal");
const cron = require("node-cron");
const { format, parse, isValid, addDays } = require("date-fns");
const { toZonedTime } = require("date-fns-tz");

const { loadState, saveState } = require("./storage/dataStore");
const {
  OWNER_WA_ID,
  DEFAULT_RESET_TIME,
  DEFAULT_TIMEZONE,
} = require("./config/constants");

const ALLOWED_GROUP_ID = "120363407299350673@g.us";

const MOTIVATIONS = [
  "Bismillah, 1 juz hari ini. Pelan tapi konsisten 🤲",
  "Yang penting jalan terus. Allah suka yang istiqomah.",
  "Capek itu wajar, berhenti jangan. Ayo setor hari ini 💪",
  "Satu hari satu juz = selangkah lebih dekat ke khatam.",
  "Semoga bacaanmu jadi cahaya di hati. Semangat!",
  "Kalau hari ini berat, baca sedikit dulu. Nanti lanjut lagi.",
  "Jangan tunggu mood. Mulai dulu, barokah nyusul.",
  "Target hari ini: selesai. Bukan sempurna, tapi selesai ✅",
  "Niatkan karena Allah, insyaAllah dimudahkan.",
  "Pelan-pelan tapi pasti. Baca 1 juz, pahala melimpah.",
  "Buka mushaf, buka pintu rahmat. Semangat!",
  "Lelahmu jadi saksi kebaikan. Jangan menyerah.",
  "Setiap ayat yang dibaca menambah ketenangan hati.",
  "Ingat niat awal: khatam bersama. Ayo lanjut!",
  "Waktu terbaik membaca adalah sekarang. Mulai!",
  "Biar sedikit, yang penting istiqomah.",
  "Juz hari ini, pahala hari ini. Ayo setor!",
  "Kalau tertinggal, bangkit lagi. Allah Maha Pengampun.",
  "Jangan lihat jauhnya khatam, fokus 1 juz hari ini.",
  "Yuk teruskan langkah, bareng-bareng lebih ringan.",
  "Allah melihat usaha kecilmu. Teruskan!",
  "Pahala berlipat di Ramadhan. Jangan lewatkan.",
  "Qur'an itu obat. Bacalah walau sebentar.",
  "Bismillah, hari ini lebih baik dari kemarin.",
  "Mushaf menunggu sentuhanmu. Ayo mulai.",
  "Tidak harus sempurna, yang penting bergerak.",
  "Baca dulu, nanti semangat menyusul.",
  "Konsisten kecil lebih baik dari niat besar tanpa aksi.",
  "Yuk setor sebelum malam. Semangat!",
  "Hari ke-30, semoga khatam konsisten. Aamiin 🤲",
];

const getTodayDate = (timezone) => {
  const now = toZonedTime(new Date(), timezone);
  return format(now, "yyyy-MM-dd");
};

const getTimeInZone = (timezone) => {
  const now = toZonedTime(new Date(), timezone);
  return format(now, "HH:mm");
};

const ensureGroupState = (state, groupId) => {
  if (!state.groups[groupId]) {
    state.groups[groupId] = {
      settings: {
        odojEnabled: false,
        registrationOpen: false,
        odojRunning: false,
        ramadanStartDate: null,
        ramadanEndDate: null,
        dailyResetTime: DEFAULT_RESET_TIME,
        timezone: DEFAULT_TIMEZONE,
        ownerWaId: null,
      },
      participants: [],
      nextSlotNumber: 1,
      todayChecklist: {},
      lastChecklistDate: null,
      lastReminderDate: null,
      history: {
        totalSetorByUser: {},
        bolongByUser: {},
        setorTimesByUser: {},
        streakByUser: {},
        lastDoneDateByUser: {},
      },
      motivationIndex: 0,
      customMotivation: null,
    };
  }
  return state.groups[groupId];
};

const getParticipantByWaId = (group, waId) =>
  group.participants.find((participant) => participant.wa_id === waId);

const normalizeName = (name) => name.trim().toLowerCase();

const getChecklistEntry = (group, waId) => group.todayChecklist[waId];

const formatChecklistLine = (entry) => {
  if (!entry) return null;
  if (entry.done) {
    return `✅ ${entry.name} — Target: Juz ${entry.juz_target_today} — ${entry.time_done}`;
  }
  return `⏳ ${entry.name} — Target: Juz ${entry.juz_target_today}`;
};

const getMotivationMessage = (group) => {
  if (group.customMotivation) {
    const message = group.customMotivation;
    group.customMotivation = null;
    return message;
  }
  const message = MOTIVATIONS[group.motivationIndex % MOTIVATIONS.length];
  group.motivationIndex = (group.motivationIndex + 1) % MOTIVATIONS.length;
  return message;
};

const resetDailyChecklist = (group, timezone) => {
  const todayDate = getTodayDate(timezone);
  const previousChecklist = group.todayChecklist;

  if (group.lastChecklistDate) {
    Object.values(previousChecklist).forEach((entry) => {
      const waId = entry.wa_id;
      if (!group.history.totalSetorByUser[waId]) {
        group.history.totalSetorByUser[waId] = 0;
      }
      if (!group.history.bolongByUser[waId]) {
        group.history.bolongByUser[waId] = 0;
      }
      if (!group.history.setorTimesByUser[waId]) {
        group.history.setorTimesByUser[waId] = [];
      }
      if (!group.history.streakByUser[waId]) {
        group.history.streakByUser[waId] = 0;
      }

      if (entry.done) {
        group.history.totalSetorByUser[waId] += 1;
        group.history.setorTimesByUser[waId].push(entry.time_done);

        const lastDoneDate = group.history.lastDoneDateByUser[waId];
        if (lastDoneDate) {
          const parsed = parse(lastDoneDate, "yyyy-MM-dd", new Date());
          if (isValid(parsed)) {
            const expected = format(addDays(parsed, 1), "yyyy-MM-dd");
            if (expected === group.lastChecklistDate) {
              group.history.streakByUser[waId] += 1;
            } else {
              group.history.streakByUser[waId] = 1;
            }
          } else {
            group.history.streakByUser[waId] = 1;
          }
        } else {
          group.history.streakByUser[waId] = 1;
        }
        group.history.lastDoneDateByUser[waId] = group.lastChecklistDate;
      } else {
        group.history.bolongByUser[waId] += 1;
        group.history.streakByUser[waId] = 0;
      }
    });
  }

  const newChecklist = {};
  group.participants.forEach((participant) => {
    const prevEntry = previousChecklist[participant.wa_id];
    let targetJuz = participant.start_juz_assigned;
    if (prevEntry) {
      if (prevEntry.done) {
        targetJuz = prevEntry.juz_target_today === 30 ? 1 : prevEntry.juz_target_today + 1;
      } else {
        targetJuz = prevEntry.juz_target_today;
      }
    }
    newChecklist[participant.wa_id] = {
      wa_id: participant.wa_id,
      name: participant.name,
      juz_target_today: targetJuz,
      done: false,
      time_done: null,
    };
  });

  group.todayChecklist = newChecklist;
  group.lastChecklistDate = todayDate;
};

const buildLeaderboard = (group) => {
  const totals = group.history.totalSetorByUser;
  const times = group.history.setorTimesByUser;

  const entries = group.participants.map((participant) => {
    const total = totals[participant.wa_id] || 0;
    const timeList = times[participant.wa_id] || [];
    const avgTime = timeList.length
      ? timeList.reduce((acc, time) => acc + parseInt(time.replace(":", ""), 10), 0) /
        timeList.length
      : 9999;
    return {
      name: participant.name,
      wa_id: participant.wa_id,
      total,
      avgTime,
    };
  });

  return entries
    .sort((a, b) => b.total - a.total || a.avgTime - b.avgTime)
    .slice(0, 3);
};

const buildRekap = (group) => {
  const lines = group.participants.map((participant) => {
    const total = group.history.totalSetorByUser[participant.wa_id] || 0;
    const bolong = group.history.bolongByUser[participant.wa_id] || 0;
    return `• ${participant.name}: ${total} setor, ${bolong} bolong`;
  });
  const leaderboard = buildLeaderboard(group);
  const leaderboardLines = leaderboard.map(
    (entry, index) => `${index + 1}. ${entry.name} — ${entry.total} setor`
  );
  return {
    lines,
    leaderboardLines,
  };
};

const getBadgeMessage = (streak) => {
  if (streak >= 30) return "👑 Khatam Konsisten";
  if (streak >= 7) return "🏅 Pejuang ODOJ";
  if (streak >= 3) return "🔥 Istiqomah 3 Hari";
  return null;
};

const formatMention = (waId) => `@${waId.split("@")[0]}`;

const ensureChecklistForToday = (group, timezone) => {
  const todayDate = getTodayDate(timezone);
  if (group.lastChecklistDate !== todayDate) {
    resetDailyChecklist(group, timezone);
  }
};

const handleResetIfNeeded = (state, sock) => {
  const stateChangedGroups = [];
  Object.entries(state.groups).forEach(([groupId, group]) => {
    if (groupId !== ALLOWED_GROUP_ID) return;
    const timezone = group.settings.timezone || DEFAULT_TIMEZONE;
    const nowTime = getTimeInZone(timezone);
    const todayDate = getTodayDate(timezone);
    if (
      group.settings.odojRunning &&
      nowTime === group.settings.dailyResetTime &&
      group.lastChecklistDate !== todayDate
    ) {
      resetDailyChecklist(group, timezone);
      stateChangedGroups.push({ groupId, group });
    }
  });

  if (stateChangedGroups.length) {
    saveState(state);
    stateChangedGroups.forEach(({ groupId, group }) => {
      const motivation = getMotivationMessage(group);
      sock.sendMessage(groupId, {
        text: `🌅 Hari baru, target baru!\nCek list untuk lihat target juz kamu hari ini.\nJangan lupa setor sebelum jam 23:59 ya 🤲\n\n${motivation}`,
      });
    });
  }
};

const handleReminderIfNeeded = (state, sock) => {
  Object.entries(state.groups).forEach(([groupId, group]) => {
    if (groupId !== ALLOWED_GROUP_ID) return;
    const timezone = group.settings.timezone || DEFAULT_TIMEZONE;
    const nowTime = getTimeInZone(timezone);
    const todayDate = getTodayDate(timezone);
    if (
      group.settings.odojRunning &&
      nowTime === "22:00" &&
      group.lastReminderDate !== todayDate
    ) {
      ensureChecklistForToday(group, timezone);
      const pending = Object.values(group.todayChecklist).filter((entry) => !entry.done);
      if (pending.length) {
        const mentions = pending.map((entry) => entry.wa_id);
        const mentionText = pending.map((entry) => formatMention(entry.wa_id)).join(" ");
        sock.sendMessage(groupId, {
          text: `⏰ Reminder ODOJ! Yang belum setor hari ini: ${mentionText}\nMasih sempet ya, semangat! 🤲`,
          mentions,
        });
      }
      group.lastReminderDate = todayDate;
      saveState(state);
    }
  });
};

const isOwner = (waId) => waId === OWNER_WA_ID;

const getSenderId = (message) => {
  if (message.key.participant) {
    return message.key.participant;
  }
  return message.key.remoteJid;
};

const getMessageText = (message) => {
  const msg = message.message;
  if (!msg) return "";
  if (msg.conversation) return msg.conversation;
  if (msg.extendedTextMessage && msg.extendedTextMessage.text) {
    return msg.extendedTextMessage.text;
  }
  if (msg.imageMessage && msg.imageMessage.caption) {
    return msg.imageMessage.caption;
  }
  return "";
};

const sendOwnerOnlyWarning = (sock, jid) =>
  sock.sendMessage(jid, { text: "Perintah ini khusus owner." });

const handleMessage = async (sock, state, message) => {
  const text = getMessageText(message).trim();
  if (!text) return;

  const remoteJid = message.chat || message.key.remoteJid;
  if (!remoteJid) return;

  const sender = getSenderId(message);
  if (!sender) return;

  if (!sender.endsWith("@s.whatsapp.net")) return;

  if (remoteJid === OWNER_WA_ID && sender === OWNER_WA_ID) {
    await sock.sendMessage(remoteJid, {
      text: "Bot ODOJ hanya aktif di grup ODOJ.\nSilakan gunakan perintah di grup.",
    });
    return;
  }

  if (remoteJid !== ALLOWED_GROUP_ID) return;

  if (!remoteJid.endsWith("@g.us")) return;

  const group = ensureGroupState(state, remoteJid);
  const timezone = group.settings.timezone || DEFAULT_TIMEZONE;

  handleResetIfNeeded(state, sock);
  handleReminderIfNeeded(state, sock);

  const lowerText = text.toLowerCase();

  if (lowerText === "help") {
    await sock.sendMessage(remoteJid, {
      text: "Perintah user:\n• daftar Nama\n• list\n• Nama done juz X",
    });
    return;
  }

  const infoCommand = lowerText === "info";
  const aktifOdojCommand = lowerText.startsWith("aktif odoj");
  const startPendaftaranCommand = lowerText === "start pendaftaran";
  const startOdojCommand = lowerText === "start odoj";
  const finishOdojCommand = lowerText === "finish odoj";
  const resetHariCommand = lowerText === "reset hari";
  const broadcastCommand = lowerText.startsWith("broadcast ");
  const rekapCommand = lowerText === "rekap";
  const setWaktuCommand = lowerText.startsWith("set waktu reset ");
  const setMotivasiCommand = lowerText.startsWith("set motivasi ");

  const isOwnerCommand =
    infoCommand ||
    aktifOdojCommand ||
    startPendaftaranCommand ||
    startOdojCommand ||
    finishOdojCommand ||
    resetHariCommand ||
    broadcastCommand ||
    rekapCommand ||
    setWaktuCommand ||
    setMotivasiCommand;

  if (isOwnerCommand && !isOwner(sender)) {
    await sendOwnerOnlyWarning(sock, remoteJid);
    return;
  }

  if (infoCommand) {
    const metadata = await sock.groupMetadata(remoteJid);
    await sock.sendMessage(remoteJid, {
      text: `Info Grup:\nNama: ${metadata.subject}\nID: ${remoteJid}\nStatus:\n• ODOJ Enabled: ${
        group.settings.odojEnabled ? "Ya" : "Tidak"
      }\n• Pendaftaran Open: ${group.settings.registrationOpen ? "Ya" : "Tidak"}\n• ODOJ Running: ${
        group.settings.odojRunning ? "Ya" : "Tidak"
      }\nJumlah peserta: ${group.participants.length}`,
    });
    return;
  }

  if (aktifOdojCommand) {
    const parts = text.split(" ");
    const groupId = parts[2] || remoteJid;
    const targetGroup = ensureGroupState(state, groupId);
    targetGroup.settings.odojEnabled = true;
    saveState(state);
    await sock.sendMessage(groupId, {
      text: "✅ Grup ODOJ aktif. Owner bisa buka pendaftaran dengan start pendaftaran.",
    });
    return;
  }

  if (startPendaftaranCommand) {
    group.settings.odojEnabled = true;
    group.settings.registrationOpen = true;
    group.settings.odojRunning = false;
    saveState(state);
    await sock.sendMessage(remoteJid, {
      text: "📢 Pendaftaran ODOJ dibuka!\nKetik: daftar NamaKamu\nContoh: daftar Radit\nSlot juz akan otomatis dibagi 1–30.",
    });
    return;
  }

  if (startOdojCommand) {
    group.settings.registrationOpen = false;
    group.settings.odojRunning = true;
    resetDailyChecklist(group, timezone);
    saveState(state);
    await sock.sendMessage(remoteJid, {
      text: "🌙 ODOJ DIMULAI!\nHari ini masing-masing baca sesuai target di list.\nSetor dengan format: Nama done juz X.\nSemangat khatam bareng-bareng 💪",
    });
    return;
  }

  if (finishOdojCommand) {
    group.settings.odojRunning = false;
    const rekap = buildRekap(group);
    saveState(state);
    await sock.sendMessage(remoteJid, {
      text: `🏁 ODOJ SELESAI! Ini rekap Ramadhan:\n${rekap.lines.join(
        "\n"
      )}\n\nTop 3:\n${rekap.leaderboardLines.join("\n")}`,
    });
    return;
  }

  if (rekapCommand) {
    const rekap = buildRekap(group);
    await sock.sendMessage(remoteJid, {
      text: `📊 Rekap sementara:\n${rekap.lines.join("\n")}\n\nTop 3:\n${rekap.leaderboardLines.join(
        "\n"
      )}`,
    });
    return;
  }

  if (resetHariCommand) {
    resetDailyChecklist(group, timezone);
    saveState(state);
    await sock.sendMessage(remoteJid, {
      text: "✅ Checklist hari ini sudah di-reset ulang.",
    });
    return;
  }

  if (setWaktuCommand) {
    const time = text.replace(/set waktu reset /i, "").trim();
    const parsed = parse(time, "HH:mm", new Date());
    if (!isValid(parsed)) {
      await sock.sendMessage(remoteJid, {
        text: "Format waktu tidak valid. Contoh: set waktu reset 00:00",
      });
      return;
    }
    group.settings.dailyResetTime = format(parsed, "HH:mm");
    saveState(state);
    await sock.sendMessage(remoteJid, {
      text: `✅ Waktu reset harian diubah menjadi ${group.settings.dailyResetTime} (Asia/Jakarta).`,
    });
    return;
  }

  if (setMotivasiCommand) {
    const messageText = text.replace(/set motivasi /i, "").trim();
    if (!messageText) {
      await sock.sendMessage(remoteJid, {
        text: "Tulis pesan motivasi setelah perintah. Contoh: set motivasi Semangat hari ini!",
      });
      return;
    }
    group.customMotivation = messageText;
    saveState(state);
    await sock.sendMessage(remoteJid, {
      text: "✅ Motivasi harian berhasil diset.",
    });
    return;
  }

  if (broadcastCommand) {
    const messageText = text.replace(/broadcast /i, "").trim();
    if (!messageText) {
      await sock.sendMessage(remoteJid, { text: "Isi pesan broadcast tidak boleh kosong." });
      return;
    }
    await sock.sendMessage(remoteJid, { text: messageText });
    return;
  }

  if (lowerText === "list") {
    if (!group.settings.odojRunning) {
      await sock.sendMessage(remoteJid, {
        text: "ODOJ belum dimulai. Saat ODOJ dimulai, list akan menampilkan checklist setoran harian.",
      });
      return;
    }
    ensureChecklistForToday(group, timezone);
    const entries = Object.values(group.todayChecklist).map(formatChecklistLine);
    const doneCount = Object.values(group.todayChecklist).filter((entry) => entry.done).length;
    const total = group.participants.length;
    const nowDate = format(toZonedTime(new Date(), timezone), "dd MMMM yyyy");
    await sock.sendMessage(remoteJid, {
      text: `📅 ${nowDate}\nTotal peserta: ${total}\nSudah setor: ${doneCount}\nBelum setor: ${
        total - doneCount
      }\n\n${entries.join("\n")}`,
    });
    return;
  }

  if (lowerText.startsWith("daftar ")) {
    if (!group.settings.odojEnabled) {
      await sock.sendMessage(remoteJid, { text: "ODOJ belum diaktifkan oleh owner." });
      return;
    }
    if (!group.settings.registrationOpen) {
      await sock.sendMessage(remoteJid, {
        text: "Pendaftaran belum dibuka. Tunggu info dari owner ya.",
      });
      return;
    }
    const name = text.replace(/daftar /i, "").trim();
    if (!name) {
      await sock.sendMessage(remoteJid, {
        text: "Format pendaftaran salah. Contoh: daftar Radit",
      });
      return;
    }
    const existing = getParticipantByWaId(group, sender);
    if (existing) {
      await sock.sendMessage(remoteJid, {
        text: `Kamu sudah terdaftar sebagai ${existing.name}. Slot kamu: Juz ${existing.start_juz_assigned}.`,
      });
      return;
    }
    const joinOrder = group.nextSlotNumber;
    const slot = ((joinOrder - 1) % 30) + 1;
    group.participants.push({
      name,
      wa_id: sender,
      join_order: joinOrder,
      start_juz_assigned: slot,
    });
    group.nextSlotNumber += 1;
    saveState(state);
    await sock.sendMessage(remoteJid, {
      text: `✅ Berhasil daftar ODOJ!\nNama: ${name}\nSlot awal: Juz ${slot}\n\nNanti kalau ODOJ dimulai, kamu setor dengan format:\n${name} done juz ${slot}\nContoh: Radit done juz 1`,
    });
    return;
  }

  const setorMatch = text.match(/^(.+)\s+done\s+juz\s+(\d{1,2})$/i);
  if (setorMatch) {
    if (!group.settings.odojRunning) {
      await sock.sendMessage(remoteJid, { text: "ODOJ belum dimulai." });
      return;
    }
    const nameInput = setorMatch[1].trim();
    const juzNumber = parseInt(setorMatch[2], 10);
    if (Number.isNaN(juzNumber) || juzNumber < 1 || juzNumber > 30) {
      await sock.sendMessage(remoteJid, {
        text: "Nomor juz tidak valid. Harus 1–30.",
      });
      return;
    }
    const participant = getParticipantByWaId(group, sender);
    if (!participant) {
      await sock.sendMessage(remoteJid, {
        text: "Kamu belum terdaftar. Ketik: daftar NamaKamu",
      });
      return;
    }
    if (normalizeName(participant.name) !== normalizeName(nameInput)) {
      await sock.sendMessage(remoteJid, {
        text: `Nama kamu terdaftar sebagai ${participant.name}. Setor pakai nama itu ya 🙂`,
      });
      return;
    }
    ensureChecklistForToday(group, timezone);
    const entry = getChecklistEntry(group, sender);
    if (!entry) {
      await sock.sendMessage(remoteJid, {
        text: "Checklist belum siap. Coba lagi sebentar.",
      });
      return;
    }
    if (entry.done) {
      await sock.sendMessage(remoteJid, {
        text: "Kamu sudah setor hari ini ✅",
      });
      return;
    }
    if (entry.juz_target_today !== juzNumber) {
      await sock.sendMessage(remoteJid, {
        text: `Target kamu hari ini Juz ${entry.juz_target_today}. Kalau mau ubah target, minta owner ya.`,
      });
      return;
    }
    entry.done = true;
    entry.time_done = getTimeInZone(timezone);
    saveState(state);
    const streak = group.history.streakByUser[sender] || 0;
    const badgeMessage = getBadgeMessage(streak + 1);
    const badgeLine = badgeMessage ? `\n${badgeMessage}` : "";
    await sock.sendMessage(remoteJid, {
      text: `✅ Mantap ${participant.name}! Setor Juz ${juzNumber} tercatat. Semoga Allah mudahkan sampai khatam 🤲${badgeLine}`,
    });
    return;
  }

  if (lowerText.startsWith("daftar") || lowerText.includes("done juz")) {
    await sock.sendMessage(remoteJid, {
      text: "Format tidak dikenali. Contoh:\n• daftar Radit\n• Radit done juz 1",
    });
  }
};

const handleParticipantUpdate = async (sock, update) => {
  if (update.id !== ALLOWED_GROUP_ID) return;
  if (update.action !== "add") return;
  const mentions = update.participants || [];
  if (!mentions.length) return;
  const mentionText = mentions.map((id) => formatMention(id)).join(" ");
  await sock.sendMessage(update.id, {
    text: `Halo ${mentionText} 👋 Selamat datang di grup ODOJ Ramadhan!\nUntuk ikut program, ketik:\ndaftar (nama kamu)\nContoh: daftar Radit\n\nCek target & status setoran harian dengan ketik: list ✅`,
    mentions,
  });
};

const startBot = async () => {
  const { state: authState, saveCreds } = await useMultiFileAuthState("auth");
  const { version } = await fetchLatestBaileysVersion();
  const sock = makeWASocket({
    version,
    auth: {
      creds: authState.creds,
      keys: makeCacheableSignalKeyStore(authState.keys, console),
    },
    printQRInTerminal: false,
  });

  console.log("ODOJ Bot Running");
  console.log(`Allowed Group: ${ALLOWED_GROUP_ID}`);
  console.log(`Owner: ${OWNER_WA_ID}`);

  sock.ev.on("connection.update", (update) => {
    const { connection, qr, lastDisconnect } = update;
    if (qr) {
      qrcode.generate(qr, { small: true });
    }
    if (connection === "close") {
      const shouldReconnect =
        lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
      if (shouldReconnect) {
        startBot();
      }
    }
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("messages.upsert", async ({ messages }) => {
    const state = loadState();
    for (const message of messages) {
      if (!message.message || message.key.fromMe) continue;
      await handleMessage(sock, state, message);
    }
  });

  sock.ev.on("group-participants.update", (update) => {
    handleParticipantUpdate(sock, update);
  });

  cron.schedule("* * * * *", () => {
    const state = loadState();
    handleResetIfNeeded(state, sock);
    handleReminderIfNeeded(state, sock);
  });
};

startBot();
