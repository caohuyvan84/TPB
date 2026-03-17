#!/bin/bash

# Stop frontend dev server
# Usage: ./scripts/stop-frontend.sh

set -e

PID_FILE="/tmp/tpb-services/frontend.pid"

if [ ! -f "$PID_FILE" ]; then
  echo "Frontend not running (PID file not found)"
  exit 0
fi

pid=$(cat "$PID_FILE")

if ps -p "$pid" > /dev/null 2>&1; then
  echo "🛑 Stopping Frontend (PID: $pid)..."
  kill "$pid" 2>/dev/null || true
  echo "✅ Frontend stopped"
else
  echo "⚠️  Frontend not running"
fi

rm "$PID_FILE"
