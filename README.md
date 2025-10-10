# Trade Show Expense Management App

A professional web application for managing trade show events and expenses with role-based permissions, OCR receipt scanning, expense approval workflows, and **automatic Zoho Books integration**.

**Current Version: 0.35.0 (Zoho Books Integration)**

📝 See [docs/CHANGELOG.md](docs/CHANGELOG.md) for version history and release notes

## Quick Start - Frontend Testing

**Get started in 10 seconds:**

```bash
# macOS/Linux
./scripts/start-frontend.sh

# Windows
scripts\start-frontend.bat
```

Then open http://localhost:5173 and login with:
- Admin: `admin` / `admin`
- Coordinator: `sarah` / `password`
- Salesperson: `mike` / `password`
- Accountant: `lisa` / `password`

📖 See [docs/FRONTEND_TESTING.md](docs/FRONTEND_TESTING.md) for comprehensive testing guide
🔧 See [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md) if you encounter any issues
⚙️ **Homebrew installed but not working?** Run `./scripts/setup-homebrew.sh` to fix PATH issues
🏗️ See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for complete system architecture and diagrams

**Note:** This pre-release focuses on frontend testing. Data is stored in browser localStorage. Backend integration coming in v1.0.0.

## Features

- **🔗 Zoho Books Integration** - Automatic expense sync with receipt attachments
- Role-based access control (Admin, Coordinator, Salesperson, Accountant)
- Event/Trade show management with participant tracking
- Expense submission with receipt upload
- OCR text extraction from receipts using Tesseract.js
- Expense approval workflows
- Zoho entity assignment and tracking
- Reimbursement tracking and approval
- Comprehensive reporting and analytics
- RESTful API with JWT authentication

## 📚 Zoho Books Integration

### Overview

Every expense submitted through the app is **automatically posted to Zoho Books** with its receipt attachment. This eliminates manual data entry and ensures your accounting system stays in sync with your expense tracking.

### Key Capabilities

✅ **Automatic Submission** - Expenses sync to Zoho Books immediately upon submission  
✅ **Receipt Attachments** - Uploaded receipts are automatically attached in Zoho Books  
✅ **Duplicate Prevention** - Smart tracking prevents re-submission of the same expense  
✅ **Error Handling** - Graceful fallback if Zoho Books is unavailable (expenses still saved locally)  
✅ **Reimbursement Tracking** - Billable/reimbursable expenses flagged appropriately  
✅ **Event/Project Mapping** - Trade shows mapped to Zoho Books projects  
✅ **OAuth 2.0 Security** - Industry-standard authentication with automatic token refresh  

### How It Works

```
1. User submits expense with receipt → 
2. Expense saved to local database → 
3. OCR processes receipt → 
4. Expense automatically posted to Zoho Books →
5. Receipt attached to Zoho Books expense →
6. Zoho expense ID stored for tracking →
7. User sees confirmation (all happens in seconds!)
```

### Setup

**Quick Setup:** Follow our comprehensive setup guide:
- 📖 **[docs/ZOHO_BOOKS_SETUP.md](docs/ZOHO_BOOKS_SETUP.md)** - Complete step-by-step instructions

**Environment Variables Required:**
```bash
ZOHO_CLIENT_ID=1000.YOUR_CLIENT_ID
ZOHO_CLIENT_SECRET=your_client_secret
ZOHO_REFRESH_TOKEN=1000.your_refresh_token
ZOHO_ORGANIZATION_ID=12345678
ZOHO_EXPENSE_ACCOUNT_NAME=Travel Expenses
ZOHO_PAID_THROUGH_ACCOUNT=Petty Cash
```

**Health Check:**
```bash
GET /api/expenses/zoho/health
```

### Optional Integration

The Zoho Books integration is **completely optional**:
- ✅ If configured: Expenses sync automatically
- ✅ If not configured: App works normally (local storage only)
- ✅ No disruption: Integration failure won't block expense submission

### Security

🔒 **No credentials in code** - All secrets stored in environment variables  
🔒 **Token auto-refresh** - Access tokens refresh automatically (no user action needed)  
🔒 **Secure OAuth 2.0** - Industry-standard authentication flow  
🔒 **Audit trail** - All Zoho API interactions logged for debugging  

### Troubleshooting

See the [Zoho Books Setup Guide](docs/ZOHO_BOOKS_SETUP.md#troubleshooting) for common issues and solutions.

## Tech Stack

### Frontend
- React 18 with TypeScript
- Tailwind CSS for styling
- Vite for build tooling
- Lucide React for icons

### Backend
- Node.js with Express
- PostgreSQL database
- TypeScript
- JWT for authentication
- Tesseract.js for OCR
- Multer for file uploads
- bcrypt for password hashing

## Prerequisites

Before you begin, ensure you have the following installed:
- Node.js (v18 or higher)
- PostgreSQL (v14 or higher)
- npm or yarn

## Frontend Testing (Current Release)

This is a pre-release version focused on frontend testing. The backend will be integrated in v1.0.0.

**What's Included:**
- Complete React frontend with TypeScript
- All UI components and layouts
- Role-based navigation and views
- Form validations
- Data persistence via localStorage
- Professional UI design

**What's Coming:**
- Full backend API (Node.js + Express)
- PostgreSQL database
- Real OCR processing
- JWT authentication
- File upload to server
- Email notifications

## Local Development Setup

### 1. Clone the Repository

```bash
git clone https://github.com/sahiwal283/expenseApp.git
cd expenseApp
```

### 2. Database Setup

Install and start PostgreSQL:

```bash
# macOS (using Homebrew)
brew install postgresql@14
brew services start postgresql@14

# Ubuntu/Debian
sudo apt-get install postgresql postgresql-contrib
sudo systemctl start postgresql
```

Create the database:

```bash
# Connect to PostgreSQL
psql postgres

# Create database and user
CREATE DATABASE expense_app;
CREATE USER expense_user WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE expense_app TO expense_user;
\q
```

### 3. Backend Setup

Navigate to the backend directory and install dependencies:

   ```bash
cd backend
   npm install
   ```

Create environment configuration:

```bash
cp env.example .env
```

Edit `.env` file with your configuration:

```env
# Server Configuration
PORT=5000
NODE_ENV=development

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=expense_app
DB_USER=expense_user
DB_PASSWORD=your_secure_password

# JWT Secret
JWT_SECRET=your_random_secret_key_min_32_chars_long

# File Upload
UPLOAD_DIR=uploads
MAX_FILE_SIZE=5242880
```

Run database migrations:

```bash
npm run migrate
```

Seed the database with demo data:

```bash
npm run seed
```

Demo users created:
- `admin` / `password123` (Admin)
- `sarah` / `password123` (Coordinator)
- `mike` / `password123` (Salesperson)
- `lisa` / `password123` (Accountant)

Start the backend server:

   ```bash
   npm run dev
   ```

The backend API will be available at `http://localhost:5000`

### 4. Frontend Setup

Open a new terminal and install dependencies:

```bash
cd ..  # Return to project root
npm install
```

Start the frontend development server:

```bash
npm run dev
```

The frontend will be available at `http://localhost:5173`

## OCR Receipt Scanning Feature

The application includes automatic OCR text extraction from uploaded receipts using Tesseract.js.

### How it Works

1. Users upload a receipt image (JPEG, PNG, or PDF) when submitting expenses
2. The backend processes the image using Tesseract.js OCR
3. Extracted text is stored in the database with the expense
4. OCR text can be used for searching and verification

### Supported Formats
- JPEG/JPG
- PNG
- PDF

### File Size Limit
- Maximum 5MB per file (configurable via MAX_FILE_SIZE)

## Role-Based Permissions

### Admin
- Full system access
- User management
- All event and expense operations
- System settings configuration

### Coordinator
- Create and manage events
- View all expenses for their events
- Assign participants to events

### Salesperson
- Submit expenses for assigned events
- View their own expenses
- Upload receipts

### Accountant
- View all expenses
- Approve/reject expenses
- Assign Zoho entities
- Approve/reject reimbursements
- Access financial reports

## API Endpoints

### Authentication
- POST /api/auth/login - User login
- POST /api/auth/register - User registration

### Users
- GET /api/users - Get all users
- GET /api/users/:id - Get user by ID
- POST /api/users - Create user (admin only)
- PUT /api/users/:id - Update user (admin only)
- DELETE /api/users/:id - Delete user (admin only)

### Events
- GET /api/events - Get all events
- GET /api/events/:id - Get event by ID
- POST /api/events - Create event
- PUT /api/events/:id - Update event
- DELETE /api/events/:id - Delete event

### Expenses
- GET /api/expenses - Get all expenses
- GET /api/expenses/:id - Get expense by ID
- POST /api/expenses - Create expense with receipt upload
- PUT /api/expenses/:id - Update expense
- PATCH /api/expenses/:id/review - Approve/reject expense
- PATCH /api/expenses/:id/entity - Assign Zoho entity
- PATCH /api/expenses/:id/reimbursement - Approve/reject reimbursement
- DELETE /api/expenses/:id - Delete expense

### Settings
- GET /api/settings - Get application settings
- PUT /api/settings - Update settings (admin only)

## Environment Variables

### Core Configuration

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| PORT | Server port | 5000 | Yes |
| NODE_ENV | Environment | development | Yes |
| DB_HOST | PostgreSQL host | localhost | Yes |
| DB_PORT | PostgreSQL port | 5432 | Yes |
| DB_NAME | Database name | expense_app | Yes |
| DB_USER | Database user | postgres | Yes |
| DB_PASSWORD | Database password | - | Yes |
| JWT_SECRET | JWT secret key | - | Yes |
| UPLOAD_DIR | Upload directory | uploads | Yes |
| MAX_FILE_SIZE | Max file size (bytes) | 5242880 | Yes |

### Zoho Books Integration (Optional)

| Variable | Description | Required |
|----------|-------------|----------|
| ZOHO_CLIENT_ID | Zoho OAuth Client ID | Yes (if using Zoho) |
| ZOHO_CLIENT_SECRET | Zoho OAuth Client Secret | Yes (if using Zoho) |
| ZOHO_REFRESH_TOKEN | Zoho OAuth Refresh Token | Yes (if using Zoho) |
| ZOHO_ORGANIZATION_ID | Zoho Books Organization ID | Yes (if using Zoho) |
| ZOHO_EXPENSE_ACCOUNT_NAME | Expense account name in Chart of Accounts | Yes (if using Zoho) |
| ZOHO_PAID_THROUGH_ACCOUNT | Bank/Cash account for expense payments | Yes (if using Zoho) |
| ZOHO_API_BASE_URL | Zoho Books API base URL | https://www.zohoapis.com/books/v3 |
| ZOHO_ACCOUNTS_BASE_URL | Zoho Accounts OAuth URL | https://accounts.zoho.com/oauth/v2 |

**Note:** Zoho Books variables are optional. If not configured, the app will function normally without Zoho integration.

## Troubleshooting

### Database Connection Issues
- Verify PostgreSQL is running: `pg_isready`
- Check .env credentials
- Ensure database exists: `psql -l | grep expense_app`

### OCR Not Working
- Check file format is valid (JPEG, PNG, PDF)
- Ensure Tesseract.js dependencies are installed
- Check server logs for errors

### Port Already in Use
- Change PORT in backend .env
- Change Vite port in vite.config.ts

## Production Deployment

For production:
1. Set NODE_ENV=production
2. Use strong JWT_SECRET
3. Configure production PostgreSQL
4. Enable HTTPS/SSL
5. Set up proper CORS policies
6. Configure automated database backups

## License

Proprietary software.
