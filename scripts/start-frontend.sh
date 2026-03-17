#!/bin/bash

# Start frontend dev server in background
# Usage: ./scripts/start-frontend.sh

set -e

PROJECT_ROOT="/opt/project/AgentdesktopTPB"
LOG_DIR="$PROJECT_ROOT/logs"
PID_FILE="/tmp/tpb-services/frontend.pid"

mkdir -p "$LOG_DIR"
mkdir -p "/tmp/tpb-services"

echo "🚀 Starting Frontend Dev Server..."

cd "$PROJECT_ROOT"
nohup npm run dev > "$LOG_DIR/frontend.log" 2>&1 &
echo $! > "$PID_FILE"

echo "✅ Frontend started (PID: $(cat $PID_FILE))"
echo ""
echo "🌐 Local: http://localhost:3000"
echo "🌐 Network: http://157.66.80.51:3000"
echo "📋 Logs: tail -f $LOG_DIR/frontend.log"
echo ""
echo "🛑 Stop: ./scripts/stop-frontend.sh"
