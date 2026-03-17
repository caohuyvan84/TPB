#!/bin/bash
# Monitor script for security

echo "=== Security Monitoring Dashboard ==="
echo "Started: $(date)"
echo ""

# Monitor malware processes
echo "1. Checking for suspicious processes..."
ps aux | grep -E "/tmp/mysql|/tmp/init" | grep -v grep
if [ $? -eq 0 ]; then
    echo "⚠️  ALERT: Malware process detected!"
else
    echo "✅ No malware processes found"
fi
echo ""

# Monitor CPU usage
echo "2. Top CPU consumers:"
ps aux --sort=-%cpu | head -6
echo ""

# Monitor network connections
echo "3. External connections to database ports:"
sudo ss -tunap | grep ESTABLISHED | grep -E ":5432|:6379|:9092"
if [ $? -eq 0 ]; then
    echo "⚠️  WARNING: External connections detected!"
else
    echo "✅ No external connections"
fi
echo ""

# Monitor Docker containers
echo "4. Docker container status:"
docker ps --format "table {{.Names}}\t{{.Status}}" | head -10
echo ""

# Monitor firewall
echo "5. Firewall status:"
sudo ufw status | head -5
echo ""

# Monitor ClamAV scan
echo "6. ClamAV scan progress:"
if [ -f /tmp/clamscan.log ]; then
    tail -5 /tmp/clamscan.log
else
    echo "No scan log found"
fi
echo ""

# Monitor failed login attempts
echo "7. Recent failed login attempts:"
sudo grep "Failed password" /var/log/auth.log 2>/dev/null | tail -5 || echo "No failed attempts"
echo ""

echo "=== End of Report ==="
echo "Next check: Run this script again or set up cron job"
