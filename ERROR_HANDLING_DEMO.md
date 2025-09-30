# Error Handling Demonstration

## Enhanced Node.js Detection - v0.5.0-alpha

The startup scripts now provide **user-friendly, actionable error messages** with clear installation instructions.

---

## Scenario 1A: Node.js Not Installed (Homebrew Present)

### What You See:

```bash
$ ./start-frontend.sh

=========================================
Trade Show Expense App - Frontend Only
Version: 0.5.0-alpha (Pre-release)
=========================================

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Node.js Not Found
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Node.js is required to run this application.

📥 Install Node.js using Homebrew:

Run this command:
  brew install node

After installation:
  1. Close and reopen your terminal
  2. Run this script again: ./start-frontend.sh

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## Scenario 1B: Node.js Not Installed (No Homebrew)

### What You See:

```bash
$ ./start-frontend.sh

=========================================
Trade Show Expense App - Frontend Only
Version: 0.5.0-alpha (Pre-release)
=========================================

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Node.js Not Found
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Node.js is required to run this application.

📥 Installation Options for macOS:

OPTION 1: Install Homebrew first (Recommended)

Step 1 - Install Homebrew:
  /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

Step 2 - After Homebrew installs, install Node.js:
  brew install node

OPTION 2: Download Node.js directly
  1. Visit: https://nodejs.org/
  2. Download the LTS version (v18+)
  3. Run the installer

After installation:
  1. Close and reopen your terminal
  2. Run this script again: ./start-frontend.sh

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### What To Do:

**If you see Homebrew instructions (brew install node):**
- You have Homebrew! Just run the command shown
```bash
brew install node
```

**If you see "Install Homebrew first":**
- You don't have Homebrew, so install it first:
```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```
- Then install Node.js:
```bash
brew install node
```

**Alternatively (without Homebrew):**
1. Visit https://nodejs.org/
2. Download the LTS version (Long Term Support)
3. Run the installer
4. Restart your terminal
5. Try again: `./start-frontend.sh`

---

## Scenario 2: Node.js Version Too Old

### What You See:

```bash
$ ./start-frontend.sh

=========================================
Trade Show Expense App - Frontend Only
Version: 0.5.0-alpha (Pre-release)
=========================================

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Node.js Version Too Old
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Current version: v16.14.0
Required version: v18 or higher

📥 Upgrade Node.js (macOS):

# Using Homebrew:
  brew upgrade node

# Or download latest:
  Visit: https://nodejs.org/
  Download the LTS version (v18+)

After upgrading:
  1. Close and reopen your terminal
  2. Verify: node -v
  3. Run this script again: ./start-frontend.sh

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### What To Do:

**Option 1: Upgrade via Homebrew**
```bash
brew upgrade node
```

**Option 2: Download Latest Version**
1. Visit https://nodejs.org/
2. Download the latest LTS version (v18+)
3. Run the installer
4. Restart your terminal
5. Verify: `node -v` (should show v18.x.x or higher)
6. Try again: `./start-frontend.sh`

---

## Scenario 3: Everything Works Correctly

### What You See:

```bash
$ ./start-frontend.sh

=========================================
Trade Show Expense App - Frontend Only
Version: 0.5.0-alpha (Pre-release)
=========================================

✓ Node.js v18.17.0 detected (v18+ required)
✓ npm 9.6.7 detected

Starting frontend-only testing mode...

Installing frontend dependencies...
✓ Dependencies installed

=========================================
Frontend Ready for Testing!
=========================================

Note: This is frontend-only mode
Data is stored in browser localStorage

Opening at: http://localhost:5173

Demo Login Credentials:
  Admin:       admin / admin
  Coordinator: sarah / password
  Salesperson: mike / password
  Accountant:  lisa / password

Starting development server...
Press Ctrl+C to stop

  VITE v5.4.2  ready in 433 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
  ➜  press h + enter to show help
```

### What This Means:

✅ Node.js version is compatible (v18+)
✅ npm is installed and working
✅ Frontend dependencies installed successfully
✅ Development server started
✅ Ready to test at http://localhost:5173

---

## Windows Version

### Node.js Not Found (Windows):

```cmd
> start-frontend.bat

=========================================
Trade Show Expense App - Frontend Only
Version: 0.5.0-alpha (Pre-release)
=========================================

=========================================
   Node.js Not Found
=========================================

Node.js is required to run this application.

Quick Installation (Windows):

1. Visit: https://nodejs.org/
2. Download the LTS version (v18 or higher)
3. Run the installer
4. Check "Add to PATH" during installation
5. Restart this terminal
6. Run this script again

=========================================
Press any key to continue . . .
```

### Node.js Version Too Old (Windows):

```cmd
> start-frontend.bat

=========================================
   Node.js Version Too Old
=========================================

Current version: v16.14.0
Required version: v18 or higher

Upgrade Node.js:

1. Visit: https://nodejs.org/
2. Download the latest LTS version
3. Run the installer
4. Restart this terminal
5. Verify: node -v
6. Run this script again

=========================================
Press any key to continue . . .
```

---

## Key Features of Enhanced Error Handling

### ✅ Clear Visual Separation
- Error messages have clear borders
- Color-coded for easy reading (red for errors, green for success)
- Proper spacing and formatting

### ✅ Specific Problem Identification
- "Node.js Not Found" - Installation needed
- "Node.js Version Too Old" - Upgrade needed
- Shows exact versions (current vs required)

### ✅ Smart Homebrew Detection (macOS)
- **NEW:** Detects if Homebrew is installed
- If Homebrew present: Shows simple `brew install node` command
- If Homebrew missing: Shows how to install Homebrew first
- Prevents "brew: command not found" errors
- Guides users step-by-step

### ✅ Actionable Instructions
- Copy-paste ready commands
- Step-by-step installation guides
- Multiple installation options provided
- Platform-specific guidance
- No assumptions about installed tools

### ✅ Version Verification
- Checks for Node.js v18 or higher
- Displays detected versions
- Shows requirement clearly (v18+ required)

### ✅ No Script Crashes
- Graceful error handling
- Always exits with helpful messages
- No cryptic error codes
- Users know exactly what to do next

---

## Quick Reference

### Check Your Node.js Version:
```bash
node -v
```

**Expected:** v18.0.0 or higher
**If lower:** Follow upgrade instructions from script

### Check Your npm Version:
```bash
npm -v
```

**Expected:** 8.0.0 or higher
**Usually OK:** If Node.js is v18+, npm is compatible

### Quick Installation (macOS):
```bash
brew install node
```

### Quick Upgrade (macOS):
```bash
brew upgrade node
```

### Verify Installation:
```bash
node -v   # Should show v18+ 
npm -v    # Should show 8+
```

---

## Testing the Error Handling

### Test Scenario 1: Simulate Missing Node.js
```bash
# Temporarily rename node (for testing only)
sudo mv /usr/local/bin/node /usr/local/bin/node.bak

# Run script - should show "Node.js Not Found" error
./start-frontend.sh

# Restore node
sudo mv /usr/local/bin/node.bak /usr/local/bin/node
```

### Test Scenario 2: Check Version Detection
```bash
# Run script with valid Node.js
./start-frontend.sh

# Should show:
# ✓ Node.js vXX.XX.XX detected (v18+ required)
```

---

## Common Questions

**Q: I installed Node.js but still get "Not Found" error?**
A: Restart your terminal. The PATH needs to be refreshed.

**Q: How do I know which version to download?**
A: Always download the LTS (Long Term Support) version from nodejs.org

**Q: Can I use Node.js v16?**
A: No, the app requires v18 or higher. Please upgrade.

**Q: I have multiple Node.js versions installed?**
A: Use `nvm` (Node Version Manager) to switch between versions.

**Q: The script shows v18 detected but fails later?**
A: This might be a dependency issue. Try: `rm -rf node_modules && npm install`

---

## Success Indicators

When everything is working correctly, you should see:

1. ✅ **Version Check:** `✓ Node.js v18.x.x detected`
2. ✅ **npm Check:** `✓ npm 9.x.x detected`
3. ✅ **Dependencies:** `✓ Dependencies installed`
4. ✅ **Server Start:** `VITE v5.4.2 ready in XXX ms`
5. ✅ **URL:** `Local: http://localhost:5173/`

---

## Troubleshooting Resources

If you encounter any issues:

1. **TROUBLESHOOTING.md** - Comprehensive solutions guide
2. **NPM_FIX_SUMMARY.md** - Details about npm fixes
3. **FRONTEND_TESTING.md** - Testing guide and checklist
4. **This File** - Error handling examples

---

## Changes Summary

**What's New:**
- Node.js version checking (v18+ requirement)
- Enhanced error messages with visual formatting
- Step-by-step installation instructions
- Platform-specific guidance
- Copy-paste ready commands
- Graceful error handling

**What's Better:**
- No more cryptic errors
- Clear next steps for users
- Visual separation of errors
- Version verification shown
- Multiple installation options

**What Users Get:**
- Clear understanding of the problem
- Exact instructions to fix it
- No need to search for solutions
- Confidence in what to do next

---

**Version:** 0.5.0-alpha
**Last Updated:** September 30, 2025
**Status:** ✅ All changes committed and pushed to GitHub
