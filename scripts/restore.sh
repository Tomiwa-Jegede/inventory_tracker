#!/bin/sh
# Restore: ./scripts/restore.sh backups/pg-YYYY-MM-DD.sql.gz
# Production (Neon): set DATABASE_URL_UNPOOLED to restore there.
# Local compose: leave it unset to restore into the compose db service.
set -eu
cd "$(dirname "$0")/.."
FILE="${1:?usage: restore.sh <backup.gz>}"
if [ -n "${DATABASE_URL_UNPOOLED:-}" ]; then
  gunzip -c "$FILE" | psql "$DATABASE_URL_UNPOOLED"
else
  gunzip -c "$FILE" | docker compose exec -T db psql -U "${POSTGRES_USER:-tracker}" "${POSTGRES_DB:-inventory_tracker}"
fi
echo "restored from $FILE"
