import { db } from '../config/database';
import { Product } from '../db/models/types';
import { nowTz } from '../utils/date';
import { logActivity } from './logService';

export async function createProduct(input: { name: string; description?: string; actor: string }) {
  await db('products').insert({
    name: input.name,
    description: input.description || null,
    created_at: nowTz().toISO()
  });
  await logActivity('ADD_PRODUCT', input.actor, { name: input.name });
}

export async function listProducts(): Promise<Product[]> {
  return db<Product>('products').orderBy('name', 'asc');
}

export async function getProductById(id: number): Promise<Product | undefined> {
  return db<Product>('products').where({ id }).first();
}
