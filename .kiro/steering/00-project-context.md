---
inclusion: always
---

# TPB CRM Platform - Project Context

**Last Updated:** 2026-03-08
**Current Phase:** Phase 0 - Foundation Setup
**Status:** In Progress

## 🎯 Project Overview

Enterprise CRM Platform for TPBank với 19 microservices, 2 frontend modules, BFSI-grade security.

## 📚 Key Documents

- **Requirements V1:** `RequirementsV1.md` - Frontend prototype (14 user stories)
- **Requirements V2:** `FullStack-RequirementsV2.md` - 12 microservices (73 API endpoints)
- **Requirements V3:** `FullStack-RequirementsV3.md` - 18 microservices (142 API endpoints)
- **Implementation Plan:** `ImplementationPlan.md` - 4 phases, 38 weeks
- **CLAUDE.md:** AI agent guidance document

## 🏗️ Architecture Decisions (Không Thay Đổi)

| Decision | Choice | Rationale |
|---|---|---|
| Backend | NestJS (TypeScript) | Full-stack TS, shared types |
| Monorepo | Nx | Code sharing, affected-build |
| Database | PostgreSQL 18.3 | ACID, JSONB, RLS |
| Cache | Redis 8.6 | Session, pub/sub |
| Search | Elasticsearch 9.3.0 | Full-text search |
| Files | SeaweedFS | S3-compatible, replaces MinIO |
| Events | Apache Kafka 4.2.0 | KRaft mode, no ZooKeeper |
| Workflow | Temporal | Durable execution |
| BI | Apache Superset | Embedded reporting |
| Auth | JWT (15m) + Refresh (7d) + MFA | BFSI requirement |
| Node.js | 24.13.x LTS | Support until April 2028 |

## 📦 Repository Structure

```
/
├── apps/
│   ├── agent-desktop/          # React 19.2.x SPA (EXISTING - upgraded from React 18)
│   └── admin-module/           # React 19.2.x SPA (NEW)
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
│   ├── shared-types/           # Shared TypeScript interfaces
│   ├── shared-dto/             # Zod schemas
│   └── shared-utils/           # Utilities
├── infra/
│   ├── docker-compose.yml      # All services + infra
│   └── docker-compose.dev.yml  # Dev overrides
└── .kiro/
    ├── specs/                  # Spec-driven development
    └── steering/               # Context & progress tracking
```

## 🔐 Security Requirements (BFSI)

- mTLS between all services (Istio service mesh)
- AES-256-GCM field-level encryption (PII: phone, email, CIF, account numbers)
- JWT RS256 signing
- Row-Level Security (RLS) in PostgreSQL
- Audit logging (immutable, hash-chained)
- Rate limiting per endpoint
- MFA for authentication

## 🌐 Technology Stack (2026 Latest Versions)

### Frontend
- React 19.2.x (upgraded from 18)
- TypeScript 5.7
- Vite 6.x
- TanStack Query v5
- Tailwind CSS
- shadcn/ui

### Backend
- NestJS (latest)
- Node.js 24.13.x LTS
- TypeORM
- Zod validation

### Infrastructure
- PostgreSQL 18.3
- Redis 8.6
- Kafka 4.2.0 (KRaft mode)
- Elasticsearch 9.3.0
- Kibana 9.3.0
- SeaweedFS (S3-compatible)
- Temporal
- Apache Superset

## 📝 Coding Conventions

### General
- TypeScript strict mode - no `any`
- Preserve existing UI - additive only
- Feature components in `src/components/`
- Use `@/` path alias

### Backend (NestJS)
- One database per service
- All mutations publish Kafka events
- `@Roles()` decorator for RBAC
- Repository pattern
- DTOs with class-validator

### Frontend
- React Query for server state
- React Context for UI state only
- Co-locate tests with components

### Security
- Never log PII in plaintext
- Encrypt sensitive fields (AES-256-GCM)
- Audit log for all mutations
- JWT validation on every request

## 🎯 Current Status

**Phase 0 - Foundation Setup**
- Spec files created: ✅
  - requirements.md
  - design.md
  - tasks.md
  - REACT_19_UPGRADE_CHECKLIST.md
  - COMPATIBILITY_REVIEW.md
- Implementation: ⏳ Ready to start

**Next Steps:**
1. Execute Phase 0 tasks
2. Verify all exit criteria
3. Document completed work in phase-tracker.md
4. Proceed to Phase 1

## 📖 Reference Documents

Always refer to these documents when working on the project:
- `FullStack-RequirementsV3.md` - Complete API specifications
- `ImplementationPlan.md` - Detailed task breakdown
- `CLAUDE.md` - AI agent guidance
- `.kiro/specs/foundation-setup/` - Phase 0 specifications
