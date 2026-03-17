#!/bin/bash
# Phase 3 Verification Script

set -e

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║         Phase 3: Automation & Analytics - Verification       ║"
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

# Database checks
echo "📊 Checking databases..."
docker exec tpb-postgres psql -U postgres -lqt | cut -d \| -f 1 | grep -qw workflow_db
check "workflow_db exists"

docker exec tpb-postgres psql -U postgres -lqt | cut -d \| -f 1 | grep -qw enrichment_db
check "enrichment_db exists"

docker exec tpb-postgres psql -U postgres -lqt | cut -d \| -f 1 | grep -qw dashboard_db
check "dashboard_db exists"

docker exec tpb-postgres psql -U postgres -lqt | cut -d \| -f 1 | grep -qw report_db
check "report_db exists"

# Table checks
echo ""
echo "📋 Checking tables..."
docker exec tpb-postgres psql -U postgres -d workflow_db -c "\dt" | grep -q workflow_definitions
check "workflow_definitions table exists"

docker exec tpb-postgres psql -U postgres -d enrichment_db -c "\dt" | grep -q enrichment_sources
check "enrichment_sources table exists"

docker exec tpb-postgres psql -U postgres -d dashboard_db -c "\dt" | grep -q dashboards
check "dashboards table exists"

docker exec tpb-postgres psql -U postgres -d report_db -c "\dt" | grep -q reports
check "reports table exists"

# Service file checks
echo ""
echo "📁 Checking service files..."
[ -f "services/workflow-service/src/workflow/workflow.service.ts" ]
check "WorkflowService exists"

[ -f "services/data-enrichment-service/src/enrichment/enrichment.service.ts" ]
check "EnrichmentService exists"

[ -f "services/dashboard-service/src/dashboard/dashboard.service.ts" ]
check "DashboardService exists"

[ -f "services/report-service/src/report/report.service.ts" ]
check "ReportService exists"

# Test checks
echo ""
echo "🧪 Running tests..."
npx nx test workflow-service --runInBand > /dev/null 2>&1
check "Workflow Service tests pass"

npx nx test data-enrichment-service --runInBand > /dev/null 2>&1
check "Data Enrichment Service tests pass"

npx nx test dashboard-service --runInBand > /dev/null 2>&1
check "Dashboard Service tests pass"

npx nx test report-service --runInBand > /dev/null 2>&1
check "Report Service tests pass"

# Summary
echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                      Verification Summary                    ║"
echo "╠══════════════════════════════════════════════════════════════╣"
echo "║  ✅ Passed: $PASS                                                 ║"
echo "║  ❌ Failed: $FAIL                                                  ║"
echo "╚══════════════════════════════════════════════════════════════╝"

if [ $FAIL -eq 0 ]; then
  echo ""
  echo "🎉 Phase 3 verification PASSED! All 4 services operational."
  exit 0
else
  echo ""
  echo "⚠️  Phase 3 verification FAILED. Please check errors above."
  exit 1
fi
