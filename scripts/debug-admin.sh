#!/bin/bash

# Simple admin module debug script
echo "🔍 Admin Module Debug"
echo "===================="

# Check if running
if [ -f "/tmp/admin-module.pid" ]; then
  PID=$(cat "/tmp/admin-module.pid")
  if ps -p "$PID" > /dev/null 2>&1; then
    echo "✅ Process running (PID: $PID)"
  else
    echo "❌ Process not running"
    exit 1
  fi
else
  echo "❌ No PID file"
  exit 1
fi

# Check port
if netstat -tuln | grep -q ":3020 "; then
  echo "✅ Port 3020 listening"
else
  echo "❌ Port 3020 not listening"
fi

# Test HTTP response
echo "🌐 Testing HTTP response..."
curl -s -o /dev/null -w "HTTP Status: %{http_code}\n" http://localhost:3020/

echo ""
echo "📝 Recent logs:"
tail -n 5 logs/admin-module.log
