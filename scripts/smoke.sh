#!/bin/sh
# Smoke test: login → product → sale → daily close must be > 0.
# Usage: BASE=https://your-api.onrender.com EMAIL=owner@example.com PASSWORD=... ./scripts/smoke.sh
# All three have NO defaults — the script fails fast if unset.
set -eu
: "${BASE:?set BASE, e.g. BASE=http://localhost:4000}"
: "${EMAIL:?set EMAIL of an existing owner}"
: "${PASSWORD:?set PASSWORD for that owner}"

TOKEN=$(curl -s -X POST "$BASE/api/auth/login" -H 'Content-Type: application/json' -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}" | python3 -c "import sys,json; print(json.load(sys.stdin)['token'])")
H="Authorization: Bearer $TOKEN"
PID=$(curl -s -X POST "$BASE/api/products" -H 'Content-Type: application/json' -H "$H" -d '{"name":"Smoke item","price_minor":100000}' | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])")
TODAY=$(date +%F)
curl -s -X POST "$BASE/api/sales" -H 'Content-Type: application/json' -H "$H" -d "{\"product_id\":\"$PID\",\"sale_date\":\"$TODAY\",\"qty\":1}" > /dev/null
TOTAL=$(curl -s "$BASE/api/reports/daily?sale_date=$TODAY" -H "$H" | python3 -c "import sys,json; print(json.load(sys.stdin)['total_minor'])")
ME_CURRENCY=$(curl -s "$BASE/api/auth/me" -H "$H" | python3 -c "import sys,json; print(json.load(sys.stdin)['business']['currency'])")
HEALTH=$(curl -s "$BASE/health" | python3 -c "import sys,json; d=json.load(sys.stdin); print(str(d.get('ok'))+':'+str(d.get('db')))")
echo "health=$HEALTH currency=$ME_CURRENCY"
if [ "$TOTAL" -gt 0 ]; then echo "SMOKE PASS total_minor=$TOTAL"; else echo "SMOKE FAIL total_minor=$TOTAL"; exit 1; fi
