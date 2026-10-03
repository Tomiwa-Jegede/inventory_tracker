# Runbook — Inventory Tracker

## First boot (prod-like, local or VPS)

1. Copy env: `cp .env.example .env` and set strong `POSTGRES_PASSWORD` + `AUTH_SECRET`.
2. Start: `docker compose up --build -d`
3. Backend migrates + seeds on boot. Check: `curl localhost:4000/health` → `{"ok":true,"db":"pg",...}`
4. Open `http://localhost:8080`, login `owner@demo.test` (no password until you register passwords via `/api/auth/register`).
5. Create a real owner password: login as demo owner, then `POST /api/auth/register` with name/email/password/role.

## Pilot quickstart (demo data + smoke)

- Smoke: `BASE=http://localhost:4000 ./scripts/smoke.sh` → prints `SMOKE PASS total_minor=...`
- Demo seed (toast, iced coffee, burger, fries + buns/patties/potatoes, burger+fries recipes, freezer weekly + rent monthly, one sample sale): `BASE=http://localhost:4000 ./scripts/seed-demo.sh`
- Both verified 2026-10-03 against memory-mode backend: seed daily close gross 596,000 / set-aside 196,774 / net 399,226 with correct freezer 100,000 + October rent 96,774 lines.

## Daily ops

- Health: `GET /health` (backend), frontend on :8080 proxies `/api` + `/uploads` to backend.
- Backups: `./scripts/backup.sh` daily via cron (keeps 14 days in `./backups`). Uploads volume backed up separately if photos matter: `docker run --rm -v inventory-tracker_uploads:/u -v $(pwd)/backups:/b alpine tar czf /b/uploads-$(date +%F).tgz -C /u .`
- Restore DB: `./scripts/restore.sh backups/pg-YYYY-MM-DD.sql.gz`
- Logs: `docker compose logs -f backend db`

## What is NOT here (by design)

- No OCR provider, no billing, no multi-branch. M5 remains stub.
- Uploads stay on the `uploads` volume (local disk). S3 move is future work — URLs are already abstract (`/uploads/...` refs), so the swap is contained in `receipts.js` + nginx.
- Secrets live only in `.env` (gitignored). Never commit it.
