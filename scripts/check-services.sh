#!/bin/bash

# Check status of all services
# Usage: ./scripts/check-services.sh

set -e

PID_DIR="/tmp/tpb-services"
LOG_DIR="/opt/project/AgentdesktopTPB/logs"

echo "📊 TPB CRM Services Status"
echo "=========================="
echo ""

if [ ! -d "$PID_DIR" ]; then
  echo "No services running (PID directory not found)"
  exit 0
fi

running=0
stopped=0

for pid_file in "$PID_DIR"/*.pid; do
  if [ -f "$pid_file" ]; then
    service_name=$(basename "$pid_file" .pid)
    pid=$(cat "$pid_file")
    
    if ps -p "$pid" > /dev/null 2>&1; then
      echo "✅ $service_name (PID: $pid) - RUNNING"
      running=$((running + 1))
    else
      echo "❌ $service_name (PID: $pid) - STOPPED"
      stopped=$((stopped + 1))
    fi
  fi
done

echo ""
echo "Summary: $running running, $stopped stopped"
echo ""
echo "📋 View logs:"
echo "  tail -f $LOG_DIR/<service-name>.log"
