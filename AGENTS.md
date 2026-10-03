# DOX framework

- DOX is highly performant AGENTS.md hierarchy installed here
- Agent must follow DOX instructions across any edits

## Core Contract

- AGENTS.md files are binding work contracts for their subtrees
- Work products, source materials, instructions, records, assets, and durable docs must stay understandable from the nearest applicable AGENTS.md plus every parent AGENTS.md above it

## Read Before Editing

1. Read the root AGENTS.md
2. Identify every file or folder you expect to touch
3. Walk from the repository root to each target path
4. Read every AGENTS.md found along each route
5. If a parent AGENTS.md lists a child AGENTS.md whose scope contains the path, read that child and continue from there
6. Use the nearest AGENTS.md as the local contract and parent docs for repo-wide rules
7. If docs conflict, the closer doc controls local work details, but no child doc may weaken DOX

Do not rely on memory. Re-read the applicable DOX chain in the current session before editing.

## Update After Editing

Every meaningful change requires a DOX pass before the task is done.

Update the closest owning AGENTS.md when a change affects:

- purpose, scope, ownership, or responsibilities
- durable structure, contracts, workflows, or operating rules
- required inputs, outputs, permissions, constraints, side effects, or artifacts
- user preferences about behavior, communication, process, organization, or quality
- AGENTS.md creation, deletion, move, rename, or index contents

Update parent docs when parent-level structure, ownership, workflow, or child index changes. Update child docs when parent changes alter local rules. Remove stale or contradictory text immediately. Small edits that do not change behavior or contracts may leave docs unchanged, but the DOX pass still must happen.

## Hierarchy

- Root AGENTS.md is the DOX rail: project-wide instructions, global preferences, durable workflow rules, and the top-level Child DOX Index
- Child AGENTS.md files own domain-specific instructions and their own Child DOX Index
- Each parent explains what its direct children cover and what stays owned by the parent
- The closer a doc is to the work, the more specific and practical it must be

## Child Doc Shape

- Create a child AGENTS.md when a folder becomes a durable boundary with its own purpose, rules, responsibilities, workflow, materials, or quality standards
- Work Guidance must reflect the current standards of the project or user instructions; if there are no specific standards or instructions yet, leave it empty
- Verification must reflect an existing check; if no verification framework exists yet, leave it empty and update it when one exists

Default section order:
- Purpose
- Ownership
- Local Contracts
- Work Guidance
- Verification
- Child DOX Index

## Style

- Keep docs concise, current, and operational
- Document stable contracts, not diary entries
- Put broad rules in parent docs and concrete details in child docs
- Prefer direct bullets with explicit names
- Do not duplicate rules across many files unless each scope needs a local version
- Delete stale notes instead of explaining history
- Trim obvious statements, repeated rules, misplaced detail, and warnings for risks that no longer exist

## Closeout

1. Re-check changed paths against the DOX chain
2. Update nearest owning docs and any affected parents or children
3. Refresh every affected Child DOX Index
4. Remove stale or contradictory text
5. Run existing verification when relevant
6. Report any docs intentionally left unchanged and why

## User Preferences

- Planning-first: product plan (B–H) agreed 2026-10-02; build starts with M1 only after explicit go-ahead.
- Plain language for product decisions; technical detail only in delivery docs.
- PERN stack unless trade-off analysis justifies a change.
- Nothing hardcoded about products, categories, or expenses; user configures their own business.

## Project Overview

Inventory-tracker — Flexible daily sales, expense, and profit tracking for any small business.

**Stack:** PERN — PostgreSQL, Express, React, Node.js

**Deploy targets:** backend on Render · frontend on Cloudflare Pages · database on Neon (Postgres) · receipts on Cloudflare R2 (private bucket).

**Repo layout:**
- `README.md` — local setup + deployment summary (details in runbook)
- `product-management/` — value to deliver, stakeholders, value map
- `delivery-management/` — roadmap, milestone trackers (M1-M5), runbook (deploy truth)
- `backend/` — Express API on repo pattern (memory dev/test, Postgres prod) + Dockerfile (app only; migrations are pre-deploy)
- `frontend/` — React + Vite app (Cloudflare Pages; nginx Dockerfile is local-only)
- `docker-compose.yml` — local dev only (db + backend + frontend)
- `scripts/` — smoke.sh (BASE/EMAIL/PASSWORD, no defaults), seed-demo.sh, backup.sh, restore.sh
- `neon.ts` + `.neon/` — Neon project link (`steep-hall-17249643`, branch `production`); `neon deploy` syncs branch policy and pulls `DATABASE_URL*` into gitignored `.env`

## Repository Layout Contract

- `AGENTS.md` at root is the binding contract; child `AGENTS.md` files own their subtrees.
- `product-management/` owns what value to deliver; `delivery-management/` owns sequencing and milestones.
- `backend/` owns money truth; `frontend/` owns display and fast input only.
- No secrets in repo; `.env` files stay gitignored (see `.env.example`, `backend/.env.example`).

## Product Direction

- Generic by design: user defines products, categories, ingredients, expenses.
- First test case is owner's food business (toast, iced coffee, burgers, fries, chicken sandwich).
- Daily close is the core loop: sales in, costs out, true profit after overhead set-aside.

## Cross-Module Contracts

- `product-management/value-map.md` defines value outcomes; `delivery-management/milestone-*.md` reference them by Outcome ID.
- Product decisions in plain language; technical design lives in delivery docs and future backend/frontend docs.

## Child DOX Index

This root doc owns:
- Planning rules, stack choice, and cross-module contracts
- `delivery-management/` — engineering delivery planning and sequencing
- `product-management/` — product value workspace

Child docs:
- `delivery-management/AGENTS.md` — roadmap and milestone tracking rules
- `product-management/AGENTS.md` — value map and opportunity tracking rules
- `backend/AGENTS.md` — API money-truth rules and milestone extensions
- `frontend/AGENTS.md` — UI fast-input rules and milestone screens