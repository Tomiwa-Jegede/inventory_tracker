-- M5 + cutover gaps: day totals, ocr log, password auth, sale cost freeze columns.

CREATE TABLE IF NOT EXISTS day_totals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id),
  sale_date DATE NOT NULL,
  total_minor INT NOT NULL CHECK (total_minor >= 0),
  note TEXT,
  entered_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ocr_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id),
  receipt_photo_url TEXT,
  suggestions JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS material_cost_minor INT NOT NULL DEFAULT 0;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS profit_minor INT NOT NULL DEFAULT 0;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS receipt_photo_url TEXT;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS entered_by UUID REFERENCES users(id);
CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique ON users(email);
