import { NextFunction } from 'telegraf';
import { env } from '../../config/env';
import { BotContext } from '../types';

export async function adminOnly(ctx: BotContext, next: NextFunction) {
  if (!ctx.from || !env.adminIds.includes(ctx.from.id)) {
    await ctx.reply('❌ Hanya admin yang bisa akses fitur ini.');
    return;
  }
  return next();
}
