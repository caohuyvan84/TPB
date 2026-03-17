<!-- Part of: docs/omnichannel-upgrade/ — See INDEX.md for navigation -->

# 1. Current State Analysis

## 1.1 Interaction Service (MS-3) — Port 3003

**Entities:**

| Entity | Columns | Key Fields |
|---|---|---|
| `Interaction` | 20 | `channel: 'voice' \| 'email' \| 'chat'`, `type: 'call' \| 'missed-call' \| 'email' \| 'chat'`, `status`, `priority`, `customerId`, `assignedAgentId`, `slaDueAt`, `slaBreached`, `metadata: jsonb`, `dynamicFields: jsonb` |
| `InteractionNote` | 8 | `interactionId`, `agentId`, `content`, `tag`, `isPinned` |
| `InteractionEvent` | 8 | `interactionId`, `type`, `timestamp`, `duration`, `data: jsonb` |

**Service Methods (6):**
- `listInteractions(filters)` — basic CRUD with status/channel/agent/customer filters, hardcoded `take: 50`
- `getInteraction(id)` — single fetch, no relations loaded
- `updateStatus(id, status)` — sets `closedAt` when status = 'closed'
- `assignAgent(id, agentId, agentName)` — direct assignment, no capacity check
- `getNotes(interactionId)` — list notes DESC
- `addNote(interactionId, agentId, agentName, content, tag, isPinned)` — create note

**Controller Endpoints (7):**
- `GET /interactions` — list with query filters
- `GET /interactions/:id` — get one
- `PUT /interactions/:id/status` — update status
- `POST /interactions/:id/assign` — assign agent
- `PUT /interactions/:id/assign` — assign agent (duplicate)
- `GET /interactions/:id/notes` — get notes
- `POST /interactions/:id/notes` — add note

**What's Missing:**
- No WebSocket gateway for real-time updates
- No Kafka event publishing
- No queue management or routing logic
- No SLA engine (fields exist but no enforcement)
- No transfer logic between agents
- No `createInteraction` method (no way to create new interactions via API)
- No pagination (hardcoded `take: 50`)
- No timeline endpoint (frontend expects `/interactions/:id/timeline`)
- No transfer endpoint (frontend expects `POST /interactions/:id/transfer`)

## 1.2 Agent Service (MS-2) — Port 3002

**Entities:**

| Entity | Columns | Key Fields |
|---|---|---|
| `AgentProfile` | 11 | `userId`, `agentId`, `displayName`, `department`, `team`, `skills: string[]`, `maxConcurrentChats: 3`, `maxConcurrentEmails: 5` |
| `AgentChannelStatus` | 6 | `agentId`, `channel: 'voice' \| 'email' \| 'chat'`, `status: 'ready' \| 'not-ready' \| 'disconnected'`, `reason`, `customReason` |
| `AgentSession` | 7 | `agentId`, `loginAt`, `logoutAt`, `connectionStatus`, `lastHeartbeatAt`, `ipAddress` |

**Service Methods (8):**
- `getAgentProfile(userId, displayName)` — auto-creates profile on first access
- `getChannelStatuses(agentId)` — list channel statuses
- `setChannelStatus(agentId, channel, status, reason, customReason)` — upsert
- `setAllChannelsStatus(agentId, status, reason)` — hardcoded `['voice', 'email', 'chat']` loop
- `heartbeat(agentId, ipAddress)` — update session heartbeat
- `listAgents()` — basic list, limited select fields
- `getAgentById(agentId)` — with channelStatuses relation
- `checkAvailability(agentId)` — returns per-channel availability

**WebSocket Gateway (agent.gateway.ts):**
- Namespace: `/agent`
- Events: `status:update` (receive), `status:changed` (broadcast)
- `presence:subscribe` — join room `agent:{agentId}`
- No heartbeat via WS, no disconnect cleanup

**Controller Endpoints (7):**
- `GET /agents/me` — get/create own profile
- `GET /agents/me/status` — get channel statuses
- `PUT /agents/me/status/all` — set all channels
- `PUT /agents/me/status/:channel` — set one channel
- `POST /agents/me/heartbeat` — heartbeat
- `GET /agents` — list all agents
- `GET /agents/:agentId` — get agent by ID
- `GET /agents/:agentId/availability` — check availability

**What's Missing:**
- Skills = flat `string[]`, no proficiency levels, no skill categories
- No agent groups / teams CRUD
- No capacity tracking (concurrent interaction count vs max)
- No skill-based or group-based routing integration
- No Redis for hot-state (all state in PostgreSQL)
- No login/logout session management via WS
- No Kafka event publishing
- No supervisor/admin endpoints for managing agents

## 1.3 CTI Adapter Service (MS-19) — Port 3019

**Entities:**

| Entity | Columns | Key Fields |
|---|---|---|
| `CtiConfig` | 6 | `tenantId`, `vendor`, `config: jsonb`, `isActive` |

**Adapter Pattern:**
```typescript
interface ICtiAdapter {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  answerCall(callId: string): Promise<void>;
  hangupCall(callId: string): Promise<void>;
  holdCall(callId: string): Promise<void>;
  resumeCall(callId: string): Promise<void>;
  transferCall(callId: string, destination: string): Promise<void>;
  muteCall(callId: string): Promise<void>;
  unmuteCall(callId: string): Promise<void>;
}
```

**Only Implementation:** `MockCtiAdapter` — all methods are `console.log` stubs.

**Service Methods (6):**
- `getAdapter(tenantId)` — lazy-loads from config, always returns MockCtiAdapter
- `answerCall`, `hangupCall`, `holdCall`, `transferCall` — delegate to adapter
- `getConfig`, `updateConfig` — admin CRUD

**Controller Endpoints (6):**
- `POST /cti/calls/answer`
- `POST /cti/calls/hangup`
- `POST /cti/calls/hold`
- `POST /cti/calls/transfer`
- `GET /admin/cti/config`
- `PATCH /admin/cti/config`

**What's Missing:**
- No real PBX integration (FreeSWITCH or other)
- No WebRTC/SIP support
- No IVR flow execution
- No call recording integration
- No call event WebSocket gateway
- No `makeCall`, `conferenceCall`, `resumeCall`, `muteCall` endpoints
- No call queue management
- No CDR (Call Detail Records) storage

## 1.4 Notification Service (MS-6) — Port 3006

**Entity:** `Notification` — 14 columns (`type`, `priority`, `state`, `title`, `message`, `actionUrl`, `metadata`, `autoHideSeconds`, `expiresAt`)

**Service Methods (5):**
- `listNotifications(agentId, limit)` — list DESC
- `getUnreadCount(agentId)` — count where state = 'new'
- `updateState(id, state)` — update state
- `markAllRead(agentId)` — bulk update new → viewed
- `createNotification(data)` — create

**Controller Endpoints (4):**
- `GET /notifications` — list
- `GET /notifications/unread-count` — count
- `PATCH /notifications/:id/state` — update state
- `POST /notifications/mark-all-read` — mark all read

**What's Missing:**
- No WebSocket gateway (frontend stubs exist pointing to port 3006)
- No push notification integration (FCM/APNs)
- No notification templates
- No notification preferences/subscriptions per agent
- No Kafka consumer for event-driven notifications

## 1.5 Frontend (Agent Desktop)

**WebSocket Clients (3 separate connections):**

| Client | File | Target | Protocol |
|---|---|---|---|
| `wsClient` | `websocket-client.ts` | `localhost:8000` (Kong) | Socket.IO |
| `ctiChannel` | `cti-channel.ts` | `localhost:3019` (CTI) | Socket.IO |
| `notificationChannel` | `notification-channel.ts` | `localhost:3006` (Notification) | Socket.IO |
| `queueChannel` | `interaction-queue-channel.ts` | Uses `wsClient` | Socket.IO (shared) |

**Channel Filters Already in UI:**
- Main filters: `all`, `voice`, `email`, `chat`, `missed`
- Chat sub-filters: `facebook`, `zalo`, `livechat` (defined in InteractionList component)
- Per-channel agent status: `voice`, `email`, `chat`

**API Clients:**
- `interactions-api.ts` — 8 methods including `transfer` and `getTimeline` (backend doesn't implement these)
- `cti-api.ts` — 6 methods matching CTI controller
- `notifications-api.ts` — matches notification controller

**Type Definitions:**
- `Interaction.channel: 'voice' | 'email' | 'chat'` — needs expansion
- `Interaction.type: 'call' | 'missed-call' | 'email' | 'chat'` — needs expansion
- `CtiConfig.provider: 'webex_cc' | 'freeswitch'` — only voice PBX

---

## Related Files

- [02-gap-analysis.md](./02-gap-analysis.md) — Feature and code-level gaps derived from this analysis
- [03-requirements.md](./03-requirements.md) — User requirements that address the identified gaps
- [04-target-architecture.md](./04-target-architecture.md) — Target architecture designed to close these gaps
- [05-new-services.md](./05-new-services.md) — New services introduced to fill missing capabilities
