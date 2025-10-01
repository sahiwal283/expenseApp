#!/usr/bin/env bash
set -euo pipefail

# PostgreSQL installation and secure database provisioning
# Intended to run inside the prod-backend LXC/VM

: "${DB_VERSION:=14}"
: "${DB_NAME:=expense_app}"
: "${DB_USER:=expense_user}"
: "${DB_PASSWORD:=change_me}"   # override via env or secrets file
: "${DB_CONNECTION_LIMIT:=50}"
: "${LISTEN_ALL:=false}"        # true to allow remote connections

export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y wget gnupg lsb-release

if ! command -v psql >/dev/null 2>&1; then
  # Install PostgreSQL ${DB_VERSION}
  echo "Installing PostgreSQL ${DB_VERSION}..."
  sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
  wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | gpg --dearmor -o /etc/apt/trusted.gpg.d/postgresql.gpg
  apt-get update -y
  apt-get install -y "postgresql-${DB_VERSION}" "postgresql-contrib-${DB_VERSION}"
fi

systemctl enable --now "postgresql@${DB_VERSION}-main" || systemctl enable --now postgresql

PG_CONF="/etc/postgresql/${DB_VERSION}/main/postgresql.conf"
PG_HBA="/etc/postgresql/${DB_VERSION}/main/pg_hba.conf"

if [[ -f "$PG_CONF" ]]; then
  sed -i "s/^#*shared_buffers.*/shared_buffers = 256MB/" "$PG_CONF"
  sed -i "s/^#*work_mem.*/work_mem = 16MB/" "$PG_CONF"
  sed -i "s/^#*maintenance_work_mem.*/maintenance_work_mem = 128MB/" "$PG_CONF"
  sed -i "s/^#*effective_cache_size.*/effective_cache_size = 1GB/" "$PG_CONF"
  if [[ "$LISTEN_ALL" == "true" ]]; then
    sed -i "s/^#*listen_addresses.*/listen_addresses = '*'/'" "$PG_CONF"
  fi
fi

if [[ -f "$PG_HBA" ]]; then
  if [[ "$LISTEN_ALL" == "true" ]]; then
    echo "host all all 0.0.0.0/0 scram-sha-256" >> "$PG_HBA"
  fi
fi

systemctl restart postgresql

sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname='${DB_NAME}'" | grep -q 1 || sudo -u postgres createdb "$DB_NAME"
sudo -u postgres psql -tc "SELECT 1 FROM pg_roles WHERE rolname='${DB_USER}'" | grep -q 1 || sudo -u postgres psql -c "CREATE USER ${DB_USER} WITH ENCRYPTED PASSWORD '${DB_PASSWORD}' LOGIN CONNECTION LIMIT ${DB_CONNECTION_LIMIT};"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE ${DB_NAME} TO ${DB_USER};"

# Ensure privileges on future objects
sudo -u postgres psql -d "$DB_NAME" -c "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO ${DB_USER};"
sudo -u postgres psql -d "$DB_NAME" -c "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO ${DB_USER};"

echo "PostgreSQL setup completed for database '${DB_NAME}' and user '${DB_USER}'."


