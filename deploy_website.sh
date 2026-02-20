#!/usr/bin/env bash
# deploy_website.sh — Deploy or update the CS2 Skins Flask app on the EC2 server.
# Run from the repo root on your local machine.
set -euo pipefail

SERVER="ubuntu@16.24.36.253"
KEY="$(dirname "$0")/cs2key.pem"
APP_DIR="/var/www/cs2-skins"
ENV_FILE="$APP_DIR/.env"

SSH="ssh -i $KEY -o StrictHostKeyChecking=no"
SCP="scp -i $KEY -o StrictHostKeyChecking=no"

echo "==> Packing website source..."
tar -czf /tmp/cs2-skins.tar.gz -C "$(dirname "$0")" website/

echo "==> Uploading source..."
$SCP /tmp/cs2-skins.tar.gz "$SERVER:/tmp/cs2-skins.tar.gz"

echo "==> Uploading Nginx config and systemd unit..."
$SCP "$(dirname "$0")/nginx-cs2-skins.conf" "$SERVER:/tmp/nginx-cs2-skins.conf"
$SCP "$(dirname "$0")/cs2-skins.service"    "$SERVER:/tmp/cs2-skins.service"

echo "==> Running remote setup..."
$SSH "$SERVER" bash <<'REMOTE'
set -euo pipefail
APP_DIR="/var/www/cs2-skins"

# ── Directories ──────────────────────────────────────────────────────────────
sudo mkdir -p "$APP_DIR" "$APP_DIR/static" /var/log/cs2-skins
sudo chown -R www-data:www-data "$APP_DIR" /var/log/cs2-skins

# ── Extract source ───────────────────────────────────────────────────────────
sudo tar -xzf /tmp/cs2-skins.tar.gz -C "$APP_DIR" --strip-components=1 website/
sudo chown -R www-data:www-data "$APP_DIR"
sudo chmod -R 755 "$APP_DIR"

# ── Create .env if it doesn't exist ─────────────────────────────────────────
if [ ! -f "$APP_DIR/.env" ]; then
  sudo tee "$APP_DIR/.env" > /dev/null <<EOF
SECRET_KEY=$(python3 -c "import secrets; print(secrets.token_hex(32))")
DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=cs2server
DB_USER=cs2admin
DB_PASS=Cs2@a143edf724778083
STEAM_API_KEY=79B5F90925E7E51479569108226BEEBB
BASE_URL=http://16.24.36.253
SKIN_CACHE_TTL=3600
SESSION_COOKIE_SECURE=false
SESSION_LIFETIME=86400
EOF
  sudo chmod 640 "$APP_DIR/.env"
  sudo chown www-data:www-data "$APP_DIR/.env"
  echo "  Created .env"
else
  echo "  .env already exists — skipping (edit manually if needed)"
fi

# ── Python venv + dependencies ───────────────────────────────────────────────
if [ ! -d "$APP_DIR/venv" ]; then
  sudo python3 -m venv "$APP_DIR/venv"
  sudo chown -R www-data:www-data "$APP_DIR/venv"
fi
sudo "$APP_DIR/venv/bin/pip" install --quiet --upgrade pip
sudo "$APP_DIR/venv/bin/pip" install --quiet -r "$APP_DIR/requirements.txt"
echo "  Python deps installed"

# ── Nginx ────────────────────────────────────────────────────────────────────
if ! command -v nginx &>/dev/null; then
  sudo apt-get update -qq
  sudo apt-get install -y -qq nginx
fi
sudo cp /tmp/nginx-cs2-skins.conf /etc/nginx/sites-available/cs2-skins
sudo ln -sf /etc/nginx/sites-available/cs2-skins /etc/nginx/sites-enabled/cs2-skins
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl enable --now nginx
sudo systemctl reload nginx
echo "  Nginx configured"

# ── Systemd service ──────────────────────────────────────────────────────────
sudo cp /tmp/cs2-skins.service /etc/systemd/system/cs2-skins.service
sudo systemctl daemon-reload
sudo systemctl enable cs2-skins
sudo systemctl restart cs2-skins
sleep 2
sudo systemctl is-active cs2-skins && echo "  cs2-skins service: RUNNING" || echo "  cs2-skins service: FAILED"

REMOTE

echo "==> Done. Website should be live at http://16.24.36.253"
