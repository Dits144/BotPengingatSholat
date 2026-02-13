import { Telegraf } from 'telegraf';
import { BotContext } from '../types';
import { userMenuKeyboard } from '../keyboards/userKeyboard';
import { availableCountByProduct } from '../../services/accountService';
import { userOnly } from '../middlewares/auth';

export function registerStartHandler(bot: Telegraf<BotContext>) {
  bot.start(async (ctx) => {
    await ctx.reply('Selamat datang. Login dulu: /login admin atau /login user');
  });

  bot.command('menu', userOnly, async (ctx) => {
    await ctx.reply('Menu user:', userMenuKeyboard);
  });

  bot.action('USER_PRODUCTS', userOnly, async (ctx) => {
    await ctx.answerCbQuery();
    const data = await availableCountByProduct();
    const msg = data.length ? data.map((d) => `${d.name}: ${d.count}`).join('\n') : 'Belum ada stok.';
    await ctx.reply(`📦 Produk & stok tersedia\n${msg}`);
  });

  bot.action('SCENE_BUY', userOnly, async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.scene.enter('BUY_SCENE');
  });

  bot.action('SCENE_RENT', userOnly, async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.scene.enter('RENT_SCENE');
  });

  bot.action('SCENE_MY_RENTALS', userOnly, async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.scene.enter('MY_RENTALS_SCENE');
  });
}
