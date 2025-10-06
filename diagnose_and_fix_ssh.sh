#!/bin/bash
# Comprehensive SSH and Container Diagnostics and Fixes

set -e

echo "🔍 Starting System Diagnostics..."
echo "=================================="
echo ""

# Add SSH config to prevent hanging
mkdir -p ~/.ssh
cat >> ~/.ssh/config << 'EOF'

# Sandbox server config - prevent hangs
Host 192.168.1.190 sandbox-server
    HostName 192.168.1.190
    User root
    ServerAliveInterval 10
    ServerAliveCountMax 3
    ConnectTimeout 10
    StrictHostKeyChecking no
    UserKnownHostsFile=/dev/null
    LogLevel ERROR
EOF

echo "✅ SSH config updated to prevent hangs"
echo ""

# Test basic connectivity
echo "1️⃣  Testing network connectivity..."
if ping -c 2 -W 2 192.168.1.190 > /dev/null 2>&1; then
    echo "   ✅ Network: Reachable"
else
    echo "   ❌ Network: Cannot reach 192.168.1.190"
    exit 1
fi
echo ""

# Test SSH
echo "2️⃣  Testing SSH connection..."
if timeout 10 ssh -o BatchMode=yes 192.168.1.190 'echo "SSH OK"' 2>/dev/null; then
    echo "   ✅ SSH: Working"
else
    echo "   ⚠️  SSH: May need password or key setup"
fi
echo ""

# Check Proxmox host resources
echo "3️⃣  Checking Proxmox host resources..."
timeout 15 ssh 192.168.1.190 << 'ENDSSH' || echo "   ⚠️  Timed out"
echo "   CPU Load:"
uptime | awk '{print "   " $0}'

echo "   Memory:"
free -h | grep -E "Mem:|Swap:" | awk '{print "   " $0}'

echo "   Disk:"
df -h / | tail -1 | awk '{print "   Root: " $5 " used, " $4 " available"}'

echo "   Hung processes:"
ps aux | awk '$8=="D" {print "   " $0}' | head -5
ENDSSH
echo ""

# Check sandbox container
echo "4️⃣  Checking sandbox container (203)..."
timeout 15 ssh 192.168.1.190 << 'ENDSSH' || echo "   ⚠️  Timed out"
echo "   Container status:"
pct status 203 | awk '{print "   " $0}'

echo "   Container resources:"
pct exec 203 -- bash -c 'free -h | grep Mem; df -h / | tail -1; uptime' 2>/dev/null | awk '{print "   " $0}'

echo "   Services in container:"
pct exec 203 -- systemctl is-active nginx expenseapp-backend postgresql@14-main 2>/dev/null | paste -d" " - - - | awk '{print "   nginx:" $1 " backend:" $2 " postgres:" $3}'
ENDSSH
echo ""

# Check for zombie processes
echo "5️⃣  Checking for problematic processes..."
timeout 15 ssh 192.168.1.190 << 'ENDSSH' || echo "   ⚠️  Timed out"
echo "   Zombie processes:"
ps aux | awk '$8=="Z"' | wc -l | awk '{if($1>0) print "   Found " $1 " zombies"; else print "   None"}'

echo "   High CPU processes:"
ps aux --sort=-%cpu | head -6 | tail -5 | awk '{print "   " $11 " - " $3"%"}'
ENDSSH
echo ""

echo "6️⃣  Fixing common issues..."

# Kill any hung SSH/SCP processes on local machine
echo "   Killing local hung SSH processes..."
pkill -9 ssh 2>/dev/null || echo "   (none found)"
pkill -9 scp 2>/dev/null || echo "   (none found)"

# Fix SSH agent issues
echo "   Resetting SSH agent..."
eval $(ssh-agent -k) 2>/dev/null || true
eval $(ssh-agent -s) > /dev/null

# Clean up SSH control sockets
echo "   Cleaning SSH control sockets..."
rm -f ~/.ssh/master-* 2>/dev/null || true
rm -f /tmp/ssh-* 2>/dev/null || true

echo ""
echo "7️⃣  Attempting to fix container issues..."
timeout 20 ssh 192.168.1.190 << 'ENDSSH' || echo "   ⚠️  Could not complete fixes"
# Restart container if needed
if ! pct status 203 | grep -q "running"; then
    echo "   Starting container..."
    pct start 203
    sleep 3
fi

# Check and restart services in container
pct exec 203 -- bash << 'ENDCONTAINER'
# Restart nginx if down
if ! systemctl is-active nginx >/dev/null 2>&1; then
    echo "   Restarting nginx..."
    systemctl restart nginx
fi

# Restart backend if down  
if ! systemctl is-active expenseapp-backend >/dev/null 2>&1; then
    echo "   Restarting backend..."
    systemctl restart expenseapp-backend
fi

# Check postgres
if ! systemctl is-active postgresql@14-main >/dev/null 2>&1; then
    echo "   Restarting PostgreSQL..."
    systemctl restart postgresql@14-main
fi

echo "   ✅ Services checked and restarted if needed"
ENDCONTAINER
ENDSSH

echo ""
echo "=================================="
echo "✅ Diagnostics Complete!"
echo "=================================="
echo ""
echo "If you saw mostly ✅ marks, the system should be working."
echo "Try the deployment again with: ./deploy_fix_to_sandbox.sh"
echo ""

