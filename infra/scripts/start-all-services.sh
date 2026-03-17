#!/bin/bash
# Start all backend services in background

set -e

PROJECT_ROOT="/opt/project/AgentdesktopTPB"
LOG_DIR="$PROJECT_ROOT/logs"
PID_DIR="/tmp"

mkdir -p "$LOG_DIR"

echo "🚀 Starting all backend services..."
echo ""

# Services array
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

for service_port in "${SERVICES[@]}"; do
  SERVICE=$(echo $service_port | cut -d: -f1)
  PORT=$(echo $service_port | cut -d: -f2)
  
  echo "📦 Starting $SERVICE on port $PORT..."
  
  cd "$PROJECT_ROOT"
  
  # Start service in background
  nohup npx nx serve $SERVICE > "$LOG_DIR/$SERVICE.log" 2>&1 &
  
  # Save PID
  echo $! > "$PID_DIR/$SERVICE.pid"
  
  echo "   PID: $(cat $PID_DIR/$SERVICE.pid)"
  
  # Small delay to avoid overwhelming system
  sleep 1
done

echo ""
echo "✅ All services started!"
echo ""
echo "📋 Check status:"
echo "   bash $PROJECT_ROOT/infra/scripts/check-services.sh"
echo ""
echo "📋 View logs:"
echo "   tail -f $LOG_DIR/<service-name>.log"
echo ""
echo "🛑 Stop all services:"
echo "   bash $PROJECT_ROOT/infra/scripts/stop-services.sh"
