# Milestone 1: Usable daily sales + setup

## Goal

Owner sets up their own products and staff can record a day's sales in under a minute, even when busy.

## Scope

- Business setup: products/services, selling prices, categories, single currency, active/archived state
- Simple login + 2 roles: owner (everything) and staff (enter sales, view today; cannot edit prices or setup)
- Daily sales entry: manual total + per-product breakdown (qty sold), date defaults to today
- Receipt photo as a temporary transcription aid: snap now, enter the numbers, photo deleted on sale save (no retention, no auto-read in MVP)
- Basic daily summary: total sales today
- Mobile-friendly sales screen + desktop setup screens

## Non-Goals

State what this milestone deliberately does not do.

- No receipt auto-read / OCR (M5)
- No cost, recipe, or profit math (M2)
- No overhead set-aside (M3)
- No trends, no multi-currency, no offline mode, no branches

## Ownership Boundaries

- frontend — setup forms, fast sales entry, photo upload, daily total display
- backend — products, sales entries, receipt photo intake + delete-on-save (nothing retained), role checks, single-currency money as integers (kobo)
- database — businesses, users, products, sales (no receipt blobs or refs retained)

## Execution Order

Sequence by dependency.

1. Data shape + auth/roles + business/product setup
2. Manual sales entry + receipt photo attach (deleted on save)
3. Daily total + mobile usability pass

## Value Outcome

Delivers `product-management/value-map.md` outcome V1 — Owner: Set up my own business, and V2 — Owner + Staff: Enter daily sales fast. Delivery status is not a claim of visible value; the milestone is done only when the stakeholder can feel this outcome.

## Status

In progress — M1 build done, pilot pending

- Current status summary: Backend (auth, products, sales, receipts, daily report) + frontend (login, setup, fast sales, photo, daily total) implemented and tested; needs real-shop pilot
- Remaining work: 7-day paper-parallel pilot, photo review pass, Postgres cutover when hosted DB available

## Verification / Definition of Done

- Add/edit/archive a product in under 2 min; sales screen updates immediately
- Save a day's sales in under 1 min on a phone browser, with or without receipt photo
- Staff cannot edit prices or setup (checked by role test)
- Money stored as integers; totals match hand calculation on 3 test days

## Regression Guardrails

- No hardcoded products, categories, or prices anywhere
- Past sales entries never change when a price changes later (price is copied at sale time)
- Receipt photos never block saving a sale
