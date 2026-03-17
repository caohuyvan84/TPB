# Omnichannel Contact Center Upgrade Plan

**Document Version:** 1.1
**Date:** 2026-03-16
**Status:** Draft — For Review & Approval
**Scope:** Upgrade TPB CRM Platform from basic interaction management to a professional-grade Omnichannel Contact Center

---

## Table of Contents

1. [Current State Analysis](#1-current-state-analysis)
2. [Gap Analysis](#2-gap-analysis)
3. [User Requirements Summary](#3-user-requirements-summary)
4. [Target Architecture](#4-target-architecture)
5. [New Services & Modules](#5-new-services--modules)
6. [Channel Adapter Plugin Architecture](#6-channel-adapter-plugin-architecture)
7. [Routing Engine Design](#7-routing-engine-design)
8. [Agent State Management](#8-agent-state-management)
9. [Channel-Specific Designs](#9-channel-specific-designs)
10. [Flow Designer Engine](#10-flow-designer-engine)
11. [Expanded Type System](#11-expanded-type-system)
12. [Performance Architecture](#12-performance-architecture)
13. [Admin UI Requirements](#13-admin-ui-requirements)
14. [Frontend Agent Desktop Changes](#14-frontend-agent-desktop-changes)
15. [Phased Implementation Plan](#15-phased-implementation-plan)
16. [Risk Assessment](#16-risk-assessment)
17. [Requirements Cross-Reference](#17-requirements-cross-reference)
18. [PortSIP v22.3 Integration Design](#18-portsip-v223-integration-design)
    - [18.10 IVR Architecture (Virtual Receptionist + Webhook)](#1810-ivr-architecture-virtual-receptionist--webhook)
    - [18.11 Agent State Reliability & Anti-Desync](#1811-agent-state-reliability--anti-desync)
    - [18.12 Call Routing Failure Handling](#1812-call-routing-failure-handling)

---

## 1. Current State Analysis

### 1.1 Interaction Service (MS-3) — Port 3003

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

### 1.2 Agent Service (MS-2) — Port 3002

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

### 1.3 CTI Adapter Service (MS-19) — Port 3019

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
- No real PBX integration (Cisco Webex CC, FreeSWITCH)
- No WebRTC/SIP support
- No IVR flow execution
- No call recording integration
- No call event WebSocket gateway
- No `makeCall`, `conferenceCall`, `resumeCall`, `muteCall` endpoints
- No call queue management
- No CDR (Call Detail Records) storage

### 1.4 Notification Service (MS-6) — Port 3006

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

### 1.5 Frontend (Agent Desktop)

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

## 2. Gap Analysis

### 2.1 Feature Gap Matrix

| Feature | Current State | Required State | Gap Severity |
|---|---|---|---|
| **Voice (PBX)** | Mock adapter, console.log stubs | Cisco Webex CC / FreeSWITCH real integration | Critical |
| **Voice (WebRTC)** | Not implemented | Browser-based SIP calling via SFU | Critical |
| **Email Integration** | Channel type exists, no gateway | Gmail API + MS Graph + IMAP connector | Critical |
| **Chat (Social)** | UI filters exist (facebook/zalo), no backend | Zalo OA, FB Fanpage webhook connectors | Critical |
| **Chat (Live Chat)** | UI filter exists (livechat), no backend | Embeddable widget + WebSocket backend | Critical |
| **SMS** | Not implemented | SMS adapter (Twilio/local carrier) | High |
| **WhatsApp** | Not implemented | WhatsApp Business API connector | High |
| **Routing Engine** | Direct `assignAgent()` with no logic | Skill/group/priority-based routing with scoring | Critical |
| **Queue Management** | No queue concept | Priority queues with SLA enforcement | Critical |
| **Agent State (Redis)** | All state in PostgreSQL | Redis hot-state with microsecond lookups | Critical |
| **Agent Groups** | `team` field on profile, no CRUD | Full group hierarchy, skill-group mapping | High |
| **Agent Skills** | Flat `string[]` | Structured `{skill, proficiency, categories}` | High |
| **Capacity Tracking** | `maxConcurrentChats/Emails` fields, not enforced | Real-time concurrent interaction tracking per channel | Critical |
| **IVR Designer** | Not implemented | Drag-and-drop flow builder with React Flow | High |
| **Email Flow Designer** | Not implemented | Auto-response rules, routing flows | Medium |
| **Chat Flow Designer** | Not implemented | Bot handoff, routing flows | Medium |
| **WebSocket (Backend)** | Only agent gateway (basic) | Unified gateway with namespaces for all channels | Critical |
| **WebSocket (Frontend)** | 3 separate Socket.IO connections | Single connection with namespaces | High |
| **Kafka Events** | Not implemented in any interaction service | All mutations → Kafka for audit, routing, analytics | High |
| **Plugin Architecture** | Hardcoded `ICtiAdapter` for voice only | Generic `IChannelAdapter` for any channel type | Critical |
| **Real-time Notifications** | No WS gateway on notification service | Push via WS, FCM, email digest | High |
| **Call Recording** | Not implemented | Record, store (SeaweedFS), playback | Medium |
| **Chatbot Integration** | Not implemented | External chatbot API for pre-routing | Medium |

### 2.2 Code-Level Gaps

| Gap | Location | Impact |
|---|---|---|
| No `createInteraction` in backend | `interaction.service.ts` | Channel gateways can't create inbound interactions |
| No transfer logic | `interaction.service.ts` | Frontend calls `/transfer` endpoint that doesn't exist |
| No timeline endpoint | `interaction.controller.ts` | Frontend calls `/timeline` endpoint that doesn't exist |
| No pagination | `interaction.service.ts:23` | Hardcoded `take: 50`, no cursor/offset |
| Hardcoded channels array | `agent.service.ts:80` | `['voice', 'email', 'chat']` — can't add new channels |
| Skills not queryable | `agent-profile.entity.ts:36` | `jsonb` array, no proficiency, no index |
| No Kafka module | All services | Zero event publishing or consuming |
| No Redis module | Agent service | All state queries hit PostgreSQL |
| WS disconnect not handled | `agent.gateway.ts:29` | Agent disconnect doesn't update state or trigger routing |

---

## 3. User Requirements Summary

| # | Requirement | Priority |
|---|---|---|
| R1 | Real-time omnichannel: voice, chat, social (Facebook/Zalo/WhatsApp), email, SMS | P0 |
| R2 | High throughput: thousands messages/sec for text, thousands concurrent calls | P0 |
| R3 | Gmail + Microsoft 365 email integration | P1 |
| R4 | WebRTC SDK for browser-based calling | P1 |
| R5 | Chat: Zalo OA, Facebook Fanpage, Live Chat (embeddable widget) | P1 |
| R6 | SMS adapter design | P2 |
| R7 | Open plugin architecture for new channels | P0 |
| R8 | Skill/group-based routing with availability | P0 |
| R9 | Centralized high-performance agent state management | P0 |
| R10 | Admin config for groups/skills | P1 |
| R11 | Single Agent Desktop for all channels | P0 |
| R12 | IVR flow designer (drag-and-drop) | P2 |
| R13 | Email flow designer (drag-and-drop) | P2 |
| R14 | Chat/Social/SMS flow designer (drag-and-drop) | P2 |
| R15 | External chatbot API for routing | P2 |
| R16 | Runtime agent config changes (no restart) | P1 |
| R17 | High throughput, real-time, low latency design | P0 |

---

## 4. Target Architecture

```
                           ┌─────────────────────────────────────────────────┐
                           │               EXTERNAL CHANNELS                 │
                           │  PBX (PortSIP v22.3 — Phase 1 | Cisco/FreeS — Phase 3) │
                           │  Gmail API / Microsoft Graph / IMAP            │
                           │  Zalo OA / Facebook Fanpage / WhatsApp Biz     │
                           │  SMS Gateway (Twilio / Local Carrier)          │
                           │  Live Chat Widget (Embeddable JS)              │
                           │  External Chatbot API                          │
                           └───────────────────┬─────────────────────────────┘
                                               │
                           ┌───────────────────▼─────────────────────────────┐
                           │         CHANNEL GATEWAY SERVICE (NEW)           │
                           │  ┌──────────┬──────────┬──────────┬──────────┐ │
                           │  │ Voice    │ Email    │ Social   │ SMS      │ │
                           │  │ Adapter  │ Adapter  │ Adapters │ Adapter  │ │
                           │  └────┬─────┴────┬─────┴────┬─────┴────┬─────┘ │
                           │       │          │          │          │       │
                           │       └──────────┴──────┬───┴──────────┘       │
                           │              ChannelMessage                     │
                           │              (normalized)                       │
                           └───────────────────┬─────────────────────────────┘
                                               │
                    ┌──────────────────────────▼──────────────────────────┐
                    │              ROUTING ENGINE (NEW)                    │
                    │  ┌─────────┐  ┌────────────┐  ┌──────────────────┐ │
                    │  │ Flow    │  │ Skill/Group│  │ Queue Manager    │ │
                    │  │ Engine  │  │ Router     │  │ (Priority Queues)│ │
                    │  └────┬────┘  └─────┬──────┘  └────────┬─────────┘ │
                    │       └─────────────┼──────────────────┘           │
                    └─────────────────────┼──────────────────────────────┘
                                          │
           ┌──────────────────────────────┼──────────────────────────────────┐
           │                              │                                  │
    ┌──────▼──────┐    ┌─────────────────▼────────────────┐    ┌───────────▼──────────┐
    │ Agent State │    │ Interaction Service (UPGRADED)    │    │ Notification Service │
    │ Manager     │    │ - Create/lifecycle interactions   │    │ (UPGRADED)           │
    │ (Redis)     │◄──►│ - Transfer, escalate             │    │ - WS push            │
    │             │    │ - SLA enforcement                 │    │ - Event-driven       │
    └──────┬──────┘    │ - Kafka events                   │    └──────────────────────┘
           │           └──────────────────────────────────┘
           │
    ┌──────▼──────────────────────────────────────────────────────────────────────────┐
    │                        AGENT DESKTOP (UPGRADED)                                  │
    │  ┌────────────┐  ┌───────────┐  ┌──────────┐  ┌─────────┐  ┌────────────────┐  │
    │  │ WebRTC     │  │ Unified   │  │ Email    │  │ Queue   │  │ Single         │  │
    │  │ Softphone  │  │ Chat Panel│  │ Composer │  │ Panel   │  │ Socket.IO conn │  │
    │  └────────────┘  └───────────┘  └──────────┘  └─────────┘  └────────────────┘  │
    └─────────────────────────────────────────────────────────────────────────────────┘

    ┌─────────────────────────────────────────────────────────────────────────────────┐
    │                        ADMIN MODULE (UPGRADED)                                   │
    │  ┌──────────┐  ┌────────────┐  ┌──────────────┐  ┌──────────┐  ┌────────────┐  │
    │  │ IVR Flow │  │ Email Flow │  │ Chat/SMS     │  │ Group &  │  │ Channel    │  │
    │  │ Designer │  │ Designer   │  │ Flow Designer│  │ Skill Mgr│  │ Config     │  │
    │  └──────────┘  └────────────┘  └──────────────┘  └──────────┘  └────────────┘  │
    └─────────────────────────────────────────────────────────────────────────────────┘
```

### Infrastructure Additions

| Component | Purpose | Why |
|---|---|---|
| **PortSIP PBX v22.3** | PBX + built-in WebRTC gateway | Voice channel, SIP trunking, call queues, CDR, recording — replaces mediasoup+drachtio for Phase 1 |
| **coturn** | TURN/STUN server | NAT traversal for WebRTC in corporate firewalls |
| **Redis Streams** | Agent state hot path + event pub/sub | Microsecond latency for routing decisions |
| **Bull/BullMQ** | Job queues (email polling, retries, recording sync) | Reliable background processing |

> **Note:** mediasoup + drachtio are **not needed in Phase 1** — PortSIP v22.3 has a built-in WebRTC gateway (WSS port 5065/5066). SIP.js in the browser registers directly to PortSIP. mediasoup may be introduced in Phase 3+ only if advanced SFU features (multi-party video, simulcast) are needed beyond PortSIP capabilities.

---

## 5. New Services & Modules

### 5.1 Channel Gateway Service (NEW — MS-20)

**Purpose:** Single entry point for all inbound/outbound channel messages. Hosts the adapter plugin registry. Normalizes messages to `ChannelMessage` format and forwards to Routing Engine.

**Port:** 3020

**Responsibilities:**
- Register/unregister channel adapters at runtime
- Receive inbound messages from adapters
- Normalize to `ChannelMessage` format
- Forward to Routing Engine via Kafka topic `channel.inbound`
- Receive outbound messages from agents via Kafka topic `channel.outbound`
- Route outbound to correct adapter
- Health check all adapters periodically

**Entities:**
- `ChannelConfig` — adapter configuration per tenant per channel
- `ChannelWebhook` — webhook endpoints for social channels

**Key Endpoints:**
- `POST /channels/inbound` — receive normalized message (internal)
- `POST /channels/outbound` — send message via adapter (internal)
- `GET /admin/channels` — list configured channels
- `POST /admin/channels` — configure new channel adapter
- `PUT /admin/channels/:id` — update channel config
- `DELETE /admin/channels/:id` — remove channel
- `POST /admin/channels/:id/test` — test connectivity

### 5.2 Routing Engine (NEW — MS-21)

**Purpose:** Receives normalized `ChannelMessage` from Channel Gateway, executes routing flows (IVR/email/chat), scores available agents, and assigns interactions.

**Port:** 3021

**Responsibilities:**
- Consume `channel.inbound` Kafka topic
- Execute flow (IVR, email rules, chat bot handoff)
- Query Agent State Manager for available agents
- Score agents based on skills, proficiency, current load, group match
- Assign interaction and publish `interaction.assigned` event
- Manage priority queues when no agent available
- SLA timer enforcement
- Queue overflow / failover logic

**Entities:**
- `RoutingRule` — routing rules (conditions → actions)
- `RoutingQueue` — queue definitions (name, priority, SLA, overflow)
- `QueueEntry` — current items in queue (interaction_id, priority, enqueue_time)

### 5.3 Flow Designer Engine (Backend — in Routing Engine)

**Purpose:** Execute IVR/Email/Chat flow graphs designed in Admin UI.

Covered in [Section 10](#10-flow-designer-engine).

### 5.4 Live Chat Widget Service (NEW — embedded in Channel Gateway)

**Purpose:** Serve the embeddable live chat widget JS bundle and handle WebSocket connections from website visitors.

**Implementation:** React + Vite library mode → single `tpb-chat-widget.js` file.

---

## 6. Channel Adapter Plugin Architecture

### 6.1 IChannelAdapter Interface

```typescript
/**
 * Universal channel adapter interface.
 * Every channel (voice, email, social, SMS) implements this.
 */
interface IChannelAdapter {
  /** Unique channel type identifier */
  readonly channelType: ChannelType;

  /** Sub-channel identifier (e.g., 'facebook', 'zalo', 'gmail') */
  readonly subChannel: string;

  /** Initialize adapter with config */
  initialize(config: ChannelAdapterConfig): Promise<void>;

  /** Graceful shutdown */
  shutdown(): Promise<void>;

  /** Check adapter health */
  healthCheck(): Promise<AdapterHealthStatus>;

  /** Send outbound message to customer */
  sendMessage(message: OutboundMessage): Promise<SendResult>;

  /** Register callback for inbound messages */
  onInbound(handler: (message: ChannelMessage) => Promise<void>): void;

  /** Register callback for delivery status updates */
  onDeliveryStatus(handler: (status: DeliveryStatus) => Promise<void>): void;

  /** Get adapter capabilities */
  getCapabilities(): AdapterCapabilities;
}

interface AdapterCapabilities {
  canSendText: boolean;
  canSendAttachments: boolean;
  canSendRichMedia: boolean;   // buttons, cards, carousels
  canReceiveMedia: boolean;     // images, video, audio
  canInitiateOutbound: boolean;
  canTransfer: boolean;
  supportsTypingIndicator: boolean;
  supportsReadReceipts: boolean;
  supportsWebhooks: boolean;
  maxMessageLength?: number;
}

interface ChannelAdapterConfig {
  tenantId: string;
  channelType: ChannelType;
  subChannel: string;
  credentials: Record<string, any>;  // encrypted at rest
  settings: Record<string, any>;
  webhookUrl?: string;
}
```

### 6.2 ChannelMessage (Normalized Lingua Franca)

```typescript
/**
 * Normalized message format — lingua franca between all adapters and the routing engine.
 */
interface ChannelMessage {
  /** Unique message ID (UUID) */
  id: string;

  /** Channel type */
  channelType: ChannelType;

  /** Sub-channel (facebook, zalo, gmail, ms365, freeswitch, webex_cc, etc.) */
  subChannel: string;

  /** Tenant ID */
  tenantId: string;

  /** Direction */
  direction: 'inbound' | 'outbound';

  /** External conversation/thread ID from the channel */
  externalConversationId: string;

  /** Sender info */
  sender: {
    externalId: string;       // phone number, email, social ID
    displayName?: string;
    avatarUrl?: string;
  };

  /** Recipient info */
  recipient: {
    externalId: string;
    displayName?: string;
  };

  /** Message content */
  content: {
    type: 'text' | 'html' | 'rich' | 'media' | 'system';
    text?: string;
    html?: string;
    subject?: string;         // for email
    attachments?: Attachment[];
    richElements?: RichElement[];  // buttons, cards, quick replies
  };

  /** Original raw payload from adapter */
  rawPayload?: Record<string, any>;

  /** Metadata */
  metadata: {
    /** Mapped customer ID (if known) */
    customerId?: string;
    /** Interaction ID (if already assigned) */
    interactionId?: string;
    /** Priority override */
    priority?: 'low' | 'medium' | 'high' | 'urgent';
    /** VIP flag */
    isVip?: boolean;
    /** Tags from IVR or flow */
    tags?: string[];
    /** Custom fields from flow */
    custom?: Record<string, any>;
  };

  /** Timestamps */
  timestamp: string;          // ISO 8601
  receivedAt: string;         // when gateway received it
}

interface Attachment {
  id: string;
  type: 'image' | 'video' | 'audio' | 'file' | 'voice_message';
  url?: string;               // external URL or SeaweedFS presigned URL
  filename: string;
  mimeType: string;
  sizeBytes: number;
}

interface RichElement {
  type: 'button' | 'card' | 'carousel' | 'quick_reply' | 'list';
  data: Record<string, any>;
}
```

### 6.3 Adapter Registry

```typescript
/**
 * Runtime adapter registry — supports hot-loading adapters without service restart.
 * Satisfies Requirement R7 (open plugin architecture) and R16 (runtime config changes).
 */
class ChannelAdapterRegistry {
  private adapters = new Map<string, IChannelAdapter>();

  /** Register adapter — key = `${channelType}:${subChannel}:${tenantId}` */
  async register(adapter: IChannelAdapter, config: ChannelAdapterConfig): Promise<void>;

  /** Unregister and shutdown adapter */
  async unregister(key: string): Promise<void>;

  /** Get adapter by key */
  get(channelType: ChannelType, subChannel: string, tenantId: string): IChannelAdapter | undefined;

  /** List all registered adapters with health */
  async listWithHealth(): Promise<AdapterRegistryEntry[]>;

  /** Reload adapter config without restart (R16) */
  async reloadConfig(key: string, newConfig: ChannelAdapterConfig): Promise<void>;
}
```

### 6.4 Built-in Adapters (Phase 1-3)

| Adapter | Channel | Sub-Channel | Protocol | Phase |
|---|---|---|---|---|
| `PortSipAdapter` | voice | portsip | PortSIP v22.3 REST API + WSI WebSocket | **Phase 1** |
| `WebexCcAdapter` | voice | webex_cc | Cisco Webex CC REST API + WebSocket | Phase 3 |
| `FreeSwitchAdapter` | voice | freeswitch | FreeSWITCH ESL (Event Socket Library) | Phase 3 |
| `GmailAdapter` | email | gmail | Google Gmail API (push + pull) | Phase 1 |
| `MicrosoftAdapter` | email | ms365 | Microsoft Graph API (webhooks) | Phase 1 |
| `ImapAdapter` | email | imap | IMAP + SMTP | Phase 2 |
| `FacebookAdapter` | social | facebook | Facebook Graph API + Webhooks | Phase 2 |
| `ZaloAdapter` | social | zalo | Zalo OA API + Webhooks | Phase 2 |
| `WhatsAppAdapter` | social | whatsapp | WhatsApp Business Cloud API | Phase 3 |
| `LiveChatAdapter` | chat | livechat | Internal WebSocket | Phase 1 |
| `TwilioSmsAdapter` | sms | twilio | Twilio REST API + Webhooks | Phase 3 |
| `LocalSmsAdapter` | sms | local | Local carrier API | Phase 3 |

---

## 7. Routing Engine Design

### 7.1 Routing Flow

```
ChannelMessage arrives
        │
        ▼
┌─────────────────┐
│ 1. Customer     │ → Lookup customer by sender.externalId
│    Identification│   Set metadata.customerId, isVip, priority
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 2. Flow Engine  │ → Execute IVR/Email/Chat flow graph
│    Execution    │   May: set tags, change priority, route to bot,
│                 │   play prompts, collect input, etc.
└────────┬────────┘
         │ (flow output: routingHints)
         ▼
┌─────────────────┐
│ 3. Queue        │ → Find matching queue based on routingHints
│    Selection    │   (channel + skills + priority + tenant)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 4. Agent        │ → Query Redis for available agents in queue's skill groups
│    Scoring      │   Score = f(skill_proficiency, load_ratio, wait_time, affinity)
│                 │   If agent found → assign
│                 │   If no agent → enqueue with SLA timer
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 5. Interaction  │ → Create Interaction record in MS-3
│    Creation     │   Publish interaction.created to Kafka
│                 │   Notify agent via WebSocket
└─────────────────┘
```

### 7.2 Agent Scoring Algorithm

```
Score(agent, interaction) = Σ(weights × factors)

Factors:
  1. skill_match      = max_proficiency_for_required_skills / 10       [0.0 - 1.0]
  2. load_ratio       = 1 - (current_interactions / max_capacity)      [0.0 - 1.0]
  3. idle_time        = min(seconds_since_last_interaction / 300, 1.0) [0.0 - 1.0]
  4. group_match      = 1.0 if agent in preferred group, 0.5 otherwise [0.5 - 1.0]
  5. customer_affinity = 1.0 if agent served this customer before       [0.0 - 1.0]

Default Weights:
  skill_match:       0.30
  load_ratio:        0.25
  idle_time:         0.20
  group_match:       0.15
  customer_affinity: 0.10

Total Score = 0.30×skill + 0.25×load + 0.20×idle + 0.15×group + 0.10×affinity
```

Weights are configurable per tenant via Admin UI.

### 7.3 Queue Management

```typescript
interface RoutingQueue {
  id: string;
  tenantId: string;
  name: string;                    // e.g., "VIP Voice", "General Email"
  channelTypes: ChannelType[];     // which channels feed into this queue
  requiredSkills: string[];        // skills needed to serve this queue
  priority: number;                // queue priority (higher = served first)
  slaThresholdSeconds: number;     // SLA target for first response
  overflowQueueId?: string;        // fallback queue on timeout
  overflowAfterSeconds: number;    // when to overflow
  maxQueueSize: number;            // max items before rejecting
  businessHours?: BusinessHours;   // operating hours
}
```

**Queue Data Structure (Redis):**
```
SORTED SET: queue:{queueId}:entries
  Score = priority * 1000000 + (MAX_TIMESTAMP - enqueueTimestamp)
  Member = interactionId

HASH: queue:{queueId}:meta
  Fields: size, oldest_entry, avg_wait_time
```

### 7.4 SLA Enforcement

```
Every 5 seconds (configurable):
  1. Scan all queue entries
  2. For entries approaching SLA threshold (80%):
     → Publish sla.warning event
     → Notify supervisor via WebSocket
  3. For entries exceeding SLA threshold:
     → Set slaBreached = true on Interaction
     → Publish sla.breached event
     → Attempt overflow queue
     → Notify supervisor
```

---

## 8. Agent State Management

### 8.1 Redis Data Structures

**Agent State (Hot Path):**
```
HASH agent:state:{agentId}
  Fields:
    status              = "ready" | "not-ready" | "on-interaction" | "after-call-work" | "offline"
    voice_status        = "ready" | "not-ready" | "on-call" | "ringing" | "acw"
    email_status        = "ready" | "not-ready" | "composing"
    chat_status         = "ready" | "not-ready" | "chatting"
    social_status       = "ready" | "not-ready" | "responding"
    sms_status          = "ready" | "not-ready" | "responding"
    voice_count         = 0       (current voice interactions)
    email_count         = 2       (current email interactions)
    chat_count          = 1       (current chat interactions)
    social_count        = 0
    sms_count           = 0
    max_voice           = 1
    max_email           = 5
    max_chat            = 3
    max_social          = 3
    max_sms             = 5
    last_interaction_at = "2026-03-15T10:30:00Z"
    login_at            = "2026-03-15T08:00:00Z"
    heartbeat_at        = "2026-03-15T10:31:00Z"

TTL: 86400 (24h, refreshed on heartbeat)
```

**Agent Skills Index (for routing queries):**
```
SORTED SET agent:skills:{skillName}
  Score = proficiency (1-10)
  Member = agentId

Example:
  agent:skills:mortgage → { "agent-001": 8, "agent-002": 5, "agent-003": 9 }
  agent:skills:credit-card → { "agent-001": 7, "agent-004": 10 }
```

**Agent Group Membership:**
```
SET agent:group:{groupId}:members
  Members: agentId1, agentId2, ...

SET agent:{agentId}:groups
  Members: groupId1, groupId2, ...
```

**Available Agents by Channel (for fast routing):**
```
SET agent:available:{channelType}
  Members: agentId1, agentId2, ...

  Updated when agent status changes:
    - ready → SADD
    - not-ready/offline → SREM
    - capacity exceeded → SREM
```

### 8.2 State Sync Protocol

```
1. Agent logs in:
   → Create Redis state hash
   → Add to available sets for configured channels
   → Publish agent.login event to Kafka
   → Persist session to PostgreSQL (async)

2. Agent changes channel status:
   → Update Redis hash field (e.g., voice_status = 'ready')
   → Update available set (SADD/SREM)
   → Broadcast via WebSocket to supervisor dashboard
   → Persist to PostgreSQL (async, batched every 10s)

3. Interaction assigned:
   → Increment channel count (HINCRBY)
   → If count >= max → SREM from available set
   → Update overall status if needed

4. Interaction completed:
   → Decrement channel count
   → If count < max → SADD to available set
   → Update last_interaction_at

5. Heartbeat (every 30s):
   → Update heartbeat_at
   → Refresh TTL on state hash
   → If heartbeat missed for 90s → mark disconnected, remove from available sets

6. Agent disconnects (WS close):
   → Set status = disconnected
   → Remove from all available sets
   → Keep state hash for reconnection (grace period: 60s)
   → After grace period → set offline, persist final state
```

### 8.3 Capacity Model

```typescript
interface AgentCapacity {
  voice: { current: number; max: number; available: boolean };
  email: { current: number; max: number; available: boolean };
  chat: { current: number; max: number; available: boolean };
  social: { current: number; max: number; available: boolean };
  sms: { current: number; max: number; available: boolean };

  /** Overall availability — true if ANY channel has capacity and is ready */
  isAvailable: boolean;

  /** Utilization = total_current / total_max across all channels */
  utilization: number;
}
```

---

## 9. Channel-Specific Designs

### 9.1 Voice Channel

#### 9.1.1 WebRTC (Browser-Based Calling)

**Stack:** SIP.js (client) → PortSIP WSS gateway (built-in WebRTC support)

> **No mediasoup or drachtio required.** PortSIP v22.3 includes a built-in WebRTC gateway that handles SIP-over-WebSocket, SRTP, DTLS, and ICE. SIP.js in the browser registers directly to PortSIP.

**Flow:**
```
Browser (SIP.js)
    │
    │ WebSocket (WSS port 5065/5066)
    ▼
PortSIP PBX v22.3 (built-in WebRTC Gateway)
    │
    ├──── Call Queue / Ring Group routing
    ├──── Recording (built-in → sync to SeaweedFS)
    │
    │ SIP Trunk
    ▼
PSTN Gateway / External PBX
```

**Frontend Integration:**
- SIP.js in Agent Desktop registers directly to PortSIP WSS endpoint
- Credential provisioning via `GET /cti/webrtc/credentials` (returns extension, password, WSS URI)
- Integrates with existing `CallContext.tsx` + `FloatingCallWidget.tsx`
- Audio device selection (mic/speaker)
- SRTP encryption for media (PortSIP handles DTLS-SRTP)
- DTMF support (RFC 2833)
- coturn TURN server for NAT traversal in corporate firewalls

**Key APIs:**
```typescript
// Agent Desktop → CTI Service
GET  /cti/webrtc/credentials  // Get SIP credentials + WSS URI for SIP.js registration
GET  /cti/webrtc/ice-servers  // Get TURN/STUN config (coturn)
POST /cti/calls/make          // Initiate outbound call (via PortSIP API)
POST /cti/calls/:id/answer    // Answer inbound call
POST /cti/calls/:id/hold      // Hold
POST /cti/calls/:id/unhold    // Resume
POST /cti/calls/:id/transfer  // Blind transfer (via PortSIP refer)
POST /cti/calls/:id/attended-transfer  // Attended transfer
POST /cti/calls/:id/hangup    // Hangup
POST /cti/calls/:id/conference // Conference (3-way merge)
```

#### 9.1.2 PBX Integration

**Phase 1 — PortSIP v22.3 (Primary PBX):**

| Feature | PortSIP API | Notes |
|---|---|---|
| Authentication | `POST /auth/sign_in`, `POST /auth/refresh_token` | JWT-based, admin credentials |
| Extension management | `GET/POST/PUT/DELETE /user`, `/extension_numbers/{ext}` | Auto-provisioned from Omnichannel agent sync |
| Call queues | Full CRUD `/queue`, `/queue/{id}/agents` | Skill-based routing, agent priority/skill levels |
| Call control | `create`, `hold`, `unhold`, `refer`, `attended_refer`, `destroy` | Via PortSIP REST API |
| Ring groups | Full CRUD `/ring_group`, `/ring_group/{id}/members` | For team-based routing |
| CDR | `GET /cdrs`, `GET /calllogs`, call reports | Synced to Interaction Service |
| Recording | Built-in recording → download via API | Synced to SeaweedFS via BullMQ background job |
| Real-time events | WSI `wss://{host}:8887/wsi` — extension, queue, CDR events | Pub/Sub WebSocket interface |
| Webhooks | CDR events + Extension events | Backup event delivery mechanism |

> See **[Section 18](#18-portsip-v223-integration-design)** for complete integration design including sync architecture, data mapping, and abstraction layer.

**Phase 3 — Cisco Webex CC / FreeSWITCH (Additional PBX adapters):**

| PBX | SDK/Protocol | Events | Notes |
|---|---|---|---|
| Cisco Webex CC | Webex CC REST API + WebSocket Notifications | Call events, agent state, routing | Cloud-based; adapter via same `IPbxProvider` abstraction |
| FreeSWITCH | ESL (Event Socket Library) inbound/outbound | Channel events, DTMF, bridge, park, conference | Open-source, mod_verto for WebRTC; implements same `IPbxProvider` interface |

#### 9.1.3 IVR Integration

- Voice adapter receives inbound call
- Before routing to agent, executes IVR flow (designed in admin)
- IVR flow can: play TTS/audio, collect DTMF, query external APIs, set routing tags
- Output: `routingHints` object with skills, priority, queue preferences

### 9.2 Email Channel

#### 9.2.1 Gmail Integration

**Protocol:** Google Gmail API (REST + Push Notifications)

**Setup:**
1. Admin configures Google OAuth2 (service account or user consent)
2. Create Gmail watch on configured labels (inbox, specific labels)
3. Google Cloud Pub/Sub delivers push notifications on new emails
4. Adapter fetches full email via Gmail API

**Flow:**
```
Gmail Inbox ──► Google Pub/Sub ──► Webhook ──► GmailAdapter ──► ChannelMessage
                                                                      │
                                                                      ▼
Agent reply ──► GmailAdapter.sendMessage() ──► Gmail API (send with threading)
```

#### 9.2.2 Microsoft 365 Integration

**Protocol:** Microsoft Graph API (REST + Webhooks)

**Setup:**
1. Admin configures Azure AD app registration
2. Subscribe to `/me/mailFolders/inbox/messages` change notifications
3. Graph API webhook delivers notification on new emails
4. Adapter fetches email content via Graph API

#### 9.2.3 Generic IMAP

**Protocol:** IMAP (polling) + SMTP (sending)

**Polling Strategy:** BullMQ job runs every 30s per mailbox, checks for new messages since last UID.

### 9.3 Social Channels

#### 9.3.1 Facebook Fanpage

**Protocol:** Facebook Graph API + Webhooks

**Setup:**
1. Admin connects Facebook Page via OAuth
2. Subscribe to `messages`, `messaging_postbacks`, `message_deliveries` webhooks
3. Adapter receives webhook events, normalizes to `ChannelMessage`

**Capabilities:**
- Text messages, images, video, files
- Quick replies, buttons, templates (generic, button, media)
- Handover protocol (bot → human agent)
- Seen/delivery receipts

#### 9.3.2 Zalo OA (Official Account)

**Protocol:** Zalo OA API v3 + Webhooks

**Setup:**
1. Admin configures Zalo OA app ID + secret
2. Register webhook URL with Zalo
3. Receive `user_send_text`, `user_send_image`, etc. events

**Capabilities:**
- Text, image, file, sticker, GIF
- List/interactive messages
- User info lookup (with consent)
- Vietnam-specific: most popular chat platform, critical for TPBank

#### 9.3.3 WhatsApp Business

**Protocol:** WhatsApp Business Cloud API (Meta)

**Setup:**
1. Admin configures WhatsApp Business account
2. Register webhook for messages
3. Send messages via templates (first 24h rule) or session messages

**Capabilities:**
- Text, image, document, video, audio, location, contacts
- Interactive messages (list, reply buttons)
- Message templates (pre-approved by Meta)
- Read receipts

### 9.4 SMS Channel

**Protocol:** Twilio REST API (primary) + local carrier API (secondary)

**Capabilities:**
- Send/receive SMS
- Delivery status webhooks
- Long SMS (concatenated)
- Unicode support (Vietnamese characters)

### 9.5 Live Chat Channel

**Architecture:**
```
Website ──► tpb-chat-widget.js ──► WebSocket ──► Channel Gateway ──► ChannelMessage
```

**Widget Features:**
- Embeddable single JS file (Vite library mode build)
- Customizable via admin (colors, logo, position, greeting)
- File upload (images, documents)
- Typing indicators
- Pre-chat form (name, phone, topic)
- Chat transcript download
- Offline form (when no agents available)
- Mobile responsive

**Widget Initialization:**
```html
<script src="https://chat.tpb.vn/widget.js"></script>
<script>
  TPBChat.init({
    tenantId: 'xxx',
    position: 'bottom-right',
    theme: { primaryColor: '#1a73e8' },
    preChatForm: true,
  });
</script>
```

---

## 10. Flow Designer Engine

### 10.1 Overview

Three flow designer types share a common execution engine and React Flow frontend:

| Flow Type | Trigger | Primary Use |
|---|---|---|
| **IVR Flow** | Inbound voice call | Greeting, DTMF menu, data lookup, queue routing |
| **Email Flow** | Inbound email | Auto-categorize, auto-reply, route to queue |
| **Chat/Social/SMS Flow** | Inbound message | Bot greeting, FAQ, data collection, handoff |

### 10.2 Flow Graph Model

```typescript
interface FlowDefinition {
  id: string;
  tenantId: string;
  name: string;
  type: 'ivr' | 'email' | 'chat_social_sms';
  channelTypes: ChannelType[];      // which channels trigger this flow
  version: number;
  isActive: boolean;
  nodes: FlowNode[];
  edges: FlowEdge[];
  variables: FlowVariable[];        // flow-level variables
  createdAt: string;
  updatedAt: string;
}

interface FlowNode {
  id: string;
  type: FlowNodeType;
  position: { x: number; y: number };
  data: Record<string, any>;        // node-type-specific config
}

interface FlowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;            // for conditional branches
  label?: string;
}
```

### 10.3 Node Types

#### IVR Flow Nodes

| Node Type | Description | Config |
|---|---|---|
| `ivr_start` | Entry point | — |
| `ivr_play_audio` | Play audio file or TTS | `audioUrl \| ttsText`, `language` |
| `ivr_collect_dtmf` | Wait for DTMF input | `maxDigits`, `timeout`, `terminateKey` |
| `ivr_menu` | DTMF-based menu routing | `options: [{digit, label, description}]` |
| `ivr_http_request` | Call external API | `url`, `method`, `headers`, `body`, `responseMapping` |
| `ivr_set_variable` | Set flow variable | `variable`, `value` (expression) |
| `ivr_condition` | Branch based on condition | `condition` (expression), true/false outputs |
| `ivr_queue` | Route to queue | `queueId`, `priority`, `skills`, `tags` |
| `ivr_transfer` | Transfer to extension/number | `destination`, `type` |
| `ivr_voicemail` | Send to voicemail | `mailboxId`, `greeting` |
| `ivr_end` | End flow | `action: 'hangup' \| 'disconnect'` |

#### Email Flow Nodes

| Node Type | Description | Config |
|---|---|---|
| `email_start` | Entry point (new email received) | — |
| `email_condition` | Branch on email attributes | `field: 'subject' \| 'from' \| 'body' \| 'attachment_count'`, `operator`, `value` |
| `email_auto_reply` | Send auto-reply | `templateId`, `variables` |
| `email_set_priority` | Set priority | `priority` |
| `email_add_tags` | Add tags | `tags[]` |
| `email_assign_queue` | Route to queue | `queueId`, `skills` |
| `email_forward` | Forward to external address | `to`, `preserveThread` |
| `email_classify` | AI classification | `model`, `categories[]` |
| `email_end` | End flow | — |

#### Chat/Social/SMS Flow Nodes

| Node Type | Description | Config |
|---|---|---|
| `chat_start` | Entry point | — |
| `chat_send_message` | Send text/rich message | `text`, `richElements[]` |
| `chat_wait_input` | Wait for user input | `timeout`, `expectedType: 'text' \| 'button' \| 'any'` |
| `chat_condition` | Branch on input/variable | `condition` (expression) |
| `chat_set_variable` | Set variable | `variable`, `value` |
| `chat_http_request` | Call external API | `url`, `method`, `headers`, `body` |
| `chat_bot_handoff` | Hand off to external chatbot | `botEndpoint`, `botId`, `context` |
| `chat_bot_return` | Return from chatbot | `trigger: 'keyword' \| 'intent' \| 'timeout'` |
| `chat_collect_info` | Collect structured data | `fields: [{name, type, required, validation}]` |
| `chat_assign_queue` | Route to human agent | `queueId`, `skills`, `priority` |
| `chat_transfer` | Transfer to different queue/agent | `targetQueueId \| targetAgentId` |
| `chat_end` | End conversation | `closingMessage` |

### 10.4 Flow Execution Engine

**Implementation:** Lightweight state machine (NOT Temporal). Justification:
- Flows are short-lived (seconds to minutes)
- Low complexity compared to business workflows
- Temporal adds latency overhead for simple state transitions
- Hundreds of concurrent flow executions needed

```typescript
class FlowExecutor {
  /**
   * Execute a flow graph for an incoming ChannelMessage.
   * Returns routing hints for the routing engine.
   */
  async execute(
    flow: FlowDefinition,
    message: ChannelMessage,
    context: FlowExecutionContext,
  ): Promise<FlowResult> {
    let currentNodeId = this.findStartNode(flow);
    const variables = new Map<string, any>();

    while (currentNodeId) {
      const node = flow.nodes.find(n => n.id === currentNodeId);
      if (!node) break;

      const result = await this.executeNode(node, message, variables, context);

      if (result.action === 'end') break;
      if (result.action === 'wait') {
        // Persist state, resume on next message
        await this.persistState(flow.id, message, currentNodeId, variables);
        return { status: 'waiting', state: { nodeId: currentNodeId, variables } };
      }

      currentNodeId = this.getNextNode(flow, currentNodeId, result.outputHandle);
    }

    return {
      status: 'complete',
      routingHints: variables.get('__routingHints'),
    };
  }
}
```

---

## 11. Expanded Type System

### 11.1 Channel Types (Before → After)

**Before:**
```typescript
type Channel = 'voice' | 'email' | 'chat';
type InteractionType = 'call' | 'missed-call' | 'email' | 'chat';
```

**After:**
```typescript
type ChannelType = 'voice' | 'email' | 'chat' | 'social' | 'sms';

type SubChannel =
  // Voice
  | 'webex_cc' | 'freeswitch' | 'webrtc'
  // Email
  | 'gmail' | 'ms365' | 'imap'
  // Chat
  | 'livechat'
  // Social
  | 'facebook' | 'zalo' | 'whatsapp'
  // SMS
  | 'twilio' | 'local_carrier';

type InteractionType =
  | 'voice_inbound' | 'voice_outbound' | 'voice_missed' | 'voice_callback'
  | 'email_inbound' | 'email_outbound'
  | 'chat_livechat'
  | 'social_facebook' | 'social_zalo' | 'social_whatsapp'
  | 'sms_inbound' | 'sms_outbound';

type InteractionStatus =
  | 'queued'        // In queue, waiting for agent
  | 'ringing'       // Offered to agent, waiting for accept
  | 'active'        // Agent is handling
  | 'on-hold'       // Voice: on hold
  | 'wrap-up'       // Agent doing after-interaction work
  | 'transferred'   // Being transferred
  | 'resolved'      // Resolved by agent
  | 'closed'        // Closed (final state)
  | 'abandoned';    // Customer abandoned before agent answered

type AgentChannelState =
  | 'ready'
  | 'not-ready'
  | 'on-interaction'  // actively handling
  | 'ringing'         // interaction offered, pending accept
  | 'after-work'      // wrap-up / ACW
  | 'disconnected'
  | 'offline';
```

### 11.2 Updated Interaction Entity

```typescript
// New/changed fields on Interaction entity
@Column()
channelType!: ChannelType;           // was: channel: 'voice' | 'email' | 'chat'

@Column()
subChannel!: SubChannel;             // NEW: specific channel adapter

@Column()
interactionType!: InteractionType;   // was: type: 'call' | 'missed-call' | 'email' | 'chat'

@Column({ nullable: true })
queueId?: string;                    // NEW: which queue it came from

@Column({ nullable: true })
routingFlowId?: string;              // NEW: which flow processed it

@Column({ nullable: true })
externalConversationId?: string;     // NEW: thread ID from channel

@Column({ type: 'jsonb', default: {} })
routingData!: Record<string, any>;   // NEW: scoring data, queue history

@Column({ type: 'jsonb', default: [] })
transferHistory!: TransferRecord[];  // NEW: transfer audit trail
```

### 11.3 Updated Agent Profile Entity

```typescript
// New/changed fields
@Column({ type: 'jsonb', default: [] })
skills!: AgentSkill[];              // was: string[]

// New type:
interface AgentSkill {
  skillId: string;
  name: string;
  proficiency: number;  // 1-10
  category: string;     // e.g., 'product', 'language', 'technical'
}

@Column({ type: 'jsonb', default: [] })
groupIds!: string[];                 // NEW: agent group memberships

@Column({ default: 1 })
maxConcurrentVoice!: number;         // NEW: was implicit (always 1)

@Column({ default: 3 })
maxConcurrentSocial!: number;        // NEW

@Column({ default: 5 })
maxConcurrentSms!: number;           // NEW
```

### 11.4 New Entities

```typescript
// Agent Group
interface AgentGroup {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  parentGroupId?: string;            // hierarchy
  requiredSkills: string[];          // skills needed for this group
  defaultQueueIds: string[];         // queues this group serves
  supervisorIds: string[];
  createdAt: string;
  updatedAt: string;
}

// Skill Definition
interface SkillDefinition {
  id: string;
  tenantId: string;
  name: string;
  category: string;
  description?: string;
  isActive: boolean;
}
```

---

## 12. Performance Architecture

### 12.1 Hot / Warm / Cold Path Separation

| Path | Latency Target | Technology | Data |
|---|---|---|---|
| **Hot** | < 10ms | Redis | Agent state, available agents sets, queue entries, routing decisions |
| **Warm** | < 100ms | PostgreSQL (indexed) | Interaction records, agent profiles, routing rules, flow definitions |
| **Cold** | < 1s | Elasticsearch / SeaweedFS | Full-text search, call recordings, email archives, analytics |

### 12.2 Throughput Targets

| Channel | Target | Architecture |
|---|---|---|
| **Text messages** (chat/social/SMS) | 5,000 msg/sec | Channel Gateway → Kafka → Routing Engine (horizontally scaled) |
| **Email** | 500 emails/min | Gmail/Graph API with webhook push, BullMQ for IMAP polling |
| **Voice (concurrent calls)** | 2,000 | mediasoup SFU (can handle 2k+ streams per instance), horizontal scaling |
| **WebSocket connections** | 10,000 agents | Socket.IO with Redis adapter for multi-instance |
| **Routing decisions** | 5,000/sec | Redis-based scoring, all agent state in Redis |

### 12.3 Scaling Strategy

```
                    Load Balancer (Kong)
                         │
           ┌─────────────┼─────────────┐
           │             │             │
     ┌─────▼─────┐ ┌────▼─────┐ ┌────▼─────┐
     │ Gateway-1 │ │ Gateway-2│ │ Gateway-3│  ← Horizontal: 1 per 2000 WS connections
     └─────┬─────┘ └────┬─────┘ └────┬─────┘
           │             │             │
           └─────────────┼─────────────┘
                         │ Kafka
           ┌─────────────┼─────────────┐
     ┌─────▼─────┐ ┌────▼─────┐ ┌────▼─────┐
     │ Router-1  │ │ Router-2 │ │ Router-3 │  ← Horizontal: Kafka consumer group
     └───────────┘ └──────────┘ └──────────┘
                         │
                    Redis Cluster
                    (3 masters + 3 replicas)
```

### 12.4 WebSocket Consolidation

**Before:** 3 separate Socket.IO connections per agent:
1. `wsClient` → `localhost:8000` (Kong gateway)
2. `ctiChannel` → `localhost:3019` (CTI service)
3. `notificationChannel` → `localhost:3006` (Notification service)

**After:** Single Socket.IO connection with namespaces:
```
ws://gateway:8000/
  ├── /agent        → agent status, presence
  ├── /interactions → queue updates, SLA events
  ├── /cti          → call events, WebRTC signaling
  ├── /notifications→ push notifications
  └── /chat         → real-time chat messages
```

**Implementation:** Socket.IO Redis adapter (`@socket.io/redis-adapter`) for multi-instance broadcasting.

---

## 13. Admin UI Requirements

### 13.1 Flow Designers (React Flow)

All three flow designers share a common React Flow canvas component with channel-specific node palettes.

**Common Features:**
- Drag-and-drop nodes from palette
- Visual edge connections with labels
- Node configuration panel (right sidebar)
- Flow validation before save
- Version history with diff view
- Test mode (simulate flow execution)
- Import/export as JSON

#### 13.1.1 IVR Flow Designer
- Node palette: all `ivr_*` nodes
- Audio file upload/TTS preview
- DTMF input simulation
- Integration with voice queue config

#### 13.1.2 Email Flow Designer
- Node palette: all `email_*` nodes
- Email template editor (rich text)
- Condition builder for email attributes
- Test with sample email

#### 13.1.3 Chat/Social/SMS Flow Designer
- Node palette: all `chat_*` nodes
- Rich message preview (buttons, cards)
- Chatbot handoff configuration
- Multi-channel preview (how it looks on FB, Zalo, WhatsApp)

### 13.2 Agent Group & Skill Management

**Pages:**

| Page | Features |
|---|---|
| Skill Definitions | CRUD skills with categories, bulk import |
| Agent Groups | CRUD groups with hierarchy, assign agents, set required skills |
| Agent-Skill Assignment | Matrix view: agents × skills with proficiency slider |
| Queue Configuration | CRUD queues, set SLA, overflow rules, link to groups/skills |

### 13.3 Channel Configuration

| Page | Features |
|---|---|
| Channel Overview | Dashboard of all configured channels with health status |
| Voice Config | PBX selection (Cisco Webex CC / FreeSWITCH), credentials, WebRTC toggle |
| Email Config | Gmail OAuth, MS365 OAuth, IMAP settings, per-mailbox config |
| Social Config | Facebook Page connect, Zalo OA connect, WhatsApp Business setup |
| SMS Config | Twilio credentials, local carrier API setup |
| Live Chat Config | Widget customization (colors, logo, position, greeting, pre-chat form) |

### 13.4 Live Chat Widget Designer

- Visual editor for widget appearance
- Preview (desktop + mobile)
- Pre-chat form builder
- Offline message config
- Operating hours config
- Embed code generator

---

## 14. Frontend Agent Desktop Changes

### 14.1 Expanded Channel Filters

**Current InteractionList filters:** `all | voice | email | chat | missed`
**Chat sub-filters:** `facebook | zalo | livechat`

**New filters:**
```
all | voice | email | chat | social | sms | missed
                              │
                              ├── livechat
                              │
              social ─────────┤
                              ├── facebook
                              ├── zalo
                              └── whatsapp
```

**Implementation:** Extend `useInteractionStats` hook to support `channelType` + `subChannel` filtering.

### 14.2 Unified Chat Panel

The center panel's Chat tab should handle all text-based channels uniformly:

| Feature | Live Chat | Facebook | Zalo | WhatsApp | SMS |
|---|---|---|---|---|---|
| Text messages | Yes | Yes | Yes | Yes | Yes |
| Images | Yes | Yes | Yes | Yes | No |
| Files | Yes | Yes | Yes | Yes | No |
| Rich messages (buttons, cards) | Yes | Yes | Yes | Yes | No |
| Typing indicator | Yes | Yes | No | Yes | No |
| Read receipts | Yes | Yes | No | Yes | Yes |
| Quick replies | Yes | Yes | Yes | Yes | No |

**Component:** Extend `ChatTimeline.tsx` to render channel-specific rich elements (Facebook templates, Zalo interactive messages, WhatsApp buttons).

### 14.3 WebRTC Softphone

Replace mock `FloatingCallWidget` with real softphone:

```
┌─────────────────────────────┐
│  ☎ Active Call — 02:34       │
│  Nguyễn Văn A  0901234567   │
│                              │
│  [Mute] [Hold] [Transfer]   │
│  [Dialpad] [Conference]     │
│  [End Call]                  │
│                              │
│  Audio: 🎤 Built-in Mic     │
│         🔊 Headset          │
└─────────────────────────────┘
```

**Key Features:**
- SIP.js registration on login
- Incoming call alert with caller info (customer lookup)
- Audio device selection
- DTMF dialpad
- Blind + attended transfer
- 3-way conference
- Call recording indicator
- Call quality indicator (MOS score)

### 14.4 WebSocket Consolidation

**Before:** 3 separate channel instances
```typescript
wsClient.connect(token);          // :8000
ctiChannel.connect(agentId, token); // :3019
notificationChannel.connect(agentId, token); // :3006
```

**After:** Single connection, namespace-based
```typescript
class UnifiedSocketClient {
  private socket: Socket;

  connect(token: string) {
    this.socket = io('ws://gateway:8000', {
      auth: { token },
      transports: ['websocket'],
    });
  }

  get agent() { return this.socket.io.socket('/agent'); }
  get interactions() { return this.socket.io.socket('/interactions'); }
  get cti() { return this.socket.io.socket('/cti'); }
  get notifications() { return this.socket.io.socket('/notifications'); }
  get chat() { return this.socket.io.socket('/chat'); }
}
```

### 14.5 Enhanced Agent Status Widget

**Current:** 3 channels (voice, email, chat)
**New:** 5+ channels with per-channel interaction counts

```
┌─────────────────────────────────────┐
│ Agent Status                    ✓   │
│                                     │
│ 📞 Voice    [Ready ▼]      0/1    │
│ 📧 Email    [Ready ▼]      2/5    │
│ 💬 Chat     [Ready ▼]      1/3    │
│ 📱 Social   [Ready ▼]      0/3    │
│ ✉️  SMS      [Not Ready ▼]  0/5    │
│                                     │
│ Overall: Ready (3/17 capacity)      │
│ [Set All Ready] [Set All Not Ready] │
└─────────────────────────────────────┘
```

### 14.6 New React Query Hooks

```typescript
// New hooks needed
useAgentGroups()              // list groups for current agent
useAgentSkills()              // list skills for current agent
useQueueStatus()              // real-time queue metrics
useWebRtcConnection()         // SIP.js lifecycle management
useChatMessages(interactionId) // real-time chat messages
useFlowDesigner(flowId)       // flow CRUD for admin module
useChannelConfig()            // channel configuration for admin
useLiveChatWidget()           // widget customization for admin
```

---

## 15. Phased Implementation Plan

### Overview

| Phase | Duration | Focus | Key Deliverables |
|---|---|---|---|
| **Phase 1** | 8 weeks | Core Infrastructure + PortSIP Voice | Channel Gateway, Routing Engine, Redis Agent State, WebSocket consolidation, **PortSIP PBX integration**, WebRTC softphone |
| **Phase 2** | 4 weeks | Email Integration | Gmail/MS365 adapters, email flow designer |
| **Phase 3** | 4 weeks | Social, Live Chat & Additional PBX | Facebook, Zalo, Live Chat widget, chat flow designer, **Cisco Webex CC + FreeSWITCH adapters** |
| **Phase 4** | 4 weeks | IVR, SMS & Advanced Routing | IVR flow designer, SMS adapters, advanced routing rules |
| **Phase 5** | 4 weeks | Polish & Production | Performance tuning, monitoring, load testing, documentation |

**Total: ~24 weeks**

---

### Phase 1: Core Infrastructure + PortSIP Voice (Weeks 1-8)

#### Sprint 1.1 (Weeks 1-2): Channel Gateway, Plugin Architecture & PBX Abstraction

| Task | Description | Effort |
|---|---|---|
| 1.1.1 | Create Channel Gateway service scaffold (MS-20, port 3020) | 1d |
| 1.1.2 | Implement `IChannelAdapter` interface and `ChannelAdapterRegistry` | 2d |
| 1.1.3 | Implement `ChannelMessage` normalization types and validation | 1d |
| 1.1.4 | Create `ChannelConfig` entity with CRUD endpoints | 1d |
| 1.1.5 | Implement adapter health check and monitoring | 1d |
| 1.1.6 | Set up Kafka topics (`channel.inbound`, `channel.outbound`, `interaction.*`, `agent.*`, `cdr.*`) | 1d |
| 1.1.7 | Implement inbound message flow: adapter → normalize → Kafka publish | 2d |
| 1.1.8 | Implement outbound message flow: Kafka consume → adapter → send | 1d |
| 1.1.9 | Define `IPbxProvider` abstraction layer and sub-interfaces (§18.2) | 1d |
| 1.1.10 | Create PBX entity mappings: `pbx_extension_mappings`, `pbx_queue_mappings`, `pbx_cdr_records` | 1d |

#### Sprint 1.2 (Weeks 3-4): PortSIP Adapter Core + Agent/Queue Sync

| Task | Description | Effort |
|---|---|---|
| 1.2.1 | Implement PortSIP API client (auth, token refresh, HTTP wrapper) | 2d |
| 1.2.2 | Implement `PortSipExtensionManager` — extension CRUD, auto-allocation | 2d |
| 1.2.3 | Implement `PortSipQueueManager` — queue CRUD, agent assignment, skill levels | 2d |
| 1.2.4 | Implement Agent Sync service (Kafka event-driven + 5min reconciliation) | 2d |
| 1.2.5 | Implement Queue Sync service (Omni queues → PortSIP call queues) | 1d |
| 1.2.6 | Set up PortSIP PBX + coturn Docker containers | 1d |
| 1.2.7 | Implement `CallRoutingFailureHandler` — no-answer/fail re-routing với Top-N candidate list (§18.12.2, §18.12.3) | 2d |
| 1.2.8 | Implement agent anti-desync: SIP registration tracking via `extension_agent_status` webhook + periodic reconciliation (§18.11.2, §18.11.3) | 2d |

#### Sprint 1.3 (Weeks 5-6): PortSIP Events + State Sync + CDR

| Task | Description | Effort |
|---|---|---|
| 1.3.1 | Implement `PortSipEventSubscriber` — WSI WebSocket connection + reconnect | 2d |
| 1.3.2 | Implement Agent State Sync (bidirectional: Omni↔PortSIP) | 2d |
| 1.3.3 | Implement `PortSipCallControl` — make, answer, hold, unhold, transfer, conference | 2d |
| 1.3.4 | Implement CDR Sync (webhook + WSI events + polling fallback → Interaction Service) | 2d |
| 1.3.5 | Implement Recording Sync (BullMQ job: PortSIP recordings → SeaweedFS) | 1d |
| 1.3.6 | Implement event pipeline: PortSIP WSI → Redis → WebSocket → Agent Desktop | 1d |
| 1.3.7 | Configure PortSIP Virtual Receptionist + implement IVR webhook endpoint (`POST /cti/ivr/webhook`) (§18.10.4) | 1d |

#### Sprint 1.4 (Weeks 7-8): WebRTC + Frontend + Routing Engine

| Task | Description | Effort |
|---|---|---|
| 1.4.1 | Implement WebRTC credential provisioning (`GET /cti/webrtc/credentials`) | 1d |
| 1.4.2 | Frontend: SIP.js integration with PortSIP WSS — register, make/receive calls | 3d |
| 1.4.3 | Frontend: integrate SIP.js with `CallContext.tsx` + `FloatingCallWidget.tsx` | 2d |
| 1.4.4 | Implement Redis Agent State Manager (hash, sorted sets, available sets) | 2d |
| 1.4.5 | Implement agent scoring algorithm + queue management | 2d |
| 1.4.6 | Connect Routing Engine to Kafka consumer (`channel.inbound`) | 1d |
| 1.4.7 | Upgrade Interaction/Agent services: new fields, Kafka events, Redis integration | 2d |
| 1.4.8 | Consolidate WebSocket: single gateway with namespaces | 1d |
| 1.4.9 | Admin: Agent Group & Skill CRUD + Queue configuration pages | 2d |

---

### Phase 2: Email Integration (Weeks 9-12)

#### Sprint 2.1 (Weeks 9-10): Gmail & Microsoft 365

| Task | Description | Effort |
|---|---|---|
| 2.1.1 | Implement `GmailAdapter` (OAuth, push notifications, send/receive) | 3d |
| 2.1.2 | Implement `MicrosoftAdapter` (Azure AD, Graph API webhooks, send/receive) | 3d |
| 2.1.3 | Implement email threading (map external thread ID → interaction) | 1d |
| 2.1.4 | Frontend: enhance `EmailReplyDialog` with real send via API | 1d |
| 2.1.5 | Admin: email channel configuration page (Gmail OAuth, MS365 OAuth) | 1d |

#### Sprint 2.2 (Weeks 11-12): Email Flows & IMAP

| Task | Description | Effort |
|---|---|---|
| 2.2.1 | Implement `ImapAdapter` for generic email providers | 2d |
| 2.2.2 | Implement basic email flow designer (auto-categorize, auto-reply nodes) | 3d |
| 2.2.3 | Frontend: expand channel filters and types for email sub-channels | 1d |
| 2.2.4 | Frontend: implement `UnifiedSocketClient` replacing 3 separate connections | 1d |

---

### Phase 3: Social, Live Chat & Additional PBX (Weeks 13-16)

#### Sprint 3.1 (Weeks 13-14): Facebook, Zalo & Cisco/FreeSWITCH Adapters

| Task | Description | Effort |
|---|---|---|
| 3.1.1 | Implement `FacebookAdapter` (Page connect, webhooks, send/receive) | 3d |
| 3.1.2 | Implement `ZaloAdapter` (OA API, webhooks, send/receive) | 3d |
| 3.1.3 | Implement rich message rendering (buttons, cards, quick replies) per channel | 2d |
| 3.1.4 | Frontend: extend `ChatTimeline` for social channel rich elements | 2d |
| 3.1.5 | Admin: social channel configuration (Facebook Page OAuth, Zalo OA setup) | 1d |
| 3.1.6 | Implement `WebexCcAdapter` via `IPbxProvider` abstraction (Cisco Webex CC API) | 2d |
| 3.1.7 | Implement `FreeSwitchAdapter` via `IPbxProvider` abstraction (ESL) | 2d |

#### Sprint 3.2 (Weeks 15-16): Live Chat Widget & Chat Flows

| Task | Description | Effort |
|---|---|---|
| 3.2.1 | Implement `LiveChatAdapter` (internal WebSocket handler) | 2d |
| 3.2.2 | Build live chat widget (React + Vite library mode → JS bundle) | 3d |
| 3.2.3 | Widget features: pre-chat form, file upload, typing indicator, transcript | 2d |
| 3.2.4 | Admin: live chat widget designer (colors, logo, position, greeting) | 2d |
| 3.2.5 | Implement chat/social flow designer (bot greeting, FAQ, handoff nodes) | 2d |
| 3.2.6 | Implement external chatbot API handoff node | 1d |

---

### Phase 4: IVR, SMS & Advanced Routing (Weeks 17-20)

#### Sprint 4.1 (Weeks 17-18): IVR Flow Designer

| Task | Description | Effort |
|---|---|---|
| 4.1.1 | Implement IVR flow execution engine (state machine) | 3d |
| 4.1.2 | Implement IVR nodes: play audio, collect DTMF, menu, HTTP request | 3d |
| 4.1.3 | Admin: IVR flow designer UI (React Flow canvas + node palette) | 3d |
| 4.1.4 | TTS integration (Google TTS or local) | 1d |
| 4.1.5 | IVR flow testing/simulation mode | 1d |

#### Sprint 4.2 (Weeks 19-20): SMS & Advanced Routing

| Task | Description | Effort |
|---|---|---|
| 4.2.1 | Implement `TwilioSmsAdapter` | 2d |
| 4.2.2 | Implement `WhatsAppAdapter` (Cloud API) | 2d |
| 4.2.3 | Implement advanced routing rules (time-based, skills-based, priority-based) | 2d |
| 4.2.4 | Implement queue overflow and failover logic | 1d |
| 4.2.5 | Admin: routing rules configuration UI | 2d |
| 4.2.6 | Implement runtime agent config changes (reload adapter configs without restart) | 1d |

---

### Phase 5: Polish & Production (Weeks 21-24)

#### Sprint 5.1 (Weeks 21-22): Performance & Monitoring

| Task | Description | Effort |
|---|---|---|
| 5.1.1 | Load testing (k6): validate throughput targets per channel | 2d |
| 5.1.2 | Redis cluster setup (3 masters + 3 replicas) | 1d |
| 5.1.3 | Kafka partition optimization | 1d |
| 5.1.4 | WebSocket Redis adapter for multi-instance broadcasting | 1d |
| 5.1.5 | Prometheus metrics for all new services | 2d |
| 5.1.6 | Grafana dashboards (agent state, queue metrics, channel throughput) | 2d |

#### Sprint 5.2 (Weeks 23-24): Hardening & Documentation

| Task | Description | Effort |
|---|---|---|
| 5.2.1 | End-to-end testing: full interaction lifecycle per channel | 3d |
| 5.2.2 | Security audit: webhook signature verification, credential encryption | 2d |
| 5.2.3 | PortSIP ↔ Cisco/FreeSWITCH adapter interop testing | 2d |
| 5.2.4 | Operational runbook and troubleshooting guide | 1d |
| 5.2.5 | API documentation (OpenAPI specs for all new endpoints) | 1d |

---

## 16. Risk Assessment

| # | Risk | Probability | Impact | Mitigation |
|---|---|---|---|---|
| R1 | **PortSIP WebRTC + NAT traversal** — corporate firewalls may block WebRTC | Medium | High | Deploy coturn TURN server from day 1; test in corporate firewall environments; use hosted TURN (Twilio/Xirsys) as fallback; PortSIP built-in WebRTC simplifies stack vs mediasoup+drachtio |
| R2 | **Social API changes** — Facebook/Zalo/WhatsApp APIs change frequently | Medium | Medium | Abstract behind `IChannelAdapter`; version-pin SDKs; monitor changelog feeds; adapter hot-reload capability |
| R3 | **Redis single point of failure** — all routing depends on Redis | Medium | Critical | Redis Cluster from day 1; Redis Sentinel for auto-failover; PostgreSQL as fallback for agent state recovery |
| R4 | **Kafka operational complexity** — new to team | Medium | Medium | Start with single-broker Docker; graduate to cluster only for production; use managed Kafka if available |
| R5 | **Email OAuth token refresh** — Gmail/MS365 tokens expire | Medium | High | Implement robust token refresh with retry; alert on refresh failure; store refresh tokens encrypted |
| R6 | **Flow designer state persistence** — chat flows that span hours | Low | Medium | Redis-backed state with PostgreSQL fallback; TTL-based cleanup; resume-on-reconnect |
| R7 | **Multi-tenant data isolation** — all services shared | Medium | Critical | Tenant ID on every entity; RLS in PostgreSQL; Redis key prefix per tenant; strict query scoping |
| R8 | **WebSocket scaling** — 10k+ concurrent connections | Medium | High | Socket.IO Redis adapter; horizontal gateway instances; connection load balancing |
| R9 | **Zalo API access** — requires business verification in Vietnam | Medium | Medium | Start Zalo OA verification process immediately (can take 2-4 weeks); develop against sandbox |
| R10 | **Scope creep** — 17 requirements is ambitious for 24 weeks | High | High | Strict phase gates; MVP-first for each channel (text only before rich media); PortSIP in Phase 1, other PBX adapters deferred to Phase 3 |
| R11 | **PortSIP API compatibility** — API may change between PortSIP versions | Medium | Medium | Pin to v22.3; abstract behind `IPbxProvider` interface; version-specific adapter implementation; maintain API contract tests |
| R12 | **PortSIP ↔ Omnichannel state drift** — agent/queue state may diverge | Medium | High | 3-layer sync reliability (Kafka events + WSI real-time + 5min polling reconciliation); PBX call states authoritative for conflicts; monitoring dashboard for sync health |
| R13 | **PortSIP Virtual Receptionist IVR limits** — built-in IVR không hỗ trợ multi-turn conversation hay real-time banking API calls | Medium | Medium | Dùng multi-step webhook (§18.10.5 Option A) cho complex flows Phase 1-3; Phase 4+ xem xét B2BUA (Option B) nếu Virtual Receptionist không đủ |
| R14 | **Routing Model A vs B decision** — Model A mất Omnichannel scoring; Model B cần PortSIP direct-to-agent API (chưa verify) | High | High | Phase 1 dùng Model A (PortSIP queue routing với skill sync); nghiên cứu và verify PortSIP direct-to-agent API trước khi bắt đầu Phase 2 (§18.12.4) |

---

## 17. Requirements Cross-Reference

| Req # | Requirement | Addressed In | Phase | Status |
|---|---|---|---|---|
| R1 | Real-time omnichannel (voice, chat, social, email, SMS) | §4 Target Architecture, §6 Plugin Architecture, §9 Channel Designs | 1-4 | Planned |
| R2 | High throughput (thousands msg/sec, thousands concurrent calls) | §12 Performance Architecture | 5 | Planned |
| R3 | Gmail + Microsoft 365 email integration | §9.2 Email Channel | 2 | Planned |
| R4 | WebRTC SDK for browser-based calling | §9.1.1 WebRTC Design, §18.5 WebRTC Integration | **1** (via PortSIP built-in WebRTC) | Planned |
| R5 | Chat: Zalo OA, Facebook Fanpage, Live Chat widget | §9.3 Social Channels, §9.5 Live Chat | 3 | Planned |
| R6 | SMS adapter design | §9.4 SMS Channel, §6.4 Adapter Table | 4 | Planned |
| R7 | Open plugin architecture for new channels | §6 Channel Adapter Plugin Architecture | 1 | Planned |
| R8 | Skill/group-based routing with availability | §7 Routing Engine Design, §8 Agent State | 1 | Planned |
| R9 | Centralized high-performance agent state management | §8 Agent State Management (Redis) | 1 | Planned |
| R10 | Admin config for groups/skills | §13.2 Admin UI — Group & Skill Management | 1 | Planned |
| R11 | Single Agent Desktop for all channels | §14 Frontend Agent Desktop Changes | 1-3 | Planned |
| R12 | IVR flow designer (drag-and-drop) | §10 Flow Designer Engine, §13.1.1 IVR Designer | 4 | Planned |
| R13 | Email flow designer (drag-and-drop) | §10 Flow Designer Engine, §13.1.2 Email Designer | 2 | Planned |
| R14 | Chat/Social/SMS flow designer (drag-and-drop) | §10 Flow Designer Engine, §13.1.3 Chat Designer | 3 | Planned |
| R15 | External chatbot API for routing | §10.3 Chat Nodes (`chat_bot_handoff`) | 3 | Planned |
| R16 | Runtime agent config changes (no restart) | §6.3 Adapter Registry (`reloadConfig`) | 4 | Planned |
| R17 | High throughput, real-time, low latency | §8.1 Redis Hot Path, §12 Performance Architecture | 1,5 | Planned |

---

## 18. PortSIP v22.3 Integration Design

> **PortSIP v22.3 is the primary PBX for Phase 1.** Omnichannel is the MASTER system — all agent/queue/skill management happens in Omnichannel and syncs down to PortSIP. CDR, recordings, and call history sync from PortSIP back to Omnichannel. Agent softphones (SIP.js/WebRTC) register directly to PortSIP.

### 18.1 PortSIP API Overview

#### Authentication
```
POST /auth/sign_in          → { access_token, refresh_token }
POST /auth/refresh_token    → { access_token }
```
- Admin credentials authenticate the CTI Adapter Service
- Token auto-refresh managed by `PortSipAuthService`

#### Extensions (User/Extension Management)
```
GET    /extension_numbers/{ext}    → Check extension availability
GET    /user                       → List extensions
POST   /user                       → Create extension
GET    /user/{id}                  → Get extension details
PUT    /user/{id}                  → Update extension
DELETE /user/{id}                  → Delete extension
```

#### Call Queues
```
GET    /queue                      → List queues
POST   /queue                      → Create queue
GET    /queue/{id}                 → Get queue details
PUT    /queue/{id}                 → Update queue
DELETE /queue/{id}                 → Delete queue
GET    /queue/{id}/agents          → List queue agents
POST   /queue/{id}/agents          → Add agent to queue (with skill_level)
DELETE /queue/{id}/agents/{agentId}→ Remove agent from queue
PUT    /queue/{id}/agents/{agentId}→ Update agent skill level in queue
```

#### Call Sessions (Call Control)
```
POST   /call_sessions              → Create (make) call
POST   /call_sessions/{id}/hold    → Hold call
POST   /call_sessions/{id}/unhold  → Unhold call
POST   /call_sessions/{id}/refer   → Blind transfer
POST   /call_sessions/{id}/attended_refer → Attended transfer
DELETE /call_sessions/{id}         → Hangup call
```

#### Ring Groups
```
GET    /ring_group                 → List ring groups
POST   /ring_group                 → Create ring group
GET    /ring_group/{id}            → Get ring group details
PUT    /ring_group/{id}            → Update ring group
DELETE /ring_group/{id}            → Delete ring group
GET    /ring_group/{id}/members    → List members
POST   /ring_group/{id}/members    → Add member
DELETE /ring_group/{id}/members/{memberId} → Remove member
```

#### CDR & Call Logs
```
GET    /cdrs                       → Query CDR records (with date range, extension, etc.)
GET    /calllogs                   → Call logs for specific extension
GET    /call_reports               → Aggregated call reports
```

#### Conference
```
POST   /conference_rooms           → Create conference room
GET    /conference_rooms/{id}/participants → List participants
POST   /conference_rooms/{id}/participants → Add participant
DELETE /conference_rooms/{id}/participants/{pid} → Remove participant
POST   /conference_rooms/{id}/recording/start → Start recording
POST   /conference_rooms/{id}/recording/stop  → Stop recording
```

#### WSI (WebSocket Interface) — Real-time Events
```
WebSocket: wss://{host}:8887/wsi

Subscribe topics:
  extension_events   → Extension register/unregister, call state changes
  queue_events       → Queue call waiting, agent joined/left, call distributed
  cdr_events         → New CDR record created
  conference_events  → Conference room events
```

#### Webhooks (Backup Event Delivery)
```
POST /webhooks                     → Register webhook URL

Webhook Events (đầy đủ):
  cdr_target_ringing     → Agent/extension bắt đầu ringing
  cdr_target_noanswer    → Agent không trả lời (timeout) — KEY cho re-routing
  cdr_target_fail        → Delivery thất bại (480/503/network) — KEY cho re-routing
  cdr_target_end         → Call với agent kết thúc
  call_cdr               → CDR đầy đủ sau khi call hoàn thành
  call_update_info       → Thay đổi trạng thái call
  queue_caller_status    → Queue caller events: enqueue/agent_answered/overflow/hangup/callback
  queue_agent_status     → Agent status trong queue thay đổi
  extension_agent_status → Extension agent status thay đổi (add/remove/status_change)
```

---

### 18.2 PBX Provider Abstraction Layer (IPbxProvider)

```typescript
/**
 * Abstraction layer for PBX integration.
 * PortSIP implements this in Phase 1.
 * Cisco Webex CC and FreeSWITCH implement this in Phase 3.
 */

// ── Top-level PBX Provider ───────────────────────────────────
interface IPbxProvider {
  readonly vendorId: string;        // 'portsip' | 'webex_cc' | 'freeswitch'
  readonly vendorVersion: string;   // '22.3'

  initialize(config: PbxProviderConfig): Promise<void>;
  shutdown(): Promise<void>;
  healthCheck(): Promise<PbxHealthStatus>;

  // Sub-providers
  extensions: IPbxExtensionManager;
  queues: IPbxQueueManager;
  callControl: IPbxCallControl;
  agentState: IPbxAgentStateManager;
  cdr: IPbxCdrProvider;
  events: IPbxEventSubscriber;
}

// ── Extension Management ─────────────────────────────────────
interface IPbxExtensionManager {
  createExtension(params: CreateExtensionParams): Promise<PbxExtension>;
  getExtension(extensionNumber: string): Promise<PbxExtension | null>;
  updateExtension(extensionNumber: string, params: UpdateExtensionParams): Promise<PbxExtension>;
  deleteExtension(extensionNumber: string): Promise<void>;
  listExtensions(filter?: ExtensionFilter): Promise<PbxExtension[]>;
  checkAvailability(extensionNumber: string): Promise<boolean>;
}

// ── Queue Management ─────────────────────────────────────────
interface IPbxQueueManager {
  createQueue(params: CreateQueueParams): Promise<PbxQueue>;
  getQueue(queueId: string): Promise<PbxQueue | null>;
  updateQueue(queueId: string, params: UpdateQueueParams): Promise<PbxQueue>;
  deleteQueue(queueId: string): Promise<void>;
  listQueues(): Promise<PbxQueue[]>;

  addAgentToQueue(queueId: string, extensionNumber: string, skillLevel?: number): Promise<void>;
  removeAgentFromQueue(queueId: string, extensionNumber: string): Promise<void>;
  updateAgentSkillLevel(queueId: string, extensionNumber: string, skillLevel: number): Promise<void>;
  getQueueAgents(queueId: string): Promise<PbxQueueAgent[]>;
}

// ── Call Control ─────────────────────────────────────────────
interface IPbxCallControl {
  makeCall(from: string, to: string, options?: CallOptions): Promise<PbxCallSession>;
  answerCall(callId: string): Promise<void>;
  hangupCall(callId: string): Promise<void>;
  holdCall(callId: string): Promise<void>;
  unholdCall(callId: string): Promise<void>;
  blindTransfer(callId: string, destination: string): Promise<void>;
  attendedTransfer(callId: string, destination: string): Promise<void>;
  conference(callId: string, participants: string[]): Promise<PbxConferenceSession>;
  muteCall(callId: string): Promise<void>;
  unmuteCall(callId: string): Promise<void>;
  sendDtmf(callId: string, digits: string): Promise<void>;
}

// ── Agent State Management ───────────────────────────────────
interface IPbxAgentStateManager {
  setAgentReady(extensionNumber: string, queueIds?: string[]): Promise<void>;
  setAgentNotReady(extensionNumber: string, reason?: string): Promise<void>;
  getAgentState(extensionNumber: string): Promise<PbxAgentState>;
  listAgentStates(queueId?: string): Promise<PbxAgentState[]>;
}

// ── CDR Provider ─────────────────────────────────────────────
interface IPbxCdrProvider {
  getCdrs(filter: CdrFilter): Promise<PbxCdr[]>;
  getCdrById(cdrId: string): Promise<PbxCdr | null>;
  getRecordingUrl(cdrId: string): Promise<string | null>;
  downloadRecording(cdrId: string): Promise<NodeJS.ReadableStream>;
}

// ── Event Subscriber ─────────────────────────────────────────
interface IPbxEventSubscriber {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;

  onExtensionEvent(handler: (event: PbxExtensionEvent) => Promise<void>): void;
  onQueueEvent(handler: (event: PbxQueueEvent) => Promise<void>): void;
  onCdrEvent(handler: (event: PbxCdrEvent) => Promise<void>): void;
  onCallEvent(handler: (event: PbxCallEvent) => Promise<void>): void;
}
```

**Relationship to IChannelAdapter:**
```
IChannelAdapter (channelType='voice', subChannel='portsip')
    └─ delegates to IPbxProvider (vendorId='portsip')
        ├── IPbxExtensionManager  → PortSipExtensionManager
        ├── IPbxQueueManager      → PortSipQueueManager
        ├── IPbxCallControl       → PortSipCallControl
        ├── IPbxAgentStateManager → PortSipAgentState
        ├── IPbxCdrProvider       → PortSipCdrProvider
        └── IPbxEventSubscriber   → PortSipEventSubscriber
```

---

### 18.3 PortSIP Adapter Module Structure

```
services/cti-adapter-service/src/
├── adapters/
│   ├── pbx-provider.interface.ts          # IPbxProvider + all sub-interfaces
│   ├── pbx-provider.factory.ts            # Factory: vendorId → IPbxProvider instance
│   └── portsip/
│       ├── portsip.module.ts              # NestJS module
│       ├── portsip.adapter.ts             # PortSipAdapter implements IChannelAdapter
│       ├── portsip-auth.service.ts        # JWT auth + token refresh
│       ├── portsip-api-client.ts          # HTTP wrapper (axios + circuit breaker)
│       ├── portsip-extension-manager.ts   # IPbxExtensionManager impl
│       ├── portsip-queue-manager.ts       # IPbxQueueManager impl
│       ├── portsip-call-control.ts        # IPbxCallControl impl
│       ├── portsip-agent-state.ts         # IPbxAgentStateManager impl
│       ├── portsip-cdr-provider.ts        # IPbxCdrProvider impl
│       ├── portsip-event-subscriber.ts    # IPbxEventSubscriber impl (WSI WebSocket)
│       └── portsip-mapper.ts              # Data mapping functions
├── sync/
│   ├── agent-sync.service.ts              # Agent ↔ Extension sync
│   ├── queue-sync.service.ts              # Queue ↔ PBX Queue sync
│   ├── state-sync.service.ts              # Agent state bidirectional sync
│   ├── cdr-sync.service.ts                # CDR → Interaction Service
│   └── recording-sync.service.ts          # Recording files → SeaweedFS
├── entities/
│   ├── pbx-extension-mapping.entity.ts    # agentId ↔ extension_number
│   ├── pbx-queue-mapping.entity.ts        # omniQueueId ↔ portsipQueueId
│   └── pbx-cdr-record.entity.ts           # Synced CDR records
└── webrtc/
    └── webrtc-credential.service.ts       # SIP.js credential provisioning
```

---

### 18.4 Sync Architecture

#### 18.4.1 Agent Sync (Omnichannel → PortSIP)

**Trigger:** Kafka events (`agent.created`, `agent.updated`, `agent.deleted`) + 5-minute reconciliation cron

**Mapping Table: `pbx_extension_mappings`**

| Column | Type | Description |
|---|---|---|
| `id` | UUID | Primary key |
| `agentId` | UUID | FK → Agent Service |
| `pbxVendor` | varchar | `'portsip'` |
| `extensionNumber` | varchar | e.g., `'1001'` |
| `pbxUserId` | varchar | PortSIP internal user ID |
| `sipPassword` | varchar (encrypted) | SIP registration password |
| `status` | enum | `'active' | 'suspended' | 'pending'` |
| `lastSyncAt` | timestamp | Last successful sync |

**Extension Number Allocation:**
- Configurable range: `PORTSIP_EXT_RANGE_START=1000`, `PORTSIP_EXT_RANGE_END=9999`
- Auto-allocate next available number from range
- Manual override via admin UI

**Sync Flow:**
```
Agent Created (Kafka) → AgentSyncService
    → Check if extension mapping exists
    → If not: allocate extension number → POST /user (PortSIP)
    → Save mapping to pbx_extension_mappings
    → If agent has queue assignments → add to PortSIP queues

Agent Updated (Kafka) → AgentSyncService
    → Fetch current mapping
    → PUT /user/{id} (PortSIP) — update display name, skills, etc.
    → Re-sync queue memberships if skills changed

Agent Deleted (Kafka) → AgentSyncService
    → DELETE /user/{id} (PortSIP)
    → Soft-delete mapping (status → 'suspended')

Reconciliation (every 5 min) → AgentSyncService
    → GET /user (PortSIP) — all extensions
    → Compare with pbx_extension_mappings
    → Fix any drift (create missing, remove orphaned)
```

#### 18.4.2 Queue Sync (Omnichannel → PortSIP)

**Scope:** Only voice queues sync to PortSIP. Email/chat queues managed by Routing Engine only.

**Mapping Table: `pbx_queue_mappings`**

| Column | Type | Description |
|---|---|---|
| `id` | UUID | Primary key |
| `omniQueueId` | UUID | FK → Routing Engine queue |
| `pbxVendor` | varchar | `'portsip'` |
| `pbxQueueId` | varchar | PortSIP queue ID |
| `queueName` | varchar | Queue name |
| `routingStrategy` | varchar | Mapped routing strategy |
| `lastSyncAt` | timestamp | Last successful sync |

**Strategy Mapping:**

| Omnichannel Strategy | PortSIP Strategy |
|---|---|
| `skill_based_least_idle` | `SKILL_BASED_ROUTING_LEAST_WORKED_HUNT` |
| `skill_based_most_idle` | `SKILL_BASED_ROUTING_MOST_IDLE_HUNT` |
| `round_robin` | `ROUND_ROBIN` |
| `longest_idle` | `LONGEST_IDLE` |
| `ring_all` | `RING_ALL` |
| `linear` | `LINEAR_HUNT` |

#### 18.4.3 Skill Sync

When agent skills change in Omnichannel:
- Map proficiency level (1-100) → PortSIP skill_level (1-10) per queue
- Update via `PUT /queue/{id}/agents/{agentId}` with new `skill_level`

#### 18.4.4 Agent State Sync (Bidirectional)

**Omnichannel → PortSIP (agent-initiated):**
```
Agent clicks "Ready" in Agent Desktop
    → WebSocket → Agent Service → Kafka (agent.status.changed)
    → StateSyncService → portsip.agentState.setAgentReady(ext, queueIds)
    → PortSIP: agent becomes available in queue(s)

Agent clicks "Not Ready" (with reason)
    → Same flow → portsip.agentState.setAgentNotReady(ext, reason)
    → PortSIP: agent paused in queue(s)
```

**PortSIP → Omnichannel (PBX-initiated):**
```
PortSIP WSI event: QUEUE_CALL (agent receives call from queue)
    → PortSipEventSubscriber → StateSyncService
    → Redis: set agent state to 'on-interaction'
    → WebSocket → Agent Desktop UI updates

PortSIP WSI event: CALL_ENDED → agent in WRAP_UP
    → StateSyncService → Redis: set agent state to 'wrap-up'
    → After wrap-up timer → set back to 'ready' (if auto-ready enabled)
```

**Conflict Resolution:**
- PBX call states are **authoritative** — if PortSIP says agent is on a call, Omnichannel state must reflect that
- Agent UI status changes are **requested** — they may be rejected if agent is mid-call
- State sync includes a `version` field to prevent stale updates

**State Mapping:**

| Omnichannel State | PortSIP Queue Agent Status | Direction |
|---|---|---|
| `ready` | `READY` | Bidirectional |
| `not-ready` (reason) | `NOT_READY` | Bidirectional |
| `on-interaction` (voice) | `QUEUE_CALL` / `RINGING` | PS → Omni |
| `wrap-up` | `WRAP_UP` | PS → Omni |
| `offline` | Agent not in queue | Bidirectional |

#### 18.4.5 CDR Sync (PortSIP → Omnichannel)

**3-layer reliability:**

1. **WSI Real-time:** `cdr_events` topic — new CDR immediately pushed
2. **Webhook Backup:** PortSIP webhook `cdr_created` → `POST /cti/webhooks/portsip/cdr`
3. **Polling Fallback:** Every 2 minutes, query `GET /cdrs?since={lastSync}` for any missed records

**Sync Flow:**
```
CDR Event (any source) → CdrSyncService
    → Deduplicate by PortSIP CDR ID
    → Map to Interaction fields:
        - caller → customer phone/identifier
        - callee → agent extension → agent ID (via mapping)
        - duration, status, queue, recording URL
    → Publish to Kafka topic: cdr.synced
    → Interaction Service consumes → updates interaction record
    → Save to pbx_cdr_records for audit
```

**CDR → Interaction Mapping:**

| PortSIP CDR Field | Omnichannel Interaction Field |
|---|---|
| `caller` | `sender.externalId` (customer phone) |
| `callee` | `assignedAgentId` (via extension mapping) |
| `start_time` | `startedAt` |
| `answer_time` | `metadata.answerTime` |
| `end_time` | `closedAt` |
| `duration` | `metadata.duration` |
| `status` (answered/missed/busy) | `type` (call/missed-call) |
| `queue_name` | `queueId` (via queue mapping) |
| `recording_url` | `metadata.recordingUrl` (after SeaweedFS sync) |
| `wait_time` | `metadata.queueWaitTime` |

#### 18.4.6 Recording Sync (PortSIP → SeaweedFS)

**Mechanism:** BullMQ background job

```
CDR with recording → RecordingSyncService
    → Add to BullMQ queue: 'recording-sync'
    → Worker picks up:
        1. Download recording from PortSIP API
        2. Upload to SeaweedFS bucket: recordings/{tenant}/{date}/{interaction_id}.wav
        3. Update interaction metadata with SeaweedFS presigned URL
        4. Publish event: recording.synced
    → Retry: 3 attempts with exponential backoff
    → Dead letter queue for failed downloads
```

---

### 18.5 WebRTC Integration

**Architecture:** SIP.js in browser registers directly to PortSIP WSS — no intermediate SFU needed.

```
┌─────────────────────────────┐
│ Agent Desktop (Browser)     │
│                             │
│  SIP.js UserAgent           │
│    │ WSS (port 5066)        │
│    │ SRTP media             │
│    ▼                        │
│  PortSIP PBX v22.3          │
│  (built-in WebRTC Gateway)  │
│                             │
│  coturn TURN server         │
│  (NAT traversal)            │
└─────────────────────────────┘
```

**Credential Provisioning:**
```typescript
// GET /cti/webrtc/credentials
// Response:
{
  wsUri: 'wss://pbx.tpb.vn:5066',
  sipUri: 'sip:1001@pbx.tpb.vn',
  extensionNumber: '1001',
  password: '********',       // SIP auth password
  displayName: 'Agent Nguyễn Văn A',
  iceServers: [
    { urls: 'stun:turn.tpb.vn:3478' },
    { urls: 'turn:turn.tpb.vn:3478', username: '...', credential: '...' }
  ],
  domain: 'pbx.tpb.vn'
}
```

**Frontend Integration with Existing Components:**
- `CallContext.tsx`: Add SIP.js UserAgent lifecycle (register/unregister)
- `FloatingCallWidget.tsx`: Wire real SIP.js call control (answer, hangup, hold, transfer, DTMF)
- Audio device selection via `navigator.mediaDevices.enumerateDevices()`
- Call state events from SIP.js → update CallContext → re-render FloatingCallWidget

---

### 18.6 Real-time Event Pipeline

```
PortSIP WSI (wss://{host}:8887/wsi)
    │
    ▼
PortSipEventSubscriber
    │
    ├──► StateSyncService ──► Redis (agent:state:{id}) ──► WebSocket ──► Agent Desktop
    │                                                         └──► Supervisor Dashboard
    │
    ├──► CdrSyncService ──► Kafka (cdr.synced) ──► Interaction Service
    │                    └──► pbx_cdr_records (audit)
    │
    ├──► QueueEventService ──► Redis (queue:metrics:{id}) ──► WebSocket ──► Supervisor Dashboard
    │
    └──► RecordingSyncService ──► BullMQ ──► SeaweedFS ──► Media Service
```

**WSI Event → Kafka Topic Mapping:**

| WSI Event | Kafka Topic | Consumer |
|---|---|---|
| `extension_registered` | `agent.pbx.registered` | Agent Service |
| `extension_unregistered` | `agent.pbx.unregistered` | Agent Service |
| `call_started` | `cti.call.started` | Interaction Service, Notification Service |
| `call_answered` | `cti.call.answered` | Interaction Service |
| `call_ended` | `cti.call.ended` | Interaction Service |
| `queue_call_waiting` | `queue.call.waiting` | Routing Engine |
| `queue_call_distributed` | `queue.call.distributed` | Routing Engine, Agent Service |
| `queue_agent_joined` | `queue.agent.joined` | Agent Service |
| `queue_agent_left` | `queue.agent.left` | Agent Service |
| `cdr_created` | `cdr.synced` | Interaction Service, Audit Service |

---

### 18.7 Data Mapping Tables

#### Agent ↔ Extension Mapping

| Omnichannel Agent | PortSIP Extension |
|---|---|
| `agentId` (UUID) | `user.id` |
| `displayName` | `user.display_name` |
| `email` | `user.email` |
| — (auto-allocated) | `user.extension_number` |
| — (generated) | `user.sip_password` |
| `skills[]` | `queue_agent.skill_level` (per queue) |
| `maxConcurrentChats` | — (not relevant for PBX) |

#### Queue ↔ PBX Queue Mapping

| Omnichannel Queue | PortSIP Queue |
|---|---|
| `queueId` (UUID) | `queue.id` |
| `name` | `queue.name` |
| `routingStrategy` | `queue.strategy` (mapped per §18.4.2) |
| `maxWaitTime` | `queue.max_wait_time` |
| `wrapUpTime` | `queue.wrap_up_time` |
| `musicOnHold` | `queue.moh_file` |
| `overflowDestination` | `queue.overflow_destination` |

#### Agent State Mapping

| Omnichannel | PortSIP | Redis Key |
|---|---|---|
| `ready` | `READY` | `agent:state:{id}` = `ready` |
| `not-ready:break` | `NOT_READY` | `agent:state:{id}` = `not-ready`, `agent:reason:{id}` = `break` |
| `not-ready:training` | `NOT_READY` | `agent:state:{id}` = `not-ready`, `agent:reason:{id}` = `training` |
| `on-interaction` | `QUEUE_CALL` | `agent:state:{id}` = `on-interaction`, `agent:interaction:{id}` = `{interactionId}` |
| `wrap-up` | `WRAP_UP` | `agent:state:{id}` = `wrap-up` |
| `ringing` | `RINGING` | `agent:state:{id}` = `ringing` |
| `offline` | (not in queue) | `agent:state:{id}` = `offline` |

---

### 18.8 Error Handling & Resilience

| Component | Strategy | Details |
|---|---|---|
| **PortSIP API calls** | Circuit breaker (opossum) | Open after 5 failures in 30s; half-open after 60s; fallback: queue request for retry |
| **WSI WebSocket** | Auto-reconnect | Exponential backoff: 1s → 2s → 4s → 8s → 16s → 30s (max); jitter ±20% |
| **Auth token** | Proactive refresh | Refresh at 80% of token lifetime; retry 3x on failure; alert on persistent failure |
| **Agent sync** | Idempotent + reconciliation | Each sync operation is idempotent (check before create); 5min full reconciliation catches drift |
| **CDR sync** | 3-layer reliability | WSI (real-time) + Webhook (near-real-time) + Polling (2min fallback); deduplicate by CDR ID |
| **Recording sync** | BullMQ with DLQ | 3 retries with exponential backoff; dead letter queue for manual review |
| **Graceful degradation** | Voice-only isolation | If PortSIP is down: voice channel shows "unavailable", email/chat/social channels continue normally |

**Health Check Endpoint:**
```
GET /cti/health/portsip
{
  "status": "healthy|degraded|unhealthy",
  "api": { "status": "up", "latencyMs": 45 },
  "wsi": { "status": "connected", "uptime": "2h34m" },
  "sync": {
    "agents": { "mapped": 45, "orphaned": 0, "lastReconciliation": "..." },
    "queues": { "mapped": 8, "lastSync": "..." },
    "cdr": { "lastSynced": "...", "pending": 0, "dlq": 0 }
  }
}
```

---

### 18.9 Docker Infrastructure

See **Appendix B** for full Docker Compose configuration.

**PortSIP PBX Container:**

| Port | Protocol | Purpose |
|---|---|---|
| 8900 | TCP | Web management console |
| 8887 | TCP (WSS) | WSI — WebSocket Interface for real-time events |
| 5060 | UDP/TCP | SIP signaling |
| 5061 | TCP | SIP TLS |
| 5065 | TCP | WebSocket (WS) for WebRTC |
| 5066 | TCP | WebSocket Secure (WSS) for WebRTC |
| 45000-65000 | UDP | RTP media range |

**coturn TURN Server:**

| Port | Protocol | Purpose |
|---|---|---|
| 3478 | UDP/TCP | STUN/TURN |
| 5349 | TCP | TURN TLS |
| 49152-65535 | UDP | TURN relay ports |

**Environment Variables:**
```env
# PortSIP
PORTSIP_HOST=portsip-pbx
PORTSIP_API_PORT=8900
PORTSIP_WSI_PORT=8887
PORTSIP_WSS_PORT=5066
PORTSIP_ADMIN_USER=admin
PORTSIP_ADMIN_PASSWORD=<encrypted>
PORTSIP_DOMAIN=pbx.tpb.vn
PORTSIP_EXT_RANGE_START=1000
PORTSIP_EXT_RANGE_END=9999

# coturn
TURN_HOST=coturn
TURN_PORT=3478
TURN_SECRET=<encrypted>
TURN_REALM=turn.tpb.vn
```

---

### 18.10 IVR Architecture (Virtual Receptionist + Webhook)

#### 18.10.1 Giới hạn của PortSIP REST API với media

PortSIP v22.3 **KHÔNG** cung cấp:
- REST API inject audio vào active call từ external system
- REST API collect DTMF từ active call
- AGI-style script control kiểu Asterisk

Do đó Omnichannel IVR Flow Engine **KHÔNG THỂ** trực tiếp phát audio hay đọc DTMF qua REST. Mọi IVR execution phải dựa vào cơ chế native của PortSIP.

#### 18.10.2 Kiến trúc IVR đúng: Virtual Receptionist + Webhook

PortSIP có sẵn **Virtual Receptionist** (built-in IVR) với webhook callback. Khi caller nhấn DTMF, PortSIP gọi webhook của CTI Adapter, nhận destination, rồi route call.

```
Cuộc gọi đến DID
    │
    ▼
PortSIP Virtual Receptionist (cấu hình sẵn)
    ├── Phát audio prompt (file .wav upload lên PortSIP)
    ├── Thu DTMF input từ caller
    │
    ▼ (POST webhook với DTMF input)
CTI Adapter Service (Omnichannel)
    ├── POST /cti/ivr/webhook (nhận DTMF + call info)
    ├── Gọi Customer Service → nhận diện khách hàng
    ├── Chạy Routing Engine → chọn queue + skills
    ├── Trả về HTTP response: { "destination": "queue:mortgage_vip" }
    │
    ▼
PortSIP route call → Call Queue theo destination
    │
    ▼
Queue → ring agents (theo §18.12)
```

#### 18.10.3 Cấu hình Virtual Receptionist

Admin cấu hình trong PortSIP Admin Console:
- Upload audio prompts (tiếng Việt: `welcome.wav`, `menu.wav`, v.v.)
- DTMF matching patterns: `1` = "Tiết kiệm", `2` = "Vay vốn", `*` = "Gặp tổng đài"
- Webhook URL: `https://api.tpb.vn/cti/ivr/webhook`
- Auth: HTTP Basic Auth hoặc Bearer token
- Timeout: 5s chờ DTMF, retry 2 lần

Omnichannel Admin UI (Phase 4) sync cấu hình IVR lên PortSIP qua REST API.

#### 18.10.4 IVR Webhook API (CTI Adapter endpoint)

```
POST /cti/ivr/webhook

Request (từ PortSIP):
{
  "call_id": "portsip-call-uuid",
  "caller": "0901234567",
  "called_did": "18001234",
  "dtmf_input": "2",
  "ivr_menu_id": "main_menu",
  "timestamp": "2026-03-16T10:00:00Z"
}

Response (Omnichannel trả về cho PortSIP):
{
  "action": "route_to_queue",     // route_to_queue | route_to_extension | repeat | hangup
  "destination": "queue:loan_processing",  // queue ID hoặc extension number
  "priority": "high",
  "tags": ["new_customer", "loan_product"],
  "customer_id": "cust-uuid-123"  // nếu đã identify được
}
```

#### 18.10.5 Dynamic IVR cho Phase 4

Khi cần IVR phức tạp hơn (collect thêm thông tin, gọi API banking, verify OTP):

- **Option A — Multi-step webhook**: PortSIP gọi webhook nhiều lần (mỗi DTMF step). CTI Adapter duy trì session state trong Redis giữa các bước.
- **Option B — External SIP UA (B2BUA)**: CTI Adapter dùng `drachtio` + `node-sip2` làm B2BUA.
  - Phase 4 only, khi Virtual Receptionist không đủ phức tạp.
  - CTI Adapter đứng giữa như 1 SIP agent, tự play audio/collect DTMF.
  - Sau khi hoàn thành IVR flow → attended transfer sang real agent.

---

### 18.11 Agent State Reliability & Anti-Desync

#### 18.11.1 Nguồn gốc desync

| Tình huống | Hậu quả | Xác suất |
|---|---|---|
| Browser crash (tab đóng đột ngột) | SIP.js không deregister, Redis vẫn = ready | Cao |
| Network timeout agent side | WS mất nhưng SIP registration còn (600s expire) | Trung bình |
| CTI Adapter mất WSI connection | Không nhận được state events từ PortSIP | Thấp nhưng nghiêm trọng |
| Race condition: agent click Not-Ready trong lúc call đang được route | Redis cập nhật nhưng PortSIP chưa, call vẫn ring | Trung bình |
| PortSIP API call timeout khi set agent Ready | Omnichannel Redis = ready, PortSIP = not-ready | Thấp |

#### 18.11.2 Multi-layer Registration Tracking

```
Layer 1 — SIP Registration (mạnh nhất):
  PortSIP webhook: extension_agent_status
    → action: "add" / "remove" / status_change
    → CTI Adapter nhận → cập nhật Redis ngay lập tức
    → agent offline = SREM agent:available:voice

Layer 2 — WebSocket Heartbeat:
  Agent Desktop WS ping/pong mỗi 30s
  Miss 3 consecutive pings (90s) → nghi ngờ mất kết nối
  → Check SIP registration status với PortSIP API: GET /user/{id}
  → Nếu SIP expired → force offline
  → Nếu SIP still registered → WS reconnect đang xử lý, wait thêm 60s

Layer 3 — Periodic Reconciliation (mỗi 2 phút):
  StateSyncService query PortSIP: GET /queue/{id}/agents (tất cả queues)
  Compare với Redis agent:available:voice
  Phát hiện drift → fix:
    - PortSIP = not_ready nhưng Redis = ready  → update Redis to not-ready
    - PortSIP = ready    nhưng Redis = offline → chỉ update nếu WS connected
```

#### 18.11.3 SIP Registration State Machine

```
                   SIP REGISTER
Browser start ────────────────────► REGISTERED ──────► READY (nếu auto-ready)
                                        │
                   SIP re-REGISTER      │
                   (mỗi 60s)            │  extension_agent_status: remove/status_change
                   keeps alive          │
                                        ▼
                                   UNREGISTERED ──► force NOT-READY → OFFLINE
                                        │
                   Reconnect within     │  grace period: 30s
                   grace period         │
                        ▲               │
                        └───────────────┘
```

**SIP.js config:** `register_expires: 60` (thay vì mặc định 600s) — PortSIP biết trong 60s nếu không re-register = agent gone.

#### 18.11.4 Atomic State Check trước khi Route

Trước khi Routing Engine assign cuộc gọi cho agent, thực hiện atomic validation:

```typescript
// Pseudo-code: atomic check với Redis MULTI/EXEC
async function validateAndClaim(agentId: string, channelType: ChannelType): Promise<boolean> {
  const result = await redis.multi()
    .sismember(`agent:available:${channelType}`, agentId)         // check still in available set
    .hget(`agent:state:${agentId}`, `${channelType}_status`)      // check status
    .hget(`agent:state:${agentId}`, `${channelType}_count`)       // check current count
    .hget(`agent:state:${agentId}`, `max_${channelType}`)         // check max capacity
    .exec();

  const [isAvailable, status, count, max] = result;
  if (!isAvailable || status !== 'ready' || count >= max) return false;

  // Optimistic lock: increment count atomically
  const newCount = await redis.hincrby(`agent:state:${agentId}`, `${channelType}_count`, 1);
  if (newCount > max) {
    // Rollback
    await redis.hincrby(`agent:state:${agentId}`, `${channelType}_count`, -1);
    return false;
  }

  // Nếu count = max → remove from available set
  if (newCount === max) {
    await redis.srem(`agent:available:${channelType}`, agentId);
  }

  return true;
}
```

#### 18.11.5 State Version & Stale Detection

Bổ sung thêm các field vào `HASH agent:state:{agentId}` (xem §18.4.2):

```
HASH agent:state:{agentId}
  ...existing fields (§18.4.2)...
  state_version     = 47          ← tăng mỗi lần có state change
  state_updated_at  = timestamp
  last_pbx_sync_at  = timestamp   ← lần cuối sync với PortSIP
  pbx_state         = "READY" | "NOT_READY" | "QUEUE_CALL" | "WRAP_UP"
  pbx_state_version = 47          ← version từ PortSIP (monotonic)
```

**Conflict resolution:**
- `incoming_version < state_version` → reject (stale update)
- `pbx_state ≠ omni_state` và `last_pbx_sync_at < 5s` → conflict:
  - **PBX state wins** cho call-related states (`QUEUE_CALL`, `WRAP_UP`)
  - **Omni state wins** cho agent-initiated states (`READY`, `NOT_READY`)

---

### 18.12 Call Routing Failure Handling

#### 18.12.1 Tổng quan các failure scenarios

| Scenario | PortSIP Event | Omnichannel Action |
|---|---|---|
| Agent không nghe máy (timeout) | `cdr_target_noanswer` | Re-route to next candidate |
| Agent SIP fail (480/503) | `cdr_target_fail` | Re-route to next candidate |
| Tất cả candidates fail | Sau khi exhaust list | Trả về queue, escalate priority |
| Agent mất kết nối giữa chừng | `extension_agent_status` remove | Force Not-Ready, re-route active call |
| Queue overflow (max wait exceeded) | `queue_caller_status` overflow | Voicemail / callback / escalate |
| CTI Adapter down | — | PortSIP autonomous queue routing (fallback) |

#### 18.12.2 Pre-computed Candidate List (Top-N Routing)

Routing Engine tính trước **TOP-3 scored agents** và lưu vào Redis khi bắt đầu route:

```
HASH routing:attempt:{callId}
  call_id        = portsip-call-uuid
  interaction_id = omni-interaction-uuid
  queue_id       = queue-uuid
  candidates     = ["agent-007:score:0.92", "agent-003:score:0.85", "agent-012:score:0.79"]
  current_index  = 0     ← đang route tới candidate[0]
  attempts       = 0
  started_at     = timestamp
  status         = "routing" | "answered" | "failed" | "queued"

TTL: 300s (5 phút)
```

#### 18.12.3 No-Answer & Fail Re-routing Flow

```
PortSIP webhook: cdr_target_noanswer hoặc cdr_target_fail
    │
    ▼
CallRoutingFailureHandler
    │
    ├── [1] Ghi nhận miss cho agent (HINCRBY agent:miss_count:{agentId} 1)
    │         └── Nếu miss_count >= 2 → auto Not-Ready agent
    │                → StateSyncService.setNotReady(agentId, 'missed_calls')
    │                → PortSIP: PUT /queue/{id}/agents/{ext} { status: NOT_READY }
    │
    ├── [2] Load routing:attempt:{callId}
    │         → current_index + 1
    │         → candidates còn không?
    │
    ├── [3a] Còn candidate → route tới candidate tiếp theo
    │         → Atomic check: validateAndClaim(nextAgent)  (§18.11.4)
    │         → Nếu agent vẫn available: PortSIP refer/route → extension
    │         → Update routing:attempt.current_index
    │         → Reset no-answer timer (20s)
    │
    └── [3b] Hết candidates (hoặc tất cả fail)
              → Trả cuộc gọi về queue với priority+1 (escalate)
              → Notify supervisor qua WebSocket
              → Nếu queue wait > sla_threshold → kích hoạt overflow (§18.12.6)
```

#### 18.12.4 Routing Model — Phase 1 vs Phase 2+

Đây là phần cốt lõi: Omnichannel đã chọn agent, làm sao PortSIP ring đúng agent đó?

**Model A: PortSIP Queue Routing** *(Phase 1 — recommended)*
```
Cuộc gọi → PortSIP Queue (đã có agents với skill levels được sync từ Omnichannel)
PortSIP tự chọn agent theo queue strategy (round_robin/skill_based/etc.)
PortSIP ring agent → agent nghe máy
PortSIP webhook queue_caller_status: agent_answered → Omnichannel biết
Omnichannel update interaction record

✅ Pro: Đơn giản, ổn định, PortSIP tự handle no-answer/retry tự động
❌ Con: Không dùng được Omnichannel scoring algorithm đầy đủ
❌ Con: PortSIP tự quyết → mất control chi tiết (affinity, customer history)
```

**Model B: Omnichannel-directed Routing** *(Phase 2+)*
```
Cuộc gọi vào Queue → PortSIP webhook queue_call_waiting → Omnichannel
Omnichannel Routing Engine chọn agent → gọi PortSIP REST:
  Cách B1 — Nếu PortSIP có "route call to specific agent" API:
    POST /queue/{queueId}/route { call_id: ..., agent_extension: "1007" }
  Cách B2 — Dùng Ring Group dynamic:
    POST /ring_groups (tạo temp group chỉ có agent 1007)
    PortSIP transfer call to ring group → ring agent 1007
    Sau khi kết thúc: DELETE ring group

✅ Pro: Full Omnichannel scoring (affinity, load, skills, customer history)
❌ Con: Phức tạp hơn, PortSIP có thể không có "direct route to agent" API
```

**Khuyến nghị: Hybrid (Model A Phase 1 → Model B Phase 2+)**
- **Phase 1**: Model A — sync agent skill levels xuống PortSIP để PortSIP route theo skill. Omnichannel tracking qua WSI/webhook events. Nhanh deploy, ít rủi ro.
- **Phase 2+**: Nâng lên Model B khi cần customer affinity, complex scoring. Nghiên cứu PortSIP direct-to-agent API. Fallback: tạm thời tạo single-agent ring group.

`IPbxQueueManager` bổ sung method optional cho Phase 2+:

```typescript
interface IPbxQueueManager {
  // ... existing methods (§18.2) ...
  routeCallToAgent?(callId: string, extensionNumber: string): Promise<void>; // optional, Phase 2+
}
```

#### 18.12.5 Agent Lost Connection During Active Call

```
WSI event: extension_agent_status { action: 'remove', extension: '1007' }
  HOẶC
PortSIP SIP: 480 Temporarily Unavailable khi ring 1007

    ▼
CallRoutingFailureHandler.handleAgentDisconnect(agentId, callId)
    │
    ├── [1] Nếu cuộc gọi đang RINGING (chưa answered):
    │         → Trigger re-routing (→ §18.12.3)
    │
    ├── [2] Nếu cuộc gọi đang IN-PROGRESS (đã answered, đang nói):
    │         → PortSIP xử lý: call sẽ bị dropped (SIP BYE)
    │         → WSI event: call_ended
    │         → Omnichannel: cập nhật interaction status = 'interrupted'
    │         → Notify supervisor
    │         → Notify khách hàng: offer callback option
    │         → Ghi CDR với reason = 'agent_disconnected'
    │
    └── [3] Force agent state:
              → Redis: voice_status = 'offline'
              → SREM agent:available:voice
              → PortSIP: remove agent from all queues (async)
              → Push notification tới agent: "Bạn đã bị disconnect, vui lòng đăng nhập lại"
```

#### 18.12.6 Queue Overflow & Last Resort

```
PortSIP webhook: queue_caller_status { event: "overflow" }
  HOẶC
Omnichannel SLA timer breach (§18.4.4)

    ▼
QueueOverflowHandler (priority waterfall):
    │
    ├── Priority 1: Escalate trong queue (priority += 1, re-score immediately)
    ├── Priority 2: Overflow queue (route sang queue khác ít tải hơn)
    ├── Priority 3: Voicemail (PortSIP queue overflow config)
    ├── Priority 4: Callback scheduling (ghi nhận callback request)
    └── Priority 5 (last resort): Route tới supervisor extension
```

#### 18.12.7 Degraded Mode (CTI Adapter down)

Khi CTI Adapter mất kết nối WSI hoặc service restart:

```
CTI Adapter down
    │
    ├── PortSIP hoạt động độc lập:
    │     → Queue routing tự động (theo strategy đã config sẵn)
    │     → Agents vẫn nhận call bình thường, không bị ảnh hưởng real-time
    │     → Mất: Omnichannel scoring, affinity, complex routing logic
    │
    ├── Omnichannel Routing Engine:
    │     → Voice channel → degraded mode (flag in Redis)
    │     → Email/chat/social channels KHÔNG bị ảnh hưởng
    │
    └── On CTI Adapter reconnect (full reconciliation):
          1. GET tất cả active calls từ PortSIP
          2. GET agent statuses từ PortSIP
          3. So sánh với Redis → fix drift (§18.11.2 Layer 3)
          4. Missed CDR catchup: GET /cdrs?since={lastSync}
          5. Missed events replay từ Kafka (nếu có event sourcing)
```

---

## Appendix A: File Changes Summary

### Backend — Modified Services

| Service | Files Changed | Key Changes |
|---|---|---|
| Interaction Service (MS-3) | entity, service, controller, DTOs | Add `channelType`, `subChannel`, `createInteraction`, `transfer`, `timeline`, Kafka publishing |
| Agent Service (MS-2) | entity, service, controller, gateway | Structured skills, groups CRUD, Redis integration, capacity tracking |
| CTI Adapter (MS-19) | adapter interface, service, PortSIP module | PortSIP integration, `IPbxProvider` abstraction, WebRTC credential provisioning, sync services |
| Notification Service (MS-6) | Add WebSocket gateway | Real-time push via WS namespace |

### Backend — New Services

| Service | Port | Est. Files |
|---|---|---|
| Channel Gateway (MS-20) | 3020 | ~25 files (entities, adapters, service, controller, Kafka) |
| Routing Engine (MS-21) | 3021 | ~30 files (entities, scoring, queue, flow engine, Kafka) |

### Backend — New Files in CTI Adapter Service (MS-19)

| Path | Purpose |
|---|---|
| `adapters/pbx-provider.interface.ts` | `IPbxProvider` + sub-interfaces (`IPbxExtensionManager`, `IPbxQueueManager`, `IPbxCallControl`, `IPbxAgentStateManager`, `IPbxCdrProvider`, `IPbxEventSubscriber`) |
| `adapters/portsip/portsip-auth.service.ts` | PortSIP JWT auth + token refresh |
| `adapters/portsip/portsip-api-client.ts` | HTTP wrapper for PortSIP REST API |
| `adapters/portsip/portsip-extension-manager.ts` | Extension CRUD, auto-allocation from range |
| `adapters/portsip/portsip-queue-manager.ts` | Call queue CRUD, agent assignment, skill levels |
| `adapters/portsip/portsip-call-control.ts` | Call control (make, answer, hold, transfer, conference) |
| `adapters/portsip/portsip-agent-state.ts` | Agent state sync with PortSIP queue agent status |
| `adapters/portsip/portsip-cdr-provider.ts` | CDR fetch + mapping to interaction format |
| `adapters/portsip/portsip-event-subscriber.ts` | WSI WebSocket subscriber (extension, queue, CDR events) |
| `adapters/portsip/portsip-mapper.ts` | Data mapping (PortSIP ↔ Omnichannel entities) |
| `adapters/portsip/portsip.adapter.ts` | `PortSipAdapter` — implements `IChannelAdapter` + `IPbxProvider` |
| `sync/agent-sync.service.ts` | Kafka-driven agent ↔ extension sync + reconciliation |
| `sync/queue-sync.service.ts` | Omnichannel queue → PortSIP queue sync |
| `sync/state-sync.service.ts` | Bidirectional agent state sync (Ready/NotReady/OnCall) |
| `sync/cdr-sync.service.ts` | CDR webhook + WSI + polling → Interaction Service |
| `sync/recording-sync.service.ts` | BullMQ job: PortSIP recordings → SeaweedFS |
| `entities/pbx-extension-mapping.entity.ts` | `agentId ↔ extension_number` mapping |
| `entities/pbx-queue-mapping.entity.ts` | `omniQueueId ↔ portsipQueueId` mapping |
| `entities/pbx-cdr-record.entity.ts` | CDR records synced from PortSIP |
| `webrtc/webrtc-credential.service.ts` | Credential provisioning for SIP.js |

### Frontend — Modified

| Component | Change |
|---|---|
| `websocket-client.ts` + `cti-channel.ts` + `notification-channel.ts` | Replace with `UnifiedSocketClient` |
| `InteractionList.tsx` | Expand channel filters for `social`, `sms`, sub-channels |
| `FloatingCallWidget.tsx` | Replace with `WebRtcSoftphone` |
| `ChatTimeline.tsx` | Add rich element rendering per channel |
| `AgentStatusWidget.tsx` | Add social + SMS channels |
| `useInteractionStats.tsx` | Support new channel/sub-channel types |
| `EnhancedAgentStatusContext.tsx` | Add social + SMS status management |

### Frontend — New

| Component | Purpose |
|---|---|
| `WebRtcSoftphone.tsx` | SIP.js-based browser calling (registers to PortSIP WSS) |
| `RichMessageRenderer.tsx` | Render channel-specific rich messages |
| `QueueStatusPanel.tsx` | Real-time queue metrics display |
| Admin: `IvrFlowDesigner.tsx` | IVR flow builder (React Flow) |
| Admin: `EmailFlowDesigner.tsx` | Email flow builder |
| Admin: `ChatFlowDesigner.tsx` | Chat/social flow builder |
| Admin: `SkillManagement.tsx` | Skill CRUD |
| Admin: `GroupManagement.tsx` | Agent group CRUD |
| Admin: `QueueConfiguration.tsx` | Queue CRUD |
| Admin: `ChannelConfiguration.tsx` | Channel adapter config |
| Admin: `LiveChatWidgetDesigner.tsx` | Widget customization |
| `tpb-chat-widget/` | Embeddable live chat widget project |

---

## Appendix B: Infrastructure Docker Compose Additions

```yaml
# Add to infra/docker-compose.yml

services:
  # ── Phase 1: PortSIP PBX + TURN ──────────────────────────────
  portsip-pbx:
    image: portsip/pbx:22.3
    container_name: portsip-pbx
    restart: unless-stopped
    ports:
      - "8900:8900"         # Web management console
      - "8887:8887"         # WSI (WebSocket Interface) for real-time events
      - "5060:5060/udp"     # SIP UDP
      - "5060:5060/tcp"     # SIP TCP
      - "5061:5061/tcp"     # SIP TLS
      - "5065:5065/tcp"     # WebSocket (WS) for WebRTC
      - "5066:5066/tcp"     # WebSocket Secure (WSS) for WebRTC
      - "45000-65000:45000-65000/udp"  # RTP media range
    environment:
      - PORTSIP_ADMIN_PASSWORD=${PORTSIP_ADMIN_PASSWORD:-admin123}
      - PORTSIP_DOMAIN=${PORTSIP_DOMAIN:-pbx.tpb.vn}
      - PORTSIP_PUBLIC_IP=${PUBLIC_IP}
    volumes:
      - portsip-data:/var/lib/portsip
      - portsip-logs:/var/log/portsip
      - portsip-recordings:/var/recordings
    networks:
      - tpb-network

  coturn:
    image: coturn/coturn:latest
    container_name: coturn
    restart: unless-stopped
    ports:
      - "3478:3478/udp"    # STUN/TURN UDP
      - "3478:3478/tcp"    # STUN/TURN TCP
      - "5349:5349/tcp"    # TURN TLS
      - "49152-65535:49152-65535/udp"  # TURN relay ports
    environment:
      - TURN_REALM=turn.tpb.vn
      - TURN_SECRET=${TURN_SECRET}
    networks:
      - tpb-network

  # ── Phase 3: Additional PBX (uncomment when needed) ──────────
  # freeswitch:
  #   image: signalwire/freeswitch:latest
  #   ports:
  #     - "5080:5080/udp"
  #     - "5080:5080/tcp"
  #     - "5067:5066/tcp"   # WebSocket (mod_verto) — offset to avoid PortSIP conflict
  #     - "8021:8021/tcp"   # ESL (Event Socket)
  #     - "16384-32768:16384-32768/udp"
  #   environment:
  #     - FREESWITCH_DEFAULT_PASSWORD=${FS_PASSWORD}
  #   volumes:
  #     - ./freeswitch/conf:/etc/freeswitch

volumes:
  portsip-data:
  portsip-logs:
  portsip-recordings:
```

> **Note:** mediasoup and drachtio are **removed from Phase 1** — PortSIP v22.3 includes built-in WebRTC gateway support. SIP.js in the browser registers directly to PortSIP WSS (port 5066). FreeSWITCH is commented out and available for Phase 3 when additional PBX adapters are implemented. mediasoup should only be reintroduced if advanced SFU features (multi-party video, simulcast) are needed beyond PortSIP capabilities.

---

*End of document. This plan should be reviewed by the engineering team, product owner, and infrastructure team before implementation begins.*
