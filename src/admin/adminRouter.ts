import { Markup, Telegraf } from 'telegraf';
import { BotContext } from '../bot/types';
import { db } from '../config/database';
import { ensureAdmin, writeAudit } from './adminAuth';
import { backHomeKeyboard, formatInvoiceDetail, ordersKeyboard, productsKeyboard, renderAdminHome, renderDashboard, rentalsKeyboard, settingsKeyboard, stockKeyboard, topupKeyboard, topupPendingActions, usersKeyboard, vouchersKeyboard, broadcastKeyboard } from './adminMenu';
import { getAdminState, setAdminState } from './adminState';
import { box, rp } from '../utils/format';
import { getSetting } from './adminFlows';
import { getTopupByCode, setTopupStatus } from '../services/storeService';
import { decrypt } from '../utils/encryption';

export function registerAdminRouter(bot: Telegraf<BotContext>) {
  bot.command('admin', async (ctx) => {
    if (!(await ensureAdmin(ctx))) return;
    await setAdminState(ctx.from!.id, 'ADMIN_HOME');
    const data = await renderAdminHome();
    await writeAudit(ctx.from!.id, 'OPEN_ADMIN_HOME');
    await ctx.reply(data.text, data.keyboard);
  });

  bot.action('admin:home', async (ctx) => {
    if (!(await ensureAdmin(ctx))) return;
    await ctx.answerCbQuery();
    await setAdminState(ctx.from!.id, 'ADMIN_HOME');
    const data = await renderAdminHome();
    await writeAudit(ctx.from!.id, 'ADMIN_HOME');
    await ctx.reply(data.text, data.keyboard);
  });

  bot.action('admin:refresh', async (ctx) => {
    if (!(await ensureAdmin(ctx))) return;
    await ctx.answerCbQuery('Refreshed');
    const data = await renderAdminHome();
    await ctx.reply(data.text, data.keyboard);
  });

  bot.action('admin:dashboard', async (ctx) => {
    if (!(await ensureAdmin(ctx))) return;
    await ctx.answerCbQuery();
    await setAdminState(ctx.from!.id, 'ADMIN_DASHBOARD');
    await writeAudit(ctx.from!.id, 'ADMIN_DASHBOARD');
    const data = await renderDashboard();
    await ctx.reply(data.text, data.keyboard);
  });

  bot.action('admin:products', async (ctx) => {
    if (!(await ensureAdmin(ctx))) return;
    await ctx.answerCbQuery();
    await setAdminState(ctx.from!.id, 'ADMIN_PRODUCTS');
    await writeAudit(ctx.from!.id, 'ADMIN_PRODUCTS');
    await ctx.reply(box('PRODUK & VARIASI', ['Kelola produk dan variasi.']), productsKeyboard());
  });

  bot.action('admin:products:add', async (ctx) => {
    if (!(await ensureAdmin(ctx))) return;
    await ctx.answerCbQuery();
    await setAdminState(ctx.from!.id, 'ADMIN_PRODUCTS_ADD_NAME');
    await ctx.reply('Masukkan nama produk:');
  });

  bot.action(/admin:products:list:(\d+)/, async (ctx) => {
    if (!(await ensureAdmin(ctx))) return;
    await ctx.answerCbQuery();
    const page = Number(ctx.match[1]);
    const per = 10;
    const rows = await db('products').orderBy('id', 'desc').offset((page - 1) * per).limit(per);
    const lines = rows.map((r: any) => `${r.id}. ${r.name} [${r.active ? 'AKTIF' : 'NONAKTIF'}]`);
    const kbRows = rows.map((r: any) => [Markup.button.callback(`${r.active ? 'Nonaktifkan' : 'Aktifkan'} #${r.id}`, `admin:products:toggle:${r.id}`)]);
    kbRows.push([Markup.button.callback('⬅️ Back', 'admin:products')]);
    await ctx.reply(box('LIST PRODUK', lines.length ? lines : ['Kosong']), Markup.inlineKeyboard(kbRows));
  });

  bot.action(/admin:products:toggle:(\d+)/, async (ctx) => {
    if (!(await ensureAdmin(ctx))) return;
    const id = Number(ctx.match[1]);
    const row = await db('products').where({ id }).first();
    await db('products').where({ id }).update({ active: row.active ? 0 : 1, updated_at: new Date().toISOString() });
    await writeAudit(ctx.from!.id, 'TOGGLE_PRODUCT', { id, active: !row.active });
    await ctx.answerCbQuery('Status produk diubah');
  });

  bot.action('admin:variants:add', async (ctx) => {
    if (!(await ensureAdmin(ctx))) return;
    await ctx.answerCbQuery();
    await setAdminState(ctx.from!.id, 'ADMIN_VARIANTS_ADD_PRODUCT');
    await ctx.reply('Masukkan product_id untuk variasi baru:');
  });

  bot.action(/admin:variants:list:(\d+)/, async (ctx) => {
    if (!(await ensureAdmin(ctx))) return;
    await ctx.answerCbQuery();
    const rows = await db('variants').orderBy('id', 'desc').limit(10);
    const lines = rows.map((v: any) => `${v.id}. P${v.product_id} ${v.name} - ${rp(v.price)} [${v.active ? 'AKTIF' : 'OFF'}]`);
    const kbRows = rows.map((v: any) => [Markup.button.callback(`Edit Harga #${v.id}`, `admin:variants:price:${v.id}`), Markup.button.callback(`${v.active ? 'OFF' : 'ON'} #${v.id}`, `admin:variants:toggle:${v.id}`)]);
    kbRows.push([Markup.button.callback('⬅️ Back', 'admin:products')]);
    await ctx.reply(box('LIST VARIASI', lines.length ? lines : ['Kosong']), Markup.inlineKeyboard(kbRows));
  });

  bot.action(/admin:variants:toggle:(\d+)/, async (ctx) => {
    if (!(await ensureAdmin(ctx))) return;
    const id = Number(ctx.match[1]);
    const v = await db('variants').where({ id }).first();
    await db('variants').where({ id }).update({ active: v.active ? 0 : 1, updated_at: new Date().toISOString() });
    await writeAudit(ctx.from!.id, 'TOGGLE_VARIANT', { id, active: !v.active });
    await ctx.answerCbQuery('Status variasi diubah');
  });
  bot.action(/admin:variants:price:(\d+)/, async (ctx) => {
    if (!(await ensureAdmin(ctx))) return;
    await ctx.answerCbQuery();
    await setAdminState(ctx.from!.id, 'ADMIN_VARIANTS_ADD_PRICE', { id: Number(ctx.match[1]), edit_mode: true });
    await ctx.reply('Masukkan harga baru:');
  });

  bot.action('admin:stock', async (ctx) => { if (!(await ensureAdmin(ctx))) return; await ctx.answerCbQuery(); await setAdminState(ctx.from!.id, 'ADMIN_STOCK'); await ctx.reply(box('STOK', ['Kelola stok varian.']), stockKeyboard()); });
  bot.action('admin:stock:add', async (ctx) => { if (!(await ensureAdmin(ctx))) return; await ctx.answerCbQuery(); await setAdminState(ctx.from!.id, 'ADMIN_STOCK_ADD_VARIANT'); await ctx.reply('Masukkan variant_id:'); });
  bot.action(/admin:stock:list:(\d+)/, async (ctx) => {
    if (!(await ensureAdmin(ctx))) return; await ctx.answerCbQuery();
    const rows = await db('stock_items').select('variant_id').count<{ count: number }[]>({ count: '*' }).where({ status: 'AVAILABLE' }).groupBy('variant_id').orderBy('variant_id').limit(20);
    await ctx.reply(box('STOK TERSEDIA', rows.length ? rows.map((r: any) => `Variant ${r.variant_id}: ${r.count}`) : ['Kosong']), backHomeKeyboard);
  });
  bot.action('admin:stock:low', async (ctx) => {
    if (!(await ensureAdmin(ctx))) return; await ctx.answerCbQuery();
    const threshold = Number((await getSetting('low_stock_threshold')) || 5);
    const rows = await db('variants as v').leftJoin('stock_items as s', function () { this.on('s.variant_id', '=', 'v.id').andOn('s.status', '=', db.raw("'AVAILABLE'")); }).groupBy('v.id').select('v.id', 'v.name').count<{ count: number }[]>({ count: 's.id' });
    const low = rows.filter((r) => Number(r.count || 0) < threshold);
    await ctx.reply(box('STOK MENIPIS', low.length ? low.map((r: any) => `#${r.id} ${r.name}: ${r.count}`) : ['Aman']), backHomeKeyboard);
  });

  bot.action('admin:topup', async (ctx) => { if (!(await ensureAdmin(ctx))) return; await ctx.answerCbQuery(); await setAdminState(ctx.from!.id, 'ADMIN_TOPUP'); await ctx.reply(box('TOPUP', ['Kelola topup pending & riwayat.']), topupKeyboard()); });
  bot.action(/admin:topup:pending:(\d+)/, async (ctx) => {
    if (!(await ensureAdmin(ctx))) return; await ctx.answerCbQuery();
    const rows = await db('topups').where({ status: 'PENDING' }).orderBy('id', 'desc').limit(10);
    if (!rows.length) return void ctx.reply('Tidak ada topup pending.');
    for (const t of rows) {
      await ctx.reply(box('TOPUP PENDING', [`ID: ${t.topup_code}`, `User: ${t.user_id}`, `Nominal: ${rp(t.amount)}`]), topupPendingActions(t.topup_code));
    }
  });
  bot.action(/admin:topup:approve:(.+)/, async (ctx) => {
    if (!(await ensureAdmin(ctx))) return; const code = ctx.match[1];
    await setTopupStatus(code, 'APPROVED', ctx.from!.id);
    const topup = await getTopupByCode(code);
    if (topup) {
      const user = await db('users').where({ id: topup.user_id }).first();
      await ctx.telegram.sendMessage(topup.user_id, box('TOP-UP SALDO BERHASIL ✅', [`ID Transaksi: ${topup.topup_code}`, `Nominal: ${rp(topup.amount)}`, `Saldo saat ini: ${rp(user?.balance || 0)}`]));
    }
    await writeAudit(ctx.from!.id, 'APPROVE_TOPUP', { code });
    await ctx.answerCbQuery('Approved');
  });
  bot.action(/admin:topup:reject:(.+)/, async (ctx) => {
    if (!(await ensureAdmin(ctx))) return; const code = ctx.match[1];
    await setTopupStatus(code, 'REJECTED', ctx.from!.id, 'Ditolak admin');
    const topup = await getTopupByCode(code);
    if (topup) await ctx.telegram.sendMessage(topup.user_id, `Topup ${code} ditolak admin.`);
    await writeAudit(ctx.from!.id, 'REJECT_TOPUP', { code });
    await ctx.answerCbQuery('Rejected');
  });
  bot.action(/admin:topup:history:(\d+)/, async (ctx) => {
    if (!(await ensureAdmin(ctx))) return; await ctx.answerCbQuery();
    const rows = await db('topups').whereNot({ status: 'PENDING' }).orderBy('id', 'desc').limit(20);
    await ctx.reply(box('RIWAYAT TOPUP', rows.length ? rows.map((r: any) => `${r.topup_code} - ${r.status} - ${rp(r.amount)}`) : ['Belum ada riwayat']), backHomeKeyboard);
  });
  bot.action('admin:topup:search', async (ctx) => { if (!(await ensureAdmin(ctx))) return; await ctx.answerCbQuery(); await ctx.reply('Ketik kode topup untuk pencarian (fitur minimal).'); });

  bot.action('admin:orders', async (ctx) => { if (!(await ensureAdmin(ctx))) return; await ctx.answerCbQuery(); await setAdminState(ctx.from!.id, 'ADMIN_ORDERS'); await ctx.reply(box('PESANAN', ['Kelola invoice.']), ordersKeyboard()); });
  bot.action(/admin:orders:list:(\d+)/, async (ctx) => {
    if (!(await ensureAdmin(ctx))) return; await ctx.answerCbQuery();
    const rows = await db('invoices').orderBy('id', 'desc').limit(20);
    const kb = rows.map((r: any) => [Markup.button.callback(`${r.invoice_code} (${rp(r.total)})`, `admin:orders:detail:${r.id}`)]);
    kb.push([Markup.button.callback('⬅️ Back', 'admin:orders')]);
    await ctx.reply(box('PESANAN TERBARU', rows.map((r: any) => `${r.invoice_code} - ${r.user_id}`)), Markup.inlineKeyboard(kb));
  });
  bot.action(/admin:orders:detail:(\d+)/, async (ctx) => {
    if (!(await ensureAdmin(ctx))) return; await ctx.answerCbQuery();
    const id = Number(ctx.match[1]);
    const inv = await db('invoices').where({ id }).first();
    const items = await db('invoice_items').where({ invoice_id: id });
    await ctx.reply(formatInvoiceDetail(inv, items), Markup.inlineKeyboard([[Markup.button.callback('📤 Resend Akun', `admin:orders:resend:${id}`), Markup.button.callback('⬅️ Back', 'admin:orders')]]));
  });
  bot.action('admin:orders:search', async (ctx) => { if (!(await ensureAdmin(ctx))) return; await ctx.answerCbQuery(); await ctx.reply('Ketik invoice_code untuk cari invoice.'); });
  bot.action('admin:orders:resend', async (ctx) => { if (!(await ensureAdmin(ctx))) return; await ctx.answerCbQuery(); await ctx.reply('Ketik invoice_id untuk resend akun.'); });
  bot.action(/admin:orders:resend:(\d+)/, async (ctx) => {
    if (!(await ensureAdmin(ctx))) return; await ctx.answerCbQuery();
    const invId = Number(ctx.match[1]);
    const inv = await db('invoices').where({ id: invId }).first();
    const items = await db('stock_items').where({ invoice_id: invId });
    await ctx.telegram.sendMessage(inv.user_id, `📤 Resend akun untuk ${inv.invoice_code}\n${items.map((i: any) => decrypt(i.encrypted_payload)).join('\n')}`);
    await writeAudit(ctx.from!.id, 'RESEND_ACCOUNT', { invId });
    await ctx.reply('✅ Akun dikirim ulang ke user.');
  });

  bot.action('admin:rentals', async (ctx) => { if (!(await ensureAdmin(ctx))) return; await ctx.answerCbQuery(); await setAdminState(ctx.from!.id, 'ADMIN_RENTALS'); await ctx.reply(box('RENTAL', ['Kelola rental aktif/expired.']), rentalsKeyboard()); });
  bot.action(/admin:rentals:(active|soon|expired):(\d+)/, async (ctx) => {
    if (!(await ensureAdmin(ctx))) return; await ctx.answerCbQuery();
    const mode = ctx.match[1];
    let q = db('rentals').orderBy('id', 'desc').limit(20);
    if (mode === 'active') q = q.where({ status: 'ACTIVE' });
    if (mode === 'expired') q = q.where({ status: 'EXPIRED' });
    if (mode === 'soon') q = q.where({ status: 'ACTIVE' }).andWhere('end_at', '<=', new Date(Date.now() + 3 * 86400000).toISOString());
    const rows = await q;
    await ctx.reply(box('LIST RENTAL', rows.length ? rows.map((r: any) => `#${r.id} user:${r.user_id} end:${r.end_at}`) : ['Tidak ada data']), backHomeKeyboard);
  });
  bot.action('admin:rentals:extend', async (ctx) => { if (!(await ensureAdmin(ctx))) return; await ctx.answerCbQuery(); await ctx.reply('Ketik format: extend|rental_id|hari_tambahan'); });

  bot.action('admin:users', async (ctx) => { if (!(await ensureAdmin(ctx))) return; await ctx.answerCbQuery(); await setAdminState(ctx.from!.id, 'ADMIN_USERS'); await ctx.reply(box('USER MANAGEMENT', ['Kelola user.']), usersKeyboard()); });
  bot.action('admin:users:search', async (ctx) => { if (!(await ensureAdmin(ctx))) return; await ctx.answerCbQuery(); await ctx.reply('Ketik username atau user_id untuk mencari user.'); });
  bot.action('admin:users:adjust', async (ctx) => { if (!(await ensureAdmin(ctx))) return; await ctx.answerCbQuery(); await setAdminState(ctx.from!.id, 'ADMIN_USERS_ADJUST'); await ctx.reply('Format: user_id|nominal(+/-)|alasan'); });
  bot.action('admin:users:blacklist', async (ctx) => { if (!(await ensureAdmin(ctx))) return; await ctx.answerCbQuery(); await setAdminState(ctx.from!.id, 'ADMIN_USERS_BLACKLIST'); await ctx.reply('Masukkan user_id untuk blacklist.'); });

  bot.action('admin:vouchers', async (ctx) => { if (!(await ensureAdmin(ctx))) return; await ctx.answerCbQuery(); await setAdminState(ctx.from!.id, 'ADMIN_VOUCHERS'); await ctx.reply(box('VOUCHER/PROMO', ['Kelola voucher.']), vouchersKeyboard()); });
  bot.action('admin:vouchers:add', async (ctx) => { if (!(await ensureAdmin(ctx))) return; await ctx.answerCbQuery(); await setAdminState(ctx.from!.id, 'ADMIN_VOUCHERS_ADD'); await ctx.reply('Format: code|FIX/PERCENT|value|expiry_iso|max_use'); });
  bot.action(/admin:vouchers:list:(\d+)/, async (ctx) => { if (!(await ensureAdmin(ctx))) return; await ctx.answerCbQuery(); const rows = await db('vouchers').orderBy('id', 'desc').limit(20); await ctx.reply(box('LIST VOUCHER', rows.length ? rows.map((v: any) => `${v.code} ${v.type}:${v.value} [${v.active ? 'ON' : 'OFF'}]`) : ['Kosong']), backHomeKeyboard); });
  bot.action('admin:vouchers:disable', async (ctx) => { if (!(await ensureAdmin(ctx))) return; await ctx.answerCbQuery(); await ctx.reply('Ketik code voucher yang akan dinonaktifkan.'); });

  bot.action('admin:broadcast', async (ctx) => { if (!(await ensureAdmin(ctx))) return; await ctx.answerCbQuery(); await setAdminState(ctx.from!.id, 'ADMIN_BROADCAST'); await ctx.reply(box('BROADCAST', ['Kirim pengumuman ke semua user.']), broadcastKeyboard()); });
  bot.action('admin:broadcast:send', async (ctx) => { if (!(await ensureAdmin(ctx))) return; await ctx.answerCbQuery(); await setAdminState(ctx.from!.id, 'ADMIN_BROADCAST_WAIT'); await ctx.reply('Ketik pesan broadcast lalu kirim.'); });
  bot.action('admin:broadcast:toggle-restock', async (ctx) => {
    if (!(await ensureAdmin(ctx))) return; await ctx.answerCbQuery();
    const oldVal = (await getSetting('restock_announcement')) || '0';
    const newVal = oldVal === '1' ? '0' : '1';
    await db('settings').insert({ key: 'restock_announcement', value: newVal, updated_at: new Date().toISOString() }).onConflict('key').merge();
    await writeAudit(ctx.from!.id, 'TOGGLE_RESTOCK_ANNOUNCEMENT', { enabled: newVal === '1' });
    await ctx.reply(`Restock announcement: ${newVal === '1' ? 'ON' : 'OFF'}`);
  });

  bot.action('admin:settings', async (ctx) => { if (!(await ensureAdmin(ctx))) return; await ctx.answerCbQuery(); await setAdminState(ctx.from!.id, 'ADMIN_SETTINGS'); await ctx.reply(box('SETTINGS', ['Konfigurasi bot.']), settingsKeyboard()); });
  bot.action('admin:settings:qris', async (ctx) => { if (!(await ensureAdmin(ctx))) return; await ctx.answerCbQuery(); await setAdminState(ctx.from!.id, 'ADMIN_SETTINGS_QRIS_WAIT_PHOTO'); await ctx.reply('Silakan kirim foto QRIS (image).'); });
  bot.action('admin:settings:topup-preset', async (ctx) => { if (!(await ensureAdmin(ctx))) return; await ctx.answerCbQuery(); await setAdminState(ctx.from!.id, 'ADMIN_SETTINGS_TOPUP'); await ctx.reply('Masukkan nominal preset topup. Contoh: 5000,10000,20000'); });
  bot.action('admin:settings:threshold', async (ctx) => { if (!(await ensureAdmin(ctx))) return; await ctx.answerCbQuery(); await setAdminState(ctx.from!.id, 'ADMIN_SETTINGS_THRESHOLD'); await ctx.reply('Masukkan threshold stok menipis (angka):'); });

  bot.action(/admin:.+/, async (ctx) => {
    if (!(await ensureAdmin(ctx))) return;
    await ctx.answerCbQuery('Menu belum diimplementasi detail, gunakan submenu aktif.');
  });
}
