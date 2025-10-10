# Production Deployment Guide

**Version**: 0.35.20  
**Last Updated**: October 10, 2025  
**Environment**: Production Release  

---

## Overview

This guide provides step-by-step instructions for deploying the Expense App to production with proper environment separation and security best practices.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Separation](#environment-separation)
3. [Deployment Process](#deployment-process)
4. [Post-Deployment Validation](#post-deployment-validation)
5. [Rollback Procedure](#rollback-procedure)
6. [Monitoring & Maintenance](#monitoring--maintenance)

---

## Prerequisites

### Required Information

Before beginning production deployment, ensure you have:

#### 1. Infrastructure Access
- [ ] Proxmox host access (root@192.168.1.190)
- [ ] Production LXC container created and accessible
- [ ] Production database server accessible
- [ ] Domain/subdomain configured for production app

#### 2. Production Credentials

**Database**:
- [ ] Production database host/IP
- [ ] Database name: `expenseapp_production`
- [ ] Database user credentials
- [ ] Database connection tested

**Zoho Books API**:
- [ ] Production Zoho Books organization created
- [ ] API credentials obtained from Zoho Developer Console:
  - Client ID
  - Client Secret
  - Refresh Token
  - Organization ID
- [ ] Production Chart of Accounts IDs:
  - Expense Account ID
  - Paid Through Account ID

**Application Secrets**:
- [ ] New JWT_SECRET generated (use: `openssl rand -base64 32`)
- [ ] New SESSION_SECRET generated

#### 3. Code Repository
- [ ] All changes committed to `v0.35.0` branch
- [ ] Sandbox testing completed successfully
- [ ] CHANGELOG.md updated

---

## Environment Separation

### Critical: Sandbox vs Production

**Sandbox Environment** (Container 203):
- Environment file: `/etc/expenseapp/backend.env`
- Database: `expenseapp_sandbox`
- Zoho Organization: Test/Sandbox (ID: 856048585)
- Purpose: Testing and development

**Production Environment** (TBD Container):
- Environment file: `/etc/expenseapp-prod/backend.env`
- Database: `expenseapp_production`
- Zoho Organization: Production (different org)
- Purpose: Live production use

### Configuration Templates

Use these templates:
- `backend/env.production.template` - Production configuration
- `backend/env.sandbox.template` - Sandbox reference

### Environment File Security

```bash
# Set correct permissions on production
chmod 600 /etc/expenseapp-prod/backend.env
chown expenseapp:expenseapp /etc/expenseapp-prod/backend.env
```

---

## Deployment Process

### Phase 1: Prepare Production Environment

#### Step 1.1: Create Production LXC Container

```bash
# On Proxmox host (192.168.1.190)
pct create <container_id> <template> \
  --hostname expense-production \
  --memory 4096 \
  --cores 2 \
  --rootfs local-lvm:20 \
  --net0 name=eth0,bridge=vmbr0,ip=dhcp

pct start <container_id>
```

#### Step 1.2: Set Up Operating System

```bash
# SSH into container
ssh root@192.168.1.190
pct enter <container_id>

# Update system
apt update && apt upgrade -y

# Install required packages
apt install -y git nodejs npm postgresql-client nginx

# Create application user
useradd -r -m -d /opt/expenseapp -s /bin/bash expenseapp
```

#### Step 1.3: Set Up Production Database

```bash
# Run database setup script
bash /path/to/deployment/postgres/setup-postgres.sh

# Or manually:
sudo -u postgres psql -c "CREATE DATABASE expenseapp_production;"
sudo -u postgres psql -c "CREATE USER expenseapp_prod WITH ENCRYPTED PASSWORD '<strong_password>';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE expenseapp_production TO expenseapp_prod;"

# Run schema migration
sudo -u postgres psql -d expenseapp_production -f /path/to/schema.sql
```

#### Step 1.4: Configure Production Environment File

```bash
# Create production config directory
mkdir -p /etc/expenseapp-prod

# Create environment file
nano /etc/expenseapp-prod/backend.env

# Paste production configuration (use env.production.template as guide)
# Fill in all required values with production credentials

# Set permissions
chmod 600 /etc/expenseapp-prod/backend.env
chown expenseapp:expenseapp /etc/expenseapp-prod/backend.env
```

### Phase 2: Merge Code to Main Branch

#### Step 2.1: Create Release Branch

```bash
# On local machine
cd /Users/sahilkhatri/Projects/Haute/expenseApp

# Ensure v0.35.0 is up to date
git checkout v0.35.0
git pull origin v0.35.0

# Create release branch
git checkout -b release/v0.35.20
```

#### Step 2.2: Final Checks

```bash
# Run linter
npm run lint

# Run tests (if available)
npm test

# Check for uncommitted changes
git status
```

#### Step 2.3: Merge to Main

```bash
# Switch to main
git checkout main
git pull origin main

# Merge release branch
git merge release/v0.35.20 --no-ff -m "Release v0.35.20: Zoho Books Integration Complete"

# Review merge
git log --oneline -10
```

#### Step 2.4: Tag Release

```bash
git tag -a v0.35.20 -m "Production Release v0.35.20

Zoho Books Integration Complete
- Multi-entity expense submission
- Automatic receipt attachment
- Real-time API integration
- Mock entity support for testing

Critical Fixes:
- Date field correction (v0.35.16)
- Environment configuration (v0.35.19)
- Merchant name in description (v0.35.14)
- Business Checking account (v0.35.19)

Testing:
- Sandbox testing completed
- All critical workflows verified
- API integrations validated

Deployment:
- Production environment separated
- Security best practices followed
- Rollback plan documented"

# Push to remote
git push origin main
git push origin v0.35.20

# Delete release branch (optional)
git branch -d release/v0.35.20
```

### Phase 3: Deploy to Production Server

#### Step 3.1: Clone Repository

```bash
# On production container
cd /opt
git clone https://github.com/sahiwal283/expenseApp.git
cd expenseapp
git checkout main

# Set ownership
chown -R expenseapp:expenseapp /opt/expenseapp
```

#### Step 3.2: Install Backend Dependencies

```bash
# Switch to app user
su - expenseapp

# Install backend dependencies
cd /opt/expenseapp/backend
npm ci --production

# Build TypeScript
npm run build

# Verify build
ls -la dist/
```

#### Step 3.3: Configure Systemd Service

```bash
# As root
nano /etc/systemd/system/expenseapp-backend.service
```

**Service File Content**:
```ini
[Unit]
Description=Expense App Backend API (Production)
After=network.target postgresql.service
Wants=network-online.target

[Service]
Type=simple
EnvironmentFile=/etc/expenseapp-prod/backend.env
WorkingDirectory=/opt/expenseapp/backend
ExecStart=/usr/bin/node /opt/expenseapp/backend/dist/server.js
Restart=always
RestartSec=5
User=expenseapp
Group=expenseapp
AmbientCapabilities=
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=full
ProtectHome=true
ReadWritePaths=/var/lib/expenseapp/uploads
TimeoutStartSec=30

[Install]
WantedBy=multi-user.target
```

```bash
# Enable and start service
systemctl daemon-reload
systemctl enable expenseapp-backend
systemctl start expenseapp-backend

# Check status
systemctl status expenseapp-backend
```

#### Step 3.4: Build and Deploy Frontend

```bash
# As expenseapp user
cd /opt/expenseapp

# Install frontend dependencies
npm ci

# Build frontend
npm run build

# Deploy to web root
mkdir -p /var/www/html
rm -rf /var/www/html/*
cp -r dist/* /var/www/html/

# Set permissions
chown -R www-data:www-data /var/www/html
```

#### Step 3.5: Configure Nginx

```bash
# As root
nano /etc/nginx/sites-available/expenseapp-production
```

**Nginx Configuration**:
```nginx
server {
    listen 80;
    server_name expenseapp.yourdomain.com;
    
    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name expenseapp.yourdomain.com;
    
    # SSL certificates (configure with Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/expenseapp.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/expenseapp.yourdomain.com/privkey.pem;
    
    # SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    
    # Root directory
    root /var/www/html;
    index index.html;
    
    # Frontend (SPA routing)
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # Backend API proxy
    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
}
```

```bash
# Enable site
ln -s /etc/nginx/sites-available/expenseapp-production /etc/nginx/sites-enabled/

# Test configuration
nginx -t

# Reload nginx
systemctl reload nginx
```

### Phase 4: Set Up SSL/TLS

```bash
# Install certbot
apt install -y certbot python3-certbot-nginx

# Obtain certificate
certbot --nginx -d expenseapp.yourdomain.com

# Verify auto-renewal
certbot renew --dry-run
```

---

## Post-Deployment Validation

### Step 1: Health Checks

```bash
# Backend health
curl https://expenseapp.yourdomain.com/api/health
# Expected: {"status":"healthy","version":"2.6.20",...}

# Zoho health
curl https://expenseapp.yourdomain.com/api/expenses/zoho/health
# Expected: JSON with account health status
```

### Step 2: Verify Logs

```bash
# Check for errors
journalctl -u expenseapp-backend --since "5 minutes ago" | grep -i error

# Monitor in real-time
journalctl -u expenseapp-backend -f
```

### Step 3: Test Authentication

```bash
# Login test
curl -X POST https://expenseapp.yourdomain.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"<admin_password>"}'
```

### Step 4: Test Expense Workflow

1. **Log into frontend**: https://expenseapp.yourdomain.com
2. **Create test expense**
3. **Upload receipt**
4. **Submit for approval**
5. **Assign to Zoho entity**
6. **Verify in Zoho Books** production organization

### Step 5: Verify Environment Separation

```bash
# Check environment file is production
cat /etc/expenseapp-prod/backend.env | grep NODE_ENV
# Expected: NODE_ENV=production

# Check Zoho organization
cat /etc/expenseapp-prod/backend.env | grep ZOHO_ORGANIZATION_ID
# Should NOT be sandbox org ID (856048585)
```

---

## Rollback Procedure

### If Critical Issues Arise

#### Option 1: Quick Rollback (No Database Changes)

```bash
# Stop service
systemctl stop expenseapp-backend

# Checkout previous stable version
cd /opt/expenseapp
git checkout <previous_stable_tag>  # e.g., v0.34.0

# Rebuild
cd backend
npm run build

# Restart
systemctl start expenseapp-backend
```

#### Option 2: Full Rollback (With Database Changes)

```bash
# Stop service
systemctl stop expenseapp-backend

# Restore database from backup
pg_restore -d expenseapp_production /path/to/backup.dump

# Rollback code
cd /opt/expenseapp
git checkout <previous_stable_tag>

# Rebuild and restart
cd backend && npm run build
systemctl start expenseapp-backend
```

---

## Monitoring & Maintenance

### Daily Checks

```bash
# Service status
systemctl status expenseapp-backend

# Error logs
journalctl -u expenseapp-backend --since today | grep -i error

# Disk usage
df -h

# Database size
sudo -u postgres psql -d expenseapp_production -c "SELECT pg_size_pretty(pg_database_size('expenseapp_production'));"
```

### Weekly Tasks

- Review error logs
- Check database backups
- Verify SSL certificate status
- Review Zoho API usage/limits
- Check system updates

### Monthly Tasks

- Security updates
- Review user accounts
- Optimize database
- Review and update documentation

---

## Troubleshooting

### Common Issues

**Issue**: Backend won't start
```bash
# Check logs
journalctl -u expenseapp-backend -n 50

# Verify environment file
cat /etc/expenseapp-prod/backend.env | head -10

# Test database connection
psql -h <host> -U expenseapp_prod -d expenseapp_production -c "SELECT 1"
```

**Issue**: Zoho API errors
```bash
# Check Zoho health
curl http://localhost:3000/api/expenses/zoho/health

# Check logs for Zoho errors
journalctl -u expenseapp-backend | grep -i zoho | tail -20

# Verify credentials
# (Check environment file has correct production credentials)
```

**Issue**: Frontend not loading
```bash
# Check nginx status
systemctl status nginx

# Test nginx configuration
nginx -t

# Check frontend files
ls -la /var/www/html/
```

---

## Support

For issues not covered in this guide:
- Check `docs/TROUBLESHOOTING.md`
- Review application logs
- Contact system administrator
- Refer to Git commit history for recent changes

---

**Deployment Version**: v0.35.20  
**Documentation Version**: 1.0  
**Last Updated**: October 10, 2025  

