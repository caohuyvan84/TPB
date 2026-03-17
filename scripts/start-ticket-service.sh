#!/bin/bash

# Start ticket service without blocking
echo "🎫 Starting Ticket Service..."

cd /opt/project/AgentdesktopTPB

# Kill existing process if any
pkill -f "ticket-service" || true

# Build and start with nx
echo "Building ticket service..."
npx nx build ticket-service --configuration=development

echo "Starting ticket service..."
nohup npx nx serve ticket-service > /tmp/ticket-service.log 2>&1 &
echo $! > /tmp/ticket-service.pid

echo "✅ Ticket Service started (PID: $(cat /tmp/ticket-service.pid))"
echo "📝 Logs: tail -f /tmp/ticket-service.log"
echo "🌐 URL: http://localhost:3004"

# Wait and test
sleep 10
curl -s http://localhost:3004 > /dev/null && echo "✅ Service responding" || echo "⚠️ Service starting..."

echo ""
echo "🚀 Run this script in a separate terminal:"
echo "bash /opt/project/AgentdesktopTPB/scripts/start-ticket-service.sh"
