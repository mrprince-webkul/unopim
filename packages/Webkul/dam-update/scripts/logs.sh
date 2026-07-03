#!/usr/bin/env bash
# Tail logs for one service (backend|frontend|nginx|postgres|redis|minio) or all.
set -euo pipefail
cd "$(dirname "$0")/.."
docker compose logs -f --tail=200 "${@}"
