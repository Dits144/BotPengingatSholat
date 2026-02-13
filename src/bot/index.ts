import { Scenes, Telegraf, session } from 'telegraf';
import { env } from '../config/env';
import { BotContext } from './types';
import { addProductScene } from './scenes/addProductScene';
import { addAccountScene } from './scenes/addAccountScene';
import { buyScene } from './scenes/buyScene';
import { rentScene } from './scenes/rentScene';
import { myRentalsScene } from './scenes/myRentalsScene';
import { registerStartHandler } from './handlers/startHandler';
import { registerAdminHandler } from './handlers/adminHandler';
import { registerAuthHandler } from './handlers/authHandler';
import { rateLimit } from './middlewares/rateLimit';

export function createBot() {
  const bot = new Telegraf<BotContext>(env.botToken);

  const stage = new Scenes.Stage<BotContext>([
    addProductScene,
    addAccountScene,
    buyScene,
    rentScene,
    myRentalsScene
  ]);

  bot.use(session());
  bot.use(rateLimit);
  bot.use(stage.middleware());

  registerAuthHandler(bot);
  registerStartHandler(bot);
  registerAdminHandler(bot);

  bot.catch(async (err, ctx) => {
    console.error('BOT_ERROR', err instanceof Error ? err.message : 'unknown');
    await ctx.reply('Terjadi error, silakan coba lagi.');
  });

  return bot;
}
