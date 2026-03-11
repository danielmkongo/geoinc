#!/bin/bash
# ─────────────────────────────────────────────────────────────
# Incubator Platform — Linode Deployment Script
# Run this ONCE on a fresh Ubuntu 22.04 Linode.
# Usage: bash deploy.sh YOUR_SERVER_IP
# ─────────────────────────────────────────────────────────────

set -e

SERVER_IP=${1:-"YOUR_SERVER_IP"}
APP_DIR="/var/www/incubator"
LOG_DIR="/var/log/incubator"

echo "=== [1/8] System update ==="
apt-get update -y && apt-get upgrade -y

echo "=== [2/8] Install Node.js 20 ==="
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

echo "=== [3/8] Install Nginx & PM2 ==="
apt-get install -y nginx
npm install -g pm2

echo "=== [4/8] Create app directory ==="
mkdir -p "$APP_DIR"
mkdir -p "$LOG_DIR"

echo "=== [5/8] Copy project files ==="
# Run this from the project root on your local machine:
#   rsync -avz --exclude node_modules --exclude .env --exclude '*.db' \
#     ./ root@YOUR_SERVER_IP:/var/www/incubator/
echo "  -> Upload files via rsync from your local machine, then re-run from step 6."

echo "=== [6/8] Install dependencies & build frontend ==="
cd "$APP_DIR/backend" && npm install --omit=dev
cd "$APP_DIR/frontend" && npm install && npm run build

echo "=== [7/8] Setup database ==="
cd "$APP_DIR/backend"
# Only runs if incubator.db doesn't exist yet
if [ ! -f "/var/www/incubator/incubator.db" ]; then
  node src/scripts/setupDatabase.js
  node src/scripts/migrate.js
  echo "  -> Database initialised."
else
  node src/scripts/migrate.js
  echo "  -> Migration applied to existing database."
fi

echo "=== [8/8] Configure Nginx ==="
sed "s/YOUR_SERVER_IP/$SERVER_IP/g" "$APP_DIR/nginx.conf" \
  > /etc/nginx/sites-available/incubator
ln -sf /etc/nginx/sites-available/incubator /etc/nginx/sites-enabled/incubator
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

echo "=== Start backend with PM2 ==="
cd "$APP_DIR"
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup | tail -1 | bash   # enable auto-start on reboot

echo ""
echo "✅ Deployment complete!"
echo "   App running at: http://$SERVER_IP"
echo "   Logs: pm2 logs incubator-api"
echo ""
echo "⚠️  IMPORTANT — Before going live:"
echo "   1. Edit /var/www/incubator/backend/.env"
echo "      - Set JWT_SECRET to a 64-char random hex"
echo "      - Set FRONTEND_URL=http://$SERVER_IP"
echo "      - Set NODE_ENV=production"
echo "      - Set DB_PATH=/var/www/incubator/incubator.db"
echo "   2. Change the admin password at http://$SERVER_IP (admin / admin123)"
echo "   3. pm2 restart incubator-api   (after editing .env)"
