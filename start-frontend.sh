#!/bin/bash
# Start frontend dev server in background

echo "Stopping old frontend..."
pkill -f "vite.*agent-desktop" 2>/dev/null || true
sleep 2

echo "Starting Agent Desktop dev server..."
cd apps/agent-desktop
npm run dev -- --host 0.0.0.0 > /tmp/frontend.log 2>&1 &
echo $! > /tmp/frontend.pid
cd ../..

echo "Waiting for dev server to start..."
sleep 10

echo ""
echo "✅ Dev server restarted!"
echo ""
echo "📱 Access at: http://localhost:3000"
echo "🔐 Login credentials:"
echo "   Username: admin"
echo "   Password: Admin@123"
echo ""
echo "⚙️  API Base URL: http://localhost:3001 (direct to Identity Service)"
echo ""
echo "📋 Server info:"
echo "   PID: $(cat /tmp/frontend.pid)"
echo "   Logs: tail -f /tmp/frontend.log"
echo "   Stop: kill $(cat /tmp/frontend.pid)"
echo ""
echo "🔍 Check if server is ready:"
curl -s http://localhost:3000 > /dev/null && echo "   ✅ Server responding" || echo "   ⏳ Server still starting..."
