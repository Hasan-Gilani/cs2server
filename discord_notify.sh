#!/bin/bash
# CS2 Server — Discord startup notification
# Fetches this EC2 instance's public IP and sends it to a Discord webhook.
# Designed to run as a systemd one-shot service on boot.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

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
        # IMDSv1 fallback
        curl -sf --connect-timeout 5 \
            "http://169.254.169.254/latest/meta-data/public-ipv4" 2>/dev/null || true
    fi
}

# Retry up to 12 times (60 s) — metadata service may not be ready instantly
PUBLIC_IP=""
for i in $(seq 1 12); do
    PUBLIC_IP=$(get_public_ip)
    if [[ -n "$PUBLIC_IP" ]]; then
        break
    fi
    echo "Waiting for instance metadata... (attempt $i/12)"
    sleep 5
done

if [[ -z "$PUBLIC_IP" ]]; then
    echo "WARNING: Could not retrieve public IP. Sending notification without it."
    PUBLIC_IP="(unknown)"
fi

# ── Build Discord message ─────────────────────────────────────────────────────
TIMESTAMP="$(date -u '+%Y-%m-%d %H:%M UTC')"

PAYLOAD=$(cat <<EOF
{
  "embeds": [{
    "title": ":green_circle: CS2 Server Online",
    "color": 3066993,
    "fields": [
      { "name": "Server",    "value": "$SERVER_NAME",         "inline": true },
      { "name": "IP",        "value": "\`$PUBLIC_IP:$PORT\`",  "inline": true },
      { "name": "Connect",   "value": "\`connect $PUBLIC_IP:$PORT\`", "inline": false }
    ],
    "footer": { "text": "$TIMESTAMP" }
  }]
}
EOF
)

# ── POST to Discord ───────────────────────────────────────────────────────────
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
    -X POST "$DISCORD_WEBHOOK_URL" \
    -H "Content-Type: application/json" \
    -d "$PAYLOAD")

if [[ "$HTTP_STATUS" == "204" ]]; then
    echo "Discord notification sent. IP: $PUBLIC_IP:$PORT"
else
    echo "Discord webhook returned HTTP $HTTP_STATUS"
    exit 1
fi
