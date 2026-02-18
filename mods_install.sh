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
CSS_DIR="$ADDONS_DIR/counterstrikesharp"
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

# ── 1b. Install patched gameinfo.gi (required for Metamod to load) ────────────
# start.sh also copies this on every launch since CS2 updates overwrite it.
if [[ -f "$SCRIPT_DIR/gameinfo.gi" ]]; then
    cp "$SCRIPT_DIR/gameinfo.gi" "$CSGO_DIR/gameinfo.gi"
    log "gameinfo.gi installed from repo copy."
else
    log "WARNING: gameinfo.gi not found in $SCRIPT_DIR — Metamod may not load."
fi

# ── 2. MatchZy (bundles CounterStrikeSharp) ────────────────────────────────────
log "Installing MatchZy + CounterStrikeSharp..."
curl -sL "https://github.com/shobhit-pathak/MatchZy/releases/download/0.8.15/MatchZy-0.8.15-with-cssharp-linux.zip" \
    -o "$TMP_DIR/matchzy.zip"
unzip -q -o "$TMP_DIR/matchzy.zip" -d "$CSGO_DIR"
log "MatchZy 0.8.15 + CounterStrikeSharp installed."

# ── 2b. Upgrade CounterStrikeSharp to latest standalone (fixes plugin compat) ─
log "Upgrading CounterStrikeSharp to v1.0.362..."
curl -sL "https://github.com/roflmuffin/CounterStrikeSharp/releases/download/v1.0.362/counterstrikesharp-linux-1.0.362.zip" \
    -o "$TMP_DIR/css.zip"
unzip -q -o "$TMP_DIR/css.zip" -d "$CSGO_DIR"
log "CounterStrikeSharp v1.0.362 installed."

# ── 3. WeaponPaints ────────────────────────────────────────────────────────────
# Zip layout: WeaponPaints/ → extract directly into plugins/
log "Installing WeaponPaints build-411..."
curl -sL "https://github.com/Nereziel/cs2-WeaponPaints/releases/download/build-411/WeaponPaints.zip" \
    -o "$TMP_DIR/weaponpaints.zip"
unzip -q -o "$TMP_DIR/weaponpaints.zip" -d "$CSS_DIR/plugins"
log "WeaponPaints build-411 installed."
# WeaponPaints also needs its gamedata file in the CSS shared gamedata directory
cp "$CSS_DIR/plugins/WeaponPaints/gamedata/weaponpaints.json" "$CSS_DIR/gamedata/"

# ── 4. CS2-SimpleAdmin ────────────────────────────────────────────────────────
# Zip layout: counterstrikesharp/{plugins,shared}/ → extract into addons/
log "Installing CS2-SimpleAdmin build-1.7.8-beta-10b1..."
curl -sL "https://github.com/daffyyyy/CS2-SimpleAdmin/releases/download/build-1.7.8-beta-10b1/CS2-SimpleAdmin-1.7.8-beta-10b1.zip" \
    -o "$TMP_DIR/simpleadmin.zip"
unzip -q -o "$TMP_DIR/simpleadmin.zip" -d "$ADDONS_DIR"
log "CS2-SimpleAdmin installed."

# ── 5. StatusBlocker ──────────────────────────────────────────────────────────
# Zip layout: StatusBlocker-vX.Y.Z-linux/{metamod/,StatusBlocker/} → strip wrapper
log "Installing StatusBlocker (Linux)..."
curl -sL "https://github.com/daffyyyy/CS2-SimpleAdmin/releases/download/build-1.7.8-beta-10b1/StatusBlocker-linux-1.7.8-beta-10b1.zip" \
    -o "$TMP_DIR/statusblocker.zip"
mkdir -p "$TMP_DIR/sb_extract"
unzip -q -o "$TMP_DIR/statusblocker.zip" -d "$TMP_DIR/sb_extract"
# Strip the top-level versioned folder (e.g. StatusBlocker-v1.1.4-linux/)
SB_ROOT=$(find "$TMP_DIR/sb_extract" -mindepth 1 -maxdepth 1 -type d | head -1)
# Copy metamod VDF and plugin SO to the correct addons locations
if [[ -d "$SB_ROOT/metamod" ]]; then
    cp -r "$SB_ROOT/metamod/." "$ADDONS_DIR/metamod/"
fi
if [[ -d "$SB_ROOT/StatusBlocker" ]]; then
    mkdir -p "$ADDONS_DIR/StatusBlocker"
    cp -r "$SB_ROOT/StatusBlocker/." "$ADDONS_DIR/StatusBlocker/"
fi
log "StatusBlocker installed."

# ── 6. AnyBaseLib (shared library — required by PlayerSettings & MenuManager) ──
# Zip layout: addons/counterstrikesharp/{shared,plugins}/ → extract into csgo/
log "Installing AnyBaseLib 0.9.4..."
curl -sL "https://github.com/NickFox007/AnyBaseLibCS2/releases/download/0.9.4/AnyBaseLib.zip" \
    -o "$TMP_DIR/anybaselib.zip"
unzip -q -o "$TMP_DIR/anybaselib.zip" -d "$CSGO_DIR"
log "AnyBaseLib 0.9.4 installed."

# ── 7. MenuManager ────────────────────────────────────────────────────────────
# Zip layout: addons/counterstrikesharp/{shared,plugins}/ → extract into csgo/
log "Installing MenuManager 1.4.1..."
curl -sL "https://github.com/NickFox007/MenuManagerCS2/releases/download/1.4.1/MenuManager.zip" \
    -o "$TMP_DIR/menumanager.zip"
unzip -q -o "$TMP_DIR/menumanager.zip" -d "$CSGO_DIR"
log "MenuManager 1.4.1 installed."

# ── 8. PlayerSettings ─────────────────────────────────────────────────────────
# Zip layout: addons/counterstrikesharp/{shared,plugins}/ → extract into csgo/
log "Installing PlayerSettings 0.9.3..."
curl -sL "https://github.com/NickFox007/PlayerSettingsCS2/releases/download/0.9.3/PlayerSettings.zip" \
    -o "$TMP_DIR/playersettings.zip"
unzip -q -o "$TMP_DIR/playersettings.zip" -d "$CSGO_DIR"
log "PlayerSettings 0.9.3 installed."

# ── Summary ────────────────────────────────────────────────────────────────────
echo ""
echo "✔ All mods installed successfully."
echo ""
echo "Installed plugins:"
ls "$CSS_DIR/plugins/" 2>/dev/null || true
echo ""
echo "Next steps:"
echo "  • Configure WeaponPaints:  $CSS_DIR/configs/plugins/WeaponPaints/"
echo "  • Configure SimpleAdmin:   $CSS_DIR/configs/plugins/CS2-SimpleAdmin/"
echo "  • Configure MatchZy:       $CSS_DIR/configs/plugins/MatchZy/"
echo "  • Run db_setup.sh to set up MySQL and write plugin configs"
echo "  • Start the server:        bash ~/start.sh"
