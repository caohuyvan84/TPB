#!/bin/bash

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                                                              ║"
echo "║           TPB CRM Platform - Phase 2 Verification           ║"
echo "║                                                              ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

PASS=0
FAIL=0

check() {
  if [ $? -eq 0 ]; then
    echo "✅ $1"
    ((PASS++))
  else
    echo "❌ $1"
    ((FAIL++))
  fi
}

echo "📦 Checking Databases..."
docker exec tpb-postgres psql -U postgres -lqt | grep -q knowledge_db
check "knowledge_db exists"

docker exec tpb-postgres psql -U postgres -lqt | grep -q bfsi_db
check "bfsi_db exists"

docker exec tpb-postgres psql -U postgres -lqt | grep -q ai_db
check "ai_db exists"

docker exec tpb-postgres psql -U postgres -lqt | grep -q media_db
check "media_db exists"

docker exec tpb-postgres psql -U postgres -lqt | grep -q audit_db
check "audit_db exists"

docker exec tpb-postgres psql -U postgres -lqt | grep -q object_schema_db
check "object_schema_db exists"

docker exec tpb-postgres psql -U postgres -lqt | grep -q layout_db
check "layout_db exists"

docker exec tpb-postgres psql -U postgres -lqt | grep -q cti_db
check "cti_db exists"

echo ""
echo "📊 Checking Tables..."
docker exec tpb-postgres psql -U postgres -d knowledge_db -c "\dt" | grep -q kb_articles
check "kb_articles table exists"

docker exec tpb-postgres psql -U postgres -d bfsi_db -c "\dt" | grep -q bank_products
check "bank_products table exists"

docker exec tpb-postgres psql -U postgres -d ai_db -c "\dt" | grep -q ai_requests
check "ai_requests table exists"

docker exec tpb-postgres psql -U postgres -d media_db -c "\dt" | grep -q media_files
check "media_files table exists"

docker exec tpb-postgres psql -U postgres -d audit_db -c "\dt" | grep -q audit_logs
check "audit_logs table exists"

docker exec tpb-postgres psql -U postgres -d object_schema_db -c "\dt" | grep -q object_types
check "object_types table exists"

docker exec tpb-postgres psql -U postgres -d layout_db -c "\dt" | grep -q layouts
check "layouts table exists"

docker exec tpb-postgres psql -U postgres -d cti_db -c "\dt" | grep -q cti_configs
check "cti_configs table exists"

echo ""
echo "🔌 Checking Kong Routes..."
curl -s http://localhost:8001/services/knowledge-service > /dev/null 2>&1
check "Knowledge Service in Kong"

curl -s http://localhost:8001/services/bfsi-core-service > /dev/null 2>&1
check "BFSI Service in Kong"

curl -s http://localhost:8001/services/ai-service > /dev/null 2>&1
check "AI Service in Kong"

curl -s http://localhost:8001/services/audit-service > /dev/null 2>&1
check "Audit Service in Kong"

echo ""
echo "📁 Checking Service Files..."
[ -f "services/knowledge-service/src/main.ts" ]
check "Knowledge Service exists"

[ -f "services/bfsi-core-service/src/main.ts" ]
check "BFSI Service exists"

[ -f "services/ai-service/src/main.ts" ]
check "AI Service exists"

[ -f "services/media-service/src/main.ts" ]
check "Media Service exists"

[ -f "services/audit-service/src/main.ts" ]
check "Audit Service exists"

[ -f "services/object-schema-service/src/main.ts" ]
check "Object Schema Service exists"

[ -f "services/layout-service/src/main.ts" ]
check "Layout Service exists"

[ -f "services/cti-adapter-service/src/main.ts" ]
check "CTI Adapter Service exists"

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "  RESULTS: $PASS passed, $FAIL failed"
echo "═══════════════════════════════════════════════════════════════"

if [ $FAIL -eq 0 ]; then
  echo "✅ Phase 2 verification PASSED"
  exit 0
else
  echo "❌ Phase 2 verification FAILED"
  exit 1
fi
