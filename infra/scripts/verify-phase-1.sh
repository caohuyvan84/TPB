#!/bin/bash
# Phase 1 Exit Criteria Verification

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                                                              ║"
echo "║           PHASE 1 EXIT CRITERIA VERIFICATION                 ║"
echo "║                                                              ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

PASS=0
FAIL=0

# Check 1: All 6 services have databases
echo "📊 Check 1: Database Setup"
for db in identity_db agent_db interaction_db ticket_db customer_db notification_db; do
  if docker exec tpb-postgres psql -U postgres -lqt | cut -d \| -f 1 | grep -qw $db; then
    echo "  ✅ $db exists"
    ((PASS++))
  else
    echo "  ❌ $db missing"
    ((FAIL++))
  fi
done

# Check 2: All services have migrations run
echo ""
echo "📊 Check 2: Database Tables"
TABLES=(
  "identity_db:users:5"
  "agent_db:agent_profiles:3"
  "interaction_db:interactions:3"
  "ticket_db:tickets:3"
  "customer_db:customers:2"
  "notification_db:notifications:1"
)

for item in "${TABLES[@]}"; do
  IFS=':' read -r db table expected <<< "$item"
  count=$(docker exec tpb-postgres psql -U postgres -d $db -tAc "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public'")
  if [ "$count" -ge "$expected" ]; then
    echo "  ✅ $db has $count tables (expected ≥$expected)"
    ((PASS++))
  else
    echo "  ❌ $db has $count tables (expected ≥$expected)"
    ((FAIL++))
  fi
done

# Check 3: Kong services configured
echo ""
echo "📊 Check 3: Kong API Gateway"
SERVICES=(identity-service agent-service interaction-service ticket-service customer-service notification-service)
for svc in "${SERVICES[@]}"; do
  if curl -s http://localhost:8001/services/$svc | grep -q "\"name\":\"$svc\""; then
    echo "  ✅ $svc configured in Kong"
    ((PASS++))
  else
    echo "  ❌ $svc not in Kong"
    ((FAIL++))
  fi
done

# Check 4: All tests passing
echo ""
echo "📊 Check 4: Test Coverage"
SERVICES_TEST=(identity-service agent-service interaction-service ticket-service customer-service notification-service)
TOTAL_TESTS=0
PASSED_TESTS=0

for svc in "${SERVICES_TEST[@]}"; do
  result=$(cd /opt/project/AgentdesktopTPB && npx nx test $svc --runInBand 2>&1 | grep "Tests:" | head -1)
  if echo "$result" | grep -q "passed"; then
    tests=$(echo "$result" | grep -oP '\d+(?= passed)' | head -1)
    echo "  ✅ $svc: $tests tests passing"
    PASSED_TESTS=$((PASSED_TESTS + tests))
    ((PASS++))
  else
    echo "  ❌ $svc: tests failed"
    ((FAIL++))
  fi
done

# Check 5: Infrastructure services
echo ""
echo "📊 Check 5: Infrastructure Services"
if docker ps | grep -q tpb-postgres; then
  echo "  ✅ PostgreSQL running"
  ((PASS++))
else
  echo "  ❌ PostgreSQL not running"
  ((FAIL++))
fi

if docker ps | grep -q tpb-redis; then
  echo "  ✅ Redis running"
  ((PASS++))
else
  echo "  ❌ Redis not running"
  ((FAIL++))
fi

if docker ps | grep -q tpb-kong; then
  echo "  ✅ Kong running"
  ((PASS++))
else
  echo "  ❌ Kong not running"
  ((FAIL++))
fi

# Summary
echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                         SUMMARY                              ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""
echo "  ✅ Passed: $PASS"
echo "  ❌ Failed: $FAIL"
echo "  📊 Total Tests: $PASSED_TESTS"
echo ""

if [ $FAIL -eq 0 ]; then
  echo "🎉 ALL EXIT CRITERIA MET - PHASE 1 COMPLETE!"
  exit 0
else
  echo "⚠️  Some checks failed - review above"
  exit 1
fi
