#!/bin/sh
# Restore: ./scripts/restore.sh backups/pg-YYYY-MM-DD.sql.gz
set -eu
cd "$(dirname "$0")/.."
FILE="${1:?usage: restore.sh <backup.gz>}"
gunzip -c "$FILE" | docker compose exec -T db psql -U "${POSTGRES_USER:-tracker}" "${POSTGRES_DB:-inventory_tracker}"
echo "restored from $FILE"
