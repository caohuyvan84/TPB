#!/bin/bash

# Start all required services for ticket testing
echo "🚀 Starting services for ticket testing..."

cd /opt/project/AgentdesktopTPB

# Start ticket service
echo "Starting ticket service..."
cd services/ticket-service
nohup npm run dev > /tmp/ticket-service.log 2>&1 &
echo $! > /tmp/ticket-service.pid
cd ../..

# Start customer service (needed for tickets)
echo "Starting customer service..."
cd services/customer-service  
nohup npm run dev > /tmp/customer-service.log 2>&1 &
echo $! > /tmp/customer-service.pid
cd ../..

echo ""
echo "✅ Services started:"
echo "🎫 Ticket Service (PID: $(cat /tmp/ticket-service.pid))"
echo "👤 Customer Service (PID: $(cat /tmp/customer-service.pid))"
echo ""
echo "📝 Test after 10 seconds with:"
echo "curl -H 'Authorization: Bearer TOKEN' http://157.66.80.51:8000/api/v1/tickets"
