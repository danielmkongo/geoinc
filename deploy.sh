#!/bin/bash
# ─────────────────────────────────────────────────────────────
# Incubator Platform — Linode Deployment Script (PM2, no Nginx)
# Run this ONCE on a fresh Ubuntu 22.04 Linode.
# Usage: bash deploy.sh YOUR_SERVER_IP
# ─────────────────────────────────────────────────────────────

set -e

SERVER_IP=${1:-"YOUR_SERVER_IP"}
APP_DIR="/var/www/incubator"
LOG_DIR="/var/log/incubator"
PORT=3001

echo "=== [1/5] Install Node.js 20 & PM2 ==="
apt-get update -y
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs
npm install -g pm2

echo "=== [2/5] Create directories ==="
mkdir -p "$APP_DIR"
mkdir -p "$LOG_DIR"

echo ""
echo "  -> Upload your project files from your local machine, then press Enter to continue."
echo "     rsync command to run locally:"
echo "     rsync -avz --exclude node_modules --exclude .env --exclude '*.db' \\"
echo "       ./ root@$SERVER_IP:$APP_DIR/"
echo ""
read -r -p "Press Enter once files are uploaded..."

echo "=== [3/5] Install dependencies & build frontend ==="
cd "$APP_DIR/backend" && npm install --omit=dev
cd "$APP_DIR/frontend" && npm install && npm run build

echo "=== [4/5] Setup database ==="
cd "$APP_DIR/backend"
if [ ! -f "$APP_DIR/incubator.db" ]; then
  node src/scripts/setupDatabase.js
  node src/scripts/migrate.js
  echo "  -> Database initialised."
else
  node src/scripts/migrate.js
  echo "  -> Migration applied to existing database."
fi

echo "=== [5/5] Start with PM2 ==="
cd "$APP_DIR"
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup | tail -1 | bash   # enable auto-start on reboot

echo ""
echo "✅ Deployment complete!"
echo "   App running at: http://$SERVER_IP:$PORT"
echo "   Logs:           pm2 logs incubator-api"
echo "   Restart:        pm2 restart incubator-api"
echo ""
echo "⚠️  IMPORTANT — Before going live:"
echo "   1. Create $APP_DIR/backend/.env  (copy from .env.example)"
echo "      - JWT_SECRET: node -e \"console.log(require('crypto').randomBytes(64).toString('hex'))\""
echo "      - FRONTEND_URL=http://$SERVER_IP:$PORT"
echo "      - NODE_ENV=production"
echo "      - DB_PATH=$APP_DIR/incubator.db"
echo "      - PORT=$PORT"
echo "   2. pm2 restart incubator-api"
echo "   3. Change the admin password at http://$SERVER_IP:$PORT  (default: admin / admin123)"
