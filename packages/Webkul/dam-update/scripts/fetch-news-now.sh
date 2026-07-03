#!/usr/bin/env bash
# Trigger an immediate Dev News import (same job the scheduler runs at midnight).
# Requires the stack to be running. Uses the admin account.
set -euo pipefail
cd "$(dirname "$0")/.."

PORT="$(grep -E '^APP_PORT=' .env 2>/dev/null | cut -d= -f2 || true)"
PORT="${PORT:-8080}"
BASE="http://localhost:${PORT}/api/v1"

EMAIL="${ADMIN_EMAIL:-admin@devannounce.com}"
PASSWORD="${ADMIN_PASSWORD:-password123}"

token="$(curl -sf -X POST "$BASE/auth/login" \
  -H 'Content-Type: application/json' \
  -d "{\"email_or_username\":\"$EMAIL\",\"password\":\"$PASSWORD\"}" | \
  python3 -c 'import json,sys; print(json.load(sys.stdin)["access_token"])')"

curl -sf -X POST "$BASE/admin/news/fetch" -H "Authorization: Bearer $token"
echo
