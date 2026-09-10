#!/usr/bin/env bash
# ────────────────────────────────────────────────────────────────────
# GenicUI — Local Development Launcher
# Starts all production services and prints their URLs.
#
# Services:
#   GenicUI HTTP Server (Elysia) → 3040   bun run dev (packages/server)
#   PoC Chat Surface (http)      → 8080   python3 -m http.server
#   PoC MCP Server (HTTP /mcp)   → 9877   node poc/server/index.mjs
#   PoC WebSocket Bridge         → 9876   node poc/server/index.mjs
#
# If any process is already running on these ports, it will be killed
# before the service starts.
#
# Usage:
#   bash start.sh               → stop + start all services
#   bash start.sh --stop        → stop all services
#   bash start.sh --status      → run health check, print URLs
#   bash start.sh --restart     → stop + start (fresh logs)
#   bash start.sh --server      → start only the production server
#   bash start.sh --poc         → start only the PoC services
#
# Claude Code is NOT launched by this script — start it in another terminal:
#     cd /Users/pk/Projects/GenicUI && claude --dangerously-skip-permissions
# ────────────────────────────────────────────────────────────────────
set -uo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT_DIR"

SERVER_PORT=3040
WEB_PORT=8080
WS_PORT=9876
HTTP_PORT=9877

GREEN='\033[0;32m'; CYAN='\033[0;36m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'
info()  { printf "${CYAN}[INFO]${NC}  %s\n" "$*"; }
ok()    { printf "${GREEN}[OK]${NC}    %s\n" "$*"; }
warn()  { printf "${YELLOW}[WARN]${NC}  %s\n" "$*"; }
err()   { printf "${RED}[ERR]${NC}   %s\n" "$*"; }

PID_FILE="/tmp/genicui-pids"
SERVER_LOG="/tmp/genicui-server.log"
STATIC_LOG="/tmp/genicui-static.log"
MCP_LOG="/tmp/genicui-mcp.log"

# ── Pre-flight checks ─────────────────────────────────────────────

# Source .env (gitignored) into the current shell so the spawned server
# process inherits the ANTHROPIC_* gateway settings. .env.example is
# committed; each developer copies it to .env and fills in their values.
load_dotenv() {
  if [ -f "$ROOT_DIR/.env" ]; then
    set -a
    # shellcheck disable=SC1091
    . "$ROOT_DIR/.env"
    set +a
    info "Loaded .env (ANTHROPIC_BASE_URL=${ANTHROPIC_BASE_URL:-<unset>})"
  fi
}

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

# Regenerate .mcp.json from the template if it's missing or stale.
# Without this, Claude Code is given a stale or macOS-flavored absolute
# path and the GenicUI MCP server never loads — every chat tool call
# then surfaces as `[error: unknown]` in the playground.
ensure_mcp_config() {
  if [ ! -f "$ROOT_DIR/mcp.json.example" ]; then
    warn "mcp.json.example not found at $ROOT_DIR — skipping MCP config generation"
    return 0
  fi
  if [ ! -f "$ROOT_DIR/.mcp.json" ] || [ "$ROOT_DIR/mcp.json.example" -nt "$ROOT_DIR/.mcp.json" ]; then
    info "Generating .mcp.json from mcp.json.example …"
    (cd "$ROOT_DIR" && bun run scripts/generate-mcp-config.ts --repo-root "$ROOT_DIR" >/dev/null) \
      && ok "Wrote .mcp.json" \
      || warn "Could not regenerate .mcp.json — Claude Code will fall back to a stale config"
  fi
}

# ── Helpers ────────────────────────────────────────────────────────
_now() { date +%s%N; }
_elapsed_s() {
  local diff=$(( $2 - $1 ))
  local secs=$(( diff / 1000000000 ))
  local tenths=$(( (diff % 1000000000) / 100000000 ))
  printf "%d.%ds" "$secs" "$tenths"
}

# write_pid_file <server_pid> <static_pid> <mcp_pid>
write_pid_file() {
  cat > "$PID_FILE" <<-PIDEOF
	GENERICUI_SERVER_PID=${1:-}
	STATIC_PID=${2:-}
	MCP_PID=${3:-}
	PIDEOF
}

# kill_by_port <port>
kill_by_port() {
  local port="$1"
  local pids pname pbase_lower
  pids=$(lsof -ti :"$port" 2>/dev/null || true)
  [ -z "$pids" ] && return 0

  for pid in $pids; do
    pname=$(ps -p "$pid" -o comm= 2>/dev/null || echo "")
    pbase_lower=$(basename "$pname" 2>/dev/null | tr '[:upper:]' '[:lower:]')
    case "$pbase_lower" in
      node|python|node-*|npm|bun) kill "$pid" 2>/dev/null || true ;;
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
        node|python|node-*|npm|bun) kill -9 "$pid" 2>/dev/null || true ;;
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
    [ -n "${STATIC_PID:-}" ] && kill "$STATIC_PID" 2>/dev/null || true
    [ -n "${MCP_PID:-}"    ] && kill "$MCP_PID"    2>/dev/null || true
  fi

  kill_by_port "$SERVER_PORT"
  kill_by_port "$WEB_PORT"
  kill_by_port "$WS_PORT"
  kill_by_port "$HTTP_PORT"

  rm -f "$PID_FILE"
  ok "All services stopped."
}

# ── Service starters ───────────────────────────────────────────────
start_genicui_server() {
  local START; START=$(_now)

  kill_by_port "$SERVER_PORT"

  if [ ! -d "$ROOT_DIR/packages/server" ]; then
    err "packages/server/ not found — is this the GenicUI repo root?"
    return 1
  fi

  info "Starting GenicUI HTTP server on port $SERVER_PORT …"
  rm -f "$SERVER_LOG"
  (
    cd "$ROOT_DIR"
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

  SERVER_END=$(_now)
  echo "  ${YELLOW}Startup:${NC}    $(_elapsed_s "$START" "$SERVER_END")"

  write_pid_file "$SERVER_PID" "${2:-}" "${3:-}"
}

start_static_server() {
  local START; START=$(_now)

  kill_by_port "$WEB_PORT"

  if [ ! -d "$ROOT_DIR/poc/web" ]; then
    warn "poc/web/ directory not found — skipping chat surface"
    return 0
  fi

  if ! command -v python3 &>/dev/null; then
    warn "python3 not installed — skipping chat surface"
    return 0
  fi

  info "Starting web chat surface on port $WEB_PORT …"
  rm -f "$STATIC_LOG"
  (
    cd "$ROOT_DIR"
    exec nohup python3 -m http.server "$WEB_PORT" --bind 127.0.0.1 </dev/null
  ) > "$STATIC_LOG" 2>&1 &
  local STATIC_PID=$!
  disown "$STATIC_PID" 2>/dev/null || true

  if wait_for_url "http://localhost:${WEB_PORT}/poc/web/" 10; then
    ok "Chat surface is ready (http://localhost:${WEB_PORT}/poc/web/)"
  else
    err "Chat surface did not respond within 10s — see $STATIC_LOG"
    kill "$STATIC_PID" 2>/dev/null || true
    return 1
  fi

  STATIC_END=$(_now)
  echo "  ${YELLOW}Startup:${NC}    $(_elapsed_s "$START" "$STATIC_END")"

  write_pid_file "${1:-}" "$STATIC_PID" "${3:-}"
}

start_mcp_server() {
  local START; START=$(_now)

  kill_by_port "$WS_PORT"
  kill_by_port "$HTTP_PORT"

  if [ ! -f "$ROOT_DIR/poc/server/index.mjs" ]; then
    warn "poc/server/index.mjs not found — skipping PoC MCP server"
    return 0
  fi

  if ! command -v node &>/dev/null; then
    warn "node not installed — skipping PoC MCP server"
    return 0
  fi

  info "Starting PoC MCP server (HTTP on :$HTTP_PORT + WebSocket bridge on :$WS_PORT) …"
  rm -f "$MCP_LOG"
  GENICUI_BRIDGE_PORT="$WS_PORT" \
    GENICUI_HTTP_PORT="$HTTP_PORT" \
    GENICUI_TRANSPORT=http \
    GENICUI_MCP_CONFIG="$ROOT_DIR/.mcp.json" \
    nohup node "$ROOT_DIR/poc/server/index.mjs" </dev/null > "$MCP_LOG" 2>&1 &
  local MCP_PID=$!
  disown "$MCP_PID" 2>/dev/null || true

  # Wait for the HTTP endpoint to come up.
  local _port_free=false
  for _i in $(seq 1 15); do
    if lsof -ti :"$HTTP_PORT" &>/dev/null; then
      _port_free=true
      break
    fi
    sleep 1
  done

  if [ "$_port_free" = true ]; then
    sleep 0.3
    ok "PoC MCP server is ready (http://localhost:${HTTP_PORT}/mcp + ws://localhost:${WS_PORT})"
  else
    err "PoC MCP server did not respond within 15s — see $MCP_LOG"
    kill "$MCP_PID" 2>/dev/null || true
    return 1
  fi

  MCP_END=$(_now)
  echo "  ${YELLOW}Startup:${NC}    $(_elapsed_s "$START" "$MCP_END")"

  write_pid_file "${1:-}" "${2:-}" "$MCP_PID"
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
  info "  GenicUI Connection Check"
  info "───────────────────────────────────────────────────"
  echo ""

  local ALL_PASSED=true

  printf "  ${CYAN}── Production Server ─────────────────────────${NC}\n"
  if wait_for_url "http://localhost:${SERVER_PORT}/health" 2; then
    _print_check _status_ok "GenicUI Server" "http://localhost:${SERVER_PORT}/health"
  else
    _print_check _status_err "GenicUI Server" "http://localhost:${SERVER_PORT} not responding"
    ALL_PASSED=false
  fi

  echo ""
  printf "  ${CYAN}── PoC Services ──────────────────────────────${NC}\n"
  if wait_for_url "http://localhost:${WEB_PORT}/poc/web/" 2; then
    _print_check _status_ok "Chat Surface" "http://localhost:${WEB_PORT}/poc/web/"
  else
    _print_check _status_err "Chat Surface" "http://localhost:${WEB_PORT} not responding"
    ALL_PASSED=false
  fi

  if lsof -ti :"$HTTP_PORT" &>/dev/null; then
    _print_check _status_ok "PoC MCP HTTP" "http://localhost:${HTTP_PORT}/mcp"
  else
    _print_check _status_err "PoC MCP HTTP" "port ${HTTP_PORT} not bound"
  fi

  if lsof -ti :"$WS_PORT" &>/dev/null; then
    _print_check _status_ok "PoC WS Bridge" "ws://localhost:${WS_PORT}"
  else
    _print_check _status_err "PoC WS Bridge" "port ${WS_PORT} not bound"
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
  printf "  ${GREEN}GenicUI Server${NC}            →  ${CYAN}http://localhost:${SERVER_PORT}/health${NC}\n"
  printf "  ${GREEN}Chat Surface${NC}              →  ${CYAN}http://localhost:${WEB_PORT}/poc/web/${NC}\n"
  printf "  ${GREEN}PoC MCP HTTP${NC}              →  ${CYAN}http://localhost:${HTTP_PORT}/mcp${NC}\n"
  printf "  ${GREEN}PoC WebSocket Bridge${NC}      →  ${CYAN}ws://localhost:${WS_PORT}${NC}\n"
  echo ""
  printf "  ${YELLOW}Log files:${NC}\n"
  printf "    Server:  %s\n" "$SERVER_LOG"
  printf "    Static:  %s\n" "$STATIC_LOG"
  printf "    MCP:     %s\n" "$MCP_LOG"
  echo ""
}

# ── Main ──────────────────────────────────────────────────────────
main() {
  check_deps
  echo ""
  info "═══════════════════════════════════════════════"
  info "  GenicUI — Starting services …"
  info "═══════════════════════════════════════════════"
  echo ""

  local TOTAL_START; TOTAL_START=$(_now)

  start_genicui_server || exit 1
  echo ""
  start_static_server || exit 1
  echo ""
  start_mcp_server || exit 1

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
  --poc)
    stop_services
    sleep 1
    load_dotenv
    check_deps
    ensure_mcp_config
    start_static_server || exit 1
    echo ""
    start_mcp_server || exit 1
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
    echo "Usage: bash start.sh [--start|--stop|--status|--restart|--server|--poc]"
    exit 1
    ;;
esac
