import { Markup, Telegraf } from 'telegraf';
import { BotContext } from '../bot/types';
import { ensureAdmin, writeAudit } from './adminAuth';
import { getAdminState, setAdminState } from './adminState';
import { db } from '../config/database';
import { encrypt } from '../utils/encryption';
import { box } from '../utils/format';
import { settingsKeyboard } from './adminMenu';

export function registerAdminFlows(bot: Telegraf<BotContext>) {
  bot.on('photo', async (ctx, next) => {
    if (!ctx.from || !(await ensureAdmin(ctx))) return next();
    const state = await getAdminState(ctx.from.id);
    if (!state || state.state !== 'ADMIN_SETTINGS_QRIS_WAIT_PHOTO') return next();
    const fileId = ctx.message.photo.at(-1)?.file_id;
    if (!fileId) return;
    await upsertSetting('qris_file_id', fileId);
    await writeAudit(ctx.from.id, 'SET_QRIS_FILE', { fileId });
    await setAdminState(ctx.from.id, 'ADMIN_SETTINGS');
    await ctx.reply('✅ QRIS berhasil diperbarui.', settingsKeyboard());
  });

  bot.on('text', async (ctx, next) => {
    if (!ctx.from || !(await ensureAdmin(ctx))) return next();
    const input = ctx.message.text.trim();
    const st = await getAdminState(ctx.from.id);
    if (!st) return next();

    if (st.state === 'ADMIN_HOME') {
      const map: Record<string, string> = { A: 'dashboard', B: 'products', C: 'stock', D: 'topup', E: 'orders', F: 'rentals', G: 'users', H: 'vouchers', I: 'broadcast', J: 'settings' };
      const route = map[input.toUpperCase()];
      if (route) {
        await ctx.reply(`Mengarahkan ke menu ${input.toUpperCase()}...`, Markup.inlineKeyboard([[Markup.button.callback('Buka', `admin:${route}`)]]));
        return;
      }
    }

    if (st.state === 'ADMIN_PRODUCTS_ADD_NAME') {
      await setAdminState(ctx.from.id, 'ADMIN_PRODUCTS_ADD_DESC', { name: input });
      await ctx.reply('Masukkan deskripsi produk:');
      return;
    }
    if (st.state === 'ADMIN_PRODUCTS_ADD_DESC') {
      await setAdminState(ctx.from.id, 'ADMIN_PRODUCTS_ADD_ACTIVE', { ...st.payload, description: input });
      await ctx.reply('Aktifkan produk? ketik: 1 (aktif) / 0 (nonaktif)');
      return;
    }
    if (st.state === 'ADMIN_PRODUCTS_ADD_ACTIVE') {
      const active = input === '1' ? 1 : 0;
      const [id] = await db('products').insert({ name: st.payload.name, description: st.payload.description, active, created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
      await writeAudit(ctx.from.id, 'ADD_PRODUCT', { id, name: st.payload.name });
      await setAdminState(ctx.from.id, 'ADMIN_PRODUCTS');
      await ctx.reply(`✅ Produk berhasil ditambah. ID: ${id}`);
      return;
    }

    if (st.state === 'ADMIN_VARIANTS_ADD_PRODUCT') {
      await setAdminState(ctx.from.id, 'ADMIN_VARIANTS_ADD_NAME', { product_id: Number(input) });
      await ctx.reply('Masukkan nama variasi:');
      return;
    }
    if (st.state === 'ADMIN_VARIANTS_ADD_NAME') {
      await setAdminState(ctx.from.id, 'ADMIN_VARIANTS_ADD_PRICE', { ...st.payload, name: input });
      await ctx.reply('Masukkan harga (angka rupiah):');
      return;
    }
    if (st.state === 'ADMIN_VARIANTS_ADD_PRICE') {
      if (st.payload.edit_mode && st.payload.id) {
        await db('variants').where({ id: st.payload.id }).update({ price: Number(input), updated_at: new Date().toISOString() });
        await writeAudit(ctx.from.id, 'EDIT_VARIANT_PRICE', { id: st.payload.id, price: Number(input) });
        await setAdminState(ctx.from.id, 'ADMIN_PRODUCTS');
        await ctx.reply('✅ Harga variasi diperbarui.');
        return;
      }
      await setAdminState(ctx.from.id, 'ADMIN_VARIANTS_ADD_TYPE', { ...st.payload, price: Number(input) });
      await ctx.reply('Tipe variasi? ketik BUY atau RENT');
      return;
    }
    if (st.state === 'ADMIN_VARIANTS_ADD_TYPE') {
      const type = input.toUpperCase() === 'RENT' ? 'RENT' : 'BUY';
      await setAdminState(ctx.from.id, 'ADMIN_VARIANTS_ADD_DURATION', { ...st.payload, stock_type: type });
      await ctx.reply('Masukkan durasi hari (0 jika BUY):');
      return;
    }
    if (st.state === 'ADMIN_VARIANTS_ADD_DURATION') {
      await setAdminState(ctx.from.id, 'ADMIN_VARIANTS_ADD_MAXQTY', { ...st.payload, duration_days: Number(input || '0') });
      await ctx.reply('Masukkan max qty per checkout:');
      return;
    }
    if (st.state === 'ADMIN_VARIANTS_ADD_MAXQTY') {
      const data = { ...st.payload, max_qty: Number(input || '1') };
      const [id] = await db('variants').insert({ ...data, active: 1, created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
      await writeAudit(ctx.from.id, 'ADD_VARIANT', { id, ...data });
      await setAdminState(ctx.from.id, 'ADMIN_PRODUCTS');
      await ctx.reply(`✅ Variasi berhasil dibuat. ID: ${id}`);
      return;
    }

    if (st.state === 'ADMIN_STOCK_ADD_VARIANT') {
      await setAdminState(ctx.from.id, 'ADMIN_STOCK_ADD_MODE', { variant_id: Number(input) });
      await ctx.reply('Pilih mode input: ketik SINGLE atau BULK');
      return;
    }
    if (st.state === 'ADMIN_STOCK_ADD_MODE') {
      const mode = input.toUpperCase() === 'BULK' ? 'BULK' : 'SINGLE';
      await setAdminState(ctx.from.id, 'ADMIN_STOCK_ADD_PAYLOAD', { ...st.payload, mode });
      await ctx.reply(mode === 'SINGLE' ? 'Kirim format: email|password|note' : 'Kirim banyak baris: email|password|note(optional)');
      return;
    }
    if (st.state === 'ADMIN_STOCK_ADD_PAYLOAD') {
      const lines = input.split('\n').filter(Boolean);
      for (const line of lines) {
        const [email, password, note] = line.split('|');
        if (!email || !password) continue;
        const payload = encrypt(`${email}|${password}`);
        await db('stock_items').insert({ variant_id: st.payload.variant_id, encrypted_payload: payload, label: note || null, status: 'AVAILABLE', created_at: new Date().toISOString() });
      }
      await writeAudit(ctx.from.id, 'ADD_STOCK', { variant_id: st.payload.variant_id, count: lines.length });
      await setAdminState(ctx.from.id, 'ADMIN_STOCK');
      await ctx.reply(`✅ Stock berhasil ditambahkan: ${lines.length} item.`);
      return;
    }

    if (st.state === 'ADMIN_USERS_ADJUST') {
      const [userIdRaw, nominalRaw, ...reasonArr] = input.split('|');
      const userId = Number(userIdRaw);
      const nominal = Number(nominalRaw);
      const reason = reasonArr.join('|') || 'adjust by admin';
      await db('users').where({ id: userId }).increment('balance', nominal);
      await writeAudit(ctx.from.id, 'ADJUST_BALANCE', { userId, nominal, reason });
      await ctx.reply('✅ Saldo user diperbarui.');
      return;
    }

    if (st.state === 'ADMIN_USERS_BLACKLIST') {
      const userId = Number(input);
      await db('users').where({ id: userId }).update({ blacklisted: 1 });
      await writeAudit(ctx.from.id, 'BLACKLIST_USER', { userId });
      await ctx.reply('✅ User masuk blacklist.');
      return;
    }

    if (st.state === 'ADMIN_VOUCHERS_ADD') {
      const [code, type, value, expiry, maxUse] = input.split('|');
      await db('vouchers').insert({ code, type, value: Number(value), expiry: expiry || null, max_use: Number(maxUse || '1'), used_count: 0, active: 1, created_at: new Date().toISOString() });
      await writeAudit(ctx.from.id, 'ADD_VOUCHER', { code });
      await ctx.reply('✅ Voucher dibuat.');
      return;
    }

    if (st.state === 'ADMIN_BROADCAST_WAIT') {
      const users = await db('users').select('id');
      let sent = 0;
      for (const u of users) {
        try { await ctx.telegram.sendMessage(u.id, input); sent += 1; } catch {}
        await new Promise((r) => setTimeout(r, 80));
      }
      await writeAudit(ctx.from.id, 'BROADCAST_ALL', { sent });
      await setAdminState(ctx.from.id, 'ADMIN_BROADCAST');
      await ctx.reply(`✅ Broadcast terkirim ke ${sent} user.`);
      return;
    }

    if (st.state === 'ADMIN_SETTINGS_TOPUP') {
      await upsertSetting('topup_presets', input);
      await writeAudit(ctx.from.id, 'SET_TOPUP_PRESETS', { value: input });
      await setAdminState(ctx.from.id, 'ADMIN_SETTINGS');
      await ctx.reply('✅ Nominal topup diperbarui.', settingsKeyboard());
      return;
    }

    if (st.state === 'ADMIN_SETTINGS_THRESHOLD') {
      await upsertSetting('low_stock_threshold', String(Number(input || '5')));
      await writeAudit(ctx.from.id, 'SET_LOW_STOCK_THRESHOLD', { value: Number(input || '5') });
      await setAdminState(ctx.from.id, 'ADMIN_SETTINGS');
      await ctx.reply('✅ Threshold stok menipis diperbarui.', settingsKeyboard());
      return;
    }

    if (st.state === 'ADMIN_RENTALS' && input.startsWith('extend|')) {
      const [, rentalId, days] = input.split('|');
      await db('rentals').where({ id: Number(rentalId) }).update({ end_at: db.raw(`datetime(end_at, '+${Number(days)} day')`) });
      await writeAudit(ctx.from.id, 'EXTEND_RENTAL', { rentalId: Number(rentalId), days: Number(days) });
      await ctx.reply('✅ Rental diperpanjang.');
      return;
    }

    return next();
  });
}

async function upsertSetting(key: string, value: string) {
  const row = await db('settings').where({ key }).first();
  if (row) await db('settings').where({ key }).update({ value, updated_at: new Date().toISOString() });
  else await db('settings').insert({ key, value, updated_at: new Date().toISOString() });
}

export async function getSetting(key: string) {
  return (await db('settings').where({ key }).first())?.value as string | undefined;
}

export function topupActionBox(name: string, username: string, userId: number, amount: number, code: string) {
  return box('TOPUP PENDING', [
    `Nama: ${name}`,
    `Username: @${username || '-'}`,
    `ID: ${userId}`,
    `Nominal: Rp ${Number(amount).toLocaleString('id-ID')}`,
    `ID Topup: ${code}`
  ]);
}
