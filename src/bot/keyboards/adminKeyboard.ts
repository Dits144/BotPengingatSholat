import { Markup } from 'telegraf';

export const adminMenuKeyboard = Markup.inlineKeyboard([
  [Markup.button.callback('Tambah Produk', 'SCENE_ADD_PRODUCT')],
  [Markup.button.callback('Tambah Akun', 'SCENE_ADD_ACCOUNT')],
  [Markup.button.callback('Stok Tersedia', 'ADMIN_AVAILABLE')],
  [Markup.button.callback('Terjual / Disewa Aktif', 'ADMIN_ACTIVE')],
  [Markup.button.callback('Sewa Habis / Expired', 'ADMIN_ENDED')]
]);
