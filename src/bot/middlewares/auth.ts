import { NextFunction } from 'telegraf';
import { BotContext } from '../types';
import { getUserRole } from '../../services/authService';

export async function adminOnly(ctx: BotContext, next: NextFunction) {
  if (!ctx.from) return;
  const role = await getUserRole(ctx.from.id);
  if (role !== 'ADMIN') {
    await ctx.reply('❌ Akses admin ditolak. Login dulu: /login admin');
    return;
  }
  return next();
}

export async function userOnly(ctx: BotContext, next: NextFunction) {
  if (!ctx.from) return;
  const role = await getUserRole(ctx.from.id);
  if (!role) {
    await ctx.reply('Silakan login dulu: /login user');
    return;
  }
  return next();
}
