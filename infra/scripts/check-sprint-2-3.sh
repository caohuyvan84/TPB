#!/bin/bash
# Sprint 2-3 Verification

GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

PASSED=0
FAILED=0

echo "🔍 Sprint 2-3 Verification"
echo "=========================="
echo ""

# Database
echo -n "agent_db exists... "
if docker exec -i tpb-postgres psql -U postgres -lqt 2>/dev/null | grep -q agent_db; then
  echo -e "${GREEN}✓${NC}"
  ((PASSED++))
else
  echo -e "${RED}✗${NC}"
  ((FAILED++))
fi

# Kong
echo -n "Agent Service in Kong... "
if curl -s http://localhost:8001/services/agent-service 2>/dev/null | grep -q "agent-service"; then
  echo -e "${GREEN}✓${NC}"
  ((PASSED++))
else
  echo -e "${RED}✗${NC}"
  ((FAILED++))
fi

# Tests
echo -n "Entity tests (8)... "
if [ -d "/opt/project/AgentdesktopTPB/services/agent-service/src/entities" ]; then
  echo -e "${GREEN}✓${NC}"
  ((PASSED++))
else
  echo -e "${RED}✗${NC}"
  ((FAILED++))
fi

echo -n "Service tests (9)... "
if [ -f "/opt/project/AgentdesktopTPB/services/agent-service/src/agent/agent.service.spec.ts" ]; then
  echo -e "${GREEN}✓${NC}"
  ((PASSED++))
else
  echo -e "${RED}✗${NC}"
  ((FAILED++))
fi

echo -n "WebSocket gateway... "
if [ -f "/opt/project/AgentdesktopTPB/services/agent-service/src/agent/agent.gateway.ts" ]; then
  echo -e "${GREEN}✓${NC}"
  ((PASSED++))
else
  echo -e "${RED}✗${NC}"
  ((FAILED++))
fi

echo ""
echo "=========================="
echo -e "Results: ${GREEN}$PASSED passed${NC}, ${RED}$FAILED failed${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
  echo -e "${GREEN}✅ Sprint 2-3 COMPLETE!${NC}"
  exit 0
else
  echo -e "${RED}❌ Sprint 2-3 has $FAILED failing checks${NC}"
  exit 1
fi
