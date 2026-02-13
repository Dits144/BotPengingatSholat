import { Markup } from 'telegraf';

export const mainMenuKb = Markup.inlineKeyboard([
  [Markup.button.callback('🛍 List Produk', 'LIST_PRODUCTS')],
  [Markup.button.callback('💳 Saldo', 'SHOW_SALDO'), Markup.button.callback('🎟 Voucher', 'SHOW_VOUCHER')],
  [Markup.button.callback('📦 Stok', 'SHOW_STOK'), Markup.button.callback('☎️ Bantuan', 'HELP')]
]);

export function productPageKb(page: number, totalPage: number) {
  const rows = [] as ReturnType<typeof Markup.button.callback>[][];
  const nav = [] as ReturnType<typeof Markup.button.callback>[];
  if (page > 1) nav.push(Markup.button.callback('⬅️ Prev', `PRODUCT_PAGE:${page - 1}`));
  if (page < totalPage) nav.push(Markup.button.callback('➡️ Next', `PRODUCT_PAGE:${page + 1}`));
  if (nav.length) rows.push(nav);
  rows.push([Markup.button.callback('🔎 Cari', 'SEARCH_PRODUCT'), Markup.button.callback('🏠 Menu', 'MENU')]);
  return Markup.inlineKeyboard(rows);
}
