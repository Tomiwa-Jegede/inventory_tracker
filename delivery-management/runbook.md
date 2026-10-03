# Runbook — Inventory Tracker

Deploy targets: **backend on Render · frontend on Cloudflare Pages ·
database on Neon (Postgres) · receipts on Cloudflare R2 (private bucket).**

## First deploy (staging first, then production)

Use a **separate Neon branch/project for staging** so tests never touch
production data.

1. **Neon:** create project ( + staging branch). Copy the **pooled**
   connection string → `DATABASE_URL`, the **direct** string →
   `DATABASE_URL_UNPOOLED`. Both with `?sslmode=require`.
2. **R2:** create a **private** bucket + API token. Note account ID, key ID,
   secret, bucket name → `R2_*` vars.
3. **Render (backend Web Service):**
   - Runtime: Docker with `backend/Dockerfile`, or native Node 22, root `backend`
   - Build: `npm ci --omit=dev` · Start: `node src/index.js`
   - Pre-deploy: `node src/db/migrate.js` (migrations run once per file via
     `schema_migrations`; never in the start command)
   - Health check path: `/health` (includes a DB ping; 503 = DB unreachable)
   - Env: every variable in `backend/.env.example`
   - First deploy only: set `BOOTSTRAP_BUSINESS_NAME/_OWNER_NAME/_OWNER_EMAIL/_OWNER_PASSWORD`.
     The app creates the first business + owner when no users exist.
     **Remove `BOOTSTRAP_OWNER_PASSWORD` right after first login.**
4. **Cloudflare Worker (frontend):** framework Vite (React), root `frontend`,
   build `npm run build`, output `dist`, deploy `npx wrangler deploy`.
   `frontend/wrangler.jsonc` serves `dist/` with SPA fallback
   (`not_found_handling: single-page-application`) — do NOT add
   `public/_redirects` (Workers rejects `/* /index.html` as an infinite loop).
   Set `VITE_API_URL` (e.g. `https://your-api.onrender.com`, no trailing slash) and
   `NODE_VERSION=22`. `VITE_*` is baked in at build time and public — changing
   it requires a redeploy. Never put secrets in `VITE_*`.
5. **Verify:** `BASE=... EMAIL=... PASSWORD=... ./scripts/smoke.sh`
   against staging first, then production. Deep-link refresh must not 404
   (Worker SPA fallback handles routing).

## Local dev (docker-compose)

1. `cp .env.example .env`, fill in `POSTGRES_PASSWORD`, `AUTH_SECRET`
   (`openssl rand -hex 32`), and `BOOTSTRAP_OWNER_*`.
2. `docker compose up --build -d`
3. `curl localhost:4000/health` → `{"ok":true,"db":"pg",...}`
4. Open `http://localhost:8080`, log in as the bootstrap owner.
5. Optional explicit demo data: `SEED_DEMO=true SEED_DEMO_PASSWORD=...`
   (dev/staging only — production refuses to boot with it). Or API-seed via
   `scripts/seed-demo.sh` (needs `BASE/EMAIL/PASSWORD`, no defaults).

## Daily ops

- Health: `GET /health` (backend, includes DB ping). Frontend has no server —
  it is static hosting plus `VITE_API_URL`.
- Cold starts: Render free instances sleep (first request 30–60s) and Neon
  suspends idle DBs (first query 1s+). The backend retries once; the frontend
  API helper retries network failures with backoff. For daily business use,
  prefer a paid Render instance.
- Backups: `./scripts/backup.sh` daily via cron (keeps 14 days in `./backups`).
  With `DATABASE_URL_UNPOOLED` set it backs up Neon directly; otherwise the
  local compose db. Neon point-in-time restore is the primary safety net —
  know your plan's retention.
- Restore DB: `DATABASE_URL_UNPOOLED=... ./scripts/restore.sh backups/pg-YYYY-MM-DD.sql.gz`
- Receipts: R2 bucket is private; the app mints 5-minute signed URLs via
  `GET /api/receipts/:id/url` (business-scoped). No backup needed beyond R2.
- Logs: stdout only. Never log `AUTH_SECRET`, passwords, or connection strings.
- Migrations: add new changes as new `schema-mN.sql` files, never edit an
  applied one. `schema-m1.sql` keeps its historical defaults; `schema-m6.sql`
  neutralized business defaults for new rows.

## Rotating AUTH_SECRET

1. Generate: `openssl rand -hex 32`.
2. Set the new value in Render, restart the backend.
3. All sessions invalidate at once (JWTs are signed with it) — every user logs
   in again. That is expected; announce it first.

## Adding users

Log in as owner, then `POST /api/auth/register` with
`name/email/password (8+ chars)/role (owner|staff)`. There is no public
signup; registration is owner-only. Every account has a password — no
passwordless login exists.

## What is NOT here (by design)

- No OCR provider, no billing, no multi-branch. M5 remains stub.
- No secrets in repo. `.env` and `.env.*` (except `*.example`) are gitignored.
- `frontend/nginx.conf` + `frontend/Dockerfile` are **local-only**
  (docker-compose). Production frontend is Cloudflare Pages.
- The single intentional exception to "no demo data in source":
  `backend/src/db/repo.js seedDemo()` runs only with `SEED_DEMO=true`
  (dev/staging), and `schema-m1.sql` keeps frozen historical defaults that
  `schema-m6.sql` neutralizes going forward.
