# Backend

## Purpose
Express + PostgreSQL API. Owns all money math, stock deductions, set-aside rules, and history. Frontend never computes profit of record.

## Ownership
Owned by root `AGENTS.md`. Serves `delivery-management/` milestones M1–M5.

## Local Contracts
- Money in integers (minor units, e.g. kobo) end to end; never floats.
- Prices copied at sale time; price changes apply forward only.
- Every money edit requires reason + audit log entry. Sale-edit reasons come from the `edit_reason` lookup options (API-enforced); `Other` requires a note stored on the audit entry.
- Env: `src/config.js` is the ONLY file that reads `process.env` (frozen, validated once). It throws on missing/short `AUTH_SECRET`, missing `DATABASE_URL` in production, open CORS in production, `ALLOW_DEMO_LOGIN=true` or `SEED_DEMO=true` in production, and missing R2 in production. No other file reads env directly. Dropdown seeds (`DEFAULT_UNITS`, `DEFAULT_EDIT_REASONS`) are env-owned with documented fallbacks; owners manage values per-business via options.
- Memory mode is dev/test only; the server refuses to boot into it when `NODE_ENV=production`.
- Routes use `src/db/repo.js` only — never `store.js` arrays or `pg` directly. `repo.js` exposes one async API with memory (dev/test) and Postgres (prod) implementations switched by `DATABASE_URL`.
- `src/db/schema-m1.sql` through `schema-m7.sql` are Postgres truth; `npm run migrate` (Render pre-deploy, unpooled URL) applies each once via `schema_migrations`. New changes ship as NEW numbered files — never edit an applied one. `migrate.js` never seeds; the app never migrates on boot. m7 adds `lookup_options` + backfill + `audit_log.note`.
- Auth: JWT only (`AUTH_SECRET`, 32+ chars). Every account has a `password_hash`; no passwordless path, no token fallback. `POST /api/auth/register` is owner-only. Login is rate-limited; login/me responses carry the business record (currency/timezone source of truth).
- First owner comes from `BOOTSTRAP_*` env via `ensureBootstrap()` (empty DB only). Demo seed runs only with `SEED_DEMO=true` (+ `SEED_DEMO_PASSWORD`), dev/staging only.
- Receipts: R2 when configured (object key in DB, never a URL), local disk dev-only. Bucket stays private; viewing goes through `GET /api/receipts/:id/url` (business-scoped, 5-min signed URL). Upload content-sniffed (jpeg/png/gif/webp), size from `MAX_UPLOAD_MB`.
- HTTP: `trust proxy`, restricted CORS from `CORS_ORIGINS`, security headers, `/health` includes a DB ping (503 when unreachable), graceful SIGTERM shutdown, stdout logs with no secrets.
- Roles enforced in backend: staff cannot edit products/prices/overheads. Staff can read lookup options but POST/PATCH returns 403.
- Pickers, not typing: `lookup_options` (category/unit/supplier/overhead_name/expense_name/edit_reason) drives dropdowns; creates auto-learn values, renames propagate to TEXT columns transactionally, TEXT columns stay the source of record.

## Work Guidance
- M1: products + manual sales + receipt photo ref + daily total.
- M2: purchases, recipes, stock ledger, per-product profit.
- M3: overheads, daily accrual, saved-vs-due, gross/net close.
- M4: recurrences, reports aggregation, edits + audit, reason codes.
- M5: OCR suggestion endpoint (human confirm required), isolation by business_id.

## Verification
- `npm test` passes (runs with `NODE_ENV=test` + test `AUTH_SECRET`; covers money math, JWT-only auth, forged-token rejection, CORS, and prod config refusal).
- Hand-check 3 test days match to the minor unit.
- February / 30 / 31-day accrual tests pass (M3).
- No hardcoded products, categories, units, or expense types.

## Child DOX Index
- `src/config.js` — sole env reader + startup validation (frozen export, `validateConfig` unit-tested)
- `src/app.js` — express app factory (used by index + tests): trust proxy, CORS allowlist, security headers, login rate limit, DB-ping health
- `src/index.js` — server entry: listens on PORT, bootstrap owner + gated demo seed, graceful shutdown
- `src/store.js` — M1-M5 in-memory store (empty fixtures; tests seed their own) + audit helpers
- `src/auth.js` — JWT-only requireAuth / requireOwner / login / me / register
- `src/storage.js` — R2 vs local receipt storage, content sniffing, signed URLs
- `src/m2.js` — latest cost, stock deduct, material-cost freeze
- `src/m3.js` — calendar-aware set-aside, history-forward-only rules
- `src/routes/auth.js` — POST /api/auth/login + GET /api/auth/me
- `src/routes/products.js` — GET/POST/PATCH, owner-only writes
- `src/routes/sales.js` — POST item sale (price+cost frozen, receipt_key) + POST day-total + GET list
- `src/routes/receipts.js` — POST /api/receipts/upload (memory upload → R2/local, content-sniffed) + GET /api/receipts/:id/url and GET /api/receipts/url?key= (signed, business-scoped)
- `src/routes/reports.js` — GET daily (gross/set-aside/adjustments/net) + stock + trends (missing vs zero)
- `src/routes/ingredients.js` — CRUD + waste/spoilage adjust with reason
- `src/routes/purchases.js` — purchase + auto cost-per-unit + stock add
- `src/routes/recipes.js` — product-ingredient links
- `src/routes/overheads.js` — overhead CRUD + history + payments
- `src/routes/recurring.js` — every-N-days rules + upcoming projections
- `src/routes/adjustments.js` — reason-coded discount/refund/waste/comp
- `src/routes/edits.js` — PATCH sales with listed reason (+note for Other) + GET audit w/ note (owner)
- `src/routes/options.js` — GET/POST/PATCH lookup options (staff read-only, owner writes)
- `src/routes/ocr.js` — M5 STUB suggest only, never auto-posts
- `src/routes/alerts.js` — M5 stop: low-stock + upcoming bills (read-only)
- `src/db/` — `repo.js` (single async API: memory + pg; options learn/backfill/rename + audit note), pool (`dbMode`, Neon SSL/timeouts/retry, error handler), `migrate.js` (unpooled URL, once-per-file tracking), `schema-m1.sql` through `schema-m7.sql`
- `test/` — m1, m3, m4, m5 definition-of-done checks (M2 covered in m1 file) + auth/JWT/CORS/me checks + config startup-refusal checks + receipt upload/sniffing/scoping checks + options (backfill/learn/dedupe/staff-403/rename/edit-reason) (`helpers.js` seeds password fixtures; memory mode only)
