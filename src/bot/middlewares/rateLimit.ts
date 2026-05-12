import { MiddlewareFn } from 'telegraf';
import { env } from '../../config/env';
import { BotContext } from '../types';

const userHits = new Map<number, number>();

export const rateLimit: MiddlewareFn<BotContext> = async (ctx, next) => {
  if (!ctx.from) return;
  const now = Date.now();
  const last = userHits.get(ctx.from.id) || 0;
  if (now - last < env.rateLimitSeconds * 1000) {
    await ctx.reply(`Terlalu cepat. Coba lagi dalam ${env.rateLimitSeconds} detik.`);
    return;
  }
  userHits.set(ctx.from.id, now);
  return next();
};
