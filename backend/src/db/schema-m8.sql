-- Receipts ledger for transient transcription aids (delete-on-entry policy).
-- Rows exist only between upload and sale save (or explicit discard); the
-- object store holds the bytes, this table holds the keys. Nothing retained.
CREATE TABLE IF NOT EXISTS receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id),
  object_key TEXT NOT NULL,
  mime TEXT,
  size_bytes INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Sales may reference a receipt key at save time; delete-on-entry nulls it.
ALTER TABLE sales ADD COLUMN IF NOT EXISTS receipt_key TEXT;
