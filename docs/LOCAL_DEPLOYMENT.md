# 🏠 Local Deployment Guide

**Version:** 1.27.15  
**Last Updated:** November 6, 2025  
**Purpose:** Run ExpenseApp locally for development and testing (without VPN/remote access)

---

## 📋 Prerequisites

### Required Software

| Software | Version | macOS Installation | Check Installed |
|----------|---------|-------------------|-----------------|
| **Node.js** | 18+ | `brew install node` | `node --version` |
| **npm** | 8+ | (comes with Node.js) | `npm --version` |
| **PostgreSQL** | 14+ | `brew install postgresql@14` | `psql --version` |

### PostgreSQL Setup

If PostgreSQL is not installed:

```bash
# Install PostgreSQL
brew install postgresql@14

# Add to PATH (add to ~/.zshrc or ~/.bash_profile)
echo 'export PATH="/opt/homebrew/opt/postgresql@14/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc

# Start PostgreSQL service
brew services start postgresql@14

# Verify it's running
pg_isready
```

**Alternative: Postgres.app (GUI)**
- Download from: https://postgresapp.com/
- Drag to Applications and launch
- Click "Initialize" to create default server

---

## 🚀 Quick Start (Automated)

### Option 1: Use Start Script (Easiest)

```bash
# Make script executable
chmod +x scripts/start.sh

# Run (sets up everything)
./scripts/start.sh
```

This script will:
- ✅ Check PostgreSQL is running
- ✅ Create database if needed
- ✅ Install dependencies
- ✅ Run migrations
- ✅ Seed demo data
- ✅ Start both frontend and backend

### Option 2: Manual Start (For Testing Specific Changes)

```bash
# Start backend only
npm run start:backend

# Start frontend only (new terminal)
npm run dev

# Start both together
npm run start:all
```

---

## 🔧 Manual Setup (Step-by-Step)

### Step 1: Start PostgreSQL

```bash
# Check if running
pg_isready

# If not running, start it
brew services start postgresql@14

# Or with Postgres.app, just launch the app
```

### Step 2: Create Database

```bash
# Connect to PostgreSQL
psql postgres

# Run these SQL commands:
CREATE DATABASE expense_app;
CREATE USER expense_user WITH PASSWORD 'dev_password_123';
GRANT ALL PRIVILEGES ON DATABASE expense_app TO expense_user;

# For PostgreSQL 15+, also grant schema privileges
\c expense_app
GRANT ALL ON SCHEMA public TO expense_user;

# Exit
\q
```

### Step 3: Configure Backend Environment

The backend `.env` file should already exist. If not:

```bash
cp backend/env.example backend/.env
```

**Default settings** (should work as-is):

```env
PORT=5000
NODE_ENV=development
DB_HOST=localhost
DB_PORT=5432
DB_NAME=expense_app
DB_USER=postgres
DB_PASSWORD=your_password_here
JWT_SECRET=dev_secret_key_for_local_testing_only
UPLOAD_DIR=uploads
MAX_FILE_SIZE=20971520
```

**Note:** If you created a custom user (`expense_user`), update `DB_USER` and `DB_PASSWORD` accordingly.

### Step 4: Install Dependencies

```bash
# Install frontend dependencies
npm install

# Install backend dependencies
cd backend
npm install
cd ..
```

### Step 5: Run Database Migrations

```bash
cd backend
npm run migrate
cd ..
```

This creates all database tables and schema.

### Step 6: Seed Demo Data

```bash
cd backend
npm run seed
cd ..
```

This creates demo users and sample data for testing.

### Step 7: Start Servers

```bash
# Option A: Start both together (recommended)
npm run start:all

# Option B: Start separately (for debugging)
# Terminal 1:
npm run start:backend

# Terminal 2:
npm run dev
```

---

## 🌐 Access Application

Once running:

- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:5000
- **API Health:** http://localhost:5000/health

### Demo Login Credentials

| Role | Username | Password |
|------|----------|----------|
| Admin | admin | password123 |
| Coordinator | sarah | password123 |
| Salesperson | mike | password123 |
| Accountant | lisa | password123 |
| Developer | developer | password123 |

---

## 🧪 Testing Local Changes

### Test Backend Changes

```bash
# In backend directory
npm run dev

# Watch logs for errors
# Backend runs on: http://localhost:5000
```

### Test Frontend Changes

```bash
# In root directory
npm run dev

# Frontend auto-reloads on changes
# Frontend runs on: http://localhost:5173
```

### Test Full Stack

```bash
# Run both with concurrently
npm run start:all

# Or use separate terminals for better log visibility
```

---

## 🔍 Health Checks

### Backend Health Check

```bash
curl http://localhost:5000/health
```

**Expected response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-11-06T...",
  "database": "connected",
  "version": "1.27.15"
}
```

### Frontend Health Check

Visit http://localhost:5173 in browser. Should load login page immediately.

### Database Connection Check

```bash
cd backend
npx ts-node -e "
import { Pool } from 'pg';
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD
});

pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('❌ Database connection failed:', err.message);
    process.exit(1);
  }
  console.log('✅ Database connected:', res.rows[0].now);
  pool.end();
});
"
```

---

## 🐛 Troubleshooting

### PostgreSQL Not Running

**Symptom:** `pg_isready` returns error or `connection refused`

**Solution:**
```bash
# Check service status
brew services list

# Restart PostgreSQL
brew services restart postgresql@14

# Or with Postgres.app, restart the app
```

### Database Connection Failed

**Symptom:** Backend logs show `ECONNREFUSED` or `password authentication failed`

**Solutions:**

1. **Wrong password:**
   ```bash
   # Update .env with correct password
   nano backend/.env
   # Change DB_PASSWORD to your actual postgres password
   ```

2. **Wrong user:**
   ```bash
   # Check which user you're using
   psql -U postgres -c "\du"
   
   # Update backend/.env DB_USER if needed
   ```

3. **Database doesn't exist:**
   ```bash
   # Create database manually
   createdb expense_app
   ```

### Port Already in Use

**Symptom:** `EADDRINUSE: address already in use`

**Solution:**

**Backend (port 5000):**
```bash
# Find process using port
lsof -ti:5000

# Kill process
kill -9 $(lsof -ti:5000)

# Or change port in backend/.env
PORT=5001
```

**Frontend (port 5173):**
```bash
# Kill process
kill -9 $(lsof -ti:5173)

# Or Vite will auto-suggest next available port
```

### Dependencies Installation Failed

**Symptom:** `npm install` errors

**Solution:**
```bash
# Clear caches and reinstall
rm -rf node_modules package-lock.json
npm cache clean --force
npm install

# Same for backend
cd backend
rm -rf node_modules package-lock.json
npm cache clean --force
npm install
cd ..
```

### Migration Errors

**Symptom:** `npm run migrate` fails

**Solutions:**

1. **Check database exists:**
   ```bash
   psql postgres -c "\l" | grep expense_app
   ```

2. **Drop and recreate database:**
   ```bash
   dropdb expense_app
   createdb expense_app
   cd backend && npm run migrate && npm run seed
   ```

3. **Check user permissions:**
   ```bash
   psql expense_app -c "GRANT ALL ON SCHEMA public TO postgres;"
   ```

### OCR Service Not Available Locally

**Symptom:** Receipt uploads fail to extract text

**Expected:** Local development uses embedded Tesseract.js (slower than sandbox OCR service)

**Note:** The external OCR service (192.168.1.195:8000) is only available in sandbox/production. Local development falls back to basic Tesseract.

### Build Errors

**Symptom:** TypeScript or linting errors during build

**Solution:**
```bash
# Run linter with auto-fix
npm run lint:fix

# Check TypeScript errors
npx tsc --noEmit

# Fix imports and types manually if needed
```

---

## 📦 Building for Deployment

### Frontend Build

```bash
# Development build (sandbox)
npm run build:sandbox

# Production build
npm run build:production

# Output: dist/
```

### Backend Build

```bash
cd backend
npm run build

# Output: backend/dist/
```

---

## 🔄 Resetting Local Environment

To start fresh:

```bash
# 1. Drop database
dropdb expense_app

# 2. Recreate database
createdb expense_app

# 3. Run migrations and seed
cd backend
npm run migrate
npm run seed
cd ..

# 4. Restart servers
npm run start:all
```

---

## 📚 Additional Resources

- **QUICKSTART.md** - General setup guide
- **MASTER_GUIDE.md** - Complete system documentation
- **backend/README.md** - Backend API documentation
- **docs/DEPLOYMENT_PROXMOX.md** - Remote deployment guide

---

## 🆘 Getting Help

If you encounter issues not covered here:

1. Check backend logs for detailed error messages
2. Check frontend browser console for client-side errors
3. Verify PostgreSQL is running: `pg_isready`
4. Verify database exists: `psql -l | grep expense_app`
5. Check network requests in browser DevTools

**Common Issue Checklist:**
- [ ] PostgreSQL running?
- [ ] Database created?
- [ ] `.env` file configured?
- [ ] Dependencies installed?
- [ ] Migrations run?
- [ ] Seed data loaded?
- [ ] Correct ports available (5000, 5173)?

---

**Last Updated:** November 6, 2025  
**Branch:** v1.27.15  
**Status:** ✅ Ready for local testing

