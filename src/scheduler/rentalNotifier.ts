import { Telegraf } from 'telegraf';
import { BotContext } from '../bot/types';
import { processRentalNotifications } from '../services/rentalService';

export function startRentalNotifier(bot: Telegraf<BotContext>) {
  setInterval(async () => {
    try {
      await processRentalNotifications(bot);
    } catch (error) {
      console.error('RENTAL_NOTIFIER_ERROR', error instanceof Error ? error.message : 'unknown');
    }
  }, 60 * 1000);
}
