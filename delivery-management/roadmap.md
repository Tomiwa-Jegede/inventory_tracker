# Product Roadmap

## Purpose

Sequences the Inventory-tracker build from usable daily close to profit truth to automation, tracking what ships in which milestone.

## Product North Star

At the end of each day, the owner knows exactly how much was made, how much it cost, and how much profit was earned — in total and per product — with money already set aside for upcoming bills.

## Product Surfaces

### Current Core Surfaces

- `web app (mobile + desktop)` — business setup, sales entry, costs/stock, overhead set-aside, daily close, reports. Mobile browser must be fast enough for busy hours; desktop for setup and trends.

### Planning Focus Areas

- Daily close loop that works on a busy day
- True profit after overhead set-aside
- Trust: corrections with history, no hidden math
- SaaS-ready shape without building SaaS in MVP

## Architecture Boundary

- `frontend (React)` — screens, forms, reports display; no profit math of record
- `backend (Express + PostgreSQL)` — owns all money math, stock deductions, set-aside rules, history
- `database` — single source of truth for sales, purchases, recipes, expenses, audit log

Product semantics should stay in the correct layer.

## Milestone Map

Trackers `milestone-1.md` through `milestone-5.md` each deliver a stakeholder-feelable outcome. MVP = M1 through M4. M5 is post-MVP.

### Milestone 1: Usable daily sales + setup (MVP)

- Goal: Owner sets up own products and staff can record a day's sales in under a minute.
- Includes: auth + roles (owner/staff), business setup (products, prices, categories, single currency), manual daily sales + receipt photo, basic daily summary
- Status summary: In progress — build done, pilot pending
- Tracker: see [`milestone-1.md`](./milestone-1.md)

### Milestone 2: Costs, recipes, per-product profit (MVP)

- Goal: Each sale automatically carries its true ingredient cost.
- Includes: purchases with custom units + auto cost-per-unit, stock on hand, product-to-ingredient recipes, per-product profit, gross profit
- Status summary: Complete — build done, tested
- Tracker: see [`milestone-2.md`](./milestone-2.md)

### Milestone 3: Overhead set-aside + true net profit (MVP)

- Goal: Daily profit shown after money is set aside for rent, freezer, salaries, power.
- Includes: overhead with daily/weekly/monthly/custom + next due date, daily set-aside math, saved-vs-due tracking, gross vs net on daily close
- Status summary: Complete — build done, tested
- Tracker: see [`milestone-3.md`](./milestone-3.md)

### Milestone 4: Repeats, reports, corrections (MVP)

- Goal: Owner trusts the books across weeks and can fix mistakes safely.
- Includes: recurring product expenses + projections, weekly/monthly trends + stock + upcoming bills, edit past days with audit log, discount/refund/waste reason codes
- Status summary: Complete — build done, tested (MVP complete)
- Tracker: see [`milestone-4.md`](./milestone-4.md)

### Milestone 5: Automation + SaaS shape (Post-MVP)

- Goal: Less typing, ready to serve other businesses.
- Includes: receipt OCR stub (suggest only, human confirm) + low-stock alerts + isolation groundwork; provider, billing, offline queue not built
- Status summary: Stop point reached — stub only
- Tracker: see [`milestone-5.md`](./milestone-5.md)

## Sequencing Rules

- M1 before M2: no cost math without products and sales to attach to.
- M2 before M3: net profit needs trusted product profit first.
- M3 before M4 trends: weekly/monthly means nothing if daily net is wrong.
- OCR never before manual trust (M5 after M1–M4).
- Any milestone must keep past days recalculable and explainable.

## Regression Guardrails

- Money math covered by backend tests with known examples (burger day, slow day, February).
- Past-day edits must re-run dependent totals; reports must match daily entries.
- No hardcoded products, categories, units, or expense types in any milestone.
- Mobile sales entry stays under 1 minute; desktop reports stay readable.
