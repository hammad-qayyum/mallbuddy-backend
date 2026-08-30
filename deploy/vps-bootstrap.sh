#!/usr/bin/env bash
# Run on the Namecheap VPS as root (or with sudo).
# Gets the Node API listening on :5000 + nginx vhost for backend.mallbuddy.net.
#
# DNS (Cloudflare) is separate — apps use https://backend.mallbuddy.net/api
# Add: Type A, Name backend, Value = this server's public IP, Proxied ON.
#
# Usage:
#   curl -4 ifconfig.me                    # note public IP for Cloudflare
#   bash deploy/vps-bootstrap.sh

set -euo pipefail

APP_DIR="${APP_DIR:-/opt/mallbuddy-backend}"
REPO_URL="${REPO_URL:-}"  # optional: git clone URL if code not on server yet

echo "==> Public IP (use this in Cloudflare DNS for 'backend'):"
curl -4 -s ifconfig.me || true
echo

if ! command -v node >/dev/null 2>&1; then
  echo "==> Installing Node 20..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi

if ! command -v pm2 >/dev/null 2>&1; then
  echo "==> Installing pm2..."
  npm install -g pm2
fi

if ! command -v nginx >/dev/null 2>&1; then
  echo "==> Installing nginx + certbot..."
  apt-get update
  apt-get install -y nginx certbot python3-certbot-nginx
fi

if [ ! -d "$APP_DIR" ]; then
  if [ -n "$REPO_URL" ]; then
    git clone "$REPO_URL" "$APP_DIR"
  else
    echo "ERROR: $APP_DIR missing. Copy mallbuddy-backend there or set REPO_URL."
    exit 1
  fi
fi

cd "$APP_DIR"

if [ ! -f .env ]; then
  echo "ERROR: $APP_DIR/.env missing. Copy deploy/.env.production.example → .env and edit."
  exit 1
fi

echo "==> Installing deps + building..."
npm ci
npm run build

echo "==> Running DB migrations..."
npx prisma migrate deploy

echo "==> Starting API with pm2..."
pm2 delete mallbuddy-api 2>/dev/null || true
pm2 start dist/server.js --name mallbuddy-api
pm2 save
pm2 startup systemd -u root --hp /root 2>/dev/null || true

echo "==> Local health check..."
curl -sf http://127.0.0.1:5000/api/health && echo || {
  echo "API not responding on :5000 — check pm2 logs mallbuddy-api"
  exit 1
}

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
install -m 644 "$SCRIPT_DIR/nginx-backend.mallbuddy.net.conf" /etc/nginx/sites-available/backend.mallbuddy.net
ln -sf /etc/nginx/sites-available/backend.mallbuddy.net /etc/nginx/sites-enabled/backend.mallbuddy.net
nginx -t
systemctl reload nginx

echo
echo "Done on VPS side."
echo "  Local API:  http://127.0.0.1:5000/api/health"
echo "  Public URL: https://backend.mallbuddy.net/api/health (after Cloudflare DNS + certbot)"
echo
echo "Next:"
echo "  1. Cloudflare → mallbuddy.net → DNS → A record: backend → $(curl -4 -s ifconfig.me)"
echo "  2. sudo certbot --nginx -d backend.mallbuddy.net"
echo "  3. curl https://backend.mallbuddy.net/api/health"
