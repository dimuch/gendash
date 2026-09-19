#!/usr/bin/env bash
#
# One-shot setup for gendash.englishplus.com.ua on the `uppr` droplet.
# Mirrors the snake deploy pattern: DNS A record -> web root + placeholder ->
# nginx vhost -> TLS via certbot. Serves a static "coming soon" page until the
# real app (M3) exists, at which point the vhost is repointed to the Node server.
#
# Run ON the droplet:   sudo bash subdomain-setup.sh
# Safe to re-run (idempotent-ish); it never touches existing sites.
set -euo pipefail

DOMAIN="gendash.englishplus.com.ua"
ZONE="englishplus.com.ua"
SUB="gendash"
IP="165.22.31.51"
WEBROOT="/var/www/gendash"

echo "==> [1/5] DNS A record ($DOMAIN -> $IP)"
if command -v doctl >/dev/null 2>&1; then
  if doctl compute domain records list "$ZONE" --no-header --format Name 2>/dev/null | grep -qx "$SUB"; then
    echo "    A record for '$SUB' already exists — skipping."
  else
    doctl compute domain records create "$ZONE" \
      --record-type A --record-name "$SUB" --record-data "$IP" --record-ttl 3600
    echo "    created."
  fi
else
  echo "    doctl not installed. Create this record in the DigitalOcean panel"
  echo "    (Networking -> Domains -> $ZONE), then re-run for TLS:"
  echo "        Type: A   Hostname: $SUB   Will direct to: $IP   TTL: 3600"
fi

echo "==> [2/5] web root + placeholder page ($WEBROOT)"
sudo mkdir -p "$WEBROOT"
sudo tee "$WEBROOT/index.html" >/dev/null <<'HTML'
<!doctype html>
<html lang="en"><head><meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>GenDash — coming soon</title>
<style>
:root{color-scheme:dark}*{box-sizing:border-box}
body{margin:0;min-height:100vh;display:grid;place-items:center;
font-family:ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;
background:radial-gradient(120% 120% at 50% 0%,#16233a 0%,#0b1220 55%,#070b14 100%);color:#e6edf7}
main{text-align:center;padding:2rem;max-width:34rem}
.badge{display:inline-block;font-size:.72rem;letter-spacing:.14em;text-transform:uppercase;
color:#7cc0ff;border:1px solid rgba(124,192,255,.35);border-radius:999px;padding:.3rem .7rem;margin-bottom:1.4rem}
h1{font-size:clamp(2rem,6vw,3.2rem);margin:0 0 .6rem;line-height:1.05}
.grad{background:linear-gradient(92deg,#7cc0ff,#a98bff 60%,#ff9bd6);
-webkit-background-clip:text;background-clip:text;color:transparent}
p.lead{font-size:1.1rem;color:#aebbcf;margin:0 0 1.6rem}
.pill{font-size:.85rem;color:#8899ad}
</style></head>
<body><main>
<span class="badge">Building in public</span>
<h1>Ask a question,<br /><span class="grad">get a live dashboard.</span></h1>
<p class="lead">No SQL, no setup. GenDash turns a plain-language question into a live,
interactive dashboard — not a paragraph, not one throwaway chart.</p>
<p class="pill">Coming soon · staged on the build box</p>
</main></body></html>
HTML
echo "    placeholder written."

echo "==> [3/5] nginx vhost (/etc/nginx/sites-available/gendash.conf)"
sudo tee /etc/nginx/sites-available/gendash.conf >/dev/null <<'CONF'
# gendash.englishplus.com.ua — static placeholder for now.
# When the app is ready, replace the `root`/`location` block with a proxy to the
# Node server (see snake's choco-snake.conf for the WebSocket-proxy pattern).
server {
    listen 80;
    listen [::]:80;
    server_name gendash.englishplus.com.ua;

    root /var/www/gendash;
    index index.html;

    location / {
        try_files $uri $uri/ =404;
    }
}
CONF
sudo ln -sf /etc/nginx/sites-available/gendash.conf /etc/nginx/sites-enabled/gendash.conf
echo "    vhost enabled."

echo "==> [4/5] validate + reload nginx"
sudo nginx -t
sudo systemctl reload nginx
echo "    nginx reloaded. HTTP is live once DNS resolves."

echo "==> [5/5] TLS via certbot"
if getent hosts "$DOMAIN" >/dev/null 2>&1; then
  sudo certbot --nginx -d "$DOMAIN" --redirect -n --agree-tos
  echo "    TLS installed."
else
  echo "    $DOMAIN does not resolve yet (DNS still propagating)."
  echo "    Wait a few minutes, then run:"
  echo "        sudo certbot --nginx -d $DOMAIN --redirect -n --agree-tos"
fi

echo ""
echo "DONE -> https://$DOMAIN  (fallback while DNS propagates: http://$IP served by nginx)"
