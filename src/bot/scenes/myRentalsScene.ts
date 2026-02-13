import { Scenes } from 'telegraf';
import { BotContext } from '../types';
import { getMyRentals } from '../../services/rentalService';

export const MY_RENTALS_SCENE = 'MY_RENTALS_SCENE';

export const myRentalsScene = new Scenes.WizardScene<BotContext>(
  MY_RENTALS_SCENE,
  async (ctx) => {
    if (!ctx.from) return ctx.scene.leave();

    const data = await getMyRentals(ctx.from.id);
    const activeMsg = data.active.length
      ? data.active
          .map((r) => `#${r.id} ${r.productName}\nAkun: ${r.emailMasked}\nMulai: ${r.startAt}\nSelesai: ${r.endAt}\nSisa: ${r.countdown}`)
          .join('\n\n')
      : 'Tidak ada sewa aktif.';

    const historyMsg = data.history.length
      ? data.history.map((h) => `#${h.id} ${h.productName} selesai ${h.endAt}`).join('\n')
      : 'Belum ada riwayat.';

    await ctx.reply(`📌 Sewa Aktif\n${activeMsg}\n\n🕘 Riwayat\n${historyMsg}`);
    return ctx.scene.leave();
  }
);
