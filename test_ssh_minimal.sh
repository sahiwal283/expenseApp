#!/bin/bash
# Minimal SSH test to identify the exact problem

echo "Testing SSH connection to 192.168.1.190..."
echo "=========================================="
echo ""

# Test 1: Can we reach the host?
echo "Test 1: Network connectivity"
if timeout 3 ping -c 1 192.168.1.190 > /dev/null 2>&1; then
    echo "✅ PASS: Host is reachable"
else
    echo "❌ FAIL: Cannot reach host"
    echo "   Fix: Check network connection and firewall"
    exit 1
fi
echo ""

# Test 2: Is SSH port open?
echo "Test 2: SSH port (22)"
if timeout 3 nc -z 192.168.1.190 22 2>/dev/null; then
    echo "✅ PASS: SSH port is open"
else
    echo "❌ FAIL: SSH port is closed or filtered"
    echo "   Fix: Check SSH service and firewall rules"
    exit 1
fi
echo ""

# Test 3: Can we connect with strict settings?
echo "Test 3: SSH connection (non-interactive)"
SSH_CMD="ssh -o BatchMode=yes -o ConnectTimeout=5 -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null 192.168.1.190 'echo connected'"

if timeout 8 $SSH_CMD 2>&1 | grep -q "connected"; then
    echo "✅ PASS: SSH works with keys"
elif echo "$SSH_CMD" 2>&1 | grep -q "Permission denied"; then
    echo "⚠️  PARTIAL: SSH works but needs password/key"
    echo "   You have two options:"
    echo "   A) Set up SSH key: ssh-copy-id root@192.168.1.190"
    echo "   B) Use Proxmox web console instead"
else
    echo "❌ FAIL: SSH connection failed"
    echo "   This might be:"
    echo "   - SSH daemon not running"
    echo "   - Host key changed (check ~/.ssh/known_hosts)"
    echo "   - Firewall blocking connection"
fi
echo ""

# Test 4: Check for hanging processes
echo "Test 4: Looking for hung SSH processes"
HUNG_COUNT=$(ps aux | grep -E "ssh.*192.168.1.190" | grep -v grep | wc -l)
if [ "$HUNG_COUNT" -gt 0 ]; then
    echo "⚠️  WARNING: Found $HUNG_COUNT SSH processes"
    echo "   Kill them with: pkill -9 ssh"
else
    echo "✅ PASS: No hung SSH processes"
fi
echo ""

# Test 5: SSH config
echo "Test 5: SSH configuration"
if grep -q "192.168.1.190" ~/.ssh/config 2>/dev/null; then
    echo "✅ SSH config exists for this host"
    echo "   Current settings:"
    grep -A 5 "192.168.1.190" ~/.ssh/config | sed 's/^/   /'
else
    echo "⚠️  No SSH config for this host"
    echo "   Creating one now..."
    mkdir -p ~/.ssh
    cat >> ~/.ssh/config << 'EOF'

Host sandbox 192.168.1.190
    HostName 192.168.1.190
    User root
    ServerAliveInterval 10
    ServerAliveCountMax 3
    ConnectTimeout 10
    StrictHostKeyChecking no
    UserKnownHostsFile=/dev/null
EOF
    echo "   ✅ Created SSH config"
fi
echo ""

echo "=========================================="
echo "Summary:"
echo "=========================================="
echo ""
echo "If all tests passed with ✅, SSH should work."
echo "Try connecting with: ssh 192.168.1.190"
echo ""
echo "If tests failed, follow the instructions above each failure."
echo ""
echo "Alternative: Use Proxmox web console"
echo "  1. Open https://192.168.1.190:8006"
echo "  2. Login"
echo "  3. Click container 203"
echo "  4. Click 'Console'"
echo "  5. Follow instructions in MANUAL_FIX_INSTRUCTIONS.md"
echo ""

