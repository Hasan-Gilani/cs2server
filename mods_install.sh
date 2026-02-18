#!/bin/bash
# CS2 Mods Installer
# Installs: Metamod:Source → CounterStrikeSharp → MatchZy, WeaponPaints, CS2-SimpleAdmin
#
# Run once after install.sh has completed.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CS2_DIR="${CS2_DIR:-$HOME/cs2}"
CSGO_DIR="$CS2_DIR/game/csgo"
ADDONS_DIR="$CSGO_DIR/addons"
TMP_DIR="$(mktemp -d)"

cleanup() { rm -rf "$TMP_DIR"; }
trap cleanup EXIT

log() { echo "[mods] $*"; }

# ── Verify CS2 is installed ────────────────────────────────────────────────────
if [[ ! -d "$CSGO_DIR" ]]; then
    echo "ERROR: CS2 not found at $CS2_DIR. Run install.sh first."
    exit 1
fi

mkdir -p "$ADDONS_DIR"

# ── 1. Metamod:Source ──────────────────────────────────────────────────────────
log "Installing Metamod:Source..."
METAMOD_PAGE="https://mms.alliedmods.net/mmsdrop/2.0/"
METAMOD_FILE=$(curl -s "$METAMOD_PAGE" | grep -oP 'mmsource-2\.0\.\d+-git\d+-linux\.tar\.gz' | sort -V | tail -1)
curl -sL "${METAMOD_PAGE}${METAMOD_FILE}" -o "$TMP_DIR/metamod.tar.gz"
tar -xzf "$TMP_DIR/metamod.tar.gz" -C "$CSGO_DIR"
log "Metamod installed: $METAMOD_FILE"

# ── 2. MatchZy (bundles CounterStrikeSharp) ────────────────────────────────────
log "Installing MatchZy + CounterStrikeSharp..."
curl -sL "https://github.com/shobhit-pathak/MatchZy/releases/download/0.8.15/MatchZy-0.8.15-with-cssharp-linux.zip" \
    -o "$TMP_DIR/matchzy.zip"
unzip -q -o "$TMP_DIR/matchzy.zip" -d "$CSGO_DIR"
log "MatchZy 0.8.15 + CounterStrikeSharp installed."

# ── 3. WeaponPaints ────────────────────────────────────────────────────────────
log "Installing WeaponPaints..."
curl -sL "https://github.com/Nereziel/cs2-WeaponPaints/releases/download/build-411/WeaponPaints.zip" \
    -o "$TMP_DIR/weaponpaints.zip"
unzip -q -o "$TMP_DIR/weaponpaints.zip" -d "$ADDONS_DIR/counterstrikesharp/plugins"
log "WeaponPaints build-411 installed."

# ── 4. CS2-SimpleAdmin + StatusBlocker ────────────────────────────────────────
log "Installing CS2-SimpleAdmin..."
curl -sL "https://github.com/daffyyyy/CS2-SimpleAdmin/releases/download/build-1.7.8-beta-10b1/CS2-SimpleAdmin-1.7.8-beta-10b1.zip" \
    -o "$TMP_DIR/simpleadmin.zip"
unzip -q -o "$TMP_DIR/simpleadmin.zip" -d "$CSGO_DIR"
log "CS2-SimpleAdmin installed."

log "Installing StatusBlocker (Linux)..."
curl -sL "https://github.com/daffyyyy/CS2-SimpleAdmin/releases/download/build-1.7.8-beta-10b1/StatusBlocker-linux-1.7.8-beta-10b1.zip" \
    -o "$TMP_DIR/statusblocker.zip"
unzip -q -o "$TMP_DIR/statusblocker.zip" -d "$ADDONS_DIR"
log "StatusBlocker installed."

# ── Summary ────────────────────────────────────────────────────────────────────
echo ""
echo "✔ All mods installed successfully."
echo ""
echo "Installed plugins:"
ls "$ADDONS_DIR/counterstrikesharp/plugins/" 2>/dev/null || true
echo ""
echo "Next steps:"
echo "  • Configure WeaponPaints:  $ADDONS_DIR/counterstrikesharp/configs/plugins/WeaponPaints/"
echo "  • Configure SimpleAdmin:   $ADDONS_DIR/counterstrikesharp/configs/plugins/CS2-SimpleAdmin/"
echo "  • Configure MatchZy:       $ADDONS_DIR/counterstrikesharp/configs/plugins/MatchZy/"
echo "  • Start the server:        bash ~/start.sh"
