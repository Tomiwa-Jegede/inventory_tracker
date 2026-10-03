#!/bin/sh
# Daily Postgres backup to ./backups. Keeps 14 days. Run via cron.
set -eu
cd "$(dirname "$0")/.."
mkdir -p backups
DATE=$(date +%F)
docker compose exec -T db pg_dump -U "${POSTGRES_USER:-tracker}" "${POSTGRES_DB:-inventory_tracker}" | gzip > "backups/pg-$DATE.sql.gz"
find backups -name 'pg-*.sql.gz' -mtime +14 -delete
echo "backup written: backups/pg-$DATE.sql.gz"
