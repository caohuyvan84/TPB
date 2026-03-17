#!/bin/bash
# TPB CRM Services Management Script

SERVICES=(
  "identity"
  "agent"
  "interaction"
  "ticket"
  "customer"
  "notification"
  "knowledge"
  "bfsi-core"
  "ai"
  "media"
  "audit"
  "object-schema"
  "layout"
  "workflow"
  "data-enrichment"
  "dashboard"
  "report"
  "cti-adapter"
)

PHASE1_SERVICES=("identity" "agent" "interaction" "ticket" "customer" "notification")
PHASE2_SERVICES=("knowledge" "bfsi-core" "ai" "media" "audit" "object-schema" "layout" "cti-adapter")
PHASE3_SERVICES=("workflow" "data-enrichment" "dashboard" "report")

case "$1" in
  start)
    echo "🚀 Starting TPB CRM Services..."
    systemctl start $(printf "tpb-%s " "${PHASE1_SERVICES[@]}")
    systemctl start tpb-frontend tpb-admin
    echo "✅ Phase 1 services + frontends started"
    ;;
    
  start-all)
    echo "🚀 Starting ALL TPB CRM Services..."
    systemctl start $(printf "tpb-%s " "${SERVICES[@]}")
    systemctl start tpb-frontend tpb-admin
    echo "✅ All services + frontends started"
    ;;
    
  stop)
    echo "🛑 Stopping TPB CRM Services..."
    systemctl stop $(printf "tpb-%s " "${SERVICES[@]}")
    systemctl stop tpb-frontend tpb-admin
    echo "✅ All services stopped"
    ;;
    
  restart)
    echo "🔄 Restarting TPB CRM Services..."
    systemctl restart $(printf "tpb-%s " "${PHASE1_SERVICES[@]}")
    systemctl restart tpb-frontend tpb-admin
    echo "✅ Services restarted"
    ;;
    
  status)
    echo "📊 TPB CRM Services Status"
    echo "=========================="
    echo ""
    echo "Frontend Applications:"
    for service in "frontend" "admin"; do
      status=$(systemctl is-active tpb-$service)
      if [ "$status" = "active" ]; then
        echo "✅ tpb-$service - RUNNING"
      else
        echo "❌ tpb-$service - STOPPED"
      fi
    done
    echo ""
    echo "Backend Services:"
    for service in "${PHASE1_SERVICES[@]}"; do
      status=$(systemctl is-active tpb-$service)
      if [ "$status" = "active" ]; then
        echo "✅ tpb-$service - RUNNING"
      else
        echo "❌ tpb-$service - STOPPED"
      fi
    done
    ;;
    
  logs)
    service=${2:-identity}
    echo "📋 Viewing logs for tpb-$service..."
    journalctl -u tpb-$service -f
    ;;
    
  enable)
    echo "🔧 Enabling services to start on boot..."
    systemctl enable $(printf "tpb-%s " "${PHASE1_SERVICES[@]}")
    echo "✅ Services enabled"
    ;;
    
  disable)
    echo "🔧 Disabling services from starting on boot..."
    systemctl disable $(printf "tpb-%s " "${SERVICES[@]}")
    echo "✅ Services disabled"
    ;;
    
  *)
    echo "TPB CRM Services Management"
    echo ""
    echo "Usage: $0 {start|start-all|stop|restart|status|logs|enable|disable}"
    echo ""
    echo "Commands:"
    echo "  start      - Start Phase 1 services (6 services)"
    echo "  start-all  - Start all services (18 services)"
    echo "  stop       - Stop all services"
    echo "  restart    - Restart Phase 1 services"
    echo "  status     - Show service status"
    echo "  logs       - View logs (usage: $0 logs [service-name])"
    echo "  enable     - Enable services to start on boot"
    echo "  disable    - Disable services from starting on boot"
    echo ""
    echo "Examples:"
    echo "  $0 start"
    echo "  $0 status"
    echo "  $0 logs identity"
    echo "  $0 restart"
    exit 1
    ;;
esac
