# Phase 4: Frontend-Backend Integration — Requirements

**Version:** 1.0
**Date:** 2026-03-09
**Baseline:** Phase 1-3 Complete (All 18 backend services operational)
**Goal:** Replace ALL mock data in Agent Desktop with real API calls

---

## 1. Overview

### Current State (2026-03-09)

**Backend:** ✅ Complete (Phase 0-3 Done)
- **18 microservices operational** (MS-1 to MS-19, excluding MS-12)
  - Phase 1: MS-1 (Identity), MS-2 (Agent), MS-3 (Interaction), MS-4 (Ticket), MS-5 (Customer), MS-6 (Notification)
  - Phase 2: MS-7 (Knowledge), MS-8 (BFSI), MS-9 (AI), MS-10 (Media), MS-11 (Audit), MS-13 (Object Schema), MS-14 (Layout), MS-19 (CTI)
  - Phase 3: MS-15 (Workflow), MS-16 (Data Enrichment), MS-17 (Dashboard), MS-18 (Report)
- **198 tests passing** (100% coverage)
- All databases initialized (PostgreSQL 18.3)
- Kong API Gateway configured with rate limiting & CORS
- Redis 8.6 for caching and sessions
- Kafka 4.2.0 (KRaft mode) for events
- SeaweedFS for file storage (replaces MinIO)

**Frontend:** ⚠️ Mock Data Only
- **React 19.2.4** (not 18!) - Agent Desktop UI complete
- 97 files, ~35K lines of code
- All interactions, customers, tickets, notifications are hardcoded in `App.tsx`
- No API client configured (no axios, no TanStack Query)
- No authentication flow (no login page)
- No WebSocket connections (no Socket.IO client)
- Using Vite 7.0.0 + SWC for fast builds

### Phase 4 Goal

Transform Agent Desktop from **prototype with mock data** to **production-ready application with real backend integration**.

---

## 2. Integration Scope

### 2.1 Core Services (Phase 1 Backend)

| Service | Frontend Component | Mock Data Location | Integration Type |
|---|---|---|---|
| MS-1 Identity | Login flow, AuthContext | None (new) | REST + JWT |
| MS-2 Agent | AgentStatusWidget, EnhancedAgentStatusContext | App.tsx mock agent | REST + WebSocket |
| MS-3 Interaction | InteractionList, InteractionDetail, useInteractionStats | App.tsx interactions array | REST + WebSocket |
| MS-4 Ticket | CreateTicketDialog, TicketDetail | App.tsx tickets array | REST |
| MS-5 Customer | CustomerInfoScrollFixed | App.tsx customers array | REST |
| MS-6 Notification | NotificationCenter, NotificationContext | App.tsx notifications array | REST + WebSocket |

### 2.2 Advanced Services (Phase 2 Backend)

| Service | Frontend Component | Mock Data Location | Integration Type |
|---|---|---|---|
| MS-7 Knowledge | KnowledgeBaseSearch | App.tsx KB folders/articles | REST |
| MS-8 BFSI | InformationQuery, CoreBFSI, LoanDetailWithTabs | App.tsx BFSI products | REST |
| MS-9 AI | AI Assistant panel in InteractionDetail | App.tsx AI suggestions | REST |
| MS-10 Media | CallRecordingPlayer | App.tsx recording URLs | REST (pre-signed URLs) |
| MS-19 CTI | FloatingCallWidget, CallContext | App.tsx call state | WebSocket |

### 2.3 Out of Scope (Phase 4)

- Admin Module (separate phase)
- Dynamic Object Schema rendering (MS-13, MS-14)
- Workflow automation UI (MS-15)
- Data enrichment progressive loading (MS-16)
- Dashboard widgets (MS-17)
- Report viewer (MS-18)

---

## 3. User Stories

### US-26: Agent Authentication

**As** a customer service agent,
**I want** to log in with my username, password, and MFA code,
**So that** I can access the Agent Desktop securely.

#### Acceptance Criteria

**AC-26.1 — Login Page**
- Given the agent is not authenticated
- When they navigate to the app
- Then they see a login page with username, password, and "Đăng nhập" button

**AC-26.2 — Successful Login**
- When valid credentials are submitted
- Then the API returns JWT tokens
- And the agent is redirected to the Agent Desktop
- And the access token is stored in memory
- And the refresh token is stored in httpOnly cookie

**AC-26.3 — MFA Challenge**
- When the user has MFA enabled
- Then after valid credentials, a TOTP code input is shown
- And the agent must enter the 6-digit code to proceed

**AC-26.4 — Failed Login**
- When invalid credentials are submitted
- Then an error message is shown: "Tên đăng nhập hoặc mật khẩu không đúng"
- And the remaining attempts count is displayed

**AC-26.5 — Session Persistence**
- When the agent refreshes the page
- Then they remain logged in (via refresh token)
- And the access token is automatically refreshed

**AC-26.6 — Logout**
- When the agent clicks "Đăng xuất"
- Then the session is revoked server-side
- And they are redirected to the login page

---

### US-27: Real-Time Interaction Queue

**As** a customer service agent,
**I want** to see real interactions from the database in the queue,
**So that** I can work on actual customer requests.

#### Acceptance Criteria

**AC-27.1 — Queue Load**
- When the agent logs in
- Then the interaction list loads from `GET /api/v1/interactions`
- And displays all interactions with correct status, channel, priority

**AC-27.2 — Filter by Channel**
- When the agent selects "Voice" filter
- Then only voice interactions are shown
- And the API is called with `?channel=voice`

**AC-27.3 — Filter by Status Tab**
- When the agent clicks "Hàng chờ" tab
- Then only `status=new` interactions are shown
- And the API is called with `?statusTab=queue`

**AC-27.4 — Search**
- When the agent types "Nguyễn" in the search box
- Then the API is called with `?search=Nguyễn`
- And matching interactions are displayed

**AC-27.5 — Real-Time Updates**
- When a new interaction arrives (via WebSocket)
- Then it appears in the queue without page refresh
- And a notification is shown

**AC-27.6 — SLA Countdown**
- When a chat interaction has `sla.status: "near-breach"`
- Then the SLA badge shows a countdown timer
- And updates every second via WebSocket

---

### US-28: Customer Information Panel

**As** a customer service agent,
**I want** to see real customer data from the database,
**So that** I can provide personalized service.

#### Acceptance Criteria

**AC-28.1 — Customer Profile Load**
- When the agent opens an interaction
- Then the customer profile loads from `GET /api/v1/customers/{id}`
- And displays: name, CIF, phone, email, segment, VIP status

**AC-28.2 — Interaction History**
- When the agent clicks the "Lịch sử" tab
- Then past interactions load from `GET /api/v1/customers/{id}/interactions`
- And are displayed in reverse chronological order

**AC-28.3 — Ticket History**
- When the agent clicks the "Ticket" tab
- Then customer tickets load from `GET /api/v1/customers/{id}/tickets`
- And show ticket status, priority, created date

**AC-28.4 — Customer Notes**
- When the agent adds a note
- Then it is saved via `POST /api/v1/customers/{id}/notes`
- And appears in the notes list immediately

---

### US-29: Ticket Management

**As** a customer service agent,
**I want** to create and manage tickets with real data,
**So that** customer issues are tracked properly.

#### Acceptance Criteria

**AC-29.1 — Create Ticket**
- When the agent fills the ticket form and clicks "Tạo Ticket"
- Then the ticket is created via `POST /api/v1/tickets`
- And a success message is shown
- And the ticket appears in the customer's ticket list

**AC-29.2 — Ticket Detail Load**
- When the agent opens a ticket
- Then the detail loads from `GET /api/v1/tickets/{id}`
- And displays: title, description, status, priority, comments

**AC-29.3 — Update Ticket**
- When the agent changes ticket status or priority
- Then the update is saved via `PATCH /api/v1/tickets/{id}`
- And the change is reflected immediately

**AC-29.4 — Add Comment**
- When the agent adds a comment
- Then it is saved via `POST /api/v1/tickets/{id}/comments`
- And appears in the comment list

---

### US-30: Agent Status Management

**As** a customer service agent,
**I want** my status changes to sync with the server,
**So that** my availability is accurately tracked.

#### Acceptance Criteria

**AC-30.1 — Status Load**
- When the agent logs in
- Then their current status loads from `GET /api/v1/agents/me/status`
- And displays the correct ready/not-ready state per channel

**AC-30.2 — Status Change**
- When the agent changes voice status to "Not Ready - Lunch"
- Then the change is saved via `PUT /api/v1/agents/me/status/voice`
- And the status pill updates immediately

**AC-30.3 — Status Persistence**
- When the agent refreshes the page
- Then their status is restored from the server
- And the duration timer continues from the correct value

**AC-30.4 — Real-Time Sync**
- When the agent's status is changed by a supervisor
- Then the change is pushed via WebSocket
- And the UI updates automatically

---

### US-31: Notifications

**As** a customer service agent,
**I want** to receive real-time notifications,
**So that** I don't miss important events.

#### Acceptance Criteria

**AC-31.1 — Notification Load**
- When the agent opens the notification center
- Then notifications load from `GET /api/v1/notifications`
- And display with correct type, priority, state

**AC-31.2 — Real-Time Push**
- When a new notification is created (e.g., missed call)
- Then it is pushed via WebSocket
- And appears as a toast notification
- And plays a sound (if enabled)

**AC-31.3 — Mark as Read**
- When the agent clicks a notification
- Then it is marked as viewed via `PATCH /api/v1/notifications/{id}/state`
- And the unread count decreases

**AC-31.4 — Unread Badge**
- The bell icon shows the unread count from `GET /api/v1/notifications/unread-count`
- And updates in real-time

---

### US-32: Knowledge Base Search

**As** a customer service agent,
**I want** to search the knowledge base with real articles,
**So that** I can find answers to customer questions.

#### Acceptance Criteria

**AC-32.1 — Folder Tree Load**
- When the agent opens the KB panel
- Then the folder tree loads from `GET /api/v1/kb/folders`
- And displays the hierarchy correctly

**AC-32.2 — Article Search**
- When the agent types "đăng nhập" in the search box
- Then articles are searched via `GET /api/v1/kb/articles?search=đăng nhập`
- And matching results are displayed

**AC-32.3 — Article Detail**
- When the agent clicks an article
- Then the detail loads from `GET /api/v1/kb/articles/{id}`
- And displays the full content

**AC-32.4 — Bookmark**
- When the agent bookmarks an article
- Then it is saved via `POST /api/v1/kb/bookmarks`
- And appears in the bookmarks list

---

### US-33: BFSI Product Queries

**As** a customer service agent,
**I want** to query customer financial products from the core banking system,
**So that** I can answer account-related questions.

#### Acceptance Criteria

**AC-33.1 — Account Summary**
- When the agent clicks "Tài khoản" in the Information Query panel
- Then accounts load from `GET /api/v1/bfsi/customers/{cif}/accounts`
- And display: account number (masked), balance (masked), status

**AC-33.2 — Unmask Sensitive Data**
- When the agent clicks the eye icon
- Then the API is called with `?sensitiveDataVisible=true`
- And full account numbers and balances are shown

**AC-33.3 — Loan Products**
- When the agent clicks "Khoản vay"
- Then loans load from `GET /api/v1/bfsi/customers/{cif}/loans`
- And display: current balance, monthly payment, interest rate

**AC-33.4 — Transaction History**
- When the agent selects a date range and clicks "Tra cứu"
- Then transactions load from `GET /api/v1/bfsi/customers/{cif}/transactions`
- And display: date, amount, description

---

### US-34: AI Assistant

**As** a customer service agent,
**I want** AI-powered suggestions for responses,
**So that** I can reply to customers faster.

#### Acceptance Criteria

**AC-34.1 — Suggestion Chips**
- When the agent opens an interaction
- Then suggestion chips load from `GET /api/v1/ai/suggestions/{interactionId}`
- And display: "Tóm tắt cuộc gọi", "Gợi ý phản hồi", etc.

**AC-34.2 — Generate Response**
- When the agent clicks "Gợi ý phản hồi"
- Then the response is generated via `POST /api/v1/ai/generate`
- And displays in the AI panel
- And can be inserted into the reply box

**AC-34.3 — Summarize**
- When the agent clicks "Tóm tắt cuộc gọi"
- Then the summary is generated via `POST /api/v1/ai/summarize`
- And displays in the AI panel

---

### US-35: Call Recording Playback

**As** a customer service agent,
**I want** to play call recordings from the media service,
**So that** I can review past conversations.

#### Acceptance Criteria

**AC-35.1 — Recording List**
- When the agent opens a voice interaction
- Then recordings load from `GET /api/v1/media/recordings/{interactionId}`
- And display: duration, quality, file size

**AC-35.2 — Play Recording**
- When the agent clicks the play button
- Then the streaming URL is fetched from `GET /api/v1/media/recordings/{id}/stream`
- And the audio player starts playback

**AC-35.3 — Download Recording**
- When the agent clicks the download button
- Then the pre-signed URL is fetched
- And the file downloads

---

### US-36: CTI Call Control

**As** a customer service agent,
**I want** to control calls through the CRM interface,
**So that** I don't need to use a separate phone app.

#### Acceptance Criteria

**AC-36.1 — Incoming Call**
- When a call arrives
- Then the CTI adapter emits a `call.ringing` event via WebSocket
- And the FloatingCallWidget appears with caller info

**AC-36.2 — Answer Call**
- When the agent clicks "Trả lời"
- Then the call is answered via `ctiAdapter.answer(callId)`
- And the widget shows "Connected" state
- And the call timer starts

**AC-36.3 — Hold Call**
- When the agent clicks "Giữ máy"
- Then the call is held via `ctiAdapter.hold(callId)`
- And the widget shows "On Hold" state

**AC-36.4 — Transfer Call**
- When the agent selects a target agent and clicks "Chuyển"
- Then the call is transferred via `ctiAdapter.transfer(callId, targetAgentId, 'warm')`
- And the widget shows "Transferring" state

**AC-36.5 — End Call**
- When the agent clicks "Kết thúc"
- Then the call is ended via `ctiAdapter.hangup(callId)`
- And the widget disappears

---

## 4. Technical Requirements

### 4.1 API Client Setup

**Library:** Axios 1.13.6 (already installed)
**Base URL:** `http://localhost:8000` (Kong API Gateway)

**Features:**
- Request interceptor: attach JWT access token
- Response interceptor: handle 401 → refresh token → retry
- Error handling: map API errors to user-friendly messages
- Request/response logging (dev mode only)

### 4.2 WebSocket Client Setup

**Library:** Socket.IO Client (need to install: `socket.io-client`)
**URL:** `ws://localhost:8000` (Kong WebSocket proxy)

**Note:** Currently using `@stomp/stompjs` 7.3.0 - need to evaluate if we keep STOMP or switch to Socket.IO

**Channels:**
- `/ws/agent/{agentId}/status` — agent status updates
- `/ws/interactions/{agentId}/queue` — queue updates
- `/ws/interactions/{interactionId}/sla` — SLA countdown
- `/ws/notifications/{agentId}` — notification push
- `/ws/cti/{agentId}/call` — call events

**Features:**
- Auto-reconnect with exponential backoff
- Connection state indicator in UI
- Event handlers per channel

### 4.3 Authentication Flow

**JWT Storage:**
- Access token: in-memory (React state)
- Refresh token: httpOnly cookie (set by backend)

**Token Refresh:**
- When access token expires (15 min)
- Automatically refresh via `POST /api/v1/auth/refresh`
- Retry failed request with new token

**Logout:**
- Call `POST /api/v1/auth/logout`
- Clear in-memory token
- Redirect to login page

### 4.4 State Management

**Server State:** TanStack Query 5.90.21 (already installed)
- All API calls wrapped in `useQuery` or `useMutation`
- Automatic caching with stale-while-revalidate
- Background refetching
- Optimistic updates for mutations

**UI State:** React Context (existing)
- CallContext — call widget state
- EnhancedAgentStatusContext — agent status
- NotificationContext — notification state

**Note:** React 19.2.4 is already installed - use latest React 19 features

### 4.5 Error Handling

**API Errors:**
- 401 Unauthorized → refresh token → retry
- 403 Forbidden → show "Bạn không có quyền truy cập"
- 404 Not Found → show "Không tìm thấy dữ liệu"
- 500 Server Error → show "Lỗi hệ thống, vui lòng thử lại"

**Network Errors:**
- Connection lost → show banner "Mất kết nối, đang thử lại..."
- Timeout → show "Yêu cầu quá lâu, vui lòng thử lại"

**WebSocket Errors:**
- Connection lost → auto-reconnect with exponential backoff
- Show connection status indicator in header

---

## 5. Data Migration

### 5.1 Mock Data Removal

**Files to modify:**
- `App.tsx` — remove all mock arrays (interactions, customers, tickets, notifications, KB, BFSI)
- `useInteractionStats.tsx` — remove mock data, use React Query
- `CallContext.tsx` — remove mock call state, use WebSocket events
- `NotificationContext.tsx` — remove mock notifications, use API + WebSocket

### 5.2 Seed Data (Backend)

**Required for testing:**
- 1 admin user (username: `admin`, password: `admin123`)
- 3 agent users (username: `agent1`, `agent2`, `agent3`)
- 10 customers with CIF, name, phone, email
- 20 interactions (5 voice, 5 email, 5 chat, 5 missed calls)
- 10 tickets (various statuses)
- 5 KB articles in 2 folders
- 5 notifications per agent

**Seed script:** `infra/scripts/seed-dev.sh`

---

## 6. Testing Requirements

### 6.1 Unit Tests

**Target:** ≥ 70% coverage

**Test files:**
- `AuthContext.test.tsx` — login, logout, token refresh
- `useInteractionStats.test.tsx` — API integration, filtering
- `CustomerInfoScrollFixed.test.tsx` — data loading, tabs
- `CreateTicketDialog.test.tsx` — form validation, submission

### 6.2 Integration Tests

**API Client:**
- Test token refresh flow
- Test error handling (401, 403, 500)
- Test request retry logic

**WebSocket Client:**
- Test connection/reconnection
- Test event handling
- Test channel subscriptions

### 6.3 E2E Tests (Playwright)

**Critical paths:**
1. Login → see queue → open interaction → view customer
2. Create ticket → add comment → resolve
3. Search KB → view article → bookmark
4. Query BFSI products → unmask data
5. Receive notification → mark as read

---

## 7. Performance Requirements

| Metric | Target |
|---|---|
| Initial page load (FCP) | < 1.5s |
| Time to interactive (TTI) | < 3s |
| API response time (P99) | < 500ms |
| WebSocket message latency | < 100ms |
| Queue refresh (background) | Every 30s |
| Notification badge update | Real-time (< 1s) |

---

## 8. Security Requirements

| Requirement | Implementation |
|---|---|
| HTTPS only | All API calls via HTTPS |
| JWT validation | Every request includes access token |
| Token expiry | Access token: 15 min, Refresh: 7 days |
| XSS prevention | React auto-escapes, no `dangerouslySetInnerHTML` |
| CSRF protection | SameSite cookies for refresh token |
| PII masking | Sensitive data masked by default (eye icon to unmask) |

---

## 9. Deployment Requirements

### 9.1 Environment Variables

**Frontend (.env):**
```
VITE_API_BASE_URL=http://localhost:8000
VITE_WS_URL=ws://localhost:8000
VITE_ENV=development
```

**Production:**
```
VITE_API_BASE_URL=https://api.tpb.vn
VITE_WS_URL=wss://api.tpb.vn
VITE_ENV=production
```

### 9.2 Build Configuration

**Vite config:**
- Production build: `npm run build`
- Output: `dist/`
- Asset optimization: code splitting, tree shaking
- Source maps: enabled for staging, disabled for production

---

## 10. Success Criteria

### Phase 4 Exit Criteria

- [ ] Agent can log in with real credentials (JWT + MFA)
- [ ] Interaction queue loads from API (no mock data)
- [ ] Customer info panel loads from API
- [ ] Tickets can be created, viewed, updated via API
- [ ] Notifications work real-time via WebSocket
- [ ] Agent status syncs with server
- [ ] KB search returns real articles
- [ ] BFSI queries return real data (or mock from backend)
- [ ] AI suggestions work
- [ ] Call recordings can be played
- [ ] CTI call control works (if Asterisk available)
- [ ] All E2E tests pass
- [ ] Performance targets met
- [ ] Zero critical security vulnerabilities

---

## 11. Risks & Mitigation

| Risk | Probability | Impact | Mitigation |
|---|---|---|---|
| Backend API not stable | Medium | High | Thorough testing in Phase 1-3, use staging env |
| WebSocket connection issues | Medium | Medium | Implement robust reconnection logic, fallback to polling |
| Token refresh race conditions | Low | High | Use mutex/lock for refresh, queue failed requests |
| Large component refactoring | High | Medium | Incremental changes, preserve existing UI |
| Performance degradation | Medium | Medium | Lazy loading, code splitting, React Query caching |

---

## 12. Timeline Estimate

**Duration:** 4-6 weeks (1 developer)

| Week | Tasks |
|---|---|
| Week 1 | API client setup, auth flow, login page |
| Week 2 | Interaction queue integration, WebSocket setup |
| Week 3 | Customer info, tickets, notifications |
| Week 4 | KB, BFSI, AI, media integration |
| Week 5 | CTI integration, testing, bug fixes |
| Week 6 | E2E tests, performance optimization, deployment |

---

*End of requirements.md*
