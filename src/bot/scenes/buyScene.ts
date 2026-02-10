import { Scenes } from 'telegraf';
import { BotContext } from '../types';
import { getProductCard, sellStock } from '../../services/stockService';
import { listProducts } from '../../services/productService';
import { formatDate } from '../../utils/date';

export const BUY_SCENE = 'BUY_SCENE';

export const buyScene = new Scenes.WizardScene<BotContext>(
  BUY_SCENE,
  async (ctx) => {
    const products = await listProducts();
    if (!products.length) {
      await ctx.reply('Produk belum tersedia.');
      return ctx.scene.leave();
    }
    const msg = products.map((p) => `${p.id}. ${p.name}`).join('\n');
    await ctx.reply(`Pilih ID produk:\n${msg}`);
    ctx.session.temp = {};
    return ctx.wizard.next();
  },
  async (ctx) => {
    if (!ctx.message || !('text' in ctx.message)) return;
    const productId = Number(ctx.message.text.trim());
    const card = await getProductCard(productId);
    if (!card.product) {
      await ctx.reply('Produk tidak valid.');
      return ctx.scene.leave();
    }
    ctx.session.temp = { productId };
    await ctx.reply(`Qty pembelian? (1/2/3)\nStok tersedia: ${card.available}`);
    return ctx.wizard.next();
  },
  async (ctx) => {
    if (!ctx.message || !('text' in ctx.message) || !ctx.from) return;
    const qty = Number(ctx.message.text.trim());
    const productId = Number(ctx.session.temp?.productId);
    const result = await sellStock({
      productId,
      qty,
      buyer: `${ctx.from.id}:${ctx.from.username || ''}`,
      actor: String(ctx.from.id)
    });
    if (!result.ok) {
      await ctx.reply(`❌ Stok kurang. Tersedia ${result.available}`);
      return ctx.scene.leave();
    }

    for (const item of result.items) {
      await ctx.reply(
        [
          '✅ Akun berhasil dikeluarkan',
          `Produk: ${productId}`,
          `Email: ${item.email}`,
          `Password: ${item.password}`,
          `Mulai aktif: ${formatDate(item.startAt)}`,
          `Habis pada: ${formatDate(item.expiresAt)}`,
          `Catatan: ${item.note || '-'}`
        ].join('\n')
      );
    }

    return ctx.scene.leave();
  }
);
