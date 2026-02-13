import { Markup, Scenes } from 'telegraf';
import { BotContext } from '../types';
import { parseDurationText } from '../../utils/date';
import { listProducts } from '../../services/productService';
import { rentAccount } from '../../services/rentalService';

export const RENT_SCENE = 'RENT_SCENE';

export const rentScene = new Scenes.WizardScene<BotContext>(
  RENT_SCENE,
  async (ctx) => {
    const products = await listProducts();
    if (!products.length) {
      await ctx.reply('Produk belum tersedia.');
      return ctx.scene.leave();
    }

    await ctx.reply(
      'Pilih produk untuk sewa:',
      Markup.inlineKeyboard(products.map((p) => [Markup.button.callback(p.name, `rent_product:${p.id}`)]))
    );
    return ctx.wizard.next();
  },
  async (ctx) => {
    if (!ctx.callbackQuery || !('data' in ctx.callbackQuery)) return;
    const [key, rawId] = ctx.callbackQuery.data.split(':');
    const productId = Number(rawId);
    if (key !== 'rent_product' || !Number.isFinite(productId)) {
      await ctx.answerCbQuery();
      await ctx.reply('Produk tidak valid, pilih lagi.');
      return;
    }

    ctx.wizard.state.productId = productId;
    await ctx.answerCbQuery();
    await ctx.reply(
      'Pilih durasi sewa:',
      Markup.inlineKeyboard([
        [Markup.button.callback('7 hari', 'rent_dur:0:7')],
        [Markup.button.callback('30 hari', 'rent_dur:0:30')],
        [Markup.button.callback('1 bulan', 'rent_dur:1:0')],
        [Markup.button.callback('Custom', 'rent_dur:custom')]
      ])
    );
    return ctx.wizard.next();
  },
  async (ctx) => {
    if (!ctx.from) return;

    if (ctx.callbackQuery && 'data' in ctx.callbackQuery) {
      const parts = ctx.callbackQuery.data.split(':');
      if (parts[0] !== 'rent_dur') return;

      await ctx.answerCbQuery();
      if (parts[1] === 'custom') {
        ctx.wizard.state.custom = true;
        await ctx.reply('Masukkan durasi custom. Contoh: 1 bulan 5 hari');
        return;
      }

      const months = Number(parts[1]);
      const days = Number(parts[2]);
      const res = await rentAccount({
        productId: Number(ctx.wizard.state.productId),
        months,
        days,
        userId: ctx.from.id
      });
      if (!res.ok) {
        await ctx.reply(`❌ ${res.message}`);
      } else {
        await ctx.reply(
          `✅ Sewa berhasil\nAkun: #${res.item.accountId}\nEmail: ${res.item.email}\nPassword: ${res.item.password}\nSewa sampai: ${res.item.rentEndAt}\nSisa waktu: ${res.item.countdown}`
        );
      }
      return ctx.scene.leave();
    }

    if (!ctx.message || !('text' in ctx.message) || !ctx.wizard.state.custom) return;
    try {
      const dur = parseDurationText(ctx.message.text);
      const res = await rentAccount({
        productId: Number(ctx.wizard.state.productId),
        months: dur.months,
        days: dur.days,
        userId: ctx.from.id
      });
      if (!res.ok) {
        await ctx.reply(`❌ ${res.message}`);
      } else {
        await ctx.reply(
          `✅ Sewa berhasil\nAkun: #${res.item.accountId}\nEmail: ${res.item.email}\nPassword: ${res.item.password}\nSewa sampai: ${res.item.rentEndAt}\nSisa waktu: ${res.item.countdown}`
        );
      }
      return ctx.scene.leave();
    } catch {
      await ctx.reply('Format durasi tidak valid. Contoh: 1 bulan 5 hari');
      return;
    }
  }
);
