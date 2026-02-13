export type Role = 'ADMIN' | 'USER';

export type AccountStatus = 'AVAILABLE' | 'SOLD' | 'RENTED' | 'RENT_EXPIRED' | 'EXPIRED';

export type RentalStatus = 'ACTIVE' | 'ENDED';

export interface Product {
  id: number;
  name: string;
  description?: string | null;
  created_at: string;
}

export interface User {
  id: number;
  telegram_id: number;
  username?: string | null;
  role: Role;
  logged_in_at: string;
}
