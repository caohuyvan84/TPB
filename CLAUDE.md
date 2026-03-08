# CLAUDE.md

This file provides guidance to AI agents working with code in this repository.

---

## Quick Commands

```bash
npm install        # Install dependencies
npm run dev        # Start dev server at http://localhost:3000 (auto-opens browser)
npm run build      # Production build → /build directory
```

No test or lint scripts are configured yet (planned in Phase 0).

---

## Project Goal

**TPB CRM Platform** — Enterprise multi-channel customer service platform for a Vietnamese bank (TPBank).

The project started as a **frontend-only React 18 prototype** (Agent Desktop UI with mock data) and is being evolved into a **full-stack CRM platform** with:

- 19 backend microservices (NestJS)
- Dynamic object schema engine
- Workflow automation (Temporal)
- Multi-PBX CTI integration (Genesys / Avaya / Asterisk)
- BI reporting (Apache Superset embedded)
- BFSI-grade security (mTLS, AES-256, field-level PII encryption, RLS)

**Two frontend modules:**
- `Agent Desktop` — existing SPA (React 18), multi-channel interaction workspace
- `Admin/Config Module` — new SPA, for schema/layout/workflow/report/user management

---

## Key Decisions (Do Not Change Without Discussion)

| Decision | Choice | Rationale |
|---|---|---|
| Backend | NestJS (TypeScript) | Full-stack TS, shared types between FE/BE |
| Monorepo | Nx | Code sharing, affected-build optimization |
| Database | PostgreSQL 16 | ACID, JSONB for dynamic fields, RLS |
| Cache | Redis 7 | Session, pub/sub, token blacklist |
| Search | Elasticsearch 8 | Full-text KB + interaction search |
| Files | MinIO (S3-compatible) | On-prem, S3 API compatible |
| Events | Apache Kafka | Audit streaming, service decoupling |
| Workflow | Temporal (self-hosted) | Durable execution, SLA automation |
| BI | Apache Superset | Embedded, agents never access Superset directly |
| Workflow canvas | React Flow | Custom workflow designer + relationship editor |
| FE server state | TanStack Query v5 | Server state caching, background sync |
| Deployment | Docker Compose → K8s | Simple now, upgradeable later |
| Auth | JWT (15m) + Refresh (7d) + MFA | BFSI requirement |
| PII encryption | AES-256-GCM at rest | Field-level: phone, email, CIF, account numbers |

---

## Architecture Overview

```
Frontend Modules (React 18 SPAs)
├── Agent Desktop  (/agent)   — existing, preserved
└── Admin Module   (/admin)   — new, Phase 2+

API Gateway (Kong) — mTLS termination, JWT validation, rate limiting

Service Mesh (Istio) — mTLS between all services

Microservices (NestJS)
├── MS-1  Identity Service       — auth, RBAC/ABAC, sessions, MFA
├── MS-2  Agent Service          — profiles, per-channel status, presence
├── MS-3  Interaction Service    — queue, lifecycle, SLA
├── MS-4  Ticket Service         — case management, workflow states
├── MS-5  Customer Service       — profiles, notes, history
├── MS-6  Notification Service   — in-app, push, state machine
├── MS-7  Knowledge Service      — articles, folders, search
├── MS-8  BFSI Core Banking      — account/savings/loan/card queries
├── MS-9  AI Service             — suggestions, summarization, sentiment
├── MS-10 Media Service          — recordings, attachments, MinIO
├── MS-11 Audit Service          — immutable logs, hash chaining
├── MS-13 Object Schema Service  — dynamic field definitions (NEW)
├── MS-14 Layout Service         — layout configs per object type (NEW)
├── MS-15 Workflow Service       — Temporal integration (NEW)
├── MS-16 Data Enrichment Svc   — external data, progressive loading (NEW)
├── MS-17 Dashboard Service      — real-time metrics, widget data (NEW)
├── MS-18 Report Service         — Superset proxy, guest tokens (NEW)
└── MS-19 CTI Adapter Service    — Genesys/Avaya/Asterisk adapters (NEW)

Infrastructure
├── PostgreSQL 16   — primary data store (1 DB per service)
├── Redis 7         — cache, pub/sub, sessions
├── Elasticsearch 8 — full-text search
├── MinIO           — S3-compatible file storage
├── Apache Kafka    — event streaming
├── Temporal        — workflow engine
└── Apache Superset — BI backend (admin-only access)
```

---

## Implementation Phases

See `ImplementationPlan.md` for full detail.

| Phase | Duration | Go-Live | Scope |
|---|---|---|---|
| **Phase 0: Foundation** | 2 weeks | — | Git, monorepo, Docker Compose, NestJS scaffold, testing, CI/CD |
| **Phase 1: Core MVP** | 12 weeks | Go-Live 1 | MS-1–6, replace mock data → APIs, real-time WebSocket |
| **Phase 2: Advanced** | 12 weeks | Go-Live 2 | MS-7–11, MS-13–14, MS-19, dynamic objects, Admin module |
| **Phase 3: Automation** | 12 weeks | Go-Live 3 | MS-15–18, workflows, enrichment, dashboards, BI, BFSI security |

---

## Current Codebase State (Critical Gaps)

The codebase is **frontend-only** — all backend work is pending.

| Gap | Status |
|---|---|
| Backend code | None — zero NestJS/Express code |
| Database | None — no schema, no migrations |
| API client | None — no fetch(), no axios, no WebSocket |
| Auth | None — no login, no JWT |
| tsconfig.json | Missing — TypeScript via SWC plugin only, no strict mode |
| Testing framework | None — no Jest, Vitest, Playwright |
| CI/CD | None — no GitHub Actions |
| Git repository | Not initialized |
| .env files | None |
| Tailwind build | Pre-compiled CSS (5,048 lines in index.css) — no tailwind.config |
| React Router | Not installed — single-page with state-driven view switching |
| TanStack Query | Not installed — only React Context |

---

## Frontend Architecture (Current)

**Framework:** React 18 + TypeScript + Vite 6.3.5 + SWC + Tailwind CSS + shadcn/ui

**Provider tree:**
```
NotificationProvider
  └─ EnhancedAgentStatusProvider
       └─ CallProvider
            └─ AppContent
```

**Layout:** 3-panel (Left 320px collapsible, Center flex, Right 400px collapsible) + fixed header + 2 floating overlays (FloatingCallWidget, NotificationCenter)

**Path alias:** `@` → `./src`

### State Management (Context API)

- **`CallContext.tsx`** — Active call state, widget visibility. Methods: `startCall`, `endCall`, `updateCallStatus`, `showCallWidget`, `expandCallWidget`.
- **`AgentStatusContext.tsx`** — Per-channel readiness (`ready`/`not-ready`) with reasons. Methods: `setChannelStatus`, `isChannelReady`, `setAllChannelsStatus`.
- **`EnhancedAgentStatusContext.tsx`** — Extends AgentStatus with timers, connection status, session tracking, keyboard shortcuts (Ctrl+R = ready, Ctrl+N = not-ready).
- **`NotificationContext.tsx`** — 5 notification types, 4 states (new/viewed/actioned/dismissed), priority, auto-hide, audio.

### Component Organization

```
src/
├── App.tsx                     # Root: provider wrapping, mock data, view routing (1,428 lines)
├── components/
│   ├── ui/                     # 48 shadcn/ui primitives — DO NOT MODIFY
│   ├── ai-assistant/           # types.ts, constants.ts, utils.ts, ChatMessage.tsx
│   └── figma/                  # ImageWithFallback for Figma-exported assets
├── imports/                    # AgentSettings.tsx, Card.tsx
├── styles/globals.css          # CSS custom properties, OKLch color system, dark mode (198 lines)
└── index.css                   # Pre-compiled Tailwind (5,048 lines) — replace with build pipeline
```

### Feature Components (src/components/)

| Component | Lines | Description |
|---|---|---|
| `InteractionDetail.tsx` | ~3,000 | Center panel, 5 tabs (Voice/Email/Chat/Timeline/Notes) |
| `CustomerInfoScrollFixed.tsx` | ~1,644 | Right panel, 5 tabs |
| `InteractionList.tsx` | ~852 | Left panel, interaction queue + filters |
| `InformationQuery.tsx` | ~1,327 | BFSI product queries |
| `KnowledgeBaseSearch.tsx` | ~1,096 | KB folder tree, full-text search |
| `CreateTicketDialog.tsx` | ~744 | Ticket creation form |
| `TicketDetail.tsx` | ~642 | Ticket detail view |
| `EmailReplyDialog.tsx` | ~814 | Email reply modal |
| `EmailReplyInline.tsx` | ~700 | Inline email reply |
| `NotificationCenter.tsx` | ~671 | Notification panel |
| `AgentStatusWidget.tsx` | ~634 | Agent status control |
| `EnhancedAgentHeader.tsx` | ~434 | Top header bar |
| `FloatingCallWidget.tsx` | ~346 | Floating call controls |
| `AgentSettingsSidebar.tsx` | ~338 | Settings panel |
| `CallTimeline.tsx` | — | Call event timeline |
| `CallNotes.tsx` | — | Call notes editor |
| `CallRecordingPlayer.tsx` | — | Audio player |
| `ChatTimeline.tsx` | — | Chat message thread |
| `TransferCallDialog.tsx` | ~165 | Call transfer dialog |
| `CoreBFSI.tsx` | — | Core banking query |
| `LoanDetailWithTabs.tsx` | — | Loan detail |
| `CustomerSelection.tsx` | — | Customer search/select |
| `DateRangeFilter.tsx` | — | Date range picker |

### Key Hooks

- **`useInteractionStats`** (`components/useInteractionStats.tsx`, 206 lines) — Aggregates interaction data, applies filters (channel, status, priority, search), returns filtered list + stats.
- **`use-mobile`** (`components/ui/use-mobile.ts`) — Boolean for mobile viewport detection.

### Vite Config Notes

- Port: 3000
- 26+ versioned Radix UI package aliases — **do not remove** (prevents duplicate version conflicts)
- SWC plugin for fast TypeScript compilation

### Theming

`src/styles/globals.css` uses CSS custom properties with OKLch color space. Dark mode via `.dark` class (next-themes). Chart colors: `--chart-1` through `--chart-5`.

---

## Entity Interfaces (Defined in Frontend)

| Entity | Defined In |
|---|---|
| `Interaction` | `useInteractionStats.tsx` |
| `CallData` | `CallContext.tsx` |
| `TicketData` | `TicketDetail.tsx` |
| `ChannelStatus`, `AgentState` | `EnhancedAgentStatusContext.tsx` |
| `Notification` types | `NotificationContext.tsx` |

---

## Specification Documents

| File | Lines | Description |
|---|---|---|
| `RequirementsV1.md` | ~1,219 | Original frontend spec — 14 user stories, complete |
| `FullStack-RequirementsV2.md` | ~2,482 | Full-stack V2 — 12 microservices, 73 API endpoints, complete |
| `FullStack-RequirementsV3.md` | ~1,759 | CRM Platform V3 — 18 microservices, ~142 endpoints, 10 WS channels |
| `ImplementationPlan.md` | — | 4-phase build plan with task-level breakdown |

> **Note:** `FullStack-RequirementsV3.md` references V2 for MS-1 to MS-11 service specs (sections 5.1–5.11). See V2 for those details.

---

## Coding Conventions

### General

- **TypeScript strict mode** — no `any`, no non-null assertions unless unavoidable
- **Preserve all existing UI** — enhancements are additive only; never break existing components
- **Prefer editing existing files** over creating new ones
- **Feature components** go in `src/components/` (not subdirectories) for agent-desktop
- **Admin module** components go in `apps/admin-module/src/`

### Backend (NestJS)

- One database per service — never share a DB between services
- All mutations must publish Kafka event for audit trail
- `@Roles()` decorator for RBAC enforcement on every controller method
- DTOs must use `class-validator` decorators
- Repository pattern — never call TypeORM EntityManager directly in service layer

### Frontend

- Use `@/` path alias for all imports
- React Query for all server state — no useState for server data
- React Context only for UI state (call widget, agent status)
- Co-locate component tests with component files (`.test.tsx`)

### Security

- Never log PII (phone, email, CIF, account numbers) in plaintext
- All sensitive fields must be encrypted via AES-256-GCM before DB insert
- PATCH/POST/DELETE endpoints require audit log emission
- JWT must be validated on every request; refresh token rotation on use

---

## What Has Been Done

1. **RequirementsV1.md** — analyzed (14 user stories, 136 screenshots)
2. **FullStack-RequirementsV2.md** — created (12 microservices, 73 API endpoints, BFSI security)
3. **Full frontend codebase scan** — 97 files, ~35,334 lines cataloged
4. **FullStack-RequirementsV3.md** — created (18 microservices, ~142 API endpoints, 10 WS channels, US-19–25)
5. **ImplementationPlan.md** — created (4 phases, 18 sprints, ~38 weeks, task-level breakdown)

## What Has NOT Been Done Yet

- Phase 0 through Phase 3 implementation (no backend code written)
- Git initialization (`git init`)
- `tsconfig.json` creation
- Tailwind CSS build pipeline setup
- Docker Compose infrastructure
- NestJS monorepo scaffold
- Testing framework setup
- CI/CD pipeline
- Any API integration in the frontend
