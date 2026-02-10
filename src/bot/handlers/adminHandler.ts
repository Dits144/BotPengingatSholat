import { Telegraf } from 'telegraf';
import { adminMenuKeyboard } from '../keyboards/adminKeyboard';
import { BotContext } from '../types';
import { adminOnly } from '../middlewares/auth';
import { listProducts } from '../../services/productService';
import { getAvailableCountByProduct, listAvailableStock, markExpiredAccounts, listSoldByProduct } from '../../services/stockService';
import { formatDate } from '../../utils/date';

export function registerAdminHandler(bot: Telegraf<BotContext>) {
  bot.command('admin', adminOnly, async (ctx) => {
    await ctx.reply('Admin menu:', adminMenuKeyboard);
  });

  bot.action('SCENE_ADD_PRODUCT', adminOnly, async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.scene.enter('ADD_PRODUCT_SCENE');
  });

  bot.action('SCENE_ADD_STOCK', adminOnly, async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.scene.enter('ADD_STOCK_SCENE');
  });

  bot.action('SCENE_EXPORT', adminOnly, async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.scene.enter('EXPORT_SCENE');
  });

  bot.action('ADMIN_LIST_PRODUCTS', adminOnly, async (ctx) => {
    await ctx.answerCbQuery();
    const products = await listProducts();
    await ctx.reply(products.map((p) => `${p.id}. ${p.name} (${p.default_duration_months} bulan ${p.default_duration_days} hari)`).join('\n') || 'Belum ada produk');
  });

  bot.action('ADMIN_AVAILABLE', adminOnly, async (ctx) => {
    await ctx.answerCbQuery();
    const counts = await getAvailableCountByProduct();
    await ctx.reply(counts.map((c) => `${c.name}: ${c.count}`).join('\n') || 'Stok kosong');
  });

  bot.action('ADMIN_SOLD', adminOnly, async (ctx) => {
    await ctx.answerCbQuery();
    const products = await listProducts();
    for (const p of products) {
      const sold = await listSoldByProduct(p.id);
      await ctx.reply(`Terjual ${p.name}: ${sold.length}`);
    }
  });

  bot.action('ADMIN_EXPIRED', adminOnly, async (ctx) => {
    await ctx.answerCbQuery();
    await markExpiredAccounts();
    await ctx.reply('Akun expired berhasil ditandai otomatis.');
  });

  bot.command('available', adminOnly, async (ctx) => {
    const productId = Number(ctx.message.text.split(' ')[1]);
    const rows = await listAvailableStock(productId);
    await ctx.reply(
      rows
        .map((r) => `#${r.id} ${r.email_encrypted} exp:${formatDate(r.expires_at)}`)
        .join('\n') || 'Kosong'
    );
  });
}
