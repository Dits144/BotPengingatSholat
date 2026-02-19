import { startBot } from './bot/whatsappBot';

startBot().catch((err) => {
  console.error('Fatal bot error', err);
  process.exit(1);
});
