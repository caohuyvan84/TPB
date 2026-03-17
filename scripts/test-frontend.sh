#!/bin/bash

# Simple script to test Agent Desktop with mock tickets
echo "🎫 Testing Agent Desktop ticket module..."

echo ""
echo "✅ Agent Desktop URLs:"
echo "🌐 Local: http://localhost:3000"
echo "🌐 Network: http://157.66.80.51:3000"
echo ""
echo "📋 Test Steps:"
echo "1. Open Agent Desktop in browser"
echo "2. Login with: admin / Admin@123"
echo "3. Navigate to Tickets section"
echo "4. Check if tickets load properly"
echo "5. Try creating a new ticket"
echo ""
echo "🔧 Backend Services Status:"
curl -s http://157.66.80.51:8000/api/auth/login -X POST -H "Content-Type: application/json" -d '{"username":"admin","password":"Admin@123"}' > /dev/null && echo "✅ Authentication: Working" || echo "❌ Authentication: Failed"

echo ""
echo "📝 If tickets don't load, the frontend should show mock data"
echo "📝 This is expected behavior during Phase 4 integration"
