import { Markup } from 'telegraf';

export const startKeyboard = Markup.inlineKeyboard([
  [Markup.button.callback('Lihat Produk', 'USER_VIEW_PRODUCTS')]
]);

export function qtyKeyboard(productId: number) {
  return Markup.inlineKeyboard([
    [1, 2, 3].map((qty) => Markup.button.callback(String(qty), `BUY_QTY:${productId}:${qty}`))
  ]);
}
