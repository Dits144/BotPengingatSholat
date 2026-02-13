import { db } from '../config/database';
import { AccountStatus } from '../db/models/types';
import { nowTz, formatDate } from '../utils/date';
import { encrypt, decrypt } from '../utils/encryption';
import { maskEmail } from '../utils/mask';
import { logActivity } from './logService';

export async function addAccount(input: {
  productId: number;
  email: string;
  password: string;
  expiresAt: string;
  allowBuy: boolean;
  allowRent: boolean;
  actor: string;
}) {
  if (!Number.isFinite(input.productId)) throw new Error('Invalid productId');

  await db('accounts').insert({
    product_id: input.productId,
    email_encrypted: encrypt(input.email),
    password_encrypted: encrypt(input.password),
    expires_at: input.expiresAt,
    allow_buy: input.allowBuy,
    allow_rent: input.allowRent,
    status: 'AVAILABLE',
    created_at: nowTz().toISO()
  });

  await logActivity('ADD_ACCOUNT', input.actor, {
    productId: input.productId,
    emailMasked: maskEmail(input.email),
    allowBuy: input.allowBuy,
    allowRent: input.allowRent,
    expiresAt: input.expiresAt
  });
}

export async function markExpiredAccounts() {
  await db('accounts')
    .whereIn('status', ['AVAILABLE'])
    .andWhere('expires_at', '<', nowTz().toISO())
    .update({ status: 'EXPIRED' as AccountStatus });
}

export async function availableCountByProduct() {
  await markExpiredAccounts();
  return db('accounts as a')
    .select('p.id', 'p.name')
    .count<{ count: number }[]>({ count: 'a.id' })
    .leftJoin('products as p', 'p.id', 'a.product_id')
    .where('a.status', 'AVAILABLE')
    .groupBy('p.id', 'p.name')
    .orderBy('p.name', 'asc');
}

export async function listAccountsByProduct(productId: number) {
  const rows = await db('accounts')
    .where({ product_id: productId })
    .orderByRaw('CASE WHEN expires_at IS NULL THEN 1 ELSE 0 END, expires_at asc');

  return rows.map((r) => ({
    id: r.id,
    status: r.status,
    expiresAt: formatDate(r.expires_at),
    allowBuy: Boolean(r.allow_buy),
    allowRent: Boolean(r.allow_rent),
    emailMasked: maskEmail(decrypt(r.email_encrypted))
  }));
}

export async function listEndedOrExpiredAccounts() {
  const rows = await db('accounts').whereIn('status', ['RENT_EXPIRED', 'EXPIRED']).orderBy('id', 'desc');
  return rows.map((r) => ({
    id: r.id,
    productId: r.product_id,
    status: r.status,
    expiresAt: formatDate(r.expires_at),
    emailMasked: maskEmail(decrypt(r.email_encrypted))
  }));
}

export async function returnAccountToAvailable(accountId: number, actor: string) {
  await db('accounts').where({ id: accountId }).update({ status: 'AVAILABLE' });
  await logActivity('RETURN_AVAILABLE', actor, { accountId });
}
