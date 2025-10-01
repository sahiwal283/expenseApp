# PostgreSQL Installation & Configuration

## Install PostgreSQL 14

```bash
# Add PostgreSQL repository
sudo apt install -y postgresql-common
sudo /usr/share/postgresql-common/pgdg/apt.postgresql.org.sh

# Install PostgreSQL 14
sudo apt install -y postgresql-14 postgresql-contrib-14

# Verify installation
psql --version
sudo systemctl status postgresql
```

---

## Create Database and User

```bash
# Switch to postgres user
sudo -u postgres psql

# In PostgreSQL prompt:
CREATE DATABASE expense_app;
CREATE USER expense_user WITH ENCRYPTED PASSWORD 'YOUR_SECURE_PASSWORD_HERE';
GRANT ALL PRIVILEGES ON DATABASE expense_app TO expense_user;

# For PostgreSQL 15+, also run:
\c expense_app
GRANT ALL ON SCHEMA public TO expense_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO expense_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO expense_user;

\q
```

---

## Configure PostgreSQL

### Allow Local Connections

```bash
sudo vim /etc/postgresql/14/main/pg_hba.conf
```

Add (before other rules):
```
# expense_app database
local   expense_app     expense_user                            scram-sha-256
host    expense_app     expense_user     127.0.0.1/32          scram-sha-256
```

### Tune for Performance

```bash
sudo vim /etc/postgresql/14/main/postgresql.conf
```

Modify:
```ini
max_connections = 100
shared_buffers = 256MB
effective_cache_size = 1GB
maintenance_work_mem = 64MB
checkpoint_completion_target = 0.9
wal_buffers = 16MB
default_statistics_target = 100
random_page_cost = 1.1
effective_io_concurrency = 200
work_mem = 2621kB
min_wal_size = 1GB
max_wal_size = 4GB
```

```bash
# Restart PostgreSQL
sudo systemctl restart postgresql
```

---

## Automated Backups

Create backup script:

```bash
sudo vim /usr/local/bin/backup-expense-db.sh
```

```bash
#!/bin/bash
# PostgreSQL backup script for expense_app

BACKUP_DIR="/var/backups/postgresql"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/expense_app_$DATE.sql"

mkdir -p $BACKUP_DIR

# Backup
sudo -u postgres pg_dump expense_app > $BACKUP_FILE

# Compress
gzip $BACKUP_FILE

# Keep only last 7 days
find $BACKUP_DIR -name "expense_app_*.sql.gz" -mtime +7 -delete

echo "Backup completed: ${BACKUP_FILE}.gz"
```

```bash
# Make executable
sudo chmod +x /usr/local/bin/backup-expense-db.sh

# Add to crontab (daily at 2 AM)
sudo crontab -e
```

Add:
```
0 2 * * * /usr/local/bin/backup-expense-db.sh >> /var/log/expense-db-backup.log 2>&1
```

---

## Test Database Connection

```bash
psql -U expense_user -d expense_app -h localhost

# Should connect successfully
\dt
\q
```

---

## Next Steps

Proceed to [04-backend-deployment.md](04-backend-deployment.md)
