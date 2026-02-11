import { db } from '../config/database';
import { nowTz } from '../utils/date';

export async function logActivity(action: string, actor: string, payload?: unknown) {
  await db('activity_logs').insert({
    action,
    actor,
    payload: payload ? JSON.stringify(payload) : null,
    created_at: nowTz().toISO()
  });
}
