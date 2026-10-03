# Milestone 3: Overhead set-aside + true net profit

## Goal

Owner sees true daily profit after money is set aside for rent, freezer, salaries, and power.

## Scope

- Overhead list: name, amount, frequency (daily/weekly/monthly/custom days), next due date, active/paused
- Daily set-aside = amount / days in cycle; calendar-aware (28/29/30/31-day months)
- Daily close shows: gross profit, total set-aside today, net profit = gross minus all set-asides
- Saved-vs-due tracker per overhead + upcoming due dates; early/late payment marking; amount-change mid-cycle (e.g. rent increase) applies forward only
- Slow-day rule: set-aside still accrues; shortfall is shown plainly (saved < due)

## Non-Goals

- No recurring product-expense projections (M4)
- No weekly/monthly trend charts (M4)
- No automatic payments or bank integration

## Ownership Boundaries

- frontend — overhead setup, due list, daily close card (gross/set-aside/net), shortfall warning
- backend — set-aside accrual, calendar math, saved-vs-due, payment marking, mid-cycle change rules
- database — overheads, accrual ledger, payments

## Execution Order

1. Overhead CRUD + frequency + next-due + daily set-aside math
2. Daily close (gross/set-aside/net) + saved-vs-due
3. Edge rules: early/late, amount change, pause/end mid-cycle, February/short months

## Value Outcome

Delivers `product-management/value-map.md` outcome V7 — Set aside overhead daily, V8 — Know gross and net profit every day. Delivery status is not a claim of visible value; the milestone is done only when the stakeholder can feel this outcome.

## Status

Complete — build done, tested

- Current status summary: Overhead CRUD with daily/weekly/monthly/custom, calendar-aware accrual, history-forward-only changes, payments, gross/set-aside/net + shortfall live; February + slow-day checks pass
- Remaining work: Real-shop pilot only

## Verification / Definition of Done

- Weekly 7000 freezer = 1000/day; monthly 30000 rent accrues correctly in 28/30/31-day months and February leap year
- 5 test days: gross minus set-asides equals net to the kobo
- Rent increase mid-cycle changes future accrual only; past days unchanged
- Slow day with sales < set-aside shows negative net + shortfall, does not hide it

## Regression Guardrails

- No hidden deductions; every kobo of set-aside is listed by overhead name
- Ending/pausing an overhead stops future accrual but keeps history
- Due-date math uses real calendar, not fixed 30-day months
