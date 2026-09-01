# 🚀 Local Deployment - Quick Reference Card

**Version:** 1.27.15  
**Last Updated:** November 6, 2025

---

## ⚡ One-Line Setup

```bash
./scripts/local-deploy.sh
```

**That's it!** This will:
- Check prerequisites
- Create database
- Install dependencies
- Run migrations
- Start servers

**Time:** 5-10 minutes

---

## 🌐 URLs

| Service | URL | Credentials |
|---------|-----|-------------|
| Frontend | http://localhost:5173 | See below |
| Backend | http://localhost:5000 | - |
| Health Check | http://localhost:5000/health | - |

---

## 👤 Demo Users

| Role | Username | Password |
|------|----------|----------|
| Admin | `admin` | `password123` |
| Coordinator | `sarah` | `password123` |
| Salesperson | `mike` | `password123` |
| Accountant | `lisa` | `password123` |
| Developer | `developer` | `password123` |

---

## 🛠️ Useful Scripts

```bash
# Full setup (run once)
./scripts/local-deploy.sh

# Health check
./scripts/health-check.sh

# Reconfigure environment
./scripts/configure-local-env.sh

# Start servers
npm run start:all

# Run tests
npm test
```

---

## 🐛 Quick Troubleshooting

### PostgreSQL Not Running
```bash
brew services start postgresql@14
```

### Port Already in Use
```bash
# Backend (5000)
kill -9 $(lsof -ti:5000)

# Frontend (5173)
kill -9 $(lsof -ti:5173)
```

### Database Reset
```bash
dropdb expense_app
createdb expense_app
cd backend && npm run migrate && npm run seed
```

### Clear Dependencies
```bash
rm -rf node_modules package-lock.json
npm install

cd backend
rm -rf node_modules package-lock.json
npm install
```

---

## 📚 Full Documentation

For detailed setup, troubleshooting, and advanced configuration:

**👉 See: [docs/LOCAL_DEPLOYMENT.md](docs/LOCAL_DEPLOYMENT.md)**

---

## 🆘 Still Having Issues?

1. Run health check: `./scripts/health-check.sh`
2. Check PostgreSQL: `pg_isready`
3. Check database: `psql -l | grep expense_app`
4. Review logs in terminal
5. See [docs/LOCAL_DEPLOYMENT.md](docs/LOCAL_DEPLOYMENT.md) → Troubleshooting

---

**Happy Coding! 🚀**

