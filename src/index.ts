import { createBot } from './bot';
import { db } from './config/database';
import { startRentalNotifier } from './scheduler/rentalNotifier';

async function main() {
  const bot = createBot();
  await bot.launch();
  startRentalNotifier(bot);
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

main().catch(async (err) => {
  console.error(err);
  await db.destroy();
  process.exit(1);
});
