#!/bin/bash

# Script to create test tickets for frontend testing
set -e

echo "🎫 Creating test tickets..."

# Start ticket service if not running
if ! pgrep -f "ticket-service" > /dev/null; then
    echo "Starting ticket service..."
    cd services/ticket-service
    nohup npm run dev > /tmp/ticket.log 2>&1 &
    cd ../..
    sleep 5
fi

# Get fresh token
TOKEN=$(curl -s -X POST http://157.66.80.51:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "Admin@123"}' | \
  grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)

echo "Got token: ${TOKEN:0:20}..."

# Create test tickets
echo "Creating ticket 1..."
curl -s -X POST http://157.66.80.51:8000/api/v1/tickets \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "title": "Không thể đăng nhập internet banking",
    "description": "Khách hàng báo cáo không thể đăng nhập sau khi đổi mật khẩu",
    "priority": "high",
    "category": "technical",
    "customerId": "ee6d2d87-0351-46b6-aeef-b5ecaaeeba68"
  }' > /tmp/ticket1.json

echo "Creating ticket 2..."
curl -s -X POST http://157.66.80.51:8000/api/v1/tickets \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "title": "Yêu cầu tăng hạn mức thẻ tín dụng",
    "description": "Khách hàng VIP yêu cầu tăng hạn mức từ 50M lên 100M",
    "priority": "medium",
    "category": "request",
    "customerId": "ee6d2d87-0351-46b6-aeef-b5ecaaeeba68"
  }' > /tmp/ticket2.json

echo "Creating ticket 3..."
curl -s -X POST http://157.66.80.51:8000/api/v1/tickets \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "title": "Khiếu nại phí chuyển khoản",
    "description": "Khách hàng phản ánh bị tính phí chuyển khoản không đúng quy định",
    "priority": "low",
    "category": "complaint",
    "customerId": "ee6d2d87-0351-46b6-aeef-b5ecaaeeba68"
  }' > /tmp/ticket3.json

echo ""
echo "✅ Test tickets created!"
echo ""
echo "📋 Checking tickets list:"
curl -s -H "Authorization: Bearer $TOKEN" http://157.66.80.51:8000/api/v1/tickets | head -200

echo ""
echo "🌐 Test on Agent Desktop: http://157.66.80.51:3000"
