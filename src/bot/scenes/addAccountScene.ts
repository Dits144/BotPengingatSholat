import { Markup, Scenes } from 'telegraf';
import { BotContext } from '../types';
import { addAccount, availableCountByProduct } from '../../services/accountService';
import { getProductById, listProducts } from '../../services/productService';
import { addDuration, nowTz, parseDateYmdToEndOfDay, parseDurationText } from '../../utils/date';

export const ADD_ACCOUNT_SCENE = 'ADD_ACCOUNT_SCENE';

async function askProduct(ctx: BotContext) {
  const products = await listProducts();
  if (!products.length) {
    await ctx.reply('Belum ada produk. Tambah produk dulu.');
    await ctx.scene.leave();
    return false;
  }
  await ctx.reply(
    'Pilih produk:',
    Markup.inlineKeyboard(products.map((p) => [Markup.button.callback(p.name, `product:${p.id}`)]))
  );
  return true;
}

export const addAccountScene = new Scenes.WizardScene<BotContext>(
  ADD_ACCOUNT_SCENE,
  async (ctx) => {
    ctx.wizard.state = {};
    const ok = await askProduct(ctx);
    if (!ok) return;
    return ctx.wizard.next();
  },
  async (ctx) => {
    if (!ctx.callbackQuery || !('data' in ctx.callbackQuery)) {
      await ctx.reply('Pilih produk via tombol.');
      await askProduct(ctx);
      return;
    }

    const [key, rawId] = ctx.callbackQuery.data.split(':');
    const productId = Number(rawId);
    if (key !== 'product' || !Number.isFinite(productId)) {
      await ctx.answerCbQuery();
      await ctx.reply('Produk tidak valid, pilih lagi.');
      await askProduct(ctx);
      return;
    }

    const product = await getProductById(productId);
    if (!product) {
      await ctx.answerCbQuery();
      await ctx.reply('Produk tidak ditemukan, pilih lagi.');
      await askProduct(ctx);
      return;
    }

    await ctx.answerCbQuery();
    ctx.wizard.state.productId = productId;
    await ctx.reply('Masukkan email akun:');
    return ctx.wizard.next();
  },
  async (ctx) => {
    if (!ctx.message || !('text' in ctx.message)) return;
    const email = ctx.message.text.trim();
    if (!email.includes('@')) {
      await ctx.reply('Email tidak valid. Masukkan lagi.');
      return;
    }
    ctx.wizard.state.email = email;
    await ctx.reply('Masukkan password akun:');
    return ctx.wizard.next();
  },
  async (ctx) => {
    if (!ctx.message || !('text' in ctx.message)) return;
    const password = ctx.message.text.trim();
    if (!password) {
      await ctx.reply('Password tidak boleh kosong.');
      return;
    }
    ctx.wizard.state.password = password;
    await ctx.reply('Masukkan tanggal expire (YYYY-MM-DD) ATAU durasi (contoh: 30 hari / 1 bulan 5 hari).');
    return ctx.wizard.next();
  },
  async (ctx) => {
    if (!ctx.message || !('text' in ctx.message)) return;
    const text = ctx.message.text.trim();
    try {
      if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
        ctx.wizard.state.expiresAt = parseDateYmdToEndOfDay(text);
      } else {
        const dur = parseDurationText(text);
        ctx.wizard.state.expiresAt = addDuration(nowTz(), dur.months, dur.days).toISO();
      }
    } catch {
      await ctx.reply('Format tidak valid. Gunakan YYYY-MM-DD atau durasi seperti 1 bulan 5 hari.');
      return;
    }

    await ctx.reply(
      'Pilih izin penggunaan default:',
      Markup.inlineKeyboard([
        [Markup.button.callback('Bisa BELI', 'usage:buy')],
        [Markup.button.callback('Bisa SEWA', 'usage:rent')],
        [Markup.button.callback('Keduanya', 'usage:both')]
      ])
    );
    return ctx.wizard.next();
  },
  async (ctx) => {
    if (!ctx.callbackQuery || !('data' in ctx.callbackQuery) || !ctx.from) return;

    const [kind, usage] = ctx.callbackQuery.data.split(':');
    if (kind !== 'usage') {
      await ctx.answerCbQuery();
      await ctx.reply('Pilihan tidak valid, pilih tombol lagi.');
      return;
    }

    const productId = Number(ctx.wizard.state.productId);
    if (!Number.isFinite(productId)) {
      await ctx.answerCbQuery();
      await ctx.reply('Product belum dipilih. Ulangi tambah akun.');
      return ctx.scene.reenter();
    }

    const allowBuy = usage === 'buy' || usage === 'both';
    const allowRent = usage === 'rent' || usage === 'both';

    try {
      await addAccount({
        productId,
        email: String(ctx.wizard.state.email || ''),
        password: String(ctx.wizard.state.password || ''),
        expiresAt: String(ctx.wizard.state.expiresAt),
        allowBuy,
        allowRent,
        actor: String(ctx.from.id)
      });
    } catch {
      await ctx.answerCbQuery();
      await ctx.reply('Gagal menyimpan akun. Coba lagi.');
      return;
    }

    await ctx.answerCbQuery();
    const counts = await availableCountByProduct();
    const summary = counts.map((c) => `${c.name}: ${c.count}`).join('\n') || 'Belum ada stok AVAILABLE';
    await ctx.reply(`✅ Akun berhasil ditambahkan.\nStok tersedia:\n${summary}`);
    return ctx.scene.leave();
  }
);
