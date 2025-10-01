#!/usr/bin/env bash
set -euo pipefail

# Obtain and configure Let's Encrypt certs for Nginx
# Usage: DOMAIN=expense.example.com EMAIL=you@example.com ./setup-letsencrypt.sh

if [[ -z "${DOMAIN:-}" || -z "${EMAIL:-}" ]]; then
  echo "Usage: DOMAIN=example.com EMAIL=admin@example.com $0" >&2
  exit 1
fi

apt-get update -y
apt-get install -y certbot python3-certbot-nginx

mkdir -p /var/www/letsencrypt
chmod 755 /var/www/letsencrypt

# Ensure Nginx is installed and running
systemctl enable --now nginx

# Request certificate and configure Nginx
certbot --nginx -d "$DOMAIN" -m "$EMAIL" --agree-tos --redirect --non-interactive

systemctl reload nginx
echo "Let's Encrypt setup complete for $DOMAIN"


