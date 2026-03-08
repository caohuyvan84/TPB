# FullStack-RequirementsV3.md — CRM Platform TPB

## Kiro Specification: Enterprise CRM Platform — Multi-Channel Customer Service

**Version:** 3.0
**Date:** 2026-03-06
**Baseline:** RequirementsV1.md (2026-03-04), FullStack-RequirementsV2.md (2026-03-06)
**Scope:** Full CRM Platform — Dynamic Object Engine, Workflow Automation, Multi-PBX CTI, BI Reporting, Agent Desktop Module
**Compliance:** BFSI Security Standards, OWASP Top 10, PCI-DSS (where applicable)
**Traceability:** V1 user stories (US-1–US-14) preserved; V2 stories (US-15–US-18) preserved; V3 adds US-19–US-25

---

## Table of Contents

1. [Platform Overview](#1-platform-overview)
2. [Architecture Summary](#2-architecture-summary)
3. [Microservices Decomposition (DDD)](#3-microservices-decomposition-ddd)
4. [API Gateway & Cross-Cutting Concerns](#4-api-gateway--cross-cutting-concerns)
5. [Service Specifications](#5-service-specifications)
   - 5.1–5.11: Existing Services (MS-1 to MS-11) — preserved from V2
   - 5.12: MS-13 Object Schema Service (NEW)
   - 5.13: MS-14 Layout Service (NEW)
   - 5.14: MS-15 Workflow Service (NEW)
   - 5.15: MS-16 Data Enrichment Service (NEW)
   - 5.16: MS-17 Dashboard Service (NEW)
   - 5.17: MS-18 Report Service (NEW)
   - 5.18: MS-19 CTI Adapter Service (REPLACES MS-12)
6. [Frontend-to-Backend API Mapping](#6-frontend-to-backend-api-mapping)
7. [BFSI Security Standards](#7-bfsi-security-standards)
8. [Authorization & Access Control](#8-authorization--access-control)
9. [Data Architecture](#9-data-architecture)
10. [User Stories (V3 — CRM Platform)](#10-user-stories-v3)
11. [Correctness Properties (V3)](#11-correctness-properties-v3)
12. [Non-Functional Requirements (V3)](#12-non-functional-requirements-v3)
13. [Constraints & Assumptions (V3)](#13-constraints--assumptions-v3)
14. [Appendices](#14-appendices)

---

## 1. Platform Overview

### Platform Name

**TPB CRM Platform — Enterprise Multi-Channel Customer Service & Operations Platform**

A modular CRM platform comprising:
- **Agent Desktop Module** (React 18 SPA) — the existing multi-channel interaction workspace (V1/V2 scope, fully preserved)
- **Admin/Config Module** (React 18 SPA) — object schema design, layout configuration, workflow automation, dashboard/report management, CTI configuration, user/role management
- **Shared Component Library** — dynamic object rendering engine, CTI adapter layer, dashboard widgets, report viewer
- **19 Backend Microservices** — supporting dynamic object schemas, workflow automation (Temporal), multi-PBX CTI, BI reporting (Apache Superset), and all V2 capabilities

### Modules

| Module | Users | Scope |
|---|---|---|
| **Agent Desktop** | Agents, Senior Agents | Interaction queue, voice/email/chat, customer info, tickets, KB, BFSI query, AI assistant, notifications, dashboards (view), reports (view) |
| **Admin/Config** | Admins, Supervisors (partial) | Object schemas, layouts, workflows, dashboards (design), reports (config), CTI config, user/role management, audit viewer |
| **Supervisor** (future V4) | Supervisors | Live monitoring, queue management, agent oversight, SLA dashboards |

### Channels

| Channel | Protocol | Backend Integration |
|---|---|---|
| Voice (CTI) | WebSocket + vendor SDK (Genesys/Avaya/Asterisk) | CTI Adapter Service → Interaction Service |
| Email | REST + IMAP/SMTP | Email Gateway → Interaction Service |
| Chat | WebSocket (STOMP) | Chat Gateway → Interaction Service |

### Locale

Vietnamese (vi-VN) primary; English labels on technical/API fields.

---

## 2. Architecture Summary

### High-Level Platform Architecture

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND MODULES                                │
│                                                                              │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────────────┐   │
│  │  Agent Desktop   │  │  Admin / Config  │  │  Shared Component Lib   │   │
│  │  (React SPA)     │  │  (React SPA)     │  │                          │   │
│  │                  │  │                  │  │  DynamicForm             │   │
│  │  InteractionList │  │  Schema Designer │  │  DynamicDetail           │   │
│  │  InteractionDet. │  │  Layout Designer │  │  LayoutEngine            │   │
│  │  CustomerInfo    │  │  Workflow Editor │  │  SchemaFieldRenderer     │   │
│  │  TicketMgmt      │  │  Dashboard Cfg   │  │  CTIProvider + Adapters  │   │
│  │  KnowledgeBase   │  │  Report Config   │  │  DashboardGrid           │   │
│  │  BFSI Query      │  │  CTI Config      │  │  ReportViewer (Superset) │   │
│  │  AI Assistant    │  │  User/Role Mgmt  │  │  WorkflowCanvas (React   │   │
│  │  Notifications   │  │  Audit Viewer    │  │    Flow)                 │   │
│  │  Agent Status    │  │                  │  │                          │   │
│  │  Call Widget     │  │                  │  │                          │   │
│  │  Dashboards(view)│  │                  │  │                          │   │
│  │  Reports(view)   │  │                  │  │                          │   │
│  └────────┬─────────┘  └────────┬─────────┘  └──────────────────────────┘   │
└───────────┼─────────────────────┼───────────────────────────────────────────┘
            │                     │
            ▼                     ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                         API GATEWAY (Kong/Envoy)                              │
│  mTLS Termination │ Rate Limiting │ JWT Validation │ Routing │ Audit Correl. │
└───────────────────────────────┬──────────────────────────────────────────────┘
                                │
┌───────────────────────────────┼──────────────────────────────────────────────┐
│                    SERVICE MESH (Istio) — mTLS everywhere                     │
│                                                                              │
│  EXISTING SERVICES (V2)              NEW SERVICES (V3)                       │
│  ┌──────────┐ ┌──────────┐          ┌──────────┐ ┌──────────┐               │
│  │ MS-1     │ │ MS-2     │          │ MS-13    │ │ MS-14    │               │
│  │ Identity │ │ Agent    │          │ Object   │ │ Layout   │               │
│  │ Service  │ │ Service  │          │ Schema   │ │ Service  │               │
│  └──────────┘ └──────────┘          │ Service  │ └──────────┘               │
│  ┌──────────┐ ┌──────────┐          └──────────┘                            │
│  │ MS-3     │ │ MS-4     │          ┌──────────┐ ┌──────────┐               │
│  │ Interact.│ │ Ticket   │          │ MS-15    │ │ MS-16    │               │
│  │ Service  │ │ Service  │          │ Workflow │ │ Data     │               │
│  └──────────┘ └──────────┘          │ Service  │ │ Enrichmt │               │
│  ┌──────────┐ ┌──────────┐          └──────────┘ │ Service  │               │
│  │ MS-5     │ │ MS-6     │          ┌──────────┐ └──────────┘               │
│  │ Customer │ │ Notific. │          │ MS-17    │                            │
│  │ Service  │ │ Service  │          │ Dashboard│ ┌──────────┐               │
│  └──────────┘ └──────────┘          │ Service  │ │ MS-18    │               │
│  ┌──────────┐ ┌──────────┐          └──────────┘ │ Report   │               │
│  │ MS-7     │ │ MS-8     │                       │ Service  │               │
│  │ Knowledge│ │ BFSI     │          ┌──────────┐ └──────────┘               │
│  │ Service  │ │ Core Svc │          │ MS-19    │                            │
│  └──────────┘ └──────────┘          │ CTI      │                            │
│  ┌──────────┐ ┌──────────┐          │ Adapter  │                            │
│  │ MS-9     │ │ MS-10    │          │ Service  │                            │
│  │ AI Svc   │ │ Media Svc│          └──────────┘                            │
│  └──────────┘ └──────────┘                                                  │
│  ┌──────────┐                                                               │
│  │ MS-11    │                                                               │
│  │ Audit Svc│                                                               │
│  └──────────┘                                                               │
│                                                                              │
│  INFRASTRUCTURE                                                              │
│  ┌───────────────┐ ┌────────────────┐ ┌──────────────────┐                  │
│  │ Temporal       │ │ Apache Superset│ │ Kafka Event Bus  │                  │
│  │ (Workflow Eng.)│ │ (BI Backend)   │ │                  │                  │
│  └───────────────┘ └────────────────┘ └──────────────────┘                  │
│                                                                              │
│  DATA STORES                                                                 │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐          │
│  │PostgreSQL│ │ Redis    │ │ Elastic  │ │ MinIO/S3 │ │ MongoDB  │          │
│  │ (Primary)│ │ (Cache)  │ │ Search   │ │ (Files)  │ │ (KB/AI)  │          │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘          │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Frontend Architecture (V3)

**Module routing:** React Router — `/agent` (Agent Desktop), `/admin` (Admin Module)
**Provider tree (Agent Desktop):** `AuthProvider > CTIProvider > NotificationProvider > EnhancedAgentStatusProvider > CallProvider > AgentDesktopShell`
**Layout:** 3-panel preserved (Left 320px, Center flex, Right 400px) + header + floating overlays
**State management:** React Context API (preserved) + React Query (TanStack Query) for server state
**Dynamic rendering:** LayoutEngine + SchemaFieldRenderer for schema-driven object display
**Path alias:** `@` maps to `./src`

### Communication Patterns

| Pattern | Use Case | Protocol |
|---|---|---|
| Request-Response | CRUD, queries, schema/layout fetch | REST (HTTPS) |
| Real-time Push | Call state, chat, SLA, notifications, enrichment updates, dashboard metrics | WebSocket (WSS) |
| Event-Driven Async | Audit, analytics, SLA breach, workflow triggers, enrichment requests | Apache Kafka |
| Workflow Orchestration | Multi-step automations, SLA escalation, scheduled tasks | Temporal |
| File Transfer | Recordings, attachments | Pre-signed URLs (S3/MinIO) |
| BI Embedding | Reports, dashboards | Apache Superset Embedded SDK (iframe + guest token) |

---

## 3. Microservices Decomposition (DDD)

### Bounded Contexts & Services

| # | Service Name | Bounded Context | Domain Responsibility | User Stories |
|---|---|---|---|---|
| MS-1 | **Identity Service** | Identity & Access | Auth, RBAC/ABAC, sessions, MFA | All (cross-cutting) |
| MS-2 | **Agent Service** | Agent Management | Profiles, per-channel status, skills, presence | US-11, US-14, US-23 |
| MS-3 | **Interaction Service** | Interaction Mgmt | Lifecycle, queue, filters, search, SLA tracking + **dynamic fields** | US-1–4, US-19 |
| MS-4 | **Ticket Service** | Case Management | CRUD, workflow states, comments + **dynamic object schema** | US-7, US-19, US-20 |
| MS-5 | **Customer Service** | Customer Mgmt | Profiles, notes, history + **dynamic fields, enrichment pipeline** | US-13, US-19 |
| MS-6 | **Notification Service** | Notification | In-app, push, SMS notifications; state machine; preferences | US-12 |
| MS-7 | **Knowledge Service** | Knowledge Mgmt | Articles, folders, search, bookmarks + **dynamic fields** | US-6, US-19 |
| MS-8 | **BFSI Core Banking** | Financial Products | Account/savings/loan/card queries + **dynamic fields** | US-8, US-19 |
| MS-9 | **AI Service** | AI & Automation | Suggestions, generation, summarization, sentiment | US-5 |
| MS-10 | **Media Service** | Media & Files | Recording storage/streaming, attachments, virus scanning | US-2, US-3, US-7 |
| MS-11 | **Audit Service** | Compliance | Immutable audit logs, tamper detection, retention | All (cross-cutting) |
| MS-13 | **Object Schema Service** | **Dynamic Schema** | Object type registry, field definitions, relationships, validation, versioning | **US-19, US-20** |
| MS-14 | **Layout Service** | **Dynamic Layout** | Layout configurations per object type per context, conditional visibility | **US-21** |
| MS-15 | **Workflow Service** | **Automation** | Workflow definitions, event-based triggers, Temporal integration | **US-22** |
| MS-16 | **Data Enrichment Service** | **Data Integration** | External data fetching, aggregation, webhook delivery | **US-19** |
| MS-17 | **Dashboard Service** | **Analytics** | Dashboard configs, widget data aggregation, real-time metrics | **US-24** |
| MS-18 | **Report Service** | **BI Reporting** | Superset proxy, report metadata, permissions, embedding | **US-25** |
| MS-19 | **CTI Adapter Service** | **Telephony** | Multi-vendor CTI config, server-side call event processing (replaces MS-12) | **US-23**, US-9, US-10 |

### Domain Event Flows (Extended for V3)

```
Incoming Call (V3 — with enrichment)
  → CTI Adapter Service emits: call.incoming {callId, callerNumber}
  → Interaction Service: creates interaction, assigns agent
  → Customer Service: lookup by phone → returns LOCAL fields immediately
  → Customer Service → Data Enrichment Service: POST enrichment request (async)
  → Data Enrichment Service: queries CBS, Credit Bureau in parallel
  → Data Enrichment Service → Customer Service: webhook with enriched fields
  → Customer Service → Frontend: WebSocket push object.fields.updated
  → Frontend: skeleton placeholders replaced with actual values (no reload)

Ticket Created (V3 — with workflow trigger)
  → Ticket Service emits: ticket.created {ticketId, fields, customerId}
  → Workflow Service consumes: matches event against active workflow triggers
  → Workflow Service → Temporal: starts workflow execution
  → Temporal Activity Workers: execute steps (notify, escalate, email, SMS)
  → Audit Service: logs all actions

Schema Updated (V3 — new flow)
  → Object Schema Service emits: schema.updated {objectType, version, changes}
  → Layout Service consumes: validates affected layouts
  → All object services (Ticket, Customer, Knowledge, BFSI): reload cached schema
  → Frontend: invalidates schema cache → re-renders affected views
```

---

## 4. API Gateway & Cross-Cutting Concerns

### 4.1 API Gateway Configuration

| Concern | Implementation | Details |
|---|---|---|
| TLS Termination | Gateway-level | TLS 1.3 minimum; certificates from internal CA |
| Authentication | JWT validation | RS256-signed tokens; token introspection for revoked tokens |
| Rate Limiting | Per-user, per-endpoint | Default: 100 req/min; admin endpoints: 30 req/min; sensitive: 10 req/min |
| Request Routing | Path-based | `/api/v1/interactions/*` → Interaction Service, `/api/v1/admin/*` → respective admin endpoints |
| CORS | Whitelist | `https://agent.tpb.vn`, `https://admin.tpb.vn` |
| Request ID | Auto-generated | `X-Request-Id` propagated across all services |
| Request/Response Logging | Redacted | PII fields masked in logs |

### 4.2 Service Mesh (mTLS)

All inter-service communication encrypted with mutual TLS via Istio. X.509 certificates from internal PKI. No plaintext HTTP.

### 4.3 Observability Stack

| Layer | Tool | Purpose |
|---|---|---|
| Distributed Tracing | Jaeger / OpenTelemetry | End-to-end request tracing |
| Metrics | Prometheus + Grafana | Health, latency, error rates, SLA |
| Logging | ELK Stack | Structured JSON logs with correlation IDs |
| Alerting | PagerDuty / Alertmanager | SLA breach, service down, security alerts |
| Workflow Monitoring | Temporal Web UI | Workflow execution visibility (admin-only) |

---

## 5. Service Specifications

### 5.1–5.11: Existing Services (MS-1 through MS-11)

All existing service specifications from V2 are **preserved in full** — including entities, API endpoints, request/response schemas, and WebSocket channels for:

- **MS-1: Identity Service** — Auth, JWT, MFA, sessions, RBAC (V2 Section 5, lines 222-358)
- **MS-2: Agent Service** — Profiles, per-channel status, presence (V2 Section 5, lines 362-526)
- **MS-3: Interaction Service** — Queue, filters, SLA, voice/email/chat (V2 Section 5, lines 530-771)
- **MS-4: Ticket Service** — CRUD, comments, workflows (V2 Section 5, lines 774-948)
- **MS-5: Customer Service** — Profiles, notes, history (V2 Section 5, lines 952-1047)
- **MS-6: Notification Service** — 5 types, state machine, preferences (V2 Section 5, lines 1050-1170)
- **MS-7: Knowledge Service** — Articles, folders, search, bookmarks (V2 Section 5, lines 1174-1317)
- **MS-8: BFSI Core Banking** — 8 product categories, sensitive data masking (V2 Section 5, lines 1321-1492)
- **MS-9: AI Service** — Suggestions, generation, summarization (V2 Section 5, lines 1496-1554)
- **MS-10: Media Service** — File upload/download/stream, virus scanning (V2 Section 5, lines 1558-1580)
- **MS-11: Audit Service** — Immutable logs, tamper detection (V2 Section 5, lines 1584-1642)

**V3 Modifications to existing services:**

Services MS-3, MS-4, MS-5, MS-7, and MS-8 are enhanced to support **dynamic object fields**. Their entities now include:

```typescript
// Added to Interaction, Ticket, Customer, KBArticle, BankProduct entities:
interface DynamicObjectSupport {
  // Core fields remain as fixed typed properties (backward compatible)
  // Dynamic fields stored in JSONB column:
  dynamicFields: Record<string, DynamicFieldValue>;
}

interface DynamicFieldValue {
  value: any;
  source: 'local' | 'enrichment' | 'computed' | 'reference';
  status: 'loaded' | 'loading' | 'error' | 'stale';
  updatedAt: DateTime;
  enrichmentSourceId?: UUID;
}
```

Each service adds a new endpoint for dynamic field updates:

| Method | Path | Description |
|---|---|---|
| PATCH | `/api/v1/{objectType}/{id}/fields` | Update dynamic fields on an object instance |
| GET | `/api/v1/{objectType}/{id}/fields` | Get all fields (core + dynamic) with status |

And a new WebSocket channel for progressive loading:

| Channel | Direction | Purpose |
|---|---|---|
| `/ws/objects/{objectType}/{objectId}/fields` | Server→Client | Real-time field enrichment updates |

---

### 5.12: MS-13 Object Schema Service (NEW)

**Domain:** Dynamic Object Schema Management
**Database:** PostgreSQL (schema: `object_schema`)
**Cache:** Redis (schema cache, invalidated on change via Kafka event)
**Events Published:** `schema.updated`, `schema.field.added`, `schema.field.removed`, `schema.relationship.changed`

#### Entities

```typescript
interface ObjectType {
  id: UUID;
  tenantId: UUID;
  name: string;                        // "customer", "ticket", "kb_article", "bank_product"
  displayName: string;                 // "Khách hàng", "Ticket"
  displayNamePlural: string;           // "Khách hàng", "Tickets"
  icon?: string;                       // Lucide icon name
  version: number;                     // Schema versioning (auto-increment)
  fields: ObjectField[];
  coreFieldIds: UUID[];                // Fields that cannot be removed
  relationships: ObjectRelationship[];
  enrichmentConfig?: EnrichmentConfig;
  isSystem: boolean;                   // true = built-in object type (cannot delete)
  createdAt: DateTime;
  updatedAt: DateTime;
}

interface ObjectField {
  id: UUID;
  objectTypeId: UUID;
  name: string;                        // "email", "phone", "custom_credit_score"
  displayName: string;                 // "Email", "Điểm tín dụng"
  fieldType: FieldType;
  dataSource: FieldDataSource;
  enrichmentSourceId?: UUID;           // FK to EnrichmentSource
  isRequired: boolean;
  isReadOnly: boolean;
  isSearchable: boolean;
  isSortable: boolean;
  isFilterable: boolean;
  isSensitive: boolean;               // PII masking applies
  isUnique: boolean;
  defaultValue?: any;
  validationRules?: ValidationRule[];
  displayConfig: FieldDisplayConfig;
  sortOrder: number;
  groupName?: string;                  // "Thông tin liên hệ", "Tài chính"
  isCore: boolean;                     // true = system field, cannot delete
  isActive: boolean;
  createdAt: DateTime;
  updatedAt: DateTime;
}

enum FieldType {
  TEXT = 'text',
  LONG_TEXT = 'long_text',
  RICH_TEXT = 'rich_text',
  NUMBER = 'number',
  DECIMAL = 'decimal',
  CURRENCY = 'currency',
  DATE = 'date',
  DATETIME = 'datetime',
  BOOLEAN = 'boolean',
  ENUM = 'enum',
  MULTI_ENUM = 'multi_enum',
  EMAIL = 'email',
  PHONE = 'phone',
  URL = 'url',
  FILE = 'file',
  IMAGE = 'image',
  JSON = 'json',
  REFERENCE = 'reference',
  MULTI_REFERENCE = 'multi_reference',
  RATING = 'rating',
  COLOR = 'color',
  TAG = 'tag',
  USER = 'user',
  FORMULA = 'formula',
  LOOKUP = 'lookup',                   // Read-only value from related object
  ROLLUP = 'rollup'                    // Aggregation from related objects (count, sum, avg)
}

enum FieldDataSource {
  LOCAL = 'local',
  ENRICHMENT = 'enrichment',
  COMPUTED = 'computed',
  REFERENCE = 'reference'
}

interface FieldDisplayConfig {
  placeholder?: string;
  helpText?: string;
  prefix?: string;
  suffix?: string;
  format?: string;
  enumOptions?: Array<{ value: string; label: string; color?: string; icon?: string }>;
  minValue?: number;
  maxValue?: number;
  maxLength?: number;
  referenceObjectType?: string;
  referenceDisplayField?: string;
  formulaExpression?: string;
  lookupField?: string;
  rollupFunction?: 'count' | 'sum' | 'avg' | 'min' | 'max';
  rollupField?: string;
  maskPattern?: string;
  width?: 'quarter' | 'third' | 'half' | 'two-thirds' | 'full';
}

interface ValidationRule {
  type: 'required' | 'min' | 'max' | 'minLength' | 'maxLength' | 'pattern' | 'custom';
  value?: any;
  message: string;                     // Vietnamese error message
  customExpression?: string;           // For 'custom' type: JSONata expression
}

interface ObjectRelationship {
  id: UUID;
  name: string;                        // "customer_tickets"
  displayName: string;                 // "Tickets của khách hàng"
  sourceObjectType: string;
  targetObjectType: string;
  relationType: 'one-to-one' | 'one-to-many' | 'many-to-many';
  sourceField: string;                 // "id"
  targetField: string;                 // "customerId"
  cascadeDelete: boolean;
  displayInSource: boolean;
  displayInTarget: boolean;
  filterableInSource: boolean;
  sortOrder: number;
}

interface EnrichmentConfig {
  enabled: boolean;
  triggerOn: 'access' | 'create' | 'update';
  staleTTLSeconds: number;            // Re-enrich if data older than this
  sources: UUID[];                     // EnrichmentSource IDs
}
```

#### API Endpoints

| Method | Path | Description | Auth |
|---|---|---|---|
| GET | `/api/v1/schemas/{objectType}` | Get schema (agent-facing, cached) | Bearer JWT |
| GET | `/api/v1/schemas/{objectType}/version/{ver}` | Get specific version | Bearer JWT |
| GET | `/api/v1/admin/object-types` | List all object types | Bearer JWT + `schema:read` |
| GET | `/api/v1/admin/object-types/{name}` | Get object type detail | Bearer JWT + `schema:read` |
| POST | `/api/v1/admin/object-types` | Create object type | Bearer JWT + `schema:write` |
| PUT | `/api/v1/admin/object-types/{name}` | Update object type | Bearer JWT + `schema:write` |
| GET | `/api/v1/admin/object-types/{name}/fields` | List fields | Bearer JWT + `schema:read` |
| POST | `/api/v1/admin/object-types/{name}/fields` | Add field | Bearer JWT + `schema:write` |
| PUT | `/api/v1/admin/object-types/{name}/fields/{id}` | Update field | Bearer JWT + `schema:write` |
| DELETE | `/api/v1/admin/object-types/{name}/fields/{id}` | Remove field (non-core) | Bearer JWT + `schema:write` |
| GET | `/api/v1/admin/object-types/{name}/relationships` | List relationships | Bearer JWT + `schema:read` |
| POST | `/api/v1/admin/object-types/{name}/relationships` | Create relationship | Bearer JWT + `schema:write` |
| PUT | `/api/v1/admin/object-types/{name}/relationships/{id}` | Update relationship | Bearer JWT + `schema:write` |
| DELETE | `/api/v1/admin/object-types/{name}/relationships/{id}` | Remove relationship | Bearer JWT + `schema:write` |
| POST | `/api/v1/admin/object-types/{name}/validate` | Validate schema changes | Bearer JWT + `schema:write` |
| GET | `/api/v1/admin/object-types/{name}/impact` | Impact analysis before save | Bearer JWT + `schema:write` |

#### Default Object Types (Pre-configured)

| Object Type | Core Fields | Default Relationships |
|---|---|---|
| `customer` | id, cif, fullName, email, phone, segment, isVIP, avatar, satisfactionRating | → tickets (1:N), → interactions (1:N), → bank_products (1:N) |
| `ticket` | id, displayId, title, description, status, priority, category, department, assignedAgentId, customerId, dueAt | → customer (N:1), → interaction (N:1), → comments (1:N) |
| `interaction` | id, displayId, type, channel, status, priority, customerId, assignedAgentId, subject, direction | → customer (N:1), → tickets (1:N) |
| `kb_article` | id, title, summary, content, tags, category, viewCount, rating, folderId | → folder (N:1) |
| `bank_product` | id, customerId, type, accountNumber, balance, status | → customer (N:1) |

---

### 5.13: MS-14 Layout Service (NEW)

**Domain:** Dynamic Layout Configuration
**Database:** PostgreSQL (schema: `layout`)
**Cache:** Redis (layout configs, per-tenant per-object-type, 5-min TTL)

#### Entities

```typescript
interface Layout {
  id: UUID;
  tenantId: UUID;
  objectType: string;
  context: LayoutContext;
  name: string;
  description?: string;
  isDefault: boolean;
  isActive: boolean;
  roleRestrictions?: string[];
  config: LayoutConfig;
  version: number;
  createdBy: UUID;
  createdAt: DateTime;
  updatedAt: DateTime;
}

enum LayoutContext {
  DETAIL_FULL = 'detail_full',
  DETAIL_COMPACT = 'detail_compact',
  CREATE = 'create',
  EDIT = 'edit',
  QUICK_EDIT = 'quick_edit',
  LIST_ITEM = 'list_item',
  LIST_TABLE = 'list_table',
  PREVIEW = 'preview',
  PRINT = 'print'
}

interface LayoutConfig {
  columns: number;                     // 1, 2, 3, 4
  sections: LayoutSection[];
  conditionalVisibility?: ConditionalRule[];
}

interface LayoutSection {
  id: string;
  title?: string;
  collapsible: boolean;
  defaultCollapsed: boolean;
  columns: number;
  fields: LayoutField[];
  sortOrder: number;
  conditionalVisibility?: ConditionalRule;
}

interface LayoutField {
  fieldId: UUID;
  fieldName: string;
  width: 'quarter' | 'third' | 'half' | 'two-thirds' | 'full';
  label?: string;
  isVisible: boolean;
  isEditable: boolean;
  sortOrder: number;
  renderAs?: 'default' | 'badge' | 'link' | 'avatar' | 'progress' | 'sparkline' | 'custom';
  customRenderer?: string;
  conditionalVisibility?: ConditionalRule;
}

interface ConditionalRule {
  field: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'gt' | 'lt' | 'is_empty' | 'is_not_empty' | 'in';
  value: any;
  action: 'show' | 'hide' | 'disable' | 'require';
}
```

#### API Endpoints

| Method | Path | Description | Auth |
|---|---|---|---|
| GET | `/api/v1/layouts/{objectType}` | Get active layouts (agent-facing) | Bearer JWT |
| GET | `/api/v1/layouts/{objectType}/{context}` | Get layout for context | Bearer JWT |
| GET | `/api/v1/admin/layouts` | List all layouts | Bearer JWT + `layout:read` |
| GET | `/api/v1/admin/layouts/{id}` | Get layout detail | Bearer JWT + `layout:read` |
| POST | `/api/v1/admin/layouts` | Create layout | Bearer JWT + `layout:write` |
| PUT | `/api/v1/admin/layouts/{id}` | Update layout | Bearer JWT + `layout:write` |
| DELETE | `/api/v1/admin/layouts/{id}` | Delete layout | Bearer JWT + `layout:write` |
| POST | `/api/v1/admin/layouts/{id}/duplicate` | Duplicate layout | Bearer JWT + `layout:write` |
| POST | `/api/v1/admin/layouts/{id}/preview` | Preview with sample data | Bearer JWT + `layout:write` |

---

### 5.14: MS-15 Workflow Service (NEW)

**Domain:** Workflow Automation
**Database:** PostgreSQL (schema: `workflow`)
**Backend Engine:** Temporal (self-hosted, pure backend)
**Events Consumed:** All Kafka domain events
**Actions:** Notify, email, SMS, update object, assign agent, escalate, webhook, AI classify

#### Entities

```typescript
interface WorkflowDefinition {
  id: UUID;
  tenantId: UUID;
  name: string;
  description: string;
  isActive: boolean;
  version: number;
  trigger: WorkflowTrigger;
  steps: WorkflowStep[];
  variables: WorkflowVariable[];
  errorHandling: ErrorHandlingConfig;
  createdBy: UUID;
  createdAt: DateTime;
  updatedAt: DateTime;
}

interface WorkflowTrigger {
  type: 'event' | 'schedule' | 'manual' | 'webhook';
  eventType?: string;                  // "ticket.created", "sla.breached"
  conditions?: TriggerCondition[];
  schedule?: string;                   // cron expression
  webhookPath?: string;
}

interface TriggerCondition {
  field: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'gt' | 'lt' | 'in' | 'not_in' | 'matches';
  value: any;
}

interface WorkflowStep {
  id: string;
  type: WorkflowStepType;
  name: string;
  config: Record<string, any>;
  position: { x: number; y: number };  // React Flow canvas position
  connections: StepConnection[];
  timeout?: number;
  retryPolicy?: { maxRetries: number; backoffMs: number };
}

enum WorkflowStepType {
  // Conditions
  CONDITION = 'condition',
  SWITCH = 'switch',
  // Actions
  SEND_NOTIFICATION = 'send_notification',
  SEND_EMAIL = 'send_email',
  SEND_SMS = 'send_sms',
  UPDATE_OBJECT = 'update_object',
  ASSIGN_AGENT = 'assign_agent',
  ESCALATE_TICKET = 'escalate_ticket',
  CREATE_TICKET = 'create_ticket',
  CALL_WEBHOOK = 'call_webhook',
  CALL_API = 'call_api',
  // Flow Control
  WAIT = 'wait',
  WAIT_FOR_EVENT = 'wait_for_event',
  PARALLEL = 'parallel',
  LOOP = 'loop',
  // AI
  AI_CLASSIFY = 'ai_classify',
  AI_GENERATE = 'ai_generate'
}

interface StepConnection {
  targetStepId: string;
  label?: string;
  condition?: TriggerCondition;
}

interface WorkflowExecution {
  id: UUID;
  workflowId: UUID;
  temporalWorkflowId: string;
  status: 'running' | 'completed' | 'failed' | 'timed_out' | 'cancelled';
  triggerEvent: Record<string, any>;
  stepResults: StepResult[];
  startedAt: DateTime;
  completedAt?: DateTime;
  error?: string;
}

interface StepResult {
  stepId: string;
  stepName: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  input?: Record<string, any>;
  output?: Record<string, any>;
  error?: string;
  startedAt: DateTime;
  completedAt?: DateTime;
}
```

#### Temporal Integration

```
Kafka Event → Workflow Service (Event Listener)
  → Match event against active workflow triggers
  → Start Temporal workflow with matched definition
  → Temporal executes steps as Activities:
     ├── NotifyActivity → Notification Service
     ├── EmailActivity → Email Gateway
     ├── SMSActivity → SMS Gateway
     ├── UpdateObjectActivity → Object Services (Ticket, Customer)
     ├── EscalateActivity → Ticket Service
     ├── WebhookActivity → External Systems
     ├── AIActivity → AI Service
     └── WaitActivity → Temporal Timer
```

#### API Endpoints

| Method | Path | Description | Auth |
|---|---|---|---|
| GET | `/api/v1/admin/workflows` | List workflows | Bearer JWT + `workflow:read` |
| GET | `/api/v1/admin/workflows/{id}` | Get workflow definition | Bearer JWT + `workflow:read` |
| POST | `/api/v1/admin/workflows` | Create workflow | Bearer JWT + `workflow:write` |
| PUT | `/api/v1/admin/workflows/{id}` | Update workflow | Bearer JWT + `workflow:write` |
| DELETE | `/api/v1/admin/workflows/{id}` | Delete workflow | Bearer JWT + `workflow:write` |
| PUT | `/api/v1/admin/workflows/{id}/activate` | Activate | Bearer JWT + `workflow:write` |
| PUT | `/api/v1/admin/workflows/{id}/deactivate` | Deactivate | Bearer JWT + `workflow:write` |
| GET | `/api/v1/admin/workflows/{id}/executions` | Execution history | Bearer JWT + `workflow:read` |
| GET | `/api/v1/admin/workflows/{id}/executions/{execId}` | Execution detail | Bearer JWT + `workflow:read` |
| POST | `/api/v1/admin/workflows/{id}/test` | Test with sample event | Bearer JWT + `workflow:write` |
| GET | `/api/v1/admin/workflows/triggers/event-types` | Available event types | Bearer JWT + `workflow:read` |
| GET | `/api/v1/admin/workflows/actions/types` | Available action types | Bearer JWT + `workflow:read` |
| POST | `/api/v1/admin/workflows/{id}/export` | Export as JSON | Bearer JWT + `workflow:read` |
| POST | `/api/v1/admin/workflows/import` | Import from JSON | Bearer JWT + `workflow:write` |

---

### 5.15: MS-16 Data Enrichment Service (NEW)

**Domain:** External Data Integration & Enrichment
**Database:** PostgreSQL (enrichment source configs, request log) + Redis (request dedup, cache)

#### Progressive Loading Flow

```
1. Call arrives → Customer Service looks up by phone
2. LOCAL fields returned immediately → Frontend displays them
3. ENRICHMENT fields have status: "loading" → Frontend shows skeleton
4. Data Enrichment Service queries external sources in parallel
5. Results aggregated, mapped to schema fields via FieldMapping config
6. Webhook callback to Customer Service with enriched data
7. Customer Service pushes WebSocket event → Frontend updates fields seamlessly
```

#### Entities

```typescript
interface EnrichmentSource {
  id: UUID;
  tenantId: UUID;
  name: string;                        // "Core Banking System", "Credit Bureau"
  type: 'rest' | 'soap' | 'graphql' | 'database';
  connectionConfig: {
    baseUrl?: string;
    authType: 'api-key' | 'oauth2' | 'basic' | 'mtls';
    credentials: EncryptedString;
    timeout: number;
    retryPolicy: { maxRetries: number; backoffMs: number };
  };
  fieldMappings: FieldMapping[];
  cachePolicy: {
    enabled: boolean;
    ttlSeconds: number;
    staleWhileRevalidate: boolean;
  };
  rateLimiting: {
    maxRequestsPerMinute: number;
    maxConcurrent: number;
  };
  isActive: boolean;
  createdAt: DateTime;
  updatedAt: DateTime;
}

interface FieldMapping {
  sourceField: string;                 // JSON path: "$.data.creditScore"
  targetObjectType: string;            // "customer"
  targetFieldName: string;             // "creditScore"
  transformExpression?: string;        // JSONata transform
}

interface EnrichmentRequest {
  id: UUID;
  objectType: string;
  objectId: UUID;
  sourceIds: UUID[];
  status: 'pending' | 'in-progress' | 'completed' | 'partial' | 'failed';
  results: Record<string, { status: string; data?: any; error?: string }>;
  requestedAt: DateTime;
  completedAt?: DateTime;
}
```

#### API Endpoints

| Method | Path | Description | Auth |
|---|---|---|---|
| POST | `/internal/enrichment/request` | Submit enrichment request | Internal (mTLS) |
| GET | `/internal/enrichment/request/{id}` | Check status | Internal (mTLS) |
| GET | `/api/v1/admin/enrichment/sources` | List sources | Bearer JWT + `enrichment:read` |
| POST | `/api/v1/admin/enrichment/sources` | Create source | Bearer JWT + `enrichment:write` |
| PUT | `/api/v1/admin/enrichment/sources/{id}` | Update source | Bearer JWT + `enrichment:write` |
| POST | `/api/v1/admin/enrichment/sources/{id}/test` | Test connectivity | Bearer JWT + `enrichment:write` |

---

### 5.16: MS-17 Dashboard Service (NEW)

**Domain:** Real-time Dashboard & Analytics
**Database:** PostgreSQL (schema: `dashboard`)
**Cache:** Redis (metric counters, widget data cache)

#### Entities

```typescript
interface Dashboard {
  id: UUID;
  tenantId: UUID;
  name: string;
  description?: string;
  type: 'personal' | 'team' | 'department' | 'system';
  ownerId?: UUID;
  roleRestrictions?: string[];
  layout: DashboardLayout;
  refreshInterval: number;             // seconds
  isDefault: boolean;
  createdBy: UUID;
  createdAt: DateTime;
  updatedAt: DateTime;
}

interface DashboardLayout {
  columns: number;                     // 12-column grid
  widgets: DashboardWidget[];
}

interface DashboardWidget {
  id: string;
  type: WidgetType;
  title: string;
  position: { x: number; y: number; w: number; h: number };
  config: WidgetConfig;
  refreshInterval?: number;
}

enum WidgetType {
  METRIC_CARD = 'metric_card',
  LINE_CHART = 'line_chart',
  BAR_CHART = 'bar_chart',
  PIE_CHART = 'pie_chart',
  DONUT_CHART = 'donut_chart',
  TABLE = 'table',
  QUEUE_LIST = 'queue_list',
  AGENT_STATUS_GRID = 'agent_status_grid',
  SLA_GAUGE = 'sla_gauge',
  HEATMAP = 'heatmap',
  LEADERBOARD = 'leaderboard',
  TICKER = 'ticker'
}

interface WidgetConfig {
  dataSource: string;
  filters?: Record<string, any>;
  groupBy?: string;
  timeRange?: string;
  thresholds?: { warning: number; critical: number };
  displayOptions?: Record<string, any>;
}
```

#### API Endpoints

| Method | Path | Description | Auth |
|---|---|---|---|
| GET | `/api/v1/dashboards` | List dashboards for user | Bearer JWT |
| GET | `/api/v1/dashboards/{id}` | Get dashboard config | Bearer JWT |
| GET | `/api/v1/dashboards/{id}/data` | Get all widget data | Bearer JWT |
| GET | `/api/v1/dashboards/widgets/{id}/data` | Get single widget data | Bearer JWT |
| POST | `/api/v1/admin/dashboards` | Create dashboard | Bearer JWT + `dashboard:write` |
| PUT | `/api/v1/admin/dashboards/{id}` | Update dashboard | Bearer JWT + `dashboard:write` |
| DELETE | `/api/v1/admin/dashboards/{id}` | Delete dashboard | Bearer JWT + `dashboard:write` |
| GET | `/api/v1/admin/dashboards/widget-types` | List widget types | Bearer JWT + `dashboard:read` |
| GET | `/api/v1/admin/dashboards/data-sources` | List data sources | Bearer JWT + `dashboard:read` |
| PUT | `/api/v1/dashboards/{id}/personal` | Update personal dashboard | Bearer JWT |

#### WebSocket Channel

| Channel | Direction | Purpose |
|---|---|---|
| `/ws/dashboards/{dashboardId}/metrics` | Server→Client | Real-time metric updates |

---

### 5.17: MS-18 Report Service (NEW)

**Domain:** BI Reporting (Apache Superset Integration)
**Database:** PostgreSQL (schema: `report`) — report metadata, CRM-side permissions
**Integration:** Apache Superset REST API — chart/dashboard CRUD, guest token generation
**Data Source:** Read replica / Data Warehouse with materialized views

#### Key Design

1. Agents/supervisors access reports **only through CRM UI** (never Superset directly)
2. Admin configures reports in CRM → CRM calls Superset API
3. Embedding via Superset Embedded SDK with guest tokens
4. CRM manages permissions; Superset enforces RLS via guest token claims
5. Scheduled report delivery managed by CRM

#### API Endpoints

| Method | Path | Description | Auth |
|---|---|---|---|
| GET | `/api/v1/reports` | List accessible reports | Bearer JWT |
| GET | `/api/v1/reports/{id}` | Get report metadata | Bearer JWT |
| GET | `/api/v1/reports/{id}/embed-token` | Get Superset guest token | Bearer JWT |
| GET | `/api/v1/admin/reports` | List all reports | Bearer JWT + `report:write` |
| POST | `/api/v1/admin/reports` | Create report | Bearer JWT + `report:write` |
| PUT | `/api/v1/admin/reports/{id}` | Update report | Bearer JWT + `report:write` |
| DELETE | `/api/v1/admin/reports/{id}` | Delete report | Bearer JWT + `report:write` |
| GET | `/api/v1/admin/reports/{id}/permissions` | Get permissions | Bearer JWT + `report:write` |
| PUT | `/api/v1/admin/reports/{id}/permissions` | Set permissions | Bearer JWT + `report:write` |
| POST | `/api/v1/admin/reports/{id}/schedule` | Schedule delivery | Bearer JWT + `report:write` |
| GET | `/api/v1/admin/reports/data-sources` | List Superset datasets | Bearer JWT + `report:write` |

---

### 5.18: MS-19 CTI Adapter Service (REPLACES MS-12)

**Domain:** Multi-Vendor Telephony Integration
**Database:** PostgreSQL (CTI vendor configs) + Redis (call state cache)
**Frontend SDK:** Pluggable adapter pattern — abstract interface + vendor-specific implementations

#### CTI Adapter Interface (Frontend — TypeScript)

```typescript
interface CTIAdapter {
  initialize(config: CTIConfig): Promise<void>;
  login(agentId: string, extension: string): Promise<void>;
  logout(): Promise<void>;
  setStatus(status: AgentCTIStatus): Promise<void>;
  answer(callId: string): Promise<void>;
  hangup(callId: string): Promise<void>;
  hold(callId: string): Promise<void>;
  resume(callId: string): Promise<void>;
  mute(callId: string): Promise<void>;
  unmute(callId: string): Promise<void>;
  transfer(callId: string, target: TransferTarget, type: 'warm' | 'cold'): Promise<void>;
  conference(callId: string, target: string): Promise<void>;
  sendDTMF(callId: string, digit: string): Promise<void>;
  makeCall(phoneNumber: string): Promise<string>; // returns callId
  onEvent(callback: (event: CTIEvent) => void): void;
  dispose(): void;
}

interface CTIEvent {
  type: CTIEventType;
  callId?: string;
  timestamp: DateTime;
  data: Record<string, any>;
}

enum CTIEventType {
  CALL_RINGING = 'call.ringing',
  CALL_CONNECTED = 'call.connected',
  CALL_HELD = 'call.held',
  CALL_RESUMED = 'call.resumed',
  CALL_ENDED = 'call.ended',
  CALL_TRANSFERRING = 'call.transferring',
  CALL_TRANSFERRED = 'call.transferred',
  CALL_CONFERENCE_STARTED = 'call.conference.started',
  CALL_MUTED = 'call.muted',
  CALL_UNMUTED = 'call.unmuted',
  AGENT_STATUS_CHANGED = 'agent.status.changed',
  ERROR = 'error',
  CONNECTION_STATE_CHANGED = 'connection.state.changed'
}
```

#### Supported Adapters (Initial)

| Adapter | Wraps | Protocol |
|---|---|---|
| `GenesysAdapter` | Genesys Cloud Platform SDK | REST + WebSocket |
| `AvayaAdapter` | Avaya Aura WebRTC SDK | WebRTC + REST |
| `AsteriskAdapter` | SIP.js / JsSIP | SIP over WebSocket (WebRTC) |

#### Backend API Endpoints

| Method | Path | Description | Auth |
|---|---|---|---|
| GET | `/api/v1/admin/cti/vendors` | List supported CTI vendors | Bearer JWT + `cti:read` |
| GET | `/api/v1/admin/cti/config` | Get CTI configuration | Bearer JWT + `cti:read` |
| PUT | `/api/v1/admin/cti/config` | Update CTI configuration | Bearer JWT + `cti:write` |
| POST | `/api/v1/admin/cti/config/test` | Test CTI connection | Bearer JWT + `cti:write` |
| GET | `/api/v1/cti/config` | Get CTI config for agent (runtime) | Bearer JWT |

#### Frontend Integration

```
CTIProvider (React Context)
  ├── CTIAdapterFactory.create(vendorConfig) → returns CTIAdapter instance
  ├── CTI events → CallContext (existing, unchanged interface)
  ├── FloatingCallWidget → calls ctiAdapter.hold(), .mute(), etc.
  ├── TransferCallDialog → calls ctiAdapter.transfer()
  └── EnhancedAgentStatusContext → syncs voice status with CTI
```

**Existing components unchanged.** Only the underlying call control mechanism switches from direct state manipulation to CTI adapter calls.

---

## 6. Frontend-to-Backend API Mapping

### V1/V2 Mappings (Preserved)

All API mappings from V2 Section 6 are preserved unchanged for US-1 through US-14.

### V3 New Mappings

#### US-19: Dynamic Object Fields

| Frontend Action | API Call(s) | WebSocket |
|---|---|---|
| Load customer profile | `GET /api/v1/schemas/customer` + `GET /api/v1/customers/{id}/fields` | Subscribe `/ws/objects/customer/{id}/fields` |
| Load ticket detail | `GET /api/v1/schemas/ticket` + `GET /api/v1/tickets/{id}` (includes dynamic fields) | — |
| Enrichment update arrives | — | Receive `object.fields.updated` on `/ws/objects/customer/{id}/fields` |
| Render form | `GET /api/v1/schemas/{type}` + `GET /api/v1/layouts/{type}/create` | — |

#### US-20: Object Schema Configuration (Admin)

| Admin Action | API Call(s) |
|---|---|
| View object types | `GET /api/v1/admin/object-types` |
| Edit object schema | `GET /api/v1/admin/object-types/{name}` → `PUT /api/v1/admin/object-types/{name}` |
| Add field | `POST /api/v1/admin/object-types/{name}/fields` |
| Create relationship | `POST /api/v1/admin/object-types/{name}/relationships` |
| Impact analysis | `GET /api/v1/admin/object-types/{name}/impact` |

#### US-21: Layout Configuration (Admin)

| Admin Action | API Call(s) |
|---|---|
| List layouts | `GET /api/v1/admin/layouts` |
| Design layout | `PUT /api/v1/admin/layouts/{id}` |
| Preview layout | `POST /api/v1/admin/layouts/{id}/preview` |

#### US-22: Workflow Automation (Admin)

| Admin Action | API Call(s) |
|---|---|
| Create workflow (drag-drop) | `POST /api/v1/admin/workflows` |
| Edit workflow JSON | `PUT /api/v1/admin/workflows/{id}` |
| Test workflow | `POST /api/v1/admin/workflows/{id}/test` |
| View executions | `GET /api/v1/admin/workflows/{id}/executions` |
| Export/Import | `POST .../export`, `POST .../import` |

#### US-23: CTI Integration

| Agent Action | API/WebSocket Call |
|---|---|
| Login to CTI | `GET /api/v1/cti/config` → `ctiAdapter.initialize()` → `ctiAdapter.login()` |
| Answer call | `ctiAdapter.answer(callId)` (SDK direct) |
| Hold/Mute/Transfer | `ctiAdapter.hold()` / `.mute()` / `.transfer()` (SDK direct) |
| CTI events | CTI SDK → CTIProvider → CallContext (existing flow preserved) |

#### US-24: Dashboard Display

| Action | API Call(s) | WebSocket |
|---|---|---|
| Load dashboard | `GET /api/v1/dashboards/{id}` + `GET /api/v1/dashboards/{id}/data` | Subscribe `/ws/dashboards/{id}/metrics` |
| Refresh widget | `GET /api/v1/dashboards/widgets/{widgetId}/data` | — |

#### US-25: Report Viewing

| Action | API Call(s) |
|---|---|
| List reports | `GET /api/v1/reports` |
| View report | `GET /api/v1/reports/{id}/embed-token` → iframe embed with Superset SDK |

---

## 7. BFSI Security Standards

All V2 security standards (Sections 7.1–7.6) are **preserved in full**:
- 7.1 Data Encryption (TLS 1.3, mTLS, AES-256, field-level, HSM)
- 7.2 Authentication Security (bcrypt, MFA, session mgmt, lockout)
- 7.3 Sensitive Data Handling (masking, PCI-DSS, classifications)
- 7.4 Network Security (WAF, DDoS, CORS, CSP, headers)
- 7.5 Audit Requirements (all categories)
- 7.6 Data Retention (7-year audit, 5-year recordings)

### 7.7 V3 Security Extensions

| New Area | Security Requirement |
|---|---|
| **Schema Changes** | All schema modifications generate audit entries with category `configuration-change`, sensitivity `high` |
| **Workflow Definitions** | Workflow create/update/activate/deactivate audited. Workflow test executions sandboxed (no real side effects) |
| **Enrichment Sources** | Credentials stored in HashiCorp Vault, never in DB. All external API calls logged. |
| **Superset Integration** | Guest tokens expire in 5 minutes. RLS enforced per tenant. No direct Superset access from browser. |
| **CTI Adapter** | CTI credentials stored in Vault. SIP/WebRTC traffic encrypted. Call recording consent compliance. |
| **Dashboard Data** | Metric data respects RBAC scope. Agent sees only own/team metrics based on role. |

---

## 8. Authorization & Access Control

### 8.1 RBAC Role Definitions (Extended)

| Role | Description | Scope | Inherits |
|---|---|---|---|
| `agent` | Front-line agent | Own data | — |
| `senior-agent` | Senior agent | Team data | `agent` |
| `supervisor` | Team supervisor | Department data | `senior-agent` |
| `admin` | System administrator | All data + all config | `supervisor` |
| `auditor` | Compliance auditor | Audit logs (read-only) | — |

### 8.2 Permission Matrix (V3 — Extended)

All V2 permissions preserved. New V3 permissions added:

| Resource | Action | `agent` | `senior-agent` | `supervisor` | `admin` | `auditor` |
|---|---|---|---|---|---|---|
| **V2 permissions** | (all preserved) | (unchanged) | (unchanged) | (unchanged) | (unchanged) | (unchanged) |
| **Object Schema** | `read` | all | all | all | all | — |
| **Object Schema** | `write` | — | — | — | all | — |
| **Layout** | `read` | all | all | all | all | — |
| **Layout** | `write` | — | — | — | all | — |
| **Workflow** | `read` | — | — | dept | all | — |
| **Workflow** | `write` | — | — | — | all | — |
| **Dashboard** | `read` (personal) | own | own | own | all | — |
| **Dashboard** | `read` (team/dept) | team | team | dept | all | — |
| **Dashboard** | `write` (personal) | own | own | own | all | — |
| **Dashboard** | `write` (team/dept) | — | — | dept | all | — |
| **Report** | `read` | assigned | assigned | dept | all | all |
| **Report** | `write` | — | — | — | all | — |
| **CTI Config** | `read` | — | — | — | all | — |
| **CTI Config** | `write` | — | — | — | all | — |
| **Enrichment Source** | `read` | — | — | — | all | — |
| **Enrichment Source** | `write` | — | — | — | all | — |

### 8.3–8.4 ABAC & RLS Policies

All V2 ABAC policies and PostgreSQL RLS policies are preserved unchanged.

Additional V3 ABAC policy:

```yaml
# Policy: Dashboard data scoped by role
- effect: allow
  resource: dashboard.widget.data
  action: read
  condition:
    IF dashboard.type == 'personal':
      - dashboard.ownerId == request.actor.userId
    IF dashboard.type == 'team':
      - actor.teamId == dashboard.teamId OR actor.role IN ['supervisor', 'admin']
    IF dashboard.type == 'department':
      - actor.departmentId == dashboard.departmentId OR actor.role IN ['admin']
```

---

## 9. Data Architecture

### 9.1 Database Schema Overview (V3 — Extended)

```
PostgreSQL
├── identity (schema)         — V2 unchanged
├── agent (schema)            — V2 unchanged
├── interaction (schema)      — V2 + dynamic_fields JSONB column
├── ticket (schema)           — V2 + dynamic_fields JSONB column
├── customer (schema)         — V2 + dynamic_fields JSONB column
├── notification (schema)     — V2 unchanged
├── media (schema)            — V2 unchanged
├── audit (schema)            — V2 unchanged (append-only)
├── object_schema (schema)    — NEW (V3)
│   ├── object_types
│   ├── object_fields
│   ├── object_relationships
│   ├── field_validation_rules
│   └── schema_versions
├── layout (schema)           — NEW (V3)
│   ├── layouts
│   ├── layout_sections
│   └── layout_fields
├── workflow (schema)          — NEW (V3)
│   ├── workflow_definitions
│   ├── workflow_steps
│   ├── workflow_executions
│   └── workflow_step_results
├── enrichment (schema)        — NEW (V3)
│   ├── enrichment_sources
│   ├── field_mappings
│   └── enrichment_requests
├── dashboard (schema)         — NEW (V3)
│   ├── dashboards
│   ├── dashboard_widgets
│   └── dashboard_assignments
└── report (schema)            — NEW (V3)
    ├── reports
    ├── report_permissions
    └── report_schedules

MongoDB                       — V2 unchanged
├── knowledge_db
└── ai_db

Redis                         — V2 + new keys
├── (V2 keys preserved)
├── schema:{objectType}:{tenantId}     # Schema cache
├── layout:{objectType}:{context}      # Layout cache
├── enrichment:request:{id}            # Enrichment request state
├── dashboard:metrics:{dashboardId}    # Widget metric cache
└── cti:call-state:{agentId}          # Active call state

Elasticsearch                 — V2 + new index
├── interactions-index
├── knowledge-index
├── audit-index
└── object-search-index                # NEW: dynamic object full-text search

Temporal                      — NEW (V3)
└── temporal_db                        # Temporal's own PostgreSQL database

Superset                      — NEW (V3)
└── superset_db                        # Superset metadata database
└── reporting_dwh                      # Read replica / Data Warehouse
    ├── mv_interactions_daily          # Materialized view
    ├── mv_sla_compliance              # Materialized view
    ├── mv_agent_performance           # Materialized view
    └── mv_ticket_metrics              # Materialized view
```

---

## 10. User Stories (V3 — CRM Platform)

All V1 user stories (US-1 through US-14) and V2 user stories (US-15 through US-18) are **preserved in full with all acceptance criteria unchanged**.

### US-19 — Dynamic Object Fields & Progressive Loading

**As** a customer service agent,
**I want** to see customer, ticket, and product information that loads progressively — showing available data immediately while fetching missing data from external systems,
**so that** I can start working without waiting for all data to be available.

#### Acceptance Criteria

**AC-19.1 — Local Data Displayed Immediately**
Given a customer lookup occurs (e.g., incoming call by phone number),
When the Customer Service returns local fields,
Then the right panel immediately displays all available local fields (name, CIF, phone, segment) with no loading delay.

**AC-19.2 — Enrichment Fields Show Loading State**
Given enrichment fields are configured for the customer object,
When those fields have `status: "loading"`,
Then skeleton placeholders are displayed in place of the field values with a subtle shimmer animation.

**AC-19.3 — Enrichment Data Updates Seamlessly**
When the Data Enrichment Service delivers enriched data via WebSocket,
Then the skeleton placeholders are replaced with actual values without page reload or layout shift.

**AC-19.4 — Error State for Failed Enrichment**
When an enrichment source fails to respond,
Then the affected field displays an error indicator with a "Thử lại" (retry) button.

**AC-19.5 — Dynamic Fields in Ticket Create Form**
Given the ticket object type has dynamic fields configured,
When the "Tạo Ticket" form is opened,
Then the form fields are rendered based on the object schema, including both core and dynamic fields, with correct validation rules.

**AC-19.6 — Dynamic Fields in Ticket Detail View**
Given a ticket with dynamic field values is viewed,
Then the ticket detail displays all fields according to the active layout configuration, with correct field types and formatting.

---

### US-20 — Object Schema Configuration (Admin)

**As** a system administrator,
**I want** to configure object schemas (fields, types, validation, relationships) through a visual admin interface,
**so that** the CRM can be customized for different business needs without code changes.

#### Acceptance Criteria

**AC-20.1 — Object Type List**
Given the admin navigates to the Schema Designer,
Then all object types are listed with field count, relationship count, and last modified date.

**AC-20.2 — Field Editor**
When the admin clicks "Thêm trường" (Add Field) on an object type,
Then a field editor opens with: name, display name, field type dropdown (22+ types), data source, validation rules, sensitivity flag, default value, group assignment.

**AC-20.3 — Core Field Protection**
When a field has `isCore: true`,
Then the delete button is disabled and a tooltip explains "Trường hệ thống — không thể xóa".

**AC-20.4 — Relationship Editor**
When the admin opens the Relationships tab,
Then a visual diagram (React Flow) shows object types as nodes and relationships as edges. The admin can add/edit/delete relationships.

**AC-20.5 — Schema Versioning**
When a schema change is saved,
Then the version number increments and the previous version is preserved in history. The admin can view and compare versions.

**AC-20.6 — Impact Analysis**
When the admin clicks "Phân tích tác động" before saving,
Then the system shows which layouts, workflows, and reports would be affected by the change.

**AC-20.7 — Schema Propagation**
When a schema change is saved and activated,
Then all connected agent desktops receive the updated schema within 5 seconds (via schema cache invalidation).

---

### US-21 — Layout Configuration (Admin)

**As** a system administrator,
**I want** to design and configure layouts for each object type and context through a visual drag-and-drop designer,
**so that** I can customize how data is displayed for different use cases (detail, create, edit, compact, list).

#### Acceptance Criteria

**AC-21.1 — Layout List**
Given the admin navigates to the Layout Designer,
Then all layouts are listed with object type, context, active status, and role restrictions.

**AC-21.2 — Drag-and-Drop Field Placement**
When the admin drags a field from the field palette onto the canvas,
Then the field is placed in the layout at the drop position within the appropriate section and column.

**AC-21.3 — Section Management**
The admin can add, remove, rename, reorder sections. Each section has collapsible toggle, default collapsed state, and column count settings.

**AC-21.4 — Context Switcher**
The admin can switch between layout contexts (detail_full, create, edit, compact, etc.) to configure each independently.

**AC-21.5 — Conditional Visibility**
The admin can set conditional visibility rules on fields and sections (e.g., "Show 'Lý do VIP' field only when isVIP equals true").

**AC-21.6 — Live Preview**
The admin can toggle "Xem trước" (Preview) mode to see the layout rendered with sample or real data.

**AC-21.7 — Role-Based Layouts**
The admin can assign different layouts to different roles (e.g., agents see a simpler layout, supervisors see a detailed layout).

---

### US-22 — Workflow Automation (Admin)

**As** a system administrator,
**I want** to create, test, and manage automated workflows using a visual drag-and-drop designer,
**so that** business processes are automated without custom development.

#### Acceptance Criteria

**AC-22.1 — Workflow List**
Given the admin navigates to the Workflow Designer,
Then all workflows are listed with name, trigger type, active status, last execution time, and success rate.

**AC-22.2 — Drag-and-Drop Canvas**
When the admin opens a workflow,
Then a React Flow canvas displays workflow steps as nodes and connections as edges. A node palette sidebar lists available step types.

**AC-22.3 — Trigger Configuration**
The admin can configure a trigger: event-based (select event type + conditions), schedule-based (cron), manual, or webhook.

**AC-22.4 — Condition Builder**
For condition/branch nodes, a visual condition builder allows field-operator-value configuration without writing code.

**AC-22.5 — Action Configuration**
For action nodes, the admin configures: notification recipients/templates, email recipients/templates, SMS recipients, object field updates, agent assignment rules, escalation targets, webhook URLs.

**AC-22.6 — JSON/Code Mode**
The admin can toggle to a JSON editor for advanced editing of the workflow definition.

**AC-22.7 — Test Execution**
The admin can test a workflow with sample event data. The test shows step-by-step execution trace without triggering real side effects (sandbox mode).

**AC-22.8 — Execution History**
The admin can view past executions with status (success/failed/running), timing, and step-by-step logs. Failed steps show error details.

**AC-22.9 — Import/Export**
Workflows can be exported as JSON and imported into another tenant or environment.

**AC-22.10 — SLA Workflow Example**
The system ships with a pre-built SLA Breach Escalation workflow template that admins can activate and customize.

---

### US-23 — Multi-PBX CTI Integration

**As** a customer service agent,
**I want** to make and receive calls through the CRM regardless of which PBX system my organization uses,
**so that** I have a unified call experience.

#### Acceptance Criteria

**AC-23.1 — CTI Adapter Initialization**
When the agent logs into the Agent Desktop,
Then the CTI adapter for the configured vendor is loaded and initialized with the agent's extension credentials.

**AC-23.2 — Incoming Call via Adapter**
When a call arrives through the PBX,
Then the CTI adapter emits a `call.ringing` event, and the FloatingCallWidget appears with the caller's information (existing V1 behavior preserved).

**AC-23.3 — Call Controls via Adapter**
When the agent clicks Hold, Mute, Transfer, or End Call in the FloatingCallWidget,
Then the action is executed through the CTI adapter's corresponding method (not local state manipulation).

**AC-23.4 — Agent Status Sync**
When the agent changes voice channel status (ready/not-ready),
Then the status change is propagated to both the Agent Service and the PBX via the CTI adapter.

**AC-23.5 — Vendor Configuration (Admin)**
The admin can configure the active CTI vendor, connection parameters, and extension mappings through the CTI Config screen.

**AC-23.6 — Connection Resilience**
When the CTI connection drops,
Then the adapter attempts automatic reconnection with exponential backoff and the agent sees a "CTI đang kết nối lại..." banner.

---

### US-24 — Dashboard Display

**As** a customer service agent or supervisor,
**I want** to view real-time dashboards with key performance metrics,
**so that** I can monitor my performance and team activity at a glance.

#### Acceptance Criteria

**AC-24.1 — Dashboard View in Agent Desktop**
A "Dashboard" view is accessible from the header navigation in the Agent Desktop, alongside the existing interaction view.

**AC-24.2 — Dashboard Selector**
When multiple dashboards are assigned to the agent's role,
Then a dropdown in the header allows switching between dashboards.

**AC-24.3 — Widget Rendering**
Dashboard widgets render using Recharts (existing dependency) for charts, custom components for metric cards, tables, agent grids, SLA gauges.

**AC-24.4 — Real-Time Updates**
Metric widgets update in real-time via WebSocket subscriptions without manual refresh.

**AC-24.5 — Personal Dashboard**
Agents can customize their personal dashboard by adding/removing/resizing widgets from an allowed widget pool.

**AC-24.6 — Dashboard Designer (Admin)**
Admins can design dashboards using a grid-based drag-and-drop canvas with widget library, data source configuration, and role assignment.

---

### US-25 — Dynamic BI Reporting

**As** a customer service agent or supervisor,
**I want** to view BI reports within the CRM interface,
**so that** I can analyze trends and performance without accessing a separate reporting tool.

#### Acceptance Criteria

**AC-25.1 — Report List**
When the agent navigates to the Reports view,
Then a list of reports assigned to their role is displayed with name, description, and last updated date.

**AC-25.2 — Report Viewer**
When the agent clicks a report,
Then the report is displayed within the CRM via an embedded Superset dashboard/chart (iframe with guest token authentication).

**AC-25.3 — Report Permissions**
Agents only see reports explicitly assigned to their role. Superset enforces RLS via guest token claims.

**AC-25.4 — Report Configuration (Admin)**
Admins can create and configure reports through the CRM Admin module. The CRM calls Superset API to create/update charts and dashboards.

**AC-25.5 — Report Scheduling (Admin)**
Admins can schedule reports for periodic delivery via email to specified recipients.

**AC-25.6 — No Direct Superset Access**
Users cannot access the Superset UI directly. All report interaction happens through the CRM interface.

---

## 11. Correctness Properties (V3)

All V1 properties (CP-1 through CP-10) and V2 properties (CP-11 through CP-17) are **preserved**.

### CP-18 — Schema Version Consistency

**Invariant:** All components rendering an object (frontend, backend services) must use the same schema version. When a schema update is published, all cached versions are invalidated within 5 seconds. Stale renders are detected by comparing the schema version in the response with the cached version.

### CP-19 — Dynamic Field Storage Integrity

**Invariant:** Dynamic field values stored in the `dynamic_fields` JSONB column must conform to the validation rules defined in the active schema version. The backend rejects any write that violates field type constraints, required rules, or custom validation expressions.

### CP-20 — Enrichment Idempotency

**Invariant:** Multiple enrichment requests for the same object within the stale TTL window produce at most one external API call per enrichment source. The Data Enrichment Service deduplicates requests using Redis locks with the key `enrich:{objectType}:{objectId}:{sourceId}`.

### CP-21 — Workflow Trigger Uniqueness

**Invariant:** A single Kafka event triggers at most one execution per active workflow definition. If multiple workflows match the same event, each runs independently. A single workflow never triggers twice for the same event (dedup by event ID + workflow ID).

### CP-22 — Layout-Schema Consistency

**Invariant:** A layout can only reference fields that exist in the current active schema version. When a field is removed from the schema, all layouts referencing that field are automatically updated to mark the field as `isVisible: false` (soft removal, not hard deletion of layout config).

### CP-23 — CTI Adapter State Machine

**Invariant:** The CTI adapter maintains a call state machine consistent with the existing V1 CP-1 (Call State Machine Valid Transitions). The adapter maps vendor-specific call states to the unified CTIEventType enum. Invalid transitions are logged and rejected.

### CP-24 — Report Permission Isolation

**Invariant:** A Superset guest token is scoped to exactly one tenant and one user's permissions. The token includes RLS claims that restrict data visibility. A guest token cannot access data outside its granted scope even if the underlying Superset dashboard contains broader data.

---

## 12. Non-Functional Requirements (V3)

All V1 NFRs (NFR-1 through NFR-5) and V2 NFRs (NFR-6 through NFR-10) are **preserved**.

### NFR-11 — Schema Propagation Latency

Schema changes must propagate to all connected agents within **5 seconds**. Implementation: Kafka event → Redis cache invalidation → frontend schema refetch on next render.

### NFR-12 — Data Enrichment Latency

The Data Enrichment Service must process a webhook response and deliver enriched fields to the frontend via WebSocket within **2 seconds** of receiving the external API response.

### NFR-13 — Workflow Step Execution Latency

Individual workflow steps (excluding external API calls and wait steps) must execute within **500ms**. End-to-end workflow execution time depends on step count and external dependencies.

### NFR-14 — Dashboard Widget Refresh

Dashboard widget data must be served within **1 second** for cached metrics. Real-time WebSocket metric pushes must have latency < 100ms.

### NFR-15 — Report Rendering

Superset embedded reports must render within **5 seconds** for standard reports (< 100K rows). Complex reports may take up to 15 seconds.

### NFR-16 — CTI Adapter Latency

CTI adapter call control operations (answer, hold, mute, transfer) must complete within **200ms** from user click to PBX acknowledgement.

---

## 13. Constraints & Assumptions (V3)

### Constraints (V3 additions)

| # | Constraint | Source |
|---|---|---|
| C-V2-1 through C-V2-9 | (All V2 constraints preserved) | V2 |
| C-V3-1 | Temporal must be self-hosted within Vietnam jurisdiction (no cloud Temporal). | Data residency |
| C-V3-2 | Apache Superset instance accessible only via internal network. No external browser access. | Security policy |
| C-V3-3 | CTI adapter JS SDKs must be loaded at runtime based on vendor config (not bundled for all vendors). | Bundle size |
| C-V3-4 | Dynamic field JSONB columns have a 10MB size limit per row. | PostgreSQL practical limit |
| C-V3-5 | Workflow definitions are limited to 100 steps per workflow. | Temporal recommendation |
| C-V3-6 | Dashboard widgets limited to 20 per dashboard. | UI performance |
| C-V3-7 | React Flow (workflow designer) and react-grid-layout (dashboard designer) are admin-module-only dependencies. Not loaded in agent desktop bundle. | Bundle optimization |

### Assumptions (V3 additions)

| # | Assumption |
|---|---|
| A-V2-1 through A-V2-9 | (All V2 assumptions preserved) |
| A-V3-1 | Temporal Server is available as a Docker deployment managed by the infrastructure team. |
| A-V3-2 | Apache Superset is available as a Docker deployment with REST API enabled and embedded mode configured. |
| A-V3-3 | CTI vendors (Genesys, Avaya, Asterisk) provide JavaScript SDKs that can be loaded in a browser environment. |
| A-V3-4 | External enrichment sources provide REST APIs with response times under 5 seconds. |
| A-V3-5 | The data warehouse / read replica for Superset is maintained by the DBA team with materialized views refreshed at least every 15 minutes. |
| A-V3-6 | The existing Agent Desktop UI/UX (V1) is fully preserved. All V3 enhancements are additive — no existing screens, tabs, or components are removed. |
| A-V3-7 | Admin users have separate login credentials and access the Admin module via a different URL path (`/admin`). |

---

## 14. Appendices

### Appendix A: V1 User Stories (Preserved)

All user stories US-1 through US-14 from RequirementsV1.md are preserved in full with all acceptance criteria unchanged. See RequirementsV1.md for complete details.

### Appendix B: API Endpoint Summary (V3)

**Total REST API endpoints: ~142**

| Service | Endpoints | Base Path |
|---|---|---|
| MS-1 Identity Service | 10 | `/api/v1/auth/*`, `/api/v1/users/*`, `/api/v1/roles` |
| MS-2 Agent Service | 11 | `/api/v1/agents/*` |
| MS-3 Interaction Service | 16 + 2 = 18 | `/api/v1/interactions/*` |
| MS-4 Ticket Service | 9 + 2 = 11 | `/api/v1/tickets/*` |
| MS-5 Customer Service | 7 + 2 = 9 | `/api/v1/customers/*` |
| MS-6 Notification Service | 8 | `/api/v1/notifications/*` |
| MS-7 Knowledge Service | 9 + 2 = 11 | `/api/v1/knowledge/*` |
| MS-8 BFSI Core Banking | 8 + 2 = 10 | `/api/v1/bfsi/*` |
| MS-9 AI Service | 3 | `/api/v1/ai/*` |
| MS-10 Media Service | 5 | `/api/v1/media/*` |
| MS-11 Audit Service | 4 | `/api/v1/audit/*` |
| MS-13 Object Schema Service | 16 | `/api/v1/schemas/*`, `/api/v1/admin/object-types/*` |
| MS-14 Layout Service | 9 | `/api/v1/layouts/*`, `/api/v1/admin/layouts/*` |
| MS-15 Workflow Service | 14 | `/api/v1/admin/workflows/*` |
| MS-16 Data Enrichment Service | 6 | `/internal/enrichment/*`, `/api/v1/admin/enrichment/*` |
| MS-17 Dashboard Service | 10 | `/api/v1/dashboards/*`, `/api/v1/admin/dashboards/*` |
| MS-18 Report Service | 11 | `/api/v1/reports/*`, `/api/v1/admin/reports/*` |
| MS-19 CTI Adapter Service | 5 | `/api/v1/cti/*`, `/api/v1/admin/cti/*` |

**Total WebSocket channels: ~10**

| Channel | Service |
|---|---|
| `/ws/agent/{agentId}/status` | Agent Service |
| `/ws/agent/{agentId}/presence` | Agent Service |
| `/ws/interactions/{agentId}/queue` | Interaction Service |
| `/ws/interactions/{interactionId}/chat` | Interaction Service |
| `/ws/interactions/{interactionId}/sla` | Interaction Service |
| `/ws/notifications/{agentId}` | Notification Service |
| `/ws/cti/{agentId}/call` | CTI Adapter Service |
| `/ws/objects/{objectType}/{objectId}/fields` | Object Services (NEW) |
| `/ws/dashboards/{dashboardId}/metrics` | Dashboard Service (NEW) |
| `/ws/schemas/updates` | Object Schema Service (NEW) |

### Appendix C: Frontend Module Structure (V3)

```
src/
├── main.tsx
├── App.tsx                           # Root: React Router → module routing
├── index.css / styles/globals.css    # Preserved
│
├── modules/
│   ├── agent-desktop/                # EXISTING (V1 codebase — preserved)
│   │   ├── AgentDesktopShell.tsx
│   │   ├── components/               # All 34 existing feature components
│   │   │   ├── InteractionDetail.tsx  # 132KB — preserved
│   │   │   ├── CustomerInfoScrollFixed.tsx  # 76KB — enhanced with LayoutEngine
│   │   │   ├── InteractionList.tsx    # 31KB — preserved
│   │   │   ├── CreateTicketDialog.tsx # 31KB — enhanced with dynamic form
│   │   │   ├── TicketDetail.tsx       # 26KB — enhanced with dynamic layout
│   │   │   ├── ... (all others preserved)
│   │   │   └── contexts/
│   │   │       ├── CallContext.tsx    # Preserved
│   │   │       ├── NotificationContext.tsx  # Preserved
│   │   │       └── EnhancedAgentStatusContext.tsx  # Preserved
│   │   └── hooks/
│   │       └── useInteractionStats.tsx  # Preserved
│   │
│   ├── admin/                        # NEW
│   │   ├── AdminShell.tsx
│   │   ├── object-schema/
│   │   ├── layout-designer/
│   │   ├── workflow-designer/        # React Flow canvas
│   │   ├── dashboard-config/
│   │   ├── report-config/
│   │   ├── cti-config/
│   │   └── user-management/
│   │
│   └── shared/                       # NEW
│       ├── dynamic-object/           # LayoutEngine, SchemaFieldRenderer, DynamicForm
│       ├── cti/                      # CTIProvider, adapters (Genesys, Avaya, Asterisk)
│       ├── dashboard/                # DashboardView, DashboardGrid, widgets
│       └── report/                   # ReportViewer (Superset embed)
│
├── components/ui/                    # PRESERVED — 48 shadcn/ui primitives
└── lib/                              # api-client, websocket-client, utils
```

### Appendix D: Core Field Definitions per Object Type

#### Customer Object — Core Fields

| Field Name | Type | Required | Sensitive | Data Source | Group |
|---|---|---|---|---|---|
| id | UUID | Yes | No | local | System |
| cif | TEXT | Yes | Yes | local | Business |
| fullName | TEXT | Yes | No | local | Contact |
| email | EMAIL | No | Yes | local | Contact |
| phone | PHONE | No | Yes | local | Contact |
| segment | ENUM | Yes | No | local | Business |
| isVIP | BOOLEAN | Yes | No | local | Business |
| avatar | IMAGE | No | No | local | Profile |
| satisfactionRating | RATING | No | No | local | Profile |
| relationshipLength | TEXT | No | No | computed | Business |

#### Ticket Object — Core Fields

| Field Name | Type | Required | Sensitive | Data Source | Group |
|---|---|---|---|---|---|
| id | UUID | Yes | No | local | System |
| displayId | TEXT | Yes | No | local | System |
| title | TEXT | Yes | No | local | Details |
| description | LONG_TEXT | Yes | No | local | Details |
| status | ENUM | Yes | No | local | Workflow |
| priority | ENUM | Yes | No | local | Workflow |
| category | ENUM | No | No | local | Classification |
| department | ENUM | No | No | local | Assignment |
| assignedAgentId | USER | No | No | local | Assignment |
| customerId | REFERENCE | Yes | No | reference | Related |
| interactionId | REFERENCE | No | No | reference | Related |
| dueAt | DATETIME | No | No | local | SLA |

### Appendix E: Workflow Step Type Catalog

| Step Type | Category | Config Fields | Description |
|---|---|---|---|
| CONDITION | Control | field, operator, value | If/else branch |
| SWITCH | Control | field, cases[] | Multi-branch |
| SEND_NOTIFICATION | Action | recipientType, template, priority | In-app notification |
| SEND_EMAIL | Action | to, cc, template, attachments | Email via gateway |
| SEND_SMS | Action | to, template | SMS via gateway |
| UPDATE_OBJECT | Action | objectType, objectId, fields | Update object fields |
| ASSIGN_AGENT | Action | criteria (skill, load, round-robin) | Auto-assign agent |
| ESCALATE_TICKET | Action | targetLevel, reason | Escalate priority/assignment |
| CREATE_TICKET | Action | template, fields | Create new ticket |
| CALL_WEBHOOK | Action | url, method, headers, body | External HTTP call |
| CALL_API | Action | service, endpoint, params | Internal API call |
| WAIT | Flow | duration (seconds/minutes/hours) | Pause workflow |
| WAIT_FOR_EVENT | Flow | eventType, conditions, timeout | Wait for domain event |
| PARALLEL | Flow | branches[] | Execute branches simultaneously |
| LOOP | Flow | collection, itemVar | Iterate over list |
| AI_CLASSIFY | AI | model, categories, inputField | AI classification |
| AI_GENERATE | AI | model, prompt, outputField | AI text generation |

### Appendix F: Dashboard Widget Type Catalog

| Widget Type | Data | Visual | Config |
|---|---|---|---|
| METRIC_CARD | Single KPI number | Large number + trend arrow + sparkline | dataSource, format, thresholds |
| LINE_CHART | Time series | Recharts LineChart | dataSource, groupBy, timeRange |
| BAR_CHART | Categorical | Recharts BarChart | dataSource, groupBy, orientation |
| PIE_CHART | Proportional | Recharts PieChart | dataSource, groupBy |
| DONUT_CHART | Proportional | Recharts PieChart (inner radius) | dataSource, groupBy, centerLabel |
| TABLE | Tabular data | Sortable/filterable table | dataSource, columns, pageSize |
| QUEUE_LIST | Live queue | Real-time interaction list | channels, maxItems |
| AGENT_STATUS_GRID | Agent states | Grid of agent status cards | department, showDetails |
| SLA_GAUGE | SLA percentage | Circular gauge (green/yellow/red) | dataSource, threshold |
| HEATMAP | 2D distribution | Color-coded grid | dataSource, xAxis, yAxis |
| LEADERBOARD | Agent ranking | Sorted list with scores | metric, period, topN |
| TICKER | Scrolling alerts | Horizontal ticker bar | dataSource, speed |

---

### V1 → V3 Migration Path Summary

| V1 US | V1 Source | V3 Source | Key Change |
|---|---|---|---|
| US-1–14 | Mock data in App.tsx | REST APIs + WebSocket | Replace mock → API (React Query) |
| NEW US-19 | — | Object Schema + Enrichment Services | Progressive loading, dynamic fields |
| NEW US-20 | — | Admin: Schema Designer | React Flow relationship editor |
| NEW US-21 | — | Admin: Layout Designer | Drag-and-drop field placement |
| NEW US-22 | — | Admin: Workflow Designer + Temporal | React Flow workflow canvas |
| NEW US-23 | — | CTI Adapter Layer | Pluggable SDK (Genesys/Avaya/Asterisk) |
| NEW US-24 | — | Dashboard Service | Recharts widgets, real-time |
| NEW US-25 | — | Report Service + Superset | Embedded BI, guest tokens |

---

*End of FullStack-RequirementsV3.md — TPB CRM Platform Specification*
*Generated: 2026-03-06 | Baseline: V1 (2026-03-04) + V2 (2026-03-06)*
*Compliance: BFSI Security Standards | OWASP Top 10 | PCI-DSS (SAQ-A)*
*Architecture: 18 Microservices | ~142 API Endpoints | 10 WebSocket Channels*
*Platform: Agent Desktop + Admin Module + Temporal + Apache Superset*
*Frontend: 97 existing files preserved | 50+ new admin module files*
