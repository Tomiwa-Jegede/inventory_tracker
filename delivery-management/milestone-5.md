# Milestone 5: Automation + SaaS shape (Post-MVP)

## Goal

Reduce daily typing and prepare to serve other businesses, without breaking MVP trust.

## Scope

- Receipt OCR with human review: photo read suggests products/qty; staff confirms before saving; low-confidence reads flagged; duplicate-price disambiguation (e.g. two items same price)
- Low-stock alerts + waste reasons dashboard
- Multi-business groundwork: data isolation by business_id, owner invitation, basic plan shape (no billing in this milestone unless scoped later)
- Multi-currency + unit design spike; offline-entry queue exploration

## Non-Goals

- No auto-posting of OCR without human confirm
- No branches, payroll, tax, or accounting integrations in this milestone
- No removal of manual entry; manual stays as fallback

## Ownership Boundaries

- frontend — OCR review screen, alerts, business switcher (if enabled)
- backend — OCR provider integration, confidence scoring, isolation checks, currency design
- database — OCR results, business scoping, currency fields (design only until approved)

## Execution Order

1. OCR review flow + accuracy logging
2. Alerts + dashboard polish
3. SaaS isolation + currency/offline spikes

## Value Outcome

Closes cross-cutting gaps in `product-management/value-map.md` (OCR, multi-business, multi-currency/offline). Delivery status is not a claim of visible value; the milestone is done only when the stakeholder can feel faster entry with equal or better accuracy.

## Status

Stop point reached — stub only, no further build

- Current status summary: OCR suggest stub (human confirm required, same-price ambiguity surfaced, never auto-posts), low-stock + upcoming alerts, business_id isolation proven by test; provider integration, billing, and offline queue deliberately not built
- Remaining work: None in this stop — future work only after MVP pilot

## Verification / Definition of Done

- OCR accuracy measured on 50 real receipts; review step catches errors; no silent mis-match
- Same-price products resolved by suggestion + confirm, never auto-guess
- Second test business sees zero data from first business
- Manual entry still works if OCR service is down

## Regression Guardrails

- OCR never overwrites manual totals without explicit confirm
- Accuracy log kept; provider can be swapped without data migration
- Isolation tested per query, not just per screen
