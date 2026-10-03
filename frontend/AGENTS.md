# Frontend

## Purpose
React mobile-first UI. Displays data, collects input fast. Never computes profit of record — backend owns truth.

## Ownership
Owned by root `AGENTS.md`. Serves `delivery-management/` milestones M1–M5.

## Local Contracts
- Mobile-first sales entry: save a sale in under 1 minute on phone browser.
- Money displayed from backend integers only; no local profit math.
- `src/pages/Setup.jsx` — business/product setup (M1).
- `src/pages/Sales.jsx` — daily sales entry (M1); receipt photo added in M1 build.
- `src/pages/DailyClose.jsx` — daily total (M1); gross/net, trends added M2–M4.
- Dev proxy `/api` → `http://localhost:4000`; no hardcoded prod URLs.

## Work Guidance
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
- `src/App.jsx` — session shell, loads products + daily on login
- `src/pages/Login.jsx` — demo login (owner / staff / owner2)
- `src/pages/Setup.jsx` — owner-only product setup
- `src/pages/Sales.jsx` — item sale + quick total + receipt photo
- `src/pages/DailyClose.jsx` — daily gross/set-aside/adjustments/net + shortfall (backend numbers only)
- `src/pages/Costs.jsx` — M2 ingredients + purchases + stock list
- `src/pages/Recipes.jsx` — M2 product-ingredient links
- `src/pages/Overheads.jsx` — M3 overhead setup + daily rate list
- `src/pages/Reports.jsx` — M4 trends + upcoming + audit view
- `src/pages/OcrReview.jsx` — M5 STUB review only, confirm via sales
- `vite.config.js` — dev server + api proxy
