#!/bin/bash
# Test login flow without blocking

echo "=== Phase 4 Login Test ==="
echo ""

# Check if services are running
echo "1. Checking infrastructure..."
if docker ps --format "{{.Names}}\t{{.Status}}" | grep -q "tpb-postgres.*healthy"; then
  echo "   ✅ PostgreSQL running"
else
  echo "   ❌ PostgreSQL not running"
  echo "   Run: cd infra && docker compose up -d postgres redis kong"
  exit 1
fi

# Check if Identity Service is built
echo ""
echo "2. Checking Identity Service build..."
if [ -f "dist/services/identity-service/main.js" ]; then
  echo "   ✅ Identity Service built"
else
  echo "   ❌ Identity Service not built"
  echo "   Run: npx nx build identity-service"
  exit 1
fi

# Start Identity Service in background (detached)
echo ""
echo "3. Starting Identity Service..."
cd dist/services/identity-service
PORT=3001 nohup node main.js > /tmp/identity.log 2>&1 &
IDENTITY_PID=$!
echo $IDENTITY_PID > /tmp/identity.pid
cd ../../..

# Wait for service to start
echo "   Waiting for service to start..."
sleep 5

# Check if service is responding
echo ""
echo "4. Testing /health endpoint..."
HEALTH=$(curl -s http://localhost:3001/health 2>&1)
if echo "$HEALTH" | grep -q "ok\|healthy"; then
  echo "   ✅ Identity Service healthy"
else
  echo "   ⚠️  Service may not be ready yet"
  echo "   Response: $HEALTH"
fi

# Test login endpoint
echo ""
echo "5. Testing login endpoint..."
echo "   POST /api/v1/auth/login"
echo "   Body: {username: 'admin', password: 'admin123'}"
echo ""

LOGIN_RESPONSE=$(curl -s -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123","clientFingerprint":"test-client"}' 2>&1)

echo "Response:"
echo "$LOGIN_RESPONSE" | jq . 2>/dev/null || echo "$LOGIN_RESPONSE"

echo ""
echo "=== Test Complete ==="
echo ""
echo "Identity Service PID: $IDENTITY_PID"
echo "Logs: tail -f /tmp/identity.log"
echo "Stop: kill $IDENTITY_PID"
