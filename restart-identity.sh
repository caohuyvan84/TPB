#!/bin/bash
# Restart Identity Service after migrations

echo "Stopping Identity Service..."
pkill -f "identity-service.*main.js" 2>/dev/null || true
sleep 2

echo "Starting Identity Service..."
cd dist/services/identity-service
PORT=3001 nohup node main.js > /tmp/identity.log 2>&1 &
echo $! > /tmp/identity.pid
cd ../../..

echo "Waiting for service..."
sleep 5

echo ""
echo "Testing login..."
curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"Admin@123","clientFingerprint":"test"}' \
  | python3 -m json.tool 2>/dev/null || cat

echo ""
echo ""
echo "Service PID: $(cat /tmp/identity.pid)"
echo "Logs: tail -f /tmp/identity.log"
