# Trade Show Expense App - Architecture Documentation

**Version:** 0.18.0 (Frontend) / 2.2.0 (Backend)
**Last Updated:** October 7, 2025
**Status:** Production Ready - Full Stack Deployed

---

## System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                     TRADE SHOW EXPENSE APP                          │
│              Version: 0.18.0 (Frontend) / 2.2.0 (Backend)          │
│                    PRODUCTION DEPLOYMENT                            │
└─────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────┐
│                         PRODUCTION STACK                             │
└──────────────────────────────────────────────────────────────────────┘

                        ┌──────────────────┐
                        │   Web Browser    │
                        │ expapp.duckdns.org│
                        └────────┬─────────┘
                                 │ HTTPS
                                 │
                        ┌────────▼─────────┐
                        │  Nginx Reverse   │
                        │     Proxy        │
                        │ (SSL/TLS + Port) │
                        └────────┬─────────┘
                                 │
          ┌──────────────────────┼──────────────────────┐
          │                      │                      │
   ┌──────▼──────┐      ┌────────▼─────────┐   ┌──────▼──────┐
   │   Frontend  │      │   Backend API    │   │  Uploads    │
   │  React App  │      │  Node/Express    │   │   /uploads  │
   │ (TypeScript)│◄────►│  (TypeScript)    │   │  (Receipts) │
   │   Port 80   │ JWT  │   Port 5000      │   └─────────────┘
   └─────────────┘ Auth └────────┬─────────┘
                                 │
          ┌──────────────────────┼──────────────────────┐
          │                      │                      │
   ┌──────▼──────┐      ┌────────▼─────────┐   ┌──────▼──────┐
   │ PostgreSQL  │      │  Tesseract.js    │   │   Sharp     │
   │  Database   │      │   OCR Engine     │   │ Image Prep  │
   │  Port 5432  │      │  (In-process)    │   │(Grayscale,  │
   └─────────────┘      └──────────────────┘   │ Sharpen)    │
                                               └─────────────┘

┌──────────────────────────────────────────────────────────────────────┐
│              DEPLOYMENT: Proxmox LXC Containers                      │
│  Production Container: 203 (192.168.1.138)                          │
│  Sandbox Container: 202 (192.168.1.144)                             │
└──────────────────────────────────────────────────────────────────────┘

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
│                  PRODUCTION DATA FLOW (v0.18.0)                  │
└───────────────────────────────────────────────────────────────────┘

User Interaction (Browser)
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
│      API Client (Axios)          │
│                                  │
│  - JWT Token in Authorization    │
│  - Content-Type: application/json│
│  - FormData for file uploads     │
└──────────┬───────────────────────┘
           │ HTTP/HTTPS
           ▼
┌──────────────────────────────────┐
│      Express Backend API         │
│                                  │
│  Middleware:                     │
│  1. CORS validation              │
│  2. JWT verification             │
│  3. Role authorization           │
│  4. Request parsing              │
└──────────┬───────────────────────┘
           │
    ┌──────┴──────────────────────┐
    │                             │
    ▼                             ▼
┌─────────────┐         ┌─────────────────┐
│ PostgreSQL  │         │  File System    │
│  Database   │         │  /uploads/      │
│             │         │  (Receipts)     │
│  Tables:    │         └─────────────────┘
│  - users    │
│  - events   │
│  - expenses │
│  - event_   │
│    participants│
│  - app_settings│
└─────────────┘
       │
       ▼
┌──────────────┐
│   Response   │
│   JSON Data  │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│  Frontend    │
│  State Update│
└──────────────┘
```

---

## Authentication Flow

```
┌───────────────────────────────────────────────────────────────────┐
│              JWT AUTHENTICATION FLOW (Production)                 │
└───────────────────────────────────────────────────────────────────┘

User Opens App
      │
      ▼
┌──────────────────┐
│  Check           │
│  localStorage    │
│  for JWT token   │
└────────┬─────────┘
         │
    ┌────┴────┐
    │         │
  Found    Not Found
    │         │
    ▼         ▼
┌─────────┐  ┌──────────────┐
│Validate │  │ Show Login   │
│ Token   │  │    Form      │
│ (API)   │  │              │
└──┬──────┘  │ Environment: │
   │         │ - Production │
   │         │ - Sandbox    │
   │         └──────┬───────┘
   │                │
   │         ┌──────▼────────┐
   │         │ Enter Username│
   │         │  & Password   │
   │         └──────┬────────┘
   │                │
   │         ┌──────▼────────┐
   │         │ POST /api/auth│
   │         │  /login       │
   │         └──────┬────────┘
   │                │
   │         ┌──────▼────────┐
   │         │ Backend:      │
   │         │ 1. Find user  │
   │         │ 2. Compare    │
   │         │    bcrypt hash│
   │         └──────┬────────┘
   │                │
   │           ┌────┴─────┐
   │           │          │
   │         Valid    Invalid
   │           │          │
   │           │      ┌───▼──────┐
   │           │      │  Return  │
   │           │      │  401 Error│
   │           │      └──────────┘
   │           │
   │      ┌────▼─────────┐
   │      │ Generate JWT │
   │      │ - User ID    │
   │      │ - Role       │
   │      │ - Expires 24h│
   │      └────┬─────────┘
   │           │
   │      ┌────▼─────────┐
   │      │ Return:      │
   │      │ - token      │
   │      │ - user data  │
   │      └────┬─────────┘
   │           │
   └───────────┴──────┐
                      │
              ┌───────▼────────┐
              │ Store JWT in   │
              │ localStorage   │
              └───────┬────────┘
                      │
              ┌───────▼────────┐
              │ Set User State │
              │ in React       │
              └───────┬────────┘
                      │
              ┌───────▼────────┐
              │ All API calls  │
              │ include JWT in │
              │ Authorization  │
              │ header         │
              └───────┬────────┘
                      │
              ┌───────▼────────┐
              │ Render         │
              │ Dashboard      │
              └────────────────┘

┌───────────────────────────────────────────────────────────────────┐
│ Subsequent API Requests:                                          │
│                                                                   │
│ Frontend → API (with Bearer token) → Backend validates JWT →     │
│ → Check role permissions → Execute query → Return data           │
└───────────────────────────────────────────────────────────────────┘
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
│              PRODUCTION OCR PROCESSING PIPELINE                   │
│              Tesseract.js + Sharp (v0.11.0+)                      │
└───────────────────────────────────────────────────────────────────┘

Receipt Image Upload (Frontend)
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
│ FormData Upload  │
│ → Backend API    │
│ Multer Handler   │
└────────┬─────────┘
         │
         ▼
┌──────────────────────────────┐
│ Sharp Image Preprocessing    │
│                              │
│ 1. Grayscale conversion      │
│ 2. Normalize (stretch)       │
│ 3. Sharpen enhancement       │
│ 4. Median blur (3x3)         │
│ 5. Linear contrast (+1.5)    │
│ 6. Brightness normalization  │
│                              │
│ Output: Optimized Buffer     │
└────────┬─────────────────────┘
         │
         ▼
┌──────────────────────────────┐
│ Tesseract.js OCR Engine      │
│                              │
│ - PSM Mode: 6 (Block of text)│
│ - Language: English          │
│ - Character whitelist:       │
│   A-Z, 0-9, $, ., -, :, /    │
│                              │
│ Output: Raw text + confidence│
└────────┬─────────────────────┘
         │
         ▼
┌──────────────────────────────┐
│ Enhanced Field Extraction    │
│                              │
│ Merchant: Multi-pattern regex│
│ Total: $XX.XX patterns       │
│ Date: MM/DD/YYYY, MM-DD-YY   │
│ Category: Keyword matching   │
│ Location: City, State parsing│
└────────┬─────────────────────┘
         │
         ▼
┌──────────────────┐
│ Return JSON      │
│ - ocrText        │
│ - merchant       │
│ - amount         │
│ - date           │
│ - category       │
│ - location       │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Auto-fill Form   │
│ (Frontend)       │
└──────────────────┘
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

## API Endpoints (Production)

```
┌───────────────────────────────────────────────────────────────────┐
│                      BACKEND API ROUTES                           │
│                   Base URL: /api                                  │
└───────────────────────────────────────────────────────────────────┘

Authentication Routes (/api/auth):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
POST   /api/auth/login          Login with username/password
                                 → Returns JWT + user data

User Routes (/api/users):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
GET    /api/users               Get all users (admin only)
POST   /api/users               Create new user (admin only)
PUT    /api/users/:id           Update user (admin only)
DELETE /api/users/:id           Delete user (admin only)
GET    /api/users/me            Get current user profile

Event Routes (/api/events):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
GET    /api/events              Get all events
POST   /api/events              Create event (admin, coordinator)
PUT    /api/events/:id          Update event (admin, coordinator)
DELETE /api/events/:id          Delete event (admin, coordinator)
GET    /api/events/:id/participants  Get event participants

Expense Routes (/api/expenses):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
GET    /api/expenses            Get expenses (filtered by role)
POST   /api/expenses            Create expense + upload receipt
PUT    /api/expenses/:id        Update expense + receipt (optional)
DELETE /api/expenses/:id        Delete expense
POST   /api/expenses/ocr        Process receipt with OCR
                                 → Multipart form-data (receipt image)
                                 → Returns extracted fields

Approval Routes (/api/expenses):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PUT    /api/expenses/:id/approve     Approve expense (admin, accountant)
PUT    /api/expenses/:id/reject      Reject expense (admin, accountant)
PUT    /api/expenses/:id/reimbursement  Approve reimbursement (admin, accountant)

Settings Routes (/api/settings):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
GET    /api/settings            Get all app settings
PUT    /api/settings            Update settings (admin only)

Middleware Applied to All Routes:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. CORS (Cross-Origin Resource Sharing)
2. JWT Verification (except /api/auth/login)
3. Role Authorization (route-specific)
4. Error Handling (centralized)
```

---

## Browser Storage Schema (Current)

```
┌───────────────────────────────────────────────────────────────────┐
│                    BROWSER LOCALSTORAGE                           │
│              (Authentication & Temporary State Only)              │
└───────────────────────────────────────────────────────────────────┘

Key: auth_token
Value: string (JWT)
└─ JSON Web Token for API authentication
   Expires: 24 hours
   Contains: user_id, role, username

Key: current_user
Value: User object
└─ Currently logged-in user details
   Used for UI display and role checks
   Refreshed from API on app load

┌───────────────────────────────────────────────────────────────────┐
│                    POSTGRESQL DATABASE SCHEMA                     │
│                    (Primary Data Store)                           │
└───────────────────────────────────────────────────────────────────┘

Table: users
├─ id (serial, primary key)
├─ username (varchar, unique)
├─ password_hash (varchar, bcrypt)
├─ name (varchar)
├─ email (varchar, unique)
├─ role (varchar: admin, coordinator, salesperson, accountant)
├─ created_at (timestamp)
└─ updated_at (timestamp)

Table: events
├─ id (serial, primary key)
├─ name (varchar)
├─ venue (varchar)
├─ city (varchar)
├─ state (varchar)
├─ start_date (date)
├─ end_date (date)
├─ budget (numeric, nullable)
├─ status (varchar: upcoming, active, completed)
├─ coordinator_id (integer, foreign key → users)
├─ created_at (timestamp)
└─ updated_at (timestamp)

Table: event_participants
├─ event_id (integer, foreign key → events)
├─ user_id (integer, foreign key → users)
└─ PRIMARY KEY (event_id, user_id)

Table: expenses
├─ id (serial, primary key)
├─ user_id (integer, foreign key → users)
├─ event_id (integer, foreign key → events)
├─ category (varchar)
├─ merchant (varchar)
├─ amount (numeric)
├─ date (date)
├─ description (text, nullable)
├─ card_used (varchar)
├─ reimbursement_required (boolean)
├─ reimbursement_status (varchar, nullable)
├─ receipt_url (varchar, nullable)
├─ ocr_text (text, nullable)
├─ status (varchar: pending, approved, rejected)
├─ zoho_entity (varchar, nullable)
├─ location (varchar, nullable)
├─ created_at (timestamp)
└─ updated_at (timestamp)

Table: app_settings
├─ id (serial, primary key)
├─ setting_key (varchar, unique)
├─ setting_value (jsonb)
├─ created_at (timestamp)
└─ updated_at (timestamp)

Examples:
  - card_options: ["Personal Card", "Corporate Amex", "Corporate Visa"]
  - entity_options: ["Haute Inc.", "Haute Canada", "Haute Europe"]
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
│              PRODUCTION v0.18.0 / v2.2.0                         │
└───────────────────────────────────────────────────────────────────┘

FRONTEND (v0.18.0):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Core:
  ├─ React 18.3.1
  ├─ TypeScript 5.5.3
  ├─ Vite 5.4.2 (Build tool & Dev server)
  ├─ Tailwind CSS 3.4.1 (Styling)
  └─ Lucide React 0.344.0 (Icons)

HTTP Client:
  ├─ Axios 1.6.5
  └─ Fetch API (FormData uploads)

State Management:
  ├─ React Hooks (useState, useEffect, useMemo)
  ├─ Custom Hooks (useAuth, useApiData)
  └─ JWT Token Storage

Development:
  ├─ ESLint 9.9.1
  ├─ TypeScript ESLint 8.3.0
  ├─ Hot Module Reload (HMR)
  └─ Concurrently 8.2.2 (Multi-process dev)

BACKEND (v2.2.0):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Core:
  ├─ Node.js 20.x
  ├─ Express 4.18.2
  ├─ TypeScript 5.9.3
  └─ ts-node-dev 2.0.0 (Dev server)

Database & ORM:
  ├─ PostgreSQL 16+ (Production database)
  ├─ pg (Node PostgreSQL client) 8.11.3
  └─ Direct SQL queries

Authentication & Security:
  ├─ JWT (jsonwebtoken 9.0.2)
  ├─ bcrypt 5.1.1 (Password hashing)
  ├─ CORS 2.8.5
  └─ Custom authorization middleware

File Processing:
  ├─ Multer 1.4.5-lts.1 (File uploads)
  ├─ Sharp 0.34.4 (Image preprocessing)
  ├─ Tesseract.js 5.1.1 (OCR engine)
  └─ UUID 9.0.1 (File naming)

API Design:
  ├─ RESTful endpoints
  ├─ JWT bearer token authentication
  ├─ Role-based authorization (admin, coordinator, salesperson, accountant)
  └─ Centralized error handling

INFRASTRUCTURE:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Deployment:
  ├─ Proxmox VE (Virtualization)
  ├─ LXC Containers (Production: 203, Sandbox: 202)
  ├─ Debian 12 (Container OS)
  └─ Systemd (Service management)

Web Server:
  ├─ Nginx (Reverse proxy)
  ├─ Let's Encrypt SSL/TLS
  └─ DuckDNS (Dynamic DNS: expapp.duckdns.org)

Database:
  ├─ PostgreSQL 16
  ├─ Persistent storage in /var/lib/postgresql
  └─ Daily automated backups

Monitoring:
  ├─ systemctl (Service status)
  ├─ journalctl (Logs)
  └─ PostgreSQL query logs
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

### v0.18.0 / v2.2.0 (Current - October 7, 2025)
**Status:** Production Deployed
- ✅ Environment-aware login credentials (production vs sandbox)
- ✅ Dynamic version display (reads from package.json)
- ✅ Full data persistence fixes (events, expenses, receipts)
- ✅ Streamlined expense workflow (unified OCR-first submission)
- ✅ Enhanced navigation UX (settings reorganization, user management integration)
- ✅ Comprehensive repository cleanup

### v0.16.0 / v2.0.0 (October 2025)
**Major Enhancement:** Data Persistence & Workflow Fixes
- ✅ Fixed event date persistence during editing
- ✅ Fixed event participants dropdown (all users now visible)
- ✅ Fixed expense event and card selection persistence
- ✅ Fixed receipt preservation during expense editing
- ✅ Improved edit workflow (no data loss on receipt re-upload)

### v0.15.0 / v1.9.0 (October 2025)
**UX Enhancement:** Navigation Improvements
- ✅ Moved user management under admin settings (tabbed interface)
- ✅ Reorganized sidebar menu (settings as last option)
- ✅ Role-based settings access for all users

### v0.14.0 / v1.8.0 (October 2025)
**UX Enhancement:** Expense Workflow Streamlining
- ✅ Unified "Scan Receipt" and "Add Expense" into single workflow
- ✅ Removed redundant location field from scan receipt page
- ✅ Fixed date field persistence during OCR processing
- ✅ Improved receipt visibility in expense management

### v0.13.0 / v1.7.0 (October 2025)
**Major Milestone:** Sandbox-to-Main Merge
- ✅ Merged all sandbox features into main branch
- ✅ Resolved merge conflicts (Header, API, ExpenseForm)
- ✅ Integrated receipt upload support for expense updates
- ✅ Established main as single source of truth

### v0.12.0 / v1.6.0 (October 2025)
**Repository Cleanup**
- ✅ Removed outdated deployment scripts and documentation
- ✅ Optimized .gitignore for better version control
- ✅ Cleaned up old OCR experiment files
- ✅ Removed temporary artifacts and redundant files

### v0.11.0 / v1.5.0 (October 2025)
**OCR Enhancement**
- ✅ Replaced simulated OCR with real Tesseract.js
- ✅ Integrated Sharp for advanced image preprocessing
- ✅ Enhanced field extraction with improved regex patterns
- ✅ Removed EasyOCR/PaddleOCR due to CPU compatibility issues
- ✅ Deployed to sandbox with comprehensive testing

### v0.10.0 / v1.4.0 (October 2025)
**Backend Integration Complete**
- ✅ Full PostgreSQL database integration
- ✅ JWT authentication system
- ✅ RESTful API endpoints
- ✅ File upload handling with Multer
- ✅ Role-based authorization middleware

### v0.9.0 / v1.3.0 (September 2025)
**Production Deployment**
- ✅ Deployed to Proxmox LXC containers
- ✅ Nginx reverse proxy with SSL/TLS
- ✅ Systemd service management
- ✅ Dual environment (production + sandbox)

### v0.5.0-alpha (September 2025)
**Initial Release**
- ✅ Frontend-only implementation
- ✅ localStorage for data persistence
- ✅ Simulated OCR processing
- ✅ Role-based UI
- ✅ All core components functional

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

**This architecture document is maintained and updated with each major release.**

---

**Document Metadata:**
- **Last Updated:** October 7, 2025
- **Current Version:** v0.18.0 (Frontend) / v2.2.0 (Backend)
- **Status:** Production Deployed
- **Production URL:** https://expapp.duckdns.org
- **Sandbox URL:** http://192.168.1.144
- **Repository:** GitHub - main branch (single source of truth)

**Key Recent Enhancements:**
1. Environment-aware login credentials
2. Full data persistence across all workflows
3. Streamlined expense submission with OCR
4. Enhanced navigation and UX improvements
5. Production-grade deployment on Proxmox LXC

**Next Planned Features:**
- Advanced reporting and analytics dashboard
- Bulk expense import/export
- Mobile-responsive PWA optimization
- Enhanced OCR confidence scoring
- Automated expense categorization with ML

