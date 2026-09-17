#!/usr/bin/env bash
# ────────────────────────────────────────────────────────────────────
# GenicUI Playground Ecommerce — Local Development Launcher
# Companion to examples/playground/start.sh. Runs the ecommerce
# playground on a separate port (3042) so both can be inspected.
#
# Usage:
#   bash start.sh                 → stop + start all services
#   bash start.sh --stop          → stop all services
#   bash start.sh --status        → run health check, print URLs
#   bash start.sh --restart       → stop + start (fresh logs)
# ────────────────────────────────────────────────────────────────────
set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

SERVER_PORT=3041
PLAYGROUND_PORT=3042

GREEN='\033[0;32m'; CYAN='\033[0;36m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'
info()  { printf "${CYAN}[INFO]${NC}  %s\n" "$*"; }
ok()    { printf "${GREEN}[OK]${NC}    %s\n" "$*"; }
warn()  { printf "${YELLOW}[WARN]${NC}  %s\n" "$*"; }
err()   { printf "${RED}[ERR]${NC}   %s\n" "$*"; }

PID_FILE="/tmp/genicui-playground-ecommerce-pids"
SERVER_LOG="/tmp/genicui-playground-ecommerce-server.log"
PLAYGROUND_LOG="/tmp/genicui-playground-ecommerce.log"

check_deps() {
  local missing=0
  for cmd in bun; do
    if ! command -v "$cmd" &>/dev/null; then
      err "bun is not installed — install it from https://bun.sh"
      missing=1
    fi
  done
  [ "$missing" -eq 1 ] && exit 1
}

write_pid_file() {
  cat > "$PID_FILE" <<-PIDEOF
	GENICUI_SERVER_PID=${1:-}
	PLAYGROUND_PID=${2:-}
	PIDEOF
}

kill_by_port() {
  local port="$1"
  local pids
  pids=$(lsof -ti :"$port" 2>/dev/null || true)
  [ -z "$pids" ] && return 0
  for pid in $pids; do
    kill "$pid" 2>/dev/null || true
  done
  sleep 0.3
}

wait_for_url() {
  local url="$1" timeout="$2"
  if ! command -v curl &>/dev/null; then
    sleep 2
    return 0
  fi
  for _i in $(seq 1 "$timeout"); do
    if curl -sf --connect-timeout 1 --max-time 3 "$url" &>/dev/null; then
      return 0
    fi
    sleep 1
  done
  return 1
}

stop_services() {
  warn "Shutting down services …"
  if [ -f "$PID_FILE" ]; then
    # shellcheck disable=SC1091
    source "$PID_FILE"
    [ -n "${GENICUI_SERVER_PID:-}" ] && kill "$GENICUI_SERVER_PID" 2>/dev/null || true
    [ -n "${PLAYGROUND_PID:-}" ] && kill "$PLAYGROUND_PID" 2>/dev/null || true
  fi
  kill_by_port "$SERVER_PORT"
  kill_by_port "$PLAYGROUND_PORT"
  rm -f "$PID_FILE"
  ok "All services stopped."
}

start_genicui_server() {
  local START; START=$(date +%s%N)
  kill_by_port "$SERVER_PORT"
  info "Starting GenicUI HTTP server on port $SERVER_PORT …"
  rm -f "$SERVER_LOG"
  (
    cd "$ROOT_DIR"
    GENICUI_PORT="$SERVER_PORT" \
    GENICUI_HOSTNAME="127.0.0.1" \
    GENICUI_REGISTRIES_DIR="$ROOT_DIR/registries" \
      exec bun run --filter @genicui/server dev </dev/null
  ) > "$SERVER_LOG" 2>&1 &
  local SERVER_PID=$!
  disown "$SERVER_PID" 2>/dev/null || true

  if wait_for_url "http://localhost:${SERVER_PORT}/health" 10; then
    ok "GenicUI server is ready (http://localhost:${SERVER_PORT}/health)"
  else
    err "GenicUI server did not respond within 10s — see $SERVER_LOG"
    kill "$SERVER_PID" 2>/dev/null || true
    return 1
  fi
  write_pid_file "$SERVER_PID" "${2:-}"
}

start_playground() {
  local START; START=$(date +%s%N)
  kill_by_port "$PLAYGROUND_PORT"
  info "Starting Ecommerce Playground dev server on port $PLAYGROUND_PORT …"
  rm -f "$PLAYGROUND_LOG"
  (
    cd "$SCRIPT_DIR"
    exec bun run dev </dev/null
  ) > "$PLAYGROUND_LOG" 2>&1 &
  local PLAYGROUND_PID=$!
  disown "$PLAYGROUND_PID" 2>/dev/null || true

  if wait_for_url "http://localhost:${PLAYGROUND_PORT}/" 30; then
    ok "Ecommerce Playground is ready (http://localhost:${PLAYGROUND_PORT}/)"
  else
    err "Ecommerce Playground did not respond within 30s — see $PLAYGROUND_LOG"
    kill "$PLAYGROUND_PID" 2>/dev/null || true
    return 1
  fi
  write_pid_file "${1:-}" "$PLAYGROUND_PID"
}

print_status() {
  echo ""
  info "───────────────────────────────────────────────────"
  info "  Ecommerce Playground Connection Check"
  info "───────────────────────────────────────────────────"
  echo ""

  local ALL_PASSED=true

  if wait_for_url "http://localhost:${SERVER_PORT}/health" 2; then
    printf "  ${GREEN}[OK]${NC}    GenicUI Server        → http://localhost:${SERVER_PORT}/health\n"
  else
    printf "  ${RED}[ERR]${NC}   GenicUI Server        (port ${SERVER_PORT} not responding)\n"
    ALL_PASSED=false
  fi

  if wait_for_url "http://localhost:${PLAYGROUND_PORT}/" 2; then
    printf "  ${GREEN}[OK]${NC}    Ecommerce Playground → http://localhost:${PLAYGROUND_PORT}/\n"
  else
    printf "  ${RED}[ERR]${NC}   Ecommerce Playground (port ${PLAYGROUND_PORT} not responding)\n"
    ALL_PASSED=false
  fi

  echo ""
  $ALL_PASSED && return 0 || return 1
}

main() {
  check_deps
  echo ""
  info "═══════════════════════════════════════════════"
  info "  GenicUI Ecommerce Playground — Starting …"
  info "═══════════════════════════════════════════════"
  echo ""
  start_genicui_server || exit 1
  echo ""
  start_playground || exit 1
  echo ""
  printf "${GREEN}  GenicUI Server${NC}        →  ${CYAN}http://localhost:${SERVER_PORT}/health${NC}\n"
  printf "${GREEN}  Ecommerce Playground${NC}  →  ${CYAN}http://localhost:${PLAYGROUND_PORT}/${NC}\n"
  printf "${GREEN}  WebSocket Endpoint${NC}    →  ${CYAN}ws://localhost:${SERVER_PORT}/ws${NC}\n"
  echo ""
}

case "${1:---start}" in
  --stop)    stop_services ;;
  --status)  print_status ;;
  --restart|--reload)
    stop_services
    sleep 1
    main
    ;;
  --start|--fg|"")
    stop_services
    sleep 1
    main
    ;;
  *)
    echo "Usage: bash start.sh [--start|--stop|--status|--restart]"
    exit 1
    ;;
esac
