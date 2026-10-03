# Inventory Tracker

Flexible daily sales, expense, and profit tracking for any small business.
You configure your own products, categories, and expenses — nothing about any
specific business is hardcoded.

**Deploy targets:** backend on Render (Docker) · frontend on Cloudflare Pages ·
database on Neon (Postgres) · receipt storage on Cloudflare R2.

## Local setup

Requirements: Node 22, Docker (for the local Postgres).

```sh
cp .env.example .env
# Fill in POSTGRES_PASSWORD, AUTH_SECRET (openssl rand -hex 32),
# and BOOTSTRAP_OWNER_* for the first owner.
docker compose up --build -d
curl localhost:4000/health
```

Open `http://localhost:8080` and log in with the bootstrap owner.
Remove `BOOTSTRAP_OWNER_PASSWORD` from `.env` after first login.

Sample data (needs an existing owner):

```sh
BASE=http://localhost:4000 EMAIL=owner@example.com PASSWORD=... ./scripts/seed-demo.sh
BASE=http://localhost:4000 EMAIL=... PASSWORD=... ./scripts/smoke.sh
```

## Repo layout

- `backend/` — Express API. Owns all money math. `src/config.js` is the only
  file that reads env; startup fails fast on missing/invalid config.
- `frontend/` — React + Vite app. All API calls go through `src/lib/api.js`
  with `VITE_API_URL`; money formats from the business record.
- `delivery-management/runbook.md` — deploy steps (Render, Cloudflare Pages,
  Neon, R2), secret rotation, restore, adding users. The deploy truth.
- `product-management/` — what value to deliver (plain language).
- `scripts/` — `smoke.sh`, `seed-demo.sh`, `backup.sh`, `restore.sh`.
- `docker-compose.yml` — local dev only (Postgres + backend + nginx frontend).

## Deployment (summary)

1. **Neon:** create project + staging branch. Pooled URL → `DATABASE_URL`,
   direct URL → `DATABASE_URL_UNPOOLED` (`?sslmode=require`).
2. **R2:** create private bucket + API token → `R2_*` vars.
3. **Render:** Web Service, root `backend`, build `npm ci --omit=dev`,
   start `node src/index.js`, pre-deploy `node src/db/migrate.js`,
   health path `/health`. Set all backend env vars (see `backend/.env.example`).
   First deploy only: `BOOTSTRAP_*` to create the first owner.
4. **Cloudflare Pages:** root `frontend`, build `npm run build`, output `dist`,
   `VITE_API_URL=https://your-api.onrender.com`, `NODE_VERSION=22`.
5. Run `scripts/smoke.sh` against staging first, then production.

Details: `delivery-management/runbook.md`. Every env var: `backend/.env.example`,
`frontend/.env.example`.
