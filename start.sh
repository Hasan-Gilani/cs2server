#!/bin/bash
# CS2 Dedicated Server - Start Script

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [[ -f "$SCRIPT_DIR/.env" ]]; then
    source "$SCRIPT_DIR/.env"
else
    echo "ERROR: .env not found. Copy .env.example to .env and configure it."
    exit 1
fi

# ── Config (all overridable via .env) ─────────────────────────────────────────
CS2_DIR="${CS2_DIR:-$HOME/cs2}"
SERVER_NAME="${SERVER_NAME:-CS2 Server}"
MAP="${MAP:-de_dust2}"
MAX_PLAYERS="${MAX_PLAYERS:-10}"
GAME_TYPE="${GAME_TYPE:-0}"   # 0 = Classic, 1 = Gungame, 2 = Training, 3 = Custom
GAME_MODE="${GAME_MODE:-1}"   # Classic: 0=Casual, 1=Competitive, 2=Wingman
PORT="${PORT:-27015}"
TV_PORT="${TV_PORT:-27020}"
CLIENT_PORT="${CLIENT_PORT:-27005}"
TICKRATE="${TICKRATE:-128}"
SERVER_PASSWORD="${SERVER_PASSWORD:-}"
RCON_PASSWORD="${RCON_PASSWORD:-changeme}"
STEAM_ACCOUNT="${STEAM_ACCOUNT:-}"  # Game Server Login Token (GSLT)

CS2_BIN="$CS2_DIR/game/bin/linuxsteamrt64/cs2"

if [[ ! -f "$CS2_BIN" ]]; then
    echo "ERROR: CS2 binary not found at $CS2_BIN"
    echo "Run ./install.sh first."
    exit 1
fi

# ── Build launch args ─────────────────────────────────────────────────────────
ARGS=(
    -dedicated
    -console
    -usercon
    +map "$MAP"
    -maxplayers "$MAX_PLAYERS"
    -game csgo
    -gametype "$GAME_TYPE"
    -gamemode "$GAME_MODE"
    -tickrate "$TICKRATE"
    -port "$PORT"
    -tv_port "$TV_PORT"
    -clientport "$CLIENT_PORT"
    +hostname "$SERVER_NAME"
    +sv_setsteamaccount "$STEAM_ACCOUNT"
    +rcon_password "$RCON_PASSWORD"
    +exec server.cfg
)

# Only add sv_password if set
if [[ -n "$SERVER_PASSWORD" ]]; then
    ARGS+=(+sv_password "$SERVER_PASSWORD")
fi

# ── Launch mode ───────────────────────────────────────────────────────────────
USE_SCREEN="${USE_SCREEN:-false}"
SCREEN_NAME="${SCREEN_NAME:-cs2server}"

echo "Starting CS2 server: $SERVER_NAME"
echo "Map: $MAP | Players: $MAX_PLAYERS | Port: $PORT | Tickrate: $TICKRATE"
echo ""

if [[ "$USE_SCREEN" == "true" ]]; then
    echo "Launching inside screen session '$SCREEN_NAME'..."
    echo "  Reattach with: screen -r $SCREEN_NAME"
    screen -dmS "$SCREEN_NAME" "$CS2_BIN" "${ARGS[@]}"
else
    exec "$CS2_BIN" "${ARGS[@]}"
fi
