import { Telegraf } from 'telegraf';
import { BotContext } from '../types';
import { startKeyboard } from '../keyboards/userKeyboard';
import { listProducts } from '../../services/productService';
import { getProductCard } from '../../services/stockService';

export function registerStartHandler(bot: Telegraf<BotContext>) {
  bot.start(async (ctx) => {
    await ctx.reply('Selamat datang di bot stok akun digital. Klik tombol di bawah untuk lihat produk.', startKeyboard);
  });

  bot.action('USER_VIEW_PRODUCTS', async (ctx) => {
    await ctx.answerCbQuery();
    const products = await listProducts();
    if (!products.length) {
      await ctx.reply('Belum ada produk.');
      return;
    }
    for (const p of products) {
      const card = await getProductCard(p.id);
      await ctx.reply(
        `📦 ${p.name}\nHarga: ${p.price || '-'}\nStok tersedia: ${card.available}\nKetik /buy untuk pembelian.`
      );
    }
  });

  bot.command('buy', async (ctx) => ctx.scene.enter('BUY_SCENE'));
}
