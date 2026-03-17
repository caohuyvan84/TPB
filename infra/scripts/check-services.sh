#!/bin/bash
# Check status of all backend services

PID_DIR="/tmp"

echo "📊 Backend Services Status"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
printf "%-30s %-10s %-10s %s\n" "SERVICE" "STATUS" "PID" "PORT"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

SERVICES=(
  "identity-service:3001"
  "agent-service:3002"
  "interaction-service:3003"
  "ticket-service:3004"
  "customer-service:3005"
  "notification-service:3006"
  "knowledge-service:3007"
  "bfsi-core-service:3008"
  "ai-service:3009"
  "media-service:3010"
  "audit-service:3011"
  "object-schema-service:3013"
  "layout-service:3014"
  "workflow-service:3015"
  "data-enrichment-service:3016"
  "dashboard-service:3017"
  "report-service:3018"
  "cti-adapter-service:3019"
)

RUNNING=0
STOPPED=0

for service_port in "${SERVICES[@]}"; do
  SERVICE=$(echo $service_port | cut -d: -f1)
  PORT=$(echo $service_port | cut -d: -f2)
  PID_FILE="$PID_DIR/$SERVICE.pid"
  
  if [ -f "$PID_FILE" ]; then
    PID=$(cat "$PID_FILE")
    if ps -p "$PID" > /dev/null 2>&1; then
      printf "%-30s %-10s %-10s %s\n" "$SERVICE" "✅ Running" "$PID" "$PORT"
      ((RUNNING++))
    else
      printf "%-30s %-10s %-10s %s\n" "$SERVICE" "❌ Stopped" "-" "$PORT"
      ((STOPPED++))
    fi
  else
    printf "%-30s %-10s %-10s %s\n" "$SERVICE" "⚪ Not Started" "-" "$PORT"
    ((STOPPED++))
  fi
done

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Running: $RUNNING | ❌ Stopped: $STOPPED"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
