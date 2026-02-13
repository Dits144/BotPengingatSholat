import { db } from '../config/database';
import { Role, User } from '../db/models/types';
import { nowTz } from '../utils/date';
import { logActivity } from './logService';

const LOGIN_PASSWORD = 'ditstore';

export async function loginUser(input: { telegramId: number; username?: string; role: Role; password: string }) {
  if (input.password !== LOGIN_PASSWORD) return false;

  const existing = await db<User>('users').where({ telegram_id: input.telegramId }).first();
  const now = nowTz().toISO();

  if (existing) {
    await db('users').where({ telegram_id: input.telegramId }).update({
      username: input.username || null,
      role: input.role,
      logged_in_at: now
    });
  } else {
    await db('users').insert({
      telegram_id: input.telegramId,
      username: input.username || null,
      role: input.role,
      logged_in_at: now
    });
  }

  await logActivity('LOGIN', String(input.telegramId), { role: input.role });
  return true;
}

export async function logoutUser(telegramId: number) {
  await db('users').where({ telegram_id: telegramId }).delete();
  await logActivity('LOGOUT', String(telegramId));
}

export async function getUserRole(telegramId: number): Promise<Role | null> {
  const row = await db<User>('users').where({ telegram_id: telegramId }).first();
  return row?.role ?? null;
}
