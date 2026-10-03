-- M1 scaffold: business, users, products, sales
-- Money stored as integers (minor units, e.g. kobo). Never floats.
-- M2 adds: ingredients, purchases, recipes, stock_ledger
-- M3 adds: overheads, accruals, payments
-- M4 adds: recurring_rules, occurrences, adjustments, audit_log

CREATE TABLE IF NOT EXISTS businesses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'NGN',
  timezone TEXT NOT NULL DEFAULT 'Africa/Lagos',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'staff' CHECK (role IN ('owner','staff')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id),
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'General',
  price_minor INT NOT NULL CHECK (price_minor >= 0),
  is_active BOOLEAN NOT NULL DEFAULT true,
  tracks_stock BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id),
  product_id UUID NOT NULL REFERENCES products(id),
  sale_date DATE NOT NULL,
  qty INT NOT NULL CHECK (qty > 0),
  price_minor INT NOT NULL CHECK (price_minor >= 0),
  total_minor INT NOT NULL CHECK (total_minor >= 0),
  receipt_photo_url TEXT,
  entered_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
