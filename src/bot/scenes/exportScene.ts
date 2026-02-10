import fs from 'node:fs';
import path from 'node:path';
import { Scenes } from 'telegraf';
import { BotContext } from '../types';
import { exportStocksCSV } from '../../services/stockService';

export const EXPORT_SCENE = 'EXPORT_SCENE';

export const exportScene = new Scenes.WizardScene<BotContext>(
  EXPORT_SCENE,
  async (ctx) => {
    await ctx.reply('Export semua produk atau per produk? ketik: all / <product_id>');
    return ctx.wizard.next();
  },
  async (ctx) => {
    if (!ctx.message || !('text' in ctx.message) || !ctx.from) return;
    ctx.session.temp = { productId: ctx.message.text.trim().toLowerCase() === 'all' ? undefined : Number(ctx.message.text.trim()) };
    await ctx.reply('Include password? ketik yes/no');
    return ctx.wizard.next();
  },
  async (ctx) => {
    if (!ctx.message || !('text' in ctx.message) || !ctx.from) return;
    const includePassword = ctx.message.text.trim().toLowerCase() === 'yes';
    const productId = ctx.session.temp?.productId as number | undefined;
    const csv = await exportStocksCSV({ productId, includePassword, actor: String(ctx.from.id) });
    fs.mkdirSync('exports', { recursive: true });
    const file = path.join('exports', `export-${Date.now()}.csv`);
    fs.writeFileSync(file, csv, 'utf8');
    await ctx.replyWithDocument({ source: file });
    return ctx.scene.leave();
  }
);
