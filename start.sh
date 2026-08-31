#!/usr/bin/env bash
# ────────────────────────────────────────────────────────────────────
# GenicUI PoC — Local Development Launcher
# Starts both background services and prints their URLs.
#
# Fixed ports:
#   Web Chat Surface (http)    → 8080     python3 -m http.server
#   MCP Server (HTTP /mcp)     → 9877     node poc/server/index.mjs
#     (llmkb-style — stateless, paired with the WebSocket bridge on 9876
#      so .mcp.json can use `mcp-remote` to dial it instead of spawning
#      a fresh process per Claude Code session. Eliminates the
#      EADDRINUSE / "MCP error -32000: Connection closed" race.)
#
# If any process is already running on these ports, it will be killed
# before the service starts.
#
# Usage:
#   bash start.sh             → stop + start all services
#   bash start.sh --stop      → stop all services
#   bash start.sh --status    → run health check, print URLs
#   bash start.sh --restart   → stop + start (fresh logs)
#   bash start.sh --fg        → alias of default (services run detached)
#
# Claude Code is NOT launched by this script — start it in another terminal:
#     cd /Users/pk/Projects/GenicUI && claude --dangerously-skip-permissions
# ────────────────────────────────────────────────────────────────────
set -uo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT_DIR"

WEB_PORT=8080
WS_PORT=9876
HTTP_PORT=9877

GREEN='\033[0;32m'; CYAN='\033[0;36m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; DIM='\033[2m'; NC='\033[0m'
info()  { printf "${CYAN}[INFO]${NC}  %s\n" "$*"; }
ok()    { printf "${GREEN}[OK]${NC}    %s\n" "$*"; }
warn()  { printf "${YELLOW}[WARN]${NC}  %s\n" "$*"; }
err()   { printf "${RED}[ERR]${NC}   %s\n" "$*"; }

PID_FILE="/tmp/genicui-pids"
STATIC_LOG="/tmp/genicui-static.log"
MCP_LOG="/tmp/genicui-mcp.log"

# ── Pre-flight checks ─────────────────────────────────────────────
check_deps() {
  local missing=0
  for cmd in node npm python3; do
    if ! command -v "$cmd" &>/dev/null; then
      err "$cmd is not installed — install it first"
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
# _now: nanoseconds since epoch (macOS lacks $SECONDS in subshells).
_now() { date +%s%N; }
_elapsed_s() {
  local diff=$(( $2 - $1 ))
  local secs=$(( diff / 1000000000 ))
  local tenths=$(( (diff % 1000000000) / 100000000 ))
  printf "%d.%ds" "$secs" "$tenths"
}

# write_pid_file <static_pid> <mcp_pid>
# Merge-update the PID file. Pass "__KEEP__" to leave a slot unchanged
# (needed because start_static_server and start_mcp_server run in
# either order across restart cycles).
write_pid_file() {
  local new_static="$1" new_mcp="$2"
  local existing_static="" existing_mcp=""
  if [ -f "$PID_FILE" ]; then
    # shellcheck disable=SC1090
    source "$PID_FILE"
    existing_static="${STATIC_PID:-}"
    existing_mcp="${MCP_PID:-}"
  fi
  [ "$new_static" != "__KEEP__" ] && existing_static="$new_static"
  [ "$new_mcp"    != "__KEEP__" ] && existing_mcp="$new_mcp"
  cat > "$PID_FILE" <<-PIDEOF
	STATIC_PID=$existing_static
	MCP_PID=$existing_mcp
	PIDEOF
}

# kill_by_port <port>
# SIGTERM all app processes (node/python) holding the port, wait,
# SIGKILL survivors. Mirrors the helper from llmkb's start.sh.
kill_by_port() {
  local port="$1"
  local pids pname pbase_lower
  pids=$(lsof -ti :"$port" 2>/dev/null || true)
  [ -z "$pids" ] && return 0

  # First pass: SIGTERM node/python processes only (skip Chrome helpers —
  # killing those would crash Cursor/Brave on macOS).
  for pid in $pids; do
    pname=$(ps -p "$pid" -o comm= 2>/dev/null || echo "")
    pbase_lower=$(basename "$pname" 2>/dev/null | tr '[:upper:]' '[:lower:]')
    case "$pbase_lower" in
      node|python|node-*|npm) kill "$pid" 2>/dev/null || true ;;
      *) : ;;
    esac
  done

  # Wait up to 3s for the port to free.
  local _port_free=false
  for _i in $(seq 1 15); do
    if ! lsof -ti :"$port" >/dev/null 2>&1; then
      _port_free=true
      break
    fi
    sleep 0.2
  done

  # Second pass: SIGKILL survivors.
  if [ "$_port_free" = false ]; then
    pids=$(lsof -ti :"$port" 2>/dev/null || true)
    for pid in $pids; do
      pname=$(ps -p "$pid" -o comm= 2>/dev/null || echo "")
      pbase_lower=$(basename "$pname" 2>/dev/null | tr '[:upper:]' '[:lower:]')
      case "$pbase_lower" in
        node|python|node-*|npm) kill -9 "$pid" 2>/dev/null || true ;;
        *) : ;;
      esac
    done
    sleep 0.3
  fi
}

# wait_for_http <url> <timeout_s> — poll until 200 or timeout.
wait_for_http() {
  # We can't send a real MCP initialize here without leaking protocol
  # details into the launcher. Just confirm the port is bound — the MCP
  # server responds 400/405 to non-initialize requests, which curl -sf
  # treats as failure. So we use a connect-only curl (-o /dev/null
  # without -f) and check the HTTP status separately.
  local port="$1" timeout="$2"
  for _i in $(seq 1 "$timeout"); do
    if lsof -ti :"$port" &>/dev/null; then
      return 0
    fi
    sleep 1
  done
  return 1
}

wait_for_url_body() {
  # Like wait_for_http but actually checks a 200 OK (used for the chat
  # surface, which is a plain HTTP server).
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

  # Kill by PID file (fast path for processes we launched).
  if [ -f "$PID_FILE" ]; then
    # shellcheck disable=SC1091
    source "$PID_FILE"
    [ -n "${STATIC_PID:-}" ] && kill "$STATIC_PID" 2>/dev/null || true
    [ -n "${MCP_PID:-}"    ] && kill "$MCP_PID"    2>/dev/null || true
  fi

  # Kill by port (catches processes started outside start.sh).
  kill_by_port "$WEB_PORT"
  kill_by_port "$WS_PORT"
  kill_by_port "$HTTP_PORT"

  rm -f "$PID_FILE"
  ok "All services stopped."
}

# ── Service starters ───────────────────────────────────────────────
start_static_server() {
  local START; START=$(_now)

  # Free the port first.
  kill_by_port "$WEB_PORT"

  if [ ! -d "$ROOT_DIR/poc/web" ]; then
    err "poc/web/ directory not found — is this the GenicUI repo root?"
    return 1
  fi

  info "Starting web chat surface on port $WEB_PORT …"
  rm -f "$STATIC_LOG"
  # nohup + </dev/null + disown — on macOS a backgrounded child can
  # receive SIGHUP when the launcher exits, killing the server before
  # Claude Code ever connects. nohup ignores SIGHUP; closing stdin +
  # disown fully detaches the process from the launcher session.
  # Serve from $ROOT_DIR (not poc/web) so app.mjs's
  # `import {...} from '../adaptors/*.mjs'` resolves correctly — the
  # adaptors live in poc/adaptors, sibling of poc/web.
  (
    cd "$ROOT_DIR"
    exec nohup python3 -m http.server "$WEB_PORT" --bind 127.0.0.1 </dev/null
  ) > "$STATIC_LOG" 2>&1 &
  local STATIC_PID=$!
  disown "$STATIC_PID" 2>/dev/null || true

  if wait_for_url_body "http://localhost:${WEB_PORT}/poc/web/" 10; then
    ok "Chat surface is ready (http://localhost:${WEB_PORT}/poc/web/)"
  else
    err "Chat surface did not respond within 10s — see $STATIC_LOG"
    kill "$STATIC_PID" 2>/dev/null || true
    return 1
  fi

  STATIC_END=$(_now)
  echo "  ${YELLOW}Startup:${NC}    $(_elapsed_s "$START" "$STATIC_END")"

  # Write PID (preserve any MCP_PID already on disk).
  write_pid_file "$STATIC_PID" "__KEEP__"
}

start_mcp_server() {
  local START; START=$(_now)

  # Free both ports (bridge on 9876, HTTP /mcp on 9877).
  kill_by_port "$WS_PORT"
  kill_by_port "$HTTP_PORT"

  if [ ! -f "$ROOT_DIR/poc/server/index.mjs" ]; then
    err "poc/server/index.mjs not found — is this the GenicUI repo root?"
    return 1
  fi

  info "Starting MCP server (HTTP on :$HTTP_PORT + WebSocket bridge on :$WS_PORT) …"
  rm -f "$MCP_LOG"
  # Long-running mode: GENICUI_TRANSPORT=http skips the stdio transport
  # and serves /mcp over HTTP instead. mcp-remote (in .mcp.json) dials
  # this HTTP endpoint, so Claude Code does not spawn its own MCP process.
  # The chat backend also spawns `claude --print --mcp-config <path>` per
  # browser-submitted prompt — we point it at the same .mcp.json so
  # Claude Code discovers this MCP server.
  # nohup + </dev/null + disown — see comment in start_static_server.
  GENICUI_BRIDGE_PORT="$WS_PORT" \
    GENICUI_HTTP_PORT="$HTTP_PORT" \
    GENICUI_TRANSPORT=http \
    GENICUI_MCP_CONFIG="$ROOT_DIR/.mcp.json" \
    nohup node "$ROOT_DIR/poc/server/index.mjs" </dev/null > "$MCP_LOG" 2>&1 &
  local MCP_PID=$!
  disown "$MCP_PID" 2>/dev/null || true

  # Wait for the HTTP endpoint to come up.
  if wait_for_http "$HTTP_PORT" 15; then
    sleep 0.3  # let the bridge's "listening" line land in $MCP_LOG
    ok "MCP server is ready (http://localhost:${HTTP_PORT}/mcp + ws://localhost:${WS_PORT})"
  else
    err "MCP server did not respond on http://localhost:${HTTP_PORT}/ within 15s — see $MCP_LOG"
    kill "$MCP_PID" 2>/dev/null || true
    return 1
  fi

  MCP_END=$(_now)
  echo "  ${YELLOW}Startup:${NC}    $(_elapsed_s "$START" "$MCP_END")"

  # Write PID (preserve any STATIC_PID already on disk).
  write_pid_file "__KEEP__" "$MCP_PID"
}

# ── Status / health check ──────────────────────────────────────────
_status_ok()    { printf "${GREEN}[OK]${NC}"; }
_status_err()   { printf "${RED}[ERR]${NC}"; }
_status_warn()  { printf "${YELLOW}[WARN]${NC}"; }

_print_check() {
  local status_fn="$1" label="$2" detail="$3"
  printf "  "
  $status_fn
  printf "  %-${COL}s  %s\n" "$label" "$detail"
}

print_status() {
  echo ""
  info "───────────────────────────────────────────────────"
  info "  GenicUI Connection Check"
  info "───────────────────────────────────────────────────"
  echo ""

  local ALL_PASSED=true
  local COL=22
  local _ms _code

  _curl_ms() {
    local _t; _t=$(curl -so /dev/null -w '%{time_total}' --connect-timeout 2 --max-time 5 "$1" 2>/dev/null) || true
    [ -n "$_t" ] && awk "BEGIN {printf \"%.0f\", ${_t}*1000}" 2>/dev/null || echo ""
  }

  printf "  ${CYAN}── Web Chat Surface ─────────────────────────${NC}\n"
  _ms=$(_curl_ms "http://localhost:${WEB_PORT}/poc/web/")
  if [ -n "$_ms" ]; then
    _print_check _status_ok "Chat Surface" "http://localhost:${WEB_PORT}/poc/web/ (${_ms}ms)"
  else
    _print_check _status_err "Chat Surface" "http://localhost:${WEB_PORT}/poc/web/ not responding"
    ALL_PASSED=false
  fi

  echo ""
  printf "  ${CYAN}── MCP Server ───────────────────────────────${NC}\n"
  if lsof -ti :"$HTTP_PORT" &>/dev/null; then
    local MCP_PID_VAL
    MCP_PID_VAL=$(lsof -ti :"$HTTP_PORT" 2>/dev/null | head -1)
    _print_check _status_ok "HTTP /mcp endpoint" "http://localhost:${HTTP_PORT} (pid ${MCP_PID_VAL})"
  else
    _print_check _status_err "HTTP /mcp endpoint" "port ${HTTP_PORT} not bound"
    ALL_PASSED=false
  fi
  if lsof -ti :"$WS_PORT" &>/dev/null; then
    _print_check _status_ok "WebSocket Bridge" "ws://localhost:${WS_PORT}"
  else
    _print_check _status_err "WebSocket Bridge" "port ${WS_PORT} not bound"
    ALL_PASSED=false
  fi
  if [ -f "$MCP_LOG" ]; then
    local REG_COUNT
    REG_COUNT=$(grep -c "^\[registry\] registered:" "$MCP_LOG" 2>/dev/null || echo 0)
    _print_check _status_ok "Registry" "${REG_COUNT} components in log"
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
  printf "  ${GREEN}Chat Surface${NC}              →  ${CYAN}http://localhost:${WEB_PORT}/poc/web/${NC}\n"
  printf "  ${GREEN}MCP HTTP endpoint${NC}         →  ${CYAN}http://localhost:${HTTP_PORT}/mcp${NC}\n"
  printf "  ${GREEN}MCP WebSocket Bridge${NC}      →  ${CYAN}ws://localhost:${WS_PORT}${NC}\n"
  echo ""
  printf "  ${YELLOW}Log files:${NC}\n"
  printf "    Static:  %s\n" "$STATIC_LOG"
  printf "    MCP:     %s\n" "$MCP_LOG"
  echo ""
  printf "  ${YELLOW}Open the chat surface to drive everything from the browser:${NC}\n"
  printf "    ${CYAN}http://localhost:${WEB_PORT}/poc/web/${NC}\n"
  printf "  Type prompts there — the chat backend spawns ${CYAN}claude --print${NC} per turn\n"
  printf "  and GenicUI components render inline.\n"
  printf "  ${YELLOW}(Optional) you can still drive from a Claude Code terminal:${NC}\n"
  printf "    ${CYAN}claude --dangerously-skip-permissions${NC}\n"
  echo ""
}

# ── Main ──────────────────────────────────────────────────────────
main() {
  check_deps
  echo ""
  info "═══════════════════════════════════════════════"
  info "  GenicUI PoC — Starting services …"
  info "═══════════════════════════════════════════════"
  echo ""

  local TOTAL_START; TOTAL_START=$(_now)

  start_static_server || exit 1
  echo ""
  start_mcp_server    || exit 1

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
  --start|--fg|"")
    stop_services
    sleep 1
    main
    ;;
  --restart|--reload)
    stop_services
    sleep 1
    # Unset any stale GENICUI_* env so the start picks up the defaults.
    unset GENICUI_BRIDGE_PORT GENICUI_HTTP_PORT GENICUI_TRANSPORT GENICUI_MCP_CONFIG 2>/dev/null || true
    main
    ;;
  *)
    echo "Usage: bash start.sh [--start|--stop|--status|--restart|--fg]"
    exit 1
    ;;
esac
