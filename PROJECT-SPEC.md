# PROJECT-SPEC.md — TPB CRM Platform
## Tài Liệu Spec Tổng Hợp (Master Reference)

> **Version:** 1.0 | **Date:** 2026-03-12 | **Status:** Phase 4 In Progress (81%)

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Current State](#2-current-state)
3. [Architecture Overview](#3-architecture-overview)
4. [Service Catalog (18 Services)](#4-service-catalog-18-services)
5. [Frontend Architecture](#5-frontend-architecture)
6. [API Contracts (Key Endpoints)](#6-api-contracts-key-endpoints)
7. [Database Schema Summary](#7-database-schema-summary)
8. [Security & Compliance](#8-security--compliance)
9. [Development Guidelines](#9-development-guidelines)
10. [Remaining Work & Next Steps](#10-remaining-work--next-steps)
11. [Environment Setup](#11-environment-setup)
12. [Known Limitations](#12-known-limitations)

---

## 1. Project Overview

### Mục Tiêu

**TPB CRM Platform** — Nền tảng CRM đa kênh cấp doanh nghiệp cho **TPBank** (ngân hàng Việt Nam). Hệ thống cung cấp giao diện làm việc thống nhất cho agent ngân hàng xử lý các tương tác khách hàng qua nhiều kênh (voice, chat, email), tích hợp với hệ thống core banking và tuân thủ tiêu chuẩn BFSI.

### Đối Tượng Sử Dụng

| Role | Mô Tả |
|------|--------|
| **Agent** | Xử lý tương tác khách hàng (voice/chat/email), tra cứu thông tin tài khoản |
| **Supervisor** | Giám sát queue, đánh giá hiệu suất, phân công tương tác |
| **Admin** | Quản lý user, cấu hình hệ thống, xem audit logs |
| **IT/Ops** | Cấu hình CTI, schema động, workflow automation |

### Confirmed Technology Stack

**Frontend:**
- React 18 + TypeScript (strict mode)
- Vite 6.3.5 + SWC (build tool)
- TanStack Query v5 (server state management)
- React Context (UI state: calls, agent status, notifications)
- Tailwind CSS + shadcn/ui (48 primitive components)
- React Router v6 (navigation)
- Socket.IO Client (real-time WebSocket)
- Axios (HTTP client)
- React Flow (workflow canvas — Phase 5)

**Backend:**
- NestJS (TypeScript framework)
- TypeORM + PostgreSQL 16 (data persistence)
- Redis 7 (sessions, token blacklist, pub/sub)
- Apache Kafka (event streaming, audit trail)
- Elasticsearch 8 (full-text search — partially active)
- SeaweedFS (S3-compatible file storage)
- Temporal (workflow engine — currently mocked)
- Apache Superset 6.0.0 (BI/reporting)

**Infrastructure:**
- Docker Compose (local development)
- Kong 3.9 (API Gateway — JWT validation, rate limiting, routing)
- Nx (monorepo build system)
- PostgreSQL 18 image (upgraded from 16)
- Redis 8.6 image

---

## 2. Current State

### Phase Summary

| Phase | Duration | Status | Tests |
|-------|----------|--------|-------|
| **Phase 0: Foundation** | 2 weeks | ✅ Complete | — |
| **Phase 1: Core MVP** | 12 weeks | ✅ Complete | 112/112 |
| **Phase 2: Advanced Features** | 12 weeks | ✅ Complete | 62/62 |
| **Phase 3: Automation & Analytics** | 12 weeks | ✅ Complete | 24/24 |
| **Phase 4: Frontend Integration** | In Progress | 🟡 81% | E2E pending |

**Total Tests:** 198/198 passing across all backend services.

### Phase 0: Foundation ✅
- Nx monorepo scaffold (apps + services)
- TypeScript strict mode configuration
- Docker Compose infrastructure (18 services)
- NestJS service stubs for all 18 microservices
- Testing framework (Jest) configured per service
- Kong API Gateway initial setup
- JWT key pair generation

### Phase 1: Core MVP ✅ (73/73 tasks)
- **MS-1 Identity Service** — Auth, JWT RS256, MFA TOTP, Redis sessions, account lockout
- **MS-2 Agent Service** — Profiles, per-channel status, presence, heartbeat
- **MS-3 Interaction Service** — Queue management, lifecycle, SLA tracking, WebSocket
- **MS-4 Ticket Service** — Case management, comments, history, workflow states
- **MS-5 Customer Service** — Profiles, notes, interaction history
- **MS-6 Notification Service** — In-app notifications, state machine, WebSocket

### Phase 2: Advanced Features ✅
- **MS-7 Knowledge Service** — Articles, folders, PostgreSQL ILIKE search (13 tests)
- **MS-8 BFSI Core Service** — Account/savings/loan/card queries, circuit breaker (10 tests)
- **MS-9 AI Service** — Suggestions, summarization, classification (8 tests)
- **MS-10 Media Service** — Recordings, attachments, SeaweedFS integration (6 tests)
- **MS-11 Audit Service** — Immutable logs, hash chaining (8 tests)
- **MS-13 Object Schema Service** — Dynamic field definitions (5 tests)
- **MS-14 Layout Service** — UI layout configurations per object type (5 tests)
- **MS-19 CTI Adapter Service** — Genesys/Avaya/Asterisk adapters (7 tests)

### Phase 3: Automation & Analytics ✅
- **MS-15 Workflow Service** — Temporal integration (mocked), SLA automation (8 tests)
- **MS-16 Data Enrichment Service** — External data enrichment, progressive loading (5 tests)
- **MS-17 Dashboard Service** — Real-time metrics, widget data (6 tests)
- **MS-18 Report Service** — Superset proxy, guest tokens (5 tests)

### Phase 4: Frontend-Backend Integration 🟡 (81%)

**Completed ✅:**
- API infrastructure (Axios client, interceptors, token refresh)
- Authentication flow (Login page, JWT storage, PrivateRoute, ProtectedRoute)
- WebSocket client (Socket.IO, reconnection logic)
- Real-time interaction queue (useRealtimeQueue hook)
- Agent status API integration (optimistic updates, heartbeat)
- Customer information panel (live data, notes, history)
- Ticket management (CRUD, comments, status updates)
- Notification system (real-time WebSocket + REST)
- Knowledge base search (live search, folders)
- BFSI banking queries (accounts, savings, loans, cards)
- AI assistant integration (suggestions, summarize, classify)
- Media service integration (upload, streaming)
- CTI call control (answer, hold, transfer, end)
- Admin Module core (login, dashboard, user CRUD)

**Remaining 🔲 (19%):**
- Role management UI (Admin module — assign/revoke roles)
- Audit log viewer UI (Admin module — filterable, paginated)
- CTI configuration panel (Admin module — adapter settings)
- E2E test suite (Playwright — login, interaction, ticket flows)
- Kong routing end-to-end validation

---

## 3. Architecture Overview

### System Architecture (Text Diagram)

```
┌─────────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                                  │
│  Agent Desktop (React 18, :3000)   Admin Module (React 18, :3020)  │
└──────────────────────────┬──────────────────────────────────────────┘
                           │ HTTPS / WSS
┌──────────────────────────▼──────────────────────────────────────────┐
│               Kong API Gateway (:8000 proxy, :8001 admin)           │
│         JWT validation · Rate limiting · CORS · mTLS termination    │
└──┬───┬───┬───┬───┬───┬───┬───┬───┬───┬───┬───┬───┬───┬───┬───┬───┘
   │   │   │   │   │   │   │   │   │   │   │   │   │   │   │   │   │
   ▼   ▼   ▼   ▼   ▼   ▼   ▼   ▼   ▼   ▼   ▼   ▼   ▼   ▼   ▼   ▼   ▼
  MS1 MS2 MS3 MS4 MS5 MS6 MS7 MS8 MS9 M10 M11 M13 M14 M15 M16 M17 M18 M19
  :01 :02 :03 :04 :05 :06 :07 :08 :09 :10 :11 :13 :14 :15 :16 :17 :18 :19
   (port prefix 300x)

┌─────────────────────────────────────────────────────────────────────┐
│                    INFRASTRUCTURE LAYER                              │
│  PostgreSQL :5432  Redis :6379  Kafka :9092  Elasticsearch :9200    │
│  SeaweedFS :8333   Temporal :7233  Superset :8088  Mailhog :8025    │
└─────────────────────────────────────────────────────────────────────┘
```

### Port Mapping

| Component | Port | Notes |
|-----------|------|-------|
| Agent Desktop | 3000 | React SPA |
| Admin Module | 3020 | React SPA |
| Kong Proxy | 8000 | All API traffic |
| Kong Admin API | 8001 | Configuration only |
| PostgreSQL | 5432 | Shared host, 18 DBs |
| Redis | 6379 | Sessions, cache, pub/sub |
| Apache Kafka | 9092 | Event streaming |
| Kafka UI | 9000 | Dev management |
| Elasticsearch | 9200 | Full-text search |
| Kibana | 5601 | ES visualization |
| SeaweedFS Master | 9333 | File storage master |
| SeaweedFS Volume | 8333 | S3-compatible API |
| Temporal Server | 7233 | Workflow engine |
| Temporal UI | 8233 | Workflow management |
| Apache Superset | 8088 | BI/analytics |
| Mailhog SMTP | 1025 | Email testing |
| Mailhog UI | 8025 | Email web UI |

---

## 4. Service Catalog (18 Services)

### MS-1: Identity Service (:3001)

- **DB:** `identity_db`
- **Entities:** User, Role, RefreshToken, LoginAttempt
- **Key Endpoints:**
  - `POST /api/auth/login` — JWT issuance (15m access + 7d refresh)
  - `POST /api/auth/refresh` — Rotate refresh token
  - `POST /api/auth/logout` — Blacklist token in Redis
  - `POST /api/auth/mfa/verify` — TOTP verification
  - `GET /api/users/me` — Current user profile
  - `PUT /api/users/:id` — Update user (admin only)
- **Security:** bcrypt passwords, TOTP via speakeasy, 5-attempt lockout (15min)
- **Tests:** Included in Phase 1 (112 total)

---

### MS-2: Agent Service (:3002)

- **DB:** `agent_db`
- **Entities:** AgentProfile, AgentChannelStatus, AgentSession
- **Key Endpoints:**
  - `GET /api/agents/me` — Current agent profile
  - `PUT /api/agents/me/status` — Update channel status (voice/chat/email)
  - `POST /api/agents/heartbeat` — Presence update (30s interval)
  - `GET /api/agents` — List agents (supervisor)
  - `GET /api/agents/:id/stats` — Performance stats
- **WebSocket:** `/agents` namespace — presence updates, status broadcasts
- **Kafka Topics:** `agent.status.changed`, `agent.session.started`

---

### MS-3: Interaction Service (:3003)

- **DB:** `interaction_db`
- **Entities:** Interaction, InteractionNote, InteractionEvent
- **Key Endpoints:**
  - `GET /api/interactions` — Queue with filters (channel, status, priority, agentId)
  - `POST /api/interactions` — Create new interaction
  - `PUT /api/interactions/:id/assign` — Assign to agent
  - `PUT /api/interactions/:id/status` — Update status
  - `GET /api/interactions/:id/events` — Event timeline
  - `POST /api/interactions/:id/notes` — Add note
- **WebSocket:** `/interactions` namespace — real-time queue updates, new interaction events
- **Kafka Topics:** `interaction.created`, `interaction.assigned`, `interaction.closed`

---

### MS-4: Ticket Service (:3004)

- **DB:** `ticket_db`
- **Entities:** Ticket, TicketComment, TicketHistory
- **Key Endpoints:**
  - `GET /api/tickets` — List with filters (status, priority, assignee)
  - `POST /api/tickets` — Create ticket (from interaction)
  - `GET /api/tickets/:id` — Detail with comments + history
  - `PUT /api/tickets/:id` — Update (status, assignee, priority)
  - `POST /api/tickets/:id/comments` — Add comment
  - `DELETE /api/tickets/:id` — Soft delete
- **Kafka Topics:** `ticket.created`, `ticket.updated`, `ticket.closed`

---

### MS-5: Customer Service (:3005)

- **DB:** `customer_db`
- **Entities:** Customer, CustomerNote
- **Key Endpoints:**
  - `GET /api/customers` — Search by name/phone/CIF
  - `GET /api/customers/:id` — Full profile
  - `PUT /api/customers/:id` — Update profile
  - `GET /api/customers/:id/notes` — Customer notes
  - `POST /api/customers/:id/notes` — Add note
  - `GET /api/customers/:id/interactions` — Interaction history
- **Security:** PII fields (phone, email, CIF) AES-256-GCM encrypted at rest

---

### MS-6: Notification Service (:3006)

- **DB:** `notification_db`
- **Entities:** Notification
- **Key Endpoints:**
  - `GET /api/notifications` — List (unread first)
  - `PUT /api/notifications/:id/read` — Mark as read
  - `PUT /api/notifications/read-all` — Bulk mark read
  - `DELETE /api/notifications/:id` — Dismiss
- **WebSocket:** `/notifications` namespace — real-time push
- **Types:** NEW_INTERACTION, TICKET_ASSIGNED, SLA_WARNING, SYSTEM_ALERT, MESSAGE
- **States:** new → viewed → actioned → dismissed

---

### MS-7: Knowledge Service (:3007)

- **DB:** `knowledge_db`
- **Entities:** KbArticle, KbFolder, KbBookmark
- **Key Endpoints:**
  - `GET /api/kb/articles` — Search (q param, PostgreSQL ILIKE)
  - `GET /api/kb/articles/:id` — Article detail
  - `POST /api/kb/articles` — Create (admin)
  - `GET /api/kb/folders` — Folder tree
  - `POST /api/kb/bookmarks` — Bookmark article
- **Note:** Uses PostgreSQL ILIKE search (Elasticsearch planned for Phase 5)
- **Tests:** 13

---

### MS-8: BFSI Core Service (:3008)

- **DB:** `bfsi_db`
- **Entities:** BFSICustomer, Account, SavingsAccount, Loan, CreditCard
- **Key Endpoints:**
  - `GET /api/bfsi/customers/:cif` — Customer by CIF
  - `GET /api/bfsi/customers/:cif/accounts` — Demand deposit accounts
  - `GET /api/bfsi/customers/:cif/savings` — Savings accounts
  - `GET /api/bfsi/customers/:cif/loans` — Loan products
  - `GET /api/bfsi/customers/:cif/cards` — Credit/debit cards
- **Security:** CIF, account numbers encrypted (AES-256-GCM)
- **Note:** Currently seeded with fake banking data; circuit breaker pattern implemented
- **Tests:** 10

---

### MS-9: AI Service (:3009)

- **DB:** `ai_db`
- **Entities:** AISuggestion, AISession
- **Key Endpoints:**
  - `POST /api/ai/suggestions` — Get response suggestions (context: interactionId)
  - `POST /api/ai/summarize` — Summarize interaction transcript
  - `POST /api/ai/classify` — Classify intent/sentiment
  - `GET /api/ai/history` — Suggestion history for interaction
- **Tests:** 8

---

### MS-10: Media Service (:3010)

- **DB:** `media_db`
- **Entities:** MediaFile, Recording
- **Key Endpoints:**
  - `POST /api/v1/media` — Upload file (multipart/form-data)
  - `GET /api/v1/media/:id` — File metadata
  - `GET /api/v1/media/:id/stream` — Stream recording
  - `DELETE /api/v1/media/:id` — Delete file
  - `GET /api/v1/media/interaction/:id` — Files for interaction
- **Storage:** SeaweedFS (S3-compatible at :8333)
- **Tests:** 6

---

### MS-11: Audit Service (:3011)

- **DB:** `audit_db`
- **Entities:** AuditLog
- **Key Endpoints:**
  - `GET /api/audit/logs` — Query logs (filters: service, userId, action, dateRange)
  - `GET /api/audit/logs/:id` — Log detail with hash verification
- **Kafka Consumer:** Consumes all `*.audit` topics from every service
- **Security:** Hash chaining (each log includes hash of previous), immutable records
- **Tests:** 8

---

### MS-13: Object Schema Service (:3013)

- **DB:** `schema_db`
- **Entities:** ObjectSchema, FieldDefinition
- **Key Endpoints:**
  - `GET /api/v1/schema/objects` — List object types
  - `POST /api/v1/schema/objects` — Create schema
  - `GET /api/v1/schema/objects/:type/fields` — Get field definitions
  - `POST /api/v1/schema/objects/:type/fields` — Add dynamic field
  - `PUT /api/v1/schema/fields/:id` — Update field
- **Tests:** 5

---

### MS-14: Layout Service (:3014)

- **DB:** `layout_db`
- **Entities:** LayoutConfig, WidgetConfig
- **Key Endpoints:**
  - `GET /api/v1/layout/:objectType` — Get layout for object type
  - `PUT /api/v1/layout/:objectType` — Update layout
  - `GET /api/v1/layout/:objectType/widgets` — Widget configuration
  - `POST /api/v1/layout/:objectType/widgets` — Add widget
- **Tests:** 5

---

### MS-15: Workflow Service (:3015)

- **DB:** `workflow_db`
- **Entities:** WorkflowDefinition, WorkflowInstance, WorkflowTask
- **Key Endpoints:**
  - `GET /api/v1/workflow/definitions` — List workflow templates
  - `POST /api/v1/workflow/definitions` — Create workflow
  - `POST /api/v1/workflow/instances` — Start workflow instance
  - `GET /api/v1/workflow/instances/:id` — Instance status
  - `PUT /api/v1/workflow/instances/:id/task` — Complete task
- **Temporal:** Connected to :7233 (currently mocked in unit tests)
- **Tests:** 8

---

### MS-16: Data Enrichment Service (:3016)

- **DB:** `enrichment_db`
- **Entities:** EnrichmentRule, EnrichmentResult
- **Key Endpoints:**
  - `POST /api/v1/enrichment/enrich` — Enrich entity (customerId/interactionId)
  - `GET /api/v1/enrichment/results/:entityId` — Cached enrichment results
  - `GET /api/v1/enrichment/rules` — List enrichment rules
  - `POST /api/v1/enrichment/rules` — Create rule
- **Tests:** 5

---

### MS-17: Dashboard Service (:3017)

- **DB:** `dashboard_db`
- **Entities:** DashboardConfig, Widget, MetricSnapshot
- **Key Endpoints:**
  - `GET /api/v1/dashboard/metrics` — Real-time metrics snapshot
  - `GET /api/v1/dashboard/configs` — Dashboard configurations
  - `POST /api/v1/dashboard/configs` — Create dashboard
  - `GET /api/v1/dashboard/widgets/:id/data` — Widget data
- **WebSocket:** `/dashboard` namespace — live metric pushes
- **Tests:** 6

---

### MS-18: Report Service (:3018)

- **DB:** `report_db`
- **Entities:** ReportDefinition, ReportSchedule
- **Key Endpoints:**
  - `GET /api/v1/reports` — List available reports
  - `POST /api/v1/reports/token` — Get Superset guest token
  - `GET /api/v1/reports/:id` — Report metadata
  - `POST /api/v1/reports/schedule` — Schedule report
- **Superset Integration:** Proxies to :8088 with guest token auth
- **Tests:** 5

---

### MS-19: CTI Adapter Service (:3019)

- **DB:** `cti_db`
- **Entities:** CTICall, CTISession, CTIConfig
- **Key Endpoints:**
  - `POST /api/v1/cti/calls/answer` — Answer call
  - `POST /api/v1/cti/calls/hold` — Put on hold
  - `POST /api/v1/cti/calls/transfer` — Transfer call
  - `POST /api/v1/cti/calls/end` — End call
  - `GET /api/v1/cti/config` — Current adapter config
  - `PUT /api/v1/cti/config` — Update adapter settings
- **Adapters:** Genesys Cloud, Avaya CM, Asterisk AMI (factory pattern)
- **WebSocket:** `/cti` namespace — call state events
- **Tests:** 7

---

## 5. Frontend Architecture

### Agent Desktop (`apps/agent-desktop`, port 3000)

**Tech:** React 18, TypeScript strict, Vite 6.3.5, TanStack Query v5, React Router v6, Socket.IO Client, Axios, Tailwind CSS + shadcn/ui

#### Context Provider Tree
```
BrowserRouter
  └─ QueryClientProvider (TanStack Query)
       └─ AuthProvider
            └─ NotificationProvider
                 └─ EnhancedAgentStatusProvider
                      └─ CallProvider
                           └─ AppRouter
```

#### API Client Structure (`src/lib/api/`)
```
src/lib/api/
├── index.ts          — Axios instance, interceptors, token refresh
├── auth.ts           — login, logout, refresh, mfa
├── agents.ts         — profile, status, heartbeat
├── interactions.ts   — queue, CRUD, events
├── customers.ts      — profile, notes, history
├── tickets.ts        — CRUD, comments
├── notifications.ts  — list, mark read
├── knowledge.ts      — search, folders
├── bfsi.ts           — accounts, savings, loans, cards
├── ai.ts             — suggestions, summarize, classify
├── media.ts          — upload, stream
└── cti.ts            — call control
```

#### Custom Hooks (`src/hooks/`)
```
src/hooks/
├── useAgentHeartbeat.ts      — 30s presence keepalive
├── useAgents.ts              — agent list/stats (TanStack Query)
├── useInteractions.ts        — interaction list with filters
├── useRealtimeQueue.ts       — Socket.IO + React Query integration
├── useInteractionStats.ts    — aggregation, filter, stats
├── useTickets.ts             — ticket CRUD operations
├── useCustomers.ts           — customer data + search
├── useNotifications.ts       — notifications + WebSocket
├── useKnowledge.ts           — KB search + folders
├── useBFSI.ts                — banking queries
├── useAI.ts                  — AI assistant
├── useMedia.ts               — file upload/stream
└── useCTI.ts                 — call control
```

#### Pages (`src/pages/`)
- `Login.tsx` — Authentication page (username/password + MFA step)
- `LoginPage.tsx` — Alternate implementation

#### Components (47 total)

**Layout & Navigation:**
- `AppRouter.tsx` — React Router v6 routes
- `PrivateRoute.tsx` — JWT guard wrapper
- `ProtectedRoute.tsx` — Role-based wrapper
- `EnhancedAgentHeader.tsx` (434L) — Top bar (status, agent info, shortcuts)

**Interaction Panel (Left):**
- `InteractionList.tsx` (852L) — Queue list, filters, real-time updates
- `InteractionListItem.tsx` — Individual interaction card
- `InteractionPreview.tsx` — Quick preview

**Detail Panel (Center):**
- `InteractionDetail.tsx` (~3000L) — 5 tabs: Voice / Email / Chat / Timeline / Notes
- `EmailReplyDialog.tsx` (814L) — Email reply modal
- `EmailReplyInline.tsx` (700L) — Inline email reply
- `ChatTimeline.tsx` — Chat message thread
- `EmailThread.tsx` — Email conversation
- `CallTimeline.tsx` — Call event timeline
- `CallNotes.tsx` — Call notes editor
- `CallRecordingPlayer.tsx` — Audio player
- `TransferCallDialog.tsx` (165L) — Call transfer

**Customer Panel (Right):**
- `CustomerInfoScrollFixed.tsx` (1644L) — 5 tabs: Info / History / Tickets / BFSI / Notes
- `CustomerSelection.tsx` — Customer search/select

**BFSI & Knowledge:**
- `InformationQuery.tsx` (1327L) — Banking product queries
- `KnowledgeBaseSearch.tsx` (1096L) — KB folder tree + search
- `CoreBFSI.tsx` — Core banking data
- `LoanDetailWithTabs.tsx` — Loan product detail

**Tickets:**
- `TicketDetail.tsx` (642L) — Ticket view + comments
- `CreateTicketDialog.tsx` (744L) — Ticket creation form

**AI & Notifications:**
- `AIAssistantChat.tsx` — AI chat panel
- `NotificationCenter.tsx` (671L) — Notification panel

**Status & Settings:**
- `AgentStatusWidget.tsx` (634L) — Per-channel status control
- `AgentChannelStatus.tsx` — Channel indicators
- `AgentSettingsSidebar.tsx` (338L) — Settings panel
- `FloatingCallWidget.tsx` (346L) — Floating call controls

**Filters & Utilities:**
- `AdvancedFilters.tsx` — Advanced filter UI
- `ChatAdvancedFilters.tsx` — Chat-specific filters
- `DateRangeFilter.tsx` — Date range picker
- `ChatSLABadge.tsx` — SLA indicator
- `ChatSessionHeader.tsx` — Session header
- `MissedCallNotification.tsx` — Missed call alert

**AI Components (`src/components/ai-assistant/`):**
- `types.ts`, `constants.ts`, `utils.ts`, `ChatMessage.tsx`

**shadcn/ui Primitives (`src/components/ui/`):**
- 48 components — DO NOT MODIFY (Button, Dialog, Input, Select, Tabs, etc.)

#### State Management

| Context | State Type | Methods |
|---------|-----------|---------|
| `AuthContext` | Auth user, token | login, logout, refreshToken |
| `CallContext` | Active call, widget | startCall, endCall, showCallWidget |
| `EnhancedAgentStatusContext` | Per-channel readiness, timers | setChannelStatus, isChannelReady, heartbeat |
| `NotificationContext` | Notifications array | addNotification, markRead, dismiss |

**Keyboard Shortcuts (AgentStatus):** `Ctrl+R` = Ready all, `Ctrl+N` = Not-ready all

---

### Admin Module (`apps/admin-module`, port 3020)

**Tech:** React 18, TypeScript, Vite, TanStack Query, React Router v6, Axios

#### Pages
- `AdminLoginPage.tsx` — Admin authentication
- `AdminDashboard.tsx` — System overview, active users, service health
- `UserManagement.tsx` — User CRUD (create, edit, deactivate, assign roles)
- `SystemSettings.tsx` — Platform configuration

#### Components
- `AdminLayout.tsx` — Sidebar navigation + header
- `AdminPrivateRoute.tsx` — Admin auth guard
- `CreateUserModal.tsx` — User creation form
- `EditUserModal.tsx` — User edit form

#### Contexts & Hooks
- `AdminAuthContext.tsx` — Admin JWT management
- `useAdminUsers.ts` — User CRUD with TanStack Query
- `admin-api.ts` — Admin-specific API calls (via Kong :8000)

---

## 6. API Contracts (Key Endpoints)

> All requests via Kong proxy at `http://localhost:8000`. JWT required in `Authorization: Bearer <token>`.

### Authentication
```
POST /api/auth/login
  Body: { username, password }
  Response: { accessToken, refreshToken, user, requiresMfa }

POST /api/auth/refresh
  Body: { refreshToken }
  Response: { accessToken, refreshToken }

POST /api/auth/logout
  Header: Authorization: Bearer <token>
  Effect: Blacklists token in Redis

POST /api/auth/mfa/verify
  Body: { token (6-digit TOTP), sessionId }
  Response: { accessToken, refreshToken }
```

### Interactions
```
GET /api/interactions?channel=voice&status=active&agentId=x&page=1&limit=20
  Response: { data: Interaction[], total, page, limit }

POST /api/interactions
  Body: { channel, customerId, priority, subject }
  Response: Interaction

PUT /api/interactions/:id/assign
  Body: { agentId }

PUT /api/interactions/:id/status
  Body: { status: 'active'|'hold'|'closed' }

POST /api/interactions/:id/notes
  Body: { content }
```

### Customers
```
GET /api/customers?search=nguyen&page=1
  Response: { data: Customer[], total }

GET /api/customers/:id
  Response: Customer (PII decrypted for authorized roles)

GET /api/customers/:id/notes
GET /api/customers/:id/interactions?limit=10
POST /api/customers/:id/notes
  Body: { content }
```

### Tickets
```
GET /api/tickets?status=open&assigneeId=x
POST /api/tickets
  Body: { title, description, customerId, interactionId, priority }
GET /api/tickets/:id
PUT /api/tickets/:id
  Body: { status, priority, assigneeId }
POST /api/tickets/:id/comments
  Body: { content }
```

### Agent
```
GET /api/agents/me
PUT /api/agents/me/status
  Body: { channel: 'voice'|'chat'|'email', status: 'ready'|'not-ready', reason? }
POST /api/agents/heartbeat
  Body: { agentId, timestamp }
GET /api/agents/:id/stats
  Response: { handled, avgHandleTime, satisfaction }
```

### Notifications
```
GET /api/notifications?unread=true
  Response: { data: Notification[], unreadCount }
PUT /api/notifications/:id/read
PUT /api/notifications/read-all

WebSocket: /notifications
  Event 'notification': { id, type, title, body, priority }
```

### Knowledge Base
```
GET /api/kb/articles?q=loan+requirements&folder=xxx
  Response: { data: KbArticle[], total }
GET /api/kb/articles/:id
GET /api/kb/folders
  Response: FolderTree[]
POST /api/kb/bookmarks
  Body: { articleId }
```

### BFSI (Banking)
```
GET /api/bfsi/customers/:cif
GET /api/bfsi/customers/:cif/accounts
GET /api/bfsi/customers/:cif/savings
GET /api/bfsi/customers/:cif/loans
GET /api/bfsi/customers/:cif/cards
  Response: Product[] (account numbers masked/encrypted)
```

### AI Service
```
POST /api/ai/suggestions
  Body: { interactionId, context, transcript }
  Response: { suggestions: string[] }

POST /api/ai/summarize
  Body: { interactionId, transcript }
  Response: { summary }

POST /api/ai/classify
  Body: { text }
  Response: { intent, sentiment, confidence }
```

### Media
```
POST /api/v1/media
  Body: multipart/form-data { file, interactionId, type }
  Response: { id, url, name, size }

GET /api/v1/media/:id/stream
  Response: ReadableStream (audio/video)

GET /api/v1/media/interaction/:id
  Response: MediaFile[]
```

### CTI
```
POST /api/v1/cti/calls/answer   Body: { callId }
POST /api/v1/cti/calls/hold     Body: { callId }
POST /api/v1/cti/calls/transfer Body: { callId, destination }
POST /api/v1/cti/calls/end      Body: { callId }

WebSocket: /cti
  Event 'call.ringing': { callId, from, queue }
  Event 'call.answered': { callId }
  Event 'call.ended':    { callId, duration }
```

---

## 7. Database Schema Summary

**Pattern:** UUID PKs, `tenantId` on all multi-tenant tables, JSONB for dynamic fields, `createdAt`/`updatedAt` timestamps, soft deletes via `deletedAt`.

| Service | DB | Key Tables | Notable |
|---------|-----|------------|---------|
| Identity | identity_db | users, roles, refresh_tokens, login_attempts | PII encrypted |
| Agent | agent_db | agent_profiles, agent_channel_status, agent_sessions | |
| Interaction | interaction_db | interactions, interaction_notes, interaction_events | SLA fields |
| Ticket | ticket_db | tickets, ticket_comments, ticket_history | |
| Customer | customer_db | customers, customer_notes | phone/email/CIF encrypted |
| Notification | notification_db | notifications | state machine |
| Knowledge | knowledge_db | kb_articles, kb_folders, kb_bookmarks | TSVECTOR planned |
| BFSI | bfsi_db | bfsi_customers, accounts, savings, loans, cards | account# encrypted |
| AI | ai_db | ai_suggestions, ai_sessions | |
| Media | media_db | media_files, recordings | SeaweedFS FIDs |
| Audit | audit_db | audit_logs | immutable, hash chain |
| Schema | schema_db | object_schemas, field_definitions | JSONB config |
| Layout | layout_db | layout_configs, widget_configs | JSONB layouts |
| Workflow | workflow_db | workflow_definitions, workflow_instances, tasks | Temporal IDs |
| Enrichment | enrichment_db | enrichment_rules, enrichment_results | |
| Dashboard | dashboard_db | dashboard_configs, widgets, metric_snapshots | |
| Report | report_db | report_definitions, report_schedules | Superset chart IDs |
| CTI | cti_db | cti_calls, cti_sessions, cti_configs | adapter type |

**Total:** 18 databases, 54+ tables, 100+ indexes.

---

## 8. Security & Compliance

### Authentication & Sessions

| Control | Implementation |
|---------|----------------|
| Access token | JWT RS256, 15-minute expiry |
| Refresh token | Opaque, 7-day, single-use rotation |
| Session storage | Redis with TTL |
| Token blacklist | Redis SET on logout |
| MFA | TOTP (RFC 6238) via speakeasy |
| Account lockout | 5 failed attempts → 15-minute lock |
| Password storage | bcrypt (cost factor 12) |

### Authorization

```typescript
// Every controller method decorated:
@Roles('AGENT', 'SUPERVISOR')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Get('sensitive-endpoint')
async getResource() { ... }
```

**Roles:** SUPERADMIN, ADMIN, SUPERVISOR, AGENT, READONLY

### Data Protection (PII)

Fields encrypted with AES-256-GCM before PostgreSQL insert:
- Customer: `phone`, `email`, `nationalId`
- BFSI: `cif`, `accountNumber`, `cardNumber`
- Agent: (no PII fields currently encrypted)

**Rule:** Never log these fields in plaintext. Audit Service receives only masked values.

### Audit Trail

1. Every PATCH/POST/DELETE emits a Kafka event to `*.audit` topic
2. Audit Service consumes events and persists to `audit_db`
3. Each log includes: SHA-256 hash of previous record (hash chain)
4. Records are INSERT-only; no UPDATE/DELETE on audit_logs
5. Hash verification endpoint for compliance checks

### Kong API Gateway Security

- JWT validation on all routes (public key from Identity Service)
- Rate limiting: 100 req/min per IP (configurable)
- CORS: whitelist `localhost:3000`, `localhost:3020` in dev
- Request ID header injection for distributed tracing
- mTLS between Kong and services (planned for production)

---

## 9. Development Guidelines

### TypeScript Rules

- **Strict mode** — no `any`, no `!` non-null assertions unless truly unavoidable
- **Shared types** — define DTOs in service, reuse in frontend via copy (no shared lib yet)
- **Enums** — use string enums for readability in logs

### NestJS Patterns

```typescript
// ✅ Correct: Repository pattern
@Injectable()
export class TicketService {
  constructor(
    @InjectRepository(Ticket)
    private readonly ticketRepo: Repository<Ticket>,
  ) {}

  async findById(id: string): Promise<Ticket> {
    return this.ticketRepo.findOneOrFail({ where: { id } });
  }
}

// ❌ Wrong: Direct EntityManager
constructor(private em: EntityManager) {}
```

**Required on every controller:**
1. `@UseGuards(JwtAuthGuard)` — JWT validation
2. `@UseGuards(PermissionsGuard)` with `@Roles(...)` — RBAC
3. DTOs with `class-validator` decorators
4. Kafka publish on mutations (for audit)

### Frontend Patterns

```typescript
// ✅ Correct: TanStack Query for server state
const { data: tickets } = useQuery({
  queryKey: ['tickets', filters],
  queryFn: () => ticketApi.list(filters),
});

// ❌ Wrong: useState for server data
const [tickets, setTickets] = useState([]);
useEffect(() => { fetch('/api/tickets').then(...) }, []);
```

**Rules:**
- `useQuery` / `useMutation` for all server state
- React Context only for UI state (call widget open/closed, agent status panel)
- `@/` path alias for all internal imports
- Co-locate test files: `ComponentName.test.tsx` next to `ComponentName.tsx`

### Testing Strategy

```bash
# Run service tests
npx nx test identity-service
npx nx test ticket-service

# Run all service tests
npx nx run-many --target=test --all

# Frontend unit tests
npx nx test agent-desktop

# E2E (planned Phase 4 completion)
npx playwright test
```

**Coverage requirements:** 80% statements per service (enforced by jest.config.ts)

### Commit Convention

```
feat(service): description
fix(component): description
docs: description
chore: description
```

---

## 10. Remaining Work & Next Steps

### Phase 4 Remaining (19%)

**Priority 1 — Admin Module Completion:**

| Task | Component | Effort |
|------|-----------|--------|
| Role management UI | Admin Module | ~1 day |
| Audit log viewer | Admin Module | ~1 day |
| CTI configuration panel | Admin Module | ~1 day |

Role Management UI needs:
- `GET /api/users` (list users with roles)
- `PUT /api/users/:id/roles` (assign roles)
- `RoleManagement.tsx` page + `useRoles.ts` hook

Audit Log Viewer needs:
- `GET /api/audit/logs?service=x&action=x&from=x&to=x` (query)
- `AuditViewer.tsx` page with date filter + service filter

CTI Configuration Panel needs:
- `GET /api/v1/cti/config` + `PUT /api/v1/cti/config`
- `CTIConfig.tsx` page with adapter type selector + connection params

**Priority 2 — Testing:**

| Task | Tool | Scope |
|------|------|-------|
| E2E: Login flow | Playwright | Auth, MFA, redirect |
| E2E: Interaction flow | Playwright | Queue → answer → close |
| E2E: Ticket flow | Playwright | Create → comment → resolve |
| Kong routing validation | curl/Postman | All 18 service routes |

### Phase 5: Production Readiness (Future)

| Area | Task | Notes |
|------|------|-------|
| **Deployment** | K8s manifests (Helm charts) | Per-service Deployment + Service + HPA |
| **Security** | mTLS certificates (service mesh) | Istio or Linkerd |
| **Security** | BFSI hardening — PostgreSQL Row Level Security | Per-tenant data isolation |
| **Security** | Field-level encryption activation on all PII fields | AES-256-GCM wired in |
| **Observability** | Prometheus metrics + Grafana dashboards | Per-service RED metrics |
| **Observability** | Distributed tracing (Jaeger/Zipkin) | Request ID propagation |
| **Performance** | k6 load testing (SLA: 500 concurrent agents) | Baseline benchmarks |
| **Search** | Migrate KB search to Elasticsearch | Replace PostgreSQL ILIKE |
| **Search** | Interaction full-text search via Elasticsearch | Replace ILIKE |
| **Workflow** | Connect real Temporal server | Remove mock adapters |
| **Workflow** | Workflow designer UI (React Flow canvas) | Drag-drop workflow builder |
| **Dashboards** | Dashboard designer UI (drag-drop widgets) | Layout Service integration |
| **BI** | Superset embedded dashboard in Admin Module | Guest token flow |
| **CTI** | Real Genesys/Avaya credentials | Remove fake adapters |

---

## 11. Environment Setup

### Prerequisites

- Docker Desktop / Docker Engine with Compose v2
- Node.js 20+
- npm 10+

### Step 1: Start Infrastructure

```bash
cd /opt/project/AgentdesktopTPB
docker compose -f infra/docker-compose.yml up -d
# Wait ~60 seconds for Kafka, Elasticsearch, Temporal to be ready
```

### Step 2: Create Databases

```bash
bash infra/scripts/create-all-databases.sh
```

### Step 3: Configure Kong

```bash
bash infra/scripts/setup-kong-all.sh
# Or individually:
bash infra/scripts/setup-kong-identity.sh
bash infra/scripts/setup-kong-agent.sh
# ... (one per service)
```

### Step 4: Install Dependencies

```bash
npm install
```

### Step 5: Start Services

```bash
# Start all NestJS services (via Nx)
npx nx run-many --target=serve --all --parallel=10

# Or individually:
npx nx serve identity-service
npx nx serve agent-service
```

### Step 6: Start Frontend

```bash
# Agent Desktop
npx nx serve agent-desktop
# Opens http://localhost:3000

# Admin Module
npx nx serve admin-module
# Opens http://localhost:3020
```

### Step 7: Seed Data

```bash
bash infra/scripts/seed-users.sh        # Creates admin/agent/supervisor users
bash infra/scripts/seed-sample-data.sh  # Sample interactions, customers, tickets
```

### Environment Variables

Copy `apps/agent-desktop/.env.example` to `apps/agent-desktop/.env.development`:

```env
VITE_API_BASE_URL=http://localhost:8000
VITE_WS_URL=http://localhost:8000
VITE_APP_NAME=TPB Agent Desktop
```

### Default Credentials (Development Only)

| Role | Username | Password |
|------|----------|----------|
| Admin | admin | Admin@123456 |
| Supervisor | supervisor | Super@123456 |
| Agent | agent01 | Agent@123456 |

---

## 12. Known Limitations

### Mock / Incomplete Implementations

| Service | Limitation | Planned Fix |
|---------|-----------|-------------|
| **Workflow Service** | Temporal calls are mocked in unit tests | Phase 5: Wire real Temporal at :7233 |
| **Knowledge Service** | Uses PostgreSQL `ILIKE` for search | Phase 5: Migrate to Elasticsearch 8 |
| **BFSI Core Service** | Returns seeded fake banking data | Phase 5: Integrate real core banking adapter |
| **AI Service** | Uses template-based responses (no LLM) | Phase 5: Wire Anthropic/OpenAI API |
| **Report Service** | Superset integration partially tested | Requires Superset setup with sample dashboards |
| **CTI Adapter Service** | Genesys/Avaya adapters use fake responses | Phase 5: Real CTI credentials required |

### Production Security Gaps

| Gap | Risk | Mitigation Plan |
|-----|------|----------------|
| mTLS not enforced between services | Medium | Istio sidecar injection in K8s |
| PostgreSQL RLS not enabled | Medium | Enable in Phase 5 migration |
| PII encryption wired but not all fields covered | Medium | Audit all entity fields in Phase 5 |
| Rate limits not tuned for production load | Low | Tune after k6 load testing |
| Superset not secured (no auth in dev) | Low | Production: enable Superset auth |

### Architectural Debt

- No shared TypeScript types library between frontend and backend (manual sync required)
- Admin Module lacks granular RBAC for admin actions (single "ADMIN" role)
- Notification Service does not yet support email/SMS delivery (in-app only)
- No service-to-service authentication (direct HTTP, no mTLS in dev)
- Dashboard Service metrics are computed on-demand (no time-series DB)

---

*Last Updated: 2026-03-12 | Maintained by: Development Team*
*For questions, see CLAUDE.md for AI agent guidelines.*
