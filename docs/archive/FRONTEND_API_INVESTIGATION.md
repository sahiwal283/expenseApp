# Frontend API Calls and Error Handling Investigation

**Date:** January 2025  
**Agent:** Frontend Agent  
**Priority:** CRITICAL

## Issues Identified

### 1. Network Error Handling Gap

**Problem:** "Failed to fetch" errors are not properly caught and displayed to users.

**Root Cause:**
- `parseApiError()` in `errorHandler.ts` checks for `error.response`, but fetch network errors don't have a `response` property
- Network errors (CORS, connection refused, DNS failure) throw plain `Error` objects with message "Failed to fetch"
- These errors are not being converted to user-friendly messages

**Location:**
- `src/utils/errorHandler.ts` - `parseApiError()` function
- `src/utils/apiClient.ts` - `fetchWithTimeout()` and `request()` methods

**Impact:**
- Users see generic "Invalid username or password" instead of network error messages
- No indication when API server is unreachable
- Poor debugging experience

### 2. Login Error Handling

**Problem:** Login errors are silently caught and return `false` without user feedback.

**Root Cause:**
- `useAuth.ts` login function has a catch block that just returns `false`
- No distinction between authentication failures and network errors
- `LoginForm.tsx` shows generic "Invalid username or password" for all errors

**Location:**
- `src/hooks/useAuth.ts` - `login()` function
- `src/components/auth/LoginForm.tsx` - `handleSubmit()` function

**Impact:**
- Users can't tell if login failed due to wrong credentials or network issues
- No actionable error messages

### 3. API Base URL Configuration

**Problem:** Potential misconfiguration between sandbox and production.

**Current Implementation:**
- `apiClient.ts` uses: `import.meta.env.VITE_API_BASE_URL || '/api'`
- Falls back to relative `/api` if env var not set
- No validation or logging of actual URL being used

**Potential Issues:**
- Build-time environment variable might not match runtime environment
- No way to verify which API URL is actually being used
- Could be calling wrong API endpoint (sandbox vs production)

**Location:**
- `src/utils/apiClient.ts` - constructor
- Build configuration files

### 4. Browser Compatibility

**Problem:** Fetch API behavior may differ across browsers.

**Known Issues:**
- CORS errors handled differently
- Network timeout behavior varies
- Error messages differ (Chrome vs Firefox vs Safari)

**Location:**
- `src/utils/apiClient.ts` - `fetchWithTimeout()` method

## Fixes Implemented

### Fix 1: Enhanced Network Error Detection

**File:** `src/utils/errorHandler.ts`

**Changes:**
- Updated `parseApiError()` to detect network errors before checking `error.response`
- Check for `error.message` containing "Failed to fetch" or "NetworkError"
- Check for `error.name === 'TypeError'` (common for network errors)
- Return user-friendly network error message

### Fix 2: Improved Login Error Handling

**File:** `src/hooks/useAuth.ts`

**Changes:**
- Enhanced `login()` function to distinguish between network and auth errors
- Throw errors instead of silently returning `false`
- Let calling component handle error display

**File:** `src/components/auth/LoginForm.tsx`

**Changes:**
- Enhanced `handleSubmit()` to catch and display specific error messages
- Show network errors vs authentication errors differently
- Use `parseApiError()` for user-friendly messages

### Fix 3: API Client Network Error Handling

**File:** `src/utils/apiClient.ts`

**Changes:**
- Enhanced `fetchWithTimeout()` to catch network errors
- Wrap fetch errors in `AppError` with appropriate codes
- Add logging for debugging network issues
- Distinguish between timeout, network, and other errors

### Fix 4: API Base URL Logging

**File:** `src/utils/apiClient.ts`

**Changes:**
- Add console logging of base URL on initialization (dev mode only)
- Add `getBaseURL()` method for debugging
- Log actual URL being called in request method (dev mode)

## Testing Recommendations

1. **Network Error Testing:**
   - Disconnect network and attempt login
   - Verify user sees "Network error" message, not "Invalid credentials"
   - Test with API server stopped

2. **Browser Compatibility:**
   - Test login in Chrome, Firefox, Safari, Edge
   - Verify error messages are consistent
   - Check CORS error handling

3. **Environment Testing:**
   - Verify sandbox uses correct API URL
   - Verify production uses correct API URL
   - Check build output for embedded URLs

4. **Error Message Testing:**
   - Verify all error types show user-friendly messages
   - Check that technical details are logged but not shown to users

## Browser-Specific Considerations

### Chrome
- Network errors: "Failed to fetch"
- CORS errors: Clear error messages
- Timeout: AbortError

### Firefox
- Network errors: "NetworkError when attempting to fetch resource"
- CORS errors: Similar to Chrome
- Timeout: AbortError

### Safari
- Network errors: "Failed to fetch" or "Load failed"
- CORS errors: May be less descriptive
- Timeout: AbortError

### Edge
- Similar to Chrome (Chromium-based)

## Environment-Specific Issues

### Sandbox
- API URL: `http://192.168.1.144/api` or `/api` (relative)
- Must not use production URL
- CORS may be more permissive

### Production
- API URL: `/api` (relative) or `https://expapp.duckdns.org/api`
- HTTPS required
- CORS more restrictive

## Next Steps

1. ✅ Fix network error detection in `errorHandler.ts`
2. ✅ Improve login error handling in `useAuth.ts` and `LoginForm.tsx`
3. ✅ Enhance API client error handling
4. ✅ Add API URL logging for debugging
5. ⏳ Test fixes in all browsers
6. ⏳ Verify environment-specific configurations
7. ⏳ Coordinate with Backend Agent for CORS issues
8. ⏳ Coordinate with DevOps Agent for environment configuration

## Coordination Notes

**For Backend Agent:**
- Check CORS configuration for different browsers
- Verify error response format is consistent
- Check if network errors are being logged server-side

**For DevOps Agent:**
- Verify environment variables are set correctly
- Check build process for environment-specific URLs
- Verify Nginx proxy configuration for `/api` routes

