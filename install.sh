#!/bin/bash
# CS2 Dedicated Server - Installation Script
# Run once on a fresh Linux server to install SteamCMD and CS2.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Load config
if [[ -f "$SCRIPT_DIR/.env" ]]; then
    source "$SCRIPT_DIR/.env"
else
    echo "ERROR: .env file not found. Copy .env.example to .env and configure it first."
    exit 1
fi

STEAMCMD_DIR="${STEAMCMD_DIR:-$HOME/steamcmd}"
CS2_DIR="${CS2_DIR:-$HOME/cs2}"

echo "========================================"
echo "  CS2 Dedicated Server Installer"
echo "========================================"
echo "SteamCMD directory : $STEAMCMD_DIR"
echo "CS2 install directory: $CS2_DIR"
echo ""

# ── 1. System dependencies ────────────────────────────────────────────────────
echo "[1/4] Installing system dependencies..."

if command -v apt-get &>/dev/null; then
    sudo dpkg --add-architecture i386 2>/dev/null || true
    sudo apt-get update -q
    sudo apt-get install -y \
        lib32gcc-s1 \
        curl \
        wget \
        tar \
        unzip \
        net-tools \
        screen \
        htop
elif command -v yum &>/dev/null; then
    sudo yum install -y glibc.i686 libstdc++.i686 curl wget tar screen
else
    echo "WARNING: Unknown package manager. Install lib32gcc-s1 (or equivalent) manually."
fi

# ── 2. Install SteamCMD ───────────────────────────────────────────────────────
echo "[2/4] Installing SteamCMD..."

mkdir -p "$STEAMCMD_DIR"
cd "$STEAMCMD_DIR"

if [[ ! -f "$STEAMCMD_DIR/steamcmd.sh" ]]; then
    wget -q "https://steamcdn-a.akamaihd.net/client/installer/steamcmd_linux.tar.gz" -O steamcmd_linux.tar.gz
    tar -xzf steamcmd_linux.tar.gz
    rm steamcmd_linux.tar.gz
    echo "SteamCMD downloaded."
else
    echo "SteamCMD already present, skipping download."
fi

# ── 3. Download CS2 via SteamCMD ──────────────────────────────────────────────
echo "[3/4] Downloading CS2 (App ID 730) — this may take a while..."

mkdir -p "$CS2_DIR"

"$STEAMCMD_DIR/steamcmd.sh" \
    +force_install_dir "$CS2_DIR" \
    +login anonymous \
    +app_update 730 validate \
    +quit

echo "CS2 download complete."

# ── 4. Post-install setup ─────────────────────────────────────────────────────
echo "[4/4] Post-install setup..."

# Copy server.cfg if not already in place
CFG_DEST="$CS2_DIR/game/csgo/cfg"
mkdir -p "$CFG_DEST"

if [[ -f "$SCRIPT_DIR/cfg/server.cfg" ]]; then
    cp "$SCRIPT_DIR/cfg/server.cfg" "$CFG_DEST/server.cfg"
    echo "Copied server.cfg → $CFG_DEST/server.cfg"
fi

if [[ -f "$SCRIPT_DIR/cfg/autoexec.cfg" ]]; then
    cp "$SCRIPT_DIR/cfg/autoexec.cfg" "$CFG_DEST/autoexec.cfg"
    echo "Copied autoexec.cfg → $CFG_DEST/autoexec.cfg"
fi

# Make start/update scripts executable
chmod +x "$SCRIPT_DIR/start.sh" "$SCRIPT_DIR/update.sh" "$SCRIPT_DIR/discord_notify.sh" 2>/dev/null || true

# ── Install Discord startup notification service ───────────────────────────────
if [[ -f "$SCRIPT_DIR/discord-notify.service" ]]; then
    echo "Installing discord-notify systemd service..."
    sudo cp "$SCRIPT_DIR/discord-notify.service" /etc/systemd/system/discord-notify.service
    sudo systemctl daemon-reload
    sudo systemctl enable discord-notify.service
    echo "discord-notify.service enabled (runs on every boot)."
fi

echo ""
echo "========================================"
echo "  Installation complete!"
echo "  Edit .env then run: ./start.sh"
echo "========================================"
