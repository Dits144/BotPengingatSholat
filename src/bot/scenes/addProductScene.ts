import { Scenes } from 'telegraf';
import { BotContext } from '../types';
import { createProduct } from '../../services/productService';

export const ADD_PRODUCT_SCENE = 'ADD_PRODUCT_SCENE';

export const addProductScene = new Scenes.WizardScene<BotContext>(
  ADD_PRODUCT_SCENE,
  async (ctx) => {
    ctx.wizard.state = {};
    await ctx.reply('Masukkan nama produk:');
    return ctx.wizard.next();
  },
  async (ctx) => {
    if (!ctx.message || !("text" in ctx.message) || !ctx.from) return;
    const name = ctx.message.text.trim();
    if (!name) {
      await ctx.reply('Nama produk wajib diisi.');
      return;
    }

    ctx.wizard.state.name = name;
    await ctx.reply('Masukkan deskripsi (atau ketik - jika kosong):');
    return ctx.wizard.next();
  },
  async (ctx) => {
    if (!ctx.message || !("text" in ctx.message) || !ctx.from) return;
    const description = ctx.message.text.trim();
    try {
      await createProduct({
        name: String(ctx.wizard.state.name),
        description: description === '-' ? '' : description,
        actor: String(ctx.from.id)
      });
      await ctx.reply('✅ Produk berhasil ditambahkan.');
    } catch {
      await ctx.reply('Gagal tambah produk (mungkin nama sudah ada).');
    }
    return ctx.scene.leave();
  }
);
