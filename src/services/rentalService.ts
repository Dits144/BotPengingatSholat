import { DateTime } from 'luxon';
import { Telegraf } from 'telegraf';
import { db } from '../config/database';
import { BotContext } from '../bot/types';
import { addDuration, countdown, formatDate, nowTz } from '../utils/date';
import { decrypt } from '../utils/encryption';
import { logActivity } from './logService';
import { markExpiredAccounts } from './accountService';

export async function rentAccount(input: { productId: number; months: number; days: number; userId: number }) {
  await markExpiredAccounts();

  return db.transaction(async (trx) => {
    const account = await trx('accounts')
      .where({ product_id: input.productId, status: 'AVAILABLE', allow_rent: 1 })
      .andWhere('expires_at', '>', nowTz().toISO())
      .orderBy('expires_at', 'asc')
      .first();

    if (!account) return { ok: false as const, message: 'Stok sewa habis.' };

    const start = nowTz();
    const end = addDuration(start, input.months, input.days);

    await trx('accounts').where({ id: account.id }).update({ status: 'RENTED' });
    await trx('rentals').insert({
      account_id: account.id,
      user_id: input.userId,
      start_at: start.toISO(),
      end_at: end.toISO(),
      status: 'ACTIVE',
      notified_24h: 0,
      notified_1h: 0
    });
    await logActivity('RENT', String(input.userId), { accountId: account.id, productId: input.productId }, trx);

    return {
      ok: true as const,
      item: {
        accountId: account.id,
        email: decrypt(account.email_encrypted),
        password: decrypt(account.password_encrypted),
        rentEndAt: end.toISO(),
        countdown: countdown(end.toISO() as string)
      }
    };
  });
}

export async function getMyRentals(userId: number) {
  const active = await db('rentals as r')
    .leftJoin('accounts as a', 'a.id', 'r.account_id')
    .leftJoin('products as p', 'p.id', 'a.product_id')
    .where({ 'r.user_id': userId, 'r.status': 'ACTIVE' })
    .orderBy('r.end_at', 'asc')
    .select('r.*', 'a.email_encrypted', 'p.name as product_name');

  const history = await db('rentals as r')
    .leftJoin('accounts as a', 'a.id', 'r.account_id')
    .leftJoin('products as p', 'p.id', 'a.product_id')
    .where({ 'r.user_id': userId, 'r.status': 'ENDED' })
    .orderBy('r.end_at', 'desc')
    .select('r.*', 'a.email_encrypted', 'p.name as product_name')
    .limit(10);

  return {
    active: active.map((r) => ({
      id: r.id,
      productName: r.product_name,
      emailMasked: `${decrypt(r.email_encrypted).slice(0, 2)}***`,
      startAt: formatDate(r.start_at),
      endAt: formatDate(r.end_at),
      countdown: countdown(r.end_at)
    })),
    history: history.map((r) => ({
      id: r.id,
      productName: r.product_name,
      endAt: formatDate(r.end_at)
    }))
  };
}

export async function listActiveRentalsAdmin() {
  const rows = await db('rentals as r')
    .leftJoin('accounts as a', 'a.id', 'r.account_id')
    .leftJoin('products as p', 'p.id', 'a.product_id')
    .where('r.status', 'ACTIVE')
    .orderBy('r.end_at', 'asc')
    .select('r.*', 'p.name as product_name', 'a.id as account_id');

  return rows.map((r) => ({
    rentalId: r.id,
    productName: r.product_name,
    accountId: r.account_id,
    userId: r.user_id,
    startAt: formatDate(r.start_at),
    endAt: formatDate(r.end_at),
    countdown: countdown(r.end_at)
  }));
}

export async function processRentalNotifications(bot: Telegraf<BotContext>) {
  const now = nowTz();

  await db.transaction(async (trx) => {
    const rentals = await trx('rentals').where({ status: 'ACTIVE' });

    for (const rent of rentals) {
      const endAt = DateTime.fromISO(rent.end_at, { zone: now.zoneName });
      const diffHours = endAt.diff(now, 'hours').hours;

      if (diffHours <= 0) {
        await trx('rentals').where({ id: rent.id }).update({ status: 'ENDED' });
        await trx('accounts').where({ id: rent.account_id }).update({ status: 'RENT_EXPIRED' });
        await logActivity('RENT_ENDED', String(rent.user_id), { rentalId: rent.id }, trx);
        await bot.telegram.sendMessage(rent.user_id, '⛔ Masa sewa akun Anda sudah habis.');
        continue;
      }

      if (diffHours <= 1 && !rent.notified_1h) {
        await trx('rentals').where({ id: rent.id }).update({ notified_1h: 1 });
        await logActivity('NOTIFY_1H', String(rent.user_id), { rentalId: rent.id }, trx);
        await bot.telegram.sendMessage(rent.user_id, '⏰ Masa sewa tersisa sekitar 1 jam.');
      } else if (diffHours <= 24 && !rent.notified_24h) {
        await trx('rentals').where({ id: rent.id }).update({ notified_24h: 1 });
        await logActivity('NOTIFY_24H', String(rent.user_id), { rentalId: rent.id }, trx);
        await bot.telegram.sendMessage(rent.user_id, '🔔 Masa sewa tersisa sekitar 24 jam.');
      }
    }
  });
}
