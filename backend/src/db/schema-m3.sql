-- M3: overheads, payments
-- Daily set-aside = amount / days in cycle, calendar-aware.

CREATE TABLE IF NOT EXISTS overheads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id),
  name TEXT NOT NULL,
  amount_minor INT NOT NULL CHECK (amount_minor >= 0),
  frequency TEXT NOT NULL CHECK (frequency IN ('daily','weekly','monthly','custom')),
  custom_days INT,
  next_due_date DATE NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS overhead_history (
  overhead_id UUID NOT NULL REFERENCES overheads(id),
  amount_minor INT NOT NULL,
  frequency TEXT NOT NULL,
  custom_days INT,
  from_date DATE NOT NULL,
  PRIMARY KEY (overhead_id, from_date)
);

CREATE TABLE IF NOT EXISTS overhead_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id),
  overhead_id UUID NOT NULL REFERENCES overheads(id),
  amount_minor INT NOT NULL,
  paid_date DATE NOT NULL,
  note TEXT,
  entered_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
