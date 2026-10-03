# Backend

## Purpose
Express + PostgreSQL API. Owns all money math, stock deductions, set-aside rules, and history. Frontend never computes profit of record.

## Ownership
Owned by root `AGENTS.md`. Serves `delivery-management/` milestones M1–M5.

## Local Contracts
- Money in integers (minor units, e.g. kobo) end to end; never floats.
- Prices copied at sale time; price changes apply forward only.
- Every money edit requires reason + audit log entry.
- Routes use `src/db/repo.js` only — never `store.js` arrays or `pg` directly. `repo.js` exposes one async API with memory (dev/pilot) and Postgres (prod) implementations switched by `DATABASE_URL`.
- `src/db/schema-m1.sql` through `schema-m5.sql` are Postgres truth; `npm run migrate` applies them + pgcrypto + unique email + seed. `ensureSeed` also runs on boot in pg mode.
- Without `DATABASE_URL`, API runs in memory mode with identical shapes; `/health` reports `db` mode.
- Auth: JWT when user has password (bcrypt, `AUTH_SECRET`), demo token fallback for seeded pilot accounts; `POST /api/auth/register` is owner-only.
- Roles enforced in backend: staff cannot edit products/prices/overheads.

## Work Guidance
- M1: products + manual sales + receipt photo ref + daily total.
- M2: purchases, recipes, stock ledger, per-product profit.
- M3: overheads, daily accrual, saved-vs-due, gross/net close.
- M4: recurrences, reports aggregation, edits + audit, reason codes.
- M5: OCR suggestion endpoint (human confirm required), isolation by business_id.

## Verification
- `npm test` passes; hand-check 3 test days match to the minor unit.
- February / 30 / 31-day accrual tests pass (M3).
- No hardcoded products, categories, units, or expense types.

## Child DOX Index
- `src/app.js` — express app factory (used by index + tests)
- `src/index.js` — server entry, listens on PORT
- `src/store.js` — M1-M5 in-memory store shaped like schema (swap to pg later) + token + audit helpers
- `src/auth.js` — requireAuth / requireOwner + demo login
- `src/m2.js` — latest cost, stock deduct, material-cost freeze
- `src/m3.js` — calendar-aware set-aside, history-forward-only rules
- `src/routes/auth.js` — POST /api/auth/login
- `src/routes/products.js` — GET/POST/PATCH, owner-only writes
- `src/routes/sales.js` — POST item sale (price+cost frozen) + POST day-total + GET list
- `src/routes/receipts.js` — POST /api/receipts/upload (images only, backup, no OCR)
- `src/routes/reports.js` — GET daily (gross/set-aside/adjustments/net) + stock + trends (missing vs zero)
- `src/routes/ingredients.js` — CRUD + waste/spoilage adjust with reason
- `src/routes/purchases.js` — purchase + auto cost-per-unit + stock add
- `src/routes/recipes.js` — product-ingredient links
- `src/routes/overheads.js` — overhead CRUD + history + payments
- `src/routes/recurring.js` — every-N-days rules + upcoming projections
- `src/routes/adjustments.js` — reason-coded discount/refund/waste/comp
- `src/routes/edits.js` — PATCH sales with reason + GET audit (owner)
- `src/routes/ocr.js` — M5 STUB suggest only, never auto-posts
- `src/routes/alerts.js` — M5 stop: low-stock + upcoming bills (read-only)
- `src/db/` — `repo.js` (single async API: memory + pg), pool (`dbMode`), `migrate.js`, `schema-m1.sql` through `schema-m5.sql`
- `test/` — m1, m3, m4, m5 definition-of-done checks (M2 covered in m1 file) + auth password/JWT checks (run in memory mode)
