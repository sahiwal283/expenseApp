# 📋 User Guide: Booked Status Toggle Feature

**Version:** v1.27.15+  
**Feature:** Toggle booked/pending status for flights, hotels, and car rentals

---

## Overview

The Event Checklist system allows you to quickly mark items as "booked" or "pending" with a single click. This feature helps you track the completion status of travel arrangements and reservations at a glance.

---

## How to Use

### Toggling Booked Status

1. **Navigate to Event Checklist**
   - Go to the Events page
   - Select an event
   - Click on the "Checklist" tab

2. **Find the Item**
   - Scroll to the Flights, Hotels, or Car Rentals section
   - Locate the item you want to update

3. **Toggle Status**
   - **Unbooked Items**: Click the empty circle (○) icon to mark as booked ✓
   - **Booked Items**: Click the green checkmark (✓) icon to mark as unbooked ○

4. **Visual Feedback**
   - The status updates immediately
   - Green checkmark (✓) = Booked
   - Empty circle (○) = Pending/Unbooked

---

## Visual Indicators

### ✅ Booked Status
- **Icon**: Green checkmark circle (✓)
- **Meaning**: Travel arrangement has been confirmed/booked
- **Color**: Green (text-green-600)

### ⭕ Pending Status
- **Icon**: Empty gray circle (○)
- **Meaning**: Travel arrangement is pending confirmation
- **Color**: Gray (text-gray-400)

---

## Where It Applies

### ✈️ Flights
- Each attendee's flight booking can be toggled independently
- Toggle appears next to the attendee's name
- Updates the flight's booked status in the database

### 🏨 Hotels
- Each attendee's hotel reservation can be toggled independently
- Toggle appears next to the attendee's name
- Updates the hotel's booked status in the database

### 🚗 Car Rentals
- Group and individual rentals both support status toggling
- Toggle appears next to the rental provider name
- Updates the rental's booked status in the database

---

## Important Notes

### ✅ What Happens When You Toggle
- Status changes are **saved immediately** (no need to click "Save")
- The visual indicator updates right away
- Changes are persisted to the database automatically
- No confirmation dialog is shown (instant action)

### ⚠️ Requirements
- You must have **Admin**, **Coordinator**, or **Developer** role to toggle status
- The item must already exist in the checklist (cannot toggle before creating)
- You must have an active internet connection for changes to save

### 🔄 Sorting Behavior
- Unbooked items appear **first** (at the top)
- Booked items appear **last** (at the bottom)
- This helps you focus on items that still need attention

---

## Troubleshooting

### Status Won't Toggle
**Possible causes:**
1. You don't have permission (check your role)
2. The item hasn't been created yet (create it first)
3. Network connection issue (check internet connection)

**Solution:** Make sure you have the correct role and the item exists in the checklist.

### Status Changed But Reverted
**Possible causes:**
1. Network error during save
2. Browser refresh before save completed
3. Permission issue

**Solution:** Try toggling again. If it persists, check your browser console for errors.

### Visual Indicator Not Updating
**Possible causes:**
1. Browser cache issue
2. JavaScript error

**Solution:** Refresh the page (F5 or Cmd+R). The status should display correctly after reload.

---

## Keyboard Shortcuts

Currently, there are no keyboard shortcuts for toggling status. Use the mouse/touch to click the icon.

---

## Related Features

- **Edit Details**: Click "Save" button after editing to update all fields
- **Delete Item**: Use the trash icon to remove items
- **Receipt Upload**: Upload receipts for hotels and car rentals (auto-creates expenses)

---

## Support

If you encounter issues with the booked status toggle:
1. Check your browser console for errors (F12 → Console tab)
2. Verify your role has the necessary permissions
3. Contact your system administrator

---

**Last Updated:** November 5, 2025  
**Version:** v1.27.15


