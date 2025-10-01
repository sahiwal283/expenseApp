# Project Structure

**Version:** 0.6.0-alpha  
**Last Updated:** October 1, 2025

---

## Clean, Organized Folder Structure

```
expenseApp/
│
├── src/                              # All source code
│   ├── components/                   # React components
│   │   ├── auth/                     # Authentication
│   │   │   └── LoginForm.tsx
│   │   ├── dashboard/                # Dashboard views
│   │   │   ├── Dashboard.tsx
│   │   │   ├── StatsCard.tsx
│   │   │   ├── RecentExpenses.tsx
│   │   │   ├── UpcomingEvents.tsx
│   │   │   └── BudgetOverview.tsx
│   │   ├── events/                   # Event management
│   │   │   ├── EventSetup.tsx
│   │   │   └── EventForm.tsx
│   │   ├── expenses/                 # Expense management
│   │   │   ├── ExpenseSubmission.tsx
│   │   │   ├── ExpenseForm.tsx
│   │   │   └── ReceiptUpload.tsx
│   │   ├── admin/                    # Admin features
│   │   │   ├── UserManagement.tsx
│   │   │   └── AdminSettings.tsx
│   │   ├── accountant/               # Accountant features
│   │   │   └── AccountantDashboard.tsx
│   │   ├── reports/                  # Reports & analytics
│   │   │   ├── Reports.tsx
│   │   │   ├── ExpenseChart.tsx
│   │   │   ├── DetailedReport.tsx
│   │   │   └── EntityBreakdown.tsx
│   │   └── layout/                   # Layout components
│   │       ├── Header.tsx
│   │       └── Sidebar.tsx
│   ├── hooks/                        # Custom React hooks
│   │   ├── useAuth.ts
│   │   └── useLocalStorage.ts
│   ├── types/                        # TypeScript definitions
│   │   ├── types.ts                  # Shared interfaces
│   │   └── constants.ts              # App constants
│   ├── utils/                        # Utility functions (future)
│   ├── assets/                       # Static assets (future)
│   ├── App.tsx                       # Main app component
│   ├── main.tsx                      # Entry point
│   └── index.css                     # Global styles
│
├── docs/                             # All documentation
│   ├── ARCHITECTURE.md               # System architecture
│   ├── CHANGELOG.md                  # Version history
│   ├── FRONTEND_TESTING.md           # Testing guide
│   ├── TROUBLESHOOTING.md            # Common issues
│   ├── UX_IMPROVEMENTS.md            # UX documentation
│   ├── HOMEBREW_PATH_FIX.md          # macOS setup
│   ├── QUICKSTART.md                 # Quick start guide
│   ├── SETUP_GUIDE.md                # Detailed setup
│   ├── SESSION_SUMMARY.md            # Development history
│   ├── RELEASE_NOTES_v0.5.1.md       # Release notes
│   ├── VERSION_0.5.1_SUMMARY.md      # Version summary
│   ├── CRITICAL_FIX_v0.5.1.md        # Bug fixes
│   ├── ERROR_HANDLING_DEMO.md        # Error examples
│   ├── BLANK_PAGE_FIX.md             # Troubleshooting
│   ├── FIX_BLANK_PAGE_NOW.md         # Quick fixes
│   ├── NPM_FIX_SUMMARY.md            # NPM issues
│   ├── HOMEBREW_DETECTION.md         # Homebrew help
│   ├── LATEST_UPDATES.md             # Recent updates
│   └── TEST_CHECKLIST.md             # Test checklist
│
├── scripts/                          # Startup & utility scripts
│   ├── start-frontend.sh             # macOS/Linux startup
│   ├── start-frontend.bat            # Windows startup
│   ├── setup-homebrew.sh             # Homebrew PATH helper
│   ├── start.sh                      # Full stack startup
│   └── start.bat                     # Windows full stack
│
├── backend/                          # Backend API (v1.0.0)
│   ├── src/
│   │   ├── config/                   # Database config
│   │   ├── database/                 # Schema & migrations
│   │   ├── middleware/               # Auth middleware
│   │   ├── routes/                   # API endpoints
│   │   ├── types/                    # TypeScript types
│   │   └── server.ts                 # Express server
│   ├── package.json
│   ├── tsconfig.json
│   └── env.example
│
├── node_modules/                     # Dependencies (ignored)
│
├── README.md                         # Main documentation
├── PROJECT_STRUCTURE.md              # This file
├── package.json                      # Frontend dependencies
├── package-lock.json                 # Lock file
├── index.html                        # HTML template
├── vite.config.ts                    # Vite configuration
├── tailwind.config.js                # Tailwind CSS config
├── tsconfig.json                     # TypeScript config
├── tsconfig.app.json                 # App TypeScript config
├── tsconfig.node.json                # Node TypeScript config
├── postcss.config.js                 # PostCSS config
├── eslint.config.js                  # ESLint config
├── .gitignore                        # Git ignore rules
└── vite-env.d.ts                     # Vite types
```

---

## Component Organization

### By Feature

**Authentication** (`src/components/auth/`)
- LoginForm.tsx - User authentication

**Dashboard** (`src/components/dashboard/`)
- Dashboard.tsx - Main dashboard
- StatsCard.tsx - Metric cards
- RecentExpenses.tsx - Recent activity
- UpcomingEvents.tsx - Event preview
- BudgetOverview.tsx - Budget tracking

**Events** (`src/components/events/`)
- EventSetup.tsx - Event management
- EventForm.tsx - Event creation/edit

**Expenses** (`src/components/expenses/`)
- ExpenseSubmission.tsx - Expense list
- ExpenseForm.tsx - Expense creation/edit
- ReceiptUpload.tsx - Receipt handling

**Admin** (`src/components/admin/`)
- UserManagement.tsx - User CRUD
- AdminSettings.tsx - App configuration

**Accountant** (`src/components/accountant/`)
- AccountantDashboard.tsx - Expense review

**Reports** (`src/components/reports/`)
- Reports.tsx - Main reports
- ExpenseChart.tsx - Charts
- DetailedReport.tsx - Detailed views
- EntityBreakdown.tsx - Entity analysis

**Layout** (`src/components/layout/`)
- Header.tsx - Top navigation
- Sidebar.tsx - Side menu

---

## Import Pattern Examples

### From App.tsx
```typescript
import { LoginForm } from './components/auth/LoginForm';
import { Dashboard } from './components/dashboard/Dashboard';
import { Header } from './components/layout/Header';
import { useAuth } from './hooks/useAuth';
```

### From Dashboard Component
```typescript
import { User, TradeShow, Expense } from '../../App';
import { StatsCard } from './StatsCard';
import { BudgetOverview } from './BudgetOverview';
```

### From Header Component
```typescript
import { User } from '../../App';
```

---

## Benefits of New Structure

### Clean Root Directory
- Only configuration files at root
- Easy to find project settings
- Professional appearance

### Organized Source Code
- Logical grouping by feature
- Easy to locate components
- Scalable architecture

### Separate Documentation
- All guides in docs/ folder
- Easy to maintain
- Easy to find help

### Separate Scripts
- All automation in scripts/ folder
- Easy to execute
- Clear purpose

---

## Quick Access

### Start the App
```bash
./scripts/start-frontend.sh  # macOS/Linux
scripts\start-frontend.bat   # Windows
```

### View Documentation
```bash
ls docs/                     # List all guides
cat docs/QUICKSTART.md       # Quick start
cat docs/TROUBLESHOOTING.md  # Help
```

### Browse Components
```bash
ls src/components/           # All component folders
ls src/components/dashboard/ # Dashboard components
```

---

## Migration Notes

### v0.5.1 → v0.6.0

**Breaking Changes for Developers:**
- File paths changed
- Import paths updated
- Scripts moved to scripts/ folder
- Docs moved to docs/ folder

**No Breaking Changes for Users:**
- All features work the same
- Just need to hard refresh browser
- No data migration needed

### Updated Paths

| Item | Old Path | New Path |
|------|----------|----------|
| Components | `./ComponentName.tsx` | `src/components/feature/` |
| Scripts | `./start-frontend.sh` | `scripts/start-frontend.sh` |
| Docs | `./GUIDE.md` | `docs/GUIDE.md` |
| Types | `./types.ts` | `src/types/types.ts` |
| Hooks | `./useAuth.ts` | `src/hooks/useAuth.ts` |

---

## File Count

- **Source Files:** 30+ components
- **Documentation:** 19 files
- **Scripts:** 5 files
- **Backend:** 12 files (prepared)
- **Configuration:** 10 files
- **Total:** 75+ organized files

---

## Standards Compliance

This structure follows:
- ✅ React best practices
- ✅ TypeScript conventions
- ✅ Modern web app patterns
- ✅ Vite recommendations
- ✅ Clean architecture principles

---

Last Updated: October 1, 2025
Version: 0.6.0-alpha
