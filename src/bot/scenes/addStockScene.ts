import { Scenes } from 'telegraf';
import { BotContext } from '../types';
import { listProducts } from '../../services/productService';
import { addStock } from '../../services/stockService';
import { addDuration, nowTz, parseDurationText } from '../../utils/date';

export const ADD_STOCK_SCENE = 'ADD_STOCK_SCENE';

export const addStockScene = new Scenes.WizardScene<BotContext>(
  ADD_STOCK_SCENE,
  async (ctx) => {
    const products = await listProducts();
    if (!products.length) {
      await ctx.reply('Belum ada produk. Tambah produk dulu.');
      return ctx.scene.leave();
    }
    ctx.session.temp = {};
    const lines = products.map((p) => `${p.id}. ${p.name}`).join('\n');
    await ctx.reply(`Pilih produk dengan kirim ID:\n${lines}`);
    return ctx.wizard.next();
  },
  async (ctx) => {
    if (!ctx.message || !('text' in ctx.message)) return;
    ctx.session.temp = { ...ctx.session.temp, productId: Number(ctx.message.text.trim()) };
    await ctx.reply('Masukkan email akun');
    return ctx.wizard.next();
  },
  async (ctx) => {
    if (!ctx.message || !('text' in ctx.message)) return;
    ctx.session.temp = { ...ctx.session.temp, email: ctx.message.text.trim() };
    await ctx.reply('Masukkan password akun');
    return ctx.wizard.next();
  },
  async (ctx) => {
    if (!ctx.message || !('text' in ctx.message)) return;
    ctx.session.temp = { ...ctx.session.temp, password: ctx.message.text.trim() };
    await ctx.reply('Pilih metode: ketik A (durasi paket aktif saat dijual) atau B (sisa aktif sekarang)');
    return ctx.wizard.next();
  },
  async (ctx) => {
    if (!ctx.message || !('text' in ctx.message)) return;
    const method = ctx.message.text.trim().toUpperCase();
    ctx.session.temp = { ...ctx.session.temp, method };
    if (method === 'A') {
      await ctx.reply('Masukkan durasi paket. Contoh: 1 bulan 0 hari. (opsional custom start: YYYY-MM-DD HH:mm)');
    } else {
      await ctx.reply('Masukkan sisa aktif sekarang. Contoh: 1 bulan 5 hari');
    }
    return ctx.wizard.next();
  },
  async (ctx) => {
    if (!ctx.message || !('text' in ctx.message) || !ctx.from) return;
    const temp = ctx.session.temp || {};
    const method = String(temp.method);
    const { months, days } = parseDurationText(ctx.message.text);

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

    await addStock({
      actor: String(ctx.from.id),
      productId: Number(temp.productId),
      email: String(temp.email),
      password: String(temp.password),
      startAt,
      expiresAt,
      activateOnSale,
      durationMonths: months,
      durationDays: days
    });

    await ctx.reply(
      `✅ Stok berhasil ditambah\nProduk ID: ${temp.productId}\nEmail: ${temp.email}\nMetode: ${method}\nExpires: ${expiresAt || 'aktif saat dijual'}`
    );
    return ctx.scene.leave();
  }
);
