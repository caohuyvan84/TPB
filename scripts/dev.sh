#!/bin/bash

# Master script to manage all services
# Usage: 
#   ./scripts/dev.sh start    - Start all services + frontend
#   ./scripts/dev.sh stop     - Stop all services + frontend
#   ./scripts/dev.sh restart  - Restart all
#   ./scripts/dev.sh status   - Check status

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

case "$1" in
  start)
    echo "🚀 Starting all services..."
    echo ""
    
    # Start infrastructure (if not running)
    echo "📦 Checking infrastructure..."
    cd "$SCRIPT_DIR/.."
    docker compose -f infra/docker-compose.yml ps | grep -q "Up" || {
      echo "Starting Docker infrastructure..."
      docker compose -f infra/docker-compose.yml up -d
      echo "Waiting 10s for services to be ready..."
      sleep 10
    }
    
    # Start backend services
    "$SCRIPT_DIR/start-services.sh"
    
    echo ""
    echo "Waiting 5s for services to initialize..."
    sleep 5
    
    # Start frontend
    "$SCRIPT_DIR/start-frontend.sh"
    
    echo ""
    echo "Waiting 2s..."
    sleep 2
    
    # Start admin module
    "$SCRIPT_DIR/admin-module.sh" start
    
    echo ""
    echo "✅ All services started!"
    echo ""
    echo "🌐 Agent Desktop: http://localhost:3000 | http://157.66.80.51:3000"
    echo "🔧 Admin Module: http://localhost:3020 | http://157.66.80.51:3020"
    echo "🔍 Check status: ./scripts/dev.sh status"
    ;;
    
  stop)
    echo "🛑 Stopping all services..."
    "$SCRIPT_DIR/admin-module.sh" stop
    "$SCRIPT_DIR/stop-frontend.sh"
    "$SCRIPT_DIR/stop-services.sh"
    echo ""
    echo "✅ All services stopped!"
    ;;
    
  restart)
    echo "🔄 Restarting all services..."
    "$0" stop
    sleep 2
    "$0" start
    ;;
    
  status)
    echo "📊 Service Status"
    echo "================="
    echo ""
    
    # Check frontend
    if [ -f "/tmp/tpb-services/frontend.pid" ]; then
      pid=$(cat "/tmp/tpb-services/frontend.pid")
      if ps -p "$pid" > /dev/null 2>&1; then
        echo "✅ Agent Desktop (PID: $pid) - http://localhost:3000"
      else
        echo "❌ Agent Desktop - STOPPED"
      fi
    else
      echo "❌ Agent Desktop - NOT STARTED"
    fi
    
    # Check admin module
    if [ -f "/tmp/admin-module.pid" ]; then
      pid=$(cat "/tmp/admin-module.pid")
      if ps -p "$pid" > /dev/null 2>&1; then
        echo "✅ Admin Module (PID: $pid) - http://localhost:3020"
      else
        echo "❌ Admin Module - STOPPED"
      fi
    else
      echo "❌ Admin Module - NOT STARTED"
    fi
    
    echo ""
    
    # Check backend services
    "$SCRIPT_DIR/check-services.sh"
    ;;
    
  *)
    echo "Usage: $0 {start|stop|restart|status}"
    exit 1
    ;;
esac
