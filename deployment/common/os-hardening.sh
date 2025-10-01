#!/usr/bin/env bash
set -euo pipefail

# OS hardening for Debian/Ubuntu LXC/VM
# - Creates non-root sudo user
# - Secures SSH (port, disable root/password auth)
# - Enables UFW, Fail2ban, unattended-upgrades

: "${APP_USER:=expense}"
: "${SSH_PORT:=2222}"
: "${ALLOW_HTTP:=true}"
: "${ALLOW_HTTPS:=true}"

function require_root() {
  if [[ "$EUID" -ne 0 ]]; then
    echo "Please run as root"; exit 1
  fi
}

require_root

export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y sudo ufw fail2ban unattended-upgrades openssh-server jq curl ca-certificates

# Create app user
if ! id -u "$APP_USER" >/dev/null 2>&1; then
  adduser --disabled-password --gecos "" "$APP_USER"
  usermod -aG sudo "$APP_USER"
  echo "%sudo ALL=(ALL) NOPASSWD:ALL" >/etc/sudoers.d/99_sudo_nopasswd
  chmod 440 /etc/sudoers.d/99_sudo_nopasswd
fi

# SSH hardening
sed -i "s/^#\?Port .*/Port ${SSH_PORT}/" /etc/ssh/sshd_config
sed -i "s/^#\?PermitRootLogin .*/PermitRootLogin no/" /etc/ssh/sshd_config
sed -i "s/^#\?PasswordAuthentication .*/PasswordAuthentication no/" /etc/ssh/sshd_config
systemctl restart ssh || systemctl restart sshd || true

# UFW rules
ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw allow "$SSH_PORT"/tcp
if [[ "$ALLOW_HTTP" == "true" ]]; then ufw allow 80/tcp; fi
if [[ "$ALLOW_HTTPS" == "true" ]]; then ufw allow 443/tcp; fi
ufw --force enable

# Fail2ban
cat >/etc/fail2ban/jail.d/sshd.local <<EOF
[sshd]
enabled = true
port    = ${SSH_PORT}
filter  = sshd
logpath = /var/log/auth.log
maxretry = 5
findtime = 600
bantime = 3600
EOF
systemctl enable --now fail2ban

# Unattended upgrades
dpkg-reconfigure -f noninteractive unattended-upgrades || true
systemctl enable --now unattended-upgrades

echo "Hardening complete. SSH now on port ${SSH_PORT}. Add your SSH key to ${APP_USER}."


