#!/bin/bash
# CS2 Server — Discord startup notification
# Posts the server's public IP to a Discord webhook on boot.
# Saves the message ID so discord_status.sh can edit it live.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
STATE_FILE="$HOME/.cs2_discord_state"

if [[ -f "$SCRIPT_DIR/.env" ]]; then
    source "$SCRIPT_DIR/.env"
else
    echo "ERROR: .env not found at $SCRIPT_DIR/.env"
    exit 1
fi

DISCORD_WEBHOOK_URL="${DISCORD_WEBHOOK_URL:-}"
if [[ -z "$DISCORD_WEBHOOK_URL" ]]; then
    echo "DISCORD_WEBHOOK_URL is not set in .env — skipping notification."
    exit 0
fi

SERVER_NAME="${SERVER_NAME:-CS2 Server}"
PORT="${PORT:-27015}"

# ── Fetch public IP (EC2 IMDSv2, falls back to IMDSv1) ───────────────────────
get_public_ip() {
    local token
    token=$(curl -sf --connect-timeout 5 \
        -X PUT "http://169.254.169.254/latest/api/token" \
        -H "X-aws-ec2-metadata-token-ttl-seconds: 21600" 2>/dev/null || true)

    if [[ -n "$token" ]]; then
        curl -sf --connect-timeout 5 \
            -H "X-aws-ec2-metadata-token: $token" \
            "http://169.254.169.254/latest/meta-data/public-ipv4" 2>/dev/null || true
    else
        curl -sf --connect-timeout 5 \
            "http://169.254.169.254/latest/meta-data/public-ipv4" 2>/dev/null || true
    fi
}

# Retry up to 12 times (60 s)
PUBLIC_IP=""
for i in $(seq 1 12); do
    PUBLIC_IP=$(get_public_ip)
    if [[ -n "$PUBLIC_IP" ]]; then break; fi
    echo "Waiting for instance metadata... (attempt $i/12)"
    sleep 5
done

if [[ -z "$PUBLIC_IP" ]]; then
    echo "WARNING: Could not retrieve public IP."
    PUBLIC_IP="(unknown)"
fi

TIMESTAMP="$(date -u '+%H:%M UTC')"

PAYLOAD=$(cat <<EOF
{
  "embeds": [{
    "title": ":yellow_circle: $SERVER_NAME — Starting",
    "color": 15844367,
    "fields": [
      { "name": "IP",      "value": "\`$PUBLIC_IP:$PORT\`",        "inline": true },
      { "name": "Players", "value": "Starting...",                  "inline": true },
      { "name": "Map",     "value": "—",                            "inline": true },
      { "name": "Connect", "value": "\`connect $PUBLIC_IP:$PORT\`", "inline": false }
    ],
    "footer": { "text": "Updated $TIMESTAMP • refreshes every minute" }
  }]
}
EOF
)

# ── POST (wait=true to get message ID back) ───────────────────────────────────
RESPONSE=$(curl -s -X POST "${DISCORD_WEBHOOK_URL}?wait=true" \
    -H "Content-Type: application/json" \
    -d "$PAYLOAD")

MESSAGE_ID=$(echo "$RESPONSE" | python3 -c "import json,sys; print(json.load(sys.stdin)['id'])" 2>/dev/null || true)

if [[ -z "$MESSAGE_ID" ]]; then
    echo "Failed to get message ID from Discord response: $RESPONSE"
    exit 1
fi

# Save state for discord_status.sh
cat > "$STATE_FILE" <<EOF
MESSAGE_ID=$MESSAGE_ID
PUBLIC_IP=$PUBLIC_IP
EOF

echo "Discord notification sent. IP: $PUBLIC_IP:$PORT (message ID: $MESSAGE_ID)"
