CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  reference TEXT NOT NULL UNIQUE,
  customer_name TEXT NOT NULL,
  email TEXT NOT NULL,
  occasion TEXT NOT NULL,
  musical_style TEXT NOT NULL,
  story TEXT NOT NULL,
  amount INTEGER NOT NULL,
  currency TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','in_progress','delivered','refunded','cancelled')),
  created_at TEXT NOT NULL,
  paid_at TEXT,
  delivered_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_orders_status_created ON orders(status, created_at);
CREATE INDEX IF NOT EXISTS idx_orders_email ON orders(email);
