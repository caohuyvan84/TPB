#!/bin/bash

# Run SQL migrations for all services
echo "🔄 Running SQL migrations for all services..."

SERVICES=(
  "identity-service:identity_db"
  "agent-service:agent_db"
  "interaction-service:interaction_db"
  "ticket-service:ticket_db"
  "customer-service:customer_db"
  "notification-service:notification_db"
  "knowledge-service:knowledge_db"
  "bfsi-core-service:bfsi_db"
  "ai-service:ai_db"
  "media-service:media_db"
  "audit-service:audit_db"
  "object-schema-service:object_schema_db"
  "layout-service:layout_db"
  "workflow-service:workflow_db"
  "data-enrichment-service:enrichment_db"
  "dashboard-service:dashboard_db"
  "report-service:report_db"
  "cti-adapter-service:cti_db"
)

SUCCESS=0
FAILED=0

for service_db in "${SERVICES[@]}"; do
  IFS=':' read -r service db <<< "$service_db"
  echo "📦 Running migrations for $service -> $db..."
  
  if [ -f "services/$service/src/migrations/schema.sql" ]; then
    if docker exec -i tpb-postgres psql -U postgres -d $db < "services/$service/src/migrations/schema.sql" >/dev/null 2>&1; then
      echo "✅ $service - schema migration completed"
      
      # Run seed if exists
      if [ -f "services/$service/src/migrations/seed.sql" ]; then
        docker exec -i tpb-postgres psql -U postgres -d $db < "services/$service/src/migrations/seed.sql" >/dev/null 2>&1
        echo "✅ $service - seed data completed"
      fi
      
      ((SUCCESS++))
    else
      echo "❌ $service - migration failed"
      ((FAILED++))
    fi
  else
    echo "⚠️  $service - no schema.sql found"
    ((FAILED++))
  fi
done

echo ""
echo "📊 Migration Summary:"
echo "✅ Success: $SUCCESS"
echo "❌ Failed: $FAILED"
echo "📋 Total: $((SUCCESS + FAILED))"

echo ""
echo "🔍 Checking database tables..."
for db in identity_db agent_db interaction_db ticket_db customer_db; do
  echo "=== $db ==="
  docker exec tpb-postgres psql -U postgres -d $db -c "\dt" 2>/dev/null | head -5
done
