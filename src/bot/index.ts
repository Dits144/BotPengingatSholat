import { Telegraf, session, Markup } from 'telegraf';
import { env } from '../config/env';
import { BotContext } from './types';
import { rateLimit } from './middlewares/rateLimit';
import { box, rp } from '../utils/format';
import { formatDateTimeWib, formatHumanWib, nowTz } from '../utils/date';
import { createTopup, ensureUser, getBotStats, getTopupByCode, isAdmin, listProducts, listVariants, markTopupPending, schedulerRentalAlerts, setTopupStatus, buyVariant } from '../services/storeService';
import { db } from '../config/database';
import { mainMenuKb, productPageKb } from './keyboards';

async function renderStart(ctx: BotContext) {
  if (!ctx.from) return;
  await ensureUser(ctx.from.id, ctx.from.username, `${ctx.from.first_name || ''} ${ctx.from.last_name || ''}`.trim());
  const user = await db('users').where({ id: ctx.from.id }).first();
  const stats = await getBotStats();
  const text = [
    `Halo ${ctx.from.first_name} 👋🏼`,
    '',
    formatHumanWib(),
    '',
    box('USER INFO', [
      `ID: ${ctx.from.id}`,
      `Username: @${ctx.from.username || '-'}`,
      `Transaksi: ${rp(user?.total_spent || 0)}`,
      `Saldo Pengguna: ${rp(user?.balance || 0)}`
    ]),
    box('BOT STATS', [`Terjual: ${stats.sold}`, `Total User: ${stats.users}`, `Total Transaksi: ${stats.tx}`]),
    box('SHORTCUTS', ['/start', '/saldo', '/stok', '/vouchers'])
  ].join('\n');
  await ctx.reply(text, mainMenuKb);
}

async function renderProductList(ctx: BotContext, page = 1, query?: string) {
  const data = await listProducts(page, query);
  const totalPage = Math.max(1, Math.ceil(data.total / data.perPage));
  ctx.session.activePage = page;
  const lines = data.rows.map((p, idx) => `[ ${(page - 1) * data.perPage + idx + 1} ] ${p.name.toUpperCase()}`);
  const text = `${box('LIST PRODUK', lines.length ? lines : ['Belum ada produk aktif'])}\nHalaman ${page} dari ${totalPage}\nKetik angka untuk buka detail produk.`;
  await ctx.reply(text, productPageKb(page, totalPage));
}

export function createBot() {
  const bot = new Telegraf<BotContext>(env.botToken);
  bot.use(session({ defaultSession: () => ({}) }));
  bot.use(rateLimit);

  bot.start(renderStart);
  bot.command('saldo', async (ctx) => {
    if (!ctx.from) return;
    await ensureUser(ctx.from.id, ctx.from.username, ctx.from.first_name || 'User');
    const user = await db('users').where({ id: ctx.from.id }).first();
    const buttons = env.topupPresets.map((n) => Markup.button.callback(n.toLocaleString('id-ID'), `TOPUP_NOM:${n}`));
    const chunks = [] as typeof buttons[];
    for (let i = 0; i < buttons.length; i += 2) chunks.push(buttons.slice(i, i + 2));
    await ctx.reply(`Detail Saldo Anda di DITSTORE\nSaldo Anda saat ini: ${rp(user?.balance || 0)}\nMau isi saldo? Silakan pilih nominal dibawah ini:`, Markup.inlineKeyboard(chunks));
  });

  bot.command('stok', (ctx) => renderProductList(ctx, 1));
  bot.command('vouchers', async (ctx) => {
    const list = await db('vouchers').where({ active: 1 }).limit(10);
    await ctx.reply(box('VOUCHERS', list.length ? list.map((v) => `${v.code} - ${v.type} ${v.value}`) : ['Belum ada voucher']));
  });

  bot.command('admin', async (ctx) => {
    if (!ctx.from || !(await isAdmin(ctx.from.id, env.ownerId))) return;
    const pendingTopup = await db('topups').where({ status: 'PENDING' }).count<{ count: number }[]>({ count: '*' }).first();
    await ctx.reply(box('ADMIN PANEL', [
      'A. Dashboard',
      `Topup pending: ${pendingTopup?.count || 0}`,
      'B. Produk & Variasi',
      'C. Stok',
      'D. Topup',
      'E. Pesanan / Invoice',
      'F. Rental',
      'G. User Management',
      'H. Voucher/Promo',
      'I. Broadcast',
      'J. Settings'
    ]));
  });

  bot.action('LIST_PRODUCTS', (ctx) => renderProductList(ctx, 1));
  bot.action(/PRODUCT_PAGE:(\d+)/, async (ctx) => {
    const page = Number(ctx.match[1]);
    await ctx.answerCbQuery();
    await renderProductList(ctx, page);
  });
  bot.action('MENU', async (ctx) => {
    await ctx.answerCbQuery();
    await renderStart(ctx);
  });
  bot.action('SHOW_SALDO', async (ctx) => { await ctx.answerCbQuery(); await ctx.telegram.sendMessage(ctx.chat!.id, '/saldo'); });
  bot.action('SHOW_VOUCHER', async (ctx) => { await ctx.answerCbQuery(); await ctx.telegram.sendMessage(ctx.chat!.id, '/vouchers'); });
  bot.action('SHOW_STOK', async (ctx) => { await ctx.answerCbQuery(); await renderProductList(ctx, 1); });
  bot.action('HELP', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.reply('Butuh bantuan? Hubungi admin DITSTORE.');
  });

  bot.action('SEARCH_PRODUCT', async (ctx) => {
    await ctx.answerCbQuery();
    ctx.session.awaiting = 'product_search';
    await ctx.reply('Ketik kata kunci produk. Contoh: capcut');
  });

  bot.action(/DETAIL_PRODUCT:(\d+)/, async (ctx) => {
    const productId = Number(ctx.match[1]);
    await ctx.answerCbQuery();
    const product = await db('products').where({ id: productId }).first();
    if (!product) return;
    const variants = (await listVariants(productId)) as any[];
    const lines = variants.map((v) => `• ${v.name}: ${Number(v.price).toLocaleString('id-ID')} - Stok: ${v.available}`);
    await ctx.reply(
      `${box('DETAIL PRODUK', [`Produk: ${product.name}`, `Stok Terjual: -`, `Desk: ${product.description || '-'}`])}\n${box('Variasi, Harga & Stok', lines)}\n╰➤ Refresh at ${formatDateTimeWib(nowTz().toISO())} WIB`,
      Markup.inlineKeyboard([
        ...variants.map((v) => [Markup.button.callback(`${v.name}: ${Number(v.price).toLocaleString('id-ID')}`, `BUY_VARIANT:${v.id}`)]),
        [Markup.button.callback('⬅️ Back', 'LIST_PRODUCTS'), Markup.button.callback('🔄 Refresh', `DETAIL_PRODUCT:${productId}`)]
      ])
    );
  });

  bot.action(/BUY_VARIANT:(\d+)/, async (ctx) => {
    const variantId = Number(ctx.match[1]);
    await ctx.answerCbQuery();
    const variant = await db('variants').where({ id: variantId }).first();
    if (!variant) return;
    const [available] = await db('stock_items').where({ variant_id: variantId, status: 'AVAILABLE' }).count<{ count: number }[]>({ count: '*' });
    if (Number(available.count) <= 0) return void ctx.reply('Stok habis');
    const user = await db('users').where({ id: ctx.from!.id }).first();
    if (Number(user.balance) < Number(variant.price)) {
      return void ctx.reply('Saldo kurang', Markup.inlineKeyboard([[Markup.button.callback('💳 Topup', 'SHOW_SALDO')]]));
    }
    ctx.session.awaiting = 'qty';
    ctx.session.checkout = { variantId, maxQty: Math.min(Number(variant.max_qty || 1), Number(available.count)), price: Number(variant.price), productName: '-', variantName: variant.name, stockType: variant.stock_type };
    await ctx.reply(`Masukkan jumlah pesanan (angka). Maksimal ${ctx.session.checkout.maxQty}`);
  });

  bot.action(/TOPUP_NOM:(\d+)/, async (ctx) => {
    await ctx.answerCbQuery();
    const amount = Number(ctx.match[1]);
    const topup = await createTopup(ctx.from!.id, amount);
    const caption = box('TOPUP QRIS', [`ID Topup: ${topup.code}`, `Nominal: ${rp(amount)}`, "Transfer sesuai nominal, lalu klik tombol 'Saya sudah bayar'"]);
    const kb = Markup.inlineKeyboard([
      [Markup.button.callback('✅ Saya sudah bayar', `TOPUP_PAID:${topup.code}`)],
      [Markup.button.callback('❌ Batalkan', `TOPUP_CANCEL:${topup.code}`)]
    ]);
    if (env.qrisImage) await ctx.replyWithPhoto(env.qrisImage, { caption, ...kb });
    else await ctx.reply(caption, kb);
  });

  bot.action(/TOPUP_PAID:(.+)/, async (ctx) => {
    await ctx.answerCbQuery();
    const code = ctx.match[1];
    await markTopupPending(code);
    const topup = await getTopupByCode(code);
    await ctx.reply('Topup masuk antrian verifikasi admin.');
    if (!topup) return;
    const user = await db('users').where({ id: topup.user_id }).first();
    await ctx.telegram.sendMessage(env.ownerId, box('TOPUP PENDING', [
      `Nama: ${user?.name}`,
      `Username: @${user?.username || '-'}`,
      `ID: ${topup.user_id}`,
      `Nominal: ${rp(topup.amount)}`,
      `ID Topup: ${topup.topup_code}`
    ]), Markup.inlineKeyboard([[Markup.button.callback('✅ Approve', `ADMIN_TOPUP_OK:${code}`), Markup.button.callback('❌ Reject', `ADMIN_TOPUP_NO:${code}`)]]));
  });

  bot.action(/ADMIN_TOPUP_OK:(.+)/, async (ctx) => {
    if (!(await isAdmin(ctx.from!.id, env.ownerId))) return;
    const code = ctx.match[1];
    await setTopupStatus(code, 'APPROVED', ctx.from!.id);
    const topup = await getTopupByCode(code);
    const user = topup ? await db('users').where({ id: topup.user_id }).first() : null;
    if (topup && user) {
      await ctx.telegram.sendMessage(topup.user_id, `TOP-UP SALDO BERHASIL ✅\n${box('Detail Transaksi', [`ID Transaksi: ${topup.topup_code}`, 'Jenis: Top-Up Saldo', `Nominal: ${rp(topup.amount)}`, `Total Bayar: ${rp(topup.amount)}`, `Saldo saat ini: ${rp(user.balance)}`])}`);
    }
    await ctx.answerCbQuery('Approved');
  });

  bot.action(/ADMIN_TOPUP_NO:(.+)/, async (ctx) => {
    if (!(await isAdmin(ctx.from!.id, env.ownerId))) return;
    const code = ctx.match[1];
    await setTopupStatus(code, 'REJECTED', ctx.from!.id, 'Ditolak admin');
    const topup = await getTopupByCode(code);
    if (topup) await ctx.telegram.sendMessage(topup.user_id, `Topup ${code} ditolak admin.`);
    await ctx.answerCbQuery('Rejected');
  });

  bot.on('text', async (ctx) => {
    const text = ctx.message.text.trim();
    if (ctx.session.awaiting === 'product_search') {
      ctx.session.awaiting = undefined;
      return renderProductList(ctx, 1, text);
    }

    if (ctx.session.awaiting === 'qty' && ctx.session.checkout) {
      const qty = Number(text);
      if (!Number.isInteger(qty) || qty <= 0 || qty > ctx.session.checkout.maxQty) return void ctx.reply('Jumlah tidak valid.');
      const order = ctx.session.checkout;
      ctx.session.awaiting = undefined;
      ctx.session.checkout = undefined;
      try {
        const result = await buyVariant({ userId: ctx.from!.id, variantId: order.variantId, qty });
        const user = await db('users').where({ id: ctx.from!.id }).first();
        const details = result.items.map((it, i) => `${i + 1}. ${it.payload}`).join('\n');
        const rentInfo = result.variant.stock_type === 'RENT' ? `\nMulai aktif: ${formatDateTimeWib(nowTz().toISO())} WIB\nHabis: ${formatDateTimeWib(nowTz().plus({ days: Number(result.variant.duration_days || 30) }).toISO())} WIB` : '';
        await ctx.reply(`✅ Pembayaran Berhasil\n${formatHumanWib()}\n${box('Informasi Pembelian', [`ID Transaksi: ${result.invoiceCode}`, `Produk: ${order.productName}`, `Variant: ${order.variantName}`, `Jumlah: ${qty}`, `Total Pembayaran: ${rp(result.total)}`, `Sisa Saldo: ${rp(user.balance)}`])}\n🔐 Account Details:\n${details}${rentInfo}\n\nS&K: Gunakan akun sesuai aturan resmi lisensi.`);
      } catch (e) {
        await ctx.reply((e as Error).message);
      }
      return;
    }

    const productNumber = Number(text);
    if (Number.isInteger(productNumber) && productNumber > 0) {
      const product = await db('products').where({ id: productNumber }).first();
      if (product) {
        return ctx.reply(`Membuka detail produk #${productNumber}`, Markup.inlineKeyboard([[Markup.button.callback('Buka Detail', `DETAIL_PRODUCT:${productNumber}`)]]));
      }
    }
  });

  setInterval(() => {
    schedulerRentalAlerts(env.ownerId, (id, message) => bot.telegram.sendMessage(id, message)).catch(console.error);
  }, 30 * 60 * 1000);

  bot.catch(async (err, ctx) => {
    await db('error_logs').insert({ message: (err as Error).message, stack: (err as Error).stack || null, meta_json: JSON.stringify({ updateType: ctx.updateType }), created_at: nowTz().toISO() });
    await ctx.reply('Terjadi error. Coba lagi.');
  });

  return bot;
}
