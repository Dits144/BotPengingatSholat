import { db } from '../config/database';

export type AdminState =
  | 'ADMIN_HOME'
  | 'ADMIN_DASHBOARD'
  | 'ADMIN_PRODUCTS'
  | 'ADMIN_PRODUCTS_ADD_NAME'
  | 'ADMIN_PRODUCTS_ADD_DESC'
  | 'ADMIN_PRODUCTS_ADD_ACTIVE'
  | 'ADMIN_VARIANTS_ADD_PRODUCT'
  | 'ADMIN_VARIANTS_ADD_NAME'
  | 'ADMIN_VARIANTS_ADD_PRICE'
  | 'ADMIN_VARIANTS_ADD_TYPE'
  | 'ADMIN_VARIANTS_ADD_DURATION'
  | 'ADMIN_VARIANTS_ADD_MAXQTY'
  | 'ADMIN_STOCK'
  | 'ADMIN_STOCK_ADD_VARIANT'
  | 'ADMIN_STOCK_ADD_MODE'
  | 'ADMIN_STOCK_ADD_PAYLOAD'
  | 'ADMIN_TOPUP'
  | 'ADMIN_ORDERS'
  | 'ADMIN_RENTALS'
  | 'ADMIN_USERS'
  | 'ADMIN_USERS_ADJUST'
  | 'ADMIN_USERS_BLACKLIST'
  | 'ADMIN_VOUCHERS'
  | 'ADMIN_VOUCHERS_ADD'
  | 'ADMIN_BROADCAST'
  | 'ADMIN_BROADCAST_WAIT'
  | 'ADMIN_SETTINGS'
  | 'ADMIN_SETTINGS_TOPUP'
  | 'ADMIN_SETTINGS_THRESHOLD'
  | 'ADMIN_SETTINGS_QRIS_WAIT_PHOTO';

export async function setAdminState(adminId: number, state: AdminState, payload?: Record<string, unknown>) {
  const existing = await db('admin_states').where({ admin_id: adminId }).first();
  if (existing) {
    await db('admin_states').where({ admin_id: adminId }).update({ state, payload_json: payload ? JSON.stringify(payload) : null, updated_at: new Date().toISOString() });
  } else {
    await db('admin_states').insert({ admin_id: adminId, state, payload_json: payload ? JSON.stringify(payload) : null, updated_at: new Date().toISOString() });
  }
}

export async function getAdminState(adminId: number): Promise<{ state: AdminState; payload: Record<string, any> } | null> {
  const row = await db('admin_states').where({ admin_id: adminId }).first();
  if (!row) return null;
  return { state: row.state as AdminState, payload: row.payload_json ? JSON.parse(row.payload_json) : {} };
}
