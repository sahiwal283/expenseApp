# Manual Fix Instructions for Sandbox

## Issue: Blank Page After Login
**Root Cause:** Expense amounts are returned as strings instead of numbers, breaking `.toFixed()` calls in JavaScript.

---

## Option 1: Quick Fix (Recommended)

### Open a new terminal and run these commands:

```bash
# 1. Make scripts executable
cd /Users/sahilkhatri/Projects/Haute/expenseApp
chmod +x diagnose_and_fix_ssh.sh deploy_fix_to_sandbox.sh

# 2. Run diagnostics (this will also fix SSH issues)
./diagnose_and_fix_ssh.sh

# 3. If that completes successfully, deploy the fix
./deploy_fix_to_sandbox.sh
```

---

## Option 2: Direct Server Access (If SSH hangs)

### Step 1: Access Proxmox Web UI
1. Open browser: `https://192.168.1.190:8006`
2. Login to Proxmox
3. Find container `203 (expense-sandbox)`
4. Click "Console" button

### Step 2: Fix in the Container Console
Paste these commands into the console:

```bash
# Enter the container
cd /opt/expenseapp/backend/src/routes

# Backup original file
cp expenses.ts expenses.ts.backup

# Create the fixed version
cat > expenses.ts << 'EOFILE'
import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { query } from '../config/database';
import { authenticateToken, authorize, AuthRequest } from '../middleware/auth';
import Tesseract from 'tesseract.js';

const router = Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = process.env.UPLOAD_DIR || './uploads';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'receipt-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE || '5242880') // 5MB default
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error('Only images (JPEG, PNG) and PDFs are allowed'));
    }
  }
});

// OCR processing function
async function processOCR(filePath: string): Promise<string> {
  try {
    const result = await Tesseract.recognize(filePath, 'eng');
    return result.data.text;
  } catch (error) {
    console.error('OCR processing error:', error);
    return '';
  }
}

// Helper function to convert numeric strings to numbers
const normalizeExpense = (expense: any) => ({
  ...expense,
  amount: expense.amount ? parseFloat(expense.amount) : null,
});

router.use(authenticateToken);

// Get all expenses
router.get('/', async (req: AuthRequest, res) => {
  try {
    const { event_id, user_id, status } = req.query;
    
    let queryText = \`
      SELECT e.*, 
             u.name as user_name, 
             ev.name as event_name
      FROM expenses e
      LEFT JOIN users u ON e.user_id = u.id
      LEFT JOIN events ev ON e.event_id = ev.id
      WHERE 1=1
    \`;
    const queryParams: any[] = [];
    let paramCount = 1;

    if (event_id) {
      queryText += \` AND e.event_id = $\${paramCount}\`;
      queryParams.push(event_id);
      paramCount++;
    }

    if (user_id) {
      queryText += \` AND e.user_id = $\${paramCount}\`;
      queryParams.push(user_id);
      paramCount++;
    }

    if (status) {
      queryText += \` AND e.status = $\${paramCount}\`;
      queryParams.push(status);
      paramCount++;
    }

    queryText += ' ORDER BY e.submitted_at DESC';

    const result = await query(queryText, queryParams);
    res.json(result.rows.map(normalizeExpense));
  } catch (error) {
    console.error('Error fetching expenses:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get expense by ID
router.get('/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const result = await query(
      \`SELECT e.*, 
              u.name as user_name, 
              ev.name as event_name
       FROM expenses e
       LEFT JOIN users u ON e.user_id = u.id
       LEFT JOIN events ev ON e.event_id = ev.id
       WHERE e.id = $1\`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Expense not found' });
    }

    res.json(normalizeExpense(result.rows[0]));
  } catch (error) {
    console.error('Error fetching expense:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
EOFILE

# Rebuild backend
cd /opt/expenseapp/backend
npm run build

# Restart service
systemctl restart expenseapp-backend

# Check status
systemctl status expenseapp-backend --no-pager -n 5
```

### Step 3: Verify
1. Wait 5 seconds
2. Refresh browser at `http://192.168.1.150`
3. Login with `admin` / `sandbox123`
4. Should now work!

---

## Option 3: SSH Troubleshooting

If SSH commands hang, it's likely one of these issues:

### A. SSH Host Key Prompt
**Symptom:** First SSH connection hangs waiting for "yes/no" prompt

**Fix:**
```bash
ssh-keyscan -H 192.168.1.190 >> ~/.ssh/known_hosts
```

### B. SSH Password Prompt
**Symptom:** SSH hangs waiting for password input

**Fix:** Set up SSH keys
```bash
# Generate key if you don't have one
ssh-keygen -t ed25519 -f ~/.ssh/id_ed25519 -N ""

# Copy to server (you'll need to enter password once)
ssh-copy-id root@192.168.1.190
```

### C. SSH Agent Issues
**Symptom:** Commands hang even with keys set up

**Fix:**
```bash
# Kill old agents
pkill -9 ssh-agent

# Start fresh
eval $(ssh-agent -s)
ssh-add ~/.ssh/id_ed25519
```

### D. Network/Firewall Issues
**Symptom:** Cannot reach server at all

**Fix:**
```bash
# Test basic connectivity
ping -c 3 192.168.1.190

# Test SSH port
nc -zv 192.168.1.190 22
```

---

## Quick Reference: What the Fix Does

The backend was returning expense `amount` as strings (e.g., `"100.50"`) but the frontend expects numbers to call `.toFixed(2)`.

**Before:**
```json
{
  "amount": "100.50"  // ❌ String - breaks .toFixed()
}
```

**After:**
```json
{
  "amount": 100.50  // ✅ Number - .toFixed() works
}
```

The fix adds a helper function that converts all amounts to numbers before sending to frontend.

---

## After Fixing

1. **Refresh browser:** Ctrl+Shift+R or Cmd+Shift+R
2. **Login:** Use any of these accounts (all password: `sandbox123`)
   - `admin` - Administrator
   - `lisa` - Accountant
   - `sarah` - Coordinator  
   - `mike` - Salesperson

3. **Test workflows:**
   - View expenses
   - Create new expense
   - Approve/deny expenses (as accountant)
   - Create events (as coordinator/admin)

---

## Still Having Issues?

1. Check backend logs:
```bash
ssh root@192.168.1.190 "pct exec 203 -- journalctl -u expenseapp-backend -n 50"
```

2. Check browser console (F12) for JavaScript errors

3. Verify backend is running:
```bash
curl http://192.168.1.150:5000/
```

Should return: `{"error":"Route not found"}`

---

## Contact
If none of these work, there may be a deeper infrastructure issue. Document what you tried and what the errors were.

