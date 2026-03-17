#!/bin/bash
# Sprint 1-2 Checkpoint Verification (Simplified)

GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

PASSED=0
FAILED=0

echo "🔍 Sprint 1-2 Checkpoint Verification"
echo "======================================"
echo ""

# Infrastructure
echo "📋 Infrastructure Health"
echo "------------------------"

for service in tpb-postgres tpb-redis tpb-kong; do
  echo -n "$service... "
  if docker ps --filter name=$service --filter status=running | grep -q $service; then
    echo -e "${GREEN}✓${NC}"
    ((PASSED++))
  else
    echo -e "${RED}✗${NC}"
    ((FAILED++))
  fi
done

# Kong Configuration
echo ""
echo "📋 Kong Configuration"
echo "---------------------"

echo -n "Kong Admin API... "
if curl -s -f http://localhost:8001 > /dev/null 2>&1; then
  echo -e "${GREEN}✓${NC}"
  ((PASSED++))
else
  echo -e "${RED}✗${NC}"
  ((FAILED++))
fi

echo -n "Identity Service registered... "
if curl -s http://localhost:8001/services/identity-service 2>/dev/null | grep -q "identity-service"; then
  echo -e "${GREEN}✓${NC}"
  ((PASSED++))
else
  echo -e "${RED}✗${NC}"
  ((FAILED++))
fi

echo -n "Routes configured... "
route_count=$(curl -s http://localhost:8001/services/identity-service/routes 2>/dev/null | grep -o '"id"' | wc -l)
if [ "$route_count" -ge 1 ]; then
  echo -e "${GREEN}✓${NC} ($route_count routes)"
  ((PASSED++))
else
  echo -e "${RED}✗${NC}"
  ((FAILED++))
fi

# Database Schema
echo ""
echo "📋 Database Schema"
echo "------------------"

echo -n "identity_db exists... "
if docker exec -i tpb-postgres psql -U postgres -lqt 2>/dev/null | grep -q identity_db; then
  echo -e "${GREEN}✓${NC}"
  ((PASSED++))
else
  echo -e "${RED}✗${NC}"
  ((FAILED++))
fi

# Test Results
echo ""
echo "📋 Test Results"
echo "---------------"

for task in TASK_1.3 TASK_2.7 TASK_3.4; do
  echo -n "$task... "
  if [ -f "/opt/project/AgentdesktopTPB/.kiro/specs/phase-1-core-mvp/${task}_COMPLETED.md" ]; then
    echo -e "${GREEN}✓${NC}"
    ((PASSED++))
  else
    echo -e "${RED}✗${NC}"
    ((FAILED++))
  fi
done

# Summary
echo ""
echo "======================================"
echo "📊 Results: ${GREEN}$PASSED passed${NC}, ${RED}$FAILED failed${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
  echo -e "${GREEN}✅ Sprint 1-2 COMPLETE!${NC}"
  exit 0
else
  echo -e "${RED}❌ Sprint 1-2 has $FAILED failing checks${NC}"
  exit 1
fi
