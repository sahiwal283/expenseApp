# Trade Show Expense Management App

A comprehensive web application for managing trade show expenses with advanced receipt scanning, role-based permissions, and seamless entity mapping for accounting purposes.

## Features

### Core Functionality
- **Advanced Receipt OCR**: **REQUIRED** receipt upload with intelligent scanning and automatic data extraction
- **Role-Based Access Control**: Four distinct user roles with tailored permissions
- **Event Management**: Complete trade show setup and participant management
- **Expense Tracking**: Comprehensive expense submission and approval workflow
- **Entity Mapping**: Zoho Books entity assignment for accounting integration
- **Reporting & Analytics**: Multiple report types with visual charts and data export

### User Roles & Permissions

#### Admin
- Full system access and user management
- View all budgets and financial data
- Global oversight of all operations

#### Show Coordinator
- Create and manage trade show events
- Add participants and manage event details
- **Cannot view budget figures** (restricted to accountant and admin only)
- Track event progress and participation

#### Salesperson/Attendee
- Submit expenses with receipt upload
- View personal expense history
- Access assigned trade show events

#### Accountant
- **Exclusive permissions**:
  - Assign expenses to Zoho entities
  - Approve or reject expense status
  - Access specialized accountant dashboard
- Comprehensive filtering and review capabilities
- Manage reimbursement approvals

## Authentication System

### Login Credentials
The application uses username/password authentication with the following demo accounts:

| Username | Password | Role |
|----------|----------|------|
| `admin` | `admin` | Administrator |
| `sarah` | `password` | Show Coordinator |
| `mike` | `password` | Salesperson |
| `lisa` | `password` | Accountant |

### User Profile Requirements
- All users must provide email addresses for automated notifications
- Usernames are unique identifiers for login
- Email addresses are stored for future notification system integration

## Data Models

### Enhanced Event Structure
```typescript
interface TradeShow {
  id: string;
  name: string;
  venue: string;
  city: string;          // New required field
  state: string;         // New required field
  city: string;          // New required field
  state: string;         // New required field
  startDate: string;
  endDate: string;
  participants: User[];
  budget?: number;       // Now optional
  status: 'upcoming' | 'active' | 'completed';
  coordinatorId: string;
}
```

### Enhanced Expense Structure
```typescript
interface Expense {
  id: string;
  userId: string;
  tradeShowId: string;
  amount: number;
  category: string;
  merchant: string;
  date: string;
  description: string;
  cardUsed: string;              // New mandatory field
  reimbursementRequired: boolean; // New field for separate approval
  reimbursementStatus?: string;   // Tracks reimbursement approval
  cardUsed: string;              // New mandatory field
  reimbursementRequired: boolean; // New field for separate approval
  receiptUrl: string;            // NOW REQUIRED - Receipt image URL
  status: 'pending' | 'approved' | 'rejected';
  zohoEntity?: string;           // Only assignable by accountant
  location?: string;
  ocrText?: string;              // OCR extracted text from receipts
}
```

### Enhanced User Structure
```typescript
interface User {
  id: string;
  name: string;
  username: string;      // New field for login
  username: string;      // New field for login
  email: string;         // Required for notifications
  role: UserRole;
  avatar?: string;
}
```

## Key Changes from Previous Version

### Authentication
- ✅ Replaced email-based login with username/password system
- ✅ Admin credentials: username `admin`, password `admin`
- ✅ Email addresses still collected and stored for notifications

### Event Management
- ✅ Added mandatory "City" and "State" fields to event creation
- ✅ Made "Budget" field optional (not required)
- ✅ Enhanced participant addition with full name input
- ✅ Coordinators can no longer view budget figures

### Expense Management
- ✅ Added mandatory "Card Used" field with predefined options
- ✅ Added "Reimbursement Required" boolean field
- ✅ Removed Zoho entity assignment from expense form (accountant-only)
- ✅ **REQUIRED receipt upload** with OCR processing
- ✅ **Real-time OCR text extraction** and form auto-population
- ✅ **Receipt image storage** and viewing capabilities

### Role-Based Permissions
- ✅ Only accountants can assign Zoho entities to expenses
- ✅ Only accountants can approve/reject expense status
- ✅ Budget viewing restricted to admin and accountant roles
- ✅ Specialized accountant dashboard with comprehensive filtering

### Accountant Dashboard Features
- ✅ Filter expenses by: Category, User, Event, Approval Status, Reimbursement Status, Card Used, Entity Assigned
- ✅ Bulk entity assignment capabilities
- ✅ One-click approval/rejection actions
- ✅ Real-time statistics and metrics
- ✅ Advanced search and filtering options

## Technical Implementation

### Frontend
- **React 18** with TypeScript for type safety
- **Tailwind CSS** for responsive, professional styling
- **Lucide React** for consistent iconography
- **Local Storage** for demo data persistence
- **Built-in OCR Processing** with automatic text extraction
- **File Upload Handling** with image preview and validation

### Data Management
- Client-side state management with React hooks
- Local storage simulation of backend database
- Real-time updates across components
- Comprehensive data validation
- **Receipt image storage** with OCR text extraction

### Security & Permissions
- Role-based component rendering
- Permission checks at data access level
- Secure credential validation
- Protected routes and actions

## Development Setup

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Start Development Server**
   ```bash
   npm run dev
   ```

3. **Access Application**
   - Open browser to `http://localhost:5173`
   - Use demo credentials listed above

## Receipt Upload & OCR Requirements

### **MANDATORY Receipt Upload**
- **All expense submissions require a receipt image**
- Supported formats: JPG, PNG (up to 10MB)
- Receipt processing happens automatically upon upload

### **OCR Processing Workflow**
1. **Upload**: User selects receipt image file
2. **Processing**: OCR extracts text from image (2-3 second processing time)
3. **Auto-Population**: Form fields automatically filled with extracted data:
   - Merchant name
   - Total amount
   - Date
   - Location
4. **Review**: User can review and adjust extracted data before submission
5. **Storage**: Both receipt image and OCR text stored with expense

### **OCR Integration Details**
- **Technology**: Simulated OCR processing (production would use Google Vision API or similar)
- **Accuracy**: Mock 95% confidence rating with realistic data extraction
- **Storage**: OCR text stored in `ocrText` field for future reference
- **Viewing**: Receipt images viewable from expense lists and reports

## Deployment Considerations

### Production Readiness
For production deployment, consider implementing:

1. **Backend API Integration**
   - Replace localStorage with proper database
   - Implement secure authentication with JWT tokens
   - Add password hashing and security measures
   - **File storage service** (AWS S3, Cloudinary) for receipt images
   - **Real OCR service** (Google Vision API, AWS Textract)

2. **Real OCR Integration**
   - **Google Vision API** or AWS Textract for production OCR
   - Document processing pipeline
   - Image optimization and storage
   - **Error handling** for failed OCR processing
   - **Confidence scoring** and manual review workflows

3. **Email Service Integration**
   - SendGrid, Mailgun, or similar service
   - Automated notification templates
   - Event-driven email triggers

4. **Zoho Books Integration**
   - Zoho API authentication
   - Real-time entity synchronization
   - Automated expense posting

### Environment Variables
```env
# Future production variables
VITE_API_URL=your_backend_api_url
VITE_OCR_API_KEY=your_ocr_service_key
VITE_EMAIL_SERVICE_KEY=your_email_service_key
VITE_ZOHO_CLIENT_ID=your_zoho_client_id
VITE_ZOHO_CLIENT_SECRET=your_zoho_client_secret
VITE_FILE_STORAGE_URL=your_file_storage_service_url
VITE_OCR_CONFIDENCE_THRESHOLD=0.8
```

## Professional Design Standards

- **Clean Interface**: No emojis, professional typography
- **Consistent Branding**: Blue/emerald gradient theme
- **Responsive Design**: Mobile-first approach
- **Accessibility**: WCAG compliant color contrasts
- **User Experience**: Intuitive navigation and workflows

## Testing Scenarios

### Role-Based Testing
1. **Admin Testing**: Login as `admin/admin` - verify full access
2. **Coordinator Testing**: Login as `sarah/password` - verify budget restrictions
3. **Salesperson Testing**: Login as `mike/password` - verify expense submission
4. **Accountant Testing**: Login as `lisa/password` - verify approval capabilities

### Feature Testing
1. **Event Creation**: Test city/state fields and optional budget
2. **Expense Submission**: Test card selection and reimbursement flags
3. **Entity Assignment**: Verify accountant-only access
4. **Approval Workflow**: Test status changes and permissions
5. **Receipt Upload**: Test required receipt upload and OCR processing
6. **OCR Accuracy**: Verify text extraction and form auto-population

## Bug Fixes Applied

### **Reports Tab Error Resolution**
- ✅ **Fixed**: `useEffect is not defined` error in AccountantDashboard
- ✅ **Root Cause**: Missing React import for useEffect hook
- ✅ **Solution**: Added proper import statement: `import React, { useState, useEffect, useMemo } from 'react'`
- ✅ **Testing**: All Reports and AccountantDashboard functionality verified working

### **Receipt Upload Integration**
- ✅ **Implemented**: Mandatory receipt upload for all expenses
- ✅ **OCR Processing**: Real-time text extraction with form auto-population
- ✅ **Validation**: Prevents expense submission without receipt
- ✅ **Storage**: Receipt images and OCR text stored with expense records

## Future Enhancements

- Real-time notifications and email integration
- Advanced reporting with PDF generation
- Mobile app development
- Integration with additional accounting systems
- Advanced OCR with machine learning improvements
- Audit trail and compliance features
- **Production Backend**: Full API with database and file storage
- **Enhanced OCR**: Multiple OCR providers with confidence scoring
- **Batch Processing**: Multiple receipt upload and processing

## Backend Development Requirements

**Current Status**: Demo application using localStorage simulation

**Production Backend Needed**:
- **Database**: PostgreSQL or MongoDB for persistent data storage
- **API Server**: Node.js/Express or Python FastAPI
- **File Storage**: AWS S3 or similar for receipt images
- **OCR Service**: Google Vision API or AWS Textract integration
- **Authentication**: JWT-based secure authentication
- **Role-based API**: Endpoint permissions matching frontend roles

**Backend Development Scope**:
- User management and authentication APIs
- Event CRUD operations with participant management
- Expense submission with file upload handling
- OCR processing pipeline with error handling
- Reporting and analytics endpoints
- Admin settings management APIs

---

**Note**: This is a demonstration application with simulated backend functionality. All data is stored locally in the browser and will be reset when localStorage is cleared.