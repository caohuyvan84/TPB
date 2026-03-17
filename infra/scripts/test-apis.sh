#!/bin/bash
# Quick API test script

echo "🧪 Testing Phase 1 APIs..."
echo ""

# Test 1: Login
echo "1️⃣  Testing Login..."
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "agent1",
    "password": "password123",
    "clientFingerprint": "test-device"
  }')

if echo "$LOGIN_RESPONSE" | grep -q "accessToken"; then
  echo "   ✅ Login successful"
  TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.accessToken')
  USER_ID=$(echo "$LOGIN_RESPONSE" | jq -r '.user.id')
  echo "   📝 User ID: $USER_ID"
else
  echo "   ❌ Login failed"
  echo "   Response: $LOGIN_RESPONSE"
  exit 1
fi

echo ""

# Test 2: Get Agent Profile
echo "2️⃣  Testing Agent Service..."
AGENT_RESPONSE=$(curl -s -X GET http://localhost:8000/api/v1/agents/me \
  -H "Authorization: Bearer $TOKEN")

if echo "$AGENT_RESPONSE" | grep -q "agentId"; then
  echo "   ✅ Agent profile retrieved"
else
  echo "   ❌ Agent profile failed"
  echo "   Response: $AGENT_RESPONSE"
fi

echo ""

# Test 3: List Interactions
echo "3️⃣  Testing Interaction Service..."
INTERACTION_RESPONSE=$(curl -s -X GET http://localhost:8000/api/v1/interactions \
  -H "Authorization: Bearer $TOKEN")

if echo "$INTERACTION_RESPONSE" | grep -q "\["; then
  echo "   ✅ Interactions listed"
  COUNT=$(echo "$INTERACTION_RESPONSE" | jq '. | length')
  echo "   📊 Found $COUNT interactions"
else
  echo "   ❌ Interactions failed"
fi

echo ""

# Test 4: Search Customers
echo "4️⃣  Testing Customer Service..."
CUSTOMER_RESPONSE=$(curl -s -X GET "http://localhost:8000/api/v1/customers" \
  -H "Authorization: Bearer $TOKEN")

if echo "$CUSTOMER_RESPONSE" | grep -q "\["; then
  echo "   ✅ Customers searched"
  COUNT=$(echo "$CUSTOMER_RESPONSE" | jq '. | length')
  echo "   📊 Found $COUNT customers"
else
  echo "   ❌ Customers failed"
fi

echo ""

# Test 5: List Tickets
echo "5️⃣  Testing Ticket Service..."
TICKET_RESPONSE=$(curl -s -X GET http://localhost:8000/api/v1/tickets \
  -H "Authorization: Bearer $TOKEN")

if echo "$TICKET_RESPONSE" | grep -q "\["; then
  echo "   ✅ Tickets listed"
  COUNT=$(echo "$TICKET_RESPONSE" | jq '. | length')
  echo "   📊 Found $COUNT tickets"
else
  echo "   ❌ Tickets failed"
fi

echo ""

# Test 6: List Notifications
echo "6️⃣  Testing Notification Service..."
NOTIFICATION_RESPONSE=$(curl -s -X GET http://localhost:8000/api/v1/notifications \
  -H "Authorization: Bearer $TOKEN")

if echo "$NOTIFICATION_RESPONSE" | grep -q "\["; then
  echo "   ✅ Notifications listed"
  COUNT=$(echo "$NOTIFICATION_RESPONSE" | jq '. | length')
  echo "   📊 Found $COUNT notifications"
else
  echo "   ❌ Notifications failed"
fi

echo ""
echo "✅ All API tests completed!"
echo ""
echo "💡 Tip: Use TESTING-GUIDE.md for detailed API examples"
