# Version Management Guide

## 📦 Independent Versioning

Frontend and backend have **separate, independent version numbers**:

```
/package.json            → Frontend version (e.g., "2.1.5")
/backend/package.json    → Backend version (e.g., "1.8.3")
```

They can be different and update independently based on which part of the app changes.

---

## 🚀 How to Update Versions

### Frontend Only Changed?

```bash
# Update frontend version
npm version patch --no-git-tag-version  # 1.15.10 → 1.15.11

# Build and deploy
npm run build
./deploy-sandbox-2600.sh
```

### Backend Only Changed?

```bash
# Update backend version
cd backend
npm version patch --no-git-tag-version  # 1.15.10 → 1.15.11
cd ..

# Build and deploy
cd backend && npm run build && cd ..
./deploy-sandbox-2600.sh
```

### Both Changed?

```bash
# Update both versions
npm version patch --no-git-tag-version
cd backend && npm version patch --no-git-tag-version && cd ..

# Build and deploy
npm run build && cd backend && npm run build && cd ..
./deploy-sandbox-2600.sh
```

---

## 📝 Version Bump Types

Instead of `patch`, you can use:

| Type | Example | When to Use |
|------|---------|-------------|
| `patch` | 1.15.10 → 1.15.11 | Bug fixes, small changes |
| `minor` | 1.15.10 → 1.16.0 | New features |
| `major` | 1.15.10 → 2.0.0 | Breaking changes |

---

## 🔍 Where Versions are Displayed

### Frontend Version
- **Header tag** (top right): Reads from `/package.json` at build time
- **Dev Dashboard**: Backend API reads from `/opt/trade-show-app/package.json` at runtime

### Backend Version
- **Dev Dashboard**: Backend API reads from `/opt/trade-show-app/backend/package.json` at runtime

---

## 🎯 Quick Examples

**Small frontend UI fix:**
```bash
npm version patch --no-git-tag-version
npm run build && ./deploy-sandbox-2600.sh
```

**Backend API endpoint added:**
```bash
cd backend && npm version minor --no-git-tag-version && cd ..
cd backend && npm run build && cd .. && ./deploy-sandbox-2600.sh
```

**Both got updates:**
```bash
npm version patch --no-git-tag-version
cd backend && npm version patch --no-git-tag-version && cd ..
npm run build && cd backend && npm run build && cd .. && ./deploy-sandbox-2600.sh
```

---

## 💡 Best Practices

- ✅ **Update the version** that changed
- ✅ **Use semantic versioning** (patch/minor/major)
- ✅ **Deploy both package.json files** to server
- ✅ **Restart backend** after updating backend version
- ❌ **Don't** create git tags (we use branches)
- ❌ **Don't** forget to deploy package.json files

---

## 🛠 Technical Details

### How It Works

**Frontend:**
```typescript
// Reads at BUILD time
import packageJson from '../../../package.json';
const APP_VERSION = packageJson.version;
```

**Backend:**
```typescript
// Reads at RUNTIME
import backendPkg from '../../package.json';  // Backend version
const rootPkg = require('../../../package.json');  // Frontend version

res.json({
  frontend: { version: rootPkg.version },      // e.g., "2.1.5"
  backend: { version: backendPkg.version }     // e.g., "1.8.3"
});
```

### Deployment

Both package.json files must be on the server:
- `/opt/trade-show-app/package.json` → Frontend version
- `/opt/trade-show-app/backend/package.json` → Backend version

---

**Last Updated:** October 24, 2025  
**Status:** ✅ Independent versioning active
