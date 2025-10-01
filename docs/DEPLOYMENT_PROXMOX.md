## Proxmox Production Deployment Guide

This guide deploys the Expense App on a Proxmox host with LXC containers, Nginx reverse proxy with TLS, PostgreSQL, and automation for backups.

### 0) Prerequisites
- Proxmox host reachable via SSH
- Debian/Ubuntu LXC template available
- Domain and DNS (optional but recommended)

### 1) Provision Containers (on Proxmox host)
```
pct enter <host>  # or SSH to the Proxmox host
cd /root
# Clone the repo if not available: git clone https://github.com/sahiwal283/expenseApp.git
cd expenseApp/deployment/proxmox
./create-lxcs.sh
```

### 2) OS Hardening (inside each container)
```
pct enter 201
cd /opt/expenseapp/deployment/common   # ensure repo is present or copy scripts
bash os-hardening.sh APP_USER=expense SSH_PORT=2222
```

### 3) Database Setup (inside prod-backend)
```
bash /opt/expenseapp/deployment/postgres/setup-postgres.sh DB_VERSION=14 \
  DB_NAME=expense_app DB_USER=expense_user DB_PASSWORD=<secure> LISTEN_ALL=false
```

### 4) Backend Install (inside prod-backend)
```
bash /opt/expenseapp/deployment/backend/install-backend.sh \
  REPO_URL=https://github.com/sahiwal283/expenseApp.git BRANCH=main RUN_SEED=false

# Edit /etc/expenseapp/backend.env for DB credentials and JWT secret
systemctl restart expenseapp-backend
systemctl status expenseapp-backend --no-pager -l
```

### 5) Nginx Reverse Proxy + TLS (on Proxmox host)
```
apt-get update && apt-get install -y nginx
cp deployment/nginx/expenseapp.conf /etc/nginx/sites-available/expenseapp.conf
sed -i 's/YOUR_DOMAIN_OR_IP/expense.example.com/g' /etc/nginx/sites-available/expenseapp.conf
sed -i 's#BACKEND_UPSTREAM#http://<backend-container-ip>:5000#g' /etc/nginx/sites-available/expenseapp.conf
ln -sf /etc/nginx/sites-available/expenseapp.conf /etc/nginx/sites-enabled/expenseapp.conf
nginx -t && systemctl reload nginx

DOMAIN=expense.example.com EMAIL=admin@example.com \
  bash deployment/nginx/setup-letsencrypt.sh
```

### 6) Frontend Build & Publish (on Nginx host or CI)
```
WEB_ROOT=/var/www/expenseapp/current \
  bash deployment/frontend/build-and-deploy.sh
systemctl reload nginx
```

### 7) Backups (inside prod-backend or dedicated backup host)
```
install -d -m 750 /etc/expenseapp
cat >/etc/expenseapp/backup.env <<EOF
BACKUP_DIR=/var/backups/expenseapp
DB_NAME=expense_app
DB_HOST=127.0.0.1
DB_PORT=5432
DB_USER=expense_user
DB_PASSWORD=<secure>
RETENTION_DAYS=14
EOF

cp deployment/backup/expenseapp-backup.service /etc/systemd/system/
cp deployment/backup/expenseapp-backup.timer /etc/systemd/system/
systemctl daemon-reload
systemctl enable --now expenseapp-backup.timer
systemctl list-timers | grep expenseapp-backup
```

### 8) Sandbox Container
- Repeat steps 2–6 for the sandbox CT, but isolated from production
- Use separate DB name and JWT secret

### 9) Monitoring
- Install node_exporter and postgres_exporter; scrape with Prometheus
- Use Grafana for dashboards and alerts

### 10) Rollbacks
- Re-deploy previous Git tag/commit in backend service
- Restore PostgreSQL from latest backup


