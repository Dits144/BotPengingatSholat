export const prayers = ['subuh', 'dzuhur', 'ashar', 'maghrib', 'isya'] as const;
export type PrayerName = (typeof prayers)[number];

export const labels: Record<PrayerName, string> = {
  subuh: 'Subuh',
  dzuhur: 'Dzuhur',
  ashar: 'Ashar',
  maghrib: 'Maghrib',
  isya: 'Isya'
};

export const motivasiList = [
  '“Allah tidak membebani seseorang melainkan sesuai kesanggupannya.” (QS. Al-Baqarah: 286)',
  'Sholat tepat waktu adalah janji cinta kita kepada Allah 🤍',
  'Sedikit tapi istiqomah lebih dicintai Allah daripada banyak namun terputus.',
  'Saat hati gelisah, sujudlah. Di sana ketenangan dimulai.'
];

export const doaList = [
  '🤲 Rabbi yassir wa la tu’assir, Rabbi tammim bil khair. (Ya Allah mudahkanlah urusanku)',
  '🤲 Allahumma inni as’aluka ilman nafi’an, rizqan thayyiban, wa amalan mutaqabbalan.',
  '🤲 Rabbana atina fid-dunya hasanah wa fil-akhirati hasanah wa qina adzaban nar.'
];
