#!/usr/bin/env bash
# Build and (re)start glow-up. Run from anywhere inside the repo:  bash deploy/deploy.sh
# Safe to run again after every `git pull`.
set -euo pipefail

REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
WEB_ROOT=/var/www/glow-up
cd "$REPO_DIR"

if [ ! -f backend/.env ]; then
  echo "backend/.env is missing — copy deploy/backend.env.production.example and fill it in first." >&2
  exit 1
fi

echo "==> Pulling latest code"
git pull --ff-only || echo "(git pull skipped)"

echo "==> Installing backend dependencies"
npm ci --omit=dev --prefix backend

echo "==> Building frontend"
npm ci --prefix frontend
npm run build --prefix frontend

echo "==> Publishing frontend to $WEB_ROOT"
rsync -a --delete frontend/dist/ "$WEB_ROOT"/ 2>/dev/null || {
  rm -rf "${WEB_ROOT:?}"/*
  cp -r frontend/dist/. "$WEB_ROOT"/
}

echo "==> Starting backend with PM2"
if pm2 describe glow-up-api >/dev/null 2>&1; then
  pm2 restart glow-up-api --update-env
else
  pm2 start deploy/ecosystem.config.cjs
fi
pm2 save

echo "==> Health check"
sleep 3
curl -fsS http://127.0.0.1:5001/api/health && echo || {
  echo "Backend did not answer — check: pm2 logs glow-up-api" >&2
  exit 1
}
echo "Deploy finished."
