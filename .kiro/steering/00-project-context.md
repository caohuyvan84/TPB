---
inclusion: always
---

# TPB CRM Platform - Project Context

**Last Updated:** 2026-03-09
**Current Phase:** Phase 1 - Core MVP
**Status:** In Progress

## 🎯 Project Overview

Enterprise CRM Platform for TPBank với 19 microservices, 2 frontend modules, BFSI-grade security.

## 📚 Key Documents

- **Requirements V1:** `RequirementsV1.md` - Frontend prototype (14 user stories)
- **Requirements V2:** `FullStack-RequirementsV2.md` - 12 microservices (73 API endpoints)
- **Requirements V3:** `FullStack-RequirementsV3.md` - 18 microservices (142 API endpoints)
- **Implementation Plan:** `ImplementationPlan.md` - 4 phases, 38 weeks
- **CLAUDE.md:** AI agent guidance document

## 🔐 Database Credentials & Environment

### PostgreSQL Configuration
- **Host:** localhost (from host) / tpb-postgres (from Docker network)
- **Port:** 5432
- **User:** postgres
- **Password:** postgres
- **Authentication:** SCRAM-SHA-256 (from external connections)
- **Version:** PostgreSQL 18.3

### Database Names (19 databases)
```
identity_db          # MS-1: Identity Service
agent_db             # MS-2: Agent Service
interaction_db       # MS-3: Interaction Service
ticket_db            # MS-4: Ticket Service
customer_db          # MS-5: Customer Service
notification_db      # MS-6: Notification Service
knowledge_db         # MS-7: Knowledge Service
bfsi_db              # MS-8: BFSI Core Service
ai_db                # MS-9: AI Service
media_db             # MS-10: Media Service
audit_db             # MS-11: Audit Service
object_schema_db     # MS-13: Object Schema Service
layout_db            # MS-14: Layout Service
workflow_db          # MS-15: Workflow Service
enrichment_db        # MS-16: Data Enrichment Service
dashboard_db         # MS-17: Dashboard Service
report_db            # MS-18: Report Service
cti_db               # MS-19: CTI Adapter Service
gateway_db           # MS-12: API Gateway (future)
```

### Service Ports
```
3001  # MS-1: Identity Service
3002  # MS-2: Agent Service
3003  # MS-3: Interaction Service
3004  # MS-4: Ticket Service
3005  # MS-5: Customer Service
3006  # MS-6: Notification Service
3007  # MS-7: Knowledge Service
3008  # MS-8: BFSI Core Service
3009  # MS-9: AI Service
3010  # MS-10: Media Service
3011  # MS-11: Audit Service
3013  # MS-13: Object Schema Service
3014  # MS-14: Layout Service
3015  # MS-15: Workflow Service
3016  # MS-16: Data Enrichment Service
3017  # MS-17: Dashboard Service
3018  # MS-18: Report Service
3019  # MS-19: CTI Adapter Service
```

### Redis Configuration
- **Host:** localhost
- **Port:** 6379
- **Password:** (none)
- **Version:** Redis 8.6

### Kafka Configuration
- **Brokers:** localhost:9092
- **Mode:** KRaft (no ZooKeeper)
- **Version:** Kafka 4.2.0
- **UI:** http://localhost:9000

### Elasticsearch Configuration
- **Node:** http://localhost:9200
- **Version:** Elasticsearch 9.3.0
- **Kibana:** http://localhost:5601

### SeaweedFS Configuration
- **S3 Endpoint:** http://localhost:8333
- **Master:** http://localhost:9333
- **Access Key:** admin
- **Secret Key:** admin123

### Other Services
- **Temporal:** localhost:7233 (UI: http://localhost:8233)
- **Superset:** http://localhost:8088 (admin/admin)
- **MailHog:** SMTP: localhost:1025, UI: http://localhost:8025

### Environment Variables Template
```bash
# Database
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
DB_IDENTITY=identity_db
DB_AGENT=agent_db
DB_INTERACTION=interaction_db
DB_TICKET=ticket_db
DB_CUSTOMER=customer_db
DB_NOTIFICATION=notification_db

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Kafka
KAFKA_BROKERS=localhost:9092

# Elasticsearch
ELASTICSEARCH_NODE=http://localhost:9200

# SeaweedFS
SEAWEEDFS_ENDPOINT=http://localhost:8333
SEAWEEDFS_ACCESS_KEY=admin
SEAWEEDFS_SECRET_KEY=admin123

# JWT
JWT_SECRET=your-jwt-secret-key-change-in-production
JWT_REFRESH_SECRET=your-refresh-secret-key-change-in-production
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Service Ports
PORT_IDENTITY=3001
PORT_AGENT=3002
PORT_INTERACTION=3003
PORT_TICKET=3004
PORT_CUSTOMER=3005
PORT_NOTIFICATION=3006

# Node Environment
NODE_ENV=development
```

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
