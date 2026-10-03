-- M4 follow-up (wayfinder #4 → #5): backfill replaces quick totals.
-- A superseded quick total stays visible in history but leaves every close.

ALTER TABLE day_totals ADD COLUMN IF NOT EXISTS superseded BOOLEAN NOT NULL DEFAULT false;
