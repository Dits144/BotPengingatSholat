CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  default_duration_months INTEGER NOT NULL DEFAULT 0,
  default_duration_days INTEGER NOT NULL DEFAULT 30,
  price NUMERIC NULL,
  note TEXT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS stock_accounts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL,
  email_encrypted TEXT NOT NULL,
  password_encrypted TEXT NOT NULL,
  added_at TEXT NOT NULL,
  start_at TEXT NULL,
  expires_at TEXT NULL,
  status TEXT NOT NULL,
  sold_to TEXT NULL,
  sold_at TEXT NULL,
  note TEXT NULL,
  activate_on_sale INTEGER NOT NULL DEFAULT 0,
  duration_months INTEGER NOT NULL DEFAULT 0,
  duration_days INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY(product_id) REFERENCES products(id)
);

CREATE TABLE IF NOT EXISTS activity_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  action TEXT NOT NULL,
  actor TEXT NOT NULL,
  payload TEXT NULL,
  created_at TEXT NOT NULL
);
