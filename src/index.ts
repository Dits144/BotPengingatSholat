import { createBot } from './bot';
import { db } from './config/database';

async function main() {
  const bot = createBot();
  await bot.launch();
  console.log('Bot running...');

  process.once('SIGINT', async () => {
    await db.destroy();
    bot.stop('SIGINT');
  });
  process.once('SIGTERM', async () => {
    await db.destroy();
    bot.stop('SIGTERM');
  });
}

main().catch(async (e) => {
  console.error(e);
  await db.destroy();
  process.exit(1);
});
