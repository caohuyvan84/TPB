# TPB CRM Platform — Implementation Plan

**Version:** 1.0
**Date:** 2026-03-07
**Baseline:** FullStack-RequirementsV3.md (v3.0)
**Scope:** Full-stack build — 19 microservices, 2 frontend modules, BFSI security
**Team:** 1–3 developers
**Total Duration:** ~38 weeks (4 phases)

---

## Table of Contents

1. [Overview & Principles](#1-overview--principles)
2. [Phase 0: Foundation Setup](#2-phase-0-foundation-setup-sprint-0--2-tuần)
3. [Phase 1: Core MVP](#3-phase-1-core-mvp-sprint-1-6--12-tuần)
4. [Phase 2: Advanced Features](#4-phase-2-advanced-features-sprint-7-12--12-tuần)
5. [Phase 3: Automation & Analytics](#5-phase-3-automation--analytics-sprint-13-18--12-tuần)
6. [Go-Live Criteria](#6-go-live-criteria)
7. [Testing Strategy](#7-testing-strategy)
8. [Dependency Map](#8-dependency-map)
9. [Risk Register](#9-risk-register)
10. [Tech Stack Reference](#10-tech-stack-reference)

---

## 1. Overview & Principles

### Strategy

- **Incremental Go-Live** — 3 production milestones within 4 phases
- **Frontend-First Integration** — replace mock data one feature at a time; UI always works
- **Backend NestJS Monorepo** — shared types between FE/BE via `packages/shared`
- **Docker Compose First** — all infra in compose; upgradeable to K8s later
- **No Big Bang** — each sprint has a releasable increment

### Core Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Backend framework | NestJS (TypeScript) | Full-stack TS, shared types, NestJS DI |
| API protocol | REST + WebSocket (STOMP) | REST for CRUD, WS for real-time |
| Database (primary) | PostgreSQL 18 | ACID, JSONB for dynamic fields, RLS |
| Cache | Redis 8 | Session, queue, pub/sub |
| Search | Elasticsearch 9 | Full-text KB + interaction search |
| File storage | MinIO (S3-compatible) | On-prem, upgradeable to S3 |
| Message bus | Apache Kafka | Event-driven, audit streaming |
| Workflow engine | Temporal (self-hosted) | Durable execution, SLA automation |
| BI reporting | Apache Superset | Embedded, agent never accesses directly |
| Workflow designer | React Flow | Custom canvas, re-usable for schema relationships |
| State (FE server) | TanStack Query (React Query) | Caching, background sync, optimistic updates |
| Auth | JWT (access 15m) + Refresh (7d) + MFA | BFSI requirement |
| API Gateway | Kong  | mTLS termination, rate limiting, JWT validation |
| Service mesh | Istio | mTLS everywhere, observability |
| Monorepo tool | Nx | Code sharing, affected-build optimization |

### Repository Structure

```
/
├── apps/
│   ├── agent-desktop/          # React 18 SPA (EXISTING — preserved)
│   ├── admin-module/           # React 18 SPA (NEW)
│   └── api-gateway/            # Kong config 
├── services/
│   ├── identity-service/       # MS-1
│   ├── agent-service/          # MS-2
│   ├── interaction-service/    # MS-3
│   ├── ticket-service/         # MS-4
│   ├── customer-service/       # MS-5
│   ├── notification-service/   # MS-6
│   ├── knowledge-service/      # MS-7
│   ├── bfsi-core-service/      # MS-8
│   ├── ai-service/             # MS-9
│   ├── media-service/          # MS-10
│   ├── audit-service/          # MS-11
│   ├── object-schema-service/  # MS-13
│   ├── layout-service/         # MS-14
│   ├── workflow-service/       # MS-15
│   ├── data-enrichment-service/# MS-16
│   ├── dashboard-service/      # MS-17
│   ├── report-service/         # MS-18
│   └── cti-adapter-service/    # MS-19
├── packages/
│   ├── shared-types/           # Shared TypeScript interfaces (FE + BE)
│   ├── shared-dto/             # DTOs (Zod schemas)
│   └── shared-utils/           # Date, format, validation utils
├── infra/
│   ├── docker-compose.yml      # All services + infra
│   ├── docker-compose.dev.yml  # Dev overrides
│   └── k8s/                    # Future K8s manifests (placeholder)
├── .github/
│   └── workflows/              # CI/CD pipelines
└── nx.json / package.json      # Nx monorepo config
```

---

## 2. Phase 0: Foundation Setup (Sprint 0 — 2 tuần)

**Goal:** Môi trường phát triển hoàn chỉnh. Tất cả developer có thể `docker compose up` và chạy app locally.

**Go-Live Milestone:** N/A (internal only)

---

### P0-1: Git & Project Setup (Day 1-2)

| Task | Description | Owner |
|---|---|---|
| P0-1.1 | `git init` tại project root | Dev |
| P0-1.2 | Tạo `.gitignore` (node_modules, .env, build, dist) | Dev |
| P0-1.3 | Init Nx monorepo: `npx create-nx-workspace@latest` | Dev |
| P0-1.4 | Di chuyển existing frontend vào `apps/agent-desktop/` | Dev |
| P0-1.5 | Tạo `apps/admin-module/` skeleton (Vite + React 18 + TS) | Dev |
| P0-1.6 | Tạo `packages/shared-types/` với initial types từ existing contexts | Dev |
| P0-1.7 | Tạo `packages/shared-dto/` với Zod schemas | Dev |

**Output:** Monorepo chạy được, `nx build agent-desktop` thành công.

---

### P0-2: TypeScript & Code Quality (Day 2-3)

| Task | Description |
|---|---|
| P0-2.1 | Tạo `tsconfig.base.json` (strict: true, paths, decorators) |
| P0-2.2 | Tạo `tsconfig.json` cho mỗi app/service extends base |
| P0-2.3 | Cài ESLint + `@typescript-eslint/parser` + Prettier |
| P0-2.4 | Tạo `.eslintrc.json`, `.prettierrc` tại root |
| P0-2.5 | Cài Tailwind CSS build pipeline cho agent-desktop (tailwind.config.ts) |
| P0-2.6 | Cài Tailwind CSS cho admin-module |

**Output:** `nx lint` và `nx build` pass. TypeScript strict mode không có lỗi trên existing code.

> **Note:** Existing `src/index.css` (5,048 dòng pre-compiled) sẽ được thay thế dần bằng Tailwind build pipeline. Trong Phase 0, giữ nguyên để không break UI.

---

### P0-3: Infrastructure — Docker Compose (Day 3-6)

**File:** `infra/docker-compose.yml`

```yaml
# Services to define:
services:
  postgres:        # PostgreSQL 18 — port 5432
  redis:           # Redis 9 — port 6379
  kafka:           # Apache Kafka (KRaft mode) — port 9092
  kafka-ui:        # Kafdrop/Kafka UI — port 9000 (dev only)
  elasticsearch:   # Elasticsearch 9 — port 9200
  kibana:          # Kibana — port 5601 (dev only)
  minio:           # MinIO — port 9001 (API), 9090 (console)
  temporal:        # Temporal server — port 7233
  temporal-ui:     # Temporal Web UI — port 8233 (dev only)
  superset:        # Apache Superset — port 8088 (admin only)
  mailhog:         # MailHog SMTP trap — port 1025/8025 (dev only)
```

| Task | Description |
|---|---|
| P0-3.1 | Viết `docker-compose.yml` với tất cả infra services |
| P0-3.2 | Viết `docker-compose.dev.yml` với dev overrides (volumes, hot reload) |
| P0-3.3 | Tạo init scripts cho PostgreSQL (create databases per service) |
| P0-3.4 | Tạo `infra/scripts/init-db.sh` — tạo 15+ databases (1 per service) |
| P0-3.5 | Tạo `infra/scripts/seed-dev.sh` — seed dữ liệu test |
| P0-3.6 | Tạo `.env.example` với tất cả required variables |
| P0-3.7 | Verify: `docker compose up -d` — tất cả services healthy |

**Environment Variables cần định nghĩa:**
```
# PostgreSQL
POSTGRES_HOST, POSTGRES_PORT, POSTGRES_USER, POSTGRES_PASSWORD

# Per-service databases
IDENTITY_DB_NAME, AGENT_DB_NAME, INTERACTION_DB_NAME, ...

# Redis
REDIS_URL

# Kafka
KAFKA_BROKERS

# Elasticsearch
ELASTICSEARCH_URL

# MinIO
MINIO_ENDPOINT, MINIO_ACCESS_KEY, MINIO_SECRET_KEY

# Temporal
TEMPORAL_ADDRESS

# JWT
JWT_SECRET, JWT_REFRESH_SECRET, JWT_EXPIRES_IN=900, JWT_REFRESH_EXPIRES_IN=604800

# Superset
SUPERSET_URL, SUPERSET_ADMIN_USER, SUPERSET_ADMIN_PASSWORD
```

---

### P0-4: NestJS Monorepo Scaffold (Day 5-8)

| Task | Description |
|---|---|
| P0-4.1 | `nx g @nx/nest:app identity-service` — scaffold MS-1 |
| P0-4.2 | `nx g @nx/nest:app agent-service` — scaffold MS-2 |
| P0-4.3 | `nx g @nx/nest:app interaction-service` — scaffold MS-3 |
| P0-4.4 | `nx g @nx/nest:app ticket-service` — scaffold MS-4 |
| P0-4.5 | `nx g @nx/nest:app customer-service` — scaffold MS-5 |
| P0-4.6 | `nx g @nx/nest:app notification-service` — scaffold MS-6 |
| P0-4.7 | Scaffold remaining 13 services (stubs only) |
| P0-4.8 | Cài NestJS shared dependencies: `@nestjs/typeorm`, `@nestjs/jwt`, `@nestjs/websockets`, `@nestjs/microservices` |
| P0-4.9 | Tạo `libs/nest-common/` — shared NestJS modules (auth guard, audit interceptor, exception filters) |

**Mỗi service cần có:**
```
services/[service-name]/
├── src/
│   ├── main.ts                 # Bootstrap với port config
│   ├── app.module.ts           # Root module
│   ├── health/                 # Health check endpoint
│   └── [domain]/
│       ├── [domain].module.ts
│       ├── [domain].controller.ts
│       ├── [domain].service.ts
│       ├── [domain].repository.ts
│       ├── entities/
│       ├── dto/
│       └── events/
├── Dockerfile
├── .env.example
└── README.md
```

---

### P0-5: Testing Framework (Day 7-9)

| Task | Description |
|---|---|
| P0-5.1 | Cài Vitest cho frontend (agent-desktop + admin-module) |
| P0-5.2 | Cài Jest cho backend services (NestJS testing module) |
| P0-5.3 | Cài Playwright cho E2E tests |
| P0-5.4 | Cài `@testing-library/react` cho component tests |
| P0-5.5 | Cài `supertest` cho API integration tests |
| P0-5.6 | Viết sample test: `useInteractionStats.test.ts` (existing hook) |
| P0-5.7 | Cấu hình coverage thresholds: 70% minimum |

---

### P0-6: CI/CD Pipeline (Day 8-10)

**File:** `.github/workflows/`

| Task | Description |
|---|---|
| P0-6.1 | `ci.yml` — on PR: lint + typecheck + unit tests |
| P0-6.2 | `build.yml` — on push main: build all apps + services |
| P0-6.3 | `e2e.yml` — on push main: Playwright E2E (sau Phase 1) |
| P0-6.4 | Cài `nx affected` để chỉ build/test những gì thay đổi |
| P0-6.5 | Cấu hình secrets: DB creds, JWT secret, MinIO creds |

---

### P0-7: API Client & WebSocket Setup (Day 9-10)

| Task | Description |
|---|---|
| P0-7.1 | Tạo `packages/api-client/` — Axios instance với interceptors |
| P0-7.2 | Cấu hình: base URL từ env, JWT attach, 401 → refresh token |
| P0-7.3 | Tạo `packages/ws-client/` — WebSocket client wrapper (STOMP) |
| P0-7.4 | Cài TanStack Query (React Query) vào agent-desktop |
| P0-7.5 | Tạo `QueryClientProvider` wrapper trong App.tsx |

---

### Phase 0 Exit Criteria

- [ ] `docker compose up -d` — tất cả infra services healthy
- [ ] `nx build agent-desktop` — thành công, UI chạy được tại localhost:3000
- [ ] `nx lint` — không có lỗi
- [ ] `nx test` — sample tests pass
- [ ] Tất cả 19 service stubs có health endpoint `/health` trả về `{status: "ok"}`
- [ ] `.env.example` đầy đủ, developer mới có thể setup trong 30 phút

---

## 3. Phase 1: Core MVP (Sprint 1-6 — 12 tuần)

**Goal:** Agent có thể đăng nhập, xem interaction queue real (từ API), quản lý ticket, xem thông tin customer. Không còn mock data cho core flows.

**Go-Live 1 Milestone:** Agent Desktop với real data — tháng 3 sau Phase 0.

---

### Sprint 1-2: Authentication & Identity (MS-1)

#### Backend: MS-1 Identity Service

| Task | Endpoint | Description |
|---|---|---|
| P1-1.1 | `POST /auth/login` | JWT + refresh token, MFA trigger |
| P1-1.2 | `POST /auth/refresh` | Rotate refresh token |
| P1-1.3 | `POST /auth/logout` | Invalidate refresh token (Redis blacklist) |
| P1-1.4 | `POST /auth/mfa/verify` | TOTP verification |
| P1-1.5 | `GET /auth/me` | Current user profile |
| P1-1.6 | `GET /roles` | List roles |
| P1-1.7 | `POST /users` | Create user (admin) |
| P1-1.8 | `PATCH /users/:id/roles` | Assign roles |
| P1-1.9 | Implement RBAC middleware (NestJS Guard) | Decorator-based `@Roles()` |
| P1-1.10 | Password hashing: bcrypt (cost factor 12) | |
| P1-1.11 | Session store: Redis với TTL | |
| P1-1.12 | Rate limiting: 5 failed logins → 15 min lockout | |

**Database schema:**
```sql
-- Identity DB
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  mfa_secret TEXT,           -- TOTP secret (encrypted)
  mfa_enabled BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE roles (id, name, permissions JSONB, ...);
CREATE TABLE user_roles (user_id, role_id, ...);
CREATE TABLE refresh_tokens (id, user_id, token_hash, expires_at, revoked, ...);
CREATE TABLE login_attempts (id, user_id, ip, success, attempted_at, ...);
```

#### Frontend: Auth Integration

| Task | Description |
|---|---|
| P1-1.F1 | Tạo `LoginPage.tsx` — form đăng nhập (username + password + MFA) |
| P1-1.F2 | Tạo `AuthContext.tsx` — login, logout, token management |
| P1-1.F3 | Tạo `PrivateRoute` component — redirect to login nếu unauthenticated |
| P1-1.F4 | Implement React Router: `/login`, `/agent/*`, `/admin/*` |
| P1-1.F5 | JWT auto-refresh interceptor trong api-client |
| P1-1.F6 | Persist auth state (httpOnly cookie hoặc memory + refresh rotation) |

---

### Sprint 2-3: Agent Management (MS-2)

#### Backend: MS-2 Agent Service

| Task | Endpoint | Description |
|---|---|---|
| P1-2.1 | `GET /agents/me` | Current agent profile |
| P1-2.2 | `PATCH /agents/me/status` | Update channel status (ready/not-ready + reason) |
| P1-2.3 | `GET /agents/me/status` | Current status per channel |
| P1-2.4 | `GET /agents` | List agents (supervisor) |
| P1-2.5 | `GET /agents/:id/status` | Agent status (supervisor) |
| P1-2.6 | WS `/ws/agent/{agentId}/status` | Real-time status updates |
| P1-2.7 | WS `/ws/agent/{agentId}/presence` | Presence (online/offline) |
| P1-2.8 | Presence heartbeat: agent pings every 30s | |
| P1-2.9 | Status duration tracking (calculate time-in-state) | |

#### Frontend: Agent Status Integration

| Task | Description |
|---|---|
| P1-2.F1 | Update `EnhancedAgentStatusContext.tsx` — replace mock với API calls |
| P1-2.F2 | Connect WebSocket `/ws/agent/{agentId}/status` |
| P1-2.F3 | `AgentStatusWidget.tsx` — hiển thị real status, duration từ server |
| P1-2.F4 | Keyboard shortcuts (Ctrl+R, Ctrl+N) → PATCH /agents/me/status |

---

### Sprint 3-4: Interaction Queue (MS-3)

#### Backend: MS-3 Interaction Service (Core)

| Task | Endpoint | Description |
|---|---|---|
| P1-3.1 | `GET /interactions` | List interactions (filters: channel, status, priority, search) |
| P1-3.2 | `GET /interactions/:id` | Interaction detail |
| P1-3.3 | `PATCH /interactions/:id` | Update interaction (status, notes, disposition) |
| P1-3.4 | `POST /interactions/:id/notes` | Add note to interaction |
| P1-3.5 | `GET /interactions/:id/timeline` | Interaction timeline events |
| P1-3.6 | WS `/ws/interactions/{agentId}/queue` | Real-time queue updates |
| P1-3.7 | WS `/ws/interactions/{interactionId}/sla` | SLA countdown |
| P1-3.8 | SLA engine: calculate deadlines, publish breaches to Kafka | |
| P1-3.9 | Interaction state machine: `new → assigned → in-progress → resolved → closed` | |
| P1-3.10 | Kafka consumer: receive events from CTI/Email/Chat gateways | |

**Database schema (Interaction DB):**
```sql
CREATE TABLE interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel TEXT NOT NULL,          -- voice, email, chat
  status TEXT NOT NULL,           -- new, assigned, in-progress, resolved, closed
  priority TEXT NOT NULL,         -- urgent, high, medium, low
  subject TEXT,
  assigned_agent_id UUID,
  customer_id UUID,
  sla_due_at TIMESTAMPTZ,
  sla_breached BOOLEAN DEFAULT false,
  started_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  dynamic_fields JSONB DEFAULT '{}',  -- for future dynamic fields
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE interaction_notes (id, interaction_id, agent_id, content, created_at, ...);
CREATE TABLE interaction_events (id, interaction_id, type, data JSONB, occurred_at, ...);
```

#### Frontend: Interaction List Integration

| Task | Description |
|---|---|
| P1-3.F1 | Update `useInteractionStats.tsx` — replace mock array với React Query |
| P1-3.F2 | `GET /interactions` với query params từ filter state |
| P1-3.F3 | `InteractionList.tsx` — hiển thị real data, infinite scroll / pagination |
| P1-3.F4 | Connect WS `/ws/interactions/{agentId}/queue` — new item notification |
| P1-3.F5 | SLA countdown timer từ WS `/ws/interactions/{interactionId}/sla` |
| P1-3.F6 | Note saving: `POST /interactions/:id/notes` |

---

### Sprint 4: Customer Information (MS-5)

#### Backend: MS-5 Customer Service (Core)

| Task | Endpoint | Description |
|---|---|---|
| P1-5.1 | `GET /customers` | Search customers (name, phone, CIF) |
| P1-5.2 | `GET /customers/:id` | Customer profile |
| P1-5.3 | `GET /customers/:id/interactions` | Customer interaction history |
| P1-5.4 | `GET /customers/:id/tickets` | Customer tickets |
| P1-5.5 | `POST /customers/:id/notes` | Add customer note |
| P1-5.6 | `GET /customers/:id/notes` | List customer notes |
| P1-5.7 | `PATCH /customers/:id` | Update customer (agent-editable fields only) |

**Database schema (Customer DB):**
```sql
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cif TEXT UNIQUE NOT NULL,          -- Core Banking ID (encrypted at rest)
  full_name TEXT NOT NULL,
  email TEXT,                        -- PII — encrypted
  phone TEXT,                        -- PII — encrypted
  segment TEXT,                      -- individual, sme, corporate
  is_vip BOOLEAN DEFAULT false,
  avatar_url TEXT,
  satisfaction_rating INTEGER,
  dynamic_fields JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE customer_notes (id, customer_id, agent_id, content, created_at, ...);
```

#### Frontend: Customer Info Integration

| Task | Description |
|---|---|
| P1-5.F1 | `CustomerInfoScrollFixed.tsx` — replace mock với React Query `GET /customers/:id` |
| P1-5.F2 | Customer search trong header — `GET /customers?search=` |
| P1-5.F3 | Customer notes: POST + GET `/customers/:id/notes` |
| P1-5.F4 | Interaction history tab: `GET /customers/:id/interactions` |

---

### Sprint 5: Ticket Management (MS-4)

#### Backend: MS-4 Ticket Service

| Task | Endpoint | Description |
|---|---|---|
| P1-4.1 | `GET /tickets` | List tickets (filters: status, priority, agent, customer) |
| P1-4.2 | `POST /tickets` | Create ticket |
| P1-4.3 | `GET /tickets/:id` | Ticket detail |
| P1-4.4 | `PATCH /tickets/:id` | Update ticket (status, priority, assignment, fields) |
| P1-4.5 | `DELETE /tickets/:id` | Soft-delete (admin only) |
| P1-4.6 | `POST /tickets/:id/comments` | Add comment |
| P1-4.7 | `GET /tickets/:id/comments` | List comments |
| P1-4.8 | `GET /tickets/:id/history` | Change history (audit trail) |
| P1-4.9 | Ticket state machine: `open → in-progress → pending → resolved → closed` | |
| P1-4.10 | Ticket display ID generation: `TK-YYYY-NNNNNN` | |

**Database schema (Ticket DB):**
```sql
CREATE TABLE tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  display_id TEXT UNIQUE NOT NULL,    -- TK-2026-000001
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  priority TEXT NOT NULL DEFAULT 'medium',
  category TEXT,
  department TEXT,
  assigned_agent_id UUID,
  customer_id UUID NOT NULL,
  interaction_id UUID,
  due_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  dynamic_fields JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE ticket_comments (id, ticket_id, agent_id, content, is_internal, created_at, ...);
CREATE TABLE ticket_history (id, ticket_id, agent_id, field_name, old_value, new_value, changed_at, ...);
```

#### Frontend: Ticket Integration

| Task | Description |
|---|---|
| P1-4.F1 | `CreateTicketDialog.tsx` — submit tới `POST /tickets` |
| P1-4.F2 | `TicketDetail.tsx` — load từ `GET /tickets/:id`, save với `PATCH /tickets/:id` |
| P1-4.F3 | Ticket list trong Customer Info panel — `GET /customers/:id/tickets` |
| P1-4.F4 | Comments: POST + GET `/tickets/:id/comments` |
| P1-4.F5 | Status transitions — validate với state machine rules |

---

### Sprint 6: Notifications (MS-6)

#### Backend: MS-6 Notification Service

| Task | Endpoint | Description |
|---|---|---|
| P1-6.1 | `GET /notifications` | List notifications (paginated) |
| P1-6.2 | `PATCH /notifications/:id/state` | Update state (viewed/actioned/dismissed) |
| P1-6.3 | `POST /notifications/mark-all-read` | Bulk mark as viewed |
| P1-6.4 | `GET /notifications/unread-count` | Badge count |
| P1-6.5 | WS `/ws/notifications/{agentId}` | Push new notifications |
| P1-6.6 | Kafka consumer: receive notification events from all services | |
| P1-6.7 | Notification state machine: `new → viewed → actioned → dismissed` | |
| P1-6.8 | Auto-hide after TTL (configurable per notification type) | |

#### Frontend: Notification Integration

| Task | Description |
|---|---|
| P1-6.F1 | `NotificationContext.tsx` — replace mock với API + WebSocket |
| P1-6.F2 | `NotificationCenter.tsx` — load từ `GET /notifications` |
| P1-6.F3 | Connect WS `/ws/notifications/{agentId}` — push new notifications |
| P1-6.F4 | Unread badge count từ `GET /notifications/unread-count` |

---

### Phase 1 Exit Criteria (Go-Live 1)

- [ ] Agent có thể đăng nhập với real credentials (JWT + MFA)
- [ ] Interaction queue hiển thị real data từ database
- [ ] Ticket CRUD đầy đủ — tạo, xem, cập nhật, comment
- [ ] Customer info panel hiển thị real customer data
- [ ] Notifications hoạt động real-time qua WebSocket
- [ ] Agent status sync với server — persist qua page refresh
- [ ] Tất cả mock data trong App.tsx đã được replace cho 5 services trên
- [ ] Unit test coverage ≥ 70% cho mỗi service
- [ ] API response time P99 < 500ms tại 100 concurrent users
- [ ] Zero critical security vulnerabilities (OWASP scan)

---

## 4. Phase 2: Advanced Features (Sprint 7-12 — 12 tuần)

**Goal:** Knowledge base, BFSI queries, AI assistant, media handling, CTI integration, dynamic object schemas, audit trail.

**Go-Live 2 Milestone:** Full Agent Desktop + CTI + Dynamic Objects — sau Phase 1.

---

### Sprint 7: Knowledge Base & BFSI Core (MS-7, MS-8)

#### Backend: MS-7 Knowledge Service

| Task | Endpoint | Description |
|---|---|---|
| P2-7.1 | `GET /kb/articles` | List + search articles (Elasticsearch) |
| P2-7.2 | `GET /kb/articles/:id` | Article detail |
| P2-7.3 | `POST /kb/articles` | Create article (agent/admin) |
| P2-7.4 | `PATCH /kb/articles/:id` | Update article |
| P2-7.5 | `GET /kb/folders` | Folder tree |
| P2-7.6 | `POST /kb/bookmarks` | Bookmark article |
| P2-7.7 | `GET /kb/bookmarks` | Agent's bookmarks |
| P2-7.8 | `GET /kb/articles/:id/related` | AI-powered related articles |
| P2-7.9 | Full-text search via Elasticsearch | Index articles on create/update |

#### Backend: MS-8 BFSI Core Banking Service

| Task | Endpoint | Description |
|---|---|---|
| P2-8.1 | `GET /bfsi/customers/:cif/accounts` | Account summary |
| P2-8.2 | `GET /bfsi/customers/:cif/savings` | Savings products |
| P2-8.3 | `GET /bfsi/customers/:cif/loans` | Loan products |
| P2-8.4 | `GET /bfsi/customers/:cif/cards` | Card products |
| P2-8.5 | `GET /bfsi/customers/:cif/transactions` | Recent transactions (paginated) |
| P2-8.6 | `POST /bfsi/query` | General product query (Core Banking proxy) |
| P2-8.7 | Core Banking adapter interface — mock adapter for Phase 2, real adapter Phase 3 | |
| P2-8.8 | Field-level PII encryption (account numbers, balances) | |

#### Frontend: KB & BFSI Integration

| Task | Description |
|---|---|
| P2-7.F1 | `KnowledgeBaseSearch.tsx` — replace mock với `GET /kb/articles?search=` |
| P2-7.F2 | Folder tree từ `GET /kb/folders` |
| P2-7.F3 | Bookmark: `POST /kb/bookmarks` |
| P2-8.F1 | `InformationQuery.tsx` — replace mock với BFSI API calls |
| P2-8.F2 | `CoreBFSI.tsx` — account/savings/loan/card real data |
| P2-8.F3 | `LoanDetailWithTabs.tsx` — real loan data |

---

### Sprint 8: AI & Media Services (MS-9, MS-10)

#### Backend: MS-9 AI Service

| Task | Endpoint | Description |
|---|---|---|
| P2-9.1 | `POST /ai/suggest` | Context-aware response suggestion |
| P2-9.2 | `POST /ai/summarize` | Interaction/ticket summarization |
| P2-9.3 | `POST /ai/classify` | Ticket auto-classification |
| P2-9.4 | `POST /ai/sentiment` | Customer sentiment analysis |
| P2-9.5 | `POST /ai/generate` | AI text generation (email draft, etc.) |
| P2-9.6 | LLM provider abstraction (OpenAI / local LLM) | |
| P2-9.7 | Prompt templates management | |
| P2-9.8 | AI response caching (Redis) — 5 min TTL | |

#### Backend: MS-10 Media Service

| Task | Endpoint | Description |
|---|---|---|
| P2-10.1 | `POST /media/upload` | Upload file → MinIO, virus scan |
| P2-10.2 | `GET /media/:id/url` | Pre-signed download URL (5 min TTL) |
| P2-10.3 | `GET /media/recordings/:interactionId` | List call recordings |
| P2-10.4 | `GET /media/recordings/:id/stream` | Streaming pre-signed URL |
| P2-10.5 | Virus scanning: ClamAV integration | |
| P2-10.6 | Recording storage lifecycle (MinIO → cold storage after 90 days) | |

#### Frontend: AI & Media Integration

| Task | Description |
|---|---|
| P2-9.F1 | AI Assistant panel — real suggestions từ `POST /ai/suggest` |
| P2-9.F2 | Summarize button trong InteractionDetail — `POST /ai/summarize` |
| P2-10.F1 | `CallRecordingPlayer.tsx` — stream URL từ `GET /media/recordings/:id/stream` |
| P2-10.F2 | File attachments trong email — upload via `POST /media/upload` |

---

### Sprint 9: Audit & CTI Adapter (MS-11, MS-19)

#### Backend: MS-11 Audit Service

| Task | Description |
|---|---|
| P2-11.1 | Kafka consumer — consume audit events từ ALL services |
| P2-11.2 | Immutable audit log storage (PostgreSQL + write-only user) |
| P2-11.3 | `GET /audit/logs` — query audit logs (admin only) |
| P2-11.4 | Tamper detection: hash chaining |
| P2-11.5 | AuditInterceptor NestJS interceptor — tự động log mọi mutating request |
| P2-11.6 | Data retention policy: 7 years (configurable) |

**Audit Log Schema:**
```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY,
  sequence BIGSERIAL,
  event_type TEXT NOT NULL,      -- user.login, ticket.updated, etc.
  actor_id UUID,
  actor_role TEXT,
  resource_type TEXT,
  resource_id UUID,
  action TEXT,                   -- create, read, update, delete
  old_values JSONB,
  new_values JSONB,
  ip_address INET,
  user_agent TEXT,
  prev_hash TEXT,                -- hash chaining
  event_hash TEXT,               -- SHA-256(event_data + prev_hash)
  occurred_at TIMESTAMPTZ NOT NULL
) WITH (fillfactor = 100);       -- no updates allowed

-- Row-Level Security
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY audit_insert_only ON audit_logs FOR INSERT TO audit_writer WITH CHECK (true);
CREATE POLICY audit_read_admin ON audit_logs FOR SELECT TO audit_reader USING (true);
```

#### Backend: MS-19 CTI Adapter Service

| Task | Description |
|---|---|
| P2-19.1 | Define abstract `ICTIAdapter` interface |
| P2-19.2 | Implement `AsteriskAdapter` (SIP.js WebRTC) — Phase 2 |
| P2-19.3 | Stub `GenesysAdapter`, `AvayaAdapter` — Phase 3 |
| P2-19.4 | `POST /cti/calls/answer` — answer incoming call |
| P2-19.5 | `POST /cti/calls/hangup` — end call |
| P2-19.6 | `POST /cti/calls/transfer` — blind/attended transfer |
| P2-19.7 | `POST /cti/calls/hold` — hold/resume |
| P2-19.8 | WS `/ws/cti/{agentId}/call` — real-time call state |
| P2-19.9 | `GET /admin/cti/config` — CTI configuration |
| P2-19.10 | `PATCH /admin/cti/config` — update CTI config |

#### Frontend: CTI Integration

| Task | Description |
|---|---|
| P2-19.F1 | Tạo `CTIProvider` (React Context) — adapter-agnostic |
| P2-19.F2 | `FloatingCallWidget.tsx` — connect tới WS `/ws/cti/{agentId}/call` |
| P2-19.F3 | `TransferCallDialog.tsx` — `POST /cti/calls/transfer` |
| P2-19.F4 | `CallContext.tsx` — replace mock với CTI adapter events |

---

### Sprint 10-11: Dynamic Object Schema (MS-13, MS-14)

#### Backend: MS-13 Object Schema Service

| Task | Endpoint | Description |
|---|---|---|
| P2-13.1 | `GET /schemas` | List object types |
| P2-13.2 | `GET /schemas/:objectType` | Schema definition with all fields |
| P2-13.3 | `POST /admin/schemas` | Create object type (admin) |
| P2-13.4 | `POST /admin/schemas/:objectType/fields` | Add dynamic field |
| P2-13.5 | `PATCH /admin/schemas/:objectType/fields/:fieldId` | Update field |
| P2-13.6 | `DELETE /admin/schemas/:objectType/fields/:fieldId` | Delete field |
| P2-13.7 | `GET /admin/schemas/:objectType/relationships` | Schema relationships |
| P2-13.8 | `POST /admin/schemas/:objectType/relationships` | Add relationship |
| P2-13.9 | Schema versioning — track changes | |
| P2-13.10 | WS `/ws/schemas/updates` — live schema updates | |

**Database schema (Schema DB):**
```sql
CREATE TABLE object_types (
  id UUID PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,    -- ticket, customer, interaction, kb-article
  label TEXT NOT NULL,
  description TEXT,
  version INTEGER DEFAULT 1,
  is_system BOOLEAN DEFAULT false,  -- system types cannot be deleted
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE field_definitions (
  id UUID PRIMARY KEY,
  object_type_id UUID REFERENCES object_types(id),
  name TEXT NOT NULL,           -- API field name (snake_case)
  label TEXT NOT NULL,          -- Display label (Vietnamese OK)
  field_type TEXT NOT NULL,     -- text, number, date, enum, boolean, reference, etc.
  is_required BOOLEAN DEFAULT false,
  is_system BOOLEAN DEFAULT false,  -- cannot be deleted
  config JSONB DEFAULT '{}',    -- type-specific config (enum options, reference target, etc.)
  display_order INTEGER,
  data_source TEXT DEFAULT 'local',  -- local, external, computed
  is_sensitive BOOLEAN DEFAULT false,  -- PII flag
  UNIQUE (object_type_id, name)
);

CREATE TABLE schema_relationships (
  id UUID PRIMARY KEY,
  source_type_id UUID REFERENCES object_types(id),
  target_type_id UUID REFERENCES object_types(id),
  relationship_type TEXT NOT NULL,  -- one-to-one, one-to-many, many-to-many
  source_field TEXT NOT NULL,
  target_field TEXT NOT NULL
);
```

#### Backend: MS-14 Layout Service

| Task | Endpoint | Description |
|---|---|---|
| P2-14.1 | `GET /layouts/:objectType/:context` | Layout config (context: detail, list, form, card) |
| P2-14.2 | `POST /admin/layouts` | Create layout |
| P2-14.3 | `PUT /admin/layouts/:id` | Update layout |
| P2-14.4 | `GET /admin/layouts` | List layouts |
| P2-14.5 | Layout versioning + rollback | |
| P2-14.6 | Conditional visibility rules per field | |

**Layout schema (JSONB):**
```json
{
  "objectType": "ticket",
  "context": "detail",
  "sections": [
    {
      "id": "section-1",
      "title": "Thông tin cơ bản",
      "columns": 2,
      "fields": [
        { "fieldName": "title", "colspan": 2, "visible": true },
        { "fieldName": "status", "colspan": 1, "visible": true },
        { "fieldName": "priority", "colspan": 1, "visible": true }
      ]
    }
  ]
}
```

#### Frontend: Dynamic Object Rendering

| Task | Description |
|---|---|
| P2-13.F1 | Tạo `SchemaFieldRenderer.tsx` — render field theo type (text, enum, date, reference...) |
| P2-13.F2 | Tạo `LayoutEngine.tsx` — render sections từ layout config |
| P2-13.F3 | Tạo `DynamicForm.tsx` — form với validation từ schema |
| P2-13.F4 | `CustomerInfoScrollFixed.tsx` — integrate LayoutEngine cho dynamic fields |
| P2-13.F5 | `TicketDetail.tsx` — integrate LayoutEngine |
| P2-13.F6 | `CreateTicketDialog.tsx` — integrate DynamicForm |
| P2-13.F7 | Subscribe WS `/ws/schemas/updates` — reload schema khi admin thay đổi |

---

### Sprint 12: Admin Module — Schema & Layout Designer

| Task | Description |
|---|---|
| P2-A.1 | Tạo `apps/admin-module/` với React Router + auth guard |
| P2-A.2 | Admin shell layout: sidebar navigation + header |
| P2-A.3 | `SchemaDesigner.tsx` — list object types, add/edit fields |
| P2-A.4 | Field type editor: config UI per field type |
| P2-A.5 | Relationship editor: React Flow canvas để visualize relationships |
| P2-A.6 | `LayoutDesigner.tsx` — drag-and-drop field placement (dnd-kit) |
| P2-A.7 | Section management: add/remove/reorder sections |
| P2-A.8 | Layout preview: render với LayoutEngine |
| P2-A.9 | User/Role management: CRUD users, assign roles |
| P2-A.10 | Audit Viewer: paginated audit log viewer (admin only) |

---

### Phase 2 Exit Criteria (Go-Live 2)

- [ ] KB search hoạt động với Elasticsearch full-text
- [ ] BFSI product queries từ Core Banking adapter
- [ ] Call recording streaming hoạt động
- [ ] AI suggestions trong interaction panel (response time < 2s)
- [ ] CTI call widget kết nối với Asterisk (test với softphone)
- [ ] Dynamic fields hoạt động: admin thêm field → agent thấy ngay (< 5s)
- [ ] Admin module: schema designer, layout designer, user management
- [ ] Audit logs cho tất cả mutating operations
- [ ] PII fields encrypted at rest (phone, email, CIF, account numbers)
- [ ] Unit test coverage ≥ 70% cho Phase 2 services

---

## 5. Phase 3: Automation & Analytics (Sprint 13-18 — 12 tuần)

**Goal:** Workflow automation, data enrichment, BI dashboards, reports. Platform ready for enterprise.

**Go-Live 3 Milestone:** Full CRM Platform — enterprise ready.

---

### Sprint 13-14: Workflow Automation (MS-15)

#### Backend: MS-15 Workflow Service

| Task | Endpoint | Description |
|---|---|---|
| P3-15.1 | `GET /workflows` | List workflow definitions |
| P3-15.2 | `POST /workflows` | Create workflow definition |
| P3-15.3 | `GET /workflows/:id` | Workflow detail (with steps) |
| P3-15.4 | `PATCH /workflows/:id` | Update workflow |
| P3-15.5 | `POST /workflows/:id/activate` | Enable workflow |
| P3-15.6 | `POST /workflows/:id/deactivate` | Disable workflow |
| P3-15.7 | `GET /workflows/:id/executions` | Execution history |
| P3-15.8 | `GET /workflows/executions/:id` | Execution detail |
| P3-15.9 | Temporal workflow registration (all 18 step types) | |
| P3-15.10 | Kafka event triggers → Temporal workflow start | |
| P3-15.11 | SLA breach trigger → auto-escalate workflow | |
| P3-15.12 | Webhook step: `CALL_WEBHOOK` implementation | |
| P3-15.13 | `GET /admin/workflows` — admin workflow management | |

**Temporal Integration Pattern:**
```typescript
// Temporal workflow definition
export async function escalationWorkflow(input: EscalationInput): Promise<void> {
  // WAIT 30 minutes
  await sleep('30 minutes');

  // UPDATE_OBJECT: escalate ticket priority
  await updateTicketActivity({ ticketId: input.ticketId, priority: 'urgent' });

  // ASSIGN_AGENT: find available senior agent
  const seniorAgent = await assignAgentActivity({ criteria: 'senior', skillSet: input.skills });

  // SEND_NOTIFICATION: notify supervisor
  await sendNotificationActivity({ recipientId: input.supervisorId, template: 'escalation' });

  // SEND_EMAIL: notify customer
  await sendEmailActivity({ to: input.customerEmail, template: 'escalation-notice' });
}
```

**Step Types to implement (from Appendix E):**
- Control: CONDITION, SWITCH
- Action: SEND_NOTIFICATION, SEND_EMAIL, SEND_SMS, UPDATE_OBJECT, ASSIGN_AGENT, ESCALATE_TICKET, CREATE_TICKET, CALL_WEBHOOK, CALL_API
- Flow: WAIT, WAIT_FOR_EVENT, PARALLEL, LOOP
- AI: AI_CLASSIFY, AI_GENERATE

#### Admin: Workflow Designer

| Task | Description |
|---|---|
| P3-A.1 | `WorkflowDesigner.tsx` — React Flow canvas |
| P3-A.2 | Node types: trigger node, step nodes (per step type), end node |
| P3-A.3 | Edge connections với validation (no cycles) |
| P3-A.4 | Step config sidebar — per-type config form |
| P3-A.5 | Trigger config: event type + conditions |
| P3-A.6 | Save workflow: serialize canvas → backend format |
| P3-A.7 | Execution history viewer với step-level status |
| P3-A.8 | Test workflow: dry-run với mock event |

---

### Sprint 15: Data Enrichment (MS-16)

#### Backend: MS-16 Data Enrichment Service

| Task | Endpoint | Description |
|---|---|---|
| P3-16.1 | `POST /enrichment/requests` | Request enrichment for object |
| P3-16.2 | `GET /enrichment/requests/:id` | Enrichment status |
| P3-16.3 | `GET /admin/enrichment/sources` | List enrichment sources |
| P3-16.4 | `POST /admin/enrichment/sources` | Add enrichment source |
| P3-16.5 | WS `/ws/objects/{objectType}/{objectId}/fields` | Real-time field updates |
| P3-16.6 | Progressive loading pipeline: | |
| | — Stage 1: local DB fields → immediate response | |
| | — Stage 2: async external calls → WS push | |
| P3-16.7 | Enrichment source adapters: webhook, REST, database query | |
| P3-16.8 | Retry logic + timeout handling (circuit breaker) | |

**Progressive Loading Flow:**
```
Agent opens Customer panel
  → GET /customers/:id                    (immediate: local fields)
  → POST /enrichment/requests             (async: request enrichment)
  ← WS push: { field: "creditScore", value: 750 }   (2s later)
  ← WS push: { field: "loanLimit", value: 500000000 } (3s later)
  ← WS push: { status: "complete" }                  (5s later)
```

#### Frontend: Enrichment Integration

| Task | Description |
|---|---|
| P3-16.F1 | `CustomerInfoScrollFixed.tsx` — skeleton loading for enrichment fields |
| P3-16.F2 | Subscribe WS `/ws/objects/customer/{customerId}/fields` |
| P3-16.F3 | Field-level loading indicators (spinner per field) |
| P3-16.F4 | Enrichment error states (field failed to load) |

---

### Sprint 16-17: Dashboard & Reports (MS-17, MS-18)

#### Backend: MS-17 Dashboard Service

| Task | Endpoint | Description |
|---|---|---|
| P3-17.1 | `GET /dashboards` | List dashboards |
| P3-17.2 | `GET /dashboards/:id` | Dashboard config + widgets |
| P3-17.3 | `GET /dashboards/:id/data` | Widget data snapshot |
| P3-17.4 | WS `/ws/dashboards/{dashboardId}/metrics` | Real-time metric updates |
| P3-17.5 | `GET /admin/dashboards` | Admin dashboard management |
| P3-17.6 | `POST /admin/dashboards` | Create dashboard |
| P3-17.7 | `PUT /admin/dashboards/:id` | Update dashboard layout |
| P3-17.8 | Data aggregation queries (PostgreSQL + Redis cache) | |
| P3-17.9 | Real-time metrics pub/sub via Redis | |

**Widget Data Sources (from Appendix F):**
- METRIC_CARD: total open tickets, avg handle time, CSAT score
- LINE_CHART: interactions per day/hour
- QUEUE_LIST: live queue (connects to Interaction Service)
- AGENT_STATUS_GRID: all agent statuses (connects to Agent Service)
- SLA_GAUGE: SLA compliance percentage

#### Backend: MS-18 Report Service

| Task | Endpoint | Description |
|---|---|---|
| P3-18.1 | `GET /reports` | List available reports |
| P3-18.2 | `GET /reports/:id/embed` | Get Superset embed URL + guest token |
| P3-18.3 | `GET /admin/reports` | Report management |
| P3-18.4 | `POST /admin/reports` | Configure new report |
| P3-18.5 | Superset API integration: guest token generation | |
| P3-18.6 | RLS injection: row-level filter per agent/department | |
| P3-18.7 | Report permission matrix (role-based) | |

**Superset Integration Pattern:**
```
Agent clicks "View Report"
  → GET /reports/:id/embed
  → Report Service → Superset API: POST /api/v1/security/guest_token/
      { resources: [{ type: "dashboard", id: "..." }], rls: [{ clause: "department = 'RETAIL'" }] }
  ← { token: "eyJ..." }
  → Frontend: <iframe src="superset/embed?token={token}">
```

#### Admin: Dashboard & Report Config

| Task | Description |
|---|---|
| P3-A.9 | `DashboardConfig.tsx` — drag-and-drop widget placement (dnd-kit) |
| P3-A.10 | Widget type selector + config dialog |
| P3-A.11 | Dashboard preview với live data |
| P3-A.12 | `ReportConfig.tsx` — map Superset dashboards to CRM reports |
| P3-A.13 | Report permission assignment per role |

#### Frontend: Dashboard & Report Integration

| Task | Description |
|---|---|
| P3-17.F1 | `DashboardView.tsx` — render widgets từ dashboard config |
| P3-17.F2 | Widget components: MetricCard, LineChart, BarChart, QueueList, AgentStatusGrid, SLAGauge |
| P3-17.F3 | `DashboardGrid.tsx` — responsive grid layout (CSS Grid) |
| P3-17.F4 | Connect WS `/ws/dashboards/{dashboardId}/metrics` |
| P3-18.F1 | `ReportViewer.tsx` — iframe embed với Superset guest token |
| P3-18.F2 | Report list page trong Agent Desktop |

---

### Sprint 18: BFSI Security Hardening

| Task | Description | Priority |
|---|---|---|
| P3-S.1 | mTLS giữa tất cả services (Istio + cert-manager) | Critical |
| P3-S.2 | AES-256-GCM encryption at rest cho PII fields (phone, email, CIF, account numbers) | Critical |
| P3-S.3 | PostgreSQL Row-Level Security — per-department data isolation | Critical |
| P3-S.4 | Audit log tamper detection — verify hash chain | Critical |
| P3-S.5 | OWASP ZAP automated scan → zero critical findings | Critical |
| P3-S.6 | Penetration test (external vendor) | High |
| P3-S.7 | Secret management: HashiCorp Vault (production) | High |
| P3-S.8 | Network policies: zero-trust (Kubernetes NetworkPolicy) | High |
| P3-S.9 | MFA enforcement cho tất cả user accounts | High |
| P3-S.10 | Session management: concurrent session limit (1 active per agent) | Medium |
| P3-S.11 | PCI-DSS SAQ-A compliance review | Medium |
| P3-S.12 | Data masking trong audit logs (mask last 4 digits of account numbers) | Medium |

**PostgreSQL RLS Example:**
```sql
-- Enable RLS on sensitive tables
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

-- Agents can only see customers in their department
CREATE POLICY customer_department_isolation ON customers
  FOR ALL
  TO agent_role
  USING (
    department = current_setting('app.current_department', true)
    OR is_vip = true  -- VIP customers visible to all agents
  );

-- Supervisors see all
CREATE POLICY supervisor_full_access ON customers
  FOR ALL
  TO supervisor_role
  USING (true);
```

---

### Phase 3 Exit Criteria (Go-Live 3)

- [ ] Workflow designer: tạo, deploy, và execute workflow với tất cả 18 step types
- [ ] Data enrichment: progressive loading < 5s hoàn chỉnh
- [ ] Dashboard real-time: metrics update ≤ 5s lag
- [ ] Reports: Superset embed hoạt động với RLS per role
- [ ] mTLS giữa tất cả 19 services
- [ ] PII encryption at rest verified (no plaintext in DB)
- [ ] OWASP ZAP scan: zero critical vulnerabilities
- [ ] PostgreSQL RLS: agents không thể access data ngoài department
- [ ] Load test: 500 concurrent users, P99 < 1s (GET), < 2s (POST)
- [ ] Full audit trail: tất cả operations có audit entry
- [ ] DR drill: recovery time objective (RTO) < 30 phút

---

## 6. Go-Live Criteria

### Go-Live 1: Core Agent Desktop (End of Phase 1)

| Criterion | Metric |
|---|---|
| Core flows | Login, queue, ticket, customer, notifications |
| Real-time | WS queue updates, notification push |
| Performance | P99 < 500ms tại 100 concurrent users |
| Security | RBAC, JWT, MFA, HTTPS everywhere |
| Availability | 99.5% uptime (3.6h downtime/month) |
| Data | Zero data loss on transaction |

### Go-Live 2: Advanced Features (End of Phase 2)

| Criterion | Metric |
|---|---|
| CTI | Voice calls via Asterisk adapter |
| Dynamic objects | Schema changes live in < 5s |
| KB + AI | Search + suggestions working |
| Admin module | Schema + layout + user management |
| Security | PII encrypted, audit logs complete |
| Availability | 99.9% uptime (8.7h downtime/year) |

### Go-Live 3: Full Platform (End of Phase 3)

| Criterion | Metric |
|---|---|
| Automation | All 18 workflow step types |
| BI | Dashboard real-time ≤ 5s, Superset reports |
| Enrichment | Progressive loading < 5s |
| Security | mTLS, OWASP clean, RLS, Vault secrets |
| Performance | P99 < 1s at 500 concurrent users |
| Availability | 99.95% uptime (4.4h downtime/year) |
| Compliance | BFSI security audit passed |

---

## 7. Testing Strategy

### Testing Pyramid

```
         /‾‾‾‾‾‾‾‾‾‾‾\
        /   E2E Tests  \     5% — Playwright, critical user journeys
       /‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾\
      / Integration Tests \   25% — API + DB + service-to-service
     /‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾\
    /     Unit Tests       \  70% — NestJS services, React components
   ‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾
```

### Unit Tests

| Target | Framework | Coverage Target |
|---|---|---|
| NestJS services | Jest + NestJS Testing Module | ≥ 70% lines |
| React components | Vitest + Testing Library | ≥ 70% lines |
| Shared utils | Jest / Vitest | ≥ 90% lines |
| DTOs / validation | Jest | 100% |

### Integration Tests

| Target | Framework |
|---|---|
| REST API endpoints | Supertest + test DB (PostgreSQL in Docker) |
| WebSocket channels | ws npm package + test WS server |
| Kafka events | Kafka test containers |
| Database queries | TypeORM + PostgreSQL test DB |

### E2E Tests (Playwright)

Critical user journeys:
1. Agent login với MFA → see queue
2. Accept interaction → open customer panel
3. Create ticket → add comment → resolve
4. Search KB → bookmark article
5. Admin: add field to Ticket schema → agent sees new field

### Performance Tests

| Tool | Target |
|---|---|
| k6 | Load test: 100/500 concurrent users |
| Artillery | Spike test: sudden 10x traffic |
| Playwright | Lighthouse: FCP < 1.5s, LCP < 2.5s |

### Security Tests

| Tool | Target |
|---|---|
| OWASP ZAP | API scanning — zero critical |
| npm audit | Dependency vulnerabilities |
| Trivy | Docker image scanning |
| Manual pentest | Phase 3 go-live gate |

---

## 8. Dependency Map

```
Phase 0 (Foundation)
  └─ Blocks all phases

Phase 1 (Core MVP)
  ├─ MS-1 Identity ← required by all services
  ├─ MS-2 Agent ← requires MS-1
  ├─ MS-3 Interaction ← requires MS-1, MS-2, MS-5
  ├─ MS-5 Customer ← requires MS-1
  ├─ MS-4 Ticket ← requires MS-1, MS-3, MS-5
  └─ MS-6 Notification ← requires MS-1, Kafka

Phase 2 (Advanced Features)
  ├─ MS-7 Knowledge ← requires MS-1, Elasticsearch
  ├─ MS-8 BFSI Core ← requires MS-1, MS-5
  ├─ MS-9 AI ← requires MS-1, MS-3, MS-7
  ├─ MS-10 Media ← requires MS-1, MinIO
  ├─ MS-11 Audit ← requires Kafka (Phase 1 Kafka setup)
  ├─ MS-13 Object Schema ← requires MS-1, PostgreSQL
  ├─ MS-14 Layout ← requires MS-13
  └─ MS-19 CTI ← requires MS-1, MS-2, MS-3

Phase 3 (Automation & Analytics)
  ├─ MS-15 Workflow ← requires MS-1, Temporal, Kafka, ALL Phase 2 services
  ├─ MS-16 Enrichment ← requires MS-1, MS-5, MS-13
  ├─ MS-17 Dashboard ← requires ALL Phase 1+2 services
  └─ MS-18 Report ← requires MS-1, Apache Superset, MS-17

Frontend Dependencies
  ├─ Agent Desktop API integration ← requires each service as it's built
  ├─ Dynamic Object Rendering ← requires MS-13, MS-14 (Phase 2)
  ├─ CTI Provider ← requires MS-19 (Phase 2)
  ├─ Dashboard View ← requires MS-17 (Phase 3)
  └─ Admin Module ← builds in Phase 2, expanded Phase 3
```

---

## 9. Risk Register

| # | Risk | Probability | Impact | Mitigation |
|---|---|---|---|---|
| R-1 | Core Banking API không available trong dev | High | High | Mock adapter từ Phase 2; real adapter Phase 3 với staging env |
| R-2 | CTI vendor SDK thay đổi (Genesys/Avaya) | Medium | High | Abstract adapter interface; feature flag per vendor |
| R-3 | Temporal learning curve | Medium | Medium | Use Temporal Cloud trong Phase 3 dev; migrate self-hosted Go-Live 3 |
| R-4 | Apache Superset customization phức tạp | Medium | Medium | Evaluate Metabase hoặc custom Recharts dashboards nếu cần |
| R-5 | PostgreSQL RLS performance impact | Low | High | Benchmark sớm; index trên policy columns; consider caching layer |
| R-6 | Large existing components (InteractionDetail 3K lines) | High | Medium | Refactor dần trong Phase 2; không break existing UI |
| R-7 | Team size 1-3 người | High | High | Prioritize ruthlessly; defer Supervisor module to V4 |
| R-8 | Kafka operational complexity | Medium | Medium | Use Confluent Cloud trong dev; self-hosted production |
| R-9 | BFSI security audit fails | Low | Critical | Security hardening checklist Phase 3; external pentest trước Go-Live 3 |
| R-10 | Elasticsearch resource heavy | Medium | Low | Consider Meilisearch or PostgreSQL full-text cho Phase 1; ES từ Phase 2 |

---

## 10. Tech Stack Reference

### Backend

| Category | Technology | Version | Purpose |
|---|---|---|---|
| Framework | NestJS | 10.x | All microservices |
| Language | TypeScript | 5.x | Full-stack |
| ORM | TypeORM | 0.3.x | PostgreSQL access |
| Validation | class-validator + class-transformer | Latest | DTO validation |
| Auth | @nestjs/jwt + passport | Latest | JWT authentication |
| WebSocket | @nestjs/websockets + Socket.IO | Latest | Real-time |
| Events | @nestjs/microservices (Kafka) | Latest | Event bus |
| Workflow | @temporalio/client + @temporalio/worker | Latest | Workflow engine |
| Testing | Jest + Supertest | Latest | Unit + integration |

### Frontend

| Category | Technology | Version | Purpose |
|---|---|---|---|
| Framework | React | 18.x | UI framework |
| Language | TypeScript | 5.x | Type safety |
| Build | Vite + SWC | 6.x | Fast builds |
| Routing | React Router | 6.x | Client-side routing |
| State (server) | TanStack Query | 5.x | Server state, caching |
| State (UI) | React Context | — | UI state |
| Styling | Tailwind CSS | 3.x | Utility-first CSS |
| Components | shadcn/ui (Radix UI) | — | 48 existing primitives |
| Charts | Recharts | 2.x | Dashboard widgets |
| Canvas | React Flow | 11.x | Workflow + relationship editor |
| DnD | dnd-kit | 6.x | Layout designer, dashboard config |
| Testing | Vitest + Testing Library | Latest | Component tests |
| E2E | Playwright | Latest | E2E tests |

### Infrastructure

| Category | Technology | Version | Purpose |
|---|---|---|---|
| Database | PostgreSQL | 16 | Primary data store |
| Cache | Redis | 7 | Session, cache, pub/sub |
| Search | Elasticsearch | 8 | Full-text search |
| Files | MinIO | Latest | S3-compatible object storage |
| Events | Apache Kafka | 3.x | Event streaming |
| Workflow | Temporal | Latest | Durable workflow execution |
| BI | Apache Superset | 3.x | Embedded BI |
| API Gateway | Kong | 3.x | mTLS termination, routing |
| Service Mesh | Istio | Latest | mTLS, observability |
| Secrets | HashiCorp Vault | 1.x | Secret management (Phase 3) |
| Container | Docker + Compose | Latest | Local dev + deployment |
| Orchestration | Kubernetes | 1.29+ | Production (future) |
| Monorepo | Nx | Latest | Build system |
| CI/CD | GitHub Actions | — | Automated pipeline |

---

*End of ImplementationPlan.md*
*Generated: 2026-03-07 | Baseline: FullStack-RequirementsV3.md v3.0*
*Total: 4 Phases | 18 Sprints | ~38 Weeks | 19 Microservices | 2 Frontend Modules*
