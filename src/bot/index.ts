import { Telegraf, Scenes, session } from 'telegraf';
import { env } from '../config/env';
import { BotContext } from './types';
import { addProductScene } from './scenes/addProductScene';
import { addStockScene } from './scenes/addStockScene';
import { buyScene } from './scenes/buyScene';
import { exportScene } from './scenes/exportScene';
import { registerStartHandler } from './handlers/startHandler';
import { registerAdminHandler } from './handlers/adminHandler';
import { rateLimit } from './middlewares/rateLimit';

export function createBot() {
  const bot = new Telegraf<BotContext>(env.botToken);

  const stage = new Scenes.Stage<BotContext>([addProductScene, addStockScene, buyScene, exportScene]);

  bot.use(session());
  bot.use(rateLimit);
  bot.use(stage.middleware());

  registerStartHandler(bot);
  registerAdminHandler(bot);

  bot.catch((err, ctx) => {
    console.error('Bot error', err);
    ctx.reply('Terjadi error. Coba lagi.');
  });

  return bot;
}
