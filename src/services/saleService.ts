import { db } from '../config/database';
import { decrypt } from '../utils/encryption';
import { formatDate, nowTz } from '../utils/date';
import { logActivity } from './logService';
import { markExpiredAccounts } from './accountService';

export async function buyAccounts(input: { productId: number; qty: number; userId: number }) {
  if (!Number.isInteger(input.qty) || input.qty <= 0) {
    return { ok: false as const, message: 'Qty harus angka bulat > 0' };
  }

  await markExpiredAccounts();

  return db.transaction(async (trx) => {
    const accounts = await trx('accounts')
      .where({ product_id: input.productId, status: 'AVAILABLE', allow_buy: 1 })
      .andWhere('expires_at', '>', nowTz().toISO())
      .orderBy('expires_at', 'asc')
      .limit(input.qty);

    if (accounts.length < input.qty) {
      return { ok: false as const, message: `Stok kurang. Tersedia ${accounts.length}` };
    }

    for (const acc of accounts) {
      await trx('accounts').where({ id: acc.id }).update({ status: 'SOLD' });
      await trx('sales').insert({ account_id: acc.id, user_id: input.userId, sold_at: nowTz().toISO() });
      await logActivity('BUY', String(input.userId), { accountId: acc.id, productId: input.productId }, trx);
    }

    return {
      ok: true as const,
      items: accounts.map((a) => ({
        accountId: a.id,
        email: decrypt(a.email_encrypted),
        password: decrypt(a.password_encrypted),
        expiresAt: formatDate(a.expires_at)
      }))
    };
  });
}

export async function listSalesActiveByProduct(productId: number) {
  return db('sales as s')
    .leftJoin('accounts as a', 'a.id', 's.account_id')
    .where('a.product_id', productId)
    .orderBy('s.sold_at', 'desc')
    .select('s.*', 'a.status');
}

export async function listRecentSales() {
  return db('sales as s')
    .leftJoin('accounts as a', 'a.id', 's.account_id')
    .leftJoin('products as p', 'p.id', 'a.product_id')
    .orderBy('s.sold_at', 'desc')
    .select('s.*', 'p.name as product_name')
    .limit(30);
}
