#!/bin/bash

# Start services in background without blocking Kiro
# Usage: ./scripts/start-services.sh

set -e

PROJECT_ROOT="/opt/project/AgentdesktopTPB"
LOG_DIR="$PROJECT_ROOT/logs"
PID_DIR="/tmp/tpb-services"

# Create directories
mkdir -p "$LOG_DIR"
mkdir -p "$PID_DIR"

echo "🚀 Starting TPB CRM Services..."

# Function to start a service
start_service() {
  local service_name=$1
  local port=$2
  
  echo "Starting $service_name on port $port..."
  
  # Build service first
  cd "$PROJECT_ROOT"
  npx nx build "$service_name" --configuration=development > /dev/null 2>&1
  
  # Run from dist
  cd "$PROJECT_ROOT/dist/services/$service_name"
  nohup node main.js > "$LOG_DIR/$service_name.log" 2>&1 &
  echo $! > "$PID_DIR/$service_name.pid"
  
  echo "✅ $service_name started (PID: $(cat $PID_DIR/$service_name.pid))"
}

# Start Phase 1 services
start_service "identity-service" 3001
start_service "agent-service" 3002
start_service "interaction-service" 3003
start_service "ticket-service" 3004
start_service "customer-service" 3005
start_service "notification-service" 3006

# Start Phase 2 services
start_service "knowledge-service" 3007
start_service "bfsi-core-service" 3008
start_service "ai-service" 3009
start_service "media-service" 3010
start_service "audit-service" 3011
start_service "object-schema-service" 3013
start_service "layout-service" 3014
start_service "cti-adapter-service" 3019

# Start Phase 3 services
start_service "workflow-service" 3015
start_service "data-enrichment-service" 3016
start_service "dashboard-service" 3017
start_service "report-service" 3018

echo ""
echo "✅ All services started!"
echo ""
echo "📋 Service Status:"
echo "  - Logs: $LOG_DIR/"
echo "  - PIDs: $PID_DIR/"
echo ""
echo "🔍 Check logs:"
echo "  tail -f $LOG_DIR/identity-service.log"
echo ""
echo "🛑 Stop all services:"
echo "  ./scripts/stop-services.sh"
