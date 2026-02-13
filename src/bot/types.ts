import { Context } from 'telegraf';

export interface SessionData {
  activePage?: number;
  awaiting?: 'qty' | 'product_search';
  checkout?: { variantId: number; maxQty: number; price: number; productName: string; variantName: string; stockType: 'BUY' | 'RENT' };
}

export interface BotContext extends Context {
  session: SessionData;
}
