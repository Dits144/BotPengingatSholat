import { env } from '../config/env';
import { db } from '../config/database';
import { BotContext } from '../bot/types';

export async function isAdminUser(userId: number): Promise<boolean> {
  if (userId === env.ownerId) return true;
  const row = await db('admins').where({ id: userId }).first();
  return !!row;
}

export async function ensureAdmin(ctx: BotContext): Promise<boolean> {
  if (!ctx.from) return false;
  const ok = await isAdminUser(ctx.from.id);
  if (!ok) await ctx.reply('❌ Menu ini khusus admin.');
  return ok;
}

export async function writeAudit(adminId: number, action: string, detail?: Record<string, unknown>) {
  await db('audit_logs').insert({
    admin_id: adminId,
    action,
    detail_json: detail ? JSON.stringify(detail) : null,
    created_at: new Date().toISOString()
  });
}
