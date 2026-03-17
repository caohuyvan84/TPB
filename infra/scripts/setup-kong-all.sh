#!/bin/bash
# Complete Kong API Gateway Setup for All Services (Phase 1 + 2 + 3)

set -e

KONG_ADMIN="http://localhost:8001"

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║         Kong API Gateway - Complete Platform Setup          ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

configure_service() {
  local SERVICE_NAME=$1
  local SERVICE_PORT=$2
  local ROUTE_PATH=$3
  
  echo "📝 Configuring $SERVICE_NAME..."
  
  # Create service
  curl -s -X POST $KONG_ADMIN/services/ \
    --data name=$SERVICE_NAME \
    --data url=http://host.docker.internal:$SERVICE_PORT/api/v1 > /dev/null
  
  # Create route
  curl -s -X POST $KONG_ADMIN/services/$SERVICE_NAME/routes \
    --data paths[]=$ROUTE_PATH \
    --data strip_path=false > /dev/null
  
  # Add rate limiting
  curl -s -X POST $KONG_ADMIN/services/$SERVICE_NAME/plugins \
    --data name=rate-limiting \
    --data config.minute=100 > /dev/null
  
  # Add CORS
  curl -s -X POST $KONG_ADMIN/services/$SERVICE_NAME/plugins \
    --data name=cors \
    --data config.origins=http://localhost:3000 \
    --data config.credentials=true > /dev/null
  
  echo "✅ $SERVICE_NAME configured"
}

echo "Phase 1 Services:"
configure_service "identity-service" 3001 "/api/v1/auth"
configure_service "agent-service" 3002 "/api/v1/agents"
configure_service "interaction-service" 3003 "/api/v1/interactions"
configure_service "ticket-service" 3004 "/api/v1/tickets"
configure_service "customer-service" 3005 "/api/v1/customers"
configure_service "notification-service" 3006 "/api/v1/notifications"

echo ""
echo "Phase 2 Services:"
configure_service "knowledge-service" 3007 "/api/v1/kb"
configure_service "bfsi-service" 3008 "/api/v1/bfsi"
configure_service "ai-service" 3009 "/api/v1/ai"
configure_service "media-service" 3010 "/api/v1/media"
configure_service "audit-service" 3011 "/api/v1/audit"
configure_service "object-schema-service" 3013 "/api/v1/schemas"
configure_service "layout-service" 3014 "/api/v1/layouts"
configure_service "cti-service" 3019 "/api/v1/cti"

echo ""
echo "Phase 3 Services:"
configure_service "workflow-service" 3015 "/api/v1/workflows"
configure_service "enrichment-service" 3016 "/api/v1/enrichment"
configure_service "dashboard-service" 3017 "/api/v1/dashboards"
configure_service "report-service" 3018 "/api/v1/reports"

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║              Kong Configuration Complete! ✅                  ║"
echo "╠══════════════════════════════════════════════════════════════╣"
echo "║  18 services configured with:                                ║"
echo "║  - Rate limiting: 100 requests/minute                        ║"
echo "║  - CORS enabled for localhost:3000                           ║"
echo "║  - All routes: /api/v1/*                                     ║"
echo "╚══════════════════════════════════════════════════════════════╝"
