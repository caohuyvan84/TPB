#!/bin/bash

# Stop all services
# Usage: ./scripts/stop-services.sh

set -e

PID_DIR="/tmp/tpb-services"

echo "🛑 Stopping TPB CRM Services..."

if [ ! -d "$PID_DIR" ]; then
  echo "No services running (PID directory not found)"
  exit 0
fi

# Stop all services
for pid_file in "$PID_DIR"/*.pid; do
  if [ -f "$pid_file" ]; then
    service_name=$(basename "$pid_file" .pid)
    pid=$(cat "$pid_file")
    
    if ps -p "$pid" > /dev/null 2>&1; then
      echo "Stopping $service_name (PID: $pid)..."
      kill "$pid" 2>/dev/null || true
      echo "✅ $service_name stopped"
    else
      echo "⚠️  $service_name not running"
    fi
    
    rm "$pid_file"
  fi
done

echo ""
echo "✅ All services stopped!"
