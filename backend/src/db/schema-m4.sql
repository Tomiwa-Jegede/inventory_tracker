-- M4: recurring rules, adjustments, audit log

CREATE TABLE IF NOT EXISTS recurring_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id),
  name TEXT NOT NULL,
  amount_minor INT NOT NULL,
  interval_days INT NOT NULL CHECK (interval_days > 0),
  next_due_date DATE NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS adjustments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id),
  type TEXT NOT NULL DEFAULT 'adjustment',
  sale_date DATE NOT NULL,
  amount_minor INT NOT NULL CHECK (amount_minor >= 0),
  reason TEXT NOT NULL CHECK (reason IN ('discount','refund','waste','spoilage','comp','correction','other')),
  note TEXT,
  entered_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id),
  actor UUID REFERENCES users(id),
  action TEXT NOT NULL,
  target TEXT,
  before_json JSONB,
  after_json JSONB,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
