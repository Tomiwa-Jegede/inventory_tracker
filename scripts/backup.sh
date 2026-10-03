#!/bin/sh
# Daily Postgres backup to ./backups. Keeps 14 days. Run via cron.
# Production (Neon): set DATABASE_URL_UNPOOLED and backups run against it.
# Local compose: leave it unset to use the compose db service.
set -eu
cd "$(dirname "$0")/.."
mkdir -p backups
DATE=$(date +%F)
if [ -n "${DATABASE_URL_UNPOOLED:-}" ]; then
  pg_dump "$DATABASE_URL_UNPOOLED" | gzip > "backups/pg-$DATE.sql.gz"
else
  docker compose exec -T db pg_dump -U "${POSTGRES_USER:-tracker}" "${POSTGRES_DB:-inventory_tracker}" | gzip > "backups/pg-$DATE.sql.gz"
fi
find backups -name 'pg-*.sql.gz' -mtime +14 -delete
echo "backup written: backups/pg-$DATE.sql.gz"
