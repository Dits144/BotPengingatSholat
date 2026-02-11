import { Markup, Scenes } from 'telegraf';
import { BotContext } from '../types';
import { getProductById, listProducts } from '../../services/productService';
import { addStock } from '../../services/stockService';
import { addDuration, nowTz, parseDurationText } from '../../utils/date';

export const ADD_STOCK_SCENE = 'ADD_STOCK_SCENE';

function getWizardState(ctx: BotContext): Record<string, unknown> {
  return (ctx.wizard.state ?? {}) as Record<string, unknown>;
}

function setWizardState(ctx: BotContext, patch: Record<string, unknown>) {
  Object.assign(ctx.wizard.state, patch);
}

async function askProductSelection(ctx: BotContext) {
  const products = await listProducts();
  if (!products.length) {
    await ctx.reply('Belum ada produk. Tambah produk dulu.');
    await ctx.scene.leave();
    return false;
  }

  const keyboard = Markup.inlineKeyboard(
    products.map((p) => [Markup.button.callback(p.name, `product:${p.id}`)])
  );

  await ctx.reply('Pilih produk dari tombol berikut:', keyboard);
  return true;
}

export const addStockScene = new Scenes.WizardScene<BotContext>(
  ADD_STOCK_SCENE,
  async (ctx) => {
    ctx.wizard.state = {};
    const canContinue = await askProductSelection(ctx);
    if (!canContinue) return;
    return ctx.wizard.next();
  },
  async (ctx) => {
    if (!ctx.callbackQuery || !('data' in ctx.callbackQuery)) {
      await ctx.reply('Silakan pilih produk lewat tombol, bukan ketik manual.');
      await askProductSelection(ctx);
      return;
    }

    const data = ctx.callbackQuery.data;
    const [, rawProductId] = data.split(':');
    const productId = Number(rawProductId);

    if (!data.startsWith('product:') || !Number.isFinite(productId)) {
      await ctx.answerCbQuery();
      await ctx.reply('Produk tidak valid, pilih lagi.');
      await askProductSelection(ctx);
      return;
    }

    const product = await getProductById(productId);
    if (!product) {
      await ctx.answerCbQuery();
      await ctx.reply('Produk tidak ditemukan, pilih lagi.');
      await askProductSelection(ctx);
      return;
    }

    await ctx.answerCbQuery();
    setWizardState(ctx, { productId });
    await ctx.reply(`Produk dipilih: ${product.name}\nMasukkan email akun`);
    return ctx.wizard.next();
  },
  async (ctx) => {
    if (!ctx.message || !('text' in ctx.message)) return;
    const email = ctx.message.text.trim();
    if (!email || !email.includes('@')) {
      await ctx.reply('Format email tidak valid. Masukkan email lagi.');
      return;
    }

    setWizardState(ctx, { email });
    await ctx.reply('Masukkan password akun');
    return ctx.wizard.next();
  },
  async (ctx) => {
    if (!ctx.message || !('text' in ctx.message)) return;
    const password = ctx.message.text.trim();
    if (!password) {
      await ctx.reply('Password tidak boleh kosong. Masukkan password lagi.');
      return;
    }

    setWizardState(ctx, { password });
    await ctx.reply('Pilih metode: ketik A (durasi paket aktif saat dijual) atau B (sisa aktif sekarang)');
    return ctx.wizard.next();
  },
  async (ctx) => {
    if (!ctx.message || !('text' in ctx.message)) return;
    const method = ctx.message.text.trim().toUpperCase();

    if (!['A', 'B'].includes(method)) {
      await ctx.reply('Metode tidak valid. Ketik A atau B.');
      return;
    }

    setWizardState(ctx, { method });
    if (method === 'A') {
      await ctx.reply('Masukkan durasi paket. Contoh: 1 bulan 0 hari / 1b 5h / 30 hari');
    } else {
      await ctx.reply('Masukkan sisa aktif sekarang. Contoh: 1 bulan 5 hari / 1 bln 5 hr / 30 hari');
    }
    return ctx.wizard.next();
  },
  async (ctx) => {
    if (!ctx.message || !('text' in ctx.message) || !ctx.from) return;

    const state = getWizardState(ctx);
    const productId = Number(state.productId);

    if (!Number.isFinite(productId)) {
      await ctx.reply('Product belum dipilih. Ulangi tambah stok dan pilih produk.');
      return ctx.scene.reenter();
    }

    let months = 0;
    let days = 0;
    try {
      const parsed = parseDurationText(ctx.message.text);
      months = parsed.months;
      days = parsed.days;
    } catch {
      await ctx.reply('Format durasi tidak valid. Contoh: 1 bulan 5 hari (bisa juga: 1b 5h, 1 bln 5 hr, 30 hari).');
      return;
    }

    const method = String(state.method);
    const now = nowTz();
    let startAt: string | null = null;
    let expiresAt: string | null = null;
    let activateOnSale = false;

    if (method === 'A') {
      activateOnSale = true;
    } else {
      startAt = now.toISO();
      expiresAt = addDuration(now, months, days).toISO();
    }

    try {
      await addStock({
        actor: String(ctx.from.id),
        productId,
        email: String(state.email || ''),
        password: String(state.password || ''),
        startAt,
        expiresAt,
        activateOnSale,
        durationMonths: months,
        durationDays: days
      });
    } catch (error) {
      console.error('ADD_STOCK_FAILED', {
        actor: ctx.from.id,
        productId,
        method,
        error: error instanceof Error ? error.message : 'unknown'
      });
      await ctx.reply('Gagal menyimpan stok. Pastikan produk valid dan coba lagi.');
      return;
    }

    await ctx.reply(
      `✅ Stok berhasil ditambah\nProduk ID: ${productId}\nMetode: ${method}\nDurasi: ${months} bulan ${days} hari\nExpires: ${expiresAt || 'aktif saat dijual'}`
    );
    return ctx.scene.leave();
  }
);
