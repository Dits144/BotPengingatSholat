import { Telegraf } from 'telegraf';
import { BotContext } from '../types';
import { loginUser, logoutUser } from '../../services/authService';

export function registerAuthHandler(bot: Telegraf<BotContext>) {
  bot.command('login', async (ctx) => {
    if (!ctx.message || !('text' in ctx.message)) return;
    const roleRaw = ctx.message.text.split(' ')[1]?.toUpperCase();
    if (roleRaw !== 'ADMIN' && roleRaw !== 'USER') {
      await ctx.reply('Gunakan: /login admin atau /login user');
      return;
    }

    ctx.session.loginRole = roleRaw;
    await ctx.reply(`Masukkan password untuk role ${roleRaw}:`);
  });

  bot.on('text', async (ctx, next) => {
    if (!ctx.session.loginRole || !ctx.from || !ctx.message || !('text' in ctx.message)) return next();

    const ok = await loginUser({
      telegramId: ctx.from.id,
      username: ctx.from.username,
      role: ctx.session.loginRole,
      password: ctx.message.text.trim()
    });

    ctx.session.loginRole = undefined;
    if (!ok) {
      await ctx.reply('Password salah.');
      return;
    }

    await ctx.reply('✅ Login berhasil. Gunakan /menu untuk user atau /admin untuk admin.');
  });

  bot.command('logout', async (ctx) => {
    if (!ctx.from) return;
    await logoutUser(ctx.from.id);
    await ctx.reply('Anda sudah logout.');
  });
}
