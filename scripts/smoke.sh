#!/bin/sh
# Smoke test: login → product → sale → daily close must be > 0.
# Usage: BASE=http://localhost:4000 ./scripts/smoke.sh
set -eu
BASE="${BASE:-http://localhost:4000}"
EMAIL="${EMAIL:-owner@demo.test}"

TOKEN=$(curl -s -X POST "$BASE/api/auth/login" -H 'Content-Type: application/json' -d "{\"email\":\"$EMAIL\"}" | python3 -c "import sys,json; print(json.load(sys.stdin)['token'])")
H="Authorization: Bearer $TOKEN"
PID=$(curl -s -X POST "$BASE/api/products" -H 'Content-Type: application/json' -H "$H" -d '{"name":"Smoke item","price_minor":100000}' | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])")
TODAY=$(date +%F)
curl -s -X POST "$BASE/api/sales" -H 'Content-Type: application/json' -H "$H" -d "{\"product_id\":\"$PID\",\"sale_date\":\"$TODAY\",\"qty\":1}" > /dev/null
TOTAL=$(curl -s "$BASE/api/reports/daily?sale_date=$TODAY" -H "$H" | python3 -c "import sys,json; print(json.load(sys.stdin)['total_minor'])")
if [ "$TOTAL" -gt 0 ]; then echo "SMOKE PASS total_minor=$TOTAL"; else echo "SMOKE FAIL total_minor=$TOTAL"; exit 1; fi
