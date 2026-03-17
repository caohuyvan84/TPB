#!/bin/bash
# Kong API Gateway Setup for Phase 3 Services

set -e

KONG_ADMIN="http://localhost:8001"

echo "🔧 Configuring Kong API Gateway for Phase 3 Services..."
echo ""

# MS-15: Workflow Service
echo "📝 Configuring MS-15: Workflow Service..."
curl -i -X POST $KONG_ADMIN/services/ \
  --data name=workflow-service \
  --data url=http://host.docker.internal:3015/api/v1

curl -i -X POST $KONG_ADMIN/services/workflow-service/routes \
  --data paths[]=/api/v1/workflows \
  --data strip_path=false

curl -i -X POST $KONG_ADMIN/services/workflow-service/plugins \
  --data name=rate-limiting \
  --data config.minute=100

curl -i -X POST $KONG_ADMIN/services/workflow-service/plugins \
  --data name=cors \
  --data config.origins=http://localhost:3000 \
  --data config.credentials=true

echo "✅ Workflow Service configured"
echo ""

# MS-16: Data Enrichment Service
echo "📝 Configuring MS-16: Data Enrichment Service..."
curl -i -X POST $KONG_ADMIN/services/ \
  --data name=enrichment-service \
  --data url=http://host.docker.internal:3016/api/v1

curl -i -X POST $KONG_ADMIN/services/enrichment-service/routes \
  --data paths[]=/api/v1/enrichment \
  --data strip_path=false

curl -i -X POST $KONG_ADMIN/services/enrichment-service/plugins \
  --data name=rate-limiting \
  --data config.minute=100

curl -i -X POST $KONG_ADMIN/services/enrichment-service/plugins \
  --data name=cors \
  --data config.origins=http://localhost:3000 \
  --data config.credentials=true

echo "✅ Data Enrichment Service configured"
echo ""

# MS-17: Dashboard Service
echo "📝 Configuring MS-17: Dashboard Service..."
curl -i -X POST $KONG_ADMIN/services/ \
  --data name=dashboard-service \
  --data url=http://host.docker.internal:3017/api/v1

curl -i -X POST $KONG_ADMIN/services/dashboard-service/routes \
  --data paths[]=/api/v1/dashboards \
  --data strip_path=false

curl -i -X POST $KONG_ADMIN/services/dashboard-service/plugins \
  --data name=rate-limiting \
  --data config.minute=100

curl -i -X POST $KONG_ADMIN/services/dashboard-service/plugins \
  --data name=cors \
  --data config.origins=http://localhost:3000 \
  --data config.credentials=true

echo "✅ Dashboard Service configured"
echo ""

# MS-18: Report Service
echo "📝 Configuring MS-18: Report Service..."
curl -i -X POST $KONG_ADMIN/services/ \
  --data name=report-service \
  --data url=http://host.docker.internal:3018/api/v1

curl -i -X POST $KONG_ADMIN/services/report-service/routes \
  --data paths[]=/api/v1/reports \
  --data strip_path=false

curl -i -X POST $KONG_ADMIN/services/report-service/plugins \
  --data name=rate-limiting \
  --data config.minute=100

curl -i -X POST $KONG_ADMIN/services/report-service/plugins \
  --data name=cors \
  --data config.origins=http://localhost:3000 \
  --data config.credentials=true

echo "✅ Report Service configured"
echo ""

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║   Kong API Gateway - Phase 3 Services Configuration Complete ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""
echo "Phase 3 Services available through Kong Gateway (port 8000):"
echo "  - POST   /api/v1/workflows"
echo "  - GET    /api/v1/workflows"
echo "  - POST   /api/v1/enrichment/request"
echo "  - GET    /api/v1/enrichment/sources"
echo "  - POST   /api/v1/dashboards"
echo "  - GET    /api/v1/dashboards"
echo "  - POST   /api/v1/reports"
echo "  - GET    /api/v1/reports"
