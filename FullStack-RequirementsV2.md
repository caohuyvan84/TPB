# FullStack-RequirementsV2.md — Agent Desktop TPB

## Kiro Specification: Enterprise Full-Stack Multi-Channel Customer Service Platform

**Version:** 2.0
**Date:** 2026-03-06
**Baseline:** RequirementsV1.md (2026-03-04)
**Scope:** Full-stack system specification — Frontend (React 18 SPA) + Backend (Microservices Architecture)
**Compliance:** BFSI Security Standards, OWASP Top 10, PCI-DSS (where applicable)
**Traceability:** Every backend service maps to V1 user stories (US-1 through US-14)

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Architecture Summary](#2-architecture-summary)
3. [Microservices Decomposition (DDD)](#3-microservices-decomposition-ddd)
4. [API Gateway & Cross-Cutting Concerns](#4-api-gateway--cross-cutting-concerns)
5. [Service Specifications](#5-service-specifications)
6. [Frontend-to-Backend API Mapping](#6-frontend-to-backend-api-mapping)
7. [BFSI Security Standards](#7-bfsi-security-standards)
8. [Authorization & Access Control](#8-authorization--access-control)
9. [Data Architecture](#9-data-architecture)
10. [User Stories (V2 — Full-Stack)](#10-user-stories-v2--full-stack)
11. [Correctness Properties (V2)](#11-correctness-properties-v2)
12. [Non-Functional Requirements (V2)](#12-non-functional-requirements-v2)
13. [Constraints & Assumptions (V2)](#13-constraints--assumptions-v2)

---

## 1. System Overview

### Feature Name

**Agent Desktop TPB — Enterprise Multi-Channel Customer Service Platform**

A full-stack platform comprising a React 18 + TypeScript SPA frontend and a microservices-based backend, providing TPB bank customer service agents with a unified desktop for managing voice calls, emails, chat sessions, tickets, knowledge base, financial product queries, and customer information. Built to BFSI security standards with enterprise-grade authorization, audit logging, and data protection.

### Channels

| Channel | Protocol | Backend Integration |
|---|---|---|
| Voice (CTI) | WebSocket + SIP/WebRTC | CTI Gateway → Interaction Service |
| Email | REST + IMAP/SMTP | Email Gateway → Interaction Service |
| Chat | WebSocket (STOMP) | Chat Gateway → Interaction Service |

### Locale

Vietnamese (vi-VN) primary; English labels on technical/API fields. All user-facing text served via i18n resource bundles.

---

## 2. Architecture Summary

### High-Level Architecture Diagram (Logical)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENTS                                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                      │
│  │ Agent Desktop │  │ Supervisor   │  │ Admin        │                      │
│  │ (React SPA)  │  │ Dashboard    │  │ Console      │                      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘                      │
└─────────┼─────────────────┼─────────────────┼──────────────────────────────┘
          │                 │                 │
          ▼                 ▼                 ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         API GATEWAY (Kong/Envoy)                            │
│  ┌─────────┐ ┌──────────┐ ┌───────────┐ ┌──────────┐ ┌──────────────────┐ │
│  │ mTLS    │ │ Rate     │ │ JWT       │ │ Request  │ │ Audit Log        │ │
│  │ Termina.│ │ Limiting │ │ Validation│ │ Routing  │ │ Correlation      │ │
│  └─────────┘ └──────────┘ └───────────┘ └──────────┘ └──────────────────┘ │
└─────────────────────────────┬───────────────────────────────────────────────┘
                              │
          ┌───────────────────┼───────────────────────────┐
          │        SERVICE MESH (Istio/Linkerd)           │
          │        mTLS between all microservices         │
          │                                               │
          │  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
          │  │ Identity │  │ Interact.│  │ Ticket   │   │
          │  │ Service  │  │ Service  │  │ Service  │   │
          │  └──────────┘  └──────────┘  └──────────┘   │
          │                                               │
          │  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
          │  │ Customer │  │ Agent    │  │ Notific. │   │
          │  │ Service  │  │ Service  │  │ Service  │   │
          │  └──────────┘  └──────────┘  └──────────┘   │
          │                                               │
          │  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
          │  │ Knowledge│  │ BFSI     │  │ AI       │   │
          │  │ Service  │  │ Core     │  │ Service  │   │
          │  └──────────┘  │ Service  │  └──────────┘   │
          │                └──────────┘                   │
          │                                               │
          │  ┌──────────┐  ┌──────────┐                  │
          │  │ Audit    │  │ Media    │                  │
          │  │ Service  │  │ Service  │                  │
          │  └──────────┘  └──────────┘                  │
          └───────────────────────────────────────────────┘
                              │
          ┌───────────────────┼───────────────────────────┐
          │              EVENT BUS (Kafka)                 │
          │  Topics: interactions, tickets, notifications, │
          │  agent-status, audit-events, sla-events        │
          └───────────────────────────────────────────────┘
                              │
          ┌───────────────────┼───────────────────────────┐
          │           DATA STORES                         │
          │  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
          │  │PostgreSQL│  │ Redis    │  │ Elastic  │   │
          │  │ (Primary)│  │ (Cache/  │  │ Search   │   │
          │  │          │  │  Session)│  │          │   │
          │  └──────────┘  └──────────┘  └──────────┘   │
          │  ┌──────────┐  ┌──────────┐                  │
          │  │ MinIO/S3 │  │ MongoDB  │                  │
          │  │ (Files)  │  │ (KB/Logs)│                  │
          │  └──────────┘  └──────────┘                  │
          └───────────────────────────────────────────────┘
```

### Frontend Architecture (Preserved from V1)

**Provider tree:** `AuthProvider > NotificationProvider > EnhancedAgentStatusProvider > CallProvider > AppContent`
**Layout:** 3-panel (Left 320px collapsible, Center flex, Right 400px collapsible) + fixed header + 2 floating overlays
**State management:** React Context API + React Query (TanStack Query) for server state
**Path alias:** `@` maps to `./src`

### Communication Patterns

| Pattern | Use Case | Protocol |
|---|---|---|
| Request-Response | CRUD operations, queries | REST (HTTPS) / GraphQL |
| Real-time Push | Call state, chat messages, SLA updates, notifications | WebSocket (STOMP over WSS) |
| Event-Driven Async | Audit logging, analytics, SLA breach alerts, email processing | Apache Kafka |
| File Transfer | Call recordings, email attachments, ticket attachments | Pre-signed URLs (S3/MinIO) |

---

## 3. Microservices Decomposition (DDD)

### Bounded Contexts & Services

Each microservice owns its domain data and exposes APIs. Inter-service communication uses async events (Kafka) for state changes and synchronous REST/gRPC for queries.

| # | Service Name | Bounded Context | Domain Responsibility | V1 User Stories Served |
|---|---|---|---|---|
| MS-1 | **Identity Service** | Identity & Access | Authentication, authorization, session management, RBAC/ABAC policy enforcement | All (cross-cutting) |
| MS-2 | **Agent Service** | Agent Management | Agent profiles, status management (per-channel ready/not-ready), shift scheduling, skills, presence | US-11, US-14 |
| MS-3 | **Interaction Service** | Interaction Management | Interaction lifecycle (create, assign, route, resolve, close), interaction queue, filters, search, SLA tracking | US-1, US-2, US-3, US-4 |
| MS-4 | **Ticket Service** | Case Management | Ticket CRUD, workflow states, comments, assignments, SLA tracking, escalation rules | US-7 |
| MS-5 | **Customer Service** | Customer Management | Customer profiles (CIF), contact info, VIP status, interaction history aggregation, notes | US-13 |
| MS-6 | **Notification Service** | Notification & Alerting | Multi-channel notifications (in-app, push, SMS), notification state machine, preferences, not-ready warnings | US-12 |
| MS-7 | **Knowledge Service** | Knowledge Management | Article CRUD, folder hierarchy, search (Elasticsearch), bookmarks, ratings, comments | US-6 |
| MS-8 | **BFSI Core Banking Service** | Financial Products | Account queries, savings, loans, cards, transactions, digital banking, payments, merchant data — proxies to core banking | US-8 |
| MS-9 | **AI Service** | AI & Automation | AI-generated suggestions, response generation, summarization, sentiment analysis, suggestion chips | US-5 |
| MS-10 | **Media Service** | Media & Files | Call recording storage/streaming, email attachments, ticket file attachments, file virus scanning | US-2, US-3, US-7 |
| MS-11 | **Audit Service** | Compliance & Audit | Immutable audit log ingestion, query, retention policies, regulatory reporting | All (cross-cutting) |
| MS-12 | **CTI Gateway** | Telephony Integration | SIP/WebRTC bridge, call control (answer, hold, mute, transfer, conference), DTMF, recording triggers | US-2, US-9, US-10 |

### Domain Event Flows

```
Agent goes Not-Ready
  → Agent Service emits: agent.status.changed {agentId, channel, status, reason, timestamp}
  → Interaction Service consumes: stops routing to this agent on this channel
  → Notification Service consumes: if ≥3 not-ready missed calls in 15min → warning banner event
  → Audit Service consumes: logs status change

Incoming Call
  → CTI Gateway emits: call.incoming {callId, callerNumber, queueId, timestamp}
  → Interaction Service consumes: creates interaction, assigns agent
  → Agent Service consumes: verifies agent readiness
  → Notification Service consumes: pushes ringing notification
  → Audit Service consumes: logs call arrival

Ticket Created
  → Ticket Service emits: ticket.created {ticketId, interactionId, customerId, priority, assignee}
  → Notification Service consumes: sends ticket-assignment notification
  → Customer Service consumes: updates customer interaction history
  → Audit Service consumes: logs ticket creation

SLA Breach
  → Interaction Service emits: sla.breached {interactionId, chatSessionId, thresholdMinutes, actualSeconds}
  → Notification Service consumes: sends urgent notification to agent + supervisor
  → Audit Service consumes: logs SLA breach for reporting
```

---

## 4. API Gateway & Cross-Cutting Concerns

### 4.1 API Gateway Configuration

| Concern | Implementation | Details |
|---|---|---|
| TLS Termination | Gateway-level | TLS 1.3 minimum; certificates from internal CA |
| Authentication | JWT validation | RS256-signed tokens; token introspection for revoked tokens |
| Rate Limiting | Per-user, per-endpoint | Default: 100 req/min per agent; burst: 200; sensitive endpoints: 10 req/min |
| Request Routing | Path-based | `/api/v1/interactions/*` → Interaction Service, etc. |
| CORS | Whitelist | Only `https://agent.tpb.vn` and configured origins |
| Request ID | Auto-generated | `X-Request-Id` header propagated across all services for tracing |
| Request/Response Logging | Redacted | Body logged with PII fields masked (SSN, account numbers, balances) |

### 4.2 Service Mesh (mTLS)

All inter-service communication is encrypted with mutual TLS via the service mesh. Services authenticate each other using X.509 certificates issued by the internal PKI. No service accepts plaintext HTTP.

### 4.3 Observability Stack

| Layer | Tool | Purpose |
|---|---|---|
| Distributed Tracing | Jaeger / OpenTelemetry | End-to-end request tracing across microservices |
| Metrics | Prometheus + Grafana | Service health, latency percentiles, error rates, SLA metrics |
| Logging | ELK Stack (Elasticsearch, Logstash, Kibana) | Structured JSON logs with correlation IDs |
| Alerting | PagerDuty / Grafana Alertmanager | SLA breach alerts, service down alerts, security incident alerts |

---

## 5. Service Specifications

### MS-1: Identity Service

**Domain:** Identity & Access Management
**Database:** PostgreSQL (schema: `identity`)
**Cache:** Redis (sessions, token blacklist)

#### Entities

```typescript
interface User {
  id: UUID;
  username: string;                    // e.g., "agent.tung"
  passwordHash: string;               // bcrypt, cost=12
  email: string;
  fullName: string;
  agentId: string;                     // e.g., "AGT001"
  roles: Role[];                       // ["agent", "supervisor"]
  permissions: Permission[];           // derived from roles + direct grants
  tenantId: UUID;                      // multi-tenant isolation
  status: 'active' | 'suspended' | 'locked';
  mfaEnabled: boolean;
  mfaSecret?: string;                 // encrypted at rest
  lastLoginAt: DateTime;
  failedLoginAttempts: number;
  lockedUntil?: DateTime;
  createdAt: DateTime;
  updatedAt: DateTime;
}

interface Role {
  id: UUID;
  name: string;                        // "agent", "supervisor", "admin", "auditor"
  description: string;
  permissions: Permission[];
  tenantId: UUID;
}

interface Permission {
  resource: string;                    // "interaction", "ticket", "customer", "report"
  action: string;                      // "read", "write", "delete", "transfer", "escalate"
  scope: 'own' | 'team' | 'department' | 'all';
  conditions?: Record<string, any>;    // ABAC conditions (e.g., {channel: "voice"})
}

interface Session {
  id: UUID;
  userId: UUID;
  tokenFingerprint: string;           // SHA-256 of refresh token
  ipAddress: string;
  userAgent: string;
  createdAt: DateTime;
  expiresAt: DateTime;
  isRevoked: boolean;
}
```

#### API Endpoints

| Method | Path | Description | Auth | Rate Limit |
|---|---|---|---|---|
| POST | `/api/v1/auth/login` | Authenticate agent, return JWT + refresh token | Public | 5/min/IP |
| POST | `/api/v1/auth/refresh` | Refresh access token | Refresh Token | 10/min/user |
| POST | `/api/v1/auth/logout` | Revoke session, blacklist token | Bearer JWT | 10/min/user |
| POST | `/api/v1/auth/mfa/verify` | Verify MFA code (TOTP) | Partial JWT | 5/min/user |
| GET | `/api/v1/auth/sessions` | List active sessions for current user | Bearer JWT | 30/min |
| DELETE | `/api/v1/auth/sessions/{sessionId}` | Revoke a specific session | Bearer JWT | 10/min |
| GET | `/api/v1/users/me` | Get current user profile | Bearer JWT | 60/min |
| GET | `/api/v1/users/{userId}` | Get user by ID | Bearer JWT + `user:read` | 60/min |
| GET | `/api/v1/roles` | List all roles | Bearer JWT + `role:read` | 30/min |
| POST | `/api/v1/auth/policy/evaluate` | Evaluate ABAC policy for a request | Internal (mTLS) | Unlimited |

#### Request/Response Schemas

**POST `/api/v1/auth/login`**

```json
// Request
{
  "username": "agent.tung",
  "password": "********",
  "clientFingerprint": "sha256:abc123..."
}

// Response 200
{
  "accessToken": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "dGhpcyBpcyBhIHJlZnJlc2ggdG9rZW4...",
  "expiresIn": 900,
  "tokenType": "Bearer",
  "user": {
    "id": "uuid-001",
    "agentId": "AGT001",
    "fullName": "Agent Tung",
    "roles": ["agent"],
    "permissions": ["interaction:read:own", "ticket:write:own", "customer:read:team"]
  },
  "requiresMfa": false
}

// Response 401
{
  "error": "INVALID_CREDENTIALS",
  "message": "Invalid username or password",
  "remainingAttempts": 4
}

// Response 423
{
  "error": "ACCOUNT_LOCKED",
  "message": "Account locked due to excessive failed attempts",
  "lockedUntil": "2026-03-06T10:30:00Z"
}
```

**JWT Claims Structure**

```json
{
  "sub": "uuid-001",
  "agentId": "AGT001",
  "tenantId": "tenant-tpb",
  "roles": ["agent"],
  "permissions": ["interaction:read:own", "ticket:write:own"],
  "channelPermissions": {
    "voice": ["handle", "transfer", "conference"],
    "email": ["handle", "reply", "forward"],
    "chat": ["handle", "close"]
  },
  "departmentId": "dept-cs-01",
  "teamId": "team-alpha",
  "iss": "identity.tpb.internal",
  "aud": "agent-desktop",
  "iat": 1741248000,
  "exp": 1741248900,
  "jti": "unique-token-id"
}
```

---

### MS-2: Agent Service

**Domain:** Agent Management
**Database:** PostgreSQL (schema: `agent`)
**Cache:** Redis (agent presence, real-time status)
**Events Published:** `agent.status.changed`, `agent.session.started`, `agent.session.ended`
**V1 Mapping:** US-11 (Agent Status Management), US-14 (Agent Header & Session Stats)

#### Entities

```typescript
interface AgentProfile {
  id: UUID;
  userId: UUID;                        // FK to Identity Service
  agentId: string;                     // "AGT001"
  displayName: string;                 // "Agent Tung"
  department: Department;
  team: Team;
  skills: Skill[];                     // [{name: "Technical", level: "expert"}, ...]
  maxConcurrentChats: number;          // default: 3
  maxConcurrentEmails: number;         // default: 5
  tenantId: UUID;
  createdAt: DateTime;
  updatedAt: DateTime;
}

interface AgentChannelStatus {
  agentId: UUID;
  channel: 'voice' | 'email' | 'chat';
  status: 'ready' | 'not-ready' | 'disconnected';
  reason?: NotReadyReason;
  customReason?: string;               // only if reason === 'other'
  duration: number;                    // seconds in current state
  isTimerActive: boolean;
  changedAt: DateTime;
}

type NotReadyReason = 'break' | 'lunch' | 'training' | 'meeting'
  | 'technical-issue' | 'system-maintenance' | 'toilet' | 'other';

interface AgentSession {
  id: UUID;
  agentId: UUID;
  loginAt: DateTime;
  logoutAt?: DateTime;
  connectionStatus: 'connected' | 'disconnected' | 'reconnecting';
  lastHeartbeatAt: DateTime;
  ipAddress: string;
  statusHistory: AgentStatusChange[];
}

interface AgentStatusChange {
  channel: 'voice' | 'email' | 'chat';
  fromStatus: string;
  toStatus: string;
  reason?: string;
  timestamp: DateTime;
}
```

#### API Endpoints

| Method | Path | Description | Auth | Rate Limit |
|---|---|---|---|---|
| GET | `/api/v1/agents/me` | Get current agent profile + status | Bearer JWT | 60/min |
| GET | `/api/v1/agents/me/status` | Get per-channel status | Bearer JWT | 120/min |
| PUT | `/api/v1/agents/me/status/{channel}` | Set status for a channel | Bearer JWT | 30/min |
| PUT | `/api/v1/agents/me/status/all` | Set all channels (ready/not-ready) | Bearer JWT | 30/min |
| GET | `/api/v1/agents/me/session` | Get current session stats | Bearer JWT | 60/min |
| POST | `/api/v1/agents/me/heartbeat` | Heartbeat (connection keep-alive) | Bearer JWT | 2/min |
| GET | `/api/v1/agents` | List agents (for transfer dialog) | Bearer JWT + `agent:read` | 30/min |
| GET | `/api/v1/agents/{agentId}` | Get agent by ID | Bearer JWT + `agent:read` | 60/min |
| GET | `/api/v1/agents/{agentId}/availability` | Check agent availability | Bearer JWT + `agent:read` | 60/min |
| GET | `/api/v1/agents/me/settings` | Get agent settings/preferences | Bearer JWT | 30/min |
| PUT | `/api/v1/agents/me/settings` | Update agent settings | Bearer JWT | 10/min |

#### WebSocket Channels

| Channel | Direction | Purpose |
|---|---|---|
| `/ws/agent/{agentId}/status` | Bidirectional | Real-time status sync (heartbeat, status push from supervisor) |
| `/ws/agent/{agentId}/presence` | Server→Client | Presence updates for transfer dialog (other agents' availability) |

#### Request/Response Schemas

**PUT `/api/v1/agents/me/status/{channel}`**

```json
// Request
{
  "status": "not-ready",
  "reason": "lunch",
  "customReason": null
}

// Response 200
{
  "agentId": "AGT001",
  "channel": "voice",
  "status": "not-ready",
  "reason": "lunch",
  "duration": 0,
  "isTimerActive": true,
  "changedAt": "2026-03-06T09:30:00Z",
  "readyChannelCount": 2,
  "totalChannelCount": 3
}
```

**PUT `/api/v1/agents/me/status/all`**

```json
// Request (Ready All)
{
  "status": "ready"
}

// Request (Not Ready All)
{
  "status": "not-ready",
  "reason": "break"
}

// Response 200
{
  "channels": [
    {"channel": "voice", "status": "not-ready", "reason": "break", "duration": 0},
    {"channel": "email", "status": "not-ready", "reason": "break", "duration": 0},
    {"channel": "chat", "status": "not-ready", "reason": "break", "duration": 0}
  ],
  "readyChannelCount": 0,
  "totalChannelCount": 3
}
```

**GET `/api/v1/agents` (Transfer Dialog)**

```json
// Response 200
{
  "agents": [
    {
      "id": "uuid-agent-mai",
      "agentId": "AGT002",
      "displayName": "Agent Mai",
      "department": "Technical Support",
      "status": "available",
      "skills": [{"name": "Technical", "level": "expert"}, {"name": "Hardware", "level": "intermediate"}],
      "currentLoad": {"voice": 0, "email": 2, "chat": 1}
    },
    {
      "id": "uuid-agent-linh",
      "agentId": "AGT003",
      "displayName": "Agent Linh",
      "department": "Customer Service",
      "status": "busy",
      "skills": [{"name": "Billing", "level": "expert"}, {"name": "Account", "level": "expert"}],
      "currentLoad": {"voice": 1, "email": 3, "chat": 2}
    }
  ],
  "total": 4,
  "page": 1,
  "pageSize": 20
}
```

---

### MS-3: Interaction Service

**Domain:** Interaction Management
**Database:** PostgreSQL (schema: `interaction`)
**Cache:** Redis (active interaction states, SLA countdowns)
**Search:** Elasticsearch (interaction search index)
**Events Published:** `interaction.created`, `interaction.assigned`, `interaction.status.changed`, `interaction.transferred`, `sla.warning`, `sla.breached`
**V1 Mapping:** US-1 (Queue & Filters), US-2 (Voice Call Detail), US-3 (Email Thread), US-4 (Chat & SLA)

#### Entities

```typescript
interface Interaction {
  id: UUID;
  displayId: string;                   // "INT-001"
  tenantId: UUID;
  type: 'call' | 'missed-call' | 'email' | 'chat';
  channel: 'voice' | 'email' | 'chat';
  status: InteractionStatus;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  customerId: UUID;
  customerName: string;                // denormalized for search
  assignedAgentId?: UUID;
  assignedAgentName?: string;
  subject?: string;
  tags: string[];
  isVIP: boolean;                      // derived from customer VIP status
  direction: 'inbound' | 'outbound';
  source?: string;                     // "Zalo Official Account", "Website Livechat", etc.
  metadata: InteractionMetadata;       // channel-specific data
  createdAt: DateTime;
  updatedAt: DateTime;
  closedAt?: DateTime;
}

type InteractionStatus = 'new' | 'in-progress' | 'resolved' | 'completed'
  | 'closed' | 'missed' | 'escalated';

interface CallMetadata {
  recording?: {
    fileId: UUID;                      // reference to Media Service
    url: string;                       // pre-signed URL
    duration: number;                  // seconds
    quality: 'low' | 'medium' | 'high';
    fileSize: string;
  };
  timeline: CallTimelineEvent[];
  missedReason?: 'timeout' | 'not-ready' | 'disconnected';
  missedAt?: DateTime;
}

interface CallTimelineEvent {
  id: UUID;
  type: 'queue' | 'ring' | 'answer' | 'hold' | 'resume' | 'transfer'
    | 'dtmf' | 'mute' | 'unmute' | 'end' | 'recording' | 'agent_assigned'
    | 'ivr' | 'conference';
  timestamp: DateTime;
  duration?: number;
  description: string;
  agentId?: UUID;
}

interface EmailMetadata {
  threadId: UUID;
  messages: EmailMessage[];
  emailType: 'normal' | 'spam' | 'phishing';
  spamScore?: number;
}

interface EmailMessage {
  id: UUID;
  from: string;
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  body: string;
  bodyHtml?: string;
  attachments: FileAttachment[];
  sentAt: DateTime;
  direction: 'inbound' | 'outbound';
}

interface ChatMetadata {
  sessionId: UUID;
  source: 'zalo' | 'website-livechat' | 'facebook-messenger';
  messages: ChatMessage[];
  sla: ChatSLA;
}

interface ChatSLA {
  status: 'within-sla' | 'near-breach' | 'breached' | 'not-responded' | 'waiting';
  thresholdMinutes: number;            // default: 5
  firstResponseTime?: string;
  waitingSeconds: number;
  slaRemainingSeconds?: number;
}

interface CallNote {
  id: UUID;
  interactionId: UUID;
  agentId: UUID;
  agentName: string;
  content: string;
  tag?: 'customer-info' | 'callback' | 'complaint' | 'technical' | 'payment' | 'general';
  isPinned: boolean;
  createdAt: DateTime;
  updatedAt: DateTime;
}
```

#### API Endpoints

| Method | Path | Description | Auth | Rate Limit |
|---|---|---|---|---|
| GET | `/api/v1/interactions` | List interactions (paginated, filtered) | Bearer JWT + `interaction:read` | 60/min |
| GET | `/api/v1/interactions/{id}` | Get interaction detail | Bearer JWT + `interaction:read` | 120/min |
| PUT | `/api/v1/interactions/{id}/status` | Update interaction status | Bearer JWT + `interaction:write` | 30/min |
| PUT | `/api/v1/interactions/{id}/assign` | Assign agent to interaction | Bearer JWT + `interaction:assign` | 30/min |
| POST | `/api/v1/interactions/{id}/transfer` | Transfer interaction | Bearer JWT + `interaction:transfer` | 10/min |
| GET | `/api/v1/interactions/{id}/timeline` | Get call timeline events | Bearer JWT + `interaction:read` | 60/min |
| GET | `/api/v1/interactions/{id}/notes` | List notes for interaction | Bearer JWT + `interaction:read` | 60/min |
| POST | `/api/v1/interactions/{id}/notes` | Add note to interaction | Bearer JWT + `interaction:write` | 30/min |
| PUT | `/api/v1/interactions/{id}/notes/{noteId}` | Update note (pin, edit) | Bearer JWT + `interaction:write` | 30/min |
| GET | `/api/v1/interactions/{id}/email/thread` | Get email thread | Bearer JWT + `interaction:read` | 60/min |
| POST | `/api/v1/interactions/{id}/email/reply` | Send email reply | Bearer JWT + `interaction:write` | 10/min |
| POST | `/api/v1/interactions/{id}/email/forward` | Forward email | Bearer JWT + `interaction:write` | 10/min |
| GET | `/api/v1/interactions/{id}/chat/messages` | Get chat messages | Bearer JWT + `interaction:read` | 120/min |
| POST | `/api/v1/interactions/{id}/chat/messages` | Send chat message | Bearer JWT + `interaction:write` | 60/min |
| POST | `/api/v1/interactions/{id}/chat/close` | Close chat session | Bearer JWT + `interaction:write` | 10/min |
| GET | `/api/v1/interactions/stats` | Get interaction statistics (counts by channel/status) | Bearer JWT + `interaction:read` | 30/min |

#### Request/Response Schemas

**GET `/api/v1/interactions`**

```json
// Query Parameters
{
  "statusTab": "queue",                // "all" | "queue" | "closed" | "assigned"
  "channel": "voice",                 // "voice" | "email" | "chat" | null
  "search": "Trần",                   // case-insensitive substring search
  "priority": "urgent",               // optional priority filter
  "direction": "inbound",             // optional direction filter (voice)
  "slaStatus": "breached",            // optional SLA filter (chat)
  "source": "zalo",                   // optional source filter (chat)
  "assignedAgentId": "uuid-001",      // optional assigned agent filter
  "page": 1,
  "pageSize": 50,
  "sortBy": "updatedAt",
  "sortOrder": "desc"
}

// Response 200
{
  "interactions": [
    {
      "id": "uuid-int-001",
      "displayId": "INT-001",
      "type": "email",
      "channel": "email",
      "status": "resolved",
      "priority": "high",
      "customerId": "uuid-cust-002",
      "customerName": "Trần Thị B",
      "assignedAgentId": "uuid-agent-mai",
      "assignedAgentName": "Agent Mai",
      "subject": "Yêu cầu hỗ trợ kỹ thuật",
      "tags": ["kỹ thuật", "vip"],
      "isVIP": true,
      "direction": "outbound",
      "createdAt": "2026-03-06T08:00:00Z",
      "updatedAt": "2026-03-06T09:30:00Z"
    }
  ],
  "total": 16,
  "page": 1,
  "pageSize": 50,
  "stats": {
    "totalAll": 16,
    "totalQueue": 8,
    "totalClosed": 5,
    "totalAssigned": 3,
    "byChannel": {"voice": 5, "email": 6, "chat": 8},
    "byPriority": {"urgent": 3, "high": 4, "medium": 6, "low": 3}
  }
}
```

**POST `/api/v1/interactions/{id}/transfer`**

```json
// Request
{
  "targetAgentId": "uuid-agent-mai",
  "transferType": "warm",              // "warm" | "cold"
  "note": "Khách hàng cần hỗ trợ kỹ thuật về sản phẩm X",
  "interactionId": "uuid-int-default"
}

// Response 200
{
  "transferId": "uuid-transfer-001",
  "status": "initiated",
  "fromAgent": {"id": "uuid-agent-tung", "name": "Agent Tung"},
  "toAgent": {"id": "uuid-agent-mai", "name": "Agent Mai"},
  "transferType": "warm",
  "initiatedAt": "2026-03-06T10:00:00Z"
}
```

**POST `/api/v1/interactions/{id}/email/reply`**

```json
// Request
{
  "to": ["customer@example.com"],
  "cc": ["supervisor@tpb.vn"],
  "bcc": [],
  "subject": "Re: Yêu cầu hỗ trợ kỹ thuật",
  "body": "Kính gửi Quý khách...",
  "bodyHtml": "<p>Kính gửi Quý khách...</p>",
  "templateId": "tpl-001",            // optional, if template was used
  "attachmentIds": ["uuid-file-001"]
}

// Response 200
{
  "messageId": "uuid-msg-004",
  "status": "sent",
  "sentAt": "2026-03-06T10:05:00Z"
}
```

#### WebSocket Channels

| Channel | Direction | Purpose |
|---|---|---|
| `/ws/interactions/{agentId}/queue` | Server→Client | Real-time interaction queue updates (new, assigned, status changes) |
| `/ws/interactions/{interactionId}/chat` | Bidirectional | Real-time chat messaging |
| `/ws/interactions/{interactionId}/sla` | Server→Client | SLA countdown ticks (every second for at-risk chats) |

---

### MS-4: Ticket Service

**Domain:** Case Management
**Database:** PostgreSQL (schema: `ticket`)
**Events Published:** `ticket.created`, `ticket.updated`, `ticket.assigned`, `ticket.escalated`, `ticket.sla.warning`
**V1 Mapping:** US-7 (Create & Manage Tickets)

#### Entities

```typescript
interface Ticket {
  id: UUID;
  displayId: string;                   // "TKT-001"
  tenantId: UUID;
  title: string;
  description: string;
  status: TicketStatus;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  category: TicketCategory;
  department: string;
  assignedAgentId?: UUID;
  assignedAgentName?: string;
  customerId: UUID;
  customerName: string;
  isVIP: boolean;
  interactionId?: UUID;                // link to originating interaction
  queryObjectContext?: QueryObjectContext; // BFSI product context
  attachments: FileAttachment[];
  dueAt?: DateTime;
  resolvedAt?: DateTime;
  closedAt?: DateTime;
  createdBy: UUID;
  createdAt: DateTime;
  updatedAt: DateTime;
}

type TicketStatus = 'new' | 'in-progress' | 'waiting-response'
  | 'resolved' | 'closed';

type TicketCategory = 'service-complaint' | 'technical-request'
  | 'info-change' | 'product-warranty' | 'finance-payment' | 'other';

interface TicketComment {
  id: UUID;
  ticketId: UUID;
  authorId: UUID;
  authorName: string;
  content: string;
  isInternal: boolean;                 // true = yellow-50 bg + "Nội bộ" badge
  attachments: FileAttachment[];
  createdAt: DateTime;
}

interface QueryObjectContext {
  productType: string;                 // "account", "savings", "loan", etc.
  productId: string;
  productName: string;
  additionalInfo: Record<string, string>;
}
```

#### API Endpoints

| Method | Path | Description | Auth | Rate Limit |
|---|---|---|---|---|
| POST | `/api/v1/tickets` | Create ticket | Bearer JWT + `ticket:write` | 20/min |
| GET | `/api/v1/tickets/{id}` | Get ticket detail | Bearer JWT + `ticket:read` | 60/min |
| PUT | `/api/v1/tickets/{id}` | Update ticket | Bearer JWT + `ticket:write` | 30/min |
| GET | `/api/v1/tickets` | List tickets (filtered) | Bearer JWT + `ticket:read` | 30/min |
| POST | `/api/v1/tickets/{id}/comments` | Add comment | Bearer JWT + `ticket:write` | 30/min |
| GET | `/api/v1/tickets/{id}/comments` | List comments | Bearer JWT + `ticket:read` | 60/min |
| PUT | `/api/v1/tickets/{id}/assign` | Assign ticket | Bearer JWT + `ticket:assign` | 10/min |
| PUT | `/api/v1/tickets/{id}/escalate` | Escalate ticket | Bearer JWT + `ticket:escalate` | 10/min |
| GET | `/api/v1/tickets/by-customer/{customerId}` | List tickets for customer | Bearer JWT + `ticket:read` | 30/min |

#### Request/Response Schemas

**POST `/api/v1/tickets`**

```json
// Request
{
  "title": "Lỗi đăng nhập ứng dụng mobile",
  "description": "Khách hàng không thể đăng nhập từ 8:00 sáng...",
  "priority": "high",
  "category": "technical-request",
  "department": "Technical Support",
  "dueAt": "2026-03-06T12:00:00Z",
  "customerId": "uuid-cust-001",
  "interactionId": "uuid-int-default",
  "queryObjectContext": {
    "productType": "digital-banking",
    "productId": "DB-001",
    "productName": "TPB Mobile Banking",
    "additionalInfo": {"version": "3.2.1", "platform": "iOS"}
  },
  "attachmentIds": []
}

// Response 201
{
  "id": "uuid-ticket-new",
  "displayId": "TKT-1741248600000",
  "title": "Lỗi đăng nhập ứng dụng mobile",
  "status": "new",
  "priority": "high",
  "category": "technical-request",
  "department": "Technical Support",
  "customerId": "uuid-cust-001",
  "customerName": "Nguyễn Văn A",
  "isVIP": false,
  "interactionId": "uuid-int-default",
  "createdBy": "uuid-agent-tung",
  "createdAt": "2026-03-06T10:10:00Z"
}

// Response 400 (Validation)
{
  "error": "VALIDATION_ERROR",
  "details": [
    {"field": "title", "message": "Title is required and cannot be empty"},
    {"field": "description", "message": "Description is required and cannot be empty"}
  ]
}
```

**GET `/api/v1/tickets/{id}`**

```json
// Response 200
{
  "id": "uuid-tkt-001",
  "displayId": "TKT-001",
  "title": "Lỗi đăng nhập",
  "description": "Khách hàng không thể đăng nhập...",
  "status": "in-progress",
  "statusLabel": "Đang xử lý",
  "priority": "high",
  "priorityLabel": "Cao",
  "priorityColor": {"bg": "bg-orange-100", "text": "text-orange-800"},
  "category": "technical-request",
  "department": "Technical Support",
  "assignedAgentId": "uuid-agent-tung",
  "assignedAgentName": "Agent Tung",
  "customerId": "uuid-cust-001",
  "customerName": "Nguyễn Văn A",
  "isVIP": false,
  "dueAt": "2026-03-06T12:00:00Z",
  "dueLabel": "2 giờ tới",
  "attachments": [],
  "comments": [
    {
      "id": "uuid-comment-1",
      "authorName": "Agent Tung",
      "content": "Đã tiếp nhận và đang xử lý...",
      "isInternal": false,
      "createdAt": "2026-03-06T10:15:00Z"
    },
    {
      "id": "uuid-comment-2",
      "authorName": "Agent Mai",
      "content": "Cần kiểm tra log hệ thống...",
      "isInternal": true,
      "createdAt": "2026-03-06T10:30:00Z"
    }
  ],
  "relatedObjects": {
    "interaction": {"id": "uuid-int-default", "type": "call", "subject": "Tư vấn nâng cấp gói dịch vụ"},
    "contact": {"name": "Nguyễn Văn A", "cif": "CIF001", "phone": "0901234567", "email": "nguyenvana@email.com", "segment": "Individual"},
    "queryObject": null
  },
  "createdAt": "2026-03-06T10:00:00Z",
  "updatedAt": "2026-03-06T10:30:00Z"
}
```

---

### MS-5: Customer Service

**Domain:** Customer Management
**Database:** PostgreSQL (schema: `customer`)
**Cache:** Redis (frequently accessed customer profiles)
**V1 Mapping:** US-13 (Customer Information Panel)

#### Entities

```typescript
interface Customer {
  id: UUID;
  tenantId: UUID;
  cif: string;                         // Customer Information File number
  fullName: string;
  email?: string;
  phone?: string;
  segment: 'individual' | 'business' | 'premium' | 'vip';
  isVIP: boolean;
  avatar?: string;
  satisfactionRating?: number;         // 1-5 stars
  relationshipLength?: string;         // "2 năm 3 tháng"
  preferences?: CustomerPreferences;
  createdAt: DateTime;
  updatedAt: DateTime;
}

interface CustomerPreferences {
  preferredChannel: 'voice' | 'email' | 'chat';
  preferredLanguage: string;
  contactTimePreference?: string;
}

interface CustomerNote {
  id: UUID;
  customerId: UUID;
  agentId: UUID;
  agentName: string;
  content: string;
  tag?: string;
  isPinned: boolean;
  createdAt: DateTime;
  updatedAt: DateTime;
}
```

#### API Endpoints

| Method | Path | Description | Auth | Rate Limit |
|---|---|---|---|---|
| GET | `/api/v1/customers/{id}` | Get customer profile | Bearer JWT + `customer:read` | 60/min |
| GET | `/api/v1/customers/{id}/history` | Get interaction history | Bearer JWT + `customer:read` | 30/min |
| GET | `/api/v1/customers/{id}/tickets` | Get customer tickets | Bearer JWT + `customer:read` | 30/min |
| GET | `/api/v1/customers/{id}/notes` | Get customer notes | Bearer JWT + `customer:read` | 30/min |
| POST | `/api/v1/customers/{id}/notes` | Add customer note | Bearer JWT + `customer:write` | 20/min |
| PUT | `/api/v1/customers/{id}/notes/{noteId}` | Update note (pin, edit) | Bearer JWT + `customer:write` | 20/min |
| GET | `/api/v1/customers/search` | Search customers (CIF, name, phone) | Bearer JWT + `customer:read` | 30/min |

#### Request/Response Schemas

**GET `/api/v1/customers/{id}`**

```json
// Response 200
{
  "id": "uuid-cust-001",
  "cif": "CIF001",
  "fullName": "Nguyễn Văn A",
  "email": "nguyenvana@email.com",
  "phone": "+84901234567",
  "phoneFormatted": "0901 234 567",
  "segment": "individual",
  "segmentLabel": "Cá nhân",
  "isVIP": false,
  "avatar": "https://cdn.tpb.vn/avatars/uuid-cust-001.jpg",
  "satisfactionRating": 4.2,
  "relationshipLength": "2 năm 3 tháng",
  "preferences": {
    "preferredChannel": "voice",
    "preferredLanguage": "vi",
    "contactTimePreference": "8:00-17:00"
  },
  "contactInfo": {
    "email": "nguyenvana@email.com",
    "phone": "0901 234 567",
    "address": "123 Nguyễn Huệ, Q1, TP.HCM"
  },
  "businessInfo": {
    "cif": "CIF001",
    "segment": "Cá nhân",
    "relationshipLength": "2 năm 3 tháng",
    "accountManager": "Agent Tung"
  }
}
```

---

### MS-6: Notification Service

**Domain:** Notification & Alerting
**Database:** PostgreSQL (schema: `notification`)
**Cache:** Redis (active notifications, user preferences)
**Events Consumed:** `interaction.missed`, `ticket.assigned`, `ticket.sla.warning`, `system.alert`, `agent.schedule.reminder`
**V1 Mapping:** US-12 (Notification Centre)

#### Entities

```typescript
interface Notification {
  id: UUID;
  tenantId: UUID;
  recipientAgentId: UUID;
  type: NotificationType;
  status: NotificationStatus;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  title: string;
  message: string;
  metadata: Record<string, any>;       // type-specific data (phone, ticketId, etc.)
  isVIP: boolean;
  actionUrl?: string;
  createdAt: DateTime;
  viewedAt?: DateTime;
  actionedAt?: DateTime;
  dismissedAt?: DateTime;
  expiresAt?: DateTime;
}

type NotificationType = 'missed-call' | 'ticket-assignment' | 'ticket-due'
  | 'system-alert' | 'schedule-reminder';

type NotificationStatus = 'new' | 'viewed' | 'actioned' | 'dismissed';

interface NotificationSettings {
  agentId: UUID;
  enabled: boolean;
  enableSound: boolean;
  autoHideAfter: 5 | 8 | 10 | 15;     // seconds
  maxActiveNotifications: number;       // default: 3
  typePreferences: Record<NotificationType, boolean>;
}
```

#### API Endpoints

| Method | Path | Description | Auth | Rate Limit |
|---|---|---|---|---|
| GET | `/api/v1/notifications` | List notifications (paginated, filtered by tab) | Bearer JWT | 60/min |
| GET | `/api/v1/notifications/unread-count` | Get unread count (bell badge) | Bearer JWT | 120/min |
| PUT | `/api/v1/notifications/{id}/status` | Update notification status (view, action, dismiss) | Bearer JWT | 60/min |
| PUT | `/api/v1/notifications/mark-all-read` | Mark all as viewed | Bearer JWT | 10/min |
| DELETE | `/api/v1/notifications/clear-old` | Clear notifications older than 24h | Bearer JWT | 5/min |
| GET | `/api/v1/notifications/settings` | Get notification settings | Bearer JWT | 30/min |
| PUT | `/api/v1/notifications/settings` | Update notification settings | Bearer JWT | 10/min |
| GET | `/api/v1/notifications/warnings/not-ready` | Get not-ready missed calls warning | Bearer JWT | 30/min |

#### WebSocket Channels

| Channel | Direction | Purpose |
|---|---|---|
| `/ws/notifications/{agentId}` | Server→Client | Real-time notification push (toast notifications) |

#### Request/Response Schemas

**GET `/api/v1/notifications`**

```json
// Query Parameters
{
  "tab": "all",                        // "all" | "calls" | "tickets" | "system" | "schedule"
  "status": "new",                     // optional: "new" | "viewed" | "actioned" | "dismissed"
  "page": 1,
  "pageSize": 20
}

// Response 200
{
  "notifications": [
    {
      "id": "uuid-notif-001",
      "type": "missed-call",
      "typeLabel": "Cuộc gọi nhỡ",
      "typeColor": "orange-600",
      "status": "new",
      "priority": "urgent",
      "priorityBorderColor": "red",
      "title": "Cuộc gọi nhỡ từ VIP",
      "message": "Trần Thị B (VIP) đã gọi lúc 09:35",
      "metadata": {
        "callerName": "Trần Thị B",
        "callerPhone": "+84912345678",
        "callerPhoneFormatted": "0912 345 678",
        "missedReason": "not-ready",
        "isVIP": true
      },
      "isVIP": true,
      "createdAt": "2026-03-06T09:35:00Z",
      "actions": [
        {"type": "callback", "label": "Gọi lại", "color": "green"}
      ]
    }
  ],
  "total": 12,
  "unreadCount": 5,
  "tabCounts": {
    "all": 12,
    "calls": 4,
    "tickets": 5,
    "system": 2,
    "schedule": 1
  },
  "notReadyWarning": {
    "show": true,
    "count": 3,
    "message": "3 cuộc gọi nhỡ do Not Ready",
    "windowMinutes": 15
  }
}
```

---

### MS-7: Knowledge Service

**Domain:** Knowledge Management
**Database:** MongoDB (articles, folder hierarchy)
**Search:** Elasticsearch (full-text search on articles)
**V1 Mapping:** US-6 (Knowledge Base Search)

#### Entities

```typescript
interface KBFolder {
  id: UUID;
  tenantId: UUID;
  name: string;
  parentId?: UUID;                     // null = root folder
  sortOrder: number;
  createdAt: DateTime;
  updatedAt: DateTime;
}

interface KBArticle {
  id: UUID;
  tenantId: UUID;
  folderId: UUID;
  title: string;
  summary: string;
  content: string;                     // Markdown or HTML
  contentHtml: string;
  tags: string[];
  category: string;
  viewCount: number;
  rating: number;                      // average rating (1-5)
  ratingCount: number;
  status: 'draft' | 'published' | 'archived';
  createdBy: UUID;
  createdAt: DateTime;
  updatedAt: DateTime;
}

interface KBBookmark {
  id: UUID;
  articleId: UUID;
  agentId: UUID;
  createdAt: DateTime;
}

interface KBComment {
  id: UUID;
  articleId: UUID;
  authorId: UUID;
  authorName: string;
  content: string;
  createdAt: DateTime;
}
```

#### API Endpoints

| Method | Path | Description | Auth | Rate Limit |
|---|---|---|---|---|
| GET | `/api/v1/knowledge/folders` | Get folder tree | Bearer JWT + `knowledge:read` | 30/min |
| GET | `/api/v1/knowledge/folders/{id}/articles` | Get articles in folder | Bearer JWT + `knowledge:read` | 60/min |
| GET | `/api/v1/knowledge/articles/{id}` | Get article detail | Bearer JWT + `knowledge:read` | 120/min |
| GET | `/api/v1/knowledge/search` | Search articles (full-text) | Bearer JWT + `knowledge:read` | 60/min |
| POST | `/api/v1/knowledge/articles/{id}/bookmark` | Toggle bookmark | Bearer JWT | 30/min |
| DELETE | `/api/v1/knowledge/articles/{id}/bookmark` | Remove bookmark | Bearer JWT | 30/min |
| GET | `/api/v1/knowledge/bookmarks` | Get bookmarked articles | Bearer JWT | 30/min |
| GET | `/api/v1/knowledge/articles/{id}/comments` | Get article comments | Bearer JWT + `knowledge:read` | 30/min |
| POST | `/api/v1/knowledge/articles/{id}/comments` | Add comment | Bearer JWT + `knowledge:write` | 20/min |

#### Request/Response Schemas

**GET `/api/v1/knowledge/folders`**

```json
// Response 200
{
  "folders": [
    {
      "id": "uuid-folder-1",
      "name": "Chính sách bảo hành",
      "parentId": null,
      "children": [
        {
          "id": "uuid-folder-2",
          "name": "Bảo hành Laptop",
          "parentId": "uuid-folder-1",
          "children": [],
          "articleCount": 2
        }
      ],
      "articleCount": 0
    },
    {
      "id": "uuid-folder-3",
      "name": "Dịch vụ khách hàng",
      "parentId": null,
      "children": [
        {
          "id": "uuid-folder-4",
          "name": "Đổi trả sản phẩm",
          "parentId": "uuid-folder-3",
          "children": [],
          "articleCount": 1
        }
      ],
      "articleCount": 0
    }
  ]
}
```

**GET `/api/v1/knowledge/search`**

```json
// Query Parameters
{
  "q": "đăng nhập",
  "categories": ["Chính sách bảo hành"],
  "tags": ["laptop"],
  "page": 1,
  "pageSize": 10
}

// Response 200
{
  "articles": [
    {
      "id": "uuid-article-001",
      "title": "Hướng dẫn khắc phục lỗi đăng nhập",
      "summary": "Bài viết hướng dẫn các bước khắc phục...",
      "category": "Dịch vụ khách hàng",
      "tags": ["đăng nhập", "khắc phục"],
      "viewCount": 1250,
      "rating": 4.5,
      "isBookmarked": true,
      "updatedAt": "2026-03-01T10:00:00Z"
    }
  ],
  "total": 3,
  "page": 1,
  "pageSize": 10
}
```

---

### MS-8: BFSI Core Banking Service

**Domain:** Financial Product Queries
**Database:** Read-only proxy to Core Banking System (CBS)
**Cache:** Redis (60-second TTL on non-sensitive queries; no caching for balances)
**Security:** Highest sensitivity — all requests require explicit BFSI data access permission
**V1 Mapping:** US-8 (Information Query — BFSI)

#### Entities (Read Models — sourced from CBS)

```typescript
interface AccountProduct {
  id: string;
  customerId: UUID;
  type: 'checking' | 'savings-current' | 'payment';
  accountNumber: string;               // masked by default: "****1234"
  accountNumberFull: string;           // only returned if sensitiveDataVisible=true
  balance: number;                     // masked by default
  balanceFormatted: string;            // VND formatted
  currency: 'VND';
  status: 'active' | 'dormant' | 'frozen' | 'closed';
  openedAt: DateTime;
}

interface SavingsProduct {
  id: string;
  customerId: UUID;
  principal: number;
  principalFormatted: string;
  interestRate: number;                // percentage
  maturityDate: DateTime;
  term: string;                        // "12 tháng"
  status: 'active' | 'matured' | 'closed';
}

interface LoanProduct {
  id: string;
  customerId: UUID;
  currentBalance: number;
  currentBalanceFormatted: string;
  monthlyPayment: number;
  monthlyPaymentFormatted: string;
  interestRate: number;
  term: string;
  status: 'active' | 'overdue' | 'paid-off';
}

interface CardProduct {
  id: string;
  customerId: UUID;
  cardNumber: string;                  // masked: "****5678"
  cardNumberFull: string;
  creditLimit: number;
  creditLimitFormatted: string;
  availableBalance: number;
  availableBalanceFormatted: string;
  cardType: 'credit' | 'debit' | 'prepaid';
  status: 'active' | 'blocked' | 'expired';
}

interface Transaction {
  id: string;
  customerId: UUID;
  accountId: string;
  type: 'credit' | 'debit';
  amount: number;
  amountFormatted: string;
  description: string;
  transactionDate: DateTime;
  referenceNumber: string;
  channel: string;
}
```

#### API Endpoints

| Method | Path | Description | Auth | Rate Limit |
|---|---|---|---|---|
| GET | `/api/v1/bfsi/customers/{customerId}/accounts` | Get customer accounts | Bearer JWT + `bfsi:read` | 30/min |
| GET | `/api/v1/bfsi/customers/{customerId}/savings` | Get savings products | Bearer JWT + `bfsi:read` | 30/min |
| GET | `/api/v1/bfsi/customers/{customerId}/loans` | Get loan products | Bearer JWT + `bfsi:read` | 30/min |
| GET | `/api/v1/bfsi/customers/{customerId}/cards` | Get card products | Bearer JWT + `bfsi:read` | 30/min |
| GET | `/api/v1/bfsi/customers/{customerId}/digital-banking` | Get digital banking info | Bearer JWT + `bfsi:read` | 30/min |
| GET | `/api/v1/bfsi/customers/{customerId}/payments` | Get payment info | Bearer JWT + `bfsi:read` | 30/min |
| GET | `/api/v1/bfsi/customers/{customerId}/merchant` | Get merchant info | Bearer JWT + `bfsi:read` | 30/min |
| GET | `/api/v1/bfsi/customers/{customerId}/transactions` | Get transactions (date-filtered) | Bearer JWT + `bfsi:read` | 20/min |

#### Request/Response Schemas

**GET `/api/v1/bfsi/customers/{customerId}/accounts`**

```json
// Query Parameters
{
  "sensitiveDataVisible": false,       // default: false (masked)
  "customerId": "uuid-cust-001"
}

// Response 200 (masked)
{
  "products": [
    {
      "id": "ACC-001",
      "type": "checking",
      "accountNumber": "****1234",
      "balance": null,
      "balanceDisplay": "***,***,*** ₫",
      "currency": "VND",
      "status": "active",
      "statusLabel": "Hoạt động"
    }
  ],
  "category": "accounts",
  "categoryLabel": "Tài khoản",
  "isMasked": true,
  "total": 2
}

// Response 200 (unmasked — requires bfsi:read:sensitive permission)
{
  "products": [
    {
      "id": "ACC-001",
      "type": "checking",
      "accountNumber": "1234567890001234",
      "balance": 125000000,
      "balanceDisplay": "125.000.000 ₫",
      "currency": "VND",
      "status": "active",
      "statusLabel": "Hoạt động"
    }
  ],
  "category": "accounts",
  "categoryLabel": "Tài khoản",
  "isMasked": false,
  "total": 2
}
```

**GET `/api/v1/bfsi/customers/{customerId}/transactions`**

```json
// Query Parameters
{
  "customerId": "uuid-cust-001",
  "fromDate": "2026-02-01",
  "toDate": "2026-03-06",
  "accountId": "ACC-001",
  "page": 1,
  "pageSize": 20
}

// Response 200
{
  "transactions": [
    {
      "id": "TXN-001",
      "type": "debit",
      "amount": -5000000,
      "amountFormatted": "-5.000.000 ₫",
      "description": "Chuyển khoản liên ngân hàng",
      "transactionDate": "2026-03-05T14:30:00Z",
      "referenceNumber": "REF202603051430001",
      "channel": "Mobile Banking"
    }
  ],
  "total": 45,
  "page": 1,
  "pageSize": 20,
  "dateRange": {"from": "2026-02-01", "to": "2026-03-06"}
}
```

---

### MS-9: AI Service

**Domain:** AI & Automation
**Database:** MongoDB (conversation history, suggestion cache)
**V1 Mapping:** US-5 (AI Assistant)

#### API Endpoints

| Method | Path | Description | Auth | Rate Limit |
|---|---|---|---|---|
| GET | `/api/v1/ai/suggestions/{interactionId}` | Get suggestion chips for interaction | Bearer JWT + `ai:read` | 30/min |
| POST | `/api/v1/ai/generate` | Generate AI response for a suggestion | Bearer JWT + `ai:read` | 20/min |
| POST | `/api/v1/ai/summarize` | Summarize interaction/email thread | Bearer JWT + `ai:read` | 10/min |

#### Request/Response Schemas

**GET `/api/v1/ai/suggestions/{interactionId}`**

```json
// Response 200
{
  "interactionId": "uuid-int-default",
  "chips": [
    {"id": "chip-1", "label": "Tóm tắt cuộc gọi", "type": "summarize"},
    {"id": "chip-2", "label": "Gợi ý phản hồi", "type": "suggest-response"},
    {"id": "chip-3", "label": "Tra cứu chính sách", "type": "policy-lookup"},
    {"id": "chip-4", "label": "Phân tích cảm xúc", "type": "sentiment"},
    {"id": "chip-5", "label": "Lịch sử khách hàng", "type": "customer-history"},
    {"id": "chip-6", "label": "Đề xuất sản phẩm", "type": "product-suggest"}
  ]
}
```

**POST `/api/v1/ai/generate`**

```json
// Request
{
  "interactionId": "uuid-int-default",
  "chipId": "chip-2",
  "chipType": "suggest-response",
  "context": {
    "channel": "email",
    "customerName": "Trần Thị B",
    "subject": "Yêu cầu hỗ trợ kỹ thuật",
    "lastMessage": "Tôi không thể đăng nhập..."
  }
}

// Response 200
{
  "responseId": "uuid-resp-001",
  "content": "Kính gửi Quý khách Trần Thị B,\n\nCảm ơn Quý khách đã liên hệ TPB...",
  "contentHtml": "<p>Kính gửi Quý khách Trần Thị B,</p>...",
  "confidence": 0.87,
  "canInsert": true,
  "generatedAt": "2026-03-06T10:15:00Z"
}
```

---

### MS-10: Media Service

**Domain:** Media & File Management
**Storage:** MinIO/S3
**Database:** PostgreSQL (schema: `media`) — metadata only
**V1 Mapping:** US-2 (Call Recordings), US-3 (Email Attachments), US-7 (Ticket Attachments)

#### API Endpoints

| Method | Path | Description | Auth | Rate Limit |
|---|---|---|---|---|
| POST | `/api/v1/media/upload` | Upload file (multipart) | Bearer JWT + `media:write` | 10/min |
| GET | `/api/v1/media/{fileId}` | Get file metadata + pre-signed URL | Bearer JWT + `media:read` | 60/min |
| GET | `/api/v1/media/{fileId}/download` | Redirect to pre-signed download URL | Bearer JWT + `media:read` | 30/min |
| GET | `/api/v1/media/{fileId}/stream` | Stream file (for recordings) | Bearer JWT + `media:read` | 30/min |
| DELETE | `/api/v1/media/{fileId}` | Delete file | Bearer JWT + `media:delete` | 10/min |

#### File Security

- All files scanned for malware before storage (ClamAV integration)
- Files encrypted at rest (AES-256-GCM)
- Pre-signed URLs expire after 15 minutes
- Access logged to Audit Service

---

### MS-11: Audit Service

**Domain:** Compliance & Audit Logging
**Database:** PostgreSQL (schema: `audit`, append-only) + Elasticsearch (searchable audit index)
**Storage:** S3 (long-term audit archive, 7-year retention)
**Events Consumed:** All domain events from Kafka

#### Entities

```typescript
interface AuditEntry {
  id: UUID;
  tenantId: UUID;
  timestamp: DateTime;
  correlationId: string;               // X-Request-Id from gateway
  actor: {
    userId: UUID;
    agentId: string;
    username: string;
    ipAddress: string;
    userAgent: string;
    sessionId: UUID;
  };
  action: string;                      // "interaction.transferred", "ticket.created", etc.
  resource: {
    type: string;                      // "interaction", "ticket", "customer", etc.
    id: string;
    displayId?: string;                // "INT-001", "TKT-001"
  };
  details: {
    before?: Record<string, any>;      // previous state (for updates)
    after?: Record<string, any>;       // new state
    metadata?: Record<string, any>;
  };
  outcome: 'success' | 'failure' | 'denied';
  sensitivityLevel: 'low' | 'medium' | 'high' | 'critical';
  category: AuditCategory;
}

type AuditCategory = 'authentication' | 'authorization' | 'data-access'
  | 'data-modification' | 'status-change' | 'transfer' | 'escalation'
  | 'financial-query' | 'sensitive-data-view' | 'configuration-change';
```

#### API Endpoints

| Method | Path | Description | Auth | Rate Limit |
|---|---|---|---|---|
| GET | `/api/v1/audit/logs` | Query audit logs (admin/auditor only) | Bearer JWT + `audit:read` | 10/min |
| GET | `/api/v1/audit/logs/{resourceType}/{resourceId}` | Get audit trail for specific resource | Bearer JWT + `audit:read` | 30/min |
| GET | `/api/v1/audit/reports/login-activity` | Login activity report | Bearer JWT + `audit:read` | 5/min |
| GET | `/api/v1/audit/reports/sensitive-access` | Sensitive data access report | Bearer JWT + `audit:read` | 5/min |

#### Immutability Guarantee

- Audit entries are **append-only**. No UPDATE or DELETE operations permitted on audit tables.
- Database triggers prevent modification of existing rows.
- PostgreSQL audit schema uses `ALTER TABLE audit_log SET (autovacuum_enabled = false)` for forensic integrity (optional, based on volume).
- All audit data is cryptographically hashed (SHA-256 chain) to detect tampering.

---

### MS-12: CTI Gateway

**Domain:** Telephony Integration
**Protocol:** SIP/WebRTC ↔ WebSocket bridge
**V1 Mapping:** US-9 (Floating Call Widget), US-10 (Call Transfer)

#### WebSocket Channels

| Channel | Direction | Purpose |
|---|---|---|
| `/ws/cti/{agentId}/call` | Bidirectional | Call control commands and state updates |

#### Call Control Commands (Client → Server)

```json
// Answer incoming call
{"action": "answer", "callId": "uuid-call-001"}

// Hold
{"action": "hold", "callId": "uuid-call-001"}

// Resume (unhold)
{"action": "resume", "callId": "uuid-call-001"}

// Mute
{"action": "mute", "callId": "uuid-call-001"}

// Unmute
{"action": "unmute", "callId": "uuid-call-001"}

// Toggle speaker
{"action": "speaker", "callId": "uuid-call-001", "enabled": true}

// Transfer (warm)
{"action": "transfer", "callId": "uuid-call-001", "targetAgentId": "uuid-agent-mai", "transferType": "warm", "note": "..."}

// Transfer (cold)
{"action": "transfer", "callId": "uuid-call-001", "targetAgentId": "uuid-agent-mai", "transferType": "cold"}

// Conference
{"action": "conference", "callId": "uuid-call-001", "targetAgentId": "uuid-agent-mai"}

// End call
{"action": "end", "callId": "uuid-call-001"}
```

#### Call State Events (Server → Client)

```json
// Incoming call (triggers FCW ringing state)
{
  "event": "call.ringing",
  "callId": "uuid-call-001",
  "callerNumber": "+84901234567",
  "callerName": "Nguyễn Văn A",
  "customerId": "uuid-cust-001",
  "isVIP": false,
  "queueName": "General",
  "timestamp": "2026-03-06T10:00:00Z"
}

// Call connected (triggers FCW connected state + timer start)
{
  "event": "call.connected",
  "callId": "uuid-call-001",
  "connectedAt": "2026-03-06T10:00:05Z"
}

// Call ended
{
  "event": "call.ended",
  "callId": "uuid-call-001",
  "endedAt": "2026-03-06T10:12:50Z",
  "duration": 765,
  "endReason": "agent-hangup"
}

// Transfer initiated
{
  "event": "call.transferring",
  "callId": "uuid-call-001",
  "targetAgent": {"id": "uuid-agent-mai", "name": "Agent Mai"},
  "transferType": "warm"
}
```

---

## 6. Frontend-to-Backend API Mapping

This section maps every V1 frontend feature to the exact backend API calls required.

### US-1: Interaction Queue & Filters

| V1 AC | Frontend Action | API Call(s) | WebSocket |
|---|---|---|---|
| AC-1.1 | Default load | `GET /api/v1/interactions?statusTab=all&page=1` + `GET /api/v1/customers/{customerId}` | Subscribe `/ws/interactions/{agentId}/queue` |
| AC-1.2 | "Hàng chờ" tab | `GET /api/v1/interactions?statusTab=queue` | — |
| AC-1.3 | "Đã đóng" tab | `GET /api/v1/interactions?statusTab=closed` | — |
| AC-1.4 | "Đã nhận" tab | `GET /api/v1/interactions?statusTab=assigned&assignedAgentId={me}` | — |
| AC-1.5 | Voice filter | `GET /api/v1/interactions?channel=voice` | — |
| AC-1.6 | Advanced filter | `GET /api/v1/interactions?channel=voice&direction=inbound` | — |
| AC-1.7 | Email filter | `GET /api/v1/interactions?channel=email` | — |
| AC-1.8 | Chat filter | `GET /api/v1/interactions?channel=chat` | — |
| AC-1.9 | Chat advanced filter | `GET /api/v1/interactions?channel=chat&slaStatus=breached&source=zalo` | — |
| AC-1.10 | Search | `GET /api/v1/interactions?search=Trần` | — |
| AC-1.11 | Empty search | `GET /api/v1/interactions?search=xyznotfound999` → empty `interactions[]` | — |
| AC-1.12 | VIP badge | `isVIP` field in interaction response | — |
| AC-1.16 | Filter intersection | All query params combined (AND logic server-side) | — |

### US-2: Voice Call Detail

| V1 AC | Frontend Action | API Call(s) | WebSocket |
|---|---|---|---|
| AC-2.1 | Recording player | `GET /api/v1/interactions/{id}` (includes recording metadata) + `GET /api/v1/media/{fileId}/stream` | — |
| AC-2.3–2.6 | Timeline | `GET /api/v1/interactions/{id}/timeline` | — |
| AC-2.7–2.11 | Notes | `GET /api/v1/interactions/{id}/notes` + `POST /api/v1/interactions/{id}/notes` + `PUT .../notes/{noteId}` | — |

### US-3: Email Thread & Reply

| V1 AC | Frontend Action | API Call(s) |
|---|---|---|
| AC-3.1–3.2 | Thread view | `GET /api/v1/interactions/{id}/email/thread` |
| AC-3.3–3.6 | Reply | `POST /api/v1/interactions/{id}/email/reply` |
| AC-3.7 | Spam warning | `emailType: 'spam'` in interaction metadata |
| AC-3.8 | Attachments | `GET /api/v1/media/{fileId}` for each attachment |

### US-4: Chat Session & SLA

| V1 AC | Frontend Action | API Call(s) | WebSocket |
|---|---|---|---|
| AC-4.1–4.5 | SLA badges | `chatSLA` object in interaction response | `/ws/interactions/{interactionId}/sla` |
| AC-4.6 | Chat send | `POST /api/v1/interactions/{id}/chat/messages` | `/ws/interactions/{interactionId}/chat` |
| AC-4.7 | Session close | `POST /api/v1/interactions/{id}/chat/close` | — |

### US-5: AI Assistant

| V1 AC | Frontend Action | API Call(s) |
|---|---|---|
| AC-5.1 | Suggestion chips | `GET /api/v1/ai/suggestions/{interactionId}` |
| AC-5.2–5.3 | Generate response | `POST /api/v1/ai/generate` |

### US-7: Create & Manage Tickets

| V1 AC | Frontend Action | API Call(s) |
|---|---|---|
| AC-7.1–7.8 | Create ticket | `POST /api/v1/tickets` |
| AC-7.9–7.12 | View ticket | `GET /api/v1/tickets/{id}` |
| AC-7.10 | Edit ticket | `PUT /api/v1/tickets/{id}` |
| AC-7.13–7.14 | Add comment | `POST /api/v1/tickets/{id}/comments` |

### US-8: Information Query (BFSI)

| V1 AC | Frontend Action | API Call(s) |
|---|---|---|
| AC-8.1–8.5 | Product categories | `GET /api/v1/bfsi/customers/{customerId}/{category}` |
| AC-8.6 | Transactions | `GET /api/v1/bfsi/customers/{customerId}/transactions?fromDate=...&toDate=...` |
| AC-8.7–8.8 | Sensitive toggle | `sensitiveDataVisible` query param (requires `bfsi:read:sensitive` permission) |
| AC-8.9 | Create ticket from query | `POST /api/v1/tickets` with `queryObjectContext` |

### US-9–10: Call Widget & Transfer

| V1 AC | Frontend Action | WebSocket |
|---|---|---|
| AC-9.1–9.10 | FCW states | `/ws/cti/{agentId}/call` |
| AC-10.1–10.8 | Transfer | `POST /api/v1/interactions/{id}/transfer` + `/ws/cti/{agentId}/call` |

### US-11: Agent Status

| V1 AC | Frontend Action | API Call(s) | WebSocket |
|---|---|---|---|
| AC-11.1–11.3 | Status pill | `GET /api/v1/agents/me/status` | `/ws/agent/{agentId}/status` |
| AC-11.5–11.8 | Channel toggle | `PUT /api/v1/agents/me/status/{channel}` | — |
| AC-11.9 | Ready all | `PUT /api/v1/agents/me/status/all` | — |
| AC-11.10 | Not-ready all | `PUT /api/v1/agents/me/status/all` | — |

### US-12: Notifications

| V1 AC | Frontend Action | API Call(s) | WebSocket |
|---|---|---|---|
| AC-12.1–12.4 | Notification list | `GET /api/v1/notifications?tab=all` | `/ws/notifications/{agentId}` |
| AC-12.5 | Settings | `GET/PUT /api/v1/notifications/settings` | — |
| AC-12.13 | Clear old | `DELETE /api/v1/notifications/clear-old` | — |

### US-13: Customer Info

| V1 AC | Frontend Action | API Call(s) |
|---|---|---|
| AC-13.1–13.3 | Profile tab | `GET /api/v1/customers/{id}` |
| AC-13.4 | History tab | `GET /api/v1/customers/{id}/history?channel=...` |
| AC-13.5–13.6 | Ticket tab | `GET /api/v1/tickets/by-customer/{customerId}?status=...` |
| AC-13.7 | Core query tab | `GET /api/v1/bfsi/customers/{customerId}/{category}` |
| AC-13.8–13.10 | Notes tab | `GET/POST/PUT /api/v1/customers/{id}/notes` |

---

## 7. BFSI Security Standards

### 7.1 Data Encryption

| Layer | Standard | Implementation |
|---|---|---|
| **In-Transit** | TLS 1.3 | All external HTTPS traffic; HSTS headers with `max-age=31536000; includeSubDomains; preload` |
| **In-Transit (Internal)** | mTLS | Service mesh (Istio) enforces mutual TLS between all microservices; X.509 certificates rotated every 24h |
| **At-Rest (Database)** | AES-256 | PostgreSQL Transparent Data Encryption (TDE); MongoDB encrypted storage engine |
| **At-Rest (Files)** | AES-256-GCM | MinIO/S3 server-side encryption with customer-managed keys (CMK) |
| **At-Rest (Cache)** | AES-256 | Redis with encrypted-at-rest enabled; session data encrypted at application level |
| **Field-Level** | AES-256-GCM | PII fields (phone, email, account numbers) encrypted at application level before DB write |
| **Key Management** | HSM-backed | HashiCorp Vault with auto-unseal via cloud HSM; key rotation every 90 days |

### 7.2 Authentication Security

| Control | Details |
|---|---|
| Password Policy | Min 12 chars, uppercase + lowercase + digit + special char; bcrypt cost=12 |
| MFA | TOTP-based (Google Authenticator / MS Authenticator); mandatory for supervisor and admin roles |
| Session Management | Access token: 15-min expiry (RS256 JWT); Refresh token: 8-hour expiry (opaque, stored in Redis) |
| Account Lockout | 5 failed attempts → 30-min lockout; 3 lockouts in 24h → manual unlock required |
| Concurrent Sessions | Max 1 active session per agent (new login forces logout of previous session) |
| Token Blacklist | Redis-backed; all revoked tokens checked on every request until natural expiry |

### 7.3 Sensitive Data Handling

| Data Type | Classification | Handling Rules |
|---|---|---|
| Account Numbers | **Confidential** | Masked by default (****1234); unmasking requires `bfsi:read:sensitive` permission + audit log entry |
| Account Balances | **Confidential** | Masked by default; same rules as account numbers |
| Card Numbers | **Restricted (PCI-DSS)** | Full card numbers NEVER stored in application DB; only last 4 digits from CBS |
| Customer Phone | **Internal** | Displayed to assigned/authorized agents only; masked in logs |
| Customer Email | **Internal** | Displayed to assigned/authorized agents only; masked in logs |
| Passwords | **Restricted** | Never logged, never returned in API responses; bcrypt hashed |
| Call Recordings | **Confidential** | Encrypted at rest; access requires `media:read` + assignment check; auto-deleted after retention period |

### 7.4 Network Security

| Control | Details |
|---|---|
| WAF | Web Application Firewall (ModSecurity/AWS WAF) in front of API Gateway |
| DDoS Protection | Rate limiting at gateway + cloud-level DDoS protection |
| IP Whitelisting | Core Banking API calls only from whitelisted service IPs |
| CORS | Strict origin whitelist; no wildcard origins |
| CSP | `Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self' wss://*.tpb.vn` |
| Security Headers | `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `X-XSS-Protection: 0`, `Referrer-Policy: strict-origin-when-cross-origin` |

### 7.5 Audit Requirements (BFSI Compliance)

All of the following actions MUST generate an immutable audit entry:

| Category | Actions Audited |
|---|---|
| Authentication | Login success/failure, logout, MFA verification, session creation/revocation, password change |
| Authorization | Permission denied events, role changes, privilege escalation attempts |
| Data Access | Customer profile viewed, financial data queried, sensitive data unmasked, call recording accessed |
| Data Modification | Ticket created/updated/escalated, interaction status changed, customer notes added/modified |
| Agent Operations | Status change (ready/not-ready), call transfer, call conference, email sent, chat session closed |
| Administrative | User created/deactivated, role modified, system configuration changed, notification settings updated |

### 7.6 Data Retention

| Data Type | Retention Period | Archive Policy |
|---|---|---|
| Audit Logs | 7 years | Cold storage (S3 Glacier) after 1 year |
| Call Recordings | 5 years | Cold storage after 6 months |
| Chat Transcripts | 3 years | Cold storage after 1 year |
| Email Threads | 5 years | Cold storage after 1 year |
| Tickets | 5 years | Cold storage after 2 years |
| Customer Data | Lifetime + 5 years after account closure | Subject to deletion request per data privacy laws |
| Session/Cache Data | 24 hours | Auto-purged |

---

## 8. Authorization & Access Control

### 8.1 RBAC Role Definitions

| Role | Description | Scope | Inherits |
|---|---|---|---|
| `agent` | Front-line customer service agent | Own interactions, assigned tickets, assigned customers | — |
| `senior-agent` | Senior agent with escalation authority | Team interactions and tickets | `agent` |
| `supervisor` | Team supervisor with monitoring and override capabilities | Department interactions, tickets, agents | `senior-agent` |
| `admin` | System administrator | All data, all configurations | `supervisor` |
| `auditor` | Compliance auditor (read-only on audit data) | All audit logs, reports | — |

### 8.2 Permission Matrix (Feature-Level Authorization)

| Resource | Action | `agent` | `senior-agent` | `supervisor` | `admin` | `auditor` |
|---|---|---|---|---|---|---|
| **Interaction** | `read` | own + assigned | team | department | all | — |
| **Interaction** | `write` (update status) | own | team | department | all | — |
| **Interaction** | `assign` | — | team | department | all | — |
| **Interaction** | `transfer` | own | team | department | all | — |
| **Interaction** | `escalate` | — | own | department | all | — |
| **Ticket** | `read` | own + assigned | team | department | all | — |
| **Ticket** | `write` (create/update) | own | team | department | all | — |
| **Ticket** | `assign` | — | team | department | all | — |
| **Ticket** | `escalate` | — | own | department | all | — |
| **Ticket** | `delete` | — | — | — | all | — |
| **Customer** | `read` (profile) | assigned | team | department | all | — |
| **Customer** | `write` (notes) | assigned | team | department | all | — |
| **BFSI Data** | `read` (masked) | assigned | team | department | all | — |
| **BFSI Data** | `read:sensitive` (unmasked) | — | assigned | department | all | — |
| **Knowledge Base** | `read` | all | all | all | all | — |
| **Knowledge Base** | `write` (articles) | — | — | department | all | — |
| **Knowledge Base** | `bookmark` | own | own | own | own | — |
| **Agent Status** | `read` (own) | own | own | own | all | — |
| **Agent Status** | `read` (others) | — | team | department | all | — |
| **Agent Status** | `write` (own) | own | own | own | all | — |
| **Agent Status** | `write` (others) | — | — | department | all | — |
| **Notification** | `read` | own | own | own | own | — |
| **Notification** | `write` (settings) | own | own | own | own | — |
| **Audit Logs** | `read` | — | — | — | all | all |
| **Media** | `read` | assigned | team | department | all | — |
| **Media** | `write` (upload) | own | own | own | all | — |
| **Media** | `delete` | — | — | — | all | — |
| **AI Assistant** | `read` | own | own | own | all | — |
| **System Config** | `read` | — | — | — | all | — |
| **System Config** | `write` | — | — | — | all | — |

### 8.3 ABAC Policy Rules

Beyond RBAC, the following attribute-based conditions apply:

```yaml
# Policy: Agent can only access interactions assigned to them or in their queue
- effect: allow
  resource: interaction
  action: read
  condition:
    OR:
      - interaction.assignedAgentId == request.actor.agentId
      - interaction.status IN ['new'] AND interaction.channel IN actor.channelPermissions
      - actor.role IN ['supervisor', 'admin']

# Policy: Sensitive financial data requires explicit permission + active assignment
- effect: allow
  resource: bfsi
  action: read:sensitive
  condition:
    AND:
      - actor.permissions CONTAINS 'bfsi:read:sensitive'
      - customer.assignedAgentId == request.actor.agentId
        OR actor.role IN ['supervisor', 'admin']
      - request.context.interactionId IS NOT NULL  # must be in context of active interaction

# Policy: Internal ticket comments visible only to agents, not customers
- effect: allow
  resource: ticket.comment
  action: read
  condition:
    IF comment.isInternal == true:
      - actor.role IN ['agent', 'senior-agent', 'supervisor', 'admin']
    ELSE:
      - ALLOW ALL authorized users

# Policy: Call recordings accessible only during active or recently-closed interactions
- effect: allow
  resource: media.recording
  action: read
  condition:
    AND:
      - interaction.assignedAgentId == request.actor.agentId
        OR actor.role IN ['supervisor', 'admin']
      - interaction.closedAt IS NULL
        OR (NOW() - interaction.closedAt) < 72 hours
```

### 8.4 Data-Level Authorization (Row-Level Security)

#### PostgreSQL RLS Policies

```sql
-- Tenant Isolation (ALL tables)
ALTER TABLE interactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON interactions
  USING (tenant_id = current_setting('app.tenant_id')::UUID);

-- Interaction Access: agents see own + assigned + queue
CREATE POLICY interaction_agent_access ON interactions
  FOR SELECT
  USING (
    assigned_agent_id = current_setting('app.agent_id')::UUID
    OR (status = 'new' AND channel = ANY(
      string_to_array(current_setting('app.agent_channels'), ',')
    ))
    OR current_setting('app.role') IN ('supervisor', 'admin')
  );

-- Ticket Access: agents see own created + assigned
CREATE POLICY ticket_agent_access ON tickets
  FOR SELECT
  USING (
    created_by = current_setting('app.agent_id')::UUID
    OR assigned_agent_id = current_setting('app.agent_id')::UUID
    OR current_setting('app.role') IN ('supervisor', 'admin')
  );

-- Customer Access: only agents with active interaction with this customer
CREATE POLICY customer_agent_access ON customers
  FOR SELECT
  USING (
    id IN (
      SELECT customer_id FROM interactions
      WHERE assigned_agent_id = current_setting('app.agent_id')::UUID
      AND status IN ('new', 'in-progress')
    )
    OR current_setting('app.role') IN ('supervisor', 'admin')
  );

-- Notification Access: agents only see own notifications
CREATE POLICY notification_owner_access ON notifications
  FOR ALL
  USING (recipient_agent_id = current_setting('app.agent_id')::UUID);

-- Audit Log: immutable (no UPDATE/DELETE)
CREATE POLICY audit_immutable ON audit_log
  FOR INSERT
  USING (true);
-- No UPDATE or DELETE policies = implicitly denied

-- BFSI Data: supervisor+ for unmasked data
-- (enforced at application level via permission check before CBS query)
```

#### IDOR Prevention

| Attack Vector | Prevention |
|---|---|
| `/api/v1/interactions/{id}` — agent guesses another agent's interaction ID | RLS policy: `assigned_agent_id = current_agent OR role >= supervisor` |
| `/api/v1/tickets/{id}` — agent accesses unassigned ticket | RLS policy: `created_by = current_agent OR assigned_agent_id = current_agent` |
| `/api/v1/customers/{id}` — agent browses arbitrary customer data | RLS policy: customer must have active interaction with current agent |
| `/api/v1/bfsi/customers/{customerId}/accounts` — agent queries arbitrary financial data | Application-level check: verify active interaction between agent and customer |
| `/api/v1/notifications/{id}/status` — agent modifies another agent's notification | RLS policy: `recipient_agent_id = current_agent` |
| `/api/v1/media/{fileId}` — agent downloads another interaction's recording | Application-level check: verify media belongs to an interaction the agent can access |

---

## 9. Data Architecture

### 9.1 Database Schema Overview

```
PostgreSQL
├── identity (schema)
│   ├── users
│   ├── roles
│   ├── permissions
│   ├── user_roles
│   ├── role_permissions
│   └── sessions
├── agent (schema)
│   ├── agent_profiles
│   ├── agent_channel_status
│   ├── agent_sessions
│   ├── agent_settings
│   └── agent_status_history
├── interaction (schema)
│   ├── interactions
│   ├── call_timeline_events
│   ├── call_notes
│   ├── email_threads
│   ├── email_messages
│   ├── chat_sessions
│   └── chat_messages
├── ticket (schema)
│   ├── tickets
│   ├── ticket_comments
│   └── ticket_attachments
├── customer (schema)
│   ├── customers
│   ├── customer_notes
│   └── customer_preferences
├── notification (schema)
│   ├── notifications
│   └── notification_settings
├── media (schema)
│   └── file_metadata
└── audit (schema)
    └── audit_log (append-only)

MongoDB
├── knowledge_db
│   ├── folders
│   ├── articles
│   ├── bookmarks
│   └── comments
└── ai_db
    ├── suggestion_cache
    └── conversation_history

Redis
├── sessions:{userId}          # Session data (15-min TTL)
├── token-blacklist:{jti}     # Revoked tokens (until expiry)
├── agent-status:{agentId}    # Real-time agent status
├── interaction-sla:{id}      # SLA countdown timers
├── rate-limit:{userId}:{endpoint} # Rate limit counters
└── cache:customer:{id}       # Customer profile cache (5-min TTL)

Elasticsearch
├── interactions-index         # Full-text search on interactions
├── knowledge-index            # Full-text search on KB articles
└── audit-index                # Searchable audit log
```

### 9.2 Data Flow Diagram

```
[Agent Browser] ──HTTPS/WSS──▶ [API Gateway]
                                    │
                    ┌───────────────┼───────────────┐
                    ▼               ▼               ▼
              [Identity Svc]  [Interaction Svc]  [Ticket Svc]
                    │               │               │
                    ▼               ▼               ▼
              [PostgreSQL]    [PostgreSQL]     [PostgreSQL]
              [identity]      [interaction]    [ticket]
                    │               │               │
                    └───────┬───────┘───────┬───────┘
                            ▼               ▼
                      [Kafka Event Bus]   [Redis Cache]
                            │
                    ┌───────┼───────┐
                    ▼       ▼       ▼
              [Audit Svc] [Notif Svc] [Agent Svc]
                    │       │           │
                    ▼       ▼           ▼
              [PG+ES+S3] [PG+Redis] [PG+Redis]
```

---

## 10. User Stories (V2 — Full-Stack)

All V1 user stories (US-1 through US-14) are preserved with their complete acceptance criteria. The following additional V2 user stories address full-stack integration:

---

### US-15 — Authentication & Session Management

**As** a customer service agent,
**I want** to securely log in with my credentials and optionally verify with MFA,
**so that** only authorized agents can access the desktop and customer data.

#### Acceptance Criteria

**AC-15.1 — Login Form**
Given the agent navigates to the application URL,
When they are not authenticated,
Then a login page is shown with username, password fields, and a "Đăng nhập" button.

**AC-15.2 — Successful Login**
When valid credentials are submitted,
Then the API returns JWT tokens, the frontend stores them securely (httpOnly cookie for refresh, memory for access), and the agent is redirected to the main desktop.

**AC-15.3 — MFA Challenge**
When the user has MFA enabled and submits valid credentials,
Then a TOTP code input is shown before granting full access.

**AC-15.4 — Failed Login**
When invalid credentials are submitted,
Then an error message is shown with remaining attempts count. After 5 failures, the account is locked for 30 minutes.

**AC-15.5 — Session Timeout**
When the access token expires (15 minutes),
Then the frontend silently refreshes using the refresh token. If the refresh token is also expired (8 hours), the agent is redirected to login.

**AC-15.6 — Forced Logout**
When a new session is started from another device,
Then the existing session is terminated and the agent sees a "Session ended" message.

**AC-15.7 — Logout**
When the agent clicks "Đăng xuất",
Then the session is revoked server-side, tokens are blacklisted, and the agent is redirected to login.

---

### US-16 — Authorization Enforcement

**As** a system administrator,
**I want** role-based and attribute-based access controls enforced on every API call and UI element,
**so that** agents can only access data and features appropriate to their role and assignments.

#### Acceptance Criteria

**AC-16.1 — UI Element Visibility**
Given the agent's role and permissions,
Then UI elements not permitted for their role are hidden (not just disabled). For example, an `agent` role does not see the "Xóa ticket" button.

**AC-16.2 — API Authorization**
When an API request is made without the required permission,
Then a 403 Forbidden response is returned with error code `INSUFFICIENT_PERMISSIONS`.

**AC-16.3 — IDOR Prevention**
When an agent attempts to access a resource (interaction, ticket, customer) they are not assigned to,
Then a 403 or 404 response is returned (404 preferred to avoid information leakage).

**AC-16.4 — Sensitive Data Gate**
When an agent without `bfsi:read:sensitive` permission attempts to unmask financial data,
Then the API returns masked data regardless of the `sensitiveDataVisible` parameter.

**AC-16.5 — Audit on Denial**
When any authorization check fails,
Then an audit entry is created with `outcome: 'denied'` and the full request context.

---

### US-17 — Real-Time Data Synchronization

**As** a customer service agent,
**I want** interaction queue updates, chat messages, SLA countdowns, call state changes, and notifications delivered in real-time,
**so that** I see up-to-date information without manual refresh.

#### Acceptance Criteria

**AC-17.1 — WebSocket Connection**
When the agent logs in,
Then WebSocket connections are established for: interaction queue, agent status, CTI call events, and notifications.

**AC-17.2 — Reconnection**
When the WebSocket connection drops,
Then the frontend automatically attempts reconnection with exponential backoff (1s, 2s, 4s, 8s, max 30s) and shows a "Đang kết nối lại..." banner.

**AC-17.3 — SLA Real-Time Countdown**
When a chat interaction has `sla.status` of `near-breach` or `not-responded`,
Then the SLA badge countdown updates every second via WebSocket push from the Interaction Service.

**AC-17.4 — Optimistic Updates**
When the agent sends a chat message or updates a status,
Then the UI updates immediately (optimistic) and reconciles with the server response.

---

### US-18 — Audit Trail Visibility

**As** a compliance auditor,
**I want** to view immutable audit logs for all critical actions,
**so that** I can investigate incidents, ensure regulatory compliance, and produce reports.

#### Acceptance Criteria

**AC-18.1 — Audit Log Query**
Given the auditor navigates to the audit dashboard,
Then they can search/filter audit entries by: date range, actor, action type, resource type, resource ID, outcome, and sensitivity level.

**AC-18.2 — Immutability**
No audit log entry can be modified or deleted through any API endpoint or direct database access.

**AC-18.3 — Tamper Detection**
Audit entries are cryptographically chained (SHA-256 hash of previous entry included in current entry). Any gap or modification in the chain triggers a tamper alert.

---

## 11. Correctness Properties (V2)

All V1 correctness properties (CP-1 through CP-10) are preserved. Additional V2 properties:

### CP-11 — JWT Token Lifecycle

**Invariant:** An access token is valid if and only if: (a) it has not expired (`exp` > now), (b) its `jti` is not in the token blacklist (Redis), and (c) the user's session is not revoked. All three conditions are checked on every authenticated API request.

### CP-12 — Tenant Isolation

**Invariant:** Every database query includes `tenant_id = current_tenant` via PostgreSQL Row-Level Security. A user in tenant A can never read, write, or modify data belonging to tenant B, regardless of their role or permissions.

### CP-13 — IDOR Guard

**Invariant:** For every API endpoint that accepts a resource ID parameter, the service verifies that the requesting user has legitimate access to that specific resource instance (not just the resource type). Access is determined by: assignment, ownership, team membership, or escalated role.

### CP-14 — Audit Completeness

**Invariant:** Every state-changing API call (POST, PUT, DELETE) and every access to sensitive data (BFSI queries, call recordings, customer PII) generates exactly one audit entry. The audit entry count for a given `correlationId` equals the number of state-changing operations performed in that request.

### CP-15 — Sensitive Data Masking

**Invariant:** The BFSI Core Banking Service returns masked data by default. Unmasked data is returned only when ALL of the following are true: (a) `sensitiveDataVisible=true` in the request, (b) the requesting user has `bfsi:read:sensitive` permission, (c) the user has an active interaction with the specified customer. If any condition fails, masked data is returned (not an error).

### CP-16 — SLA Timer Server Authority

**Invariant:** The SLA countdown timer is owned by the Interaction Service (server-side). The client receives timer ticks via WebSocket. The client MUST NOT independently compute SLA status from a snapshot — it must rely on server-pushed `sla.status` values to prevent clock-skew discrepancies.

### CP-17 — Concurrent Session Exclusion

**Invariant:** At most one active session exists per agent. Starting a new session invalidates all previous sessions for that agent. The previous session's WebSocket connections are terminated with a `session.superseded` event.

---

## 12. Non-Functional Requirements (V2)

All V1 NFRs are preserved. Additional V2 requirements:

### NFR-6 — Backend Performance

| Metric | Target | Measurement |
|---|---|---|
| API response time (P50) | < 100ms | Excluding BFSI proxy calls |
| API response time (P99) | < 500ms | Excluding BFSI proxy calls |
| BFSI query response time (P50) | < 1s | Including CBS round-trip |
| BFSI query response time (P99) | < 3s | Including CBS round-trip |
| WebSocket message latency | < 50ms | Server to client |
| Kafka event processing | < 200ms | Event published to consumer processed |
| Database query time (P99) | < 100ms | With RLS policies active |

### NFR-7 — Scalability

| Component | Scaling Strategy | Target |
|---|---|---|
| API Gateway | Horizontal (auto-scale) | 10,000 concurrent agents |
| Interaction Service | Horizontal (stateless) | 50,000 concurrent interactions |
| Chat WebSocket | Horizontal (sticky sessions via Redis pub/sub) | 20,000 concurrent chat sessions |
| CTI Gateway | Horizontal (SIP trunk pooling) | 5,000 concurrent calls |
| Notification Service | Horizontal | 100,000 notifications/minute |
| PostgreSQL | Primary + read replicas | Read replicas for list/search queries |
| Redis | Cluster mode | 6-node cluster |
| Elasticsearch | 3-node cluster | Index sharding by tenant |

### NFR-8 — Availability

| Component | SLA Target | Strategy |
|---|---|---|
| Overall Platform | 99.95% uptime | Multi-AZ deployment |
| CTI Gateway | 99.99% uptime | Active-active with SIP failover |
| Database | 99.99% uptime | Primary-standby with auto-failover |
| WebSocket | 99.9% uptime | Auto-reconnect with exponential backoff |

### NFR-9 — Security Compliance

| Standard | Scope | Compliance Level |
|---|---|---|
| OWASP Top 10 (2021) | All web-facing APIs | Full compliance |
| PCI-DSS v4.0 | Card data handling (MS-8) | SAQ-A (no card data storage) |
| ISO 27001 | Information security management | Aligned |
| Vietnam Circular 09/2020/TT-NHNN | Banking IT security | Full compliance |
| PDPA (Vietnam) | Customer data privacy | Full compliance |

### NFR-10 — Disaster Recovery

| Metric | Target |
|---|---|
| RPO (Recovery Point Objective) | < 5 minutes (streaming replication) |
| RTO (Recovery Time Objective) | < 30 minutes (automated failover) |
| Backup Frequency | Continuous (WAL streaming) + daily full snapshots |
| Cross-Region DR | Active-passive in secondary region |

---

## 13. Constraints & Assumptions (V2)

### Constraints

| # | Constraint | Source |
|---|---|---|
| C-V2-1 | All microservices must communicate over mTLS. No plaintext HTTP between services. | BFSI Security Mandate |
| C-V2-2 | Core Banking System (CBS) is a legacy system accessed via SOAP/REST gateway. Response times may exceed 2 seconds. | Infrastructure assessment |
| C-V2-3 | Call recordings must be stored within Vietnam jurisdiction (data residency requirement). | Circular 09/2020/TT-NHNN |
| C-V2-4 | Maximum session duration is 8 hours (shift-aligned). Agents must re-authenticate after shift boundary. | HR policy |
| C-V2-5 | Audit logs must be retained for minimum 7 years and must be immutable (append-only). | Banking regulation |
| C-V2-6 | All PII must be field-level encrypted in the database. Database-level TDE alone is insufficient. | Security review |
| C-V2-7 | The system must support at least 2 tenants (TPB production + TPB UAT) with complete data isolation. | Multi-tenant requirement |
| C-V2-8 | Frontend must use React Query (TanStack Query) for server-state management to replace mock data in V1 Context providers. | Architecture decision |
| C-V2-9 | Radix UI version pinning from V1 must be preserved in Vite config. | V1 Constraint C-2 |

### Assumptions

| # | Assumption |
|---|---|
| A-V2-1 | The Core Banking System provides REST API endpoints for all 8 BFSI product categories with response schemas compatible with the entity definitions in MS-8. |
| A-V2-2 | The CTI provider supports SIP trunk integration and WebRTC for browser-based voice. |
| A-V2-3 | Kafka is the approved enterprise event bus. No alternative message brokers are in scope. |
| A-V2-4 | PostgreSQL 15+ is the approved relational database. Row-Level Security is natively supported. |
| A-V2-5 | HashiCorp Vault is available for secret and key management. |
| A-V2-6 | The infrastructure team provides Kubernetes clusters with Istio service mesh pre-configured. |
| A-V2-7 | The AI Service uses an internal LLM deployment (not external cloud LLM) for data sovereignty compliance. |
| A-V2-8 | All V1 frontend component interfaces (props, events) remain stable. Backend integration adds data fetching without modifying component rendering logic. |
| A-V2-9 | Agent workstations have stable network connectivity. Offline mode is not required. |

---

## Appendix A: V1 User Stories & Acceptance Criteria (Preserved)

All user stories US-1 through US-14 from RequirementsV1.md are preserved in full with all acceptance criteria unchanged. The V2 backend services are designed to supply all data currently mocked in `App.tsx`. The frontend component interfaces remain stable; only data source changes from mock to API.

### V1 → V2 Migration Path (Per User Story)

| V1 US | V1 Data Source | V2 Data Source | Migration Complexity |
|---|---|---|---|
| US-1 | `App.tsx` hardcoded interactions array | `GET /api/v1/interactions` + WebSocket queue | Medium — replace local filter with server-side query params |
| US-2 | `App.tsx` recording/timeline mock | `GET /api/v1/interactions/{id}` + `GET /api/v1/media/{id}/stream` | Medium |
| US-3 | `App.tsx` email thread mock | `GET /api/v1/interactions/{id}/email/thread` + `POST .../reply` | Medium |
| US-4 | `App.tsx` chatSLA mock (static) | WebSocket SLA ticks from Interaction Service | High — replace static with real-time |
| US-5 | `InteractionDetail.tsx` hardcoded chips | `GET /api/v1/ai/suggestions/{id}` + `POST /api/v1/ai/generate` | Low |
| US-6 | `KnowledgeBaseSearch.tsx` mock folders | `GET /api/v1/knowledge/folders` + `GET /api/v1/knowledge/search` | Medium |
| US-7 | `CreateTicketDialog.tsx` local state | `POST /api/v1/tickets` + `GET /api/v1/tickets/{id}` | Medium |
| US-8 | `InformationQuery.tsx` mock BFSI data | `GET /api/v1/bfsi/customers/{id}/{category}` | High — CBS integration |
| US-9 | `CallContext.tsx` + `FloatingCallWidget.tsx` | WebSocket CTI events | High — real CTI integration |
| US-10 | `TransferCallDialog.tsx` hardcoded agents | `GET /api/v1/agents` + `POST /api/v1/interactions/{id}/transfer` | Medium |
| US-11 | `EnhancedAgentStatusContext.tsx` local state | `PUT /api/v1/agents/me/status/{channel}` + WebSocket sync | Medium |
| US-12 | `NotificationContext.tsx` local state | `GET /api/v1/notifications` + WebSocket push | Medium |
| US-13 | `CustomerInfoScrollFixed.tsx` mock | `GET /api/v1/customers/{id}` + tabs use respective APIs | Medium |
| US-14 | `App.tsx` mock demo controls | Real data from Interaction Service stats | Low |

---

## Appendix B: API Endpoint Summary (Complete)

Total API endpoints: **73**

| Service | Endpoints | Base Path |
|---|---|---|
| Identity Service | 10 | `/api/v1/auth/*`, `/api/v1/users/*`, `/api/v1/roles` |
| Agent Service | 11 | `/api/v1/agents/*` |
| Interaction Service | 16 | `/api/v1/interactions/*` |
| Ticket Service | 9 | `/api/v1/tickets/*` |
| Customer Service | 7 | `/api/v1/customers/*` |
| Notification Service | 8 | `/api/v1/notifications/*` |
| Knowledge Service | 9 | `/api/v1/knowledge/*` |
| BFSI Core Banking Service | 8 | `/api/v1/bfsi/*` |
| AI Service | 3 | `/api/v1/ai/*` |
| Media Service | 5 | `/api/v1/media/*` |
| Audit Service | 4 | `/api/v1/audit/*` |

Total WebSocket channels: **7**

| Channel | Service |
|---|---|
| `/ws/agent/{agentId}/status` | Agent Service |
| `/ws/agent/{agentId}/presence` | Agent Service |
| `/ws/interactions/{agentId}/queue` | Interaction Service |
| `/ws/interactions/{interactionId}/chat` | Interaction Service |
| `/ws/interactions/{interactionId}/sla` | Interaction Service |
| `/ws/notifications/{agentId}` | Notification Service |
| `/ws/cti/{agentId}/call` | CTI Gateway |

---

*End of FullStack-RequirementsV2.md — Agent Desktop TPB Full-Stack Specification*
*Generated: 2026-03-06 | Baseline: RequirementsV1.md (2026-03-04)*
*Compliance: BFSI Security Standards | OWASP Top 10 | PCI-DSS (SAQ-A)*
*Architecture: 12 Microservices | 73 API Endpoints | 7 WebSocket Channels*
