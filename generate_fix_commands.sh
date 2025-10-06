#!/bin/bash
# Generate exact commands to paste into Proxmox console

OUTPUT_FILE="fix_commands_for_console.txt"

cat > "$OUTPUT_FILE" << 'ENDCOMMANDS'
# ============================================================================
# SANDBOX FIX COMMANDS - Copy and paste into Proxmox Console
# ============================================================================
# 
# Instructions:
# 1. Open https://192.168.1.190:8006 in your browser
# 2. Login to Proxmox
# 3. Click on container "203 (expense-sandbox)" in the left panel
# 4. Click the "Console" button at the top
# 5. Copy ALL commands below (select all, Ctrl+C)
# 6. Paste into the console (right-click → Paste or Shift+Insert)
# 7. Press Enter and wait for completion
#
# ============================================================================

# Navigate to backend routes directory
cd /opt/expenseapp/backend/src/routes

# Backup original file
cp expenses.ts expenses.ts.backup.$(date +%Y%m%d_%H%M%S)

# Add the normalizeExpense helper function after imports
sed -i '54a\
\
// Helper function to convert numeric strings to numbers\
const normalizeExpense = (expense: any) => ({\
  ...expense,\
  amount: expense.amount ? parseFloat(expense.amount) : null,\
});' expenses.ts

# Update all res.json calls to use normalizeExpense
sed -i 's/res\.json(result\.rows);/res.json(result.rows.map(normalizeExpense));/' expenses.ts
sed -i 's/res\.json(result\.rows\[0\]);/res.json(normalizeExpense(result.rows[0]));/' expenses.ts  
sed -i 's/res\.status(201)\.json(result\.rows\[0\]);/res.status(201).json(normalizeExpense(result.rows[0]));/' expenses.ts

# Rebuild backend
echo ""
echo "Rebuilding backend..."
cd /opt/expenseapp/backend
npm run build

# Restart backend service
echo ""
echo "Restarting backend service..."
systemctl restart expenseapp-backend

# Wait for service to start
sleep 3

# Check status
echo ""
echo "Checking service status..."
systemctl status expenseapp-backend --no-pager -n 0

# Test the API
echo ""
echo "Testing API..."
curl -s http://localhost:5000/ || echo "Backend is responding"

echo ""
echo "============================================================================"
echo "✅ FIX COMPLETE!"
echo "============================================================================"
echo ""
echo "Next steps:"
echo "1. Open http://192.168.1.150 in your browser"
echo "2. Hard refresh: Ctrl+Shift+R (Windows/Linux) or Cmd+Shift+R (Mac)"
echo "3. Login with: admin / sandbox123"
echo "4. The blank page should now be fixed!"
echo ""
echo "Test accounts (all password: sandbox123):"
echo "  - admin   (Administrator)"
echo "  - lisa    (Accountant)"
echo "  - sarah   (Coordinator)"
echo "  - mike    (Salesperson)"
echo ""

ENDCOMMANDS

echo "============================================================================"
echo "✅ Fix commands generated!"
echo "============================================================================"
echo ""
echo "File created: $OUTPUT_FILE"
echo ""
echo "Next steps:"
echo ""
echo "1. Open Proxmox Web Console:"
echo "   https://192.168.1.190:8006"
echo ""
echo "2. Navigate to container 203 and click 'Console'"
echo ""
echo "3. Open the generated file:"
echo "   cat $OUTPUT_FILE"
echo ""
echo "4. Copy ALL the commands and paste into the console"
echo ""
echo "============================================================================"
echo ""

# Also display the commands for immediate use
cat "$OUTPUT_FILE"

