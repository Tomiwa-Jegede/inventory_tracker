# Milestone 2: Costs, recipes, per-product profit

## Goal

Every sale automatically carries its true ingredient/material cost so per-product profit is trusted.

## Scope

- Purchases: item, quantity, price, date, supplier, reorder hint, custom unit (loaf, kg, litre, pack, piece); auto cost-per-unit
- Stock on hand per ingredient/material, decreased by recipe use, with manual waste/spoilage adjustment + reason
- Recipes: product linked to ingredients with qty per sale (e.g. 1 burger = 1 bun + 1 patty + oil); supports service businesses with empty recipe (no stock)
- Per-product profit = product sales minus product costs; daily gross = sum of product profits
- Price-change rule: old sales keep old cost/price; new sales use new values; history preserved

## Non-Goals

- No overhead set-aside (M3)
- No recurring-expense projections (M4)
- No OCR, no auto-reorder, no supplier integrations

## Ownership Boundaries

- frontend — purchase form, recipe linker, stock display, per-product profit view
- backend — cost-per-unit math, stock deduction, recipe costing, profit math, price-history freeze
- database — ingredients, purchases, recipes, stock ledger, price history

## Execution Order

1. Ingredients + purchases + cost-per-unit + stock on hand
2. Recipes + sale-time deduction + waste adjustment
3. Per-product profit + gross profit views

## Value Outcome

Delivers `product-management/value-map.md` outcome V3 — Know true ingredient costs, V4 — Product cost is automatic, V5 — See profit per product. Delivery status is not a claim of visible value; the milestone is done only when the stakeholder can feel this outcome.

## Status

Complete — build done, tested

- Current status summary: Ingredients, purchases with auto cost-per-unit, recipes, stock deduct on sale, per-product + gross profit live; all verification checks pass in test
- Remaining work: Real-shop pilot only

## Verification / Definition of Done

- 3 purchase examples produce correct cost-per-unit by hand check
- Selling 5 burgers deducts 5x recipe qty; stock left matches
- Service product with no recipe sells with zero material cost and still shows profit
- Changing an ingredient price mid-week does not rewrite old days

## Regression Guardrails

- All money math in integers; cost-per-unit rounding is documented and consistent
- Stock can never go silently negative; show shortage warning instead
- Units are user-defined; no hardcoded unit list
