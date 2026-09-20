#!/usr/bin/env bash
#
# Deploy the GenDash Next.js app to the `uppr` droplet, alongside the snake game.
# Clones/pulls from GitHub, builds, runs it under systemd, and repoints the
# gendash nginx vhost from the static placeholder to the running app.
#
# Run ON the droplet:  bash deploy-app.sh
# Safe to re-run (that's how you ship updates).
set -euo pipefail

REPO_URL="https://github.com/dimuch/gendash.git"
REPO="$HOME/gendash"

echo "==> [1/5] fetch code"
if [ -d "$REPO/.git" ]; then
  git -C "$REPO" pull --ff-only
else
  git clone "$REPO_URL" "$REPO"
fi
cd "$REPO"

echo "==> [2/5] install + build (this can take a minute)"
# Prefer a reproducible install; fall back to a reconciling install if the
# lockfile drifts (e.g. an optional dep out of sync).
npm ci --include=dev || npm install --include=dev
npm run build

echo "==> [3/5] systemd unit"
sudo cp deploy/gendash.service /etc/systemd/system/gendash.service
sudo systemctl daemon-reload
sudo systemctl enable gendash
sudo systemctl restart gendash
sleep 2
systemctl --no-pager --lines=5 status gendash || true

echo "==> [4/5] nginx vhost -> app"
sudo cp deploy/gendash-nginx.conf /etc/nginx/sites-available/gendash.conf
sudo ln -sf /etc/nginx/sites-available/gendash.conf /etc/nginx/sites-enabled/gendash.conf
sudo nginx -t
sudo systemctl reload nginx

echo "==> [5/5] done"
echo "Live at: https://gendash.englishplus.com.ua"
echo "The app uses the mock planner (demo chips only) unless you add a key:"
echo "  echo 'ANTHROPIC_API_KEY=sk-ant-...'   >  $REPO/apps/web/.env.local"
echo "  echo 'ANTHROPIC_MODEL=claude-haiku-4-5' >> $REPO/apps/web/.env.local"
echo "  sudo systemctl restart gendash"
