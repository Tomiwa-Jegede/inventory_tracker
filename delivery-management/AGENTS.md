# Delivery Management

## Purpose

Planning, roadmap, and milestone tracking for cross-team engineering delivery. The engineering half of product planning: how value is built, sequenced by dependency, and shipped. The value thesis lives in `product-management/`.

## Ownership

Owned by the repository root `AGENTS.md`. Value-to-deliver lives in `product-management/`; this folder owns how engineering delivers value, not what the value is.

## Local Contracts

- Use this folder for durable delivery artifacts, not scratch notes.
- `roadmap.md` is the top-level sequencing document.
- Milestone trackers use numbered filenames `milestone-1.md` onward.
- Milestone docs state scope, non-goals, ownership boundaries, execution order, and regression guardrails.
- When a milestone is split/deferred/reprioritized, reflect changes in both `roadmap.md` and the affected milestone files in the same change.
- Milestone docs name the value outcome they deliver by referencing `product-management/value-map.md`.
- Delivery status is not a claim of visible value.
- `runbook.md` is the deploy truth: Render (backend) + Cloudflare Worker (frontend) + Neon (Postgres) + R2 (receipts) steps, secret rotation, restore, user creation.
- Staging first: separate Neon branch/project for staging; `scripts/smoke.sh` (BASE/EMAIL/PASSWORD, no defaults) must pass against staging before production.

## Work Guidance

- Keep planning docs concrete enough to drive execution.
- Prefer milestone-oriented breakdowns over brainstorming lists.
- Update roadmap and milestone docs when scope, sequencing, or ownership changes.
- Do not duplicate implementation detail owned by code-local AGENTS docs.
- Do not resolve "what value to build next" here — raise it to `product-management/`.

## Verification

- Check links, filenames, and milestone numbering.
- Ensure the root `AGENTS.md` child index references this folder and stays current.

## Child DOX Index

| Path | Owner | Purpose |
| --- | --- | --- |
| `roadmap.md` | delivery-management/ | Top-level sequencing M1-M5, MVP = M1-M4 |
| `milestone-1.md` | delivery-management/ | MVP setup + manual sales + photo backup (V1, V2) |
| `milestone-2.md` | delivery-management/ | MVP costs + recipes + per-product profit (V3-V5) |
| `milestone-3.md` | delivery-management/ | MVP overhead set-aside + net profit (V7, V8) |
| `milestone-4.md` | delivery-management/ | MVP repeats + reports + corrections + audit (V6, V9, V10) |
| `milestone-5.md` | delivery-management/ | Post-MVP OCR + SaaS shape + alerts |
| `runbook.md` | delivery-management/ | Prod boot, backups, restore, ops notes |