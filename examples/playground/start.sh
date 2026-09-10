#!/usr/bin/env bash
# ────────────────────────────────────────────────────────────────────
# GenicUI Playground — Local Development Launcher
# Starts the services required for the playground demo app and prints
# their URLs.
#
# Services:
#   GenicUI HTTP Server (Elysia) → 3041   bun run dev (packages/server)
#   Playground Nuxt dev server    → 3040   bun run dev (this dir)
#
# If any process is already running on these ports, it will be killed
# before the service starts.
#
# Usage:
#   bash start.sh                 → stop + start all services
#   bash start.sh --stop          → stop all services
#   bash start.sh --status        → run health check, print URLs
#   bash start.sh --restart       → stop + start (fresh logs)
#   bash start.sh --server        → start only the GenicUI server
#   bash start.sh --playground    → start only the playground
#
# After startup, open the Playground URL printed below in your browser.
# ────────────────────────────────────────────────────────────────────
set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

SERVER_PORT=3041
PLAYGROUND_PORT=3040

GREEN='\033[0;32m'; CYAN='\033[0;36m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'
info()  { printf "${CYAN}[INFO]${NC}  %s\n" "$*"; }
ok()    { printf "${GREEN}[OK]${NC}    %s\n" "$*"; }
warn()  { printf "${YELLOW}[WARN]${NC}  %s\n" "$*"; }
err()   { printf "${RED}[ERR]${NC}   %s\n" "$*"; }

PID_FILE="/tmp/genicui-playground-pids"
SERVER_LOG="/tmp/genicui-playground-server.log"
PLAYGROUND_LOG="/tmp/genicui-playground.log"

# ── Pre-flight checks ─────────────────────────────────────────────

# Source .env (gitignored) into the current shell so the spawned server
# process inherits the ANTHROPIC_* gateway settings. .env.example is
# committed at the repo root; each developer copies it to .env and
# fills in their values.
load_dotenv() {
  if [ -f "$ROOT_DIR/.env" ]; then
    set -a
    # shellcheck disable=SC1091
    . "$ROOT_DIR/.env"
    set +a
    info "Loaded .env (ANTHROPIC_BASE_URL=${ANTHROPIC_BASE_URL:-<unset>})"
  fi
}

# Regenerate .mcp.json from the template if it's missing or older than
# the template itself. Without this, Claude Code is given a stale or
# macOS-flavored absolute path and the GenicUI MCP server never loads —
# every chat tool call then surfaces as `[error: unknown]`.
ensure_mcp_config() {
  local repo_root
  repo_root="$(cd "$SCRIPT_DIR/../.." && pwd)"
  local example="$repo_root/mcp.json.example"
  local out="$repo_root/.mcp.json"
  if [ ! -f "$example" ]; then
    warn "mcp.json.example not found at $example — skipping MCP config generation"
    return 0
  fi
  if [ ! -f "$out" ] || [ "$example" -nt "$out" ]; then
    info "Generating .mcp.json from mcp.json.example …"
    (cd "$repo_root" && bun run scripts/generate-mcp-config.ts --repo-root "$repo_root" >/dev/null) \
      && ok "Wrote .mcp.json" \
      || warn "Could not regenerate .mcp.json — Claude Code will fall back to a stale config"
  fi
}

# ── Pre-flight checks ─────────────────────────────────────────────
check_deps() {
  local missing=0
  for cmd in bun; do
    if ! command -v "$cmd" &>/dev/null; then
      err "bun is not installed — install it from https://bun.sh"
      missing=1
    fi
  done
  if ! command -v lsof &>/dev/null; then
    warn "lsof is not installed — port cleanup will be best-effort"
  fi
  if ! command -v curl &>/dev/null; then
    warn "curl is not installed — health checks will be best-effort"
  fi
  if [ "$missing" -eq 1 ]; then exit 1; fi
}

# ── Helpers ────────────────────────────────────────────────────────
_now() { date +%s%N; }
_elapsed_s() {
  local diff=$(( $2 - $1 ))
  local secs=$(( diff / 1000000000 ))
  local tenths=$(( (diff % 1000000000) / 100000000 ))
  printf "%d.%ds" "$secs" "$tenths"
}

write_pid_file() {
  cat > "$PID_FILE" <<-PIDEOF
	GENICUI_SERVER_PID=${1:-}
	PLAYGROUND_PID=${2:-}
	PIDEOF
}

kill_by_port() {
  local port="$1"
  local pids pname pbase_lower
  pids=$(lsof -ti :"$port" 2>/dev/null || true)
  [ -z "$pids" ] && return 0

  for pid in $pids; do
    pname=$(ps -p "$pid" -o comm= 2>/dev/null || echo "")
    pbase_lower=$(basename "$pname" 2>/dev/null | tr '[:upper:]' '[:lower:]')
    case "$pbase_lower" in
      node|node-*|npm|bun) kill "$pid" 2>/dev/null || true ;;
      *) : ;;
    esac
  done

  local _port_free=false
  for _i in $(seq 1 15); do
    if ! lsof -ti :"$port" >/dev/null 2>&1; then
      _port_free=true
      break
    fi
    sleep 0.2
  done

  if [ "$_port_free" = false ]; then
    pids=$(lsof -ti :"$port" 2>/dev/null || true)
    for pid in $pids; do
      pname=$(ps -p "$pid" -o comm= 2>/dev/null || echo "")
      pbase_lower=$(basename "$pname" 2>/dev/null | tr '[:upper:]' '[:lower:]')
      case "$pbase_lower" in
        node|node-*|npm|bun) kill -9 "$pid" 2>/dev/null || true ;;
        *) : ;;
      esac
    done
    sleep 0.3
  fi
}

wait_for_url() {
  local url="$1" timeout="$2"
  if ! command -v curl &>/dev/null; then
    warn "curl missing — sleeping 2s and assuming ready"
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

# ── Stop ───────────────────────────────────────────────────────────
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

# ── Service starters ───────────────────────────────────────────────
start_genicui_server() {
  local START; START=$(_now)

  kill_by_port "$SERVER_PORT"

  if [ ! -d "$ROOT_DIR/packages/server" ]; then
    err "packages/server/ not found — is this inside the GenicUI repo?"
    return 1
  fi

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

  local SERVER_END; SERVER_END=$(_now)
  echo "  ${YELLOW}Startup:${NC}    $(_elapsed_s "$START" "$SERVER_END")"

  write_pid_file "$SERVER_PID" "${2:-}"
}

start_playground() {
  local START; START=$(_now)

  kill_by_port "$PLAYGROUND_PORT"

  if [ ! -f "$SCRIPT_DIR/package.json" ]; then
    err "package.json not found in $SCRIPT_DIR — is this the playground dir?"
    return 1
  fi

  info "Starting Playground dev server on port $PLAYGROUND_PORT …"
  rm -f "$PLAYGROUND_LOG"
  (
    cd "$SCRIPT_DIR"
    exec bun run dev </dev/null
  ) > "$PLAYGROUND_LOG" 2>&1 &
  local PLAYGROUND_PID=$!
  disown "$PLAYGROUND_PID" 2>/dev/null || true

  if wait_for_url "http://localhost:${PLAYGROUND_PORT}/" 30; then
    ok "Playground is ready (http://localhost:${PLAYGROUND_PORT}/)"
  else
    err "Playground did not respond within 30s — see $PLAYGROUND_LOG"
    kill "$PLAYGROUND_PID" 2>/dev/null || true
    return 1
  fi

  local PLAYGROUND_END; PLAYGROUND_END=$(_now)
  echo "  ${YELLOW}Startup:${NC}    $(_elapsed_s "$START" "$PLAYGROUND_END")"

  write_pid_file "${1:-}" "$PLAYGROUND_PID"
}

# ── Status / health check ──────────────────────────────────────────
_status_ok()    { printf "${GREEN}[OK]${NC}"; }
_status_err()   { printf "${RED}[ERR]${NC}"; }

_print_check() {
  local status_fn="$1" label="$2" detail="$3"
  printf "  "
  $status_fn
  printf "  %s  %s\n" "$label" "$detail"
}

print_status() {
  echo ""
  info "───────────────────────────────────────────────────"
  info "  Playground Connection Check"
  info "───────────────────────────────────────────────────"
  echo ""

  local ALL_PASSED=true

  printf "  ${CYAN}── Services ───────────────────────────────────${NC}\n"
  if wait_for_url "http://localhost:${SERVER_PORT}/health" 2; then
    _print_check _status_ok "GenicUI Server" "http://localhost:${SERVER_PORT}/health"
  else
    _print_check _status_err "GenicUI Server" "http://localhost:${SERVER_PORT} not responding"
    ALL_PASSED=false
  fi

  if wait_for_url "http://localhost:${PLAYGROUND_PORT}/" 2; then
    _print_check _status_ok "Playground"     "http://localhost:${PLAYGROUND_PORT}/"
  else
    _print_check _status_err "Playground"     "http://localhost:${PLAYGROUND_PORT} not responding"
    ALL_PASSED=false
  fi

  echo ""
  info "───────────────────────────────────────────────────"
  if $ALL_PASSED; then
    printf "  ${GREEN}✓ All services healthy${NC}\n"
  else
    printf "  ${RED}✗ Some services failed — see above${NC}\n"
  fi
  info "───────────────────────────────────────────────────"

  print_urls
  $ALL_PASSED && return 0 || return 1
}

print_urls() {
  echo ""
  info "───────────────────────────────────────────────────"
  info "  Service URLs"
  info "───────────────────────────────────────────────────"
  echo ""
  printf "  ${GREEN}GenicUI Server${NC}        →  ${CYAN}http://localhost:${SERVER_PORT}/health${NC}\n"
  printf "  ${GREEN}Playground${NC}            →  ${CYAN}http://localhost:${PLAYGROUND_PORT}/${NC}\n"
  printf "  ${GREEN}WebSocket Endpoint${NC}    →  ${CYAN}ws://localhost:${SERVER_PORT}/ws${NC}\n"
  echo ""
  printf "  ${YELLOW}Log files:${NC}\n"
  printf "    Server:      %s\n" "$SERVER_LOG"
  printf "    Playground:  %s\n" "$PLAYGROUND_LOG"
  echo ""
}

# ── Main ──────────────────────────────────────────────────────────
main() {
  check_deps
  echo ""
  info "═══════════════════════════════════════════════"
  info "  GenicUI Playground — Starting services …"
  info "═══════════════════════════════════════════════"
  echo ""

  local TOTAL_START; TOTAL_START=$(_now)

  start_genicui_server || exit 1
  echo ""
  start_playground || exit 1

  local TOTAL_END; TOTAL_END=$(_now)
  echo ""
  print_urls
  printf "  ${YELLOW}Total startup:${NC} %s\n" "$(_elapsed_s "$TOTAL_START" "$TOTAL_END")"
  echo ""
}

# ── Dispatch ──────────────────────────────────────────────────────
case "${1:---start}" in
  --stop)    stop_services ;;
  --status)  print_status ;;
  --server)
    stop_services
    sleep 1
    load_dotenv
    check_deps
    ensure_mcp_config
    start_genicui_server || exit 1
    ;;
  --playground)
    stop_services
    sleep 1
    load_dotenv
    check_deps
    ensure_mcp_config
    start_playground || exit 1
    ;;
  --start|--fg|"")
    stop_services
    sleep 1
    load_dotenv
    ensure_mcp_config
    main
    ;;
  --restart|--reload)
    stop_services
    sleep 1
    load_dotenv
    ensure_mcp_config
    main
    ;;
  *)
    echo "Usage: bash start.sh [--start|--stop|--status|--restart|--server|--playground]"
    exit 1
    ;;
esac
