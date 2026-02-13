import { Markup, Telegraf } from 'telegraf';
import { BotContext } from '../types';
import { adminMenuKeyboard } from '../keyboards/adminKeyboard';
import { adminOnly } from '../middlewares/auth';
import { availableCountByProduct, listAccountsByProduct, listEndedOrExpiredAccounts, returnAccountToAvailable } from '../../services/accountService';
import { listProducts } from '../../services/productService';
import { listActiveRentalsAdmin } from '../../services/rentalService';
import { listRecentSales } from '../../services/saleService';

export function registerAdminHandler(bot: Telegraf<BotContext>) {
  bot.command('admin', adminOnly, async (ctx) => {
    await ctx.reply('Admin menu:', adminMenuKeyboard);
  });

  bot.action('SCENE_ADD_PRODUCT', adminOnly, async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.scene.enter('ADD_PRODUCT_SCENE');
  });

  bot.action('SCENE_ADD_ACCOUNT', adminOnly, async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.scene.enter('ADD_ACCOUNT_SCENE');
  });

  bot.action('ADMIN_AVAILABLE', adminOnly, async (ctx) => {
    await ctx.answerCbQuery();
    const counts = await availableCountByProduct();
    if (!counts.length) {
      await ctx.reply('Tidak ada stok AVAILABLE.');
      return;
    }

    await ctx.reply(
      'Pilih produk untuk lihat detail akun:',
      Markup.inlineKeyboard(counts.map((c) => [Markup.button.callback(`${c.name} (${c.count})`, `admin_product:${c.id}`)]))
    );
  });

  bot.action(/admin_product:(\d+)/, adminOnly, async (ctx) => {
    const productId = Number(ctx.match[1]);
    await ctx.answerCbQuery();
    const rows = await listAccountsByProduct(productId);
    await ctx.reply(rows.map((r) => `#${r.id} ${r.emailMasked} | ${r.status} | exp:${r.expiresAt}`).join('\n') || 'Kosong');
  });

  bot.action('ADMIN_ACTIVE', adminOnly, async (ctx) => {
    await ctx.answerCbQuery();
    const products = await listProducts();
    if (!products.length) {
      await ctx.reply('Belum ada produk.');
      return;
    }

    const activeRent = await listActiveRentalsAdmin();
    const sales = await listRecentSales();

    const soldMsg = sales.length
      ? sales.map((s) => `SOLD #${s.account_id} ${s.product_name} ke user:${s.user_id} at ${s.sold_at}`).join('\n')
      : 'Tidak ada data SOLD.';

    const rentMsg = activeRent.length
      ? activeRent
          .map((r) => `RENT #${r.rentalId} ${r.productName} user:${r.userId} mulai:${r.startAt} akhir:${r.endAt} sisa:${r.countdown}`)
          .join('\n')
      : 'Tidak ada RENTED aktif.';

    await ctx.reply(`📦 SOLD\n${soldMsg}\n\n🕒 RENTED AKTIF\n${rentMsg}`);
  });

  bot.action('ADMIN_ENDED', adminOnly, async (ctx) => {
    await ctx.answerCbQuery();
    const rows = await listEndedOrExpiredAccounts();
    if (!rows.length) {
      await ctx.reply('Tidak ada akun RENT_EXPIRED/EXPIRED.');
      return;
    }
    await ctx.reply(
      rows.map((r) => `#${r.id} product:${r.productId} ${r.emailMasked} ${r.status} exp:${r.expiresAt}`).join('\n')
    );

    await ctx.reply('Kembalikan akun ke AVAILABLE?', Markup.inlineKeyboard(rows.slice(0, 10).map((r) => [Markup.button.callback(`#${r.id}`, `return_available:${r.id}`)])));
  });

  bot.action(/return_available:(\d+)/, adminOnly, async (ctx) => {
    if (!ctx.from) return;
    const accountId = Number(ctx.match[1]);
    await returnAccountToAvailable(accountId, String(ctx.from.id));
    await ctx.answerCbQuery('Dikembalikan ke AVAILABLE');
    await ctx.reply(`Akun #${accountId} status menjadi AVAILABLE.`);
  });
}
