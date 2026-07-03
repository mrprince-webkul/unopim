#!/usr/bin/env bash
# DevAnnounce — one-command production launcher
# Usage: ./run.sh [up|down|restart|logs|reset|status]
set -euo pipefail

cd "$(dirname "$0")"

BOLD='\033[1m'; GREEN='\033[0;32m'; YELLOW='\033[0;33m'; RED='\033[0;31m'; CYAN='\033[0;36m'; NC='\033[0m'

info()  { echo -e "${CYAN}▸${NC} $*"; }
ok()    { echo -e "${GREEN}✔${NC} $*"; }
warn()  { echo -e "${YELLOW}⚠${NC} $*"; }
fail()  { echo -e "${RED}✖${NC} $*"; exit 1; }

banner() {
  echo -e "${BOLD}"
  cat <<'EOF'
    ____              ___
   / __ \___ _   __  /   |  ____  ____  ____  __  ______  ________
  / / / / _ \ | / / / /| | / __ \/ __ \/ __ \/ / / / __ \/ ___/ _ \
 / /_/ /  __/ |/ / / ___ |/ / / / / / / /_/ / /_/ / / / / /__/  __/
/_____/\___/|___/ /_/  |_/_/ /_/_/ /_/\____/\__,_/_/ /_/\___/\___/
EOF
  echo -e "${NC}"
}

random_secret() {
  if command -v openssl >/dev/null 2>&1; then
    openssl rand -hex 32
  else
    head -c 32 /dev/urandom | od -An -tx1 | tr -d ' \n'
  fi
}

check_dependencies() {
  info "Checking dependencies..."
  command -v docker >/dev/null 2>&1 || fail "Docker is not installed. Install it from https://docs.docker.com/get-docker/"
  docker info >/dev/null 2>&1 || fail "Docker daemon is not running (or you lack permission — try adding your user to the 'docker' group)."
  docker compose version >/dev/null 2>&1 || fail "Docker Compose v2 is required (docker compose)."
  ok "Docker $(docker --version | sed 's/Docker version //;s/,.*//') + Compose ready"
}

ensure_env() {
  if [[ ! -f .env ]]; then
    info "No .env found — generating one with fresh secrets..."
    cp .env.example .env
    for key in JWT_SECRET POSTGRES_PASSWORD MINIO_ROOT_PASSWORD; do
      secret="$(random_secret)"
      sed -i.bak "s|^${key}=.*|${key}=${secret}|" .env && rm -f .env.bak
    done
    ok "Created .env with generated secrets"
  else
    ok ".env already exists — keeping it"
  fi
}

app_port() {
  local port
  port="$(grep -E '^APP_PORT=' .env 2>/dev/null | cut -d= -f2 || true)"
  echo "${port:-8080}"
}

wait_for_app() {
  local port; port="$(app_port)"
  info "Waiting for the application to become healthy (this includes DB migrations + demo data seeding)..."
  for i in $(seq 1 120); do
    if curl -sf "http://localhost:${port}/api/v1/health" >/dev/null 2>&1; then
      ok "API is healthy"
      return 0
    fi
    sleep 3
  done
  warn "App did not report healthy in time. Check logs with: ./run.sh logs"
  return 1
}

print_summary() {
  local port; port="$(app_port)"
  echo
  echo -e "${BOLD}${GREEN}  DevAnnounce is running! 🚀${NC}"
  echo
  echo -e "  ${BOLD}App:${NC}          http://localhost:${port}"
  echo -e "  ${BOLD}API docs:${NC}     http://localhost:${port}/api/v1/docs"
  echo
  echo -e "  ${BOLD}Admin login:${NC}  admin@devannounce.com / password123"
  echo -e "  ${BOLD}Demo user:${NC}    ada@devannounce.com / password123"
  echo
  echo -e "  Set your Anthropic API key for AI news summaries in ${BOLD}Admin → Settings${NC}."
  echo
  echo -e "  ${CYAN}./run.sh logs${NC}     tail all service logs"
  echo -e "  ${CYAN}./run.sh down${NC}     stop everything"
  echo -e "  ${CYAN}./run.sh reset${NC}    stop and wipe all data volumes"
  echo
}

cmd="${1:-up}"

case "$cmd" in
  up)
    banner
    check_dependencies
    ensure_env
    info "Building images (first run can take a few minutes)..."
    docker compose build
    info "Starting services: PostgreSQL, Redis, MinIO, FastAPI, Next.js, Nginx..."
    docker compose up -d
    wait_for_app || true
    print_summary
    ;;
  down)
    docker compose down
    ok "Stopped."
    ;;
  restart)
    docker compose restart
    ok "Restarted."
    ;;
  logs)
    docker compose logs -f --tail=100
    ;;
  status)
    docker compose ps
    ;;
  reset)
    warn "This will delete ALL data (database, cache, uploaded files)."
    read -r -p "Are you sure? [y/N] " reply
    if [[ "$reply" =~ ^[Yy]$ ]]; then
      docker compose down -v
      ok "All services stopped and volumes removed."
    else
      info "Aborted."
    fi
    ;;
  *)
    echo "Usage: ./run.sh [up|down|restart|logs|reset|status]"
    exit 1
    ;;
esac
