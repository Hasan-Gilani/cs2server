#!/bin/bash
# CS2 Database Setup
# Installs MySQL, creates db/user, writes configs for all 3 plugins.
# Run once after mods_install.sh.

set -euo pipefail

CS2_DIR="${CS2_DIR:-$HOME/cs2}"
CSGO_DIR="$CS2_DIR/game/csgo"
ADDONS_DIR="$CSGO_DIR/addons"
CSS_CONFIGS="$ADDONS_DIR/counterstrikesharp/configs"

DB_NAME="cs2server"
DB_USER="cs2admin"
DB_PASS="Cs2@$(openssl rand -hex 8)"
DB_HOST="127.0.0.1"
DB_PORT=3306

log() { echo "[db_setup] $*"; }

# ── 1. Install MySQL ───────────────────────────────────────────────────────────
log "Installing MySQL Server..."
export DEBIAN_FRONTEND=noninteractive
sudo apt-get update -qq
sudo apt-get install -y -qq mysql-server

sudo systemctl enable mysql
sudo systemctl start mysql
log "MySQL running."

# ── 2. Create database and user ───────────────────────────────────────────────
log "Creating database '$DB_NAME' and user '$DB_USER'..."
sudo mysql -e "
CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\`;
CREATE USER IF NOT EXISTS '${DB_USER}'@'localhost' IDENTIFIED BY '${DB_PASS}';
CREATE USER IF NOT EXISTS '${DB_USER}'@'127.0.0.1' IDENTIFIED BY '${DB_PASS}';
GRANT ALL PRIVILEGES ON \`${DB_NAME}\`.* TO '${DB_USER}'@'localhost';
GRANT ALL PRIVILEGES ON \`${DB_NAME}\`.* TO '${DB_USER}'@'127.0.0.1';
FLUSH PRIVILEGES;
"
log "Database ready."

# ── 3. WeaponPaints config ────────────────────────────────────────────────────
log "Writing WeaponPaints config..."
mkdir -p "$CSS_CONFIGS/plugins/WeaponPaints"
cat > "$CSS_CONFIGS/plugins/WeaponPaints/WeaponPaints.json" << EOF
{
  "DatabaseHost": "${DB_HOST}",
  "DatabasePort": ${DB_PORT},
  "DatabaseUser": "${DB_USER}",
  "DatabasePassword": "${DB_PASS}",
  "DatabaseName": "${DB_NAME}",
  "SkinEnabled": true,
  "GloveEnabled": true,
  "AgentEnabled": true,
  "KnifeEnabled": true,
  "MusicEnabled": true,
  "PinsEnabled": true,
  "KnifePickupEnabled": true,
  "CommandsEnabled": true
}
EOF

# WeaponPaints requires FollowCS2ServerGuidelines = false in core.json
CORE_JSON="$CSS_CONFIGS/core.json"
if [[ -f "$CORE_JSON" ]]; then
    # Update existing value
    sed -i 's/"FollowCS2ServerGuidelines": true/"FollowCS2ServerGuidelines": false/' "$CORE_JSON"
    sed -i 's/"FollowCS2ServerGuidelines":true/"FollowCS2ServerGuidelines":false/' "$CORE_JSON"
else
    mkdir -p "$CSS_CONFIGS"
    echo '{"FollowCS2ServerGuidelines": false}' > "$CORE_JSON"
fi
log "WeaponPaints config written. FollowCS2ServerGuidelines set to false."

# ── 4. MatchZy database config ────────────────────────────────────────────────
log "Writing MatchZy database config..."
mkdir -p "$CSGO_DIR/cfg/MatchZy"
cat > "$CSGO_DIR/cfg/MatchZy/database.json" << EOF
{
  "DatabaseType": "MySQL",
  "MySqlHost": "${DB_HOST}",
  "MySqlDatabase": "${DB_NAME}",
  "MySqlUsername": "${DB_USER}",
  "MySqlPassword": "${DB_PASS}",
  "MySqlPort": ${DB_PORT}
}
EOF
log "MatchZy database config written."

# ── 5. CS2-SimpleAdmin config ─────────────────────────────────────────────────
log "Writing CS2-SimpleAdmin config..."
mkdir -p "$CSS_CONFIGS/plugins/CS2-SimpleAdmin"
cat > "$CSS_CONFIGS/plugins/CS2-SimpleAdmin/CS2-SimpleAdmin.json" << EOF
{
  "Version": 25,
  "DatabaseConfig": {
    "DatabaseType": "MySQL",
    "DatabaseHost": "${DB_HOST}",
    "DatabasePort": ${DB_PORT},
    "DatabaseUser": "${DB_USER}",
    "DatabasePassword": "${DB_PASS}",
    "DatabaseName": "${DB_NAME}",
    "DatabaseSSlMode": "none"
  },
  "OtherSettings": {
    "ShowActivityType": 2,
    "TeamSwitchType": 1,
    "KickTime": 5,
    "BanType": 1,
    "TimeMode": 1,
    "DisableDangerousCommands": true,
    "MaxBanDuration": 10080,
    "MaxMuteDuration": 10080
  },
  "MultiServerMode": false,
  "Timezone": "UTC",
  "EnableMetrics": false,
  "EnableUpdateCheck": true
}
EOF
log "CS2-SimpleAdmin config written."

# ── Summary ────────────────────────────────────────────────────────────────────
echo ""
echo "✔ Database setup complete."
echo ""
echo "  MySQL database : ${DB_NAME}"
echo "  MySQL user     : ${DB_USER}"
echo "  MySQL password : ${DB_PASS}"
echo ""
echo "  Configs written:"
echo "    WeaponPaints  → $CSS_CONFIGS/plugins/WeaponPaints/WeaponPaints.json"
echo "    MatchZy       → $CSGO_DIR/cfg/MatchZy/database.json"
echo "    SimpleAdmin   → $CSS_CONFIGS/plugins/CS2-SimpleAdmin/CS2-SimpleAdmin.json"
echo "    core.json     → FollowCS2ServerGuidelines: false"
echo ""
echo "  Save the password above — it won't be shown again."
echo "  Start the server: bash ~/start.sh"
