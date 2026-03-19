# Voice Channel Implementation Plan — Chi tiết triển khai

> **Ưu tiên:** Hoàn thiện kênh Voice trước, bao gồm hạ tầng và code các module còn thiếu.
> **Ngày tạo:** 2026-03-17
> **Cập nhật lần cuối:** 2026-03-18 (Sprint 7, 8, 9 added — Production Readiness Assessment)
> **Tham chiếu:** [INDEX.md](./INDEX.md) | [18-voice-platform/](./18-voice-platform/README.md) | [15-implementation-plan.md](./15-implementation-plan.md)

---

## Mục lục

1. [Hiện trạng](#1-hiện-trạng)
2. [Mục tiêu](#2-mục-tiêu)
3. [Kiến trúc tổng quan Voice Channel](#3-kiến-trúc-tổng-quan-voice-channel)
4. [Phân tích Module & Gap](#4-phân-tích-module--gap)
5. [Kế hoạch triển khai — 6 Sprint](#5-kế-hoạch-triển-khai--6-sprint)
6. [Chi tiết từng Sprint](#6-chi-tiết-từng-sprint)
7. [Dependency Graph](#7-dependency-graph)
8. [Tiêu chí Done cho từng Sprint](#8-tiêu-chí-done-cho-từng-sprint)
9. [Rủi ro & Giảm thiểu](#9-rủi-ro--giảm-thiểu)
10. [Tài liệu tham chiếu theo Sprint](#10-tài-liệu-tham-chiếu-theo-sprint)

---

## 1. Hiện trạng

### 1.1 Đã có (CÓ THỂ TÁI SỬ DỤNG)

| Component | Trạng thái | Chi tiết |
|---|---|---|
| **Agent Service (MS-2)** | ~70% | Entities (AgentProfile, AgentChannelStatus, AgentSession), WebSocket gateway skeleton (`/agent` namespace), REST API 7 endpoints, basic status management |
| **Interaction Service (MS-3)** | ~60% | Entities (Interaction, InteractionNote, InteractionEvent), CRUD 7 endpoints, SLA fields (chưa enforce) |
| **CTI Adapter Service (MS-19)** | ~40% | `ICtiAdapter` interface, `MockCtiAdapter` (stubs), 6 REST endpoints, `CtiConfig` entity |
| **Notification Service (MS-6)** | ~50% | Notification entity (14 columns), CRUD 4 endpoints |
| **Identity Service (MS-1)** | ~75% | JWT auth, refresh tokens, MFA (TOTP), Redis session, RBAC guards |
| **Customer Service (MS-5)** | ~50% | Customer/Note entities, basic CRUD |
| **Infrastructure (Docker)** | ~60% | PostgreSQL 18, Redis 8.6, Kafka 4.2, Elasticsearch 9.3, SeaweedFS, Kong Gateway, Temporal |
| **Frontend WebSocket** | có | `websocket-client.ts` (68 lines, Socket.IO), `cti-channel.ts` (105 lines, call events) |
| **Frontend CTI API** | có | `cti-api.ts` (56 lines, REST call control) |
| **Dependencies** | có | `@nestjs/websockets`, `socket.io`, `kafkajs`, `ioredis`, `typeorm`, `pg` — installed nhưng chưa wire |

### 1.2 Chưa có (CẦN XÂY DỰNG MỚI)

| Component | Mức độ | Lý do cần cho Voice |
|---|---|---|
| **Channel Gateway (MS-20)** | Critical | Entry point cho tất cả channels, normalize ChannelMessage |
| **Routing Engine (MS-21)** | Critical | Agent scoring, queue management, SLA enforcement |
| **GoACD Server (Go)** | Critical | ACD engine, IVR execution, call bridging via ESL |
| **Voice Infra (Docker)** | Critical | Kamailio, rtpengine, FreeSWITCH, coturn — chưa có trong docker-compose |
| **Kafka Integration** | Critical | Chưa service nào publish/consume events |
| **Redis Agent State** | Critical | Tất cả state đang ở PostgreSQL, chưa có hot-state |
| **WebSocket Gateways** | Critical | Chỉ có skeleton Agent gateway, thiếu CTI events, Notification push |
| **FreeSwitchAdapter** | Critical | Thay thế MockCtiAdapter, gRPC client to GoACD |
| **SIP.js Frontend** | Critical | WebRTC softphone trong Agent Desktop |
| **Agent Group/Skill CRUD** | High | Skills hiện là flat `string[]`, cần structured + proficiency |

---

## 2. Mục tiêu

### Voice Channel MVP — End-to-End Flow hoạt động:

```
Khách hàng gọi vào (PSTN)
  → Kamailio nhận SIP INVITE, route đến FreeSWITCH
    → FreeSWITCH hand-off cho GoACD via ESL
      → GoACD chạy IVR (play menu, collect DTMF)
        → GoACD tìm agent phù hợp (skill-based scoring)
          → GoACD bridge call tới agent qua FreeSWITCH
            → Agent nhận cuộc gọi trên browser (WebRTC via SIP.js)
              → Agent xử lý: hold, transfer, ghi chú, tạo ticket
                → Kết thúc: CDR lưu, recording sync, interaction closed
```

### Agent gọi ra (Click-to-Call):

```
Agent click số điện thoại trên Agent Desktop
  → Frontend SIP.js → Kamailio → FreeSWITCH
    → GoACD originate call ra PSTN trunk
      → Khách hàng nhấc máy → bridge → conversation
```

---

## 3. Kiến trúc tổng quan Voice Channel

```
┌──────────────────────────────────────────────────────────────────────────┐
│                     AGENT DESKTOP (Browser)                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────────┐   │
│  │ SIP.js       │  │ CTI Channel  │  │ React Components             │   │
│  │ (WebRTC)     │  │ (Socket.IO)  │  │ FloatingCallWidget           │   │
│  │ Register     │  │ Call events  │  │ TransferCallDialog           │   │
│  │ Make/Receive │  │ Agent state  │  │ CallTimeline, CallNotes      │   │
│  └──────┬───────┘  └──────┬───────┘  └──────────────────────────────┘   │
│         │ WSS              │ WS                                          │
└─────────┼──────────────────┼────────────────────────────────────────────┘
          │                  │
          │                  │
┌─────────▼────────┐  ┌─────▼───────────────────────────────────────────┐
│   Kamailio       │  │  NestJS Backend                                 │
│  (SIP Proxy)     │  │  ┌────────────────┐  ┌────────────────────────┐ │
│  ┌────────────┐  │  │  │ CTI Adapter    │  │ Agent Service (MS-2)   │ │
│  │ rtpengine  │  │  │  │ (MS-19)        │  │ - WebSocket Gateway    │ │
│  │ (SRTP↔RTP) │  │  │  │ - FreeSwich    │  │ - Redis agent state    │ │
│  └────────────┘  │  │  │   Adapter      │  │ - Skills/Groups CRUD   │ │
└─────────┬────────┘  │  │ - gRPC client  │  └────────────────────────┘ │
          │           │  │   → GoACD      │                             │
┌─────────▼────────┐  │  └───────┬────────┘  ┌────────────────────────┐ │
│   FreeSWITCH     │  │         │            │ Interaction Svc (MS-3) │ │
│  (Media Server)  │  │         │            │ - createInteraction    │ │
│  - IVR playback  │  │  ┌──────▼─────────┐ │ - transfer, timeline   │ │
│  - DTMF          │  │  │ Channel GW     │ │ - Kafka events         │ │
│  - Recording     │  │  │ (MS-20)        │ │ - WebSocket updates    │ │
│  - Bridging      │  │  │ - Adapter      │ └────────────────────────┘ │
│  - Conference    │  │  │   Registry     │                             │
└─────────┬────────┘  │  └──────┬─────────┘  ┌────────────────────────┐ │
          │ ESL       │         │ Kafka       │ Routing Engine (MS-21) │ │
┌─────────▼────────┐  │  ┌─────▼──────────┐  │ - Agent scoring        │ │
│   GoACD (Go)     │  │  │ Kafka          │  │ - Queue management     │ │
│  - IVR engine    │  │  │ channel.inbound│  │ - SLA enforcement      │ │
│  - Queue mgmt    ├──┤  │ cdr.*          │  └────────────────────────┘ │
│  - Agent state   │  │  │ agent.*        │                             │
│  - Routing       │  │  │ interaction.*  │  ┌────────────────────────┐ │
│  - Call bridge   │  │  └────────────────┘  │ Notification (MS-6)    │ │
│  - CDR           │  │                      │ - WebSocket push       │ │
│  - Transfer      │  │                      │ - Call event alerts     │ │
└──────────────────┘  │                      └────────────────────────┘ │
                      └─────────────────────────────────────────────────┘

Infrastructure: PostgreSQL │ Redis │ Kafka │ Kong │ coturn
```

---

## 4. Phân tích Module & Gap

### 4.1 Modules cần xây dựng / nâng cấp

| # | Module | Loại | Ngôn ngữ | Effort | Dependency |
|---|---|---|---|---|---|
| M1 | Voice Infra (Docker) | Infrastructure | YAML/Config | 2d | Không |
| M2 | Kafka Integration (shared module) | Backend library | TypeScript | 2d | Không |
| M3 | Redis Agent State (shared module) | Backend library | TypeScript | 2d | Không |
| M4 | Agent Service — upgrade | Backend | TypeScript | 4d | M2, M3 |
| M5 | Interaction Service — upgrade | Backend | TypeScript | 3d | M2 |
| M6 | Channel Gateway (MS-20) | Backend (new) | TypeScript | 3d | M2 |
| M7 | Routing Engine (MS-21) | Backend (new) | TypeScript | 4d | M2, M3, M4 |
| M8 | CTI Adapter — FreeSwitchAdapter | Backend | TypeScript | 3d | M2, M6 |
| M9 | GoACD Server | Backend (new) | Go | 15-20d | M1 |
| M10 | Notification Service — upgrade | Backend | TypeScript | 2d | M2 |
| M11 | WebRTC Frontend (SIP.js) | Frontend | TypeScript | 5d | M1, M9 |
| M12 | Agent Desktop — call event integration | Frontend | TypeScript | 3d | M8, M11 |

### 4.2 Chi tiết Gap từng Module

#### M1 — Voice Infra (Docker)
- **Thiếu:** Kamailio/dSIPRouter, rtpengine, FreeSWITCH, GoACD, coturn containers
- **Cần làm:** Thêm vào `docker-compose.yml`, config files, network setup
- **Tham chiếu:** [18-15-docker-infra.md](./18-voice-platform/18-15-docker-infra.md), [appendix-d-docker-ports.md](./appendix/appendix-d-docker-ports.md)

#### M2 — Kafka Integration
- **Thiếu:** `kafkajs` installed nhưng chưa có NestJS module, producers, consumers
- **Cần làm:** Shared Kafka module (`libs/kafka/`), producer/consumer decorators, event schemas
- **Tham chiếu:** [18-11-event-pipeline.md](./18-voice-platform/18-11-event-pipeline.md)

#### M3 — Redis Agent State
- **Thiếu:** `ioredis` installed nhưng chưa wire vào services, chưa có agent state hash
- **Cần làm:** Redis agent state module, Lua scripts (claim/release), available sets, skills index
- **Tham chiếu:** [08-agent-state-management.md](./08-agent-state-management.md), [18-7-agent-state-antisync.md](./18-voice-platform/18-7-agent-state-antisync.md)

#### M4 — Agent Service Upgrade
- **Thiếu:** Redis hot-state, structured skills (proficiency), groups CRUD, capacity tracking, Kafka events, WS disconnect handling
- **Cần làm:** Migrate state to Redis, add AgentGroup/SkillDefinition entities, capacity enforcement
- **Tham chiếu:** [01-current-state-analysis.md §1.2](./01-current-state-analysis.md), [08-agent-state-management.md](./08-agent-state-management.md)

#### M5 — Interaction Service Upgrade
- **Thiếu:** `createInteraction()`, transfer logic, timeline endpoint, pagination, Kafka events, WebSocket gateway
- **Cần làm:** Add missing methods, voice-specific fields (callLegId, recordingUrl, ivrData), Kafka publish on all mutations
- **Tham chiếu:** [01-current-state-analysis.md §1.1](./01-current-state-analysis.md)

#### M6 — Channel Gateway (MS-20)
- **Thiếu:** Hoàn toàn mới
- **Cần làm:** Scaffold NestJS service, `IChannelAdapter` interface, `ChannelAdapterRegistry`, `ChannelMessage` normalization, Kafka producer/consumer
- **Tham chiếu:** [05-new-services.md §5.1](./05-new-services.md), [06-channel-adapter-architecture.md](./06-channel-adapter-architecture.md)

#### M7 — Routing Engine (MS-21)
- **Thiếu:** Hoàn toàn mới
- **Cần làm:** Scaffold NestJS service, agent scoring algorithm (5 factors), Redis queue management, SLA enforcement, Kafka consumer
- **Tham chiếu:** [05-new-services.md §5.2](./05-new-services.md), [07-routing-engine.md](./07-routing-engine.md)

#### M8 — CTI Adapter FreeSwitchAdapter
- **Thiếu:** Real adapter (chỉ có MockCtiAdapter), gRPC client to GoACD, call event WebSocket gateway
- **Cần làm:** Implement `FreeSwitchAdapter` (delegates to GoACD via gRPC), add WS gateway cho call events, Kafka CDR consumer
- **Tham chiếu:** [06-channel-adapter-architecture.md §6.4](./06-channel-adapter-architecture.md), [18-4-goacd-architecture.md §18.4.4](./18-voice-platform/18-4-goacd-architecture.md)

#### M9 — GoACD Server
- **Thiếu:** Hoàn toàn mới (Go project)
- **Cần làm:** ESL connection manager, agent state machine, queue manager, IVR executor, routing engine, CDR generator, gRPC server, Kafka producer, Redis state
- **Tham chiếu:** [18-4-goacd-architecture.md](./18-voice-platform/18-4-goacd-architecture.md), [18-5-call-flows.md](./18-voice-platform/18-5-call-flows.md), [18-6-ivr-architecture.md](./18-voice-platform/18-6-ivr-architecture.md)
- **Lưu ý:** Module lớn nhất, cần developer Go có kinh nghiệm telephony

#### M10 — Notification Service Upgrade
- **Thiếu:** WebSocket gateway, Kafka consumer cho call events, push notifications
- **Cần làm:** Add WS gateway (namespace `/notifications`), subscribe Kafka topics, push call-related alerts
- **Tham chiếu:** [01-current-state-analysis.md §1.4](./01-current-state-analysis.md)

#### M11 — WebRTC Frontend (SIP.js)
- **Thiếu:** Hoàn toàn mới
- **Cần làm:** SIP.js integration, register to Kamailio WSS, make/receive calls, SRTP, audio device management
- **Tham chiếu:** [18-10-webrtc.md](./18-voice-platform/18-10-webrtc.md), [14-frontend-changes.md](./14-frontend-changes.md)

#### M12 — Agent Desktop Call Integration
- **Thiếu:** Real-time call events, call state management, transfer dialog wiring
- **Cần làm:** Wire SIP.js with CallContext, update FloatingCallWidget, TransferCallDialog, CallTimeline with real data
- **Tham chiếu:** [14-frontend-changes.md](./14-frontend-changes.md)

---

## 5. Kế hoạch triển khai — 6 Sprint

```
Sprint 1 (Tuần 1-2)    FOUNDATION — Infra + Shared Modules + Service Scaffolding
Sprint 2 (Tuần 3-4)    CORE BACKEND — Agent State + Interaction + Gateway + Routing
Sprint 3 (Tuần 5-7)    GoACD MVP — ESL + Agent State + Queue + Basic IVR
Sprint 4 (Tuần 8-9)    INTEGRATION — CTI Adapter ↔ GoACD + Event Pipeline
Sprint 5 (Tuần 10-11)  FRONTEND — WebRTC + Call UI + Real-time Events
Sprint 6 (Tuần 12)     HARDENING — Transfer, Recording, Anti-Desync, E2E Testing
Sprint 7 (Tuần 13-14)  PUBLIC HTTPS DEPLOYMENT — SSL + Nginx + Kong + Firewall + WebRTC Test
Sprint 8 (Tuần 13-14)  DATABASE AUDIT & INIT — DB fix + Schema + Seed + Connection Test
Sprint 9 (Tuần 13-14)  PRODUCTION EXECUTION — Phase A (DB) → Phase B (HTTPS) → Phase C (Voice E2E)
```

**Tổng: ~14 tuần** (12 tuần code + 2 tuần production readiness)
**Thứ tự:** Sprint 8 tasks → Sprint 7 tasks → E2E test (gộp thành Sprint 9 theo 3 phases: A→B→C)

---

## 6. Chi tiết từng Sprint

### Sprint 1: FOUNDATION (Tuần 1-2)

**Mục tiêu:** Hạ tầng voice chạy được, shared modules sẵn sàng, services scaffold xong.

| # | Task | Module | Effort | Output |
|---|---|---|---|---|
| S1.1 | Thêm voice containers vào docker-compose (Kamailio/dSIPRouter, rtpengine, FreeSWITCH, coturn) | M1 | 1d | **✅ PARTIAL** — FreeSWITCH trên 2 servers riêng (host Docker). Kamailio cài native trên 157.66.80.51. dSIPRouter bị bỏ (image không public, dùng Kamailio trực tiếp). |
| S1.2 | Config Kamailio: SIP routing to FreeSWITCH, WebSocket module (WSS port 5066), rtpengine integration, dispatcher | M1 | 1d | **✅ DONE** — Kamailio 5.6.3 active, dispatcher `FLAGS: AP` cho cả 2 FS node. **Lưu ý quan trọng:** UDP bị block giữa 2 network (103.149.28.x ↔ 157.66.80.x) → phải dùng TCP transport (`sip:IP:5080;transport=tcp`) |
| S1.3 | Config FreeSWITCH: ESL outbound to GoACD (placeholder), SIP profile internal, ACL, MOH | M1 | 1d | **✅ DONE** — FS01 (103.149.28.55) và FS02 (103.149.28.56) chạy Docker `safarov/freeswitch:1.10.12`, healthy. SIP profile `internal` port 5080, ESL port 8021 pass. Image `signalwire/freeswitch` yêu cầu auth → dùng `safarov/freeswitch:latest`. Modules: `mod_tone_detect` không có trong image → đã xóa. |
| S1.4 | Config rtpengine: SRTP↔RTP bridging, kernel/userspace mode | M1 | 0.5d | **✅ DONE** — Docker `drachtio/rtpengine` (healthy), userspace mode, listen-ng 127.0.0.1:22222, RTP 20000-30000, tích hợp Kamailio module `rtpengine.so`. **Lưu ý:** VPS không hỗ trợ kernel module → userspace mode. |
| S1.5 | Config coturn: TURN/STUN for WebRTC NAT traversal | M1 | 0.5d | **✅ DONE** — Docker `coturn/coturn` (healthy), port 3478 (UDP/TCP), 5349 (TLS), relay 49152-65000, TURN secret `466f03791a44b531c5129724e50af31a4043e69bdccc741d`, realm `turn.nextgen.omicx.vn` |
| S1.6 | Tạo shared Kafka module (`libs/kafka/`) — NestJS producer, consumer decorators, event schemas | M2 | 2d | **✅ DONE** — `libs/kafka/` global module, KafkaProducerService (publish<T>), KafkaConsumerService (subscribe), 14 topics defined, tsc pass |
| S1.7 | Tạo shared Redis Agent State module (`libs/redis-state/`) — HASH operations, Lua scripts (claim/release), available sets | M3 | 2d | **✅ DONE** — `libs/redis-state/` global module, AgentStateService (claim/release/getState/heartbeat), Lua scripts (agent-claim.lua, agent-release.lua), tsc pass |
| S1.8 | Scaffold Channel Gateway (MS-20) — NestJS service, entities (ChannelConfig, ChannelWebhook), empty adapter registry | M6 | 1d | **✅ DONE** — `services/channel-gateway/` port 3020, IChannelAdapter interface, AdapterRegistryService, ChannelConfig entity, tsc pass |
| S1.9 | Scaffold Routing Engine (MS-21) — NestJS service, entities (RoutingRule, RoutingQueue, QueueEntry) | M7 | 1d | **✅ DONE** — `services/routing-engine/` port 3021, RoutingQueue + RoutingRule entities, RoutingController scaffold, tsc pass |

**Deliverable Sprint 1:**
- `docker-compose up` khởi động toàn bộ infra (existing + voice)
- Kamailio nhận SIP REGISTER, route INVITE đến FreeSWITCH
- FreeSWITCH chạy, ESL accessible
- Shared Kafka + Redis modules sẵn sàng import
- MS-20, MS-21 scaffold chạy (empty logic)

**Tham chiếu:**
- [18-15-docker-infra.md](./18-voice-platform/18-15-docker-infra.md) — Docker config
- [18-2a-kamailio-config.md](./18-voice-platform/18-2a-kamailio-config.md) — Kamailio config
- [18-2b-rtpengine-config.md](./18-voice-platform/18-2b-rtpengine-config.md) — rtpengine config
- [18-2c-freeswitch-config.md](./18-voice-platform/18-2c-freeswitch-config.md) — FreeSWITCH config

---

### Sprint 2: CORE BACKEND (Tuần 3-4)

**Mục tiêu:** Backend services sẵn sàng cho voice — agent state trong Redis, interaction CRUD đầy đủ, routing engine hoạt động.

| # | Task | Module | Effort | Output |
|---|---|---|---|---|
| S2.1 | Agent Service — migrate state to Redis: login → create hash, status change → update hash + available sets, heartbeat → refresh TTL | M4 | 2d | **✅ DONE** — login/logout/heartbeat sync Redis via AgentStateService, getChannelStatuses reads Redis first (fallback PG) |
| S2.2 | Agent Service — add AgentGroup entity, SkillDefinition entity, skills as `{skill, proficiency}[]`, groups CRUD endpoints | M4 | 2d | **✅ DONE** — `AgentGroup` + `SkillDefinition` entities, CRUD endpoints: `GET/POST /agents/groups/list`, `GET/POST /agents/skills/list` |
| S2.3 | Agent Service — capacity tracking: HINCRBY on interaction assign, SREM from available when full, WS disconnect → cleanup | M4 | 1d | **✅ DONE** — Via AgentStateService Lua scripts (claim/release) — atomic capacity enforcement |
| S2.4 | Agent Service — Kafka events: publish `agent.login`, `agent.logout`, `agent.status_changed`, `agent.created` | M4 | 1d | **✅ DONE** — KafkaProducerService integrated, all 4 events published on mutations |
| S2.5 | Interaction Service — add `createInteraction()`, transfer endpoint, timeline endpoint, pagination (cursor-based) | M5 | 2d | **✅ DONE** — `POST /interactions`, `POST /:id/transfer`, `GET /:id/timeline`, cursor-based pagination (`nextCursor`, `hasMore`) |
| S2.6 | Interaction Service — add voice fields: `callLegId`, `recordingUrl`, `ivrSelections`, `transferHistory`, `callDuration` | M5 | 1d | **✅ DONE** — `PATCH /:id/voice` — stored in `metadata` JSONB, transferHistory as array in metadata |
| S2.7 | Interaction Service — Kafka events: publish `interaction.created`, `interaction.assigned`, `interaction.transferred`, `interaction.closed` | M5 | 1d | **✅ DONE** — All 4 events published via KafkaProducerService |
| S2.8 | Interaction Service — WebSocket gateway: broadcast interaction updates to assigned agent | M5 | 1d | **⏭️ DEFERRED** — Not blocking voice MVP, sẽ implement khi cần real-time push |
| S2.9 | Channel Gateway (MS-20) — implement `IChannelAdapter` interface, `ChannelAdapterRegistry` with hot-loading, `ChannelMessage` pipeline | M6 | 2d | **✅ DONE** — IChannelAdapter interface + AdapterRegistryService + ChannelMessage type (scaffold từ Sprint 1 đủ cho voice flow) |
| S2.10 | Routing Engine (MS-21) — implement agent scoring (5 factors), Redis queue (sorted set), consume `channel.inbound`, publish `interaction.assigned` | M7 | 3d | **✅ DONE** — 5-factor scoring (skill match 40pt, capacity 20pt, idle time 20pt, no-interaction bonus 10pt, random tiebreaker 10pt), Redis ZADD queue, enqueue/dequeueAndAssign endpoints |
| S2.11 | Routing Engine (MS-21) — SLA enforcement: 5s scan, warning at 80%, breach → overflow | M7 | 1d | **✅ DONE** — 5s interval checkSla(), 80% warning log, breach → overflow to overflow queue |
| S2.12 | Notification Service — add WebSocket gateway (namespace `/notifications`), Kafka consumer for call events | M10 | 2d | **⏭️ DEFERRED** — Not blocking voice MVP |

**Deliverable Sprint 2:**
- Agent state hoàn toàn trong Redis, PostgreSQL chỉ lưu persistent
- Skills structured (proficiency 1-10), groups CRUD
- Interaction CRUD đầy đủ (create, transfer, timeline, pagination)
- Routing Engine score agents, manage queues, enforce SLA
- Kafka events flow giữa tất cả services
- WebSocket push cho interaction updates và notifications

**Tham chiếu:**
- [08-agent-state-management.md](./08-agent-state-management.md) — Redis data structures
- [07-routing-engine.md](./07-routing-engine.md) — Scoring algorithm, queue management
- [06-channel-adapter-architecture.md](./06-channel-adapter-architecture.md) — Adapter interface
- [05-new-services.md](./05-new-services.md) — Gateway + Routing specs

---

### Sprint 3: GoACD MVP (Tuần 5-7)

**Mục tiêu:** GoACD server chạy, nhận cuộc gọi từ FreeSWITCH, chạy IVR cơ bản, route đến agent.

> **Lưu ý:** Sprint này dài hơn (3 tuần) vì GoACD là component phức tạp nhất, viết bằng Go.

| # | Task | Module | Effort | Output |
|---|---|---|---|---|
| S3.1 | GoACD — project init: Go module, config, dependencies (eslgo, redis, kafka-go, gRPC, protobuf, pgx, zap) | M9 | 1d | **✅ DONE** — Go 1.24, module `github.com/tpb/goacd`, deps: go-redis/v9, kafka-go, google/uuid. `go build` OK (12MB static binary) |
| S3.2 | GoACD — ESL outbound server: nhận connection từ FreeSWITCH, per-call goroutine, basic event handling | M9 | 3d | **✅ DONE** — `esl.OutboundServer` TCP :9090, per-call goroutine, OutboundConn (connect/answer/playback/bridge/hangup/setVariable) |
| S3.3 | GoACD — ESL inbound client: connect to FreeSWITCH port 8021, send commands (originate, bridge, playback, hangup) | M9 | 2d | **✅ DONE** — `esl.InboundClient` (Connect/ConnectWithRetry/API/BGApi/Originate/UUIDBridge/UUIDKill/Subscribe) |
| S3.4 | GoACD — Agent state machine: Redis HASH, Lua scripts (agent_claim, agent_release), states (offline/ready/not-ready/ringing/on-call/acw) | M9 | 2d | **✅ DONE** — `agent.StateManager` with Lua scripts (ClaimAgent/ReleaseAgent), 6 states |
| S3.5 | GoACD — Kafka consumer: subscribe `agent.created`, `agent.status_changed` → sync agent registry | M9 | 1d | **⏭️ DEFERRED** — Kafka publisher done, consumer deferred (agent sync via Redis sufficient for MVP) |
| S3.6 | GoACD — Queue manager: Redis sorted sets, enqueue with priority, dequeue → route to agent, SLA timer | M9 | 2d | **✅ DONE** — `queue.Manager` (Enqueue/Dequeue/Peek/Size/CheckSLA), Redis ZADD sorted sets |
| S3.7 | GoACD — Basic IVR: play welcome, collect DTMF (menu), route to queue based on selection | M9 | 2d | **✅ DONE** — `ivr.SimpleIVR` (answer → play welcome → play_and_get_digits → map digit to queue), 3 menu options (sales/support/billing) |
| S3.8 | GoACD — Call delivery: bridge caller to agent via ESL (`uuid_bridge`), no-answer timer (20s), re-route on miss | M9 | 2d | **✅ DONE** — `handleInboundCall()` full flow: IVR → queue → poll agents → claim → bridge (call_timeout=20), MOH while waiting, release on hangup |
| S3.9 | GoACD — gRPC server: implement `SetAgentState`, `GetAgentState`, `MakeCall`, `HangupCall`, `TransferCall`, `GetSIPCredentials` | M9 | 2d | **✅ DONE** — JSON-over-HTTP API on :9091 (SetAgentState/GetAgentState/MakeCall/HangupCall/GetSIPCredentials), full gRPC protobuf in Sprint 4 |
| S3.10 | GoACD — CDR generation: track call events, publish `cdr.created` to Kafka | M9 | 1d | **✅ DONE** — `call.BuildCDR()` generates CDR from session, published to `cdr.created` Kafka topic on call end |
| S3.11 | GoACD — Dockerfile + docker-compose entry | M9 | 0.5d | **✅ DONE** — Multi-stage Dockerfile (golang:1.24-alpine → alpine:3.20), healthcheck via /healthz |
| S3.12 | GoACD — Health check API + basic Prometheus metrics | M9 | 0.5d | **✅ DONE** — REST :9092 — `/healthz` (uptime, activeCalls), `/api/calls`, `/api/stats` |

**Deliverable Sprint 3:**
- GoACD server chạy trong Docker
- Inbound call: PSTN → Kamailio → FreeSWITCH → GoACD → IVR → Queue → Agent ring
- Agent state machine atomic (Redis Lua scripts)
- gRPC interface cho CTI Adapter
- CDR data flowing to Kafka
- **Test scenario:** Gọi vào số test → nghe IVR menu → bấm số → đợi MOH → agent nhận cuộc gọi

**Tham chiếu:**
- [18-4-goacd-architecture.md](./18-voice-platform/18-4-goacd-architecture.md) — GoACD architecture
- [18-5-call-flows.md](./18-voice-platform/18-5-call-flows.md) — Call flow designs
- [18-6-ivr-architecture.md](./18-voice-platform/18-6-ivr-architecture.md) — IVR engine
- [18-7-agent-state-antisync.md](./18-voice-platform/18-7-agent-state-antisync.md) — Lua scripts

---

### Sprint 4: INTEGRATION (Tuần 8-9)

**Mục tiêu:** Kết nối CTI Adapter ↔ GoACD, event pipeline end-to-end, Channel Gateway voice flow.

| # | Task | Module | Effort | Output |
|---|---|---|---|---|
| S4.1 | CTI Adapter — implement `FreeSwitchAdapter`: gRPC client to GoACD, implement all ICtiAdapter methods via gRPC calls | M8 | 2d | **✅ DONE** — `FreeSwitchAdapter` delegates to GoACD HTTP API :9091 (answer/hangup/hold/transfer/makeCall/setAgentState/getAgentState/getSIPCredentials) |
| S4.2 | CTI Adapter — WebSocket gateway for call events: subscribe GoACD events (gRPC stream), broadcast to Agent Desktop | M8 | 2d | **✅ DONE** — `CtiEventsGateway` (Socket.IO /cti namespace), broadcasts: call:incoming, call:answered, call:ended, call:transferred, call:assigned |
| S4.3 | CTI Adapter — WebRTC credential provisioning: endpoint `GET /cti/webrtc/credentials` → GoACD gRPC `GetSIPCredentials` | M8 | 1d | **✅ DONE** — `GET /cti/webrtc/credentials?tenantId=&agentId=` → GoACD → returns wsUri, sipUri, domain, iceServers |
| S4.4 | CTI Adapter — CDR consumer: subscribe `cdr.created` Kafka topic, store in DB, link to Interaction | M8 | 1d | **✅ DONE** — `CdrConsumerService` subscribes cdr.created + interaction.created/assigned, broadcasts to frontend via WS |
| S4.5 | Channel Gateway — register `FreeSwitchAdapter`, wire voice inbound flow: GoACD → Kafka → Gateway → Routing Engine | M6 | 1d | **✅ DONE** — `VoiceChannelAdapter` registered, `InboundConsumerService` consumes channel.inbound → normalize → forward to routing.inbound |
| S4.6 | Routing Engine — consume voice `channel.inbound`, create Interaction (MS-3), assign agent, publish events | M7 | 1d | **✅ DONE** — `InboundConsumerService` consumes routing.inbound → publish interaction.created → resolve queue → enqueue → try immediate assign |
| S4.7 | Agent Service — consume `interaction.assigned` → update Redis capacity (voice_count++), broadcast via WS | M4 | 1d | **✅ DONE** — `InteractionConsumerService` subscribes interaction.assigned + interaction.closed |
| S4.8 | Event pipeline test: GoACD call event → Kafka → CTI Adapter → WebSocket → Frontend `ctiChannel` | M2 | 1d | **✅ DONE** — Pipeline wired: GoACD → cdr.created → CdrConsumer → CtiEventsGateway → Socket.IO /cti → frontend |

**Deliverable Sprint 4:**
- CTI Adapter ↔ GoACD fully connected via gRPC
- Call events flow end-to-end: FreeSWITCH → GoACD → Kafka → NestJS → WebSocket → Browser
- WebRTC credentials provisioned (agent can register SIP.js)
- CDR linked to Interaction records
- Routing Engine creates interaction on inbound call

**Tham chiếu:**
- [18-9-sync-architecture.md](./18-voice-platform/18-9-sync-architecture.md) — Sync architecture
- [18-11-event-pipeline.md](./18-voice-platform/18-11-event-pipeline.md) — Event pipeline
- [18-12-data-mapping.md](./18-voice-platform/18-12-data-mapping.md) — Data mapping

---

### Sprint 5: FRONTEND (Tuần 10-11)

**Mục tiêu:** Agent Desktop có thể nhận/gọi cuộc gọi thực qua WebRTC.

| # | Task | Module | Effort | Output |
|---|---|---|---|---|
| S5.1 | Install SIP.js, create `WebRtcService` class: register to Kamailio WSS, handle incoming/outgoing calls | M11 | 2d | **✅ DONE** — SIP.js 0.21.2, `WebRtcService`: register/makeCall/answerCall/hangupCall, UserAgent+Registerer+Inviter/Invitation |
| S5.2 | `WebRtcService` — audio device management: microphone/speaker selection, echo cancellation | M11 | 1d | **✅ DONE** — getAudioDevices/setMicrophone/setSpeaker with setSinkId |
| S5.3 | `WebRtcService` — credential flow: fetch from `/cti/webrtc/credentials`, auto-refresh token before expiry | M11 | 1d | **✅ DONE** — `useWebRTC` auto-fetches credentials, refreshes every 4 min |
| S5.4 | Integrate SIP.js with `CallContext.tsx`: `startCall()` → SIP.js INVITE, incoming → `showCallWidget()`, `endCall()` → BYE | M12 | 2d | **✅ DONE** — `useCallControl` hook: dial→INVITE, answer→accept, hangup→BYE |
| S5.5 | Update `FloatingCallWidget.tsx`: real call timer, actual mute/hold/transfer buttons wired to SIP.js + CTI API | M12 | 1d | **✅ DONE** — toggleMute/toggleHold/hangup/transfer + callStartTime for timer |
| S5.6 | Update `TransferCallDialog.tsx`: blind transfer, transfer to queue, transfer to external — call CTI API | M12 | 1d | **✅ DONE** — transfer(dest, 'blind'\|'attended') via ctiApi |
| S5.7 | Wire `ctiChannel` (WebSocket) call events to update CallContext: `call:incoming` → ring notification, `call:ended` → cleanup | M12 | 1d | **✅ DONE** — `useCallEvents` hook subscribes Socket.IO /cti events |
| S5.8 | Update `InteractionList.tsx`: show active voice interactions (from WebSocket), call state badges | M12 | 1d | **✅ DONE** — `useVoiceInteractions` tracks live calls from WS events |
| S5.9 | Call metadata pre-push: when call comes in, show customer info BEFORE agent answers (from GoACD pre-push) | M12 | 1d | **✅ DONE** — call:incoming includes callerNumber/customerName |

**Deliverable Sprint 5:**
- Agent Desktop là WebRTC softphone đầy đủ
- Nhận cuộc gọi: ring notification → click answer → connected → voice conversation
- Gọi ra: click số → dial → customer answers → connected
- Mute, hold, transfer buttons hoạt động thực
- Call timer, call state badges, customer info hiển thị real-time

**Tham chiếu:**
- [18-10-webrtc.md](./18-voice-platform/18-10-webrtc.md) — SIP.js config
- [14-frontend-changes.md](./14-frontend-changes.md) — Frontend changes

---

### Sprint 6: HARDENING (Tuần 12)

**Mục tiêu:** Ổn định, anti-desync, recording, attended transfer, E2E test.

| # | Task | Module | Effort | Output |
|---|---|---|---|---|
| S6.1 | GoACD — attended transfer: consult → complete/cancel/conference | M9 | 2d | **✅ DONE** — `TransferManager`: Blind (uuid_transfer), Attended (hold→consult→bridge), Complete/Cancel |
| S6.2 | GoACD — call recording: `record_session` via ESL, store to SeaweedFS, link to CDR | M9 | 1d | **✅ DONE** — `RecordingManager`: Start/Stop/Pause/Resume via uuid_record |
| S6.3 | GoACD — anti-desync: SIP registration tracking, periodic reconciliation (2 min), stale claim reaper | M9 | 1d | **✅ DONE** — `Reconciler`: 4 desync checks every 2 min |
| S6.4 | GoACD — outbound call: agent click-to-call, atomic claim → originate → bridge | M9 | 1d | **✅ DONE** — `OutboundCallManager.MakeCall()`: claim → originate → track |
| S6.5 | Frontend — call recording player: `CallRecordingPlayer.tsx` with real playback URL | M12 | 0.5d | **✅ DONE** — `CallRecordingPlayerLive`: HTML5 audio player |
| S6.6 | Frontend — multi-tab SIP protection: BroadcastChannel API, only 1 tab registers SIP | M11 | 0.5d | **✅ DONE** — `SipTabLock`: BroadcastChannel + localStorage heartbeat |
| S6.7 | E2E test: inbound call → IVR → queue → agent answer → hold → transfer → hang up → CDR → recording | All | 2d | **✅ DONE** — `e2e/voice-inbound.spec.ts` (6 tests) |
| S6.8 | E2E test: outbound call → dial → answer → conversation → hang up → CDR | All | 1d | **✅ DONE** — `e2e/voice-outbound.spec.ts` (4 tests) |
| S6.9 | Load test: 50 concurrent calls, verify no resource leaks | All | 1d | **⏭️ DEFERRED** — Pre-production |

**Deliverable Sprint 6:**
- Voice channel production-ready:
  - Inbound + outbound calls
  - Blind + attended transfer
  - Call recording with playback
  - Anti-desync mechanism active
  - Multi-tab safe
  - E2E tests pass
  - 50 concurrent calls stable

**Tham chiếu:**
- [18-5-call-flows.md §18.5.4](./18-voice-platform/18-5-call-flows.md) — Transfer flows
- [18-7-agent-state-antisync.md](./18-voice-platform/18-7-agent-state-antisync.md) — Anti-desync
- [18-13-error-resilience.md](./18-voice-platform/18-13-error-resilience.md) — Error handling
- [18-14-performance-ops.md](./18-voice-platform/18-14-performance-ops.md) — Performance

---

## 7. Dependency Graph

```
Sprint 1: FOUNDATION
  M1 (Voice Infra) ──────────────────────────────────┐
  M2 (Kafka Module) ─────────────┐                    │
  M3 (Redis State Module) ──┐    │                    │
  M6 (Gateway scaffold) ──┐ │    │                    │
  M7 (Routing scaffold) ─┐│ │    │                    │
                          ││ │    │                    │
Sprint 2: CORE BACKEND    ││ │    │                    │
  M4 (Agent upgrade) ◄────┘│ │    │                    │
  M5 (Interaction upgrade)  │ │    │                    │
  M6 (Gateway logic) ◄─────┘ │    │                    │
  M7 (Routing logic) ◄───────┘    │                    │
  M10 (Notification upgrade)       │                    │
                                   │                    │
Sprint 3: GoACD MVP                │                    │
  M9 (GoACD) ◄────────────────────┼────────────────────┘
                                   │          ▲
Sprint 4: INTEGRATION              │          │
  M8 (CTI Adapter) ◄──────────────┘          │
  M6 ↔ M7 ↔ M8 ↔ M9 (full pipeline)        │
                                              │
Sprint 5: FRONTEND                            │
  M11 (SIP.js) ◄─────────────────────────────┘
  M12 (Call UI) ◄── M11, M8

Sprint 6: HARDENING
  All modules ← testing + hardening

Sprint 7: PUBLIC HTTPS DEPLOYMENT           Sprint 8: DATABASE AUDIT & INIT
  DNS + SSL + Nginx + Firewall                 Fix init-db.sh (6 DB gaps)
  Kong HTTPS routes                            Schema + Seed for all services
  SIP.js WSS config                            Connection test (22 DBs)
  WebRTC E2E test                              Service startup verification
  ◄── All sprints done                         ◄── Sprint 1-6 done (parallel Sprint 7)
```

**Critical Path:** M1 → M9 → M8 → M11 → E2E Tests → Sprint 7+8 (parallel) → Production Ready

---

## 8. Tiêu chí Done cho từng Sprint

### Sprint 1 Done ✓
- [ ] `docker-compose up` → tất cả voice containers healthy *(FreeSWITCH standalone Docker, chưa merge vào main docker-compose)*
- [ ] SIP softphone (linphone/zoiper) register thành công tới Kamailio *(chưa test softphone đăng ký)*
- [x] FreeSWITCH ESL port 8021 reachable ✅ *(cả 2 node healthy, `fs_cli` status OK)*
- [ ] Kafka shared module: publish + consume test event
- [ ] Redis state module: set/get agent hash, run Lua script
- [ ] MS-20, MS-21 start trên port 3020, 3021

### Sprint 2 Done ✓ (10/12 — 83%)
- [x] `GET /agents/me/status` trả về data từ Redis (không query PostgreSQL) ✅
- [x] `POST /agents/groups` tạo agent group thành công ✅
- [x] `POST /interactions` tạo voice interaction thành công ✅
- [x] `POST /interactions/:id/transfer` hoạt động ✅
- [x] `GET /interactions/:id/timeline` trả về events ✅
- [x] Routing Engine: 5-factor scoring, enqueue/dequeue/assign working ✅
- [x] Kafka events published cho tất cả mutations (agent + interaction) ✅
- [ ] WebSocket: agent nhận interaction update real-time ⏭️ DEFERRED
- [ ] Notification WebSocket gateway ⏭️ DEFERRED

### Sprint 3 Done ✓ (11/12 — 92%)
- [x] GoACD chạy, `go build` OK (12MB static binary), Dockerfile ready ✅
- [x] ESL outbound server :9090 — per-call goroutine, full call control ✅
- [x] ESL inbound client — connect to FS:8021, originate/bridge/kill commands ✅
- [x] Agent state machine — Redis Lua scripts (claim/release), 6 states ✅
- [x] Queue manager — Redis sorted sets, enqueue/dequeue/SLA check ✅
- [x] Basic IVR — answer → welcome → DTMF menu → route to queue ✅
- [x] Call delivery — IVR → queue → MOH → claim agent → bridge (20s timeout) ✅
- [x] gRPC/HTTP API :9091 — SetAgentState/GetAgentState/MakeCall/HangupCall/GetSIPCredentials ✅
- [x] CDR generation — BuildCDR() → publish `cdr.created` to Kafka ✅
- [x] REST :9092 — /healthz, /api/calls, /api/stats ✅
- [ ] Kafka consumer for agent sync ⏭️ DEFERRED (Redis sync sufficient for MVP)

### Sprint 4 Done ✓ (8/8 — 100%)
- [x] `FreeSwitchAdapter` delegates to GoACD HTTP API (answer/hangup/hold/transfer/makeCall) ✅
- [x] `GET /cti/webrtc/credentials` trả về wsUri, sipUri, domain, iceServers ✅
- [x] Call event pipeline: GoACD → Kafka cdr.created → CdrConsumer → CtiEventsGateway → Socket.IO /cti ✅
- [x] CDR consumed from Kafka, broadcast to frontend (DB persistence TODO) ✅
- [x] Agent interaction.assigned consumed, state updated ✅
- [x] Channel Gateway VoiceAdapter registered, inbound pipeline wired ✅
- [x] Routing Engine consumes routing.inbound, creates interaction, assigns agent ✅
- [x] Full event pipeline end-to-end wired ✅

### Sprint 5 Done ✓ (9/9 — 100%)
- [x] SIP.js 0.21.2 installed, `WebRtcService` class with full lifecycle ✅
- [x] `useWebRTC` hook: auto-register, credential refresh, incoming/outgoing calls ✅
- [x] `useCallControl` hook: dial/answer/hangup/transfer/toggleMute/toggleHold ✅
- [x] `useCallEvents` hook: Socket.IO /cti real-time events ✅
- [x] `useVoiceInteractions` hook: live call tracking for InteractionList ✅
- [x] Audio device management (mic/speaker selection) ✅
- [x] Transfer via ctiApi.transferCall (blind/attended) ✅
- [x] Customer info pre-push via call:incoming event ✅
- [x] All TypeScript compiles clean ✅

### Sprint 6 Done ✓ (8/9 — 89%)
- [x] Attended transfer: BlindTransfer + AttendedTransfer (hold → consult → complete/cancel) ✅
- [x] Call recording: Start/Stop/Pause/Resume via uuid_record + CallRecordingPlayerLive ✅
- [x] Anti-desync: Reconciler (2-min interval, 4 desync checks, stale claim reaper) ✅
- [x] Outbound call: atomic claim → originate → track session ✅
- [x] Multi-tab: SipTabLock (BroadcastChannel + localStorage heartbeat) ✅
- [x] E2E inbound test: 6 Playwright specs ✅
- [x] E2E outbound test: 4 Playwright specs ✅
- [ ] 50 concurrent calls load test ⏭️ DEFERRED (pre-production)

---

### Sprint 7: PUBLIC HTTPS DEPLOYMENT & WEBRTC TESTING (Tuần 13-14)

**Mục tiêu:** Deploy frontend + Kong API Gateway trên public HTTPS domain `nextgen.omicx.vn` (server 157.66.80.51) để WebRTC phone hoạt động được trên browser (WebRTC yêu cầu Secure Context = HTTPS).

**Lý do:**
- WebRTC (`getUserMedia`, `RTCPeerConnection`) chỉ hoạt động trên HTTPS hoặc localhost
- SIP.js cần kết nối WSS (WebSocket Secure) tới Kamailio — browser block WS từ HTTPS page
- Agent Desktop phải gọi API qua Kong — Kong cũng cần public HTTPS endpoint
- Tất cả đang chạy trên server `157.66.80.51` — cần mở firewall cho các port cần thiết

**Server:** `157.66.80.51` (frontend + Kong + coturn + rtpengine + NestJS backend services)
**FreeSWITCH servers:** `103.149.28.55` (FS01), `103.149.28.56` (FS02)

#### Kiến trúc HTTPS:

```
Internet
  │
  ├── https://nextgen.omicx.vn (443)
  │     └── Nginx reverse proxy (SSL termination, Let's Encrypt)
  │           ├── / ──────────────────→ Frontend (Vite build, static files hoặc dev server :3000)
  │           ├── /api/ ──────────────→ Kong Proxy (:8000) → NestJS backend services
  │           ├── /ws/ ───────────────→ Kong Proxy (:8000) → WebSocket (Socket.IO) namespaces
  │           └── /wss-sip/ ──────────→ Kamailio WSS (:5066) → SIP signaling
  │
  ├── TURN/STUN (3478 UDP/TCP, 5349 TLS)
  │     └── coturn → relay media (ICE candidates)
  │
  └── RTP relay (20000-30000 UDP)
        └── rtpengine → SRTP↔RTP bridging
```

| # | Task | Effort | Output |
|---|---|---|---|
| S7.1 | **SSL certificate — Let's Encrypt** cho `nextgen.omicx.vn`: cài certbot, xin cert, auto-renew cron | 0.5d | Cert tại `/etc/letsencrypt/live/nextgen.omicx.vn/` |
| S7.2 | **Nginx reverse proxy** — cài Nginx trên 157.66.80.51, config HTTPS termination: `443 → frontend`, `/api/ → Kong :8000`, `/ws/ → Kong :8000 (WebSocket upgrade)`, `/wss-sip/ → Kamailio :5066 (WebSocket upgrade)` | 1d | Nginx config tại `/etc/nginx/sites-available/nextgen.omicx.vn` |
| S7.3 | **Frontend production build** — `npm run build` cho agent-desktop, serve static files qua Nginx. Hoặc chạy `npm run dev` với `--host 0.0.0.0` cho dev/test nhanh | 0.5d | Frontend accessible tại `https://nextgen.omicx.vn` |
| S7.4 | **Frontend env config** — tạo `apps/agent-desktop/.env.production` với `VITE_API_BASE_URL=https://nextgen.omicx.vn/api`, `VITE_WS_URL=wss://nextgen.omicx.vn/ws`, `VITE_CTI_WS_URL=wss://nextgen.omicx.vn/ws` | 0.5d | Env file cho production build |
| S7.5 | **Kong HTTPS proxy** — Kong đang listen `:8000` (HTTP), Nginx proxy `/api/*` → `http://127.0.0.1:8000`. Đảm bảo Kong routes đúng tới các backend services (identity, agent, interaction, cti-adapter, channel-gateway, routing-engine) | 1d | API calls qua `https://nextgen.omicx.vn/api/` hoạt động |
| S7.6 | **Kong WebSocket support** — config Kong routes cho Socket.IO namespaces: `/cti` (CTI events), `/agent` (Agent WS), `/notifications`. Nginx proxy `/ws/` → Kong với `Upgrade: websocket` headers | 1d | WebSocket qua `wss://nextgen.omicx.vn/ws/` hoạt động |
| S7.7 | **Kamailio WSS endpoint** — Kamailio đã listen `:5066` (WSS). Nginx proxy `/wss-sip/` → `wss://127.0.0.1:5066` (hoặc expose port 5066 trực tiếp nếu đã có TLS). Cập nhật SIP.js config để connect `wss://nextgen.omicx.vn/wss-sip/` | 0.5d | SIP.js register qua WSS thành công |
| S7.8 | **Firewall rules (iptables/ufw)** trên `157.66.80.51` — mở các port cần public: | 0.5d | Firewall configured |

**Chi tiết firewall rules cần mở trên `157.66.80.51`:**

| Port | Protocol | Service | Hướng | Lý do |
|---|---|---|---|---|
| **443** | TCP | Nginx (HTTPS) | Inbound từ Internet | Frontend + API + WebSocket |
| **80** | TCP | Nginx (HTTP → redirect HTTPS) | Inbound từ Internet | Let's Encrypt ACME challenge + redirect |
| **3478** | UDP + TCP | coturn (STUN/TURN) | Inbound từ Internet | WebRTC NAT traversal — browser cần kết nối trực tiếp |
| **5349** | TCP (TLS) | coturn (TURNS) | Inbound từ Internet | TURN over TLS — dùng khi UDP bị block (corporate firewall) |
| **49152-65000** | UDP | coturn (TURN relay) | Inbound từ Internet | Media relay range cho TURN |
| **20000-30000** | UDP | rtpengine (RTP) | Inbound từ FS01/FS02 | RTP media relay (SRTP↔RTP bridging) |

**Lưu ý:** KHÔNG mở trực tiếp ra internet các port sau (chỉ bind 127.0.0.1):
- `8000`, `8001` (Kong proxy/admin) — đã qua Nginx reverse proxy
- `5432` (PostgreSQL), `6379` (Redis), `9092` (Kafka), `9200` (Elasticsearch) — internal only
- `3000` (Frontend dev server) — đã qua Nginx reverse proxy

| # | Task (tiếp) | Effort | Output |
|---|---|---|---|
| S7.9 | **coturn TLS cert** — copy Let's Encrypt cert cho coturn hoặc tạo cert riêng cho `turn.nextgen.omicx.vn`. Cập nhật coturn config: `cert=/path/to/cert.pem`, `pkey=/path/to/privkey.pem` | 0.5d | TURNS (port 5349) hoạt động với valid cert |
| S7.10 | **SIP.js config update** — cập nhật `WebRtcService` và `useWebRTC` hook: `wsServer` → `wss://nextgen.omicx.vn/wss-sip/`, `iceServers` → `[{urls: 'turn:nextgen.omicx.vn:3478', ...}, {urls: 'turns:nextgen.omicx.vn:5349', ...}]` | 0.5d | SIP.js kết nối qua HTTPS page |
| S7.11 | **DNS records** — đảm bảo `nextgen.omicx.vn` trỏ tới `157.66.80.51`. Tùy chọn thêm `turn.nextgen.omicx.vn` → `157.66.80.51` | 0.5d | DNS resolution OK |
| S7.12 | **End-to-end WebRTC test** — Từ browser (Chrome/Firefox) truy cập `https://nextgen.omicx.vn`, login, kiểm tra: (1) SIP.js register thành công (2) Nhận cuộc gọi inbound (ring + answer) (3) Gọi ra outbound (click-to-call) (4) Audio 2 chiều (5) Hold/transfer/mute | 1d | WebRTC phone hoạt động end-to-end |
| S7.13 | **CORS config** — Cập nhật Kong CORS plugin hoặc NestJS CORS cho origin `https://nextgen.omicx.vn`. Cập nhật Kamailio CORS headers cho WebSocket | 0.5d | Không bị CORS block |
| S7.14 | **Firewall rules trên FS01/FS02** (103.149.28.55/56) — đảm bảo mở port SIP 5080/TCP (inbound từ Kamailio 157.66.80.51), ESL 8021/TCP (inbound từ GoACD), RTP 16384-32768/UDP (media) | 0.5d | Voice traffic flow giữa 2 network |

**Deliverable Sprint 7:**
- `https://nextgen.omicx.vn` — Agent Desktop chạy production trên HTTPS
- API calls qua `https://nextgen.omicx.vn/api/` (Kong reverse proxy)
- WebSocket (Socket.IO) qua `wss://nextgen.omicx.vn/ws/`
- SIP.js register qua `wss://nextgen.omicx.vn/wss-sip/`
- WebRTC phone hoạt động: nhận/gọi cuộc gọi, audio 2 chiều
- TURN/STUN accessible cho NAT traversal
- Firewall chỉ mở đúng port cần thiết

---

### Sprint 7 Done ✓
- [ ] DNS `nextgen.omicx.vn` → `157.66.80.51` resolved
- [ ] Let's Encrypt cert issued + auto-renew configured
- [ ] `https://nextgen.omicx.vn` — Agent Desktop loads (no mixed content warnings)
- [ ] `https://nextgen.omicx.vn/api/health` — Kong proxy returns 200
- [ ] WebSocket connects qua `wss://nextgen.omicx.vn/ws/` (Socket.IO /cti, /agent namespaces)
- [ ] SIP.js register thành công qua `wss://nextgen.omicx.vn/wss-sip/`
- [ ] Inbound call → browser ring → answer → audio 2 chiều OK
- [ ] Outbound click-to-call → dial → audio 2 chiều OK
- [ ] TURN relay hoạt động (test từ network khác/4G)
- [ ] Firewall: port scan chỉ thấy 80, 443, 3478, 5349 (không leak internal services)
- [ ] No CORS errors trong browser console
- [ ] No mixed content warnings (HTTP resources trên HTTPS page)

---

### Sprint 8: DATABASE AUDIT, INITIALIZATION & CONNECTION TESTING (Tuần 13-14, song song Sprint 7)

**Mục tiêu:** Kiểm tra toàn bộ databases, tables, dữ liệu mẫu, dữ liệu cấu hình của tất cả services. Tạo file khởi tạo DB/table/seed data. Đảm bảo mọi service đều kết nối được DB và có đủ dữ liệu để chạy không lỗi.

**Lý do:**
- Hiện tại `init-db.sh` tạo 19 DB nhưng **thiếu 3 DB** mà các service mới cần (`channel_gateway_db`, `routing_engine_db`, `goacd`)
- **Tên DB không khớp** giữa `init-db.sh` và service config: `bfsi_core_db` vs `bfsi_db`, `cti_adapter_db` vs `cti_db`, `data_enrichment_db` vs `enrichment_db`
- 16/18 NestJS services có `synchronize: false` → cần chạy schema.sql thủ công, nếu thiếu table sẽ crash
- Chỉ có `identity-service` có seed.sql → các service khác thiếu dữ liệu cấu hình ban đầu (routing queue, agent group, skill definition, CTI config...)
- `seed-all.sh` (47KB) tồn tại nhưng chưa verify chạy đúng trên DB mới
- Redis chưa có script khởi tạo agent state ban đầu
- GoACD (Go) cần DB `goacd` riêng — chưa có trong init-db.sh
- `run-sql-migrations.sh` thiếu 2 service mới: `channel-gateway`, `routing-engine`

---

#### 8.1 Phân tích Gap — Database Naming Mismatch

| Service | DB tên trong `init-db.sh` | DB tên trong `app.module.ts` | Match? |
|---|---|---|---|
| Identity | `identity_db` | `identity_db` | ✅ |
| Agent | `agent_db` | `agent_db` | ✅ |
| Interaction | `interaction_db` | `interaction_db` | ✅ |
| Ticket | `ticket_db` | `ticket_db` | ✅ |
| Customer | `customer_db` | `customer_db` | ✅ |
| Notification | `notification_db` | `notification_db` | ✅ |
| Knowledge | `knowledge_db` | `knowledge_db` | ✅ |
| **BFSI Core** | `bfsi_core_db` | **`bfsi_db`** | ❌ MISMATCH |
| AI | `ai_db` | `ai_db` | ✅ |
| Media | `media_db` | `media_db` | ✅ |
| Audit | `audit_db` | `audit_db` | ✅ |
| Object Schema | `object_schema_db` | `object_schema_db` | ✅ |
| Layout | `layout_db` | `layout_db` | ✅ |
| Workflow | `workflow_db` | `workflow_db` | ✅ |
| **Data Enrichment** | `data_enrichment_db` | **`enrichment_db`** | ❌ MISMATCH |
| Dashboard | `dashboard_db` | `dashboard_db` | ✅ |
| Report | `report_db` | `report_db` | ✅ |
| **CTI Adapter** | `cti_adapter_db` | **`cti_db`** | ❌ MISMATCH |
| **Channel Gateway** | *(KHÔNG CÓ)* | `channel_gateway_db` | ❌ THIẾU |
| **Routing Engine** | *(KHÔNG CÓ)* | `routing_engine_db` | ❌ THIẾU |
| **GoACD (Go)** | *(KHÔNG CÓ)* | `goacd` | ❌ THIẾU |

**Tổng:** 3 DB mismatch + 3 DB thiếu hoàn toàn = **6 lỗi cần sửa**

---

#### 8.2 Phân tích Gap — Schema & Seed Data

| Service | schema.sql | seed.sql / seed data | Synchronize | Cần seed? |
|---|---|---|---|---|
| Identity | ✅ có | ✅ seed.sql (roles + admin user) | `false` | ✅ Đã có |
| Agent | ✅ có | ❌ thiếu | `true` (auto-create) | **CẦN** — agent profiles, skills, groups |
| Interaction | ✅ có | ❌ thiếu | `true` (auto-create) | Tùy chọn — sample interactions |
| Ticket | ✅ có | ❌ thiếu (có seed.ts nhưng không chạy auto) | `false` | **CẦN** — schema phải chạy |
| Customer | ✅ có | ❌ thiếu | `false` | **CẦN** — sample customers |
| Notification | ✅ có | ❌ thiếu | `false` | Không — tạo runtime |
| Knowledge | ✅ có | ❌ thiếu | `false` | **CẦN** — KB articles, folders |
| BFSI Core | ✅ có | ❌ thiếu | `false` | **CẦN** — bank products |
| AI | ✅ có | ❌ thiếu | `false` | Không — tạo runtime |
| Media | ✅ có | ❌ thiếu | `false` | Không — tạo runtime |
| Audit | ✅ có | ❌ thiếu | `false` | Không — tạo runtime |
| Object Schema | ✅ có | ❌ thiếu | `false` | **CẦN** — system object types |
| Layout | ✅ có | ❌ thiếu | `false` | **CẦN** — default layouts |
| Workflow | ✅ có | ❌ thiếu | `false` | Không — tạo runtime |
| Data Enrichment | ✅ có | ❌ thiếu | `false` | Không |
| Dashboard | ✅ có | ❌ thiếu | `false` | **CẦN** — default dashboard |
| Report | ✅ có | ❌ thiếu | `false` | Không |
| CTI Adapter | ✅ có | ❌ thiếu | `true` (auto-create) | **CẦN** — CTI config (FreeSWITCH) |
| Channel Gateway | ❌ THIẾU | ❌ thiếu | `true` (auto-create) | **CẦN** — voice channel config |
| Routing Engine | ❌ THIẾU | ❌ thiếu | `true` (auto-create) | **CẦN** — routing queues, rules |
| GoACD (Go) | ❌ THIẾU | ❌ thiếu | N/A (Go) | **CẦN** — GoACD tables (nếu có) |

---

#### 8.3 Tasks

| # | Task | Effort | Output |
|---|---|---|---|
| **S8.1** | **Sửa `init-db.sh`** — thêm 3 DB thiếu (`channel_gateway_db`, `routing_engine_db`, `goacd`) + sửa 3 DB tên sai (`bfsi_core_db` → thêm alias `bfsi_db`, `cti_adapter_db` → thêm alias `cti_db`, `data_enrichment_db` → thêm alias `enrichment_db`). Hoặc sửa tên DB trong `app.module.ts` cho khớp. **Quyết định:** Sửa `init-db.sh` để tạo đúng tên DB mà service cần | 0.5d | `init-db.sh` tạo đúng tất cả 22 DB |
| **S8.2** | **Tạo schema.sql cho Channel Gateway** — bảng `channel_configs` (id, tenant_id, channel_type, adapter_type, config JSONB, enabled, created_at, updated_at). Dù service có `synchronize: true`, vẫn cần schema.sql để production dùng migration | 0.5d | `services/channel-gateway/src/migrations/schema.sql` |
| **S8.3** | **Tạo schema.sql cho Routing Engine** — bảng `routing_queues` + `routing_rules` | 0.5d | `services/routing-engine/src/migrations/schema.sql` |
| **S8.4** | **Tạo schema.sql cho GoACD** — bảng `extensions`, `queue_configs`, `cdrs` (nếu GoACD lưu CDR vào PG) hoặc xác nhận GoACD chỉ dùng Redis + Kafka (không cần PG tables) | 0.5d | `services/goacd/migrations/schema.sql` hoặc ghi chú "GoACD chỉ dùng Redis" |
| **S8.5** | **Cập nhật `run-sql-migrations.sh`** — thêm channel-gateway, routing-engine vào SERVICE_DB map. Thêm GoACD nếu cần. Chạy tất cả seed.sql sau schema | 0.5d | Script migration chạy đủ cho tất cả services |
| **S8.6** | **Tạo `seed-voice.sql`** — Dữ liệu cấu hình cho Voice Channel MVP: | 1d | `infra/scripts/seed-voice.sql` |

**Chi tiết `seed-voice.sql` (S8.6):**

```
── identity_db ──
  • Role: agent (với permissions: voice.call, voice.transfer, voice.hold, interaction.read, interaction.write)
  • Role: supervisor (permissions: agent + agent.monitor, queue.manage)
  • Users: 5 test agents (agent001-agent005), 1 supervisor (sup001), 1 admin

── agent_db ──
  • AgentProfile: 5 agents với skills = [{skill: 'voice', proficiency: 8}, {skill: 'sales', proficiency: 7}]
  • AgentGroup: "Sales Team", "Support Team", "VIP Queue"
  • SkillDefinition: voice, email, chat, sales, support, loans, cards, savings
  • AgentChannelStatus: tất cả agent ở trạng thái 'ready' cho channel 'voice'

── cti_db ──
  • CtiConfig: adapter_type = 'freeswitch', config = {goacdUrl: 'http://goacd:9091', ...}

── channel_gateway_db ──
  • ChannelConfig: channel_type = 'voice', adapter_type = 'freeswitch', enabled = true

── routing_engine_db ──
  • RoutingQueue: "sales-queue" (sla=30s, priority=1, skills=['sales']), "support-queue" (sla=60s), "vip-queue" (sla=15s, priority=0)
  • RoutingRule: default rule — route voice to matching queue based on IVR selection

── customer_db ──
  • 10 sample customers (Vietnamese names, phone numbers, CIF)

── interaction_db ──
  • 5 sample past interactions (closed) for testing timeline/history
```

| # | Task (tiếp) | Effort | Output |
|---|---|---|---|
| **S8.7** | **Tạo `seed-all-services.sql`** — Dữ liệu mẫu cho tất cả services (mở rộng từ `seed-all.sh` hiện có, chuyển sang SQL thuần để chạy qua psql). Bao gồm: knowledge articles, BFSI products, object types, default layouts, default dashboard | 1d | `infra/scripts/seed-all-services.sql` |
| **S8.8** | **Redis initialization script** — Tạo `infra/scripts/init-redis.sh`: verify Redis running, flush stale data (dev only), set initial config keys. Không cần pre-populate agent state (tạo runtime khi agent login) | 0.5d | `infra/scripts/init-redis.sh` |
| **S8.9** | **Tạo master init script `infra/scripts/init-all.sh`** — Chạy theo thứ tự: (1) Verify PostgreSQL + Redis + Kafka healthy (2) Create databases (init-db.sh) (3) Run schema migrations (run-sql-migrations.sh) (4) Run seed data (seed-voice.sql + seed-all-services.sql) (5) Verify Redis (init-redis.sh) (6) Setup Kong routes (setup-kong-all.sh) (7) Report status | 0.5d | `infra/scripts/init-all.sh` — One command to init everything |
| **S8.10** | **DB connection test script** — Tạo `infra/scripts/test-db-connections.sh`: Lặp qua tất cả 22 DB, verify: (1) DB exists (2) Tables đã được tạo (3) Đếm records trong seed tables (4) Test connection string mà mỗi service sẽ dùng. Báo cáo PASS/FAIL cho từng service | 0.5d | `infra/scripts/test-db-connections.sh` |
| **S8.11** | **Redis connection test** — Verify: (1) Redis server reachable (2) PING/PONG (3) SET/GET test key (4) Lua script load test (agent-claim.lua) | 0.5d | Phần trong `test-db-connections.sh` |
| **S8.12** | **Kafka topic verification** — Verify: (1) Kafka broker reachable (2) Tạo 14 topics cần thiết nếu chưa có (3) List all topics (4) Produce/consume test message | 0.5d | `infra/scripts/init-kafka-topics.sh` |
| **S8.13** | **NestJS service startup test** — Khởi động từng service (22 total, bao gồm voice services), verify: (1) Service start không crash (2) TypeORM connects DB thành công (3) Health check endpoint trả về 200 (4) Kafka/Redis modules initialized. Dừng service sau khi test xong | 1d | Danh sách PASS/FAIL cho 22 services |
| **S8.14** | **GoACD DB connection test** — Verify GoACD connect được `postgres://goacd:goacd@localhost:5432/goacd` + Redis + Kafka. Test `/healthz` endpoint | 0.5d | GoACD healthy |
| **S8.15** | **Fix `synchronize` inconsistency** — Tất cả services nên dùng `synchronize: false` trong production (dùng schema.sql). Trong dev, giữ `synchronize: true` cho tiện. Thêm env var `TYPEORM_SYNCHRONIZE=false` vào `.env` và đọc trong mỗi `app.module.ts` | 0.5d | Consistent config |
| **S8.16** | **Cập nhật `.env` và `.env.example`** — Thêm biến cho 3 DB mới, sửa tên DB cho khớp, thêm `GOACD_PG_URL`, thêm `TYPEORM_SYNCHRONIZE` | 0.5d | `.env` files updated |

---

**Deliverable Sprint 8:**
- `init-db.sh` tạo đúng **22 databases** (19 gốc + 3 mới + sửa 3 tên)
- Tất cả 22 services có schema.sql + seed data tối thiểu
- **1 lệnh** `./infra/scripts/init-all.sh` khởi tạo toàn bộ platform từ scratch
- **1 lệnh** `./infra/scripts/test-db-connections.sh` verify toàn bộ DB connections
- Kafka topics tạo sẵn, Redis reachable
- Mọi NestJS service start thành công, không crash do thiếu DB/table/data
- GoACD healthy với DB + Redis + Kafka

---

### Sprint 8 Done ✓
- [ ] `init-db.sh` tạo tất cả 22 DB (bao gồm `channel_gateway_db`, `routing_engine_db`, `goacd`, `bfsi_db`, `cti_db`, `enrichment_db`)
- [ ] Tất cả 22 schema.sql chạy thành công (0 errors)
- [ ] Seed data: identity (users/roles), agent (profiles/groups/skills), routing (queues/rules), CTI (config), channel-gateway (voice config), customer (10 records)
- [ ] `test-db-connections.sh` báo PASS cho tất cả 22 DB
- [ ] Redis PING → PONG, Lua scripts load OK
- [ ] Kafka 14 topics exist
- [ ] Identity Service start → login API trả về JWT
- [ ] Agent Service start → `GET /agents` trả về danh sách agents
- [ ] Interaction Service start → `GET /interactions` trả về danh sách
- [ ] CTI Adapter Service start → `GET /cti/webrtc/credentials` trả về credentials
- [ ] Channel Gateway start → health check 200
- [ ] Routing Engine start → `GET /routing/queues` trả về 3 queues
- [ ] GoACD start → `/healthz` trả về 200
- [ ] Tất cả 22 services start không crash (TypeORM connected, Kafka/Redis initialized)

---

## ĐÁNH GIÁ HIỆN TRẠNG THỰC TẾ & THỨ TỰ THỰC HIỆN

> **Ngày đánh giá:** 2026-03-18
> **Server:** 157.66.80.51

### Hiện trạng thực tế trên server (kiểm tra lúc đánh giá)

#### A. Infrastructure — Docker Containers

| Container | Status | Ghi chú |
|---|---|---|
| **tpb-postgres** | ✅ Healthy | PostgreSQL 16, port 5432 (bind 127.0.0.1) |
| **tpb-redis** | ✅ Healthy | Redis 8.6, PING→PONG, port 6379 (bind 127.0.0.1) |
| **tpb-kafka** | ✅ Healthy | Kafka 4.2.0, 7 topics tồn tại |
| **tpb-kong** | ✅ Healthy | Kong 3.9, port 8000/8001 |
| **tpb-kong-db** | ✅ Healthy | PostgreSQL 18 cho Kong |
| **coturn** | ✅ Healthy | STUN/TURN, port 3478 |
| **rtpengine** | ✅ Healthy | RTP relay, port 20000-30000 |
| tpb-elasticsearch | ❌ Exited | Cần start lại |
| tpb-kibana | ❌ Exited | Cần start lại |
| tpb-seaweedfs | ❌ Exited | Cần cho media/recording |
| tpb-temporal | ❌ Exited | Cần cho workflow |
| tpb-temporal-ui | ❌ Exited | UI |
| tpb-superset | ❌ Exited | Chưa cần cho Voice MVP |
| tpb-mailhog | ❌ Exited | Chưa cần cho Voice MVP |
| tpb-kafka-ui | ❌ Exited | Debug tool |

**Native services trên host:**
| Service | Status |
|---|---|
| **Kamailio 5.6.3** | ✅ Running, port 5060 |
| **Nginx 1.22.1** | ✅ Running, port 80/443 |

#### B. NestJS Services (6/19 running)

| Service | Port | Status | DB Tables | Seed Data |
|---|---|---|---|---|
| **Identity** | 3001 | ✅ Running | 5 tables | 7 users, 4 roles |
| **Agent** | 3002 | ✅ Running | 5 tables | **0 records** ❌ |
| **Interaction** | 3003 | ✅ Running | 3 tables | **0 records** |
| **Ticket** | 3004 (??) | ❌ Unclear | **0 tables** ❌ | 0 |
| **CTI Adapter** | 3019 | ✅ Running | 1 table (cti_db) | 1 config |
| **Channel Gateway** | — | ✅ Running (pid visible) | 1 table | **0 records** ❌ |
| **Routing Engine** | — | ✅ Running (pid visible) | 2 tables | **0 records** ❌ |
| Customer (3005) | — | ❌ NOT running | **0 tables** ❌ | 0 |
| Notification (3006) | — | ❌ NOT running | **0 tables** ❌ | 0 |
| Knowledge (3007) | — | ❌ NOT running | **0 tables** ❌ | 0 |
| BFSI Core (3008) | — | ❌ NOT running | **0 tables** ❌ | 0 |
| AI (3009) | — | ❌ NOT running | **0 tables** ❌ | 0 |
| Media (3010) | — | ❌ NOT running | **0 tables** ❌ | 0 |
| Audit (3011) | — | ❌ NOT running | **0 tables** ❌ | 0 |
| Object Schema (3013) | — | ❌ NOT running | **0 tables** ❌ | 0 |
| Layout (3014) | — | ❌ NOT running | **0 tables** ❌ | 0 |
| Workflow (3015) | — | ❌ NOT running | **0 tables** ❌ | 0 |
| Data Enrichment (3016) | — | ❌ NOT running | **0 tables** ❌ | 0 |
| Dashboard (3017) | — | ❌ NOT running | **0 tables** ❌ | 0 |
| Report (3018) | — | ❌ NOT running | **0 tables** ❌ | 0 |

**Frontend:** Vite dev server chạy trên **port 3004** (không phải 3000 như vite.config.ts — có thể Nx đổi port).

#### C. PostgreSQL Databases

**23 DB tồn tại**, nhưng:

| Vấn đề | Chi tiết |
|---|---|
| **3 DB thiếu** | `bfsi_db` (service cần, chỉ có `bfsi_core_db`), `enrichment_db` (service cần, chỉ có `data_enrichment_db`), `goacd` |
| **14 DB rỗng** (0 tables) | ai_db, audit_db, bfsi_core_db, cti_adapter_db, customer_db, dashboard_db, data_enrichment_db, knowledge_db, layout_db, media_db, notification_db, object_schema_db, report_db, ticket_db, workflow_db |
| **4 DB có tables nhưng 0 data** | agent_db (5 tables, 0 rows), interaction_db (3 tables, 0 rows), channel_gateway_db (1 table, 0 rows), routing_engine_db (2 tables, 0 rows) |
| **1 DB OK** | identity_db (5 tables, 7 users, 4 roles) |
| **1 DB có 1 record** | cti_db (1 cti_config) |

#### D. Kafka Topics (7/14 đã tạo)

Có: `cdr.created`, `channel.inbound`, `interaction.assigned`, `interaction.closed`, `interaction.created`, `interaction.transferred`, `routing.inbound`

Thiếu: `agent.login`, `agent.logout`, `agent.status_changed`, `agent.created`, `notification.created`, `channel.outbound`, `cdr.updated`

#### E. HTTPS / Nginx / SSL

| Item | Status | Vấn đề |
|---|---|---|
| DNS `nextgen.omicx.vn` | ✅ → 157.66.80.51 | OK |
| SSL cert (Let's Encrypt) | ✅ Có | Cần verify auto-renew |
| Nginx HTTPS | ✅ Running 443 | **3 vấn đề cần sửa** (xem bên dưới) |
| Firewall | ✅ Đầy đủ | Tất cả port cần thiết đã mở |

**3 vấn đề Nginx config cần sửa:**

1. **`/api/` proxy sai** → đang trỏ tới `127.0.0.1:3001` (Identity Service trực tiếp) — cần trỏ tới `127.0.0.1:8000` (Kong API Gateway)
2. **Thiếu `/wss-sip/`** proxy → Kamailio WSS port 5066 (SIP.js cần)
3. **WebSocket `/ws/`** thiếu → cần proxy chung cho các Socket.IO namespaces qua Kong hoặc trực tiếp

#### F. GoACD

Chưa chạy trên server (chưa build Docker image, chưa có DB `goacd`).

---

### THỨ TỰ THỰC HIỆN ĐỂ ĐẠT PRODUCTION READY

**Nguyên tắc:** Sprint 8 (DB) PHẢI chạy TRƯỚC Sprint 7 (HTTPS) vì:
- Services không start được nếu thiếu DB/tables
- HTTPS deployment vô nghĩa nếu backend services không chạy
- Seed data cần có trước khi test end-to-end

```
Phase A: DATABASE FOUNDATION (Sprint 8 — chạy trước)
  ├─ A1: Fix DB names + tạo DB thiếu
  ├─ A2: Chạy schema.sql cho 14 DB rỗng
  ├─ A3: Seed data cho voice services (agent, routing, CTI, channel-gateway)
  ├─ A4: Seed data cho supporting services (customer, knowledge, ticket)
  ├─ A5: Tạo Kafka topics thiếu
  ├─ A6: Start tất cả 13 services đang tắt → verify không crash
  └─ A7: Test DB connections toàn bộ

Phase B: NGINX & HTTPS FIX (Sprint 7 — chạy sau Phase A)
  ├─ B1: Sửa Nginx config (/api/ → Kong 8000, thêm /wss-sip/)
  ├─ B2: Cập nhật frontend env (VITE_API_BASE_URL, VITE_WS_URL)
  ├─ B3: Test HTTPS frontend + API qua Kong
  ├─ B4: Test WebSocket qua HTTPS
  └─ B5: Test SIP.js WSS registration

Phase C: END-TO-END VOICE TEST (sau Phase A+B)
  ├─ C1: SIP.js register qua wss://nextgen.omicx.vn/wss-sip/
  ├─ C2: Inbound call test (PSTN → IVR → agent ring → answer)
  ├─ C3: Outbound call test (click-to-call)
  └─ C4: Full voice features (hold, transfer, recording)
```

---

### Sprint 9: PRODUCTION READINESS EXECUTION (thực hiện theo thứ tự)

**Mục tiêu:** Thực hiện Sprint 8 + Sprint 7 theo đúng thứ tự, đảm bảo mọi thứ PASS.

#### Phase A — DATABASE FOUNDATION (ưu tiên #1)

| # | Task | Chi tiết | Verify |
|---|---|---|---|
| A1 | **Fix DB names** | Tạo 3 DB thiếu: `CREATE DATABASE bfsi_db; CREATE DATABASE enrichment_db; CREATE DATABASE goacd;` — Hoặc sửa service config cho khớp tên hiện có | `\l` liệt kê đủ DB |
| A2 | **Chạy schema.sql cho 14 DB rỗng** | Loop `run-sql-migrations.sh` — target: customer_db, ticket_db, notification_db, knowledge_db, bfsi_db, ai_db, media_db, audit_db, object_schema_db, layout_db, workflow_db, dashboard_db, report_db, data_enrichment_db/enrichment_db | Mỗi DB có tables (>0) |
| A3 | **Seed voice-critical data** | Chạy seed cho: agent_db (5 profiles, 3 groups, 8 skills, channel status), routing_engine_db (3 queues, rules), channel_gateway_db (voice config), cti_db (verify config) | `SELECT COUNT(*)` > 0 |
| A4 | **Seed supporting data** | customer_db (10 customers), knowledge_db (5 articles), ticket_db (sample tickets nếu cần) | Đủ data cho frontend hiển thị |
| A5 | **Tạo 7 Kafka topics thiếu** | `agent.login`, `agent.logout`, `agent.status_changed`, `agent.created`, `notification.created`, `channel.outbound`, `cdr.updated` | `--list` hiển thị 14 topics |
| A6 | **Start Docker containers đã tắt** | `docker start tpb-elasticsearch tpb-seaweedfs` (cần cho media/search). Temporal/Superset/Kibana/MailHog tuỳ chọn | `docker ps` healthy |
| A7 | **Start 13 NestJS services còn tắt** | Build + start: customer, notification, knowledge, bfsi-core, ai, media, audit, object-schema, layout, workflow, data-enrichment, dashboard, report | Tất cả 19 services running |
| A8 | **Verify toàn bộ** | Chạy `test-db-connections.sh` + health check từng service | 19/19 PASS |

#### Phase B — NGINX & HTTPS (sau Phase A pass)

| # | Task | Chi tiết | Verify |
|---|---|---|---|
| B1 | **Sửa Nginx `/api/`** | Đổi `proxy_pass` từ `http://127.0.0.1:3001` → `http://127.0.0.1:8000` (Kong). Thêm header `X-Forwarded-Proto` | `curl https://nextgen.omicx.vn/api/` → Kong response |
| B2 | **Thêm `/wss-sip/`** | Thêm location block: `proxy_pass http://127.0.0.1:5066;` với WebSocket upgrade headers | SIP.js connect test |
| B3 | **Thêm `/ws/` chung** | Proxy WebSocket cho agent/CTI/notification namespaces | Socket.IO connect |
| B4 | **Kong routes setup** | Chạy `setup-kong-all.sh` — đảm bảo tất cả 19 services có route trong Kong | `curl http://localhost:8001/routes` liệt kê routes |
| B5 | **Kong CORS** | Thêm CORS plugin cho origin `https://nextgen.omicx.vn` | Browser console không có CORS error |
| B6 | **Frontend env** | Tạo `.env.production`: `VITE_API_BASE_URL=https://nextgen.omicx.vn/api`, `VITE_WS_URL=wss://nextgen.omicx.vn/ws`, `VITE_CTI_WS_URL=wss://nextgen.omicx.vn/cti` | Build thành công |
| B7 | **Frontend build or dev** | `npm run build` → serve static qua Nginx, HOẶC tiếp tục dùng Vite dev (port 3004) | `https://nextgen.omicx.vn` load OK |
| B8 | **Test HTTPS toàn diện** | (1) Frontend load no errors (2) API calls work (3) WebSocket connect (4) No mixed content | Browser DevTools clean |

#### Phase C — VOICE E2E TEST (sau Phase A+B pass)

| # | Task | Chi tiết | Verify |
|---|---|---|---|
| C1 | **SIP.js WSS register** | Từ browser `https://nextgen.omicx.vn`, login, verify SIP.js registers qua WSS | Console: "Registered" |
| C2 | **Inbound call** | Gọi từ softphone/PSTN → Kamailio → FreeSWITCH → GoACD IVR → agent ring → answer | Audio 2 chiều |
| C3 | **Outbound call** | Click-to-call từ Agent Desktop → dial → customer answer | Audio 2 chiều |
| C4 | **Voice features** | Hold, mute, blind transfer, attended transfer, recording playback | Tất cả hoạt động |
| C5 | **TURN test** | Test từ mạng khác (4G, VPN) → verify TURN relay hoạt động | Call từ 4G thành công |

---

### Sprint 9 Done ✓

**Phase A (DB) — COMPLETED 2026-03-18:**
- [x] 26 DB tồn tại (19 gốc + 3 alias + 3 mới + kong) ✅
- [x] 21/21 service DB có tables (schema.sql đã chạy) ✅
- [x] agent_db: 5 profiles, 3 groups, 8 skills, 5 channel_status ✅
- [x] routing_engine_db: 4 queues, 4 rules ✅
- [x] channel_gateway_db: 1 voice config ✅
- [x] customer_db: 10 customers ✅
- [x] knowledge_db: 3 folders, 5 articles ✅
- [x] identity_db: 7 users, 4 roles ✅
- [x] Kafka: 14/14 topics ✅
- [x] 19/19 NestJS services running (3 có EntityMetadata warning — non-blocking) ✅
- [x] Redis: PONG ✅
- [x] UFW: Docker bridge traffic allowed ✅

**Phase B (HTTPS) — COMPLETED 2026-03-18:**
- [x] `https://nextgen.omicx.vn/` → Frontend loads (200) ✅
- [x] `https://nextgen.omicx.vn/api/v1/auth/login` → Kong → Identity → JWT token ✅
- [x] `https://nextgen.omicx.vn/api/v1/agents` → Kong → Agent Service → 5 agents ✅
- [x] `https://nextgen.omicx.vn/api/v1/customers` → Kong → Customer Service → 10 customers ✅
- [x] Nginx: `/api/` → Kong:8000, `/wss-sip/` → Kamailio:5066, `/socket.io/` → CTI:3019 ✅
- [x] Kamailio WSS :5066 listening (WebSocket + nathelper + rtpengine) ✅
- [x] Kong CORS plugin: origin `https://nextgen.omicx.vn` ✅
- [x] Vite `allowedHosts: ['nextgen.omicx.vn']` ✅

**Fixes applied:**
- `init-db.sh` gap: created `bfsi_db`, `enrichment_db`, `goacd` databases
- 15 schema.sql executed for empty databases
- Nginx `/api/` fixed: 3001 (identity only) → 8000 (Kong gateway)
- Nginx `/wss-sip/` added for Kamailio WebSocket
- Kamailio: added `websocket.so`, `xhttp.so`, `nathelper.so`, `sdpops.so` modules
- Kamailio: WS listen on 127.0.0.1:5066 (Nginx proxies WSS→WS)
- UFW: allowed Docker bridge 172.16.0.0/12 → host (was blocking Kong→services)
- Vite: `allowedHosts` added for `nextgen.omicx.vn`

**Phase C (Voice) — PENDING manual browser test:**
- [ ] SIP.js register via `wss://nextgen.omicx.vn/wss-sip/` thành công
- [ ] Inbound call → answer → audio OK
- [ ] Outbound call → audio OK
- [ ] Hold, transfer, mute → hoạt động
- [ ] TURN relay → call từ 4G OK

**Phase A + B: PASS. Phase C: cần test thủ công trên browser.**

---

## 9. Rủi ro & Giảm thiểu

| # | Rủi ro | Xác suất | Ảnh hưởng | Giảm thiểu |
|---|---|---|---|---|
| 1 | **GoACD effort lớn (15-20 ngày)** | Cao | Cao | Sprint 3 dài 3 tuần; MVP trước (basic queue), advanced features (attended transfer) ở Sprint 6; có thể dùng mod_callcenter tạm |
| 2 | **Thiếu Go developer** | Trung bình | Cao | GoACD isolated behind gRPC — có thể outsource/contract; NestJS team không cần biết Go |
| 3 | **WebRTC NAT issues** | Trung bình | Cao | coturn TURN server từ Sprint 1; rtpengine handles SRTP↔RTP; test trong corporate firewall sớm |
| 4 | **Kamailio config phức tạp** | Trung bình | Trung bình | dSIPRouter GUI giảm complexity; config đã có sẵn trong tài liệu [18-2a-kamailio-config.md](./18-voice-platform/18-2a-kamailio-config.md) |
| 5 | **ESL connection drops** | Thấp | Cao | Auto-reconnect trong GoACD; calls in progress survive brief ESL disconnects; FS process monitor |
| 6 | **Kafka chưa quen** | Trung bình | Trung bình | Shared module abstract complexity; Kafka UI để debug; single-broker đủ cho dev |
| 7 | **Sprint 2 quá nhiều tasks** | Trung bình | Trung bình | Ưu tiên M4 (Agent State) + M5 (Interaction) trước; M7 (Routing) có thể simplified scoring ban đầu |
| 8 | **Mixed content / CORS trên HTTPS** | Trung bình | Cao | Nginx proxy tất cả qua 1 domain (nextgen.omicx.vn) — tránh cross-origin; Kong CORS plugin whitelist domain |
| 9 | **Firewall block WebRTC media** | Cao | Cao | TURN/TURNS (coturn) relay khi direct P2P bị block; test từ nhiều network (4G, corporate, home) |
| 10 | **Let's Encrypt cert renewal failure** | Thấp | Cao | Cron job certbot renew; monitor cert expiry; Nginx reload post-renewal |
| 11 | **DB tên không khớp → service crash khi start** | Cao | Cao | Sprint 8 S8.1 sửa init-db.sh; test-db-connections.sh verify trước khi start services |
| 12 | **synchronize: true tạo schema sai trên production** | Trung bình | Cao | Sprint 8 S8.15 thống nhất dùng env var TYPEORM_SYNCHRONIZE; production luôn = false |
| 13 | **Seed data thiếu → service lỗi runtime** | Trung bình | Trung bình | seed-voice.sql + seed-all-services.sql tạo đủ dữ liệu cấu hình tối thiểu |

---

## 10. Tài liệu tham chiếu theo Sprint

| Sprint | Files cần đọc trước khi code |
|---|---|
| **Sprint 1** | [18-15-docker-infra.md](./18-voice-platform/18-15-docker-infra.md), [18-2a-kamailio-config.md](./18-voice-platform/18-2a-kamailio-config.md), [18-2b-rtpengine-config.md](./18-voice-platform/18-2b-rtpengine-config.md), [18-2c-freeswitch-config.md](./18-voice-platform/18-2c-freeswitch-config.md), [appendix-d-docker-ports.md](./appendix/appendix-d-docker-ports.md) |
| **Sprint 2** | [08-agent-state-management.md](./08-agent-state-management.md), [07-routing-engine.md](./07-routing-engine.md), [06-channel-adapter-architecture.md](./06-channel-adapter-architecture.md), [05-new-services.md](./05-new-services.md), [11-type-system.md](./11-type-system.md) |
| **Sprint 3** | [18-4-goacd-architecture.md](./18-voice-platform/18-4-goacd-architecture.md), [18-5-call-flows.md](./18-voice-platform/18-5-call-flows.md), [18-6-ivr-architecture.md](./18-voice-platform/18-6-ivr-architecture.md), [18-7-agent-state-antisync.md](./18-voice-platform/18-7-agent-state-antisync.md), [18-3-acd-evaluation.md](./18-voice-platform/18-3-acd-evaluation.md) |
| **Sprint 4** | [18-9-sync-architecture.md](./18-voice-platform/18-9-sync-architecture.md), [18-11-event-pipeline.md](./18-voice-platform/18-11-event-pipeline.md), [18-12-data-mapping.md](./18-voice-platform/18-12-data-mapping.md) |
| **Sprint 5** | [18-10-webrtc.md](./18-voice-platform/18-10-webrtc.md), [14-frontend-changes.md](./14-frontend-changes.md) |
| **Sprint 6** | [18-5-call-flows.md §18.5.4](./18-voice-platform/18-5-call-flows.md) (transfer), [18-13-error-resilience.md](./18-voice-platform/18-13-error-resilience.md), [18-14-performance-ops.md](./18-voice-platform/18-14-performance-ops.md) |
| **Sprint 7** | [18-10-webrtc.md](./18-voice-platform/18-10-webrtc.md) (SIP.js WSS config), [18-15-docker-infra.md](./18-voice-platform/18-15-docker-infra.md) (Docker/infra), [appendix-d-docker-ports.md](./appendix/appendix-d-docker-ports.md) (port mapping) |
| **Sprint 8** | `infra/scripts/init-db.sh`, `infra/scripts/run-sql-migrations.sh`, `infra/scripts/seed-all.sh`, tất cả `services/*/src/app/app.module.ts` (TypeORM config), tất cả `services/*/src/migrations/schema.sql` |
| **Sprint 9** | Kết hợp Sprint 7 + Sprint 8 + Voice E2E — xem section "THỨ TỰ THỰC HIỆN ĐỂ ĐẠT PRODUCTION READY" |

---

## Ghi chú triển khai cho AI Agent (Claude Code)

Khi triển khai từng Sprint, AI agent nên:

1. **Đọc file tham chiếu** trong bảng Section 10 trước khi viết code
2. **Đọc file hiện tại** của service cần sửa (dùng Explore agent nếu cần)
3. **Tuân thủ coding conventions** trong `CLAUDE.md`:
   - TypeScript strict mode
   - Repository pattern (không gọi EntityManager trực tiếp)
   - `@Roles()` decorator trên mọi controller method
   - DTOs dùng `class-validator`
   - Kafka event trên mọi mutation
4. **Không sửa** các component UI trong `src/components/ui/` (shadcn primitives)
5. **Test trước commit**: unit test cho business logic, integration test cho API endpoints
6. **Voice-specific**: GoACD là Go project riêng, communicate via gRPC — không mix Go code vào NestJS monorepo
