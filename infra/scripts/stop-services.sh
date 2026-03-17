#!/bin/bash
# Stop all backend services

PID_DIR="/tmp"

echo "🛑 Stopping all backend services..."
echo ""

SERVICES=(
  "identity-service"
  "agent-service"
  "interaction-service"
  "ticket-service"
  "customer-service"
  "notification-service"
  "knowledge-service"
  "bfsi-core-service"
  "ai-service"
  "media-service"
  "audit-service"
  "object-schema-service"
  "layout-service"
  "workflow-service"
  "data-enrichment-service"
  "dashboard-service"
  "report-service"
  "cti-adapter-service"
)

for SERVICE in "${SERVICES[@]}"; do
  PID_FILE="$PID_DIR/$SERVICE.pid"
  
  if [ -f "$PID_FILE" ]; then
    PID=$(cat "$PID_FILE")
    if ps -p "$PID" > /dev/null 2>&1; then
      echo "🛑 Stopping $SERVICE (PID: $PID)..."
      kill "$PID" 2>/dev/null || true
      rm -f "$PID_FILE"
    else
      echo "⚪ $SERVICE not running"
      rm -f "$PID_FILE"
    fi
  fi
done

echo ""
echo "✅ All services stopped!"
