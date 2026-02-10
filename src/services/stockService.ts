import { Knex } from 'knex';
import { db } from '../config/database';
import { StockAccount } from '../db/models/types';
import { addDuration, nowTz, formatDate } from '../utils/date';
import { decrypt, encrypt } from '../utils/encryption';
import { maskEmail } from '../utils/mask';
import { getProductById } from './productService';
import { logActivity } from './logService';

export async function markExpiredAccounts() {
  const now = nowTz().toISO();
  await db('stock_accounts')
    .whereIn('status', ['AVAILABLE', 'RESERVED'])
    .andWhere('expires_at', '<', now)
    .update({ status: 'EXPIRED' });
}

export async function addStock(input: {
  productId: number;
  email: string;
  password: string;
  startAt?: string | null;
  expiresAt?: string | null;
  activateOnSale: boolean;
  durationMonths?: number;
  durationDays?: number;
  note?: string;
  actor: string;
}) {
  const now = nowTz().toISO();
  await db('stock_accounts').insert({
    product_id: input.productId,
    email_encrypted: encrypt(input.email),
    password_encrypted: encrypt(input.password),
    added_at: now,
    start_at: input.startAt ?? null,
    expires_at: input.expiresAt ?? null,
    status: 'AVAILABLE',
    sold_to: null,
    sold_at: null,
    note: input.note ?? null,
    activate_on_sale: input.activateOnSale,
    duration_months: input.durationMonths ?? 0,
    duration_days: input.durationDays ?? 0
  });
  await logActivity('ADD_STOCK', input.actor, { productId: input.productId, email: maskEmail(input.email) });
}

export async function getAvailableCountByProduct() {
  return db('stock_accounts as s')
    .select('p.id', 'p.name')
    .count<{ count: number }[]>({ count: 's.id' })
    .leftJoin('products as p', 'p.id', 's.product_id')
    .where('s.status', 'AVAILABLE')
    .groupBy('p.id', 'p.name')
    .orderBy('p.name', 'asc');
}

export async function listAvailableStock(productId: number) {
  const rows: StockAccount[] = await db('stock_accounts')
    .where({ product_id: productId, status: 'AVAILABLE' })
    .orderByRaw('CASE WHEN expires_at IS NULL THEN 1 ELSE 0 END, expires_at asc');
  return rows.map((r) => ({
    ...r,
    email_encrypted: maskEmail(decrypt(r.email_encrypted))
  }));
}

async function reserveForSale(
  trx: Knex.Transaction,
  productId: number,
  qty: number
): Promise<StockAccount[]> {
  const candidates: StockAccount[] = await trx('stock_accounts')
    .where({ product_id: productId, status: 'AVAILABLE' })
    .orderByRaw('CASE WHEN expires_at IS NULL THEN 1 ELSE 0 END, expires_at asc')
    .limit(qty);

  if (candidates.length < qty) return [];

  const ids = candidates.map((c) => c.id);
  await trx('stock_accounts').whereIn('id', ids).update({ status: 'RESERVED' });

  return candidates;
}

export async function sellStock(input: { productId: number; qty: number; buyer: string; actor: string }) {
  await markExpiredAccounts();
  return db.transaction(async (trx) => {
    const reserved = await reserveForSale(trx, input.productId, input.qty);
    if (reserved.length < input.qty) {
      const available = await trx('stock_accounts').where({ product_id: input.productId, status: 'AVAILABLE' }).count<{ count: number }[]>({ count: 'id' }).first();
      return { ok: false as const, available: Number(available?.count || 0) };
    }

    const now = nowTz();
    const out = [] as Array<{ email: string; password: string; startAt: string | null; expiresAt: string | null; note: string | null }>;

    for (const acc of reserved) {
      let startAt = acc.start_at;
      let expiresAt = acc.expires_at;

      if (acc.activate_on_sale) {
        startAt = now.toISO();
        expiresAt = addDuration(now, acc.duration_months, acc.duration_days).toISO();
      }

      await trx('stock_accounts').where({ id: acc.id }).update({
        status: 'SOLD',
        sold_to: input.buyer,
        sold_at: now.toISO(),
        start_at: startAt,
        expires_at: expiresAt
      });

      out.push({
        email: decrypt(acc.email_encrypted),
        password: decrypt(acc.password_encrypted),
        startAt,
        expiresAt,
        note: acc.note ?? null
      });
    }

    await logActivity('SELL', input.actor, { productId: input.productId, qty: input.qty, buyer: input.buyer });
    return { ok: true as const, items: out };
  });
}

export async function listSoldByProduct(productId: number, from?: string, to?: string) {
  let q = db('stock_accounts').where({ product_id: productId, status: 'SOLD' }).orderBy('sold_at', 'desc');
  if (from) q = q.andWhere('sold_at', '>=', from);
  if (to) q = q.andWhere('sold_at', '<=', to);
  const rows: StockAccount[] = await q;
  return rows.map((r) => ({ ...r, email_encrypted: decrypt(r.email_encrypted) }));
}

export async function exportStocksCSV(input: { productId?: number; includePassword: boolean; actor: string }) {
  let q = db('stock_accounts as s')
    .select('s.*', 'p.name as product_name')
    .leftJoin('products as p', 'p.id', 's.product_id')
    .orderBy('s.id', 'asc');
  if (input.productId) q = q.where('s.product_id', input.productId);
  const rows = await q;

  const headers = ['id', 'product', 'email', ...(input.includePassword ? ['password'] : []), 'status', 'start_at', 'expires_at', 'sold_to', 'sold_at', 'note'];
  const lines = [headers.join(',')];

  for (const r of rows) {
    const email = decrypt(r.email_encrypted);
    const password = decrypt(r.password_encrypted);
    const values = [
      r.id,
      `"${r.product_name}"`,
      `"${email}"`,
      ...(input.includePassword ? [`"${password}"`] : []),
      r.status,
      `"${formatDate(r.start_at)}"`,
      `"${formatDate(r.expires_at)}"`,
      `"${r.sold_to || ''}"`,
      `"${formatDate(r.sold_at)}"`,
      `"${(r.note || '').replace(/"/g, '""')}"`
    ];
    lines.push(values.join(','));
  }

  await logActivity('EXPORT', input.actor, { productId: input.productId ?? null, includePassword: input.includePassword });
  return lines.join('\n');
}

export async function getProductCard(productId: number) {
  const p = await getProductById(productId);
  const c = await db('stock_accounts').where({ product_id: productId, status: 'AVAILABLE' }).count<{ count: number }[]>({ count: 'id' }).first();
  return {
    product: p,
    available: Number(c?.count || 0)
  };
}
