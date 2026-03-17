#!/bin/bash

# Run migrations for all services
echo "🔄 Running migrations for all services..."

SERVICES=(
  "identity-service"
  "agent-service" 
  "interaction-service"
  "ticket-service"
  "customer-service"
  "notification-service"
  "knowledge-service"
  "bfsi-core-service"
  "ai-service"
  "media-service"
  "audit-service"
  "object-schema-service"
  "layout-service"
  "workflow-service"
  "data-enrichment-service"
  "dashboard-service"
  "report-service"
  "cti-adapter-service"
)

SUCCESS=0
FAILED=0

for service in "${SERVICES[@]}"; do
  echo "📦 Running migrations for $service..."
  
  if [ -d "services/$service" ]; then
    cd "services/$service"
    
    # Try different migration commands
    if npm run migration:run >/dev/null 2>&1; then
      echo "✅ $service - migrations completed"
      ((SUCCESS++))
    elif npm run typeorm:migration:run >/dev/null 2>&1; then
      echo "✅ $service - migrations completed"
      ((SUCCESS++))
    elif npx typeorm migration:run >/dev/null 2>&1; then
      echo "✅ $service - migrations completed"
      ((SUCCESS++))
    else
      echo "❌ $service - migration failed"
      ((FAILED++))
    fi
    
    cd "../.."
  else
    echo "⚠️  $service - directory not found"
    ((FAILED++))
  fi
done

echo ""
echo "📊 Migration Summary:"
echo "✅ Success: $SUCCESS"
echo "❌ Failed: $FAILED"
echo "📋 Total: $((SUCCESS + FAILED))"

if [ $SUCCESS -gt 0 ]; then
  echo ""
  echo "🔍 Checking database tables..."
  docker exec tpb-postgres psql -U postgres -d identity_db -c "\dt"
fi
