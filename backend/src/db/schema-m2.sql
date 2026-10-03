-- M2: ingredients, purchases, recipes, stock adjustments
-- Money integers; stock qty in user-defined base units (numbers).

CREATE TABLE IF NOT EXISTS ingredients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id),
  name TEXT NOT NULL,
  unit TEXT NOT NULL DEFAULT 'piece',
  stock_qty NUMERIC NOT NULL DEFAULT 0,
  low_stock_level NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id),
  ingredient_id UUID NOT NULL REFERENCES ingredients(id),
  qty NUMERIC NOT NULL CHECK (qty > 0),
  total_minor INT NOT NULL CHECK (total_minor >= 0),
  cost_per_unit_minor INT NOT NULL,
  purchase_date DATE NOT NULL,
  supplier TEXT,
  note TEXT,
  entered_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id),
  product_id UUID NOT NULL REFERENCES products(id),
  ingredient_id UUID NOT NULL REFERENCES ingredients(id),
  qty_per_sale NUMERIC NOT NULL CHECK (qty_per_sale > 0),
  UNIQUE (product_id, ingredient_id)
);

CREATE TABLE IF NOT EXISTS stock_adjustments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id),
  ingredient_id UUID NOT NULL REFERENCES ingredients(id),
  qty_change NUMERIC NOT NULL,
  reason TEXT NOT NULL,
  entered_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- M2: freeze material cost on sales
-- ALTER TABLE sales ADD COLUMN IF NOT EXISTS material_cost_minor INT NOT NULL DEFAULT 0;
-- ALTER TABLE sales ADD COLUMN IF NOT EXISTS profit_minor INT NOT NULL DEFAULT 0;
