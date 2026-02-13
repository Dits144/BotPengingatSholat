import { Knex } from 'knex';
import { db } from '../config/database';
import { nowTz } from '../utils/date';

export async function logActivity(action: string, actor: string, payload?: unknown, trx?: Knex.Transaction) {
  const q = trx ?? db;
  await q('activity_logs').insert({
    action,
    actor,
    payload_json: payload ? JSON.stringify(payload) : null,
    created_at: nowTz().toISO()
  });
}
