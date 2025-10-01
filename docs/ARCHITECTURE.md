# Trade Show Expense App - Architecture Documentation

**Version:** 0.5.0-alpha (Pre-release - Frontend Only)
**Last Updated:** September 30, 2025

---

## System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                     TRADE SHOW EXPENSE APP                          │
│                    Version: 0.5.0-alpha                             │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                         CURRENT STATE                               │
│                      (Frontend Only)                                │
└─────────────────────────────────────────────────────────────────────┘

                    ┌──────────────────┐
                    │   Web Browser    │
                    │  localhost:5173  │
                    └────────┬─────────┘
                             │
                    ┌────────▼─────────┐
                    │   React App      │
                    │   (TypeScript)   │
                    └────────┬─────────┘
                             │
          ┌──────────────────┼──────────────────┐
          │                  │                  │
   ┌──────▼──────┐   ┌──────▼──────┐   ┌──────▼──────┐
   │   UI Layer  │   │  Auth Layer │   │ Data Layer  │
   │  Components │   │   useAuth   │   │ localStorage│
   └─────────────┘   └─────────────┘   └─────────────┘
          │                  │                  │
          │                  │                  │
   ┌──────▼──────────────────▼──────────────────▼──────┐
   │           Vite Development Server                  │
   │              + Hot Module Reload                   │
   └────────────────────────────────────────────────────┘

---

## Detailed Component Architecture

```
┌───────────────────────────────────────────────────────────────────┐
│                      FRONTEND COMPONENTS                          │
└───────────────────────────────────────────────────────────────────┘

┌─────────────────┐
│     App.tsx     │  (Main Container)
│                 │
│  ┌───────────┐  │
│  │ useAuth() │  │  Authentication State Management
│  └───────────┘  │
│                 │
│  ┌───────────┐  │
│  │ Routing   │  │  Page Navigation Logic
│  └───────────┘  │
└────────┬────────┘
         │
    ┌────┴─────────────────────────────────────────────┐
    │                                                   │
┌───▼────────────┐                           ┌─────────▼─────────┐
│  Authenticated │                           │   Non-Authenticated│
│     Views      │                           │       Views        │
└───┬────────────┘                           └─────────┬─────────┘
    │                                                   │
    │                                          ┌────────▼─────────┐
    │                                          │  LoginForm.tsx   │
    │                                          │  - Username/Pass │
    │                                          │  - Demo accounts │
    │                                          └──────────────────┘
    │
    ├──────────────────┬──────────────────┬──────────────────┐
    │                  │                  │                  │
┌───▼──────┐  ┌───────▼─────┐  ┌─────────▼─────┐  ┌──────▼──────┐
│ Layout   │  │   Header    │  │   Sidebar     │  │   Content   │
│ Components│  │   .tsx      │  │   .tsx        │  │    Pages    │
└──────────┘  └─────────────┘  └───────────────┘  └──────┬──────┘
                    │                                      │
              ┌─────┴──────┐                              │
              │            │                              │
         ┌────▼────┐  ┌───▼────┐                         │
         │ Search  │  │ Notif  │                         │
         │  Bar    │  │ Bell   │                         │
         └─────────┘  └────────┘                         │
                         │                               │
                    ┌────▼────┐                          │
                    │Dropdown │                          │
                    │ Panel   │                          │
                    └─────────┘                          │
                                                         │
    ┌────────────────────────────┬───────────────────────┤
    │                            │                       │
┌───▼──────────┐      ┌──────────▼───────┐    ┌────────▼─────────┐
│  Dashboard   │      │  Event Setup     │    │ Expense Submit   │
│   .tsx       │      │   .tsx           │    │   .tsx           │
│              │      │                  │    │                  │
│ - Stats      │      │ - Event Form     │    │ - Expense Form   │
│ - Charts     │      │ - Participants   │    │ - Receipt Upload │
│ - Overview   │      │ - Budget (Admin) │    │ - OCR Process    │
└──────────────┘      └──────────────────┘    └──────────────────┘

┌─────────────────┐    ┌──────────────────┐   ┌──────────────────┐
│  User Mgmt      │    │  Reports         │   │  Settings        │
│  .tsx (Admin)   │    │  .tsx            │   │  .tsx (Admin)    │
│                 │    │                  │   │                  │
│ - Create User   │    │ - Charts         │   │ - Card Options   │
│ - Edit User     │    │ - Breakdown      │   │ - Entity Options │
│ - Delete User   │    │ - Filters        │   │ - Configurations │
└─────────────────┘    └──────────────────┘   └──────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│            Accountant Dashboard.tsx                              │
│                                                                  │
│  - View All Expenses Across Events                              │
│  - Multi-filter System (Category, User, Event, Status, etc.)    │
│  - Approve/Reject Expenses                                      │
│  - Assign Zoho Entities                                         │
│  - Approve Reimbursements                                       │
└──────────────────────────────────────────────────────────────────┘
```

---

## Data Flow Architecture

```
┌───────────────────────────────────────────────────────────────────┐
│                      DATA FLOW (v0.5.0-alpha)                    │
└───────────────────────────────────────────────────────────────────┘

User Interaction
      │
      ▼
┌──────────────┐
│   React      │
│  Component   │
└──────┬───────┘
       │
       ▼
┌──────────────┐         ┌──────────────┐
│   useState   │◄────────│  useEffect   │
│   Hooks      │         │  Lifecycle   │
└──────┬───────┘         └──────────────┘
       │
       ▼
┌──────────────────────────────────┐
│      localStorage API            │
│                                  │
│  Keys:                           │
│  - tradeshow_users               │
│  - tradeshow_events              │
│  - tradeshow_expenses            │
│  - tradeshow_current_user        │
│  - app_settings                  │
└──────────────────────────────────┘
       │
       ▼
┌──────────────┐
│   Browser    │
│   Storage    │
│  (Persistent)│
└──────────────┘
```

---

## Authentication Flow

```
┌───────────────────────────────────────────────────────────────────┐
│                    AUTHENTICATION FLOW                            │
└───────────────────────────────────────────────────────────────────┘

User Opens App
      │
      ▼
┌──────────────────┐
│  Check           │
│  localStorage    │
│  for saved user  │
└────────┬─────────┘
         │
    ┌────┴────┐
    │         │
  Found    Not Found
    │         │
    ▼         ▼
┌─────┐  ┌──────────────┐
│Load │  │ Show Login   │
│User │  │    Form      │
└──┬──┘  └──────┬───────┘
   │             │
   │      ┌──────▼────────┐
   │      │ Enter Username│
   │      │  & Password   │
   │      └──────┬────────┘
   │             │
   │      ┌──────▼────────┐
   │      │ Validate      │
   │      │ Credentials   │
   │      └──────┬────────┘
   │             │
   │        ┌────┴─────┐
   │        │          │
   │      Valid    Invalid
   │        │          │
   │        │      ┌───▼──────┐
   │        │      │  Show    │
   │        │      │  Error   │
   │        │      └──────────┘
   │        │
   │   ┌────▼─────────┐
   │   │ Find User in │
   │   │ localStorage │
   │   └────┬─────────┘
   │        │
   │   ┌────▼─────────┐
   │   │ Save User to │
   │   │ Current User │
   │   └────┬─────────┘
   │        │
   └────────┴──────┐
                   │
             ┌─────▼──────┐
             │  Set User  │
             │   State    │
             └─────┬──────┘
                   │
             ┌─────▼──────┐
             │   Render   │
             │  Dashboard │
             └────────────┘
```

---

## Role-Based Access Control

```
┌───────────────────────────────────────────────────────────────────┐
│                    USER ROLES & PERMISSIONS                       │
└───────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│                          ADMIN                                    │
├──────────────────────────────────────────────────────────────────┤
│  Full Access:                                                    │
│  ✓ User Management (Create, Edit, Delete)                       │
│  ✓ All Events (Create, Edit, Delete, View Budget)               │
│  ✓ All Expenses (View, Approve, Reject)                         │
│  ✓ Settings (Card Options, Entity Options)                      │
│  ✓ Reports (All data)                                            │
│  ✓ Budget Setting & Viewing                                      │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│                       COORDINATOR                                 │
├──────────────────────────────────────────────────────────────────┤
│  Event Management:                                               │
│  ✓ Create Events                                                 │
│  ✓ Edit Events                                                   │
│  ✓ Add Participants                                              │
│  ✓ View Event Expenses                                           │
│  ✗ Cannot Set Budget                                             │
│  ✗ Cannot View Budget Amounts                                    │
│  ✗ Cannot Approve Expenses                                       │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│                       SALESPERSON                                 │
├──────────────────────────────────────────────────────────────────┤
│  Expense Submission:                                             │
│  ✓ Submit Expenses                                               │
│  ✓ Upload Receipts                                               │
│  ✓ View Own Expenses Only                                        │
│  ✓ Edit Own Pending Expenses                                     │
│  ✗ Cannot View Other Users' Expenses                             │
│  ✗ Cannot Approve Expenses                                       │
│  ✗ Cannot Create Events                                          │
│  ✗ Cannot Manage Users                                           │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│                       ACCOUNTANT                                  │
├──────────────────────────────────────────────────────────────────┤
│  Financial Management:                                           │
│  ✓ View All Expenses                                             │
│  ✓ Approve/Reject Expenses                                       │
│  ✓ Assign Zoho Entities                                          │
│  ✓ Approve/Reject Reimbursements                                 │
│  ✓ Access Reports & Analytics                                    │
│  ✓ View Budget Information                                       │
│  ✓ Set Event Budgets                                             │
│  ✗ Cannot Manage Users                                           │
│  ✗ Cannot Change Settings                                        │
└──────────────────────────────────────────────────────────────────┘
```

---

## Expense Submission Workflow

```
┌───────────────────────────────────────────────────────────────────┐
│              EXPENSE SUBMISSION WORKFLOW                          │
└───────────────────────────────────────────────────────────────────┘

User (Salesperson) → Submit Expense
         │
         ▼
┌─────────────────────────┐
│  1. Upload Receipt      │  ◄─── FIRST STEP (Highlighted Blue)
│     (Required)          │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│  2. OCR Processing      │
│     (2-3 seconds)       │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│  3. Extract Data        │
│     - Merchant          │
│     - Amount            │
│     - Date              │
│     - Location          │
│     - Category (AI)     │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│  4. Auto-Fill Form      │
│     Fields populated    │
│     from OCR data       │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│  5. User Reviews        │
│     Adjust if needed    │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│  6. Select Card Used    │
└───────────┬─────────────┘
            │
            ▼
   ┌────────┴────────┐
   │                 │
Personal Card    Corporate Card
   │                 │
   ▼                 ▼
┌──────────────┐   ┌──────────────┐
│ Auto-flag    │   │ Optional     │
│ Reimbursement│   │ Reimbursement│
└──────┬───────┘   └──────┬───────┘
       │                  │
       └──────────┬───────┘
                  │
                  ▼
         ┌────────────────┐
         │  7. Submit     │
         │  Status=Pending│
         └────────┬───────┘
                  │
                  ▼
         ┌────────────────┐
         │ Save to        │
         │ localStorage   │
         └────────┬───────┘
                  │
                  ▼
    ┌─────────────────────────┐
    │ Accountant Review Queue │
    └─────────────────────────┘
```

---

## OCR Processing Pipeline

```
┌───────────────────────────────────────────────────────────────────┐
│                    OCR PROCESSING PIPELINE                        │
│                    (Current: Simulated)                           │
└───────────────────────────────────────────────────────────────────┘

Receipt Image Upload
         │
         ▼
┌──────────────────┐
│  File Validation │
│  - Type: image/* │
│  - Size: < 10MB  │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Create Preview   │
│ URL.createObject │
└────────┬─────────┘
         │
         ▼
┌──────────────────────────────┐
│ OCR Simulation Engine        │
│ (v0.5.0-alpha)               │
│                              │
│ 1. Analyze filename          │
│    - hertz → Car Rental      │
│    - hotel → Hotel           │
│    - flight → Airline        │
│    - restaurant → Food       │
│                              │
│ 2. Generate contextual data  │
│    - Appropriate merchant    │
│    - Realistic amounts       │
│    - Matching category       │
│    - Relevant location       │
│                              │
│ 3. Format as receipt text    │
└────────┬─────────────────────┘
         │
         ▼
┌──────────────────┐
│ Extract Fields   │
│ - Merchant       │
│ - Amount ($)     │
│ - Date           │
│ - Location       │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Auto-suggest     │
│ Category         │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Populate Form    │
│ Fields           │
└──────────────────┘

┌───────────────────────────────────────────────────────────────────┐
│              FUTURE OCR (v1.0.0 with Backend)                    │
├───────────────────────────────────────────────────────────────────┤
│  Receipt Image → Backend API → Tesseract.js → Text Extraction    │
│  → Field Parsing → Confidence Scoring → Return to Frontend       │
└───────────────────────────────────────────────────────────────────┘
```

---

## Data Models

```
┌───────────────────────────────────────────────────────────────────┐
│                        DATA MODELS                                │
└───────────────────────────────────────────────────────────────────┘

User
├─ id: string
├─ name: string
├─ username: string
├─ email: string
├─ role: 'admin' | 'coordinator' | 'salesperson' | 'accountant'
└─ avatar?: string

TradeShow/Event
├─ id: string
├─ name: string
├─ venue: string
├─ city: string
├─ state: string
├─ startDate: string
├─ endDate: string
├─ budget?: number (Admin/Accountant only)
├─ status: 'upcoming' | 'active' | 'completed'
├─ participants: User[]
└─ coordinatorId: string

Expense
├─ id: string
├─ userId: string
├─ tradeShowId: string
├─ amount: number
├─ category: string
├─ merchant: string
├─ date: string
├─ description: string
├─ cardUsed: string
├─ reimbursementRequired: boolean (auto-flag for personal card)
├─ reimbursementStatus?: 'pending' | 'approved' | 'rejected'
├─ receiptUrl?: string
├─ ocrText?: string
├─ status: 'pending' | 'approved' | 'rejected'
├─ zohoEntity?: string (Accountant assigns)
├─ location?: string
└─ extractedData?: object

Settings
├─ cardOptions: string[]
└─ entityOptions: string[]
```

---

## Future Architecture (v1.0.0)

```
┌───────────────────────────────────────────────────────────────────┐
│                  PLANNED FULL STACK ARCHITECTURE                  │
│                        (Version 1.0.0)                            │
└───────────────────────────────────────────────────────────────────┘

┌──────────────┐                           ┌──────────────┐
│   Browser    │                           │   Browser    │
│ (Frontend)   │                           │ (Frontend)   │
└──────┬───────┘                           └──────┬───────┘
       │                                          │
       │                                          │
       ▼                                          ▼
┌────────────────┐                      ┌────────────────┐
│  React App     │                      │  React App     │
│  (TypeScript)  │                      │  (TypeScript)  │
└────────┬───────┘                      └────────┬───────┘
         │                                       │
         │ HTTP/HTTPS                            │
         │ (Axios/Fetch)                         │
         │                                       │
         ▼                                       ▼
┌────────────────────────────────────────────────────────┐
│              Backend API Server                        │
│              (Node.js + Express)                       │
├────────────────────────────────────────────────────────┤
│                                                        │
│  Routes:                                               │
│  ├─ /api/auth      (Login, Register, JWT)            │
│  ├─ /api/users     (CRUD, Role Management)           │
│  ├─ /api/events    (CRUD, Participants)              │
│  ├─ /api/expenses  (CRUD, Approval, Upload)          │
│  └─ /api/settings  (Config Management)               │
│                                                        │
│  Middleware:                                           │
│  ├─ JWT Authentication                                │
│  ├─ Role Authorization                                │
│  ├─ File Upload (Multer)                              │
│  └─ Error Handling                                    │
│                                                        │
└────────────────┬───────────────────────┬───────────────┘
                 │                       │
                 │                       │
        ┌────────▼─────────┐    ┌───────▼────────┐
        │   PostgreSQL     │    │  File Storage  │
        │    Database      │    │  (uploads/)    │
        └──────────────────┘    └────────┬───────┘
                                         │
                                         │
                                ┌────────▼─────────┐
                                │  Tesseract.js    │
                                │  OCR Engine      │
                                │                  │
                                │  - Text Extract  │
                                │  - Field Parse   │
                                │  - Confidence    │
                                └──────────────────┘
```

---

## localStorage Schema (Current)

```
┌───────────────────────────────────────────────────────────────────┐
│                    BROWSER LOCALSTORAGE                           │
└───────────────────────────────────────────────────────────────────┘

Key: tradeshow_users
Value: User[]
└─ Array of all registered users
   Seeded with 4 demo accounts

Key: tradeshow_events
Value: TradeShow[]
└─ Array of all trade show events
   Participants embedded

Key: tradeshow_expenses
Value: Expense[]
└─ Array of all submitted expenses
   Links to userId and tradeShowId

Key: tradeshow_current_user
Value: User
└─ Currently logged-in user
   Used for authentication persistence

Key: app_settings
Value: Settings
└─ { cardOptions: string[], entityOptions: string[] }
   Configurable by admin
```

---

## Component Relationships

```
┌───────────────────────────────────────────────────────────────────┐
│                  COMPONENT DEPENDENCY TREE                        │
└───────────────────────────────────────────────────────────────────┘

App.tsx
│
├─── useAuth() Hook
│    └─── localStorage (current_user)
│
├─── LoginForm.tsx
│    └─── Handles authentication
│
└─── Authenticated Layout
     │
     ├─── Sidebar.tsx
     │    ├─── Navigation items filtered by role
     │    └─── Collapse/expand state
     │
     ├─── Header.tsx
     │    ├─── Search bar
     │    ├─── Notifications (dropdown)
     │    ├─── Version badge
     │    └─── User profile + Logout
     │
     └─── Page Router
          │
          ├─── Dashboard.tsx
          │    ├─── StatsCard.tsx (x4)
          │    ├─── RecentExpenses.tsx
          │    ├─── UpcomingEvents.tsx
          │    └─── BudgetOverview.tsx (Admin/Accountant)
          │
          ├─── EventSetup.tsx
          │    └─── Event creation/editing (inline form)
          │
          ├─── ExpenseSubmission.tsx
          │    └─── ExpenseForm.tsx
          │         ├─── Receipt upload (first field)
          │         ├─── OCR processing
          │         ├─── Auto-reimbursement detection
          │         └─── Form validation
          │
          ├─── UserManagement.tsx (Admin only)
          │    └─── User CRUD operations
          │
          ├─── AdminSettings.tsx (Admin only)
          │    ├─── Card options management
          │    └─── Entity options management
          │
          ├─── Reports.tsx
          │    ├─── ExpenseChart.tsx
          │    ├─── DetailedReport.tsx
          │    ├─── EntityBreakdown.tsx
          │    └─── Filter controls
          │
          └─── AccountantDashboard.tsx (Accountant only)
               ├─── Multi-filter system
               ├─── Expense table
               ├─── Approve/reject actions
               └─── Entity assignment
```

---

## Technology Stack

```
┌───────────────────────────────────────────────────────────────────┐
│                      TECHNOLOGY STACK                             │
└───────────────────────────────────────────────────────────────────┘

CURRENT (v0.5.0-alpha):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Frontend:
  ├─ React 18.3.1
  ├─ TypeScript 5.5.3
  ├─ Vite 5.4.2 (Build tool & Dev server)
  ├─ Tailwind CSS 3.4.1 (Styling)
  └─ Lucide React 0.344.0 (Icons)

State Management:
  ├─ React Hooks (useState, useEffect, useMemo)
  ├─ Custom Hooks (useAuth, useLocalStorage)
  └─ Browser localStorage (Data persistence)

Development:
  ├─ ESLint (Code quality)
  ├─ TypeScript ESLint
  ├─ Hot Module Reload (HMR)
  └─ Auto-refresh

PLANNED (v1.0.0):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Backend:
  ├─ Node.js 18+
  ├─ Express 4.18.2
  ├─ TypeScript 5.3.3
  ├─ PostgreSQL 14+ (Database)
  ├─ JWT (Authentication)
  ├─ bcrypt (Password hashing)
  ├─ Multer (File uploads)
  └─ Tesseract.js 5.0.3 (Real OCR)

API:
  ├─ RESTful endpoints
  ├─ JWT token authentication
  ├─ Role-based middleware
  └─ CORS enabled
```

---

## File Structure

```
┌───────────────────────────────────────────────────────────────────┐
│                      PROJECT STRUCTURE                            │
└───────────────────────────────────────────────────────────────────┘

expenseApp/
│
├── Frontend (Root Directory)
│   ├── App.tsx                    Main application container
│   ├── main.tsx                   Entry point
│   ├── index.html                 HTML template
│   ├── index.css                  Tailwind imports
│   │
│   ├── Hooks/
│   │   ├── useAuth.ts             Authentication logic
│   │   └── useLocalStorage.ts     Storage utilities
│   │
│   ├── Layout Components/
│   │   ├── Header.tsx             Top navigation bar
│   │   ├── Sidebar.tsx            Side navigation menu
│   │   └── LoginForm.tsx          Authentication form
│   │
│   ├── Dashboard Components/
│   │   ├── Dashboard.tsx          Main dashboard
│   │   ├── StatsCard.tsx          Metric display cards
│   │   ├── RecentExpenses.tsx     Recent activity
│   │   ├── UpcomingEvents.tsx     Event preview
│   │   └── BudgetOverview.tsx     Financial summary
│   │
│   ├── Event Components/
│   │   ├── EventSetup.tsx         Event management
│   │   └── EventForm.tsx          Event creation form
│   │
│   ├── Expense Components/
│   │   ├── ExpenseSubmission.tsx  Expense list & management
│   │   ├── ExpenseForm.tsx        Expense creation/edit
│   │   └── ReceiptUpload.tsx      Receipt handling
│   │
│   ├── Admin Components/
│   │   ├── UserManagement.tsx     User CRUD (Admin)
│   │   └── AdminSettings.tsx      App settings (Admin)
│   │
│   ├── Accountant Components/
│   │   └── AccountantDashboard.tsx  Review & approval
│   │
│   ├── Report Components/
│   │   ├── Reports.tsx             Main reports page
│   │   ├── ExpenseChart.tsx        Charts & graphs
│   │   ├── DetailedReport.tsx      Detailed breakdown
│   │   └── EntityBreakdown.tsx     Entity analysis
│   │
│   └── Configuration/
│       ├── vite.config.ts          Vite configuration
│       ├── tailwind.config.js     Tailwind settings
│       ├── tsconfig.json           TypeScript config
│       └── package.json            Dependencies
│
├── Backend (Prepared for v1.0.0)
│   ├── src/
│   │   ├── server.ts               Express server
│   │   ├── config/
│   │   │   └── database.ts         PostgreSQL connection
│   │   ├── middleware/
│   │   │   └── auth.ts             JWT & authorization
│   │   ├── routes/
│   │   │   ├── auth.ts             Authentication endpoints
│   │   │   ├── users.ts            User management
│   │   │   ├── events.ts           Event management
│   │   │   ├── expenses.ts         Expense + OCR
│   │   │   └── settings.ts         Settings management
│   │   ├── database/
│   │   │   ├── schema.sql          Database schema
│   │   │   ├── migrate.ts          Migration script
│   │   │   └── seed.ts             Demo data seed
│   │   └── types/
│   │       └── index.ts            Type definitions
│   │
│   └── Configuration/
│       ├── package.json            Backend dependencies
│       ├── tsconfig.json           TypeScript config
│       └── .env.example            Environment template
│
├── Documentation/
│   ├── README.md                   Main guide
│   ├── ARCHITECTURE.md             This file
│   ├── FRONTEND_TESTING.md         Testing guide
│   ├── UX_IMPROVEMENTS.md          UX fixes
│   ├── TROUBLESHOOTING.md          Common issues
│   ├── HOMEBREW_PATH_FIX.md        macOS setup
│   └── Various other guides...
│
└── Scripts/
    ├── start-frontend.sh           Easy frontend startup
    ├── start-frontend.bat          Windows version
    ├── setup-homebrew.sh           Homebrew PATH helper
    ├── start.sh                    Full stack startup
    └── start.bat                   Windows full stack
```

---

## Security & Permissions Matrix

```
┌───────────────────────────────────────────────────────────────────┐
│                  PERMISSIONS MATRIX                               │
└───────────────────────────────────────────────────────────────────┘

Feature                │ Admin │ Coordinator │ Salesperson │ Accountant
───────────────────────┼───────┼─────────────┼─────────────┼───────────
View Dashboard         │   ✓   │      ✓      │      ✓      │     ✓
View All Expenses      │   ✓   │      ✗      │      ✗      │     ✓
View Own Expenses      │   ✓   │      ✓      │      ✓      │     ✓
Submit Expenses        │   ✓   │      ✓      │      ✓      │     ✓
Approve Expenses       │   ✓   │      ✗      │      ✗      │     ✓
Reject Expenses        │   ✓   │      ✗      │      ✗      │     ✓
Create Events          │   ✓   │      ✓      │      ✗      │     ✗
Edit Events            │   ✓   │      ✓      │      ✗      │     ✗
Delete Events          │   ✓   │      ✓      │      ✗      │     ✗
View Budget            │   ✓   │      ✗      │      ✗      │     ✓
Set/Edit Budget        │   ✓   │      ✗      │      ✗      │     ✓
Assign Zoho Entity     │   ✓   │      ✗      │      ✗      │     ✓
Approve Reimbursement  │   ✓   │      ✗      │      ✗      │     ✓
User Management        │   ✓   │      ✗      │      ✗      │     ✗
Settings Management    │   ✓   │      ✗      │      ✗      │     ✗
View Reports           │   ✓   │      ✓      │      ✗      │     ✓
Upload Receipts        │   ✓   │      ✓      │      ✓      │     ✓
```

---

## Deployment Architecture (Future)

```
┌───────────────────────────────────────────────────────────────────┐
│                  PRODUCTION DEPLOYMENT (v1.0.0+)                  │
└───────────────────────────────────────────────────────────────────┘

                      ┌──────────────┐
                      │   Internet   │
                      └──────┬───────┘
                             │
                      ┌──────▼───────┐
                      │  Load        │
                      │  Balancer    │
                      │  (HTTPS/SSL) │
                      └──────┬───────┘
                             │
          ┌──────────────────┼──────────────────┐
          │                  │                  │
    ┌─────▼─────┐     ┌─────▼─────┐     ┌─────▼─────┐
    │ Frontend  │     │ Frontend  │     │ Frontend  │
    │  Server   │     │  Server   │     │  Server   │
    │  (Nginx)  │     │  (Nginx)  │     │  (Nginx)  │
    └───────────┘     └───────────┘     └───────────┘
          │                  │                  │
          └──────────────────┼──────────────────┘
                             │
                      ┌──────▼───────┐
                      │   Backend    │
                      │     API      │
                      │ (Node/Express)│
                      └──────┬───────┘
                             │
          ┌──────────────────┼──────────────────┐
          │                  │                  │
    ┌─────▼─────┐     ┌─────▼─────┐     ┌─────▼─────┐
    │PostgreSQL │     │   File    │     │   Redis   │
    │ Primary   │     │  Storage  │     │   Cache   │
    │           │     │  (S3/CDN) │     │           │
    └───────────┘     └───────────┘     └───────────┘
          │
    ┌─────▼─────┐
    │PostgreSQL │
    │  Replica  │
    │ (Read-only)│
    └───────────┘
```

---

## Version History

### v0.5.0-alpha (Current)
- Frontend-only implementation
- localStorage for data persistence
- Simulated OCR processing
- Role-based UI
- All components functional

### v1.0.0 (Planned)
- Full backend integration
- PostgreSQL database
- Real Tesseract.js OCR
- JWT authentication
- File upload to server
- Production-ready

---

## Key Features Architecture

### Receipt Upload & OCR
```
Upload → Validate → Preview → OCR Process → Extract → Auto-fill
  │                                                        │
  └────────────────────────────────────────────────────────┘
         (Filename-based smart detection in v0.5.0)
```

### Auto-Reimbursement
```
Select Card → Check if "Personal" → Auto-flag → Disable Checkbox
                      │
                    Yes/No
                      │
              Yes: reimbursementRequired = true
              No: User decides manually
```

### Budget Access Control
```
User Role → Check: Admin or Accountant? → Show/Hide Budget Field
               │
            Yes/No
               │
         Yes: <input budget field visible>
         No: Budget field not rendered
```

---

**This architecture document will be updated whenever the system structure changes.**

Last Updated: September 30, 2025
Current Version: 0.5.0-alpha
Next Version: 1.0.0 (with backend integration)

