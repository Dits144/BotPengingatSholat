import { db } from '../config/database';
import { nowTz } from '../utils/date';
import { Product } from '../db/models/types';

export async function createProduct(input: {
  name: string;
  defaultDurationMonths: number;
  defaultDurationDays: number;
  note?: string;
  price?: number;
}) {
  const now = nowTz().toISO();
  await db('products').insert({
    name: input.name,
    default_duration_months: input.defaultDurationMonths,
    default_duration_days: input.defaultDurationDays,
    note: input.note || null,
    price: input.price ?? null,
    created_at: now,
    updated_at: now
  });
}

export async function listProducts(): Promise<Product[]> {
  return db('products').orderBy('name', 'asc');
}

export async function getProductById(id: number): Promise<Product | undefined> {
  return db('products').where({ id }).first();
}
