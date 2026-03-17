#!/bin/bash
# Run all SQL migrations for all services

set -e

echo "🚀 Running SQL migrations for all services..."
echo ""

# Service to database mapping
declare -A SERVICE_DB=(
  ["identity-service"]="identity_db"
  ["agent-service"]="agent_db"
  ["interaction-service"]="interaction_db"
  ["ticket-service"]="ticket_db"
  ["customer-service"]="customer_db"
  ["notification-service"]="notification_db"
  ["knowledge-service"]="knowledge_db"
  ["bfsi-core-service"]="bfsi_core_db"
  ["ai-service"]="ai_db"
  ["media-service"]="media_db"
  ["audit-service"]="audit_db"
  ["object-schema-service"]="object_schema_db"
  ["layout-service"]="layout_db"
  ["workflow-service"]="workflow_db"
  ["data-enrichment-service"]="data_enrichment_db"
  ["dashboard-service"]="dashboard_db"
  ["report-service"]="report_db"
  ["cti-adapter-service"]="cti_adapter_db"
)

MIGRATIONS_DIR="/opt/project/AgentdesktopTPB/services"
SUCCESS_COUNT=0
FAIL_COUNT=0

for service in "${!SERVICE_DB[@]}"; do
  db="${SERVICE_DB[$service]}"
  schema_file="$MIGRATIONS_DIR/$service/src/migrations/schema.sql"
  
  if [ -f "$schema_file" ]; then
    echo "📦 $service → $db"
    
    # Check if schema.sql has content
    if [ -s "$schema_file" ]; then
      # Run migration
      if docker exec tpb-postgres psql -U postgres -d "$db" -f "/opt/project/AgentdesktopTPB/services/$service/src/migrations/schema.sql" > /dev/null 2>&1; then
        echo "   ✅ Success"
        ((SUCCESS_COUNT++))
      else
        echo "   ❌ Failed"
        ((FAIL_COUNT++))
      fi
    else
      echo "   ⚠️  Empty schema.sql"
    fi
  else
    echo "📦 $service → $db"
    echo "   ⚠️  No schema.sql found"
  fi
  echo ""
done

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Success: $SUCCESS_COUNT"
echo "❌ Failed: $FAIL_COUNT"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Run seed data for identity service
if [ -f "$MIGRATIONS_DIR/identity-service/src/migrations/seed.sql" ]; then
  echo ""
  echo "🌱 Running seed data for identity-service..."
  if docker exec tpb-postgres psql -U postgres -d identity_db -f "/opt/project/AgentdesktopTPB/services/identity-service/src/migrations/seed.sql" > /dev/null 2>&1; then
    echo "   ✅ Seed data loaded"
  else
    echo "   ❌ Seed data failed"
  fi
fi

echo ""
echo "🎉 Migration complete!"
