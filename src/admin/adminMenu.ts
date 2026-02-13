import { Markup } from 'telegraf';
import { db } from '../config/database';
import { box, rp } from '../utils/format';
import { nowTz } from '../utils/date';

export const adminHomeKeyboard = Markup.inlineKeyboard([
  [Markup.button.callback('A. Dashboard', 'admin:dashboard')],
  [Markup.button.callback('B. Produk & Variasi', 'admin:products')],
  [Markup.button.callback('C. Stok', 'admin:stock')],
  [Markup.button.callback('D. Topup', 'admin:topup')],
  [Markup.button.callback('E. Pesanan / Invoice', 'admin:orders')],
  [Markup.button.callback('F. Rental', 'admin:rentals')],
  [Markup.button.callback('G. User Management', 'admin:users')],
  [Markup.button.callback('H. Voucher/Promo', 'admin:vouchers')],
  [Markup.button.callback('I. Broadcast', 'admin:broadcast')],
  [Markup.button.callback('J. Settings', 'admin:settings')],
  [Markup.button.callback('🔄 Refresh', 'admin:refresh'), Markup.button.callback('🏠 Home', 'admin:home')]
]);

export async function renderAdminHome() {
  const pending = await db('topups').where({ status: 'PENDING' }).count<{ count: number }[]>({ count: '*' }).first();
  return {
    text: box('ADMIN PANEL', [
      'A. Dashboard',
      `Topup pending: ${pending?.count || 0}`,
      'B. Produk & Variasi',
      'C. Stok',
      'D. Topup',
      'E. Pesanan / Invoice',
      'F. Rental',
      'G. User Management',
      'H. Voucher/Promo',
      'I. Broadcast',
      'J. Settings'
    ]),
    keyboard: adminHomeKeyboard
  };
}

export const backHomeKeyboard = Markup.inlineKeyboard([
  [Markup.button.callback('⬅️ Back', 'admin:home')],
  [Markup.button.callback('🏠 Home', 'admin:home')]
]);

export async function renderDashboard() {
  const start = nowTz().startOf('day').toISO();
  const end = nowTz().endOf('day').toISO();
  const [trxToday] = await db('invoices').whereBetween('created_at', [start, end]).count<{ count: number }[]>({ count: '*' });
  const [topupPending] = await db('topups').where({ status: 'PENDING' }).count<{ count: number }[]>({ count: '*' });
  const threshold = Number((await db('settings').where({ key: 'low_stock_threshold' }).first())?.value || 5);
  const lowRows = await db('variants as v').leftJoin('stock_items as s', function () {
    this.on('s.variant_id', '=', 'v.id').andOn('s.status', '=', db.raw("'AVAILABLE'"));
  }).groupBy('v.id').select('v.id').count<{ count: number }[]>({ count: 's.id' });
  const lowStock = lowRows.filter((r) => Number(r.count || 0) < threshold).length;
  const h3 = nowTz().plus({ days: 3 }).toISO();
  const [rentals] = await db('rentals').where('status', 'ACTIVE').andWhere('end_at', '<=', h3).count<{ count: number }[]>({ count: '*' });

  return {
    text: box('DASHBOARD', [
      `Total transaksi hari ini: ${trxToday.count || 0}`,
      `Topup pending: ${topupPending.count || 0}`,
      `Stok menipis (<${threshold}): ${lowStock}`,
      `Rental akan habis (H-3): ${rentals.count || 0}`
    ]),
    keyboard: Markup.inlineKeyboard([
      [Markup.button.callback('🔄 Refresh', 'admin:dashboard')],
      [Markup.button.callback('⬅️ Back', 'admin:home')]
    ])
  };
}

export function productsKeyboard() {
  return Markup.inlineKeyboard([
    [Markup.button.callback('➕ Tambah Produk', 'admin:products:add')],
    [Markup.button.callback('📋 List Produk', 'admin:products:list:1')],
    [Markup.button.callback('➕ Tambah Variasi', 'admin:variants:add')],
    [Markup.button.callback('📋 List Variasi', 'admin:variants:list:1')],
    [Markup.button.callback('⬅️ Back', 'admin:home')]
  ]);
}

export function stockKeyboard() {
  return Markup.inlineKeyboard([
    [Markup.button.callback('➕ Tambah Stok', 'admin:stock:add')],
    [Markup.button.callback('📦 Lihat Stok', 'admin:stock:list:1')],
    [Markup.button.callback('⚠️ Stok Menipis', 'admin:stock:low')],
    [Markup.button.callback('⬅️ Back', 'admin:home')]
  ]);
}

export function topupKeyboard() { return Markup.inlineKeyboard([[Markup.button.callback('⏳ Pending', 'admin:topup:pending:1')],[Markup.button.callback('📜 Riwayat', 'admin:topup:history:1')],[Markup.button.callback('🔍 Cari Topup', 'admin:topup:search')],[Markup.button.callback('⬅️ Back', 'admin:home')]]); }
export function ordersKeyboard() { return Markup.inlineKeyboard([[Markup.button.callback('📋 Pesanan Terbaru', 'admin:orders:list:1')],[Markup.button.callback('🔍 Cari Invoice', 'admin:orders:search')],[Markup.button.callback('📤 Resend Akun', 'admin:orders:resend')],[Markup.button.callback('⬅️ Back', 'admin:home')]]); }
export function rentalsKeyboard() { return Markup.inlineKeyboard([[Markup.button.callback('✅ Aktif', 'admin:rentals:active:1')],[Markup.button.callback('⏰ Akan habis', 'admin:rentals:soon:1')],[Markup.button.callback('❌ Expired', 'admin:rentals:expired:1')],[Markup.button.callback('➕ Extend', 'admin:rentals:extend')],[Markup.button.callback('⬅️ Back', 'admin:home')]]); }
export function usersKeyboard() { return Markup.inlineKeyboard([[Markup.button.callback('🔍 Cari User', 'admin:users:search')],[Markup.button.callback('💰 Adjust Saldo', 'admin:users:adjust')],[Markup.button.callback('🚫 Blacklist', 'admin:users:blacklist')],[Markup.button.callback('⬅️ Back', 'admin:home')]]); }
export function vouchersKeyboard() { return Markup.inlineKeyboard([[Markup.button.callback('➕ Buat Voucher', 'admin:vouchers:add')],[Markup.button.callback('📋 List Voucher', 'admin:vouchers:list:1')],[Markup.button.callback('🛑 Nonaktifkan Voucher', 'admin:vouchers:disable')],[Markup.button.callback('⬅️ Back', 'admin:home')]]); }
export function broadcastKeyboard() { return Markup.inlineKeyboard([[Markup.button.callback('📣 Broadcast ke Semua', 'admin:broadcast:send')],[Markup.button.callback('📌 Pengumuman Restock (toggle)', 'admin:broadcast:toggle-restock')],[Markup.button.callback('⬅️ Back', 'admin:home')]]); }
export function settingsKeyboard() { return Markup.inlineKeyboard([[Markup.button.callback('🧾 Set Nominal Topup', 'admin:settings:topup-preset')],[Markup.button.callback('🖼 Upload QRIS', 'admin:settings:qris')],[Markup.button.callback('⚙️ Threshold Stok Menipis', 'admin:settings:threshold')],[Markup.button.callback('⬅️ Back', 'admin:home')]]); }

export function adminMenuShortcutIfAdmin(isAdmin: boolean) {
  if (!isAdmin) return undefined;
  return Markup.inlineKeyboard([[Markup.button.callback('🏠 Admin Menu', 'admin:home')]]);
}

export function topupPendingActions(code: string) {
  return Markup.inlineKeyboard([[Markup.button.callback('✅ Approve', `admin:topup:approve:${code}`), Markup.button.callback('❌ Reject', `admin:topup:reject:${code}`)]]);
}

export function formatInvoiceDetail(inv: any, items: any[]) {
  return box('DETAIL INVOICE', [
    `Kode: ${inv.invoice_code}`,
    `User: ${inv.user_id}`,
    `Total: ${rp(inv.total)}`,
    `Status: ${inv.status}`,
    `Items: ${items.map((i) => `${i.variant_id} x${i.qty}`).join(', ') || '-'}`
  ]);
}
