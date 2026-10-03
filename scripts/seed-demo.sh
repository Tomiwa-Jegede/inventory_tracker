#!/bin/sh
# Seed a sample food business via the API: products + ingredients, one
# purchase each, recipes, overheads, one sample sale.
# Usage: BASE=http://localhost:4000 EMAIL=owner@example.com PASSWORD=... ./scripts/seed-demo.sh
# Requires an existing owner (bootstrap first). No defaults.
set -eu
: "${BASE:?set BASE, e.g. BASE=http://localhost:4000}"
: "${EMAIL:?set EMAIL of an existing owner}"
: "${PASSWORD:?set PASSWORD for that owner}"

TOKEN=$(curl -s -X POST "$BASE/api/auth/login" -H 'Content-Type: application/json' -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}" | python3 -c "import sys,json; print(json.load(sys.stdin)['token'])")
echo "logged in as $EMAIL"
api() { curl -s -X "$1" "$BASE$2" -H 'Content-Type: application/json' -H "Authorization: Bearer $TOKEN" -d "${3:-}"; }

P_BURGER=$(api POST /api/products '{"name":"Burger","category":"Food","price_minor":250000}' | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])")
P_FRIES=$(api POST /api/products '{"name":"Fries","category":"Food","price_minor":120000}' | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])")
api POST /api/products '{"name":"Toast bread","category":"Food","price_minor":50000}' > /dev/null
api POST /api/products '{"name":"Iced coffee","category":"Drinks","price_minor":150000}' > /dev/null
echo "products: burger=$P_BURGER fries=$P_FRIES"

G_BUN=$(api POST /api/ingredients '{"name":"Bun","unit":"piece"}' | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])")
G_PATTY=$(api POST /api/ingredients '{"name":"Patty","unit":"piece"}' | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])")
G_POTATO=$(api POST /api/ingredients '{"name":"Potato","unit":"kg"}' | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])")
api POST /api/purchases "{\"ingredient_id\":\"$G_BUN\",\"qty\":20,\"total_minor\":10000,\"purchase_date\":\"2026-10-01\",\"supplier\":\"Bakery\"}" > /dev/null
api POST /api/purchases "{\"ingredient_id\":\"$G_PATTY\",\"qty\":20,\"total_minor\":30000,\"purchase_date\":\"2026-10-01\"}" > /dev/null
api POST /api/purchases "{\"ingredient_id\":\"$G_POTATO\",\"qty\":10,\"total_minor\":8000,\"purchase_date\":\"2026-10-01\"}" > /dev/null
echo "ingredients + purchases done"

api POST /api/recipes "{\"product_id\":\"$P_BURGER\",\"ingredient_id\":\"$G_BUN\",\"qty_per_sale\":1}" > /dev/null
api POST /api/recipes "{\"product_id\":\"$P_BURGER\",\"ingredient_id\":\"$G_PATTY\",\"qty_per_sale\":1}" > /dev/null
api POST /api/recipes "{\"product_id\":\"$P_FRIES\",\"ingredient_id\":\"$G_POTATO\",\"qty_per_sale\":0.3}" > /dev/null
echo "recipes linked"

api POST /api/overheads '{"name":"Freezer rental","amount_minor":700000,"frequency":"weekly","next_due_date":"2026-10-09"}' > /dev/null
api POST /api/overheads '{"name":"Shop rent","amount_minor":3000000,"frequency":"monthly","next_due_date":"2026-11-01"}' > /dev/null
echo "overheads added"

TODAY=$(date +%F)
api POST /api/sales "{\"product_id\":\"$P_BURGER\",\"sale_date\":\"$TODAY\",\"qty\":2}" > /dev/null
echo "sample sale recorded for $TODAY"
curl -s "$BASE/api/reports/daily?sale_date=$TODAY" -H "Authorization: Bearer $TOKEN"
echo
