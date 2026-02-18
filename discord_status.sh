#!/bin/bash
# CS2 Server — Discord live status updater
# Edits the message posted by discord_notify.sh with current player count and map.
# Run by discord-status.timer every minute.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
STATE_FILE="$HOME/.cs2_discord_state"

if [[ -f "$SCRIPT_DIR/.env" ]]; then
    source "$SCRIPT_DIR/.env"
else
    exit 0
fi

DISCORD_WEBHOOK_URL="${DISCORD_WEBHOOK_URL:-}"
[[ -z "$DISCORD_WEBHOOK_URL" ]] && exit 0
[[ ! -f "$STATE_FILE" ]]        && exit 0

MESSAGE_ID=$(grep '^MESSAGE_ID=' "$STATE_FILE" | cut -d= -f2-)
PUBLIC_IP=$(grep  '^PUBLIC_IP='  "$STATE_FILE" | cut -d= -f2-)
[[ -z "$MESSAGE_ID" ]] && exit 0

PORT="${PORT:-27015}"
SERVER_NAME="${SERVER_NAME:-CS2 Server}"

# ── Query CS2 via A2S_INFO (Source query protocol) ───────────────────────────
# Outputs:  players|max_players|map_name   or   offline
A2S_RESULT=$(python3 - <<'PYEOF' 2>/dev/null || echo "offline"
import socket

def query(host, port, timeout=2):
    req = b'\xFF\xFF\xFF\xFFTSource Engine Query\x00'
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    s.settimeout(timeout)
    try:
        s.sendto(req, (host, port))
        data, _ = s.recvfrom(1400)

        # Challenge response (newer Source Engine games)
        if len(data) >= 9 and data[4] == 0x41:
            challenge = data[5:9]
            s.sendto(req + challenge, (host, port))
            data, _ = s.recvfrom(1400)

        if len(data) < 6 or data[4] != 0x49:  # 0x49 = 'I' (info response)
            return None

        i = [6]  # mutable for nested closure

        def read_str():
            end = data.index(0, i[0])
            val = data[i[0]:end].decode('utf-8', errors='replace')
            i[0] = end + 1
            return val

        read_str()              # server name
        map_name = read_str()   # map
        read_str()              # folder
        read_str()              # game name
        i[0] += 2               # skip app ID (2 bytes)
        players     = data[i[0]]
        max_players = data[i[0] + 1]
        return f"{players}|{max_players}|{map_name}"
    except Exception:
        return None
    finally:
        s.close()

result = query('127.0.0.1', 27015)
print(result if result else "offline")
PYEOF
)

TIMESTAMP="$(date -u '+%H:%M UTC')"

# ── Build embed based on query result ────────────────────────────────────────
if [[ "$A2S_RESULT" == "offline" || -z "$A2S_RESULT" ]]; then
    if pgrep -f "linuxsteamrt64/cs2" > /dev/null 2>&1; then
        TITLE=":yellow_circle: $SERVER_NAME — Starting"
        COLOR=15844367  # gold / yellow
        PLAYERS_VAL="Starting..."
        MAP_VAL="—"
    else
        TITLE=":red_circle: $SERVER_NAME — Offline"
        COLOR=15158332  # red
        PLAYERS_VAL="—"
        MAP_VAL="—"
    fi
else
    IFS='|' read -r PLAYERS MAX_PLAYERS MAP_NAME <<< "$A2S_RESULT"
    TITLE=":green_circle: $SERVER_NAME — Online"
    COLOR=3066993  # green
    PLAYERS_VAL="$PLAYERS / $MAX_PLAYERS"
    MAP_VAL="$MAP_NAME"
fi

PAYLOAD=$(cat <<EOF
{
  "embeds": [{
    "title": "$TITLE",
    "color": $COLOR,
    "fields": [
      { "name": "IP",      "value": "\`$PUBLIC_IP:$PORT\`",        "inline": true },
      { "name": "Players", "value": "$PLAYERS_VAL",                "inline": true },
      { "name": "Map",     "value": "$MAP_VAL",                    "inline": true },
      { "name": "Connect", "value": "\`connect $PUBLIC_IP:$PORT\`", "inline": false }
    ],
    "footer": { "text": "Updated $TIMESTAMP • refreshes every minute" }
  }]
}
EOF
)

# ── PATCH the existing Discord message ───────────────────────────────────────
curl -s -o /dev/null -X PATCH \
    "${DISCORD_WEBHOOK_URL}/messages/${MESSAGE_ID}" \
    -H "Content-Type: application/json" \
    -d "$PAYLOAD"
