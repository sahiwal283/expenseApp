# Trade Show Expense Management App

A professional web application for managing trade show events and expenses with role-based permissions, OCR receipt scanning, and expense approval workflows.

**Current Version: 0.5.1-alpha (Pre-release - Frontend Only)**

📝 See [CHANGELOG.md](CHANGELOG.md) for version history and release notes

## Quick Start - Frontend Testing

**Get started in 10 seconds:**

```bash
# macOS/Linux
./start-frontend.sh

# Windows
start-frontend.bat
```

Then open http://localhost:5173 and login with:
- Admin: `admin` / `admin`
- Coordinator: `sarah` / `password`
- Salesperson: `mike` / `password`
- Accountant: `lisa` / `password`

📖 See [FRONTEND_TESTING.md](FRONTEND_TESTING.md) for comprehensive testing guide
🔧 See [TROUBLESHOOTING.md](TROUBLESHOOTING.md) if you encounter any issues
⚙️ **Homebrew installed but not working?** Run `./setup-homebrew.sh` to fix PATH issues
🏗️ See [ARCHITECTURE.md](ARCHITECTURE.md) for complete system architecture and diagrams

**Note:** This pre-release focuses on frontend testing. Data is stored in browser localStorage. Backend integration coming in v1.0.0.

## Features

- Role-based access control (Admin, Coordinator, Salesperson, Accountant)
- Event/Trade show management with participant tracking
- Expense submission with receipt upload
- OCR text extraction from receipts using Tesseract.js
- Expense approval workflows
- Zoho entity assignment (placeholder for future integration)
- Reimbursement tracking and approval
- Comprehensive reporting and analytics
- RESTful API with JWT authentication

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

| Variable | Description | Default |
|----------|-------------|---------|
| PORT | Server port | 5000 |
| NODE_ENV | Environment | development |
| DB_HOST | PostgreSQL host | localhost |
| DB_PORT | PostgreSQL port | 5432 |
| DB_NAME | Database name | expense_app |
| DB_USER | Database user | postgres |
| DB_PASSWORD | Database password | - |
| JWT_SECRET | JWT secret key | - |
| UPLOAD_DIR | Upload directory | uploads |
| MAX_FILE_SIZE | Max file size (bytes) | 5242880 |

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
