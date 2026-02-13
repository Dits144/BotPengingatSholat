import { Markup } from 'telegraf';

export const userMenuKeyboard = Markup.inlineKeyboard([
  [Markup.button.callback('Lihat Produk', 'USER_PRODUCTS')],
  [Markup.button.callback('Beli', 'SCENE_BUY')],
  [Markup.button.callback('Sewa', 'SCENE_RENT')],
  [Markup.button.callback('Status Sewa Saya', 'SCENE_MY_RENTALS')]
]);
