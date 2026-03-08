---
inclusion: auto
---

# Integration Points & Service Dependencies

**Project:** TPB CRM Platform
**Last Updated:** 2026-03-08
**Purpose:** Document integration points between services and external systems

## 📋 Overview

This document tracks:
- Service-to-service communication patterns
- External system integrations
- Event flows
- WebSocket channels
- Shared data contracts

---

## Service Dependency Map

```
┌─────────────────────────────────────────────────────────────────┐
│                         API Gateway (Kong)                       │
│                    All external traffic enters here              │
└────────────────────────────┬────────────────────────────────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
        ▼                    ▼                    ▼
   ┌─────────┐         ┌─────────┐         ┌─────────┐
   │  MS-1   │         │  MS-2   │         │  MS-3   │
   │Identity │◄────────┤ Agent   │◄────────┤Interact.│
   │ Service │         │ Service │         │ Service │
   └────┬────┘         └────┬────┘         └────┬────┘
        │                   │                    │
        │                   │                    │
        ▼                   ▼                    ▼
   ┌─────────────────────────────────────────────────┐
   │           Kafka Event Bus (All Events)          │
   └─────────────────────────────────────────────────┘
                             │
                             ▼
                        ┌─────────┐
                        │  MS-11  │
                        │  Audit  │
                        │ Service │
                        └─────────┘
```

---

## Phase 1 Integration Points

### MS-1 (Identity) → All Services

**Pattern:** JWT Validation (Synchronous)
**Protocol:** Internal mTLS
**Status:** ⚪ Not Started

| Calling Service | Endpoint | Purpose | Phase |
|---|---|---|---|
| All Services | `POST /auth/policy/evaluate` | RBAC/ABAC validation | Phase 1 |

**Data Contract:**
```typescript
interface PolicyEvaluationRequest {
  userId: string;
  resource: string;
  action: string;
  context?: Record<string, any>;
}

interface PolicyEvaluationResponse {
  allowed: boolean;
  reason?: string;
}
```

---

### MS-2 (Agent) → MS-3 (Interaction)

**Pattern:** Event-Driven (Asynchronous)
**Protocol:** Kafka
**Status:** ⚪ Not Started

**Events Published by MS-2:**

| Event | Topic | Payload | Consumers | Phase |
|---|---|---|---|---|
| `agent.status.changed` | `agent-events` | `{agentId, channel, status, reason, timestamp}` | MS-3, MS-6 | Phase 1 |
| `agent.session.started` | `agent-events` | `{agentId, sessionId, timestamp}` | MS-3 | Phase 1 |
| `agent.session.ended` | `agent-events` | `{agentId, sessionId, duration, timestamp}` | MS-3 | Phase 1 |

**Integration Logic:**
- When agent goes `not-ready`, MS-3 stops routing interactions to that agent on that channel
- When agent goes `ready`, MS-3 resumes routing

---

### MS-3 (Interaction) → MS-5 (Customer)

**Pattern:** Request-Response (Synchronous)
**Protocol:** REST over mTLS
**Status:** ⚪ Not Started

| Endpoint | Purpose | Phase |
|---|---|---|
| `GET /api/v1/customers/{id}` | Fetch customer profile for interaction detail | Phase 1 |
| `GET /api/v1/customers/{id}/interactions` | Fetch customer history | Phase 1 |

**Data Flow:**
1. Agent opens interaction detail
2. Frontend calls MS-3 `GET /interactions/{id}`
3. MS-3 returns interaction with `customerId`
4. Frontend calls MS-5 `GET /customers/{customerId}`
5. Customer info displayed in right panel

---

### MS-3 (Interaction) → MS-6 (Notification)

**Pattern:** Event-Driven (Asynchronous)
**Protocol:** Kafka
**Status:** ⚪ Not Started

**Events Published by MS-3:**

| Event | Topic | Payload | Purpose | Phase |
|---|---|---|---|---|
| `interaction.created` | `interaction-events` | `{interactionId, type, channel, customerId, assignedAgentId}` | Notify assigned agent | Phase 1 |
| `interaction.assigned` | `interaction-events` | `{interactionId, agentId, timestamp}` | Notify agent of assignment | Phase 1 |
| `sla.warning` | `sla-events` | `{interactionId, chatSessionId, remainingSeconds}` | Warn agent of SLA risk | Phase 1 |
| `sla.breached` | `sla-events` | `{interactionId, chatSessionId, thresholdMinutes, actualSeconds}` | Alert agent + supervisor | Phase 1 |

---

### MS-4 (Ticket) → MS-6 (Notification)

**Pattern:** Event-Driven (Asynchronous)
**Protocol:** Kafka
**Status:** ⚪ Not Started

**Events Published by MS-4:**

| Event | Topic | Payload | Purpose | Phase |
|---|---|---|---|---|
| `ticket.created` | `ticket-events` | `{ticketId, customerId, assignedAgentId, priority}` | Notify assigned agent | Phase 1 |
| `ticket.assigned` | `ticket-events` | `{ticketId, agentId, timestamp}` | Notify agent | Phase 1 |
| `ticket.commented` | `ticket-events` | `{ticketId, commentId, agentId}` | Notify watchers | Phase 1 |

---

### All Services → MS-11 (Audit)

**Pattern:** Event-Driven (Asynchronous)
**Protocol:** Kafka
**Status:** ⚪ Not Started

**Events Published by ALL Services:**

| Event Pattern | Topic | Payload | Phase |
|---|---|---|---|
| `*.created` | `audit-events` | `{eventType, actorId, resourceType, resourceId, action, newValues, timestamp}` | Phase 1 |
| `*.updated` | `audit-events` | `{eventType, actorId, resourceType, resourceId, action, oldValues, newValues, timestamp}` | Phase 1 |
| `*.deleted` | `audit-events` | `{eventType, actorId, resourceType, resourceId, action, oldValues, timestamp}` | Phase 1 |

**Audit Interceptor (NestJS):**
```typescript
// libs/nest-common/src/interceptors/audit.interceptor.ts
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  async intercept(context: ExecutionContext, next: CallHandler) {
    const request = context.switchToHttp().getRequest();
    const { method, url, user, body } = request;
    
    // Only audit mutating operations
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
      // Publish to Kafka audit-events topic
      await this.kafkaService.emit('audit-events', {
        eventType: this.deriveEventType(method, url),
        actorId: user.id,
        actorRole: user.roles[0],
        resourceType: this.extractResourceType(url),
        resourceId: this.extractResourceId(url),
        action: this.mapMethodToAction(method),
        newValues: body,
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'],
        timestamp: new Date().toISOString(),
      });
    }
    
    return next.handle();
  }
}
```

---

## Phase 2 Integration Points

### MS-3 (Interaction) → MS-10 (Media)

**Pattern:** Request-Response (Synchronous)
**Protocol:** REST over mTLS
**Status:** ⚪ Not Started

| Endpoint | Purpose | Phase |
|---|---|---|
| `GET /api/v1/media/recordings/{interactionId}` | Fetch call recordings | Phase 2 |
| `GET /api/v1/media/recordings/{id}/stream` | Get streaming URL | Phase 2 |

---

### MS-3 (Interaction) → MS-9 (AI)

**Pattern:** Request-Response (Synchronous)
**Protocol:** REST over mTLS
**Status:** ⚪ Not Started

| Endpoint | Purpose | Phase |
|---|---|---|
| `POST /api/v1/ai/suggest` | Get AI response suggestions | Phase 2 |
| `POST /api/v1/ai/summarize` | Summarize interaction | Phase 2 |

---

### MS-5 (Customer) → MS-16 (Data Enrichment)

**Pattern:** Event-Driven + Webhook (Asynchronous)
**Protocol:** Kafka + REST
**Status:** ⚪ Not Started

**Flow:**
1. MS-5 publishes `customer.accessed` event
2. MS-16 consumes event, checks if enrichment needed
3. MS-16 queries external systems (CBS, Credit Bureau)
4. MS-16 calls webhook `POST /api/v1/customers/{id}/enrichment` on MS-5
5. MS-5 updates customer record, publishes `customer.fields.updated` event
6. Frontend receives WebSocket push, updates UI

**Events:**

| Event | Topic | Payload | Phase |
|---|---|---|---|
| `customer.accessed` | `customer-events` | `{customerId, fields, timestamp}` | Phase 3 |
| `customer.fields.updated` | `customer-events` | `{customerId, updatedFields, source}` | Phase 3 |

---

### MS-13 (Object Schema) → All Object Services

**Pattern:** Event-Driven (Asynchronous)
**Protocol:** Kafka
**Status:** ⚪ Not Started

**Events Published by MS-13:**

| Event | Topic | Payload | Consumers | Phase |
|---|---|---|---|---|
| `schema.updated` | `schema-events` | `{objectType, version, changes}` | MS-3, MS-4, MS-5, MS-7, MS-8 | Phase 2 |
| `schema.field.added` | `schema-events` | `{objectType, fieldId, fieldDefinition}` | Object services | Phase 2 |
| `schema.field.removed` | `schema-events` | `{objectType, fieldId}` | Object services | Phase 2 |

**Integration Logic:**
- Object services cache schemas in Redis (5-min TTL)
- On `schema.updated` event, invalidate cache
- Services reload schema on next request

---

### MS-15 (Workflow) → Temporal

**Pattern:** Workflow Orchestration
**Protocol:** Temporal SDK
**Status:** ⚪ Not Started

**Workflow Triggers:**

| Trigger Event | Workflow | Actions | Phase |
|---|---|---|---|
| `sla.breached` | `SLA Escalation` | Notify supervisor, escalate ticket, send SMS | Phase 3 |
| `ticket.created` | `Auto-Assignment` | Find available agent, assign ticket, notify | Phase 3 |
| `customer.vip.detected` | `VIP Routing` | Route to senior agent, notify manager | Phase 3 |

---

## External System Integrations

### Core Banking System (CBS)

**Pattern:** Request-Response (Synchronous)
**Protocol:** REST / SOAP (adapter pattern)
**Service:** MS-8 (BFSI Core Banking)
**Status:** ⚪ Not Started (mock in Phase 2, real in Phase 3)

**Endpoints (CBS → MS-8):**
- Account balance query
- Transaction history
- Loan details
- Card status

**Security:**
- mTLS client certificate
- API key authentication
- Field-level encryption (account numbers, balances)

---

### CTI Systems (Genesys / Avaya / Asterisk)

**Pattern:** Event-Driven + Command (Bidirectional)
**Protocol:** Vendor SDK (WebSocket / SIP)
**Service:** MS-19 (CTI Adapter)
**Status:** ⚪ Not Started

**Events from CTI → MS-19:**
- `call.incoming`
- `call.answered`
- `call.ended`
- `call.transferred`

**Commands from MS-19 → CTI:**
- Answer call
- Hangup
- Transfer (blind/attended)
- Hold/Resume
- Mute/Unmute

---

### Apache Superset (BI)

**Pattern:** Request-Response (Synchronous)
**Protocol:** REST
**Service:** MS-18 (Report Service)
**Status:** ⚪ Not Started

**Integration:**
- MS-18 acts as proxy
- Generates guest tokens for embedded reports
- Agents never access Superset directly

**Endpoints (MS-18 → Superset):**
- `POST /api/v1/security/guest_token/` - Generate guest token
- `GET /api/v1/chart/{id}` - Fetch chart metadata
- `GET /api/v1/dashboard/{id}` - Fetch dashboard metadata

---

## WebSocket Channels (Real-Time)

### Frontend → Backend WebSocket Connections

**Protocol:** STOMP over WebSocket (WSS)
**Status:** ⚪ Not Started

| Channel | Service | Direction | Purpose | Phase |
|---|---|---|---|---|
| `/ws/agent/{agentId}/status` | MS-2 | Bidirectional | Agent status sync | Phase 1 |
| `/ws/agent/{agentId}/presence` | MS-2 | Server→Client | Presence updates | Phase 1 |
| `/ws/interactions/{agentId}/queue` | MS-3 | Server→Client | Queue updates | Phase 1 |
| `/ws/interactions/{interactionId}/chat` | MS-3 | Bidirectional | Chat messages | Phase 1 |
| `/ws/interactions/{interactionId}/sla` | MS-3 | Server→Client | SLA countdown | Phase 1 |
| `/ws/notifications/{agentId}` | MS-6 | Server→Client | Push notifications | Phase 1 |
| `/ws/cti/{agentId}/call` | MS-19 | Bidirectional | Call control | Phase 2 |
| `/ws/objects/{objectType}/{objectId}/fields` | MS-5 | Server→Client | Field enrichment | Phase 3 |

---

## Shared Data Contracts (packages/shared-types)

### Core Types

```typescript
// packages/shared-types/src/user.types.ts
export interface User {
  id: string;
  username: string;
  email: string;
  fullName: string;
  agentId?: string;
  roles: string[];
  permissions: string[];
  tenantId: string;
}

// packages/shared-types/src/agent.types.ts
export interface AgentProfile {
  id: string;
  userId: string;
  agentId: string;
  displayName: string;
  department: string;
  team: string;
  skills: Skill[];
}

export interface AgentChannelStatus {
  agentId: string;
  channel: 'voice' | 'email' | 'chat';
  status: 'ready' | 'not-ready' | 'disconnected';
  reason?: string;
  duration: number;
  changedAt: string;
}

// packages/shared-types/src/interaction.types.ts
export interface Interaction {
  id: string;
  displayId: string;
  type: 'call' | 'missed-call' | 'email' | 'chat';
  channel: 'voice' | 'email' | 'chat';
  status: InteractionStatus;
  priority: Priority;
  customerId: string;
  customerName: string;
  assignedAgentId?: string;
  assignedAgentName?: string;
  subject?: string;
  tags: string[];
  isVIP: boolean;
  direction: 'inbound' | 'outbound';
  createdAt: string;
  updatedAt: string;
}

// packages/shared-types/src/notification.types.ts
export interface Notification {
  id: string;
  type: 'call' | 'chat' | 'ticket' | 'sla' | 'system';
  priority: Priority;
  state: 'new' | 'viewed' | 'actioned' | 'dismissed';
  title: string;
  message: string;
  actionUrl?: string;
  actionLabel?: string;
  createdAt: string;
}
```

---

## Kafka Topics Registry

**Status:** ⚪ Not Started

| Topic | Producers | Consumers | Retention | Phase |
|---|---|---|---|---|
| `agent-events` | MS-2 | MS-3, MS-6 | 7 days | Phase 1 |
| `interaction-events` | MS-3 | MS-6, MS-11 | 30 days | Phase 1 |
| `ticket-events` | MS-4 | MS-6, MS-11 | 30 days | Phase 1 |
| `customer-events` | MS-5 | MS-16, MS-11 | 30 days | Phase 1 |
| `notification-events` | MS-6 | MS-11 | 7 days | Phase 1 |
| `sla-events` | MS-3 | MS-6, MS-15, MS-11 | 30 days | Phase 1 |
| `audit-events` | All Services | MS-11 | 7 years | Phase 1 |
| `schema-events` | MS-13 | MS-3, MS-4, MS-5, MS-7, MS-8 | 30 days | Phase 2 |
| `workflow-events` | MS-15 | MS-11 | 30 days | Phase 3 |

---

## Redis Cache Keys

**Status:** ⚪ Not Started

| Key Pattern | Service | TTL | Purpose | Phase |
|---|---|---|---|---|
| `session:{userId}` | MS-1 | 15 min | JWT session | Phase 1 |
| `refresh_token:{tokenHash}` | MS-1 | 7 days | Refresh token | Phase 1 |
| `agent_status:{agentId}` | MS-2 | 5 min | Agent status cache | Phase 1 |
| `schema:{objectType}` | MS-13 | 5 min | Schema cache | Phase 2 |
| `layout:{objectType}:{context}` | MS-14 | 5 min | Layout cache | Phase 2 |

---

## 📝 Update Instructions

**When implementing an integration:**
1. Change status from ⚪ to 🟡 (in progress)
2. Document actual implementation details
3. When complete, change to ✅
4. Note any deviations from plan
5. Update "Last Updated" date

**Status Legend:**
- ⚪ Planned
- 🟡 In Progress
- ✅ Implemented
- 🔴 Deprecated
- ⚠️ Breaking Change

---

## 📚 References

- **FullStack-RequirementsV2.md** - Service specifications
- **FullStack-RequirementsV3.md** - Extended service specifications
- **02-architecture-decisions.md** - ADRs for integration patterns
