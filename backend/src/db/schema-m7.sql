-- Lookup options for "don't type" dropdowns (categories, units, suppliers,
-- overhead names, expense names, edit reasons). Drives the pickers; existing
-- TEXT columns stay the source of record (no data migration).
CREATE TABLE IF NOT EXISTS lookup_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id),
  kind TEXT NOT NULL CHECK (kind IN ('category', 'unit', 'supplier', 'overhead_name', 'expense_name', 'edit_reason')),
  value TEXT NOT NULL,
  archived BOOLEAN NOT NULL DEFAULT false,
  last_used_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- Expression uniqueness needs an index: UNIQUE constraints take plain
-- columns only in Postgres.
CREATE UNIQUE INDEX IF NOT EXISTS lookup_options_biz_kind_value
  ON lookup_options (business_id, kind, lower(value));

-- Sale-edit notes live beside the reason on the audit entry.
ALTER TABLE audit_log ADD COLUMN IF NOT EXISTS note TEXT;

-- Backfill: current distinct values appear in dropdowns on day one.
INSERT INTO lookup_options (business_id, kind, value)
SELECT DISTINCT business_id, 'category', btrim(category) FROM products
WHERE category IS NOT NULL AND btrim(category) <> '' ON CONFLICT DO NOTHING;
INSERT INTO lookup_options (business_id, kind, value)
SELECT DISTINCT business_id, 'unit', btrim(unit) FROM ingredients
WHERE unit IS NOT NULL AND btrim(unit) <> '' ON CONFLICT DO NOTHING;
INSERT INTO lookup_options (business_id, kind, value)
SELECT DISTINCT business_id, 'supplier', btrim(supplier) FROM purchases
WHERE supplier IS NOT NULL AND btrim(supplier) <> '' ON CONFLICT DO NOTHING;
INSERT INTO lookup_options (business_id, kind, value)
SELECT DISTINCT business_id, 'overhead_name', btrim(name) FROM overheads
WHERE name IS NOT NULL AND btrim(name) <> '' ON CONFLICT DO NOTHING;
INSERT INTO lookup_options (business_id, kind, value)
SELECT DISTINCT business_id, 'expense_name', btrim(name) FROM recurring_rules
WHERE name IS NOT NULL AND btrim(name) <> '' ON CONFLICT DO NOTHING;
