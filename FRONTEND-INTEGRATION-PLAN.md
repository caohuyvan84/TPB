# Frontend-Backend Integration Plan

**Date:** 2026-03-09  
**Status:** In Progress  
**Goal:** Replace all mock data with real backend APIs

## 📋 Executive Summary

Tích hợp Agent Desktop (React 19) với 18 backend microservices. Loại bỏ tất cả mock data, sử dụng real APIs qua Kong Gateway.

## 🎯 Objectives

1. Remove 90+ mock data locations
2. Implement API client with authentication
3. Use TanStack Query for data fetching
4. Implement error handling & loading states
5. Maintain UI/UX (no visual changes)

## 📊 Current State

**Frontend:**
- React 19.2.x + TanStack Query v5 ✅
- 14 components with mock data
- shadcn/ui + Tailwind CSS

**Backend:**
- 18 services operational ✅
- Kong Gateway: http://localhost:8000 ✅
- JWT authentication ready ✅
- 198/198 tests passing ✅

## 🔌 Backend APIs Available

### Phase 1: Core Services
- **MS-1 (3001):** Auth, users
- **MS-2 (3002):** Agents, status, heartbeat
- **MS-3 (3003):** Interactions, notes, timeline
- **MS-4 (3004):** Tickets, comments, history
- **MS-5 (3005):** Customers, notes, history
- **MS-6 (3006):** Notifications, unread count

### Phase 2: Advanced Services
- **MS-7 (3007):** Knowledge base, search, bookmarks
- **MS-8 (3008):** BFSI, accounts, loans, cards
- **MS-9 (3009):** AI suggestions, summarization
- **MS-10 (3010):** Media, call recordings
- **MS-11 (3011):** Audit logs
- **MS-13 (3013):** Object schema
- **MS-14 (3014):** Layouts
- **MS-19 (3019):** CTI call control

### Phase 3: Automation Services
- **MS-15 (3015):** Workflows
- **MS-16 (3016):** Data enrichment
- **MS-17 (3017):** Dashboards
- **MS-18 (3018):** Reports

## 🛠️ Implementation Plan

### Week 1: Foundation & Core

**Day 1-2: API Client Setup** ✅
- [x] Create `lib/api-client.ts` with axios
- [x] Implement token refresh interceptor
- [x] Create API service modules (11 modules)
- [x] Add environment variables
- [x] Create custom hooks (5 hooks)
- [x] Create API types

**Day 3-4: Authentication** ✅
- [x] Create `contexts/AuthContext.tsx`
- [x] Create `pages/Login.tsx`
- [x] Update `App.tsx` with auth routing
- [x] Create `AppRouter.tsx`
- [ ] Test login/logout flow (needs backend)

**Day 5: Core Integrations** 🟡 In Progress
- [x] App.tsx → use useInteractions() hook
- [ ] Replace mock data in components:
  - [ ] AgentStatusWidget → useAgentStatus()
  - [ ] NotificationCenter → useNotifications()
  - [ ] CustomerInfo → useCustomer()
  - [ ] TicketDetail → real API

### Week 2: Essential Features

**Day 1-2: Customer & Ticket**
- [ ] CustomerInfo → real API (36 mocks)
- [ ] CustomerSelection → real API (3 mocks)
- [ ] TicketDetail → real API
- [ ] CreateTicketDialog → real POST

**Day 3-4: Interaction Details**
- [ ] InteractionDetail → real API
- [ ] CallNotes → real API (3 mocks)
- [ ] CallTimeline → real API (2 mocks)

**Day 5: Polling & Heartbeat**
- [ ] Agent heartbeat (30s)
- [ ] Notification polling (10s)
- [ ] Queue polling (5s)

### Week 3: Advanced Features

**Day 1-2: Knowledge & BFSI**
- [ ] KnowledgeBaseSearch → real API (7 mocks)
- [ ] CoreBFSI → real API (10 mocks)
- [ ] InformationQuery → real API (8 mocks)
- [ ] LoanDetailWithTabs → real API (1 mock)

**Day 3-4: AI & Media**
- [ ] AIAssistantChat → real API
- [ ] ai-assistant/utils.ts → real API (2 mocks)
- [ ] CallRecordingPlayer → real API (1 mock)

**Day 5: CTI Integration**
- [ ] FloatingCallWidget → real CTI
- [ ] CallContext → real call control

### Week 4: Polish & Testing

**Day 1-2: Error Handling**
- [ ] Add ErrorBoundary
- [ ] Add loading skeletons
- [ ] Add toast notifications

**Day 3-4: Testing**
- [ ] Test all API integrations
- [ ] Test error scenarios
- [ ] Test token refresh

**Day 5: Documentation**
- [ ] Update README
- [ ] Document environment variables
- [ ] Create troubleshooting guide

## 📝 Implementation Checklist

### Setup (Day 1-2)
- [x] API client with axios ✅
- [x] Token refresh interceptor ✅
- [x] API service modules (11 modules) ✅
- [x] Environment variables ✅
- [x] Custom hooks (5 hooks) ✅
- [ ] Update App.tsx with AuthProvider
- [ ] Add routing for Login page

### Authentication (Day 3-4)
- [ ] AuthContext
- [ ] Login page
- [ ] Auth routing
- [ ] Token storage

### Core Features (Week 1-2)
- [ ] Interactions (5 components)
- [ ] Agents (2 components)
- [ ] Customers (2 components)
- [ ] Tickets (2 components)
- [ ] Notifications (1 component)

### Advanced Features (Week 3)
- [ ] Knowledge Base (1 component)
- [ ] BFSI (3 components)
- [ ] AI Assistant (2 components)
- [ ] Media (1 component)
- [ ] CTI (2 components)

### Polish (Week 4)
- [ ] Error handling
- [ ] Loading states
- [ ] Testing
- [ ] Documentation

## 🔧 Configuration

### Environment Variables
```bash
VITE_API_BASE_URL=http://localhost:8000
VITE_WS_URL=ws://localhost:8000
VITE_ENABLE_DEVTOOLS=true
```

### Dependencies
```json
{
  "dependencies": {
    "@tanstack/react-query": "^5.0.0",
    "axios": "^1.6.0"
  }
}
```

## 📊 Success Metrics

- [ ] Zero mock data remaining
- [ ] All API calls through Kong
- [ ] Token refresh automatic
- [ ] Error handling complete
- [ ] No visual changes
- [ ] API calls < 500ms P99

## 🚨 Risks

1. **Backend not running** → Docker-compose all services
2. **API format mismatch** → TypeScript interfaces
3. **Token expiration** → Auto-refresh
4. **Performance** → TanStack Query caching

## 🎯 Next Steps After Integration

1. WebSocket (replace polling)
2. Offline support
3. Performance optimization
4. Dashboard view

---

**Estimated Duration:** 4 weeks  
**Team Size:** 2-3 developers  
**Dependencies:** All 18 services operational ✅
