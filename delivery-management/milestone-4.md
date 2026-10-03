# Milestone 4: Repeats, reports, corrections

## Goal

Owner trusts the books across weeks and can fix mistakes safely without losing history.

## Scope

- Recurring product-related expenses: name, amount, custom interval (e.g. every 3 days), next due; auto daily history + future projection list
- Reports: daily summary, per-product profit, stock remaining, upcoming expenses, overhead set-aside status, week/month trends
- Corrections: edit past sales, purchases, expenses, overhead with reason; full audit log (who, what, when, before/after); dependent totals re-run
- Reason codes: discount, refund, waste/spoilage, comp — so totals that do not match have an explanation
- Missed-day handling: blank days shown as missing, not zero, until confirmed

## Non-Goals

- No OCR (M5)
- No multi-business billing, no multi-currency (post-MVP)
- No offline queue (explored post-MVP)

## Ownership Boundaries

- frontend — reports screens, upcoming list, edit forms with reason, audit view
- backend — recurrence engine, trends aggregation, edit + re-run logic, audit ledger
- database — recurring rules, generated occurrences, audit entries

## Execution Order

1. Recurring product expenses + projections
2. Reports + trends (must match daily entries exactly)
3. Edits + audit + reason codes + missed-day display

## Value Outcome

Delivers `product-management/value-map.md` outcome V6 — Repeating product expenses, V9 — Daily summary plus trends, V10 — Fix mistakes with history. Delivery status is not a claim of visible value; the milestone is done only when the stakeholder can feel this outcome.

## Status

Complete — build done, tested (MVP complete)

- Current status summary: Every-N-days recurrences + projections, trends with missing-vs-zero, sale edits with reason + audit, reason-coded adjustments live; all checks pass
- Remaining work: Real-shop pilot only

## Verification / Definition of Done

- Every-3-days expense generates correct next 5 dates across month boundary
- Weekly/monthly totals equal sum of daily closes; test with edits included
- Edit to last Tuesday updates that day + trends; audit log captures it
- Discount/refund entered with reason explains receipt-vs-manual difference

## Regression Guardrails

- Reports are read-only views; they never edit data
- Every edit requires reason when it touches money; staff edits are flagged for owner review
- Missing days are visually distinct from zero-sales days
