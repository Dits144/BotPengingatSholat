export type StockStatus = 'AVAILABLE' | 'SOLD' | 'EXPIRED' | 'RESERVED';

export interface Product {
  id: number;
  name: string;
  default_duration_months: number;
  default_duration_days: number;
  price?: number | null;
  note?: string | null;
  created_at: string;
  updated_at: string;
}

export interface StockAccount {
  id: number;
  product_id: number;
  email_encrypted: string;
  password_encrypted: string;
  added_at: string;
  start_at?: string | null;
  expires_at?: string | null;
  status: StockStatus;
  sold_to?: string | null;
  sold_at?: string | null;
  note?: string | null;
  activate_on_sale: number;
  duration_months: number;
  duration_days: number;
}
