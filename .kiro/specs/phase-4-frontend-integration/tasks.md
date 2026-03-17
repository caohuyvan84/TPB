# Phase 4: Frontend-Backend Integration — Tasks

**Version:** 1.0
**Date:** 2026-03-09
**Duration:** 4-6 weeks
**Team:** 1 developer

---

## Task Breakdown

### Week 1: Foundation & Authentication

#### Task 1.1: Project Setup (Day 1)

**Dependencies to install:**
```bash
# WebSocket client (choose one approach)
npm install socket.io-client  # OR keep @stomp/stompjs 7.3.0

# Already installed (verify versions):
# - axios@1.13.6 ✓
# - @tanstack/react-query@5.90.21 ✓
# - @tanstack/react-query-devtools@5.91.3 ✓
# - react@19.2.4 ✓
# - react-router-dom@6.30.3 ✓
# - sonner@2.0.3 (for toast) ✓
```

**Note:** React 19.2.4 is already installed, not React 18!

**Checklist:**
- [ ] Decide: Socket.IO or keep STOMP for WebSocket
- [ ] Install socket.io-client (if chosen)
- [ ] Create `.env.development` with API URLs
- [ ] Update `vite.config.ts` with proxy configuration
- [ ] Test dev server starts successfully

**Files to create:**
- `.env.development`
- `.env.example`

**Estimated time:** 2 hours

---

#### Task 1.2: API Client Setup (Day 1-2)

**Files to create:**
- `src/lib/api/client.ts` — Axios instance with interceptors
- `src/lib/api/types.ts` — Shared API types
- `src/lib/api/errors.ts` — Error handling utilities

**Implementation:**
1. Create Axios instance with base URL from env
2. Add request interceptor for JWT token
3. Add response interceptor for 401 handling
4. Implement token refresh logic with queue
5. Add error transformation

**Checklist:**
- [ ] Axios instance configured
- [ ] Request interceptor attaches token
- [ ] Response interceptor handles 401
- [ ] Token refresh with request queue
- [ ] Error handling utilities
- [ ] TypeScript types defined

**Estimated time:** 4 hours

---

#### Task 1.3: WebSocket Client Setup (Day 2)

**Files to create:**
- `src/lib/ws/client.ts` — Socket.IO client wrapper
- `src/lib/ws/types.ts` — WebSocket event types

**Implementation:**
1. Create WebSocket client class
2. Implement connect/disconnect methods
3. Add auto-reconnect with exponential backoff
4. Add subscribe/unsubscribe methods
5. Add connection state tracking

**Checklist:**
- [ ] WebSocket client class created
- [ ] Connect/disconnect methods
- [ ] Auto-reconnect logic
- [ ] Subscribe/unsubscribe methods
- [ ] Connection state tracking
- [ ] Event type definitions

**Estimated time:** 3 hours

---

#### Task 1.4: Authentication Context (Day 2-3)

**Files to create:**
- `src/contexts/AuthContext.tsx` — Auth state management
- `src/lib/api/auth.ts` — Auth API endpoints

**Implementation:**
1. Create AuthContext with user state
2. Implement login method
3. Implement MFA verification
4. Implement logout method
5. Implement token refresh on mount
6. Connect WebSocket on login
7. Export getAccessToken for API client

**Checklist:**
- [ ] AuthContext created
- [ ] Login method implemented
- [ ] MFA verification implemented
- [ ] Logout method implemented
- [ ] Token refresh on mount
- [ ] WebSocket connection on login
- [ ] Global token accessor for API client

**Estimated time:** 4 hours

---

#### Task 1.5: Login Page (Day 3-4)

**Files to create:**
- `src/pages/LoginPage.tsx` — Login UI
- `src/components/MfaDialog.tsx` — MFA verification dialog

**Implementation:**
1. Create login form with username/password
2. Add form validation
3. Integrate with AuthContext.login()
4. Show MFA dialog if required
5. Handle login errors
6. Redirect to /agent on success

**Checklist:**
- [ ] Login form UI
- [ ] Form validation
- [ ] Login API integration
- [ ] MFA dialog
- [ ] Error handling
- [ ] Success redirect

**Estimated time:** 4 hours

---

#### Task 1.6: React Router Setup (Day 4)

**Files to modify:**
- `src/App.tsx` — Add React Router
- `src/main.tsx` — Wrap with QueryClientProvider

**Implementation:**
1. React Router already installed (react-router-dom@6.30.3)
2. Create route structure: `/login`, `/agent`
3. Create PrivateRoute component
4. Wrap App with QueryClientProvider (TanStack Query already installed)
5. Wrap App with AuthProvider

**Note:** React 19.2.4 specific considerations:
- Use `createBrowserRouter` and `RouterProvider` (React Router 6.30.3 compatible)
- React 19 has better Suspense support - use for lazy loading

**Checklist:**
- [ ] Routes defined with createBrowserRouter
- [ ] PrivateRoute component
- [ ] QueryClientProvider wrapper
- [ ] AuthProvider wrapper
- [ ] Redirect logic
- [ ] Test with React 19.2.4

**Estimated time:** 3 hours

---

#### Task 1.7: Testing Authentication (Day 4-5)

**Files to create:**
- `src/contexts/__tests__/AuthContext.test.tsx`
- `src/lib/api/__tests__/client.test.ts`

**Tests:**
1. Login success flow
2. Login failure handling
3. MFA verification
4. Token refresh on 401
5. Logout flow
6. WebSocket connection

**Checklist:**
- [ ] AuthContext tests
- [ ] API client tests
- [ ] Token refresh tests
- [ ] All tests passing

**Estimated time:** 4 hours

---

### Week 2: Interaction Queue Integration

#### Task 2.1: Interaction API Endpoints (Day 6)

**Files to create:**
- `src/lib/api/interactions.ts` — Interaction API methods
- `src/hooks/useInteractions.ts` — React Query hooks

**Implementation:**
1. Define API methods: getAll, getById, updateStatus, assign, transfer
2. Define request/response types
3. Create React Query hooks: useInteractions, useInteraction
4. Create mutation hooks: useUpdateStatus, useAssign, useTransfer

**Checklist:**
- [ ] API methods defined
- [ ] Types defined
- [ ] Query hooks created
- [ ] Mutation hooks created

**Estimated time:** 4 hours

---

#### Task 2.2: WebSocket Queue Channel (Day 6)

**Files to create:**
- `src/lib/ws/interaction-queue.ts` — Queue WebSocket channel

**Implementation:**
1. Define queue event types
2. Create subscribe/unsubscribe methods
3. Handle new/updated/removed events

**Checklist:**
- [ ] Event types defined
- [ ] Subscribe/unsubscribe methods
- [ ] Event handlers

**Estimated time:** 2 hours

---

#### Task 2.3: Update useInteractionStats Hook (Day 7)

**Files to modify:**
- `src/components/useInteractionStats.tsx`

**Implementation:**
1. Replace mock data with useInteractions hook
2. Keep existing filter logic
3. Add WebSocket subscription for real-time updates
4. Update cache on WebSocket events

**Checklist:**
- [ ] Mock data removed
- [ ] useInteractions integrated
- [ ] Filter logic preserved
- [ ] WebSocket subscription added
- [ ] Cache updates on events

**Estimated time:** 4 hours

---

#### Task 2.4: Update InteractionList Component (Day 7-8)

**Files to modify:**
- `src/components/InteractionList.tsx`

**Implementation:**
1. Add loading skeleton
2. Add error handling
3. Add empty state
4. Test with real API

**Checklist:**
- [ ] Loading skeleton
- [ ] Error handling
- [ ] Empty state
- [ ] Real API tested

**Estimated time:** 3 hours

---

#### Task 2.5: Interaction Detail API (Day 8)

**Files to create:**
- `src/hooks/useInteractionDetail.ts` — Detail query hooks
- `src/hooks/useInteractionNotes.ts` — Notes query/mutation hooks

**Implementation:**
1. Create useInteraction hook for detail
2. Create useInteractionNotes hook
3. Create useAddNote mutation
4. Create useUpdateNote mutation

**Checklist:**
- [ ] Detail hook created
- [ ] Notes hooks created
- [ ] Mutation hooks created

**Estimated time:** 3 hours

---

#### Task 2.6: Update InteractionDetail Component (Day 9-10)

**Files to modify:**
- `src/components/InteractionDetail.tsx`
- `src/components/CallNotes.tsx`

**Implementation:**
1. Replace mock data with useInteraction hook
2. Update CallNotes to use API
3. Add loading states
4. Add error handling

**Checklist:**
- [ ] Mock data removed
- [ ] API integration complete
- [ ] Loading states added
- [ ] Error handling added

**Estimated time:** 6 hours

---

### Week 3: Customer, Tickets, Notifications

#### Task 3.1: Customer API Integration (Day 11)

**Files to create:**
- `src/lib/api/customers.ts` — Customer API methods
- `src/hooks/useCustomers.ts` — Customer query hooks

**Implementation:**
1. Define API methods: getById, getInteractions, getTickets, getNotes, addNote
2. Create query hooks
3. Create mutation hooks

**Checklist:**
- [ ] API methods defined
- [ ] Query hooks created
- [ ] Mutation hooks created

**Estimated time:** 4 hours

---

#### Task 3.2: Update CustomerInfoScrollFixed (Day 11-12)

**Files to modify:**
- `src/components/CustomerInfoScrollFixed.tsx`

**Implementation:**
1. Replace mock data with useCustomer hook
2. Update tabs to use API
3. Add loading skeletons
4. Add error handling

**Checklist:**
- [ ] Mock data removed
- [ ] API integration complete
- [ ] Loading skeletons
- [ ] Error handling

**Estimated time:** 6 hours

---

#### Task 3.3: Ticket API Integration (Day 13)

**Files to create:**
- `src/lib/api/tickets.ts` — Ticket API methods
- `src/hooks/useTickets.ts` — Ticket query/mutation hooks

**Implementation:**
1. Define API methods: getAll, getById, create, update, addComment
2. Create query hooks
3. Create mutation hooks

**Checklist:**
- [ ] API methods defined
- [ ] Query hooks created
- [ ] Mutation hooks created

**Estimated time:** 4 hours

---

#### Task 3.4: Update CreateTicketDialog (Day 13-14)

**Files to modify:**
- `src/components/CreateTicketDialog.tsx`

**Implementation:**
1. Replace local state with useCreateTicket mutation
2. Add loading state during submission
3. Add error handling
4. Add success toast

**Checklist:**
- [ ] Mutation integrated
- [ ] Loading state
- [ ] Error handling
- [ ] Success toast

**Estimated time:** 3 hours

---

#### Task 3.5: Update TicketDetail (Day 14)

**Files to modify:**
- `src/components/TicketDetail.tsx`

**Implementation:**
1. Replace mock data with useTicket hook
2. Update comments to use API
3. Add loading states
4. Add error handling

**Checklist:**
- [ ] Mock data removed
- [ ] API integration complete
- [ ] Loading states
- [ ] Error handling

**Estimated time:** 4 hours

---

#### Task 3.6: Notification API Integration (Day 15)

**Files to create:**
- `src/lib/api/notifications.ts` — Notification API methods
- `src/lib/ws/notifications.ts` — Notification WebSocket channel
- `src/hooks/useNotifications.ts` — Notification hooks

**Implementation:**
1. Define API methods: getAll, updateState, markAllRead, getUnreadCount
2. Create WebSocket channel
3. Create query hooks
4. Create mutation hooks

**Checklist:**
- [ ] API methods defined
- [ ] WebSocket channel created
- [ ] Query hooks created
- [ ] Mutation hooks created

**Estimated time:** 4 hours

---

#### Task 3.7: Update NotificationContext (Day 15-16)

**Files to modify:**
- `src/components/NotificationContext.tsx`
- `src/components/NotificationCenter.tsx`

**Implementation:**
1. Replace mock data with useNotifications hook
2. Add WebSocket subscription for real-time push
3. Keep existing toast logic
4. Keep existing sound logic

**Checklist:**
- [ ] Mock data removed
- [ ] API integration complete
- [ ] WebSocket subscription
- [ ] Toast logic preserved
- [ ] Sound logic preserved

**Estimated time:** 4 hours

---

### Week 4: Advanced Features

#### Task 4.1: Agent Status API Integration (Day 17)

**Files to create:**
- `src/lib/api/agents.ts` — Agent API methods
- `src/lib/ws/agent-status.ts` — Agent status WebSocket channel
- `src/hooks/useAgents.ts` — Agent query/mutation hooks

**Implementation:**
1. Define API methods: getMe, getStatus, updateStatus
2. Create WebSocket channel
3. Create query hooks
4. Create mutation hooks

**Checklist:**
- [ ] API methods defined
- [ ] WebSocket channel created
- [ ] Query hooks created
- [ ] Mutation hooks created

**Estimated time:** 4 hours

---

#### Task 4.2: Update EnhancedAgentStatusContext (Day 17-18)

**Files to modify:**
- `src/components/EnhancedAgentStatusContext.tsx`
- `src/components/AgentStatusWidget.tsx`

**Implementation:**
1. Replace mock data with useAgentStatus hook
2. Update setChannelStatus to use API
3. Add WebSocket subscription
4. Keep existing timer logic
5. Keep existing keyboard shortcuts

**Checklist:**
- [ ] Mock data removed
- [ ] API integration complete
- [ ] WebSocket subscription
- [ ] Timer logic preserved
- [ ] Keyboard shortcuts preserved

**Estimated time:** 4 hours

---

#### Task 4.3: Knowledge Base API Integration (Day 18-19)

**Files to create:**
- `src/lib/api/knowledge.ts` — KB API methods
- `src/hooks/useKnowledge.ts` — KB query/mutation hooks

**Implementation:**
1. Define API methods: getFolders, getArticles, getById, addBookmark
2. Create query hooks
3. Create mutation hooks

**Checklist:**
- [ ] API methods defined
- [ ] Query hooks created
- [ ] Mutation hooks created

**Estimated time:** 4 hours

---

#### Task 4.4: Update KnowledgeBaseSearch (Day 19-20)

**Files to modify:**
- `src/components/KnowledgeBaseSearch.tsx`

**Implementation:**
1. Replace mock data with useKnowledge hooks
2. Add loading states
3. Add error handling

**Checklist:**
- [ ] Mock data removed
- [ ] API integration complete
- [ ] Loading states
- [ ] Error handling

**Estimated time:** 4 hours

---

#### Task 4.5: BFSI API Integration (Day 20-21)

**Files to create:**
- `src/lib/api/bfsi.ts` — BFSI API methods
- `src/hooks/useBfsi.ts` — BFSI query hooks

**Implementation:**
1. Define API methods: getAccounts, getSavings, getLoans, getCards, getTransactions
2. Create query hooks

**Checklist:**
- [ ] API methods defined
- [ ] Query hooks created

**Estimated time:** 4 hours

---

#### Task 4.6: Update InformationQuery (Day 21-22)

**Files to modify:**
- `src/components/InformationQuery.tsx`
- `src/components/CoreBFSI.tsx`
- `src/components/LoanDetailWithTabs.tsx`

**Implementation:**
1. Replace mock data with useBfsi hooks
2. Add loading states
3. Add error handling
4. Implement sensitive data toggle

**Checklist:**
- [ ] Mock data removed
- [ ] API integration complete
- [ ] Loading states
- [ ] Error handling
- [ ] Sensitive data toggle

**Estimated time:** 6 hours

---

#### Task 4.7: AI API Integration (Day 22-23)

**Files to create:**
- `src/lib/api/ai.ts` — AI API methods
- `src/hooks/useAi.ts` — AI mutation hooks

**Implementation:**
1. Define API methods: getSuggestions, generate, summarize
2. Create mutation hooks

**Checklist:**
- [ ] API methods defined
- [ ] Mutation hooks created

**Estimated time:** 3 hours

---

#### Task 4.8: Update AI Assistant Panel (Day 23)

**Files to modify:**
- `src/components/InteractionDetail.tsx` (AI panel section)

**Implementation:**
1. Replace mock suggestions with useAiSuggestions hook
2. Integrate generate mutation
3. Add loading states
4. Add error handling

**Checklist:**
- [ ] Mock data removed
- [ ] API integration complete
- [ ] Loading states
- [ ] Error handling

**Estimated time:** 4 hours

---

#### Task 4.9: Media API Integration (Day 24)

**Files to create:**
- `src/lib/api/media.ts` — Media API methods
- `src/hooks/useMedia.ts` — Media query hooks

**Implementation:**
1. Define API methods: getRecordings, getStreamUrl
2. Create query hooks

**Checklist:**
- [ ] API methods defined
- [ ] Query hooks created

**Estimated time:** 2 hours

---

#### Task 4.10: Update CallRecordingPlayer (Day 24)

**Files to modify:**
- `src/components/CallRecordingPlayer.tsx`

**Implementation:**
1. Replace mock recording URL with useRecording hook
2. Fetch stream URL on play
3. Add loading state
4. Add error handling

**Checklist:**
- [ ] Mock data removed
- [ ] API integration complete
- [ ] Loading state
- [ ] Error handling

**Estimated time:** 3 hours

---

#### Task 4.11: CTI Integration (Optional, Day 25)

**Files to create:**
- `src/lib/cti/adapter.ts` — CTI adapter interface
- `src/lib/cti/asterisk-adapter.ts` — Asterisk implementation
- `src/contexts/CTIContext.tsx` — CTI state management

**Implementation:**
1. Define CTI adapter interface
2. Implement Asterisk adapter (if available)
3. Create CTIContext
4. Update CallContext to use CTI adapter
5. Update FloatingCallWidget to use CTI methods

**Checklist:**
- [ ] CTI adapter interface defined
- [ ] Asterisk adapter implemented
- [ ] CTIContext created
- [ ] CallContext updated
- [ ] FloatingCallWidget updated

**Estimated time:** 8 hours (if CTI available)

---

### Week 5: Testing & Bug Fixes

#### Task 5.1: Unit Tests for API Client (Day 26)

**Files to create:**
- `src/lib/api/__tests__/client.test.ts`
- `src/lib/api/__tests__/auth.test.ts`
- `src/lib/api/__tests__/interactions.test.ts`

**Tests:**
1. Token attachment
2. Token refresh on 401
3. Error handling
4. Request queue during refresh

**Checklist:**
- [ ] Client tests
- [ ] Auth tests
- [ ] Interaction tests
- [ ] All tests passing

**Estimated time:** 6 hours

---

#### Task 5.2: Component Integration Tests (Day 27)

**Files to create:**
- `src/components/__tests__/InteractionList.test.tsx`
- `src/components/__tests__/CustomerInfoScrollFixed.test.tsx`
- `src/components/__tests__/CreateTicketDialog.test.tsx`

**Tests:**
1. Data loading
2. Loading states
3. Error handling
4. User interactions

**Checklist:**
- [ ] InteractionList tests
- [ ] CustomerInfo tests
- [ ] CreateTicket tests
- [ ] All tests passing

**Estimated time:** 6 hours

---

#### Task 5.3: E2E Tests (Day 28)

**Files to create:**
- `e2e/login.spec.ts`
- `e2e/interaction-queue.spec.ts`
- `e2e/ticket-management.spec.ts`
- `e2e/customer-info.spec.ts`

**Tests:**
1. Login flow
2. Queue navigation
3. Ticket creation
4. Customer info viewing

**Checklist:**
- [ ] Login test
- [ ] Queue test
- [ ] Ticket test
- [ ] Customer test
- [ ] All tests passing

**Estimated time:** 6 hours

---

#### Task 5.4: Performance Optimization (Day 29)

**Implementation:**
1. Add code splitting for heavy components
2. Add lazy loading for routes
3. Optimize React Query cache settings
4. Add prefetching on hover
5. Add debounced search

**Checklist:**
- [ ] Code splitting implemented
- [ ] Lazy loading implemented
- [ ] Cache optimized
- [ ] Prefetching added
- [ ] Debounced search added

**Estimated time:** 6 hours

---

#### Task 5.5: Error Handling Improvements (Day 29-30)

**Files to create:**
- `src/components/ErrorBoundary.tsx`
- `src/components/ConnectionStatus.tsx`
- `src/lib/toast.ts`

**Implementation:**
1. Add ErrorBoundary component
2. Add ConnectionStatus indicator
3. Improve toast notifications
4. Add retry logic for failed requests

**Checklist:**
- [ ] ErrorBoundary added
- [ ] ConnectionStatus added
- [ ] Toast improvements
- [ ] Retry logic added

**Estimated time:** 4 hours

---

#### Task 5.6: Bug Fixes & Polish (Day 30)

**Activities:**
1. Fix any bugs found during testing
2. Improve loading states
3. Improve error messages
4. Polish UI/UX

**Checklist:**
- [ ] All bugs fixed
- [ ] Loading states polished
- [ ] Error messages improved
- [ ] UI/UX polished

**Estimated time:** 6 hours

---

### Week 6: Final Testing & Deployment

#### Task 6.1: Integration Testing with Backend (Day 31-32)

**Activities:**
1. Test all API endpoints with real backend
2. Test WebSocket connections
3. Test error scenarios
4. Test edge cases

**Checklist:**
- [ ] All API endpoints tested
- [ ] WebSocket tested
- [ ] Error scenarios tested
- [ ] Edge cases tested

**Estimated time:** 12 hours

---

#### Task 6.2: Performance Testing (Day 33)

**Activities:**
1. Run Lighthouse audit
2. Test with slow network
3. Test with many interactions
4. Optimize bundle size

**Checklist:**
- [ ] Lighthouse score > 90
- [ ] Slow network tested
- [ ] Large dataset tested
- [ ] Bundle size optimized

**Estimated time:** 6 hours

---

#### Task 6.3: Security Review (Day 33)

**Activities:**
1. Review token storage
2. Review XSS prevention
3. Review CSRF protection
4. Review sensitive data handling

**Checklist:**
- [ ] Token storage secure
- [ ] XSS prevention verified
- [ ] CSRF protection verified
- [ ] Sensitive data handling verified

**Estimated time:** 4 hours

---

#### Task 6.4: Documentation (Day 34)

**Files to create:**
- `docs/API_INTEGRATION.md` — API integration guide
- `docs/DEPLOYMENT.md` — Deployment guide
- `docs/TROUBLESHOOTING.md` — Common issues

**Checklist:**
- [ ] API integration guide
- [ ] Deployment guide
- [ ] Troubleshooting guide

**Estimated time:** 4 hours

---

#### Task 6.5: Deployment Preparation (Day 34-35)

**Activities:**
1. Create production build
2. Test production build locally
3. Configure environment variables
4. Prepare deployment scripts

**Checklist:**
- [ ] Production build created
- [ ] Production build tested
- [ ] Environment variables configured
- [ ] Deployment scripts ready

**Estimated time:** 6 hours

---

#### Task 6.6: Staging Deployment (Day 35)

**Activities:**
1. Deploy to staging environment
2. Test on staging
3. Fix any issues
4. Get approval for production

**Checklist:**
- [ ] Deployed to staging
- [ ] Staging tested
- [ ] Issues fixed
- [ ] Approval received

**Estimated time:** 6 hours

---

#### Task 6.7: Production Deployment (Day 36)

**Activities:**
1. Deploy to production
2. Monitor for errors
3. Test critical paths
4. Document any issues

**Checklist:**
- [ ] Deployed to production
- [ ] Monitoring active
- [ ] Critical paths tested
- [ ] Issues documented

**Estimated time:** 4 hours

---

## Summary

**Total estimated time:** 180-220 hours (4.5-5.5 weeks for 1 developer)

**Critical path:**
1. Week 1: Authentication foundation
2. Week 2: Interaction queue (highest priority)
3. Week 3: Customer, tickets, notifications
4. Week 4: Advanced features (KB, BFSI, AI, media)
5. Week 5: Testing and bug fixes
6. Week 6: Final testing and deployment

**Risks:**
- Backend API instability → Mitigation: Use staging environment, thorough testing
- WebSocket connection issues → Mitigation: Robust reconnection logic, fallback to polling
- Performance issues → Mitigation: Code splitting, lazy loading, caching
- Large component refactoring → Mitigation: Incremental changes, preserve existing UI

---

*End of tasks.md*
