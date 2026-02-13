import { Markup, Scenes } from 'telegraf';
import { BotContext } from '../types';
import { listProducts } from '../../services/productService';
import { buyAccounts } from '../../services/saleService';

export const BUY_SCENE = 'BUY_SCENE';

export const buyScene = new Scenes.WizardScene<BotContext>(
  BUY_SCENE,
  async (ctx) => {
    const products = await listProducts();
    if (!products.length) {
      await ctx.reply('Produk belum tersedia.');
      return ctx.scene.leave();
    }

    await ctx.reply(
      'Pilih produk untuk beli:',
      Markup.inlineKeyboard(products.map((p) => [Markup.button.callback(p.name, `buy_product:${p.id}`)]))
    );
    return ctx.wizard.next();
  },
  async (ctx) => {
    if (!ctx.callbackQuery || !('data' in ctx.callbackQuery)) return;

    const [key, rawId] = ctx.callbackQuery.data.split(':');
    const productId = Number(rawId);
    if (key !== 'buy_product' || !Number.isFinite(productId)) {
      await ctx.answerCbQuery();
      await ctx.reply('Produk tidak valid, pilih lagi.');
      return;
    }

    ctx.wizard.state.productId = productId;
    await ctx.answerCbQuery();
    await ctx.reply('Masukkan qty (1/2/3):');
    return ctx.wizard.next();
  },
  async (ctx) => {
    if (!ctx.message || !('text' in ctx.message) || !ctx.from) return;
    const qty = Number(ctx.message.text.trim());
    if (!Number.isInteger(qty) || qty < 1 || qty > 3) {
      await ctx.reply('Qty harus integer 1, 2, atau 3.');
      return;
    }

    const result = await buyAccounts({
      productId: Number(ctx.wizard.state.productId),
      qty,
      userId: ctx.from.id
    });

    if (!result.ok) {
      await ctx.reply(`❌ ${result.message}`);
      return ctx.scene.leave();
    }

    for (const item of result.items) {
      await ctx.reply(
        `✅ Pembelian berhasil\nAkun: #${item.accountId}\nEmail: ${item.email}\nPassword: ${item.password}\nExpires: ${item.expiresAt}`
      );
    }

    return ctx.scene.leave();
  }
);
