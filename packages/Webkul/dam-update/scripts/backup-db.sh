#!/usr/bin/env bash
# Dump the DevAnnounce PostgreSQL database to ./backups/<timestamp>.sql.gz
set -euo pipefail
cd "$(dirname "$0")/.."

source <(grep -E '^(POSTGRES_USER|POSTGRES_DB)=' .env 2>/dev/null || true)
POSTGRES_USER="${POSTGRES_USER:-devannounce}"
POSTGRES_DB="${POSTGRES_DB:-devannounce}"

mkdir -p backups
out="backups/devannounce-$(date +%Y%m%d-%H%M%S).sql.gz"
docker compose exec -T postgres pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" | gzip > "$out"
echo "Backup written to $out"
