# Homebrew PATH Fix Guide

**Problem:** Homebrew installed but `brew` command not found

**Solution:** Use our automated setup helper!

---

## Quick Fix

If you see this error after installing Homebrew:
```bash
$ brew install node
-bash: brew: command not found
```

**Run our setup helper:**
```bash
./setup-homebrew.sh
```

This interactive script will:
1. ✅ Detect your shell (bash/zsh)
2. ✅ Add Homebrew to your PATH automatically
3. ✅ Offer to install Node.js for you
4. ✅ Set up everything with your permission

---

## What the Setup Helper Does

### **Step 1: Detection**
- Detects if Homebrew is installed
- Identifies your shell type (bash/zsh)
- Finds the correct configuration file

### **Step 2: PATH Configuration**
- Asks for your permission
- Adds Homebrew to your shell config
- Loads it in your current session

### **Step 3: Node.js Installation**
- Asks if you want to install Node.js
- Installs it automatically if you choose yes
- Verifies installation succeeded

---

## Usage

### **Interactive Mode (Recommended)**
```bash
./setup-homebrew.sh
```

The script will guide you through each step:
```
╔════════════════════════════════════════╗
║   Homebrew PATH Setup Helper           ║
╚════════════════════════════════════════╝

Detected shell: zsh
Shell configuration file: /Users/you/.zshrc

✓ Homebrew is installed
⚠ Homebrew is not in your PATH

Would you like to add Homebrew to your PATH now? (y/n)
> y

Adding Homebrew to /Users/you/.zshrc...
✓ Added to /Users/you/.zshrc

Loading Homebrew in current session...
✓ Homebrew is now available!

Homebrew 4.1.20

Would you like to install Node.js now? (y/n)
> y

Installing Node.js...
✓ Node.js installed successfully!
  Node.js: v18.17.0
  npm: 9.6.7

You can now run the frontend:
  ./start-frontend.sh
```

---

## What Gets Modified

### **Shell Configuration File**

The script adds these lines to your shell config:

**For zsh (`~/.zshrc`):**
```bash
# Homebrew
eval "$(/opt/homebrew/bin/brew shellenv)"
```

**For bash (`~/.bash_profile` or `~/.bashrc`):**
```bash
# Homebrew
eval "$(/usr/local/bin/brew shellenv)"
```

### **No Surprises**
- Script asks before making changes
- Shows you what it will do
- You can decline and do it manually

---

## Manual Alternative

If you prefer to do it manually:

### **1. Find Homebrew Location**
```bash
# Apple Silicon Mac
ls /opt/homebrew/bin/brew

# Intel Mac
ls /usr/local/bin/brew
```

### **2. Add to Shell Config**

**For zsh (default on newer Macs):**
```bash
echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> ~/.zshrc
source ~/.zshrc
```

**For bash:**
```bash
echo 'eval "$(/usr/local/bin/brew shellenv)"' >> ~/.bash_profile
source ~/.bash_profile
```

### **3. Verify Homebrew Works**
```bash
brew --version
```

### **4. Install Node.js**
```bash
brew install node
```

### **5. Verify Node.js**
```bash
node -v
npm -v
```

---

## Scenarios

### **Scenario 1: Homebrew Just Installed**

```bash
# You just installed Homebrew
$ brew install node
-bash: brew: command not found

# Use our helper
$ ./setup-homebrew.sh
# Follow the prompts

# Now brew works!
$ brew --version
Homebrew 4.1.20
```

### **Scenario 2: Homebrew Installed, Not in PATH**

```bash
# Check if Homebrew is installed
$ ls /opt/homebrew/bin/brew
/opt/homebrew/bin/brew

# But command not found
$ brew --version
-bash: brew: command not found

# Use our helper
$ ./setup-homebrew.sh
# It will fix the PATH and offer to install Node.js
```

### **Scenario 3: Already Working**

```bash
$ ./setup-homebrew.sh

✓ Homebrew is already in your PATH
Homebrew 4.1.20

Would you like to install Node.js now? (y/n)
> y

# Installs Node.js directly
```

---

## Troubleshooting

### **Script Not Executable**
```bash
chmod +x setup-homebrew.sh
./setup-homebrew.sh
```

### **Homebrew Still Not Found After Setup**

**Option 1: Reload your shell**
```bash
source ~/.zshrc    # for zsh
source ~/.bash_profile  # for bash
```

**Option 2: Close and reopen terminal**
- Completely quit Terminal
- Open new Terminal window
- Try: `brew --version`

### **Want to Check What Was Added**

View your shell config:
```bash
# For zsh
cat ~/.zshrc | grep -A 1 "Homebrew"

# For bash
cat ~/.bash_profile | grep -A 1 "Homebrew"
```

Should show:
```bash
# Homebrew
eval "$(/opt/homebrew/bin/brew shellenv)"
```

---

## Integration with start-frontend.sh

The main startup script now detects this situation:

```bash
$ ./start-frontend.sh

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Node.js Not Found
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚠ Homebrew is installed but not in your PATH

📥 Quick Fix - Use our setup helper:

Run this command:
  ./setup-homebrew.sh

This will:
  1. Add Homebrew to your PATH
  2. Install Node.js automatically
  3. Set up everything for you
```

---

## Safety Features

### **✅ Permission-Based**
- Script asks before making changes
- You can decline and do it manually
- Shows you exactly what it will do

### **✅ Non-Destructive**
- Only adds lines, doesn't remove anything
- Checks if already configured
- Won't duplicate entries

### **✅ Reversible**
- Easy to see what was added
- Can remove the lines manually if needed
- Shell configs are plain text files

---

## What Happens Behind the Scenes

### **1. Shell Detection**
```bash
CURRENT_SHELL=$(basename "$SHELL")
# Example output: bash or zsh
```

### **2. Config File Selection**
```bash
# For zsh:
SHELL_CONFIG="$HOME/.zshrc"

# For bash:
SHELL_CONFIG="$HOME/.bash_profile"
```

### **3. Homebrew Location**
```bash
# Check both possible locations
if [ -x "/opt/homebrew/bin/brew" ]; then
    BREW_PATH="/opt/homebrew/bin/brew"
else
    BREW_PATH="/usr/local/bin/brew"
fi
```

### **4. Add to Config**
```bash
echo "" >> "$SHELL_CONFIG"
echo "# Homebrew" >> "$SHELL_CONFIG"
echo 'eval "$('$BREW_PATH' shellenv)"' >> "$SHELL_CONFIG"
```

### **5. Load in Current Session**
```bash
eval "$($BREW_PATH shellenv)"
```

---

## Benefits

| Aspect | Manual Process | Using setup-homebrew.sh |
|--------|---------------|------------------------|
| Steps required | 5-7 steps | 1 command |
| Error-prone | Yes (copy-paste errors) | No (automated) |
| Shell detection | Manual | Automatic |
| Node.js install | Separate step | Offered automatically |
| Permission | N/A | Asks for confirmation |
| Verification | Manual | Automatic |

---

## After Setup

Once the helper completes:

1. **Homebrew is in your PATH**
   ```bash
   brew --version
   ```

2. **Node.js is installed** (if you chose yes)
   ```bash
   node -v
   npm -v
   ```

3. **Ready to run frontend**
   ```bash
   ./start-frontend.sh
   ```

---

## FAQ

**Q: Will this modify my system files?**
A: Only adds a few lines to your shell config file (~/.zshrc or ~/.bash_profile). You can see exactly what before confirming.

**Q: What if I already have Homebrew in PATH?**
A: The script detects this and skips the PATH setup, only offering to install Node.js.

**Q: Can I undo the changes?**
A: Yes, just edit your shell config file and remove the two lines under "# Homebrew".

**Q: What if I want to do it manually?**
A: The script provides manual instructions if you decline the automated setup.

**Q: Will this work on M1/M2 Macs?**
A: Yes, it detects both Intel (`/usr/local`) and Apple Silicon (`/opt/homebrew`) locations.

**Q: Do I need to run this every time?**
A: No, once Homebrew is in your PATH, it stays there. This is a one-time setup.

---

## Related Documentation

- **HOMEBREW_DETECTION.md** - How Homebrew detection works
- **ERROR_HANDLING_DEMO.md** - All error scenarios
- **TROUBLESHOOTING.md** - Common issues and solutions
- **FRONTEND_TESTING.md** - Frontend testing guide

---

**Version:** 0.5.0-alpha
**Status:** Ready to use
**Script:** `setup-homebrew.sh`
