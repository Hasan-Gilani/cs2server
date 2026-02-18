#!/bin/bash
# CS2 Dedicated Server - Update Script
# Run this whenever a CS2 update is released.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [[ -f "$SCRIPT_DIR/.env" ]]; then
    source "$SCRIPT_DIR/.env"
else
    echo "ERROR: .env not found."
    exit 1
fi

STEAMCMD_DIR="${STEAMCMD_DIR:-$HOME/steamcmd}"
CS2_DIR="${CS2_DIR:-$HOME/cs2}"

echo "Updating CS2 (App ID 730)..."

"$STEAMCMD_DIR/steamcmd.sh" \
    +force_install_dir "$CS2_DIR" \
    +login anonymous \
    +app_update 730 \
    +quit

echo "Update complete."
