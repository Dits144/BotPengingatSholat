import { NextFunction } from 'telegraf';
import { env } from '../../config/env';
import { BotContext } from '../types';

const userHits = new Map<number, number>();

export async function rateLimit(ctx: BotContext, next: NextFunction) {
  if (!ctx.from) return;
  const now = Date.now();
  const last = userHits.get(ctx.from.id) || 0;
  if (now - last < env.rateLimitSeconds * 1000) {
    await ctx.reply(`Terlalu cepat. Coba lagi dalam ${env.rateLimitSeconds} detik.`);
    return;
  }
  userHits.set(ctx.from.id, now);
  return next();
}
