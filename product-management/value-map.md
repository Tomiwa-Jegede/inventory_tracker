# Value Map — Value to Deliver

> Canonical value artifact for Inventory-tracker. Tracks what value is delivered, to whom, and how it is proven — separately from how engineering delivers it (`delivery-management/`).

Agreed basics from owner Q&A: single currency for MVP (multi later), English only, mobile web + desktop, owner + staff roles, manual sales first with transient receipt photo deleted on entry (auto-read later), custom units per item, daily/weekly/monthly/custom overhead, edits allowed with history, daily summary + weekly/monthly trends in MVP. Business-first build, SaaS for others later.

## How to read this map

- A value outcome is delivered only when a stakeholder can feel it
- Status is value status, not engineering status
- Each row carries a stable Outcome ID (e.g. `V1`) that delivery milestone trackers reference as their proof-of-value target
- Each row names the owning delivery milestone(s) and the must-not-fail promise

## Value by stakeholder

| Outcome ID | Stakeholder | Value to deliver | Visible moment | Proof measure | Status | Owning delivery | Must-not-fail promise |
|---|---|---|---|---|---|---|---|
| V1 | Owner | Set up my own business: products/services, prices, categories, no hardcoding | Owner creates toast, iced coffee, burger, fries, chicken sandwich with own prices and sees them in sales screen | Can add/edit/archive a product in under 2 min; sales screen reflects it | GAP | M1 | No product, category, or expense type is hardcoded |
| V2 | Owner + Staff | Enter daily sales fast, even when busy: manual totals + transient receipt photo | Staff types day's sales money, adds product breakdown when known, snaps receipt as a temporary aid | Daily sales saved in under 1 min; no receipt images retained after entry | GAP | M1 | Busy-hour entry never blocked by missing receipt |
| V3 | Owner | Know true ingredient/material costs: purchases with item, qty, price, date, supplier, custom unit, auto cost-per-unit | Owner enters flour/oil purchase and sees cost per unit; stock left updates | 3 test purchases show correct cost-per-unit math | GAP | M2 | Cost math is explainable per unit |
| V4 | Owner | Link products to ingredients so product cost is automatic | Burger linked to bun, patty, oil; selling 5 burgers reduces stock and shows cost | Sell 1 burger deducts correct recipe qty; product cost shown | GAP | M2 | No silent wrong costs when recipe or price changes |
| V5 | Owner | See profit per product | Owner views today: burgers made X, iced coffee made Y | Per-product sales minus product cost matches manual check | GAP | M2 | Per-product numbers add up to gross profit |
| V6 | Owner | Track repeating product expenses on any interval and see what is coming | Owner sets charcoal every 3 days; app shows due dates and projection | Upcoming list shows next 3 due dates; daily history matches | GAP | M4 | No missed repeat expense; projections match calendar |
| V7 | Owner | Set aside overhead daily so rent/freezer/salary never surprises | Owner sets freezer weekly + rent monthly; app shows daily set-aside deducted from profit | Daily set-aside = amount / days in cycle; saved-vs-due shown | GAP | M3 | True profit shown after set-aside; February/month lengths handled |
| V8 | Owner | Know gross and net profit every day | Daily close shows gross (sum of product profits) and net (gross minus all set-asides) | 5 test days: gross - set-asides = net, to the kobo | GAP | M3 | Net profit formula never hides a deduction |
| V9 | Owner | See daily summary plus weekly/monthly trends and stock left | Owner opens reports: today, this week, stock remaining, upcoming bills | Reports load with correct totals; trends match daily records | GAP | M4 | Reports always match the underlying daily entries |
| V10 | Owner + Staff | Staff can help without breaking data; past mistakes can be fixed with history | Staff enters sales; only owner edits prices; correction to yesterday is logged | Staff cannot change prices; audit log shows who changed what when | GAP | M4 | No untraced change to money or past days |

## Cross-cutting value gaps

1. **Receipt auto-read** — manual + transient photo (deleted on entry) is enough for MVP; OCR comes after trust in manual numbers. Owned by M5.
2. **Multi-business / SaaS** — MVP serves one business; architecture must not block second business later. Owned by M5.
3. **Multi-currency, multi-language, offline** — deliberately deferred; single currency + English + online-first for MVP. Owned by Unassigned.

## Sequencing principle

- Every delivery milestone must make a named stakeholder feel a value outcome before the next big delivery begins
- Daily close (sales in, profit out) comes before automation (OCR, projections polish)
- Manual trust first, auto-read later; single business first, SaaS later
- Value decisions are argued here by stakeholder value and sequenced by dependency in delivery-management

## Deliberately not promised

- Receipt OCR in MVP (transient photos only, deleted on entry)
- Multi-currency, multi-language in MVP
- Offline-first in MVP (online-first, usable on phone browser)
- Multi-branch/multi-location in MVP
- Payroll, tax filing, or accounting integrations
