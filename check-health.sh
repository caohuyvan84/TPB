#!/bin/bash
services=(
  "identity-service:3001"
  "agent-service:3002"
  "interaction-service:3003"
  "ticket-service:3004"
  "customer-service:3005"
)

echo "Checking first 5 services health endpoints..."
for service in "${services[@]}"; do
  name="${service%%:*}"
  port="${service##*:}"
  echo -n "$name (port $port): "
  grep -q "app.listen(port)" "services/$name/src/main.ts" && echo "✅ Configured" || echo "❌ Missing"
done
