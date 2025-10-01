# Frontend Testing Guide

**Version: 0.5.0-alpha (Pre-release)**

This guide focuses on testing the frontend React application independently, without requiring backend setup.

## Quick Start (Easiest Way)

### macOS / Linux
```bash
./start-frontend.sh
```

### Windows
```bash
start-frontend.bat
```

**That's it!** The app will open at http://localhost:5173

## What You're Testing

This is a **frontend-only pre-release** that uses localStorage for data persistence. You're testing:
- User interface and design
- Component functionality
- User interactions
- Form validations
- Navigation and routing
- Role-based UI elements

## Demo Login Credentials

| Role | Username | Password |
|------|----------|----------|
| Admin | admin | admin |
| Coordinator | sarah | password |
| Salesperson | mike | password |
| Accountant | lisa | password |

## Frontend Features to Test

### 1. Authentication & Navigation
- [x] Login form displays correctly
- [x] Login with each role works
- [x] Logout functionality
- [x] Sidebar navigation
- [x] Header displays user info
- [x] Version number visible (v0.5.0-alpha)

### 2. Dashboard Views

**Admin Dashboard:**
- [x] Stats cards display
- [x] Upcoming events section
- [x] Recent expenses section
- [x] Budget overview (if admin)

**Coordinator Dashboard:**
- [x] Event management visible
- [x] Can create events
- [x] Budget fields hidden (permission test)

**Salesperson Dashboard:**
- [x] Expense submission visible
- [x] Personal expenses list
- [x] Upload receipt button

**Accountant Dashboard:**
- [x] All expenses visible
- [x] Filter controls
- [x] Approval buttons
- [x] Entity assignment dropdown

### 3. Event Management

**Create Event:**
- [x] Form opens in modal
- [x] All fields present (name, venue, city, state, dates)
- [x] Budget field optional
- [x] Participant selection works
- [x] Add new participant works
- [x] Form validation works
- [x] Save creates event in localStorage
- [x] Event appears in list

**Edit Event:**
- [x] Edit button loads existing data
- [x] Changes save correctly
- [x] Updated event displays

**Delete Event:**
- [x] Delete removes event
- [x] List updates

### 4. Expense Submission

**Form Fields:**
- [x] Event dropdown populates
- [x] Category selection works
- [x] Merchant input
- [x] Amount accepts decimals
- [x] Date picker works
- [x] Description textarea
- [x] Card selection dropdown
- [x] Reimbursement checkbox
- [x] Location input (optional)

**Receipt Upload:**
- [x] Upload button visible
- [x] File selection dialog opens
- [x] File preview shows (if implemented)
- [x] OCR simulation works
- [x] Form auto-populates from receipt data

**Submission:**
- [x] Validation prevents empty fields
- [x] Success message displays
- [x] Expense appears in list
- [x] Form resets after submission

### 5. Expense Review (Accountant)

**Filters:**
- [x] Category filter works
- [x] User filter works
- [x] Event filter works
- [x] Status filter works
- [x] Reimbursement filter works
- [x] Card filter works
- [x] Entity filter works
- [x] Search input works

**Actions:**
- [x] Approve button changes status
- [x] Reject button changes status
- [x] Entity dropdown assigns entity
- [x] Reimbursement approval works
- [x] Status badges update colors

### 6. Reports

**Charts & Visualizations:**
- [x] Expense chart renders
- [x] Data displays correctly
- [x] Budget overview shows
- [x] Entity breakdown displays

**Filters:**
- [x] Date range filter
- [x] Event filter
- [x] Category filter
- [x] Report data updates

### 7. User Management (Admin)

**User List:**
- [x] All users display
- [x] User cards show info
- [x] Role badges visible

**Create User:**
- [x] Form opens
- [x] All fields required
- [x] Role selection works
- [x] Save creates user
- [x] New user appears

**Edit User:**
- [x] Edit loads data
- [x] Changes save
- [x] Updated user displays

**Delete User:**
- [x] Delete removes user
- [x] List updates

### 8. Settings (Admin)

**Card Options:**
- [x] List displays
- [x] Add new card option
- [x] Remove card option
- [x] Changes persist in localStorage

**Entity Options:**
- [x] List displays
- [x] Add new entity
- [x] Remove entity
- [x] Changes persist

### 9. UI/UX Elements

**General:**
- [x] Colors consistent (blue/emerald gradient)
- [x] No emojis in UI (professional design)
- [x] Icons load correctly (Lucide React)
- [x] Responsive on different screen sizes
- [x] Sidebar collapse/expand
- [x] Mobile menu works

**Forms:**
- [x] Input fields styled consistently
- [x] Focus states visible
- [x] Error messages display
- [x] Success messages display
- [x] Loading states (if implemented)

**Tables:**
- [x] Data displays in tables
- [x] Columns aligned correctly
- [x] Badges styled correctly
- [x] Action buttons visible

**Modals:**
- [x] Open/close smoothly
- [x] Backdrop visible
- [x] Close on backdrop click
- [x] Close button works

### 10. Data Persistence (localStorage)

**Test Data Persistence:**
1. Create an event
2. Refresh page
3. [x] Event still exists

1. Submit an expense
2. Refresh page
3. [x] Expense still exists

1. Change settings
2. Refresh page
3. [x] Settings persist

1. Logout and login
2. [x] Data persists across sessions

**Clear Data:**
1. Open browser DevTools
2. Application > Local Storage
3. Clear all
4. Refresh
5. [x] Demo data reloads

## Testing Workflow

### Step 1: Start the Frontend
```bash
./start-frontend.sh
```

### Step 2: Test Each Role

**As Admin:**
1. Login as admin/admin
2. Test user management
3. Test settings
4. Create events
5. View all expenses

**As Coordinator:**
1. Login as sarah/password
2. Create events
3. Add participants
4. Verify budget fields hidden
5. View event expenses

**As Salesperson:**
1. Login as mike/password
2. Submit expenses
3. Upload receipts
4. View personal expenses
5. Verify cannot access admin features

**As Accountant:**
1. Login as lisa/password
2. Review all expenses
3. Test all filters
4. Approve/reject expenses
5. Assign entities
6. Approve reimbursements

### Step 3: Test Edge Cases

- Empty states (no events, no expenses)
- Form validation errors
- Invalid login attempts
- Navigation between pages
- Logout and re-login
- Browser back/forward buttons

### Step 4: Browser Testing

Test in multiple browsers:
- [x] Chrome
- [x] Firefox
- [x] Safari
- [x] Edge

### Step 5: Responsive Testing

Test on different screen sizes:
- [x] Desktop (1920x1080)
- [x] Laptop (1366x768)
- [x] Tablet (768px)
- [x] Mobile (375px)

## Known Limitations (Pre-release)

This is a frontend-only pre-release with the following limitations:

1. **No Real Backend**: Data stored in browser localStorage
2. **No OCR Processing**: Receipt OCR is simulated
3. **No Email Notifications**: Not implemented yet
4. **No File Storage**: Receipt files not actually uploaded
5. **No User Authentication**: Login simulated client-side
6. **Data Not Shared**: Each browser has separate data
7. **No Zoho Integration**: Placeholder only

## Troubleshooting

**For detailed troubleshooting, see [TROUBLESHOOTING.md](TROUBLESHOOTING.md)**

### npm: command not found

If you get this error, Node.js is not installed. See [TROUBLESHOOTING.md](TROUBLESHOOTING.md#npm-command-not-found) for installation instructions.

### Port Already in Use
If port 5173 is in use, edit `vite.config.ts`:
```typescript
export default defineConfig({
  server: {
    port: 3000  // or any other port
  }
})
```

### Dependencies Installation Failed
```bash
rm -rf node_modules package-lock.json
npm install
```

### Page Won't Load
1. Check console for errors (F12)
2. Clear browser cache
3. Hard refresh (Cmd+Shift+R or Ctrl+Shift+R)

### Data Not Persisting
1. Check browser localStorage is enabled
2. Open DevTools > Application > Local Storage
3. Verify data is being saved

### UI Not Displaying Correctly
1. Check Tailwind CSS is loading
2. Verify index.css is imported
3. Check for console errors

## Manual Testing Checklist

Print this checklist and check off as you test:

- [ ] Can login with all 4 roles
- [ ] Sidebar navigation works
- [ ] Version shows v0.5.0-alpha
- [ ] Can create events
- [ ] Can submit expenses
- [ ] Can upload receipt images
- [ ] Can approve expenses (accountant)
- [ ] Can assign entities (accountant)
- [ ] Can manage users (admin)
- [ ] Can modify settings (admin)
- [ ] All filters work
- [ ] Search functionality works
- [ ] Data persists after refresh
- [ ] Logout works correctly
- [ ] No console errors
- [ ] Responsive on mobile
- [ ] Works in multiple browsers

## Reporting Issues

When you find issues, note:
1. Which role you're logged in as
2. What action you were performing
3. Expected behavior
4. Actual behavior
5. Browser and version
6. Screenshot if applicable

## Next Steps After Frontend Testing

Once frontend testing is complete:
1. Document all UI/UX improvements needed
2. List any bugs found
3. Note missing features
4. Prepare for backend integration
5. Plan for full v1.0.0 release

## Development Commands

```bash
# Start frontend only
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run linter
npm run lint
```

## Data Structure

The app stores data in localStorage with these keys:
- `tradeshow_users` - User accounts
- `tradeshow_events` - Events/trade shows
- `tradeshow_expenses` - Expense records
- `app_settings` - Application settings

To inspect data:
1. Open DevTools (F12)
2. Application > Local Storage
3. Select your domain
4. View stored data

## Version Information

**Current Version**: 0.5.0-alpha
**Type**: Pre-release
**Focus**: Frontend UI/UX testing
**Backend**: Not included in this release

---

Happy Testing! 🎨
