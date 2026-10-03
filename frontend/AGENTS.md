# Frontend

## Purpose
React mobile-first UI. Displays data, collects input fast. Never computes profit of record — backend owns truth.

## Ownership
Owned by root `AGENTS.md`. Serves `delivery-management/` milestones M1–M5.

## Local Contracts
- Mobile-first sales entry: save a sale in under 1 minute on phone browser.
- Money displayed from backend integers only; no local profit math. Currency/timezone come from the business record (login response / `GET /api/auth/me`), formatted in `src/lib/money.js` — never from env or hardcoded constants.
- Env: `src/config.js` is the only place that reads `import.meta.env` (`VITE_API_URL`, `VITE_APP_NAME`, `UPCOMING_COUNT`). `VITE_*` is public build-time config; changing it requires a redeploy.
- All API calls go through `src/lib/api.js` (`apiFetch`/`apiUpload`): prefixes `VITE_API_URL`, attaches the sessionStorage token, clears session on 401, retries network failures with backoff (Render/Neon cold starts). No raw `fetch('/api...')` in pages.
- Session (token + user + business) persists in sessionStorage; refresh keeps you logged in, 401 logs you out. Plain email + password login, no defaults.
- SPA routing: production is a Cloudflare Worker (`wrangler.jsonc`, `assets.not_found_handling: single-page-application`) so deep links and refreshes do not 404. Do NOT add `public/_redirects` — Workers static assets reject `/* /index.html` rules as an infinite loop and the deploy fails.
- `nginx.conf` + `Dockerfile` are LOCAL ONLY (docker-compose dev). Production frontend is the Cloudflare Worker serving `dist/`.
- Dev proxy `/api` → `VITE_DEV_API_TARGET` (default `http://localhost:4000`); no hardcoded prod URLs. Unauthenticated visits go to `/login`; 401 anywhere clears session and returns to `/login`.
- Router (`react-router-dom`): `/` Today, `/sell` Sell, `/stock` Stock tabs, `/stock/ocr/:id` OCR review, `/reports` Reports, `/more/*` setup, `/login`. Browser back works; unauthenticated → `/login`; staff → `/` on owner routes.
- Role nav: staff see Today, Sell, More (account/logout only); staff Today shows sales total + entries for today + yesterday only, no profit/set-asides.
- Sell is search-first (30+ products): search + category chips, tile tap to add/increment, total bar pinned, quick-total mode, optional receipt photo that never blocks save.
- Today exports daily entries to CSV (MVP requirement).
- `src/styles.css` — single token system (type, spacing, radius, 48px targets, light/dark); all screens use tokens (only data-driven chart bar heights remain inline).
- `src/pages/Setup.jsx` — Products: Active/Archived filter, add/edit Sheet, archive (never delete); price edits apply forward only.
- `src/pages/Recipes.jsx` — product → ingredients with estimated cost preview (latest-purchase estimate; record cost stays backend-frozen).
- `src/pages/Overheads.jsx` — overheads with daily set-aside rate, payment recording.
- `src/pages/Recurring.jsx` — repeats with next 3 due dates each.
- `src/pages/Sell.jsx` — daily sales entry (M1); receipt photo optional, never blocking.
- `src/pages/Today.jsx` — daily close home (M1-M3 numbers, backend only); staff variant sales-only.
- Past-data edits always require a listed reason (+note for Other) and surface an Edited badge; audit shows who/what/before-after/reason/note/when.
- Pickers, not typing: `ComboSelect` (in `components/ui.jsx`) serves learned lists (category/unit/supplier/overhead_name/expense_name) with search, inline add, MRU order and dedupe; fixed lists (reasons, intervals, periods, cycles) use native selects/segmented controls. Staff get read-only pickers (`allowAdd=false`, server 403s). Last-used supplier/category remembered per device.

## Work Guidance
- UI plan v1.0 fully built: design system + router shell + all screens (Today, Sell, Products, Recipes, Overheads, Recurring, Stock/Purchases/Ingredients/Receipts, Reports + Audit, OCR confirm).
- Don't-Type brief built: ComboSelect learned lists + fixed selects/presets + More > Lists; no categorical field is a plain text input.
- M1: setup + sales + daily total, usable on phone.
- M2: purchases, recipes, stock, per-product views.
- M3: overhead setup, set-aside status, gross/net card.
- M4: reports, trends, edits with reason, audit view.
- M5: OCR review screen (confirm before save), alerts.

## Verification
- `npm run build` passes; sales flow timed under 1 minute.
- Staff view cannot reach price/overhead edits (route + backend check).
- No hardcoded products, prices, or currencies in UI.

## Child DOX Index
- `src/App.jsx` — router shell, sessionStorage session, owner guards, lazy routes
- `src/config.js` — env only: `VITE_API_URL`, `VITE_APP_NAME`, `UPCOMING_COUNT`
- `src/lib/money.js` — business-prefs currency format + major→minor parse only
- `src/lib/api.js` — session helpers, auth fetch + upload w/ wake-retry, 401 expire, CSV export
- `src/components/ui.jsx` — Button, Field, Money, Card, StatCard, ListRow, Badge, EmptyState, Skeleton, Toast, Sheet, Confirm, ComboSelect
- `src/components/AppShell.jsx` — sidebar + bottom nav, role-filtered
- `src/styles.css` — tokens + layout + components
- `src/pages/Login.jsx` — email/password card, show/hide, inline error
- `src/pages/Today.jsx` — home: hero net, sales/gross, expandable math, set-asides, alerts, CSV
- `src/pages/Sell.jsx` — search-first grid, cart + total bar, quick total, optional photo
- `src/pages/More.jsx` — owner setup links; staff account/logout only
- `src/pages/Stock.jsx` — tabs: Purchases | Ingredients | Receipts
- `src/pages/Purchases.jsx` — grouped by date, unit-aware quantity, last-price prefill, quick quantities, supplier ComboSelect
- `src/pages/Ingredients.jsx` — stock list + low badge, detail w/ purchase + adjustment history, remove/add segmented adjust with readable reasons
- `src/pages/Receipts.jsx` — sales with receipt photos, pending-review badges
- `src/pages/Recurring.jsx` — name ComboSelect, interval presets + first due date, next 3 due dates
- `src/pages/Setup.jsx` — Products: Active/Archived filter, add/edit Sheet, category ComboSelect, archive
- `src/pages/Recipes.jsx` — product → ingredients + cost preview, unit on qty field
- `src/pages/Overheads.jsx` — overheads + name ComboSelect, daily rate, per-row payments with picker
- `src/pages/Reports.jsx` — Daily/Weekly/Monthly/Products/Audit tabs, period presets, edit-with-listed-reason, trust-check total row
- `src/pages/Lists.jsx` — More > Lists: rename/archive/restore dropdown values per kind (owner)
- `src/pages/OcrReview.jsx` — receipt image + editable suggestions, confirm-before-save only
- `wrangler.jsonc` — Worker deploy config (serves `dist/`, SPA fallback); never add `public/_redirects`
- `.env.example` — public build-time vars (`VITE_API_URL`, `VITE_APP_NAME`, dev proxy target)
- `vite.config.js` — dev server + api proxy (env target, local only)
