import { Markup, Scenes } from 'telegraf';
import { BotContext } from '../types';
import { createProduct } from '../../services/productService';
import { logActivity } from '../../services/logService';

export const ADD_PRODUCT_SCENE = 'ADD_PRODUCT_SCENE';

export const addProductScene = new Scenes.WizardScene<BotContext>(
  ADD_PRODUCT_SCENE,
  async (ctx) => {
    ctx.session.temp = {};
    await ctx.reply('Masukkan nama produk (contoh: CAPCUT PRO)');
    return ctx.wizard.next();
  },
  async (ctx) => {
    if (!ctx.message || !('text' in ctx.message)) return;
    ctx.session.temp = { ...ctx.session.temp, name: ctx.message.text.trim() };
    await ctx.reply('Durasi default produk? Format: "1 bulan 0 hari" atau "30 hari"');
    return ctx.wizard.next();
  },
  async (ctx) => {
    if (!ctx.message || !('text' in ctx.message)) return;
    const text = ctx.message.text.toLowerCase();
    const mm = text.match(/(\d+)\s*bulan/);
    const dd = text.match(/(\d+)\s*hari/);
    const months = mm ? Number(mm[1]) : 0;
    const days = dd ? Number(dd[1]) : 0;
    ctx.session.temp = { ...ctx.session.temp, months, days };
    await ctx.reply('Catatan produk (atau ketik "-" jika kosong)');
    return ctx.wizard.next();
  },
  async (ctx) => {
    if (!ctx.message || !('text' in ctx.message) || !ctx.from) return;
    const note = ctx.message.text.trim();
    const temp = ctx.session.temp || {};
    await createProduct({
      name: String(temp.name),
      defaultDurationMonths: Number(temp.months || 0),
      defaultDurationDays: Number(temp.days || 0),
      note: note === '-' ? '' : note
    });
    await logActivity('EDIT', String(ctx.from.id), { createProduct: temp.name });
    await ctx.reply('✅ Produk berhasil ditambahkan.', Markup.removeKeyboard());
    return ctx.scene.leave();
  }
);
