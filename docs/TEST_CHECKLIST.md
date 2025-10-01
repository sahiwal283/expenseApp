# Testing Checklist

Use this checklist to verify all features are working correctly.

## Prerequisites
- [ ] PostgreSQL is installed and running
- [ ] Node.js v18+ is installed
- [ ] Both frontend and backend are running

## Startup Test
- [ ] Run `./start.sh` (macOS/Linux) or `start.bat` (Windows)
- [ ] Frontend loads at http://localhost:5173
- [ ] Backend responds at http://localhost:5000/health
- [ ] Version number visible in header (v1.0.0)

## Authentication Tests

### Login
- [ ] Admin login works (admin / password123)
- [ ] Coordinator login works (sarah / password123)
- [ ] Salesperson login works (mike / password123)
- [ ] Accountant login works (lisa / password123)
- [ ] Invalid credentials show error
- [ ] Logout works correctly

## Admin Role Tests
- [ ] Can access User Management
- [ ] Can create new users
- [ ] Can edit existing users
- [ ] Can delete users
- [ ] Can access Admin Settings
- [ ] Can modify card options
- [ ] Can modify entity options
- [ ] Can view all budgets
- [ ] Can create events
- [ ] Can view all expenses
- [ ] Can approve/reject expenses

## Coordinator Role Tests
- [ ] Can access Event Management
- [ ] Can create new events with all fields (city, state)
- [ ] Budget field is optional
- [ ] Can add participants from existing users
- [ ] Can add new participants with name and email
- [ ] Can edit events
- [ ] Can delete events
- [ ] Cannot see budget amounts (hidden)
- [ ] Can view event dashboard

## Salesperson Role Tests
- [ ] Can access Expense Submission
- [ ] Can create new expense
- [ ] Must select event from dropdown
- [ ] Must select category
- [ ] Must select card used
- [ ] Can toggle reimbursement required
- [ ] Receipt upload works (JPEG, PNG)
- [ ] OCR text extraction happens automatically
- [ ] Can view personal expense history
- [ ] Cannot access admin features
- [ ] Cannot approve expenses

## Accountant Role Tests
- [ ] Can access Accountant Dashboard
- [ ] Can view all expenses across all events
- [ ] Filter by category works
- [ ] Filter by user works
- [ ] Filter by event works
- [ ] Filter by status works
- [ ] Filter by reimbursement works
- [ ] Filter by card used works
- [ ] Filter by entity works
- [ ] Search functionality works
- [ ] Can approve expenses
- [ ] Can reject expenses
- [ ] Can assign Zoho entities
- [ ] Can approve reimbursements
- [ ] Can reject reimbursements
- [ ] Statistics display correctly
- [ ] Cannot access user management (admin only)

## Event Management Tests
- [ ] Events list displays correctly
- [ ] Event creation form validates required fields
- [ ] City field is required
- [ ] State field is required
- [ ] Budget field is optional
- [ ] Start date must be valid
- [ ] End date must be after start date
- [ ] Participants can be added
- [ ] Participants display in event card
- [ ] Event edit loads existing data
- [ ] Event delete works with confirmation
- [ ] Event status updates correctly

## Expense Management Tests
- [ ] Expense submission form validates
- [ ] Event selection dropdown populates
- [ ] Category dropdown works
- [ ] Card used dropdown populates from settings
- [ ] Amount accepts decimal values
- [ ] Date picker works
- [ ] Description text area works
- [ ] Location field optional
- [ ] Reimbursement checkbox works
- [ ] Form submits successfully
- [ ] Success message displays

## Receipt Upload & OCR Tests
- [ ] File upload button visible
- [ ] JPEG upload works
- [ ] PNG upload works
- [ ] PDF upload works (if supported)
- [ ] File size limit enforced (5MB)
- [ ] Invalid file types rejected
- [ ] OCR processing starts automatically
- [ ] Processing indicator shows
- [ ] OCR text extracted and stored
- [ ] Receipt image viewable after upload
- [ ] Receipt thumbnail displays in expense list

## Approval Workflow Tests
- [ ] Pending expenses show in accountant dashboard
- [ ] Approve button works for accountant
- [ ] Reject button works for accountant
- [ ] Status updates in real-time
- [ ] Approved expenses show green badge
- [ ] Rejected expenses show red badge
- [ ] Only accountant/admin can approve
- [ ] Salesperson cannot approve own expenses

## Reimbursement Tests
- [ ] Reimbursement required flag visible
- [ ] Accountant can see reimbursement status
- [ ] Accountant can approve reimbursement
- [ ] Accountant can reject reimbursement
- [ ] Reimbursement status badge displays
- [ ] Filter by reimbursement status works

## Zoho Entity Tests
- [ ] Entity dropdown populates from settings
- [ ] Only accountant can assign entities
- [ ] Entity assignment saves correctly
- [ ] Unassigned expenses show in filters
- [ ] Entity displays in expense table
- [ ] Entity filter works correctly

## Reports Tests
- [ ] Reports page loads
- [ ] Expense chart displays data
- [ ] Budget overview shows correctly
- [ ] Entity breakdown displays
- [ ] Detailed report generates
- [ ] Export functionality works (if implemented)
- [ ] Date range filter works
- [ ] Event filter works

## UI/UX Tests
- [ ] Version number displays in header
- [ ] Responsive design works on mobile
- [ ] Sidebar collapse/expand works
- [ ] Navigation between pages smooth
- [ ] Loading states display
- [ ] Error messages clear and helpful
- [ ] Success messages display
- [ ] Form validation messages clear
- [ ] Icons load correctly
- [ ] Gradients and colors consistent
- [ ] No console errors

## API Tests

### Health Check
```bash
curl http://localhost:5000/health
```
- [ ] Returns {"status":"ok"}

### Authentication
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"password123"}'
```
- [ ] Returns token and user object

### Get Users (with token)
```bash
curl http://localhost:5000/api/users \
  -H "Authorization: Bearer YOUR_TOKEN"
```
- [ ] Returns array of users

### Get Events
```bash
curl http://localhost:5000/api/events \
  -H "Authorization: Bearer YOUR_TOKEN"
```
- [ ] Returns array of events with participants

### Get Expenses
```bash
curl http://localhost:5000/api/expenses \
  -H "Authorization: Bearer YOUR_TOKEN"
```
- [ ] Returns array of expenses

### File Upload
```bash
curl -X POST http://localhost:5000/api/expenses \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "event_id=EVENT_ID" \
  -F "category=Meals" \
  -F "merchant=Test Restaurant" \
  -F "amount=50.00" \
  -F "date=2025-01-15" \
  -F "receipt=@path/to/image.jpg"
```
- [ ] Receipt uploads successfully
- [ ] OCR text extracted
- [ ] Expense created with receipt URL

## Database Tests
- [ ] Database tables created correctly
- [ ] Migrations run without errors
- [ ] Seed data loads correctly
- [ ] Foreign keys enforce relationships
- [ ] Indexes created for performance
- [ ] Demo users exist in database
- [ ] Settings table populated

## Security Tests
- [ ] Passwords are hashed (not plain text)
- [ ] JWT tokens expire correctly
- [ ] Unauthorized requests rejected
- [ ] Role-based access enforced
- [ ] File upload validates file types
- [ ] SQL injection prevented (parameterized queries)
- [ ] XSS protection in place

## Performance Tests
- [ ] Page loads in < 2 seconds
- [ ] API responses in < 500ms
- [ ] OCR processing in < 5 seconds
- [ ] Large expense lists paginate/scroll well
- [ ] Image uploads handle 5MB files
- [ ] Multiple concurrent users supported

## Edge Cases
- [ ] Empty states display correctly
- [ ] No events message shows
- [ ] No expenses message shows
- [ ] Network error handling
- [ ] Database connection error handling
- [ ] Invalid token handling
- [ ] Expired token handling
- [ ] Missing required fields
- [ ] Invalid date ranges
- [ ] Duplicate username prevention
- [ ] Duplicate email prevention

## Browser Compatibility
- [ ] Chrome/Edge works
- [ ] Firefox works
- [ ] Safari works
- [ ] Mobile browser works

## Final Checks
- [ ] All console errors resolved
- [ ] All TypeScript errors resolved
- [ ] No broken links
- [ ] Documentation accurate
- [ ] Demo credentials work
- [ ] Version number correct
- [ ] Git repository clean
- [ ] All files committed
- [ ] README accurate

## Notes
Record any issues found during testing:

---

## Test Results Summary

Date Tested: ________________

Tester: ________________

Total Tests: ________
Passed: ________
Failed: ________

Critical Issues:
- 

Minor Issues:
-

Notes:
-
