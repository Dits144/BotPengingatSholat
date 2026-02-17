import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import timezone from "dayjs/plugin/timezone.js";
import { Coordinates, CalculationMethod, PrayerTimes } from "adhan";
import { DEFAULT_CITY, PRAYER_ORDER } from "../config.js";

dayjs.extend(utc);
dayjs.extend(timezone);

export function getDateKey(date = new Date()) {
  return dayjs(date).tz("Asia/Jakarta").format("YYYY-MM-DD");
}

export function getMonthKey(date = new Date()) {
  return dayjs(date).tz("Asia/Jakarta").format("YYYY-MM");
}

export async function getPrayerSchedule(date = new Date(), city = DEFAULT_CITY) {
  const dateKey = dayjs(date).tz("Asia/Jakarta").format("DD-MM-YYYY");
  try {
    const url = `https://api.aladhan.com/v1/timings/${dateKey}?latitude=${city.latitude}&longitude=${city.longitude}&method=11&tune=0,0,0,0,0,0,0,0,0&timezonestring=Asia/Jakarta`;
    const response = await fetch(url);
    const json = await response.json();
    if (json?.data?.timings) {
      return normalizeApiSchedule(json.data.timings, date);
    }
  } catch (error) {
    console.error("⚠️ Gagal mengambil jadwal API, fallback ke adhan:", error?.message);
  }

  const coordinates = new Coordinates(city.latitude, city.longitude);
  const params = CalculationMethod.Singapore();
  const times = new PrayerTimes(coordinates, date, params);

  return {
    imsak: dayjs(times.fajr).subtract(10, "minute").toDate(),
    subuh: times.fajr,
    dzuhur: times.dhuhr,
    ashar: times.asr,
    magrib: times.maghrib,
    isya: times.isha
  };
}

function normalizeApiSchedule(timings, baseDate) {
  const date = dayjs(baseDate).tz("Asia/Jakarta");
  const parseTime = (value) => {
    const clean = (value || "00:00").split(" ")[0];
    const [hour, minute] = clean.split(":").map(Number);
    return date.hour(hour).minute(minute).second(0).millisecond(0).toDate();
  };

  return {
    imsak: parseTime(timings.Imsak),
    subuh: parseTime(timings.Fajr),
    dzuhur: parseTime(timings.Dhuhr),
    ashar: parseTime(timings.Asr),
    magrib: parseTime(timings.Maghrib),
    isya: parseTime(timings.Isha)
  };
}

export function formatSchedule(schedule) {
  const ordered = ["imsak", ...PRAYER_ORDER];
  return ordered.map((key) => {
    const time = schedule[key];
    return `${capitalize(key).padEnd(7, " ")}: ${dayjs(time).tz("Asia/Jakarta").format("HH:mm")}`;
  }).join("\n");
}

function capitalize(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
