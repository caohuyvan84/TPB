# Voice Channel Implementation Plan — Chi tiết triển khai

> **Ưu tiên:** Hoàn thiện kênh Voice trước, bao gồm hạ tầng và code các module còn thiếu.
> **Ngày tạo:** 2026-03-17
> **Cập nhật lần cuối:** 2026-03-18
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
```

**Tổng: ~12 tuần** (tương đương Phase 1 trong implementation plan gốc nhưng focus 100% voice)

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
| S4.1 | CTI Adapter — implement `FreeSwitchAdapter`: gRPC client to GoACD, implement all ICtiAdapter methods via gRPC calls | M8 | 2d | `answerCall`, `hangupCall`, `holdCall`, `transferCall`, `makeCall` working |
| S4.2 | CTI Adapter — WebSocket gateway for call events: subscribe GoACD events (gRPC stream), broadcast to Agent Desktop | M8 | 2d | `call:incoming`, `call:answered`, `call:ended` events to frontend |
| S4.3 | CTI Adapter — WebRTC credential provisioning: endpoint `GET /cti/webrtc/credentials` → GoACD gRPC `GetSIPCredentials` | M8 | 1d | Frontend gets wsUri, sipUri, ephemeral token, ICE servers |
| S4.4 | CTI Adapter — CDR consumer: subscribe `cdr.created` Kafka topic, store in DB, link to Interaction | M8 | 1d | CDR persisted, linked to interaction |
| S4.5 | Channel Gateway — register `FreeSwitchAdapter`, wire voice inbound flow: GoACD → Kafka → Gateway → Routing Engine | M6 | 1d | Voice ChannelMessage normalized and routed |
| S4.6 | Routing Engine — consume voice `channel.inbound`, create Interaction (MS-3), assign agent, publish events | M7 | 1d | End-to-end: call in → interaction created → agent assigned |
| S4.7 | Agent Service — consume `interaction.assigned` → update Redis capacity (voice_count++), broadcast via WS | M4 | 1d | Agent state reflects active call |
| S4.8 | Event pipeline test: GoACD call event → Kafka → CTI Adapter → WebSocket → Frontend `ctiChannel` | M2 | 1d | Real-time event delivery verified |

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
| S5.1 | Install SIP.js, create `WebRtcService` class: register to Kamailio WSS, handle incoming/outgoing calls | M11 | 2d | SIP.js registers, green icon |
| S5.2 | `WebRtcService` — audio device management: microphone/speaker selection, echo cancellation | M11 | 1d | Device selector working |
| S5.3 | `WebRtcService` — credential flow: fetch from `/cti/webrtc/credentials`, auto-refresh token before expiry | M11 | 1d | Auto re-register on token refresh |
| S5.4 | Integrate SIP.js with `CallContext.tsx`: `startCall()` → SIP.js INVITE, incoming → `showCallWidget()`, `endCall()` → BYE | M12 | 2d | CallContext drives SIP.js |
| S5.5 | Update `FloatingCallWidget.tsx`: real call timer, actual mute/hold/transfer buttons wired to SIP.js + CTI API | M12 | 1d | Widget shows real call state |
| S5.6 | Update `TransferCallDialog.tsx`: blind transfer, transfer to queue, transfer to external — call CTI API | M12 | 1d | Transfer works end-to-end |
| S5.7 | Wire `ctiChannel` (WebSocket) call events to update CallContext: `call:incoming` → ring notification, `call:ended` → cleanup | M12 | 1d | Call events update UI in real-time |
| S5.8 | Update `InteractionList.tsx`: show active voice interactions (from WebSocket), call state badges | M12 | 1d | Voice interactions in left panel |
| S5.9 | Call metadata pre-push: when call comes in, show customer info BEFORE agent answers (from GoACD pre-push) | M12 | 1d | Customer name/account shown on ring |

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
| S6.1 | GoACD — attended transfer: consult → complete/cancel/conference | M9 | 2d | Attended transfer flow working |
| S6.2 | GoACD — call recording: `record_session` via ESL, store to SeaweedFS, link to CDR | M9 | 1d | Recordings accessible via URL |
| S6.3 | GoACD — anti-desync: SIP registration tracking, periodic reconciliation (2 min), stale claim reaper | M9 | 1d | Agent state consistent after crashes |
| S6.4 | GoACD — outbound call: agent click-to-call, atomic claim → originate → bridge | M9 | 1d | Outbound calls working |
| S6.5 | Frontend — call recording player: `CallRecordingPlayer.tsx` with real playback URL | M12 | 0.5d | Recording playback in UI |
| S6.6 | Frontend — multi-tab SIP protection: BroadcastChannel API, only 1 tab registers SIP | M11 | 0.5d | No duplicate registrations |
| S6.7 | E2E test: inbound call → IVR → queue → agent answer → hold → transfer → hang up → CDR → recording | All | 2d | Full lifecycle verified |
| S6.8 | E2E test: outbound call → dial → answer → conversation → hang up → CDR | All | 1d | Outbound verified |
| S6.9 | Load test: 50 concurrent calls, verify no resource leaks | All | 1d | Stable under load |

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
```

**Critical Path:** M1 → M9 → M8 → M11 → E2E Tests

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

### Sprint 4 Done ✓
- [ ] `FreeSwitchAdapter` call `answerCall()` → GoACD gRPC → FreeSWITCH answer
- [ ] `GET /cti/webrtc/credentials` trả về wsUri, sipUri, token, ICE servers
- [ ] Call event pipeline: GoACD → Kafka → CTI WS Gateway → browser Socket.IO
- [ ] CDR stored in DB, linked to Interaction
- [ ] Agent capacity updated (voice_count) on call assign/complete

### Sprint 5 Done ✓
- [ ] Agent Desktop: SIP.js registers to Kamailio WSS → green status icon
- [ ] Incoming call → ring notification → click Answer → voice connected
- [ ] Outbound click-to-call → dial → connected
- [ ] FloatingCallWidget: timer, mute, hold buttons working
- [ ] Transfer dialog: blind transfer to agent/queue/external
- [ ] Customer info pre-pushed before answer

### Sprint 6 Done ✓
- [ ] Attended transfer full lifecycle (consult → complete/cancel)
- [ ] Call recording: playable in `CallRecordingPlayer`
- [ ] Anti-desync: kill agent browser → agent marked not-ready within 90s
- [ ] Multi-tab: only 1 tab holds SIP registration
- [ ] E2E inbound test pass
- [ ] E2E outbound test pass
- [ ] 50 concurrent calls stable for 10 minutes

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
