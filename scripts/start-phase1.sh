#!/bin/bash

# Start only Phase 1 services (for testing)
# Usage: ./scripts/start-phase1.sh

set -e

PROJECT_ROOT="/opt/project/AgentdesktopTPB"
LOG_DIR="$PROJECT_ROOT/logs"
PID_DIR="/tmp/tpb-services"

mkdir -p "$LOG_DIR"
mkdir -p "$PID_DIR"

echo "🚀 Starting Phase 1 Services..."

# Function to start a service
start_service() {
  local service_name=$1
  local port=$2
  
  echo "Building $service_name..."
  cd "$PROJECT_ROOT"
  npx nx build "$service_name" > /dev/null 2>&1 || {
    echo "⚠️  Build failed for $service_name, skipping..."
    return
  }
  
  echo "Starting $service_name on port $port..."
  cd "$PROJECT_ROOT/dist/services/$service_name"
  nohup node main.js > "$LOG_DIR/$service_name.log" 2>&1 &
  echo $! > "$PID_DIR/$service_name.pid"
  
  echo "✅ $service_name started (PID: $(cat $PID_DIR/$service_name.pid))"
}

# Start Phase 1 services only
start_service "identity-service" 3001
start_service "agent-service" 3002
start_service "interaction-service" 3003
start_service "ticket-service" 3004
start_service "customer-service" 3005
start_service "notification-service" 3006

echo ""
echo "✅ Phase 1 services started!"
echo ""
echo "📋 Check status: ./scripts/dev.sh status"
echo "🛑 Stop: ./scripts/dev.sh stop"
