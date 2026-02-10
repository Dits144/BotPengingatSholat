import { Markup } from 'telegraf';

export const adminMenuKeyboard = Markup.inlineKeyboard([
  [Markup.button.callback('Produk', 'ADMIN_PRODUCTS')],
  [Markup.button.callback('Tambah Produk', 'SCENE_ADD_PRODUCT'), Markup.button.callback('List Produk', 'ADMIN_LIST_PRODUCTS')],
  [Markup.button.callback('Tambah Stok', 'SCENE_ADD_STOCK')],
  [Markup.button.callback('Stok Tersedia', 'ADMIN_AVAILABLE')],
  [Markup.button.callback('Terjual', 'ADMIN_SOLD'), Markup.button.callback('Expired', 'ADMIN_EXPIRED')],
  [Markup.button.callback('Export', 'SCENE_EXPORT')]
]);
