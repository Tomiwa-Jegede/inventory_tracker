# Product Management

## Purpose
The value workspace — what value the Inventory-tracker product delivers, to whom, proven how, and the status of each value outcome. Value is tracked independently from how engineering delivers it; the delivery plan lives in `delivery-management/` and serves this workspace, not the reverse.

## Ownership
Owned by the repository root `AGENTS.md`.

## Local Contracts
- `value-map.md` is the canonical value artifact: value to deliver per stakeholder, each with an outcome, a visible moment, a proof measure, a delivery status, and the owning delivery milestone
- `value-chain-opportunities/` holds gap and expansion analysis — value not yet delivered
- `value-chain-opportunities/MAP.md` is the wayfinder map of opportunities and gaps
- Optional leadership-facing narrative artifacts live here (proposal, deck)
- `delivery-management/` owns `roadmap.md`, milestone trackers, architecture, and runbooks; this workspace must not duplicate delivery detail
- Sequencing arguments about what to deliver next live here and are argued by stakeholder value; `delivery-management/` sequences by dependency once the value choice is made

## Work Guidance
- Update `value-map.md` when value to deliver changes: new stakeholder outcomes, changed visible moments or proof measures, or delivery-status changes
- Mark a value outcome delivered only when a stakeholder can feel it — a complete backend with no surface is a value gap, not a delivery
- Keep the must-not-fail promises honest; they are what sequencing must protect
- Do not resolve delivery detail in this workspace

## Verification
- Every value-map outcome must reference an owning delivery milestone or be marked an open gap
- Proof measures must be measurable, not aspirational
- Ensure the root `AGENTS.md` child index references this folder and stays current

## Child DOX Index

| Path | Owner | Purpose |
|---|---|---|
| `value-map.md` | product-management/ | Canonical value outcomes V1-V10 for owner + staff |
| `value-chain-opportunities/MAP.md` | product-management/ | Ranked post-MVP gaps: OCR, alerts, SaaS, currency, offline |