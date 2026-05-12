import { db } from '../config/database';
import { decrypt, encrypt } from '../utils/encryption';
import { nowTz } from '../utils/date';

export async function ensureUser(id: number, username: string | undefined, name: string) {
  const exists = await db('users').where({ id }).first();
  if (!exists) {
    await db('users').insert({ id, username: username || null, name, created_at: nowTz().toISO(), updated_at: nowTz().toISO() });
  } else {
    await db('users').where({ id }).update({ username: username || exists.username, name, updated_at: nowTz().toISO() });
  }
}

export async function isAdmin(userId: number, ownerId: number) {
  if (userId === ownerId) return true;
  const row = await db('admins').where({ id: userId }).first();
  return !!row;
}

export async function getBotStats() {
  const [u] = await db('users').count<{ count: number }[]>({ count: '*' });
  const [t] = await db('invoices').count<{ count: number }[]>({ count: '*' });
  const [i] = await db('invoice_items').sum<{ total: number }[]>({ total: 'qty' });
  return { users: Number(u.count || 0), tx: Number(t.count || 0), sold: Number(i.total || 0) };
}

export async function listProducts(page: number, q?: string) {
  const limit = 10;
  const base = db('products').where({ active: 1 });
  if (q) base.andWhere('name', 'like', `%${q}%`);
  const [{ count }] = await base.clone().count<{ count: number }[]>({ count: '*' });
  const rows = await base.clone().orderBy('id').offset((page - 1) * limit).limit(limit);
  return { rows, total: Number(count || 0), page, perPage: limit };
}

export async function listVariants(productId: number) {
  return db('variants as v')
    .leftJoin('stock_items as s', function () {
      this.on('s.variant_id', '=', 'v.id').andOn('s.status', '=', db.raw("'AVAILABLE'"));
    })
    .where('v.product_id', productId)
    .andWhere('v.active', 1)
    .groupBy('v.id')
    .select('v.*')
    .count<{ available: number }[]>({ available: 's.id' });
}

export async function createTopup(userId: number, amount: number) {
  const code = `TOPUP-${Date.now()}`;
  const [id] = await db('topups').insert({ topup_code: code, user_id: userId, amount, status: 'CREATED', created_at: nowTz().toISO() });
  return { id, code };
}

export async function markTopupPending(topupCode: string) {
  await db('topups').where({ topup_code: topupCode, status: 'CREATED' }).update({ status: 'PENDING' });
}

export async function getTopupByCode(code: string) {
  return db('topups').where({ topup_code: code }).first();
}

export async function setTopupStatus(code: string, status: 'APPROVED' | 'REJECTED', adminId: number, reason?: string) {
  await db.transaction(async (trx) => {
    const topup = await trx('topups').where({ topup_code: code }).first();
    if (!topup || topup.status !== 'PENDING') throw new Error('Topup tidak valid');
    await trx('topups').where({ id: topup.id }).update({ status, approved_by: adminId, approved_at: nowTz().toISO(), rejection_reason: reason || null });
    if (status === 'APPROVED') {
      await trx('users').where({ id: topup.user_id }).increment('balance', topup.amount);
      await trx('transaction_logs').insert({ user_id: topup.user_id, category: 'TOPUP', reference_code: code, amount: topup.amount, created_at: nowTz().toISO() });
    }
    await trx('audit_logs').insert({ admin_id: adminId, action: `TOPUP_${status}`, detail_json: JSON.stringify({ code, reason }), created_at: nowTz().toISO() });
  });
}

export async function buyVariant(payload: { userId: number; variantId: number; qty: number }) {
  return db.transaction(async (trx) => {
    const variant = await trx('variants').where({ id: payload.variantId, active: 1 }).first();
    if (!variant) throw new Error('Varian tidak ditemukan');
    const items = await trx('stock_items').where({ variant_id: payload.variantId, status: 'AVAILABLE' }).orderBy('id').limit(payload.qty);
    if (items.length < payload.qty) throw new Error('Stok habis');
    const total = Number(variant.price) * payload.qty;
    const user = await trx('users').where({ id: payload.userId }).first();
    if (!user || Number(user.balance) < total) throw new Error('Saldo kurang');

    const invoiceCode = `INV-${Date.now()}`;
    const [invoiceId] = await trx('invoices').insert({ invoice_code: invoiceCode, user_id: payload.userId, total, status: 'PAID', created_at: nowTz().toISO() });
    await trx('invoice_items').insert({ invoice_id: invoiceId, variant_id: payload.variantId, qty: payload.qty, price_each: variant.price, created_at: nowTz().toISO() });
    await trx('users').where({ id: payload.userId }).decrement('balance', total).increment('total_spent', total);

    const ids = items.map((i) => i.id);
    await trx('stock_items').whereIn('id', ids).update({ status: 'SOLD', sold_at: nowTz().toISO(), invoice_id: invoiceId });
    await trx('transaction_logs').insert({ user_id: payload.userId, category: 'BUY', reference_code: invoiceCode, amount: total, detail_json: JSON.stringify({ variantId: payload.variantId, qty: payload.qty }), created_at: nowTz().toISO() });

    if (variant.stock_type === 'RENT') {
      const endAt = nowTz().plus({ days: Number(variant.duration_days || 30) }).toISO();
      for (const item of items) {
        await trx('rentals').insert({ user_id: payload.userId, variant_id: payload.variantId, stock_item_id: item.id, start_at: nowTz().toISO(), end_at: endAt, status: 'ACTIVE', created_at: nowTz().toISO() });
      }
    }

    return { invoiceCode, total, variant, items: items.map((i) => ({ ...i, payload: decrypt(i.encrypted_payload) })) };
  });
}

export async function addStockEncrypted(variantId: number, value: string, label?: string) {
  return db('stock_items').insert({ variant_id: variantId, encrypted_payload: encrypt(value), label: label || null, status: 'AVAILABLE', created_at: nowTz().toISO() });
}

export async function schedulerRentalAlerts(ownerId: number, send: (id: number, msg: string) => Promise<unknown>) {
  const now = nowTz();
  const h3 = now.plus({ days: 3 }).toISO();
  const h1 = now.plus({ days: 1 }).toISO();
  const rows = await db('rentals as r').join('variants as v', 'v.id', 'r.variant_id').where('r.status', 'ACTIVE').where('r.end_at', '<=', h3).select('r.*', 'v.name as variant_name');
  for (const row of rows) {
    const remainingHours = Math.floor((new Date(row.end_at).getTime() - Date.now()) / 3600000);
    if (remainingHours <= 24 || row.end_at <= h1) {
      await send(ownerId, `⚠️ Rental ${row.id} (${row.variant_name}) sisa kurang dari H-1.`);
    } else {
      await send(ownerId, `⚠️ Rental ${row.id} (${row.variant_name}) akan habis H-3.`);
    }
  }

  const expired = await db('rentals').where('status', 'ACTIVE').andWhere('end_at', '<', now.toISO()).update({ status: 'EXPIRED' });
  if (expired > 0) await send(ownerId, `❗ ${expired} rental berubah menjadi EXPIRED.`);
}
