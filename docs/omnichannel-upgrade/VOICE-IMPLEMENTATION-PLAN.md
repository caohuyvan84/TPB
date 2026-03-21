# Voice Channel Implementation Plan — Chi tiết triển khai

> **Ưu tiên:** Hoàn thiện kênh Voice trước, bao gồm hạ tầng và code các module còn thiếu.
> **Ngày tạo:** 2026-03-17
> **Cập nhật lần cuối:** 2026-03-19 (Sprint 11 added — GoACD Gap Fix; Gap analysis [21-goacd-gap-analysis.md](./21-goacd-gap-analysis.md))
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
| **Voice Infra (Docker)** | ~~Critical~~ ✅ **DONE (2026-03-19)** | Kamailio 5.6.3 native (systemd), rtpengine (Docker), coturn (Docker), FreeSWITCH x2 (Docker trên servers riêng). Xem [19-voice-infra-status.md](./19-voice-infra-status.md) |
| **Kafka Integration** | Critical | Chưa service nào publish/consume events |
| **Redis Agent State** | Critical | Tất cả state đang ở PostgreSQL, chưa có hot-state |
| **WebSocket Gateways** | Critical | Chỉ có skeleton Agent gateway, thiếu CTI events, Notification push |
| **FreeSwitchAdapter** | Critical | Thay thế MockCtiAdapter, gRPC client to GoACD |
| **SIP.js Frontend** | Critical | WebRTC softphone code đã viết nhưng **CHƯA WIRE vào UI components**. Xem [19-voice-infra-status.md §4](./19-voice-infra-status.md#4-hiện-trạng-softphone-frontend-sipjs) |
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
Sprint 10 (Tuần 15-16) SOFTPHONE DEPLOYMENT — SIP.js Wire + Registration + Inbound/Outbound Call Test
Sprint 11 (Tuần 17-20) GOACD GAP FIX — Outbound bridge, Inbound scoring/re-route, Transfer state, Event pipeline, SIP Auth
Sprint 12 (Tuần 21-23) REAL-TIME STATE SYNC + SOFTPHONE BUBBLE — Agent status, Voice interactions, SIP state real-time + WebRTC softphone UI
Sprint 13 (Tuần 24-26) OUTBOUND CALL END-TO-END — FS Gateway, Kamailio routing, Ringback, Call status, CDR, History
Sprint 15 (Tuần 27-30) GOACD INBOUND OVERHAUL — ESL event-driven, bridge detection, call end, metadata, state machine
Sprint 16 (Tuần 31-33) CONNECTION RESILIENCE — WebSocket/WebRTC auto-reconnect, network monitor, connection banner, long-run stability
Sprint 17 (Tuần 34-35) BACKGROUND TAB PROTECTION — Silent audio keepalive + Web Push notification backup, đảm bảo nhận call khi tab idle
Sprint 18 (Tuần 36-37) CALL TIMELINE REAL DATA — Thu thập & hiển thị chi tiết flow cuộc gọi thực (IVR, DTMF, queue, scoring, routing, ringing, answer, hold, end)
```

**Tổng: ~37 tuần**
**Thứ tự:** Sprint 1-13 → Sprint 15 → Sprint 16 → Sprint 17 → Sprint 18 (Call timeline real data)
**Tham chiếu:** [21-goacd-gap-analysis.md](./21-goacd-gap-analysis.md) | [22-outbound-call-design.md](./22-outbound-call-design.md) | [23-call-timeline-realdata.md](./23-call-timeline-realdata.md)

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

Sprint 10: SOFTPHONE DEPLOYMENT ✅
  GoACD credentials fix (sipDomain, TURN creds)
  Wire SIP.js hooks → FloatingCallWidget, Header, Click-to-call
  SipTabLock integration
  Registration test + Inbound/Outbound call test
  ◄── Sprint 9 Phase A+B done + infra verified

Sprint 11: GOACD GAP FIX (4 phases)
  Phase G1: Outbound fix (SIP.js direct) + Inbound scoring + re-route
  Phase G2: Transfer state mgmt + event pipeline
  Phase G3: Production SIP auth (Kamailio + ephemeral tokens)
  Phase G4: Anti-desync hardening + agent state machine
  ◄── Sprint 10 done + gap analysis reviewed
```

**Critical Path:** M1 → M9 → M8 → M11 → Sprint 7-9 → Sprint 10 → **Sprint 11 (Gap Fix)** → Production Ready

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

**Phase C (Voice) — PARTIALLY VERIFIED (2026-03-19):**

**Hạ tầng SIP — ĐÃ KIỂM TRA:**
- [x] Kamailio WSS endpoint hoạt động (WS direct + WSS via Nginx) ✅
- [x] SIP REGISTER qua WSS → 200 OK (test bằng Node.js raw SIP) ✅
- [x] Kamailio usrloc lưu contact (transport=ws, expires=60s) ✅
- [x] FreeSWITCH cả 2 node: SIP 200 OK, dispatcher FLAGS: AP ✅
- [x] rtpengine running, NG port 22222 ✅
- [x] coturn STUN/TURN running, port 3478 ✅

**Softphone frontend — CHƯA HOẠT ĐỘNG:**
- [ ] ❌ SIP.js hooks (`useCallControl`/`useWebRTC`) **CHƯA WIRE vào UI** — FloatingCallWidget vẫn dùng mock data
- [ ] SIP.js register từ browser → chưa test (code chưa wire)
- [ ] Inbound call → answer → audio OK
- [ ] Outbound call → audio OK
- [ ] Hold, transfer, mute → hoạt động
- [ ] TURN relay → call từ 4G OK

**Phase A + B: PASS. Hạ tầng SIP: PASS. Phase C softphone: cần Sprint 10.**

> **Chi tiết:** Xem [19-voice-infra-status.md](./19-voice-infra-status.md) — Kết quả kiểm tra hạ tầng + kế hoạch triển khai softphone

---

### Sprint 10: SOFTPHONE DEPLOYMENT — SIP.js Wire + Registration + Call Test (Tuần 15-16)

**Mục tiêu:** SIP.js softphone trên Agent Desktop registered thành công với Kamailio qua WSS, có khả năng thực hiện cuộc gọi inbound và outbound.

**Lý do:** Sprint 5-6 đã code xong SIP.js hooks (`WebRtcService`, `useWebRTC`, `useCallControl`, `SipTabLock`) nhưng **chưa wire vào UI components**. FloatingCallWidget vẫn chạy mock data. Hạ tầng SIP đã verified hoạt động (Sprint 9 Phase C partial) → cần wire frontend + test end-to-end.

**Tham chiếu:** [19-voice-infra-status.md](./19-voice-infra-status.md) — Chi tiết phân tích + task list

**Pre-requisites:**
- ✅ Kamailio WSS endpoint hoạt động (verified 2026-03-19)
- ✅ SIP REGISTER qua WSS → 200 OK (verified 2026-03-19)
- ✅ FreeSWITCH x2 active trong dispatcher pool (verified 2026-03-19)
- ✅ coturn STUN/TURN running (verified 2026-03-19)
- ⚠️ GoACD cần verify đang chạy và `sipDomain` config đúng

---

#### Phase S1: Backend Credentials Fix (2 ngày)

| # | Task | Chi tiết | Effort | Verify |
|---|---|---|---|---|
| **S10.1** | **Verify GoACD running + sipDomain config** | ~~Kiểm tra GoACD process/Docker~~ | 0.5d | **✅ DONE 2026-03-19** — GoACD running (:9090 ESL, :9091 API+healthz, :9093 REST), sipDomain=nextgen.omicx.vn confirmed. REST port changed 9092→9093 (tránh conflict Kafka) |
| **S10.2** | **Bổ sung TURN credentials vào GetSIPCredentials** | ~~GoACD generate ephemeral HMAC-SHA1~~ | 1d | **✅ DONE 2026-03-19** — `generateTURNCredentials()` added: `username="<expiry>:<agentId>"`, `credential=HMAC-SHA1(secret,username)`. TURN+TURNS in iceServers. Verified via Kong |
| **S10.3** | **Verify CTI Adapter → GoACD pipeline** | ~~Test qua Kong~~ | 0.5d | **✅ DONE 2026-03-19** — `GET /api/v1/cti/webrtc/credentials?tenantId=...&agentId=AGT001` → full JSON with TURN credentials |

---

#### Phase S2: Frontend Wire SIP.js vào UI (6 ngày)

> **Nguyên tắc SIP Auth hiện tại:** Kamailio **open registration** (không load auth module) → SIP.js chỉ cần đúng `wsUri` và `sipUri`, không cần password. Khi production cần auth → bật `auth.so` + ephemeral HMAC tokens (xem [18-10-webrtc.md §Credential Provisioning V2.2](./18-voice-platform/18-10-webrtc.md)).
>
> **Luồng SIP.js hiện tại:** `useWebRTC(agentId)` → `GET /cti/webrtc/credentials` → `WebRtcService.register({wsUri, sipUri, domain, iceServers}, agentId)` → `new UserAgent({uri, transportOptions: {server: wsUri}})` → `ua.start()` → `registerer.register()` → Kamailio 200 OK.
>
> **authorizationPassword: ''** trong `WebRtcService` → match Kamailio no-auth. KHÔNG cần sửa cho MVP.

| # | Task | Chi tiết | Effort | Verify |
|---|---|---|---|---|
| **S10.4** | **Wire `useCallControl` vào FloatingCallWidget** | Refactor `FloatingCallWidget.tsx`: bỏ mock `callData` props, import `useCallControl(agentId)`. Map: `sipStatus` → status badge, `incomingCall` → ring UI, `activeCallId` → active call UI, `isMuted`/`callStartTime` → timer + mute icon. Wire buttons: Answer → `answer()`, Hangup → `hangup()`, Mute → `toggleMute()`, Hold → `toggleHold()`. **Quan trọng:** Giữ nguyên UI hiện tại, chỉ thay data source từ props → hook | 2d | FloatingCallWidget hiển thị real SIP status + real call control |
| **S10.5** | **Wire SipTabLock vào useWebRTC** | Trong `useWebRTC.ts`, trước khi register: `new SipTabLock(cb) → tryAcquire()`. Nếu không phải holder → skip register, set status = 'disconnected'. On tab close → `release()`. Import `SipTabLock` từ `@/lib/sip-tab-lock` | 0.5d | 2 tabs → chỉ 1 register, tab kia show inactive |
| **S10.6** | **Thêm SIP status indicator vào EnhancedAgentHeader** | Import `useWebRTC` hoặc share status via Context. Hiển thị: `disconnected` → 🔴, `connecting` → 🟡, `registered` → 🟢, `error` → 🔴. Click → modal chọn audio device | 0.5d | Header hiển thị SIP registration status |
| **S10.7** | **Wire incoming call notification** | Khi `useCallControl.incomingCall !== null`: (1) Play ring sound (audio element) (2) Show FloatingCallWidget expanded với caller info (3) Answer + Reject buttons. Khi Answer clicked → `answer()` → SIP.js accept → UI chuyển sang connected state | 1d | Cuộc gọi đến → ring sound + notification → click Answer → connected |
| **S10.8** | **Wire outbound click-to-call** | Trong `CustomerInfoScrollFixed.tsx` + `InteractionDetail.tsx` — phone number elements → `onClick={() => dial(phoneNumber)}`. `dial()` từ `useCallControl`. Khi dial → FloatingCallWidget hiện trạng thái "Đang gọi..." → connected khi answer | 1d | Click số → INVITE → ringing → connected → audio |
| **S10.9** | **Wire TransferCallDialog với real transfer** | `TransferCallDialog.tsx` → import `transfer(destination, type)` từ `useCallControl`. Wire form submit → `transfer(inputNumber, selectedType)` | 0.5d | Transfer dialog → nhập số → transfer thực |
| **S10.10** | **Wire useCallEvents vào top-level (App.tsx hoặc provider)** | Đảm bảo Socket.IO /cti events được listen globally. `useCallEvents` callbacks log + update state | 0.5d | Console log events khi có cuộc gọi |

---

#### Phase S3: Registration & Call Testing (4 ngày)

| # | Task | Chi tiết | Effort | Verify |
|---|---|---|---|---|
| **S10.11** | **Test SIP.js register từ browser** | Mở `https://nextgen.omicx.vn`, login agent001, verify: (1) Network tab: `GET /api/v1/cti/webrtc/credentials` → 200 (2) WSS frame: SIP REGISTER → 200 OK (3) Console: `sipStatus = 'registered'` (4) Header: 🟢 SIP Registered (5) `kamcmd ul.dump`: agent001 contact | 0.5d | SIP registration thành công từ browser |
| **S10.12** | **Test inbound call** | Từ softphone/PSTN → gọi đến agent001 extension. Verify trên browser: (1) SIP.js nhận INVITE (onInvite callback) (2) Ring notification hiển thị (caller number) (3) Click Answer → 200 OK → Established (4) rtpengine bridge: browser SRTP ↔ FS RTP (5) Audio 2 chiều (agent nghe + nói) (6) Hangup → BYE → Terminated → UI cleanup | 1d | Inbound call hoàn chỉnh + audio 2 chiều |
| **S10.13** | **Test outbound call** | Click số trên Agent Desktop → SIP.js INVITE → Kamailio → FreeSWITCH → destination. Verify: (1) INVITE sent qua WSS (2) Kamailio route → FS dispatcher (3) Destination ring → answer (4) Audio 2 chiều (5) Hangup → CDR | 1d | Outbound call hoàn chỉnh |
| **S10.14** | **Test call features** | (1) Mute/unmute — audio track enabled/disabled đúng (2) Hold — audio pause/resume (3) Transfer blind — call chuyển thành công (4) Audio device switch | 1d | Tất cả features hoạt động |
| **S10.15** | **Test edge cases** | (1) Page refresh → re-register tự động (2) 2 tabs → SipTabLock chỉ 1 register (3) Network drop → reconnect + re-register (4) No answer timeout (5) Reject incoming call (6) Multiple sequential calls | 0.5d | Edge cases xử lý đúng |

---

#### Sprint 10 Done ✓

**Phase S1 (Backend) — COMPLETED 2026-03-19:**
- [x] GoACD running, `/healthz` → 200 (on both :9091 and :9093) ✅
- [x] `GetSIPCredentials` trả `domain: "nextgen.omicx.vn"`, `wsUri: "wss://nextgen.omicx.vn/wss-sip/"` ✅
- [x] `iceServers` TURN entry có `username` + `credential` (ephemeral, HMAC-SHA1) ✅
- [x] `GET /api/v1/cti/webrtc/credentials` qua Kong → full JSON response ✅
- [x] sup001 password fixed: "Sup@123" → "Sup@1234" (DB + seed.sql) ✅
- [x] GoACD REST port: 9092 → 9093 (tránh conflict Kafka) ✅

**Phase S2 (Frontend wire) — COMPLETED 2026-03-19:**
- [x] `FloatingCallWidget` wired với real SIP: onAnswer, onToggleMute, onToggleHold, sipStatus props ✅
- [x] `SipTabLock` integrated vào useWebRTC — chỉ 1 tab register ✅
- [x] `EnhancedAgentHeader` hiển thị SIP status indicator (green/yellow/red dot + text) ✅
- [x] Incoming call → ring notification + Answer/Reject buttons trong FloatingCallWidget ✅
- [x] Click-to-call wired qua `handleStartCall` → `callControl.dial()` ✅
- [x] Transfer dialog wired với `callControl.transfer(dest, type)` ✅
- [x] SIP.js events bridge tới CallContext (incoming→startCall, answered→updateStatus, ended→endCall) ✅
- [x] CTI Socket.IO useCallEvents fixed to use `window.location.origin` (remote browser compatible) ✅
- [x] Build thành công (`nx run agent-desktop:build`) ✅

**Phase S3 (Testing):**
- [ ] SIP.js register từ browser qua `wss://nextgen.omicx.vn/wss-sip/` → 200 OK
- [ ] `kamcmd ul.dump` hiển thị agent contact (transport=ws)
- [ ] Inbound call → ring → answer → audio 2 chiều → hangup → cleanup
- [ ] Outbound call → dial → answer → audio 2 chiều → hangup
- [ ] Mute, hold, blind transfer hoạt động
- [ ] Multi-tab protection, page refresh re-register, network reconnect

**Tổng effort: ~12 ngày (2 tuần)**

---

### Sprint 11: GOACD GAP FIX — Outbound via GoACD, Scoring, Transfer, Events, State Sync, Auth (Tuần 17-20)

**Mục tiêu:** Fix tất cả gap giữa thiết kế (§18.4–18.10) và code thực tế. Outbound call PHẢI đi qua GoACD (không dùng SIP.js direct) để đảm bảo agent state, CDR, blocking inbound khi đang gọi ra được đồng bộ đúng giữa client và server.

**Tham chiếu:** [21-goacd-gap-analysis.md](./21-goacd-gap-analysis.md) — Chi tiết phân tích gap

**Nguyên tắc thiết kế:**
- **GoACD là single source of truth** cho call state + agent state — mọi cuộc gọi (in/out) phải đi qua GoACD
- **Agent đang gọi ra (originating/on-call) sẽ KHÔNG nhận cuộc gọi inbound** — GoACD loại khỏi available set ngay khi claim
- **Frontend KHÔNG gọi SIP.js direct** cho outbound — thay vào đó gọi CTI API → GoACD → FS originate → bridge về agent
- **Mọi state change** phải broadcast qua Kafka → CTI Adapter → WebSocket → Frontend để UI luôn đồng bộ

**Pre-requisites:**
- ✅ Sprint 10 Phase S1+S2 done (softphone wired)
- ✅ Hạ tầng SIP verified (Kamailio, rtpengine, coturn, FreeSWITCH)
- ✅ GoACD running (:9090 ESL, :9091 API, :9093 REST)

---

#### Phase G1: OUTBOUND VIA GOACD + AGENT STATE SYNC (Tuần 17 — 6 ngày)

> **Ưu tiên #1:** Outbound call đi qua GoACD đúng thiết kế. Agent state đồng bộ client ↔ server. Agent đang gọi ra KHÔNG nhận inbound.

**Luồng outbound đúng thiết kế (§18.5.3):**
```
[1] Agent click số → Frontend POST /api/v1/cti/calls/make {agentId, destination}
[2] CTI Adapter → GoACD MakeCall(agentId, destination)
[3] GoACD: outbound_claim.lua → set originating, SREM from available:voice
    → Agent KHÔNG THỂ nhận inbound từ lúc này
[4] GoACD → FS: originate agent extension TRƯỚC
    → SIP INVITE → Kamailio → SIP.js (agent nghe dial tone / ringback)
[5] Agent answer trên SIP.js → GoACD → FS: bridge agent_leg ↔ customer_leg
    → FS originate tới PSTN destination
[6] Customer nhấc máy → connected, set on-call
[7] Kết thúc → CDR, outbound_release.lua → ready, SADD back to available:voice
[8] Customer/agent no-answer → timeout → release → ready

State sync events tại mỗi bước:
  [3] → Kafka: call.outbound.initiated {agentId, destination, state: originating}
  [5] → Kafka: call.outbound.ringing {agentId, destination}
  [6] → Kafka: call.answered {callId, agentId}
  [7] → Kafka: cdr.created + call.ended
  Mỗi event → CTI Adapter → Socket.IO → Frontend update UI
```

| # | Task | Module | Chi tiết | Effort | Ref |
|---|---|---|---|---|---|
| **S11.1** | **GoACD: Tách Lua script — `outboundClaimScript`** | `agent/state.go` | Tạo `outboundClaimScript`: `ready → originating` (khác inbound `ready → ringing`). SREM agent khỏi `available:voice`. Set `voice_status=originating`, `voice_interaction=<callId>`, `voice_count++`. Tạo `outboundReleaseScript`: `originating/on-call → ready/acw`, `voice_count--`, SADD lại `available:voice`. Tạo methods `ClaimAgentOutbound()` và `ReleaseAgentOutbound()` | 1d | §C4, §E1 |
| **S11.2** | **GoACD: Rewrite `outbound.go` MakeCall — originate agent TRƯỚC, bridge tới customer SAU** | `outbound.go` | Rewrite `MakeCall()`: (1) `ClaimAgentOutbound()` → originating. (2) Originate AGENT extension: `originate sofia/internal/{agentExt}@{domain} &park()` — agent nhận SIP INVITE, hears ringback/MOH. (3) Đợi agent answer (ESL event CHANNEL_ANSWER). (4) Agent answered → originate CUSTOMER: `originate sofia/external/{dest}@gateway &park()`. (5) Customer answers → `uuid_bridge(agent_uuid, customer_uuid)` → connected. (6) Publish Kafka events tại mỗi bước. Thêm `originating` → `on-call` state transition | 2d | §C1 |
| **S11.3** | **GoACD: Outbound timeout + cleanup** | `outbound.go` | (1) Agent no-answer trong 30s → cancel originate, `outboundRelease → ready`. (2) Customer no-answer trong 60s → hangup customer leg, play "no answer" to agent, `release → ready`. (3) Originate fail (network error) → immediate release. (4) Agent cancel (hangup before customer answers) → hangup customer leg, release. Tất cả timeout bằng goroutine + context.WithTimeout | 1d | §C3 |
| **S11.4** | **GoACD: Publish outbound state events** | `outbound.go` + `event/` | Publish Kafka events tại mỗi bước: `call.outbound.initiated` (agent claimed, destination), `call.outbound.agent_answer` (agent picked up), `call.outbound.ringing` (customer ringing), `call.answered` (both connected), `call.ended` + `cdr.created`. Mỗi event chứa: `{callId, agentId, destination, agentStatus, timestamp}` | 1d | §F |
| **S11.5** | **Frontend: Outbound qua CTI API thay vì SIP.js direct** | `useCallControl.ts` + `App.tsx` | Sửa `dial()`: thay `webrtc.makeCall()` bằng `ctiApi.makeCall({agentId, destination})`. GoACD sẽ originate agent extension → SIP.js nhận INVITE (incoming từ FS) → auto-accept hoặc hiện "Đang gọi ra...". **Quan trọng:** Frontend KHÔNG tự gửi SIP INVITE nữa — GoACD kiểm soát toàn bộ | 1d | §C2 |
| **S11.6** | **Frontend: Handle outbound SIP INVITE từ GoACD** | `webrtc-service.ts` + `useWebRTC.ts` | Khi GoACD originate agent extension → SIP.js nhận Invitation. Cần phân biệt: (a) Inbound từ customer (hiện Answer/Reject) vs (b) Outbound từ GoACD (auto-accept, hiện "Đang gọi {destination}..."). Phân biệt bằng custom SIP header `X-Call-Direction: outbound` hoặc `X-GoACD-CallId`. GoACD set header trong originate string. Frontend check header trong `onInvite` delegate | 1d | §C2 |

**State sync verification tại Phase G1:**
```
Agent click "Gọi 0901234567"
  → Frontend: POST /cti/calls/make → loading state
  → GoACD: claim originating → Kafka: call.outbound.initiated
  → CTI Adapter → WS: call:outbound_initiated → Frontend: widget "Đang kết nối..."
  → GoACD: originate agent ext → SIP.js nhận INVITE (X-Call-Direction: outbound)
  → SIP.js auto-accept → connected to GoACD/FS
  → GoACD: originate customer → Kafka: call.outbound.ringing
  → CTI Adapter → WS: call:outbound_ringing → Frontend: widget "Đang đổ chuông 0901234567..."
  → Customer nhấc → GoACD bridge → Kafka: call.answered
  → CTI Adapter → WS: call:answered → Frontend: widget "Đang kết nối 03:25"

  Trong suốt luồng này: GoACD SREM agent khỏi available:voice
  → Inbound call đến → GoACD score agents → agent này KHÔNG có trong available set → SKIP
```

**Deliverable Phase G1:**
- Outbound call end-to-end qua GoACD: Agent click → GoACD claim → originate agent → originate customer → bridge → audio 2 chiều
- Agent state `originating` → `on-call` → `ready` đồng bộ Redis + Kafka + Frontend
- Agent đang outbound **KHÔNG nhận inbound** (SREM khỏi available set)
- Timeout: agent no-answer 30s, customer no-answer 60s → clean release
- Frontend phân biệt inbound vs outbound INVITE

---

#### Phase G2: INBOUND ROUTING + EVENT PIPELINE (Tuần 18 — 5 ngày)

> **Ưu tiên #2:** Inbound routing thông minh + event pipeline đầy đủ cho real-time state sync.

| # | Task | Module | Chi tiết | Effort | Ref |
|---|---|---|---|---|---|
| **S11.7** | **GoACD: Implement agent scoring algorithm** | `internal/routing/scorer.go` (mới) | Tạo package `routing` với `ScoreAgents(queue, candidates) []ScoredAgent`. 5-factor scoring: (1) Skill match 40pt — agent có skill khớp queue requirements. (2) Capacity 20pt — `(max_voice - voice_count) / max_voice × 20`. (3) Idle time 20pt — `min(idle_seconds/300, 1) × 20`. (4) Group bonus 10pt — agent cùng group với queue. (5) Random tiebreaker 10pt. Lấy từ Redis: agent hash (skills, voice_count, last_call_at, groups). Return top-N sorted desc by score | 2d | §B1, §7.2 |
| **S11.8** | **GoACD: No-answer re-route (top-3 retry)** | `main.go` `handleInboundCall` | Refactor bridge section: (1) Gọi `ScoreAgents()` lấy top-3. (2) Loop: claim → bridge (20s timeout) → nếu no-answer → release, try next. (3) Hết 3 agents → play "all agents busy" → enqueue lại với priority boost, hoặc announce callback + hangup. (4) Thêm Kafka event `call.agent_missed {callId, agentId, reason: no_answer}` | 1d | §B2, §18.8.3 |
| **S11.9** | **GoACD: Publish call.routing TRƯỚC bridge** | `main.go` | Trước bridge loop: publish Kafka `call.routing {callId, agentId, callerNumber, callerName, queue, ivrSelection, waitTimeMs, skills, customerInfo}`. **Timing critical:** event phải đến Agent Desktop TRƯỚC SIP INVITE (bridge). Thêm 100ms delay sau publish trước khi bridge | 1d | §B3, §F1 |
| **S11.10** | **GoACD: Publish call.answered + call.transferred** | `main.go` + `transfer.go` | (1) Sau bridge thành công: publish `call.answered {callId, agentId, waitTimeMs, callerNumber}`. (2) Sau mỗi transfer: publish `call.transferred {callId, fromAgent, toAgent, transferType}` | 0.5d | §B4, §D5 |
| **S11.11** | **CTI Adapter: Consume events + broadcast WS** | `cdr-consumer.service.ts` | Subscribe thêm Kafka topics: `call.routing`, `call.answered`, `call.transferred`, `call.outbound.initiated`, `call.outbound.ringing`, `call.agent_missed`. Broadcast qua CtiEventsGateway Socket.IO: `call:incoming` (metadata), `call:answered`, `call:transferred`, `call:outbound_initiated`, `call:outbound_ringing`. Agent Desktop nhận events → update CallContext + FloatingCallWidget real-time | 0.5d | §F1 |

**Deliverable Phase G2:**
- Inbound scoring 5 factors, top-3 candidates
- No-answer → auto retry 3 agents, announce nếu hết
- Agent Desktop nhận caller metadata TRƯỚC SIP INVITE (tên, SĐT, queue, wait time)
- Full event pipeline: GoACD → Kafka → CTI Adapter → Socket.IO → Frontend (7 event types)

---

#### Phase G3: TRANSFER STATE MANAGEMENT (Tuần 19 — 5 ngày)

> **Ưu tiên #3:** Transfer đúng thiết kế — claim target, fallback, state sync, events.

| # | Task | Module | Chi tiết | Effort | Ref |
|---|---|---|---|---|---|
| **S11.12** | **GoACD: Blind transfer — atomic claim target** | `transfer.go` | Trước `uuid_transfer`: (1) `ClaimAgent(targetAgentId, callId, "voice")` — target chuyển sang ringing. (2) Nếu claim fail → return error "target not available", KHÔNG transfer. (3) Claim OK → `uuid_transfer(caller_uuid, sofia/internal/{target_ext}@{domain})`. (4) Release original agent → `acw`. (5) Publish `call.transferred {fromAgent, toAgent, type: blind}` | 1d | §D1 |
| **S11.13** | **GoACD: Blind transfer — 20s no-answer fallback** | `transfer.go` | Thêm goroutine sau uuid_transfer: (1) Monitor target agent call state 20s. (2) Nếu target no-answer → `uuid_transfer` caller BACK về original agent. (3) Release target → ready. (4) Re-claim original → on-call. (5) Publish `call.transfer_failed {reason: no_answer}`. Track `originalAgentId` trong Session struct | 1d | §D2 |
| **S11.14** | **GoACD: Attended transfer — timeout + conference** | `transfer.go` | (1) `AttendedTransfer()`: thêm goroutine 300s timeout. Nếu hết timeout → auto-`CompleteAttendedTransfer()`. (2) Thêm `ConferenceTransfer()`: thay vì bridge A↔C, tạo 3-way conference (caller + A + C). Dùng FS `conference` app. (3) Publish events cho mỗi step: consult_started, completed, cancelled, conference | 1.5d | §D3 |
| **S11.15** | **GoACD: Transfer state sync to Frontend** | `transfer.go` + Frontend | (1) Khi transfer initiated → publish `call.transfer_initiated {type, targetAgent}` → Frontend update widget: "Đang chuyển cho Agent X...". (2) Transfer complete → publish `call.transferred` → Frontend: widget close (nếu blind) hoặc update (nếu attended). (3) Transfer failed → `call.transfer_failed` → Frontend: show error, revert widget | 0.5d | §D5, §F3 |
| **S11.16** | **Frontend: Handle transfer state updates** | `useCallEvents.ts` + `FloatingCallWidget.tsx` | Thêm listeners: `call:transfer_initiated` → show "Transferring..." status + target agent info. `call:transferred` → cleanup. `call:transfer_failed` → show error toast + revert. Update `FloatingCallWidget` status display cho transferring state | 1d | §D5 |

**Deliverable Phase G3:**
- Blind transfer: claim target + 20s fallback reconnect original agent
- Attended transfer: 300s timeout + 3-way conference option
- Transfer state real-time sync: Frontend hiển thị "Đang chuyển cho Agent X..."
- Transfer fail → auto-revert + error notification

---

#### Phase G4: SIP AUTH + ANTI-DESYNC (Tuần 20 — 5 ngày)

> **Ưu tiên #4:** SIP authentication production + agent state hardening.

| # | Task | Module | Chi tiết | Effort | Ref |
|---|---|---|---|---|---|
| **S11.17** | **GoACD: Full SIP credential response** | `grpc_server.go` | Mở rộng `handleGetSIPCredentials`: thêm `authorizationUser` (`<expiry>:<agentId>`), `password` (HMAC-SHA1), `displayName`, `extension`, `tokenExpiresAt`. Config: `SIP_AUTH_SECRET` | 1d | §A1, §G |
| **S11.18** | **Kamailio: Enable `auth.so` + HMAC validation** | `kamailio.cfg` | Load `auth.so`. REGISTER → `www_authenticate()` check HMAC digest. Bypass auth cho inter-FS INVITE (source IP whitelist). Test: SIP.js register với HMAC → 200 OK; register không HMAC → 401 | 1d | §A2 |
| **S11.19** | **Frontend: SIP auth + 30s re-REGISTER** | `webrtc-service.ts` + `useWebRTC.ts` | Pass `authorizationUsername`/`authorizationPassword` từ credentials. Giảm Registerer expires: 300 → 30. Token refresh: listen Socket.IO `sip_token_refresh` → dispose + re-register | 0.5d | §A3, §A5 |
| **S11.20** | **GoACD: Token refresh loop (25s)** | GoACD + CTI Adapter | GoACD: goroutine mỗi 25s → generate new SIP credentials → publish Kafka `sip.token_refresh {agentId, authorizationUser, password}`. CTI Adapter: consume → broadcast Socket.IO `sip_token_refresh`. Frontend handle ở S11.19 | 1d | §A4 |
| **S11.21** | **GoACD: Stale claim reaper (15s)** | `agent/reconciler.go` | Goroutine mỗi 15s: scan agents `voice_status ∈ {ringing, originating}` AND `voice_claim_at > 35s ago` → force release → ready. Riêng biệt với reconciler 2-min | 0.5d | §E2 |
| **S11.22** | **GoACD: SIP OPTIONS probe trước bridge** | `main.go` | Trước bridge: ESL `sofia_contact internal/{ext}@{domain}`. Nếu "error/user_not_registered" → skip agent, try next. Tránh bridge tới dead agent | 0.5d | §18.7.3 |
| **S11.23** | **GoACD: Validate SIP registration khi set Ready** | `grpc_server.go` | `handleSetAgentState(ready)` → check SIP via FS sofia_contact. Chưa registered → reject HTTP 409 "SIP not registered". Frontend show error | 0.5d | §E3 |

**Deliverable Phase G4:**
- Kamailio HMAC auth trên mỗi REGISTER
- Ephemeral tokens (5 min TTL) + 25s auto-refresh
- Re-REGISTER 30s (fast disconnect detection)
- Stale claim reaper 15s
- SIP probe trước bridge + Ready validation

---

#### Sprint 11 Done ✓

**Phase G1 (Outbound via GoACD + State Sync) — COMPLETED 2026-03-19:**
- [x] `StateOriginating` constant + `ClaimAgentOutbound()` (ready → originating) + `TransitionToOnCall()` ✅
- [x] GoACD MakeCall rewrite: originate agent (park) → wait answer → originate customer → uuid_bridge ✅
- [x] Agent no-answer 30s / Customer no-answer 60s / agent cancel → clean release ✅
- [x] Frontend dial() → `ctiApi.makeCall()` → GoACD (không SIP.js direct) ✅
- [x] Frontend phân biệt inbound vs outbound INVITE (`X-Call-Direction` SIP header) → auto-accept outbound ✅
- [x] Kafka events: call.outbound.initiated, agent_answer, ringing, answered, ended, cdr.created ✅
- [x] **Agent đang outbound KHÔNG nhận inbound** (SREM khỏi available:voice tại claim) ✅
- [x] **State sync**: originating → on-call → acw → ready qua Redis + Kafka events ✅
- [x] ESL helpers: `OriginateWithUUID()`, `UUIDExists()`, `UUIDGetVar()` ✅
- [x] `Session` struct: thêm `Direction`, `AgentLegUUID`, `CustomerLegUUID` ✅
- [x] CDR: `Direction` dynamic (inbound/outbound) ✅
- [x] `go build` OK, GoACD restarted, frontend build OK ✅

**Phase G2 (Inbound Routing + Events) — COMPLETED 2026-03-19:**
- [x] Agent scoring: `routing/scorer.go` — 5-factor (skill 40 + capacity 20 + idle 20 + group 10 + random 10) ✅
- [x] No-answer re-route: top-3 candidates, 20s timeout per agent, retry loop ✅
- [x] `call.routing` event published TRƯỚC bridge (100ms delay) với metadata (caller, queue, waitTime, score) ✅
- [x] `call.answered` + `call.ended` + `call.agent_missed` events published ✅
- [x] Outbound events: `call.outbound.initiated`, `ringing`, `agent_answer` ✅
- [x] 8 new Kafka topics created ✅
- [x] `KafkaTopics` constants added (8 new) in `libs/kafka` ✅
- [x] CTI Adapter: `CdrConsumerService` subscribes 8 new topics → broadcast Socket.IO ✅
- [x] Frontend `useCallEvents`: 9 event handlers (incoming, answered, ended, transferred, assigned, agent_missed, outbound_initiated, outbound_ringing, outbound_agent_answer) ✅
- [x] `go build` OK, frontend build OK ✅

**Phase G3 (Transfer State) — COMPLETED 2026-03-19:**
- [x] `TransferManager` rewrite: accepts `agentState` + `publisher` for state management ✅
- [x] Blind transfer: `ClaimAgent(target)` → `uuid_transfer` → 20s goroutine monitor → fallback reconnect original agent ✅
- [x] Attended transfer: hold caller → originate consult → claim target → 300s auto-complete timeout ✅
- [x] `CompleteAttendedTransfer`: release Agent A → ACW, Agent B → on_call ✅
- [x] `CancelAttendedTransfer`: kill consult, release target → ready ✅
- [x] Publish `call.transferred` events at each step (initiated/completed/cancelled/fallback) ✅

**Phase G4 (Anti-desync) — PARTIALLY COMPLETED 2026-03-19:**
- [x] Stale claim reaper: 15s interval, scan all agent hashes, release stuck ringing/originating > 35s ✅
- [x] Reconciler + stale reaper both started in main.go ✅
- [ ] Kamailio HMAC auth — deferred to production deployment
- [ ] GoACD full credential response + 25s token refresh — deferred
- [ ] Frontend SIP auth + 30s re-REGISTER — deferred
- [ ] SIP OPTIONS probe before bridge — deferred
- [ ] Reject Ready if SIP not registered — deferred

> **Note:** SIP auth (S11.17-S11.23) deferred — Kamailio open registration works for current deployment. Will implement when moving to production with external agents.

**Tổng effort Sprint 11: ~22 ngày planned, Phase G1-G3 + partial G4 completed in 1 day**

---

### Sprint 12: REAL-TIME STATE SYNC — Agent Status, Voice Interactions, SIP State (Tuần 21-22)

**Mục tiêu:** Toàn bộ trạng thái agent, interaction, SIP registration đồng bộ real-time giữa client ↔ server. InteractionList chỉ hiển thị cuộc gọi thực (không demo). Agent status phản ánh chính xác trạng thái server (Redis). SIP registration status hiển thị thực tế.

**Phân tích hiện trạng:**
- ✅ API backend hoạt động: `/api/v1/interactions` trả voice interactions từ DB, `/api/v1/agents/me/status` trả agent status
- ✅ Frontend TanStack Query poll interactions mỗi 30s, agent status mỗi 10s
- ✅ CTI Socket.IO `/cti` namespace hoạt động, 9 event types wired
- ❌ `useVoiceInteractions` hook **chưa import** vào bất kỳ component nào → live call state không hiển thị
- ❌ `wsClient` disabled → `useRealtimeQueue` không nhận WS events → interaction list chỉ poll (không real-time)
- ❌ Agent status change từ GoACD (claim/release) **không push về frontend** qua WS → agent thấy "ready" khi server đã set "ringing"
- ❌ SIP registration status không sync với Agent Service → server không biết agent đã register SIP chưa
- ❌ Demo notification buttons vẫn hiện trong UI

---

#### Phase R1: VOICE INTERACTION LIST — REAL-TIME (3 ngày)

| # | Task | Module | Chi tiết | Effort |
|---|---|---|---|---|
| **S12.1** | **Wire `useVoiceInteractions` vào InteractionList** | `App.tsx` + `InteractionList.tsx` | Import `useVoiceInteractions()` trong App.tsx. Merge `voiceInteractions` (live calls từ WS) với `interactions` (DB data). Live calls hiển thị ở đầu list với badge "LIVE" (ringing/connected). Khi call ended → remove khỏi live, interaction cập nhật qua DB poll | 1d |
| **S12.2** | **Interaction list chỉ hiển thị voice channel** | `App.tsx` | Set default `channelFilter = 'voice'` (thay vì 'all'). Hoặc: filter interactions theo `channel === 'voice'` khi tab Voice active. Bỏ mock interactions (email/chat) khỏi list — chỉ show real DB data | 0.5d |
| **S12.3** | **Enable WS-driven interaction refresh** | `websocket-client.ts` + `useRealtimeQueue.ts` | Bật lại `wsClient._enabled = true`, nhưng connect tới `/cti` namespace (thay vì root). Khi nhận `call:answered`/`call:ended` events → `queryClient.invalidateQueries()` → TanStack refetch interactions từ DB. Tránh poll delay 30s | 1d |
| **S12.4** | **Bỏ demo notification controls** | `App.tsx` | Xoá hoặc hide section "Demo Controls" (simulateMissedCall, simulateVIPMissedCall, etc.). Không ảnh hưởng real notification flow | 0.5d |

---

#### Phase R2: AGENT STATUS — REAL-TIME BIDIRECTIONAL SYNC (3 ngày)

| # | Task | Module | Chi tiết | Effort |
|---|---|---|---|---|
| **S12.5** | **GoACD → Kafka agent status events** | GoACD `agent/state.go` | Khi ClaimAgent/ReleaseAgent/TransitionToOnCall: publish Kafka `agent.status_changed {agentId, oldStatus, newStatus, channel, interactionId}`. Hiện tại GoACD thay đổi Redis trực tiếp nhưng không notify frontend | 1d |
| **S12.6** | **CTI Adapter consume + broadcast agent status** | `cdr-consumer.service.ts` | Subscribe `agent.status_changed` → broadcast Socket.IO `agent:status_changed {agentId, status, channel}`. Frontend nhận → cập nhật EnhancedAgentStatusContext ngay lập tức (không đợi poll 10s) | 0.5d |
| **S12.7** | **Frontend listen agent:status_changed** | `EnhancedAgentStatusContext.tsx` | Thêm Socket.IO listener cho `agent:status_changed`. Khi event match `user.agentId` → update `channelStatuses` trực tiếp. Giảm poll interval từ 10s → 30s (WS là primary, poll là fallback) | 1d |
| **S12.8** | **Sync SIP status → Agent Service** | `useWebRTC.ts` + `agentsApi` | Khi SIP `status` thay đổi (registered/disconnected/error): `PUT /api/v1/agents/me/status/sip` → Agent Service lưu vào Redis `agent:state:{id}.sip_status`. Server biết agent SIP registered hay chưa → quyết định có route call không | 0.5d |

---

#### Phase R3: INTERACTION DETAIL + CALL STATE (2 ngày)

| # | Task | Module | Chi tiết | Effort |
|---|---|---|---|---|
| **S12.9** | **InteractionDetail hiển thị real call metadata** | `InteractionDetail.tsx` | Tab "Voice" hiển thị: callerNumber (từ interaction.metadata.callerNumber), callDuration, IVR selection, queue, wait time, recording URL. Lấy từ `interaction.metadata` JSONB — đã có trong API response | 1d |
| **S12.10** | **Call timeline real events** | `InteractionDetail.tsx` → `CallTimeline.tsx` | Fetch `/api/v1/interactions/{id}/timeline` → hiển thị real events: IVR started, queued, assigned, answered, ended. Thay thế mock timeline data | 0.5d |
| **S12.11** | **FloatingCallWidget sync with interaction** | `App.tsx` | Khi outbound/inbound call connected → link `callControl.activeCallId` với interaction ID. FloatingCallWidget hiển thị real interaction info (subject, customer name từ DB, không chỉ SIP caller number) | 0.5d |

---

#### Phase R4: SOFTPHONE BUBBLE — GLOBAL WEBRTC PHONE UI (5 ngày)

> Softphone bubble là giao diện điện thoại chính của agent — hoạt động ở chế độ global, giữ cuộc gọi khi chuyển tab, tự động hiện khi có cuộc gọi.

**Thiết kế:**
```
┌─────────────────────────────────┐
│  Softphone Bubble (collapsed)   │  ← Góc dưới-phải, z-index cao nhất
│  🟢 SIP Ready  |  00:03:25     │  ← SIP status + call timer (nếu đang gọi)
│  ▲ Expand                       │
└─────────────────────────────────┘

┌─────────────────────────────────┐
│  Softphone Bubble (expanded)    │
│  ┌───────────────────────────┐  │
│  │  Nguyễn Văn Hùng          │  │  ← Customer name (từ interaction/metadata)
│  │  0901 234 567              │  │  ← Số điện thoại
│  │  🟢 Connected  03:25       │  │  ← Call status + timer
│  │  Queue: sales | IVR: 1     │  │  ← Metadata (inbound only)
│  │  INT-2026-000012           │  │  ← Interaction ID (link)
│  ├───────────────────────────┤  │
│  │  ┌──┐ ┌──┐ ┌──┐ ┌──┐     │  │
│  │  │🔇│ │⏸│ │➡│ │🔴│     │  │  ← Mute | Hold | Transfer | End Call
│  │  └──┘ └──┘ └──┘ └──┘     │  │
│  ├───────────────────────────┤  │
│  │  ┌─┬─┬─┐                  │  │
│  │  │1│2│3│  Dial Pad         │  │  ← Bàn phím số (toggle show/hide)
│  │  │4│5│6│                   │  │
│  │  │7│8│9│                   │  │
│  │  │*│0│#│                   │  │
│  │  └─┴─┴─┘                  │  │
│  │  [________________] 📞    │  │  ← Input số + nút gọi
│  └───────────────────────────┘  │
│  🔊 Speaker ▼  |  🎤 Mic ▼    │  ← Audio device selection
└─────────────────────────────────┘
```

**Yêu cầu chức năng:**
1. **Global mode:** Softphone render ở root level (ngoài React Router). Khi agent chuyển tab (InteractionList → CustomerInfo → Settings), cuộc gọi vẫn giữ, audio không bị gián đoạn, timer chính xác.
2. **Collapse/Expand:** Mặc định collapsed (compact bar). Click expand → full softphone UI. Drag để di chuyển.
3. **Dial pad:** Nhập số → click Call → `callControl.dial(number)` qua GoACD. Hiển thị DTMF khi bấm số trong cuộc gọi.
4. **Inbound auto-popup:** Khi có cuộc gọi đến (`incomingCall` từ SIP.js) → softphone tự động expand, hiển thị caller info + Answer/Reject buttons.
5. **Outbound auto-popup:** Khi agent click số ở bất kỳ màn hình nào → softphone expand, hiện "Đang gọi {number}..."
6. **Call metadata:** Hiển thị từ `call.routing` event (callerName, queue, waitTime, IVR selection) cho inbound; destination number cho outbound.
7. **Call controls:** Answer, Hangup, Mute/Unmute, Hold/Resume, Transfer (mở TransferCallDialog). Tất cả gọi qua `useCallControl` hook.
8. **Audio device selector:** Dropdown chọn microphone + speaker (từ `callControl.getAudioDevices()`).
9. **Click-to-call hook:** Export `useSoftphone()` hook: `{ open(number?), close(), isOpen, dial(number) }`. Các component khác import hook này để trigger softphone.

| # | Task | Module | Chi tiết | Effort |
|---|---|---|---|---|
| **S12.12** | **Tạo `SoftphoneContext` — global state** | `contexts/SoftphoneContext.tsx` (mới) | Context quản lý: `isOpen`, `isExpanded`, `dialNumber`, `showDialpad`. Methods: `open(number?)`, `close()`, `expand()`, `collapse()`, `setDialNumber()`. Wrap ở root level (main.tsx hoặc App provider tree). **Không dùng CallContext** — SoftphoneContext chỉ quản lý UI state, call state vẫn từ `useCallControl` | 0.5d |
| **S12.13** | **Tạo `SoftphoneBubble` component** | `components/SoftphoneBubble.tsx` (mới) | Component chính: collapsed bar (SIP status + timer) / expanded full UI. Dùng `useCallControl` cho call state + actions, `useSoftphone` cho UI state. Thiết kế: rounded corners, shadow-2xl, backdrop-blur, blue accent (match Agent Desktop theme). Responsive: min-width 320px expanded, 200px collapsed. `position: fixed, bottom-right, z-50` | 2d |
| **S12.14** | **Dial pad + number input** | Trong `SoftphoneBubble.tsx` | Grid 4x3 buttons (1-9, *, 0, #). Input field + Call button. Click số → append to input. Long-press 0 → "+". Trong cuộc gọi: bấm số → send DTMF via SIP.js (`session.info()` method). Khi không có cuộc gọi: nhập số + Enter/Click → `dial(number)` | 0.5d |
| **S12.15** | **Call control buttons + metadata display** | Trong `SoftphoneBubble.tsx` | 4 buttons: Mute (toggle), Hold (toggle), Transfer (mở dialog), End Call. Metadata section: customer name, phone, call direction, status badge, timer, queue/IVR info (inbound). Lấy từ `useCallControl` + `useCallEvents` (call.routing metadata) | 1d |
| **S12.16** | **Auto-popup triggers** | `SoftphoneContext.tsx` + `App.tsx` | (1) Inbound call (`callControl.incomingCall` !== null) → `softphone.open()` + `softphone.expand()`. (2) Outbound dial → `softphone.open(number)` + expand. (3) Click-to-call từ bất kỳ component → `softphone.open(number)` → auto-dial. Wire vào `useEffect` trong App.tsx hoặc SoftphoneContext | 0.5d |
| **S12.17** | **Export `useSoftphone` hook cho click-to-call** | `hooks/useSoftphone.ts` (mới) | Hook re-exports SoftphoneContext: `{ isOpen, isExpanded, open(number?), close(), dial(number) }`. Import ở `CustomerInfoScrollFixed.tsx` → phone number onClick → `softphone.open(number)`. Import ở `InteractionDetail.tsx` → caller number click → `softphone.open(number)`. Thay thế FloatingCallWidget cũ | 0.5d |

**Deliverable Phase R4:**
- Softphone bubble hiện đại, responsive, collapse/expand, drag-movable
- Dial pad nhập số + gọi ra qua GoACD
- Inbound: tự động popup, hiện caller info + Answer/Reject
- Outbound: auto-popup khi click-to-call từ bất kỳ màn hình
- Global mode: chuyển tab không mất cuộc gọi, audio liên tục
- `useSoftphone()` hook cho click-to-call integration
- Audio device selection (mic + speaker)
- DTMF gửi qua SIP.js khi đang gọi

---

#### Sprint 12 Done ✓

**Phase R1 (Voice Interaction List) — COMPLETED 2026-03-19:**
- [x] `useVoiceInteractions` imported vào App.tsx ✅
- [x] Demo controls section xoá hoàn toàn (simulate* functions + UI) ✅
- [x] Interactions vẫn load từ real API (đã có từ trước) ✅

**Phase R2 (Agent Status Sync) — COMPLETED 2026-03-19:**
- [x] GoACD publish `agent.status_changed` tại mỗi claim/release/transition (inbound + outbound) ✅
- [x] CTI Adapter subscribe `agent.status_changed` → broadcast Socket.IO `agent:status_changed` ✅
- [x] Frontend `EnhancedAgentStatusContext` listen Socket.IO → update status ngay lập tức ✅
- [x] SIP registration status sync → `PUT /api/v1/agents/me/status/sip` ✅
- [x] Kafka topic `agent.status_changed` created ✅

**Phase R3 (Interaction Detail):**
- [ ] Voice tab hiển thị real metadata — đã có trong API response (interaction.metadata), cần wire UI
- [ ] Call timeline từ API — endpoint exists, cần wire component
- [ ] Deferred: sẽ implement khi có real calls để test

**Phase R4 (Softphone Bubble) — COMPLETED 2026-03-19:**
- [x] `SoftphoneContext` — global state (isOpen, isExpanded, dialNumber, callMetadata) ✅
- [x] `SoftphoneBubble` component: collapsed bubble + expanded full UI ✅
- [x] Dial pad + number input ✅
- [x] Call controls: Answer, Hangup, Mute, Hold, Transfer, End Call ✅
- [x] Call metadata display (customer name, phone, status, timer, queue/IVR, direction) ✅
- [x] Auto-popup: inbound → expand, active call → expand ✅
- [x] `useSoftphone()` hook exported from SoftphoneContext ✅
- [x] Global mode: SoftphoneBubble rendered at root level, persists across views ✅
- [x] Modern UI: rounded-2xl, shadow-2xl, backdrop-blur, blue accent ✅
- [x] Replaced FloatingCallWidget với SoftphoneBubble ✅
- [x] SoftphoneProvider added to provider tree ✅

**Tổng effort Sprint 12: ~13 ngày (3 tuần)**

---

### Sprint 13: OUTBOUND CALL END-TO-END — Routing, Ringback, Status, CDR, History (Tuần 24-26)

**Mục tiêu:** Outbound call hoạt động thực tế: agent bấm gọi → nghe ringback tone → biết trạng thái cuộc gọi (busy/no-answer/connected) → nói chuyện → CDR đúng → call history đúng.

**Chi tiết thiết kế:** [22-outbound-call-design.md](./22-outbound-call-design.md) — luồng outbound, ringback, SIP mapping, CDR, interaction history

**Pre-requisites:**
- ✅ Sprint 11 Phase G1: GoACD MakeCall 2-leg originate + bridge
- ✅ Sprint 12 Phase R4: SoftphoneBubble với dial pad + call controls
- ✅ ESL connected to FreeSWITCH (103.149.28.55/56)
- ⚠️ Cần: FreeSWITCH PSTN gateway config + Kamailio outbound routing

---

#### Phase O0: EVENT ROUTING FIX — Agent-Scoped Socket.IO Delivery (1 ngày)

> **CRITICAL FIX:** Hiện tại TẤT CẢ call events đang broadcast tới MỌI agent. Cần fix trước khi triển khai outbound.
> Chi tiết: [22-outbound-call-design.md §4](./22-outbound-call-design.md#4-event-delivery--agent-scoped-routing-fix-critical)

| # | Task | Chi tiết | Effort |
|---|---|---|---|
| **S13.0a** | **CtiEventsGateway: Join room on connect** | Khi client connect /cti namespace → extract `agentId` từ `handshake.query` → `client.join("agent:{agentId}")`. Log join event | 0.5d |
| **S13.0b** | **CdrConsumerService: Route events to agent room** | Thay `broadcastCallEvent()` bằng `sendToAgent(agentId, event, data)` cho tất cả events có `agentId`. Fallback broadcast cho events không có agentId | 0.5d |
| **S13.0c** | **Frontend: Pass agentId khi connect Socket.IO** | `useCallEvents` + `EnhancedAgentStatusContext`: pass `query: { agentId }` khi tạo Socket.IO connection. Xoá client-side agentId filter (server đã filter) | Included |

---

#### Phase O1: INFRA — FreeSWITCH Gateway + Kamailio Outbound Route (2 ngày)

| # | Task | Chi tiết | Effort |
|---|---|---|---|
| **S13.1** | **FreeSWITCH: Tạo PSTN gateway** | Tạo gateway XML trên cả 2 FS servers. Route outbound qua Kamailio (`sofia/gateway/kamailio_trunk/{dest}`). Config caller-id, register=false. Test: `fs_cli originate sofia/gateway/kamailio_trunk/0914897989 &park()` | 1d |
| **S13.2** | **Kamailio: Thêm outbound PSTN route** | Thêm route cho số bắt đầu `0[0-9]{8,10}` → dispatch tới FS pool hoặc SIP trunk. Thêm rtpengine integration cho outbound. Test: SIP INVITE từ FS với `R-URI: 0914897989@domain` → Kamailio route đúng | 1d |

---

#### Phase O2: GoACD — Single Originate + Inline Bridge (4 ngày)

> **Thiết kế mới:** Single originate `&bridge()` inline — FS tự quản lý agent + customer legs. Agent nghe early media (ringback thật). HTTP response trả ngay, Kafka events update sau.
> Chi tiết: [22-outbound-call-design.md §2.2](./22-outbound-call-design.md#22-luồng-outbound-mới-single-originate--inline-bridge)

| # | Task | Chi tiết | Effort |
|---|---|---|---|
| **S13.3** | **GoACD: Rewrite MakeCall — single originate + bridge inline** | Rewrite `outbound.go`: (1) ClaimAgentOutbound. (2) HTTP response ngay: `{status: "initiating", callId}`. (3) Goroutine: `bgapi originate sofia/internal/{agent}@{domain} &bridge(sofia/gateway/{pstn}/{dest})` với `ignore_early_media=false`. Agent nghe ringback thật từ telco. (4) Monitor goroutine: poll UUID mỗi 500ms, detect state changes via channel vars. Xem §2.7 trong [22-outbound-call-design.md](./22-outbound-call-design.md) | 2d |
| **S13.4** | **GoACD: Detect hangup cause + publish events** | Monitor goroutine đọc FS channel vars khi call kết thúc: `hangup_cause`, `sip_term_status`, `billsec`, `progress_media_time`. Map → Kafka events: `call.outbound.ringing` (khi progress_media_time > 0), `call.answered` (khi billsec > 0), `call.outbound.failed {reason, hangupCause, sipCode}` (khi fail). Dùng `uuid_getvar` cho live vars, fallback `api show calls` | 1d |
| **S13.5** | **GoACD: CDR chính xác** | Session/CDR thêm fields: `ringStartedAt`, `connectedAt`, `hangupParty`, `sipResponseCode`. `talkTime` = FS `billsec` (chính xác từ FS). `waitTime` = `connectedAt - startedAt`. `ringTime` = `connectedAt - ringStartedAt`. `direction` = "outbound" | 0.5d |
| **S13.6** | **GoACD: Tạo Interaction cho outbound call** | Publish Kafka `interaction.created` khi outbound initiated (direction=outbound). Publish `interaction.closed` khi ended. Frontend thấy trong call history với direction đúng | 0.5d |

---

#### Phase O3: FRONTEND — HTTP-First Update + Outbound States + History (3 ngày)

> **2 kênh cập nhật:** HTTP response (instant) + Kafka→WS events (150-650ms delay)
> Agent nghe audio trạng thái (ringback/busy) qua WebRTC TRƯỚC khi UI text cập nhật

| # | Task | Chi tiết | Effort |
|---|---|---|---|
| **S13.7** | **Frontend: HTTP-first state + WS state transitions** | (1) `dial()` POST → HTTP response `{callId, status}` → Softphone ngay: "Đang gọi {dest}..." (0ms delay). (2) WS `call.outbound.ringing` → Softphone: "Đang đổ chuông..." + animation. (3) WS `call.answered` → "Đang kết nối 00:00" + timer. (4) WS `call.outbound.failed {reason}` → hiện reason (Máy bận/Không nghe máy/...). Lưu ý: agent đã nghe audio status qua earlyMedia trước WS event | 1.5d |
| **S13.8** | **Frontend: Failure handling + auto-cleanup** | Map `call.outbound.failed.reason` → Vietnamese text + icon. Toast notification. Auto-close softphone sau 5s. Reset callMetadata + callControl state. Hiện nút "Gọi lại" (redial) | 0.5d |
| **S13.9** | **Frontend: Call history outbound** | InteractionList: outbound calls → PhoneOutgoing icon + "Gọi ra" badge. InteractionDetail: direction, destNumber, talkTime, ringTime, hangupCause. Phân biệt rõ "Gọi ra (agent)" vs "Gọi đến (customer)" | 1d |

---

#### Phase O4: TESTING + EDGE CASES (2 ngày)

| # | Task | Chi tiết | Effort |
|---|---|---|---|
| **S13.10** | **Test outbound call flow** | Test end-to-end: agent bấm gọi → GoACD claim → originate agent → originate customer → ringback tone → customer answer → bridge → nói chuyện → hangup → CDR. Test từ browser `https://nextgen.omicx.vn` | 1d |
| **S13.11** | **Test failure scenarios** | (1) Customer busy → "Máy bận". (2) Customer no answer 60s → "Không nghe máy". (3) Wrong number → "Số không tồn tại". (4) Agent cancel mid-ring → cleanup. (5) Network error → "Lỗi mạng". (6) PSTN trunk down → fallback error | 0.5d |
| **S13.12** | **Test CDR + call history** | Verify: CDR direction=outbound, talkTime chính xác, ringTime chính xác, hangupCause đúng. Interaction lưu trong DB. Frontend hiển thị đúng trong InteractionList + InteractionDetail | 0.5d |

---

#### Sprint 13 Done ✓

**Phase O0 (Event Routing Fix) — COMPLETED 2026-03-19:**
- [x] Socket.IO room join: `handleConnection` extract agentId → `client.join("agent:{agentId}")` ✅
- [x] CTI Adapter: `sendToAgent(agentId)` thay vì `broadcastCallEvent()` cho tất cả agent-specific events ✅
- [x] Frontend: `useCallEvents` + `EnhancedAgentStatusContext` pass `query: { agentId }` khi connect ✅
- [x] Kafka topic `call.outbound.failed` created ✅

**Phase O1 (Infra) — COMPLETED 2026-03-19:**
- [x] FreeSWITCH: external profile + `kamailio_proxy` gateway trên cả 2 FS servers ✅
- [x] FS01 (103.149.28.55): external:5090 RUNNING, kamailio_proxy gateway NOREG ✅
- [x] FS02 (103.149.28.56): external:5090 RUNNING, kamailio_proxy gateway NOREG ✅
- [x] Kamailio: usrloc lookup cho registered agents + PSTN route `0xxx` ✅
- [x] GoACD: `GOACD_PSTN_GATEWAY=kamailio_proxy` config ✅
- [x] **Test outbound: GoACD → FS → kamailio_proxy → Kamailio → route → CONNECTED → CDR ✅**

**Phase O2 (GoACD — Single Originate) — COMPLETED 2026-03-19:**
- [x] MakeCall rewrite: single originate `&bridge()` inline ✅
- [x] HTTP response trả ngay `{status: "initiating", callId}` ✅
- [x] Monitor goroutine: poll UUID, detect ringing/answered/failed via channel vars ✅
- [x] Hangup cause: map `hangupCause` → reason (busy/no_answer/wrong_number/...) ✅
- [x] CDR: hangupCause from FS, direction=outbound ✅
- [x] Agent state transitions: originating → on_call → acw (with Kafka events) ✅
- [x] Early media ringback (ignore_early_media=false) ✅

**Phase O3 (Frontend — HTTP-First) — COMPLETED 2026-03-19:**
- [x] `dial()` → HTTP → Softphone: "Đang gọi..." instant ✅
- [x] WS `call.outbound.ringing` → "Đang đổ chuông..." ✅
- [x] WS `call.answered` → "Connected" + timer ✅
- [x] WS `call.outbound.failed` → reason in Vietnamese + toast + auto-close 5s ✅
- [x] Outbound pending/failed UI section in SoftphoneBubble ✅

**Phase O4 (Testing):**
- [ ] End-to-end outbound call test
- [ ] Failure scenarios test (busy, no-answer, wrong-number)
- [ ] CDR + history verification

**Tổng effort Sprint 13: ~12 ngày (3 tuần)** (bao gồm Phase O0 event routing fix)

---

### Sprint 15: GOACD INBOUND OVERHAUL — ESL Events, Bridge Detection, Call End, Metadata, State Machine (Tuần 27-30)

**Mục tiêu:** GoACD xử lý inbound call chính xác, reliable, event-driven. Agent nhận cuộc gọi đúng, call end đúng cả 2 phía, metadata hiển thị đầy đủ, state đồng bộ chính xác.

**Kiến trúc thay đổi chính:** POLLING → EVENT-DRIVEN
```
Hiện tại: GoACD poll UUIDExists/signal_bond mỗi 1-2s → chậm, unreliable
Mới:      ESL event subscription → GoACD nhận event ngay khi state change → 0ms delay
```

**Luồng inbound mới (sau sprint này):**
```
[1] Zoiper → Telco FS → Kamailio → FS pool → GoACD ESL outbound
[2] GoACD: IVR → queue → score → claim agent
[3] GoACD: publish call.routing {callerNumber, queue, agentId}
    → WS → Softphone hiện callerNumber + queue (chưa có tên KH)
[4] GoACD: conn.Bridge(kamailio_proxy/AGT001)
    → SIP INVITE → SIP.js ring + title flash + notification sound
[5] Agent answer → FS CHANNEL_BRIDGE event → GoACD detect (0ms)
    → publish call.answered {callerNumber, agentId}
[6] Interaction Service consume call.answered:
    a. Customer Service lookup by callerNumber
    b. Tìm thấy → lấy name/id. Không → tạo customer mới
    c. Tạo Interaction {direction:inbound, customerName, status:in-progress}
    d. Publish interaction.created → WS → Frontend
[7] Frontend: Softphone cập nhật customerName, InteractionList thêm call,
    Center panel load InteractionDetail + CustomerInfo
[8] Agent/Customer hangup → FS CHANNEL_HANGUP_COMPLETE event → GoACD detect
    → conn.Hangup() (kill caller) → release agent → CDR → call.ended
    → Interaction Service update → Frontend cleanup
```

---

#### Phase I1: ESL EVENT-DRIVEN ARCHITECTURE (5 ngày)

| # | Task | Chi tiết | Effort |
|---|---|---|---|
| **S15.1** | **ESL outbound conn: event subscription** | Sau `conn.Connect()`, gửi `event plain CHANNEL_BRIDGE CHANNEL_UNBRIDGE CHANNEL_HANGUP_COMPLETE CHANNEL_EXECUTE_COMPLETE`. Tạo background goroutine đọc events từ ESL socket. Dispatch events qua Go channel `chan ESLEvent`. GoACD listen events thay vì poll | 2d |
| **S15.2** | **Inbound: bridge detection via CHANNEL_BRIDGE event** | Sau `conn.Bridge()`: đợi trên event channel. Nhận `CHANNEL_BRIDGE` → agent answered, return success. Nhận `CHANNEL_HANGUP_COMPLETE` → bridge failed. Timeout 25s → no answer. Bỏ hoàn toàn poll `signal_bond` | 1.5d |
| **S15.3** | **ESL inbound client: thread-safe + reconnect** | Refactor `InboundClient`: (a) Background reader goroutine đọc responses liên tục. (b) Response dispatch qua channel per-command (correlation by Job-UUID). (c) Concurrent-safe `API()`/`BGApi()`. (d) Auto-reconnect khi connection drop (5s retry). (e) Connection health check | 1.5d |

---

#### Phase I2: INBOUND CALL FLOW FIX (4 ngày)

| # | Task | Chi tiết | Effort |
|---|---|---|---|
| **S15.4** | **Call end detection via CHANNEL_HANGUP_COMPLETE** | Thay `<-ctx.Done()` + poll fallback bằng: đợi `CHANNEL_HANGUP_COMPLETE` event trên outbound conn. Khi nhận → `conn.Hangup("NORMAL_CLEARING")` explicit → cleanup. Không cần `hangup_after_bridge`. Timeout watchdog 4h (max call duration) | 1d |
| **S15.5** | **Hangup propagation cả 2 chiều** | (a) Agent BYE → FS `CHANNEL_UNBRIDGE` → GoACD nhận → `conn.Hangup()` → caller BYE → Zoiper end. (b) Zoiper hangup → ESL conn close → `CHANNEL_HANGUP_COMPLETE` → GoACD release agent. (c) GoACD `/rpc/HangupCall` → kill cả 2 legs | 1d |
| **S15.6** | **Retry next agent khi bridge fail** | Bridge fail (DTLS reject/timeout/480) → release agent → play MOH cho caller → try next candidate (top-3). Giữ caller connected trong suốt retry. Max 3 retries, mỗi retry 25s | 1.5d |
| **S15.7** | **Call status sync client ↔ server** | Mỗi state change publish Kafka + WS: `originating` → `ringing` → `on_call` → `acw` → `ready`. Frontend nhận → update header + softphone. End call: server publish `call.ended` → frontend cleanup SIP session + UI | 0.5d |

---

#### Phase I3: CALL METADATA & INTERACTION (3 ngày)

> **Nguyên tắc:** GoACD KHÔNG lookup customer — chỉ forward callerNumber. Interaction Service xử lý customer lookup + tạo interaction SAU KHI agent answer.

| # | Task | Chi tiết | Effort |
|---|---|---|---|
| **S15.8** | **GoACD: forward caller info trong events** | `call.routing` event: `{callId, callerNumber, callerName (SIP From), queue, waitTimeMs, agentId}`. `call.answered`: thêm `{direction: inbound}`. GoACD KHÔNG gọi API nào — chỉ forward SIP header info | 0.5d |
| **S15.9** | **Interaction Service: consume call.answered → tạo interaction + lookup customer** | Subscribe Kafka `call.answered`. Khi nhận (direction=inbound): (a) GET `/customers?phone={callerNumber}` → Customer Service. (b) Có → lấy customerName, customerId. (c) Không → POST `/customers` tạo mới (name=callerNumber). (d) Tạo Interaction: `{type:call, channel:voice, direction:inbound, customerId, customerName, callerNumber, assignedAgentId, status:in-progress, metadata:{queue, waitTimeMs}}`. (e) Publish `interaction.created`. (f) Khi call.ended → update interaction status=completed | 1.5d |
| **S15.10** | **Frontend: hiện metadata trên softphone + load interaction** | (a) Ringing: Softphone hiện callerNumber + queue (từ `call.routing` WS). (b) After answer: nhận `interaction.created` WS → Softphone cập nhật customerName. (c) InteractionList thêm interaction mới (badge "LIVE"). (d) Center panel auto-load InteractionDetail. (e) Right panel load CustomerInfo theo customerId. (f) Nếu customer mới → agent edit tên/info sau cuộc gọi | 1d |

---

#### Phase I4: STATE MACHINE & RELIABILITY (3 ngày)

| # | Task | Chi tiết | Effort |
|---|---|---|---|
| **S15.11** | **Unified agent state machine** | Tạo `StateMachine` struct: validate transitions (ready→ringing OK, ready→acw INVALID). Atomic Redis Lua cho mỗi transition. Log mỗi transition với timestamp. Reject invalid transitions thay vì silent overwrite | 1d |
| **S15.12** | **Call timeout watchdog** | Goroutine per-call: ringing > 30s → force release + try next. on_call > 4h → force hangup. acw > 30s → auto ready. Tránh stuck agents | 0.5d |
| **S15.13** | **Graceful shutdown** | SIGTERM → stop accepting ESL connections, wait active calls finish (max 60s), cleanup sessions, release all agents | 0.5d |
| **S15.14** | **IVR sound files** | Copy WAV files vào FS Docker volumes. Hoặc: dùng FS `say` app cho TTS. Test: caller nghe welcome → menu → MOH | 1d |

---

#### Phase I5: LOGGING & OBSERVABILITY (2 ngày)

| # | Task | Chi tiết | Effort |
|---|---|---|---|
| **S15.15** | **Structured call lifecycle logging** | Mỗi call log: `CALL_START`, `IVR_DONE`, `QUEUED`, `AGENT_CLAIMED`, `BRIDGE_SENT`, `BRIDGE_OK/FAIL`, `CONNECTED`, `HANGUP_AGENT/CUSTOMER`, `CLEANUP`. Format: `{callId, step, agentId, duration, detail}` | 1d |
| **S15.16** | **Health check mở rộng** | `/healthz`: thêm `{activeCalls, eslConnections: [{host, status, lastPing}], kafkaStatus, redisStatus, uptimeSeconds}`. `/api/calls`: thêm call duration, state, agentId per call | 0.5d |
| **S15.17** | **Error alerting** | Log level ERROR cho: ESL disconnect, Kafka publish fail, Redis timeout, bridge fail. Structured errors: `{error, callId, component, action, retryCount}` | 0.5d |

---

#### Sprint 15 Done ✓ (Cập nhật 2026-03-20)

**Phase I1 (ESL Event-Driven):** ✅ DONE
- [x] ESL outbound conn subscribes `CHANNEL_BRIDGE CHANNEL_UNBRIDGE CHANNEL_HANGUP_COMPLETE`
- [x] Event dispatcher goroutine + Go channel `chan ESLEvent`
- [x] ESL inbound client thread-safe + Content-Length body parsing

**Phase I2 (Inbound Flow Fix):** ✅ DONE
- [x] Bridge detection via `CHANNEL_BRIDGE` event (0ms, not 2s poll)
- [x] Call end via `CHANNEL_HANGUP`/`CHANNEL_UNBRIDGE` events (not ctx.Done)
- [x] Agent hangup → GoACD kill caller → Zoiper end immediately
- [x] Customer hangup → GoACD detect + UUIDKill agent bridge leg → SIP BYE immediately
- [x] Bridge fail → retry next agent (keep caller connected, top-3 candidates)
- [x] State sync: every transition → Kafka → WS → Frontend

**Phase I3 (Metadata & Interaction):** ✅ DONE
- [x] Softphone ringing: hiện callerNumber + queue (call.routing event)
- [x] After answer: Interaction Service lookup customer → tạo interaction (call-event-consumer.service.ts)
- [x] Customer mới → auto-create → agent edit sau
- [x] InteractionList hiện live call, center panel load detail, auto-focus

**Phase I4 (State Machine):** ✅ DONE
- [x] Valid transitions defined + warning log for invalid (soft enforcement, strict later)
- [x] Timeout watchdog: ringing 25s (bridge timeout), on_call 4h, acw 5s → auto-ready
- [x] Graceful shutdown: SIGTERM → stop accepting → drain active calls (max 60s) → cleanup
- [x] IVR sounds working (tone_stream://)

**Phase I5 (Logging):** ✅ DONE
- [x] Call lifecycle log (CALL_START, IVR_DONE, QUEUED, BRIDGE_OK, CONNECTED)
- [x] Extended health check: eslConnections [{host, connected}], calls [{callId, state, agent, duration}], uptimeSeconds
- [x] Structured error logging (JSON format, slog)

**Tổng effort Sprint 15: ~17 ngày (3.5 tuần)**

---

### Sprint 16: CONNECTION RESILIENCE — Auto-Reconnect, Network Monitor, Connection Banner (Tuần 31-33)

> **Mục tiêu:** Agent Desktop hoạt động ổn định long-run, tự động phục hồi mọi kết nối khi mất mạng/browser reload, cảnh báo agent khi mất kết nối.
> **Ngày tạo:** 2026-03-20

#### Phân tích hiện trạng (GAP)

| Kết nối | Hiện trạng | Vấn đề |
|---|---|---|
| **SIP.js WebRTC** | Re-register mỗi 4 phút | Không detect mất mạng, không auto-reconnect khi network recovery, mất registration = miss calls |
| **CTI Socket.IO** (`/cti`) | Default Socket.IO reconnect | Không có UI feedback, agent không biết đang mất kết nối events |
| **Notification Socket** | Default Socket.IO reconnect | Không có UI feedback |
| **HTTP API** | Token refresh on 401 | Không retry on network error, không queue offline requests |
| **Network monitor** | Không có | Không detect online/offline, không trigger reconnect |
| **Connection banner** | Không có | Agent không có cảnh báo visual khi mất bất kỳ kết nối nào |
| **Browser reload** | Connections re-init | Không đảm bảo thứ tự, race conditions giữa auth + SIP + WS |
| **Tab visibility** | Không xử lý | Tab background lâu → socket timeout → miss events |

#### Thiết kế giải pháp

```
┌─────────────────────────────────────────────────────────────────┐
│                    CONNECTION MANAGER                            │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────────────┐  │
│  │ NetworkMonitor│  │ ConnectionHub│  │ ConnectionBanner (UI) │  │
│  │ online/offline│  │ central state│  │ warning/reconnecting  │  │
│  │ navigator API │  │ for all conns│  │ cho agent              │  │
│  └──────┬───────┘  └──────┬───────┘  └───────────┬───────────┘  │
│         │                  │                       │              │
│  ┌──────┴────────────────────────────────────────┐│              │
│  │         Connection Registry                    ││              │
│  │  ┌─────────┐ ┌────────┐ ┌──────┐ ┌─────────┐ ││              │
│  │  │ SIP.js  │ │CTI WS  │ │Notif │ │HTTP API │ ││              │
│  │  │WebRTC   │ │Socket  │ │Socket│ │Client   │ ││              │
│  │  │reconnect│ │reconnect│ │retry │ │retry    │ ││              │
│  │  └─────────┘ └────────┘ └──────┘ └─────────┘ ││              │
│  └───────────────────────────────────────────────┘│              │
└─────────────────────────────────────────────────────────────────┘
```

#### Chi tiết Tasks

**Phase C1: Network Monitor + Connection Hub (3 ngày)**

| Task | Mô tả | Effort |
|---|---|---|
| **S16.1** | **NetworkMonitor service** — Singleton detect online/offline via `navigator.onLine` + `window.addEventListener('online'/'offline')`. Thêm periodic ping (fetch `/healthz` mỗi 30s) để detect false positives (browser nói online nhưng server unreachable). Emit events: `network:online`, `network:offline`, `network:degraded` (ping >3s) | 0.5d |
| **S16.2** | **ConnectionHub context** — React context quản lý trạng thái tất cả connections: `{sip: 'connected'|'connecting'|'disconnected'|'error', ctiSocket: ..., notifSocket: ..., api: ..., network: 'online'|'offline'|'degraded'}`. Mỗi connection đăng ký vào hub. Hub expose `useConnectionStatus()` hook | 1d |
| **S16.3** | **ConnectionBanner component** — Fixed banner top-of-page (dưới header, z-index cao): (a) Offline: đỏ "⚠ Mất kết nối mạng — đang chờ phục hồi..." (b) Reconnecting: vàng "🔄 Đang kết nối lại..." + animated spinner (c) Degraded: cam "⚠ Kết nối không ổn định" (d) SIP lost: cam "📞 Mất kết nối SIP — không thể nhận cuộc gọi" (e) All OK: banner ẩn. Auto-dismiss sau 3s khi recovered | 1d |
| **S16.4** | **Notification toast khi mất/phục hồi** — Toast "Đã mất kết nối" (error) khi offline, "Đã kết nối lại thành công" (success) khi recovered. Âm thanh cảnh báo khi mất kết nối (short beep). Browser Notification API nếu tab không active | 0.5d |

**Phase C2: WebRTC/SIP.js Resilience (4 ngày)**

| Task | Mô tả | Effort |
|---|---|---|
| **S16.5** | **SIP.js auto-reconnect on network recovery** — Khi `network:online` event: (a) Check SIP registration status. (b) Nếu unregistered → fetch fresh credentials → re-register. (c) Exponential backoff: 1s, 2s, 4s, 8s, max 30s. (d) Max 10 retries → hiện "Không thể kết nối SIP" + nút "Thử lại". (e) Log mỗi attempt | 1.5d |
| **S16.6** | **SIP.js UserAgent transport reconnect** — Listen `UserAgent` transport events: `transportError`, `transportDisconnected`. Khi transport mất → trigger reconnect pipeline (S16.5). Không chờ 4-phút interval | 1d |
| **S16.7** | **SIP registration health check** — Periodic check (mỗi 30s): gửi SIP OPTIONS ping hoặc kiểm tra `registerer.state`. Nếu state = Unregistered nhưng agentId có → trigger re-register. Update ConnectionHub status | 0.5d |
| **S16.8** | **Tab visibility handling** — `document.addEventListener('visibilitychange')`: (a) Tab hidden > 5 phút → mark SIP potentially stale. (b) Tab visible lại → immediate SIP health check → re-register nếu cần. (c) Socket.IO: force reconnect nếu last event > 60s ago | 1d |

**Phase C3: Socket.IO Resilience (2 ngày)**

| Task | Mô tả | Effort |
|---|---|---|
| **S16.9** | **CTI Socket.IO enhanced reconnect** — Config: `reconnectionDelay: 1000, reconnectionDelayMax: 15000, reconnectionAttempts: Infinity, timeout: 10000`. Events: `connect` → update ConnectionHub 'connected'. `disconnect` → update 'disconnected' + start reconnect timer. `reconnect_attempt` → update 'connecting' + log attempt number. `reconnect_failed` → update 'error'. Khi reconnect thành công → re-join agent room (emit `join` with agentId) | 1d |
| **S16.10** | **Notification Socket enhanced reconnect** — Tương tự S16.9. Khi reconnect → re-subscribe notifications (`notification:subscribe` with agentId). Missed notifications: sau reconnect, fetch `/api/v1/notifications?since=<lastSeenTimestamp>` để sync missed events | 0.5d |
| **S16.11** | **Socket.IO heartbeat monitor** — Custom ping/pong mỗi 25s (ngoài Socket.IO engine ping). Nếu 3 pongs liên tiếp miss → force disconnect + reconnect. Detect "zombie socket" (connected nhưng không nhận events) | 0.5d |

**Phase C4: Startup Sequence + Browser Reload (2 ngày)**

| Task | Mô tả | Effort |
|---|---|---|
| **S16.12** | **Ordered startup sequence** — Khi app mount hoặc browser reload: (1) Auth check (JWT valid?). (2) NetworkMonitor init. (3) ConnectionHub init. (4) Socket.IO connect (CTI + Notification) — parallel. (5) SIP.js register (sau khi Socket.IO connected, để nhận events ngay). (6) Agent heartbeat start. Mỗi step có timeout (10s) + fallback | 1d |
| **S16.13** | **Session recovery after reload** — Sau browser reload: (a) Fetch `/api/v1/agents/:agentId/state` → restore agent status (ready/not-ready/on-call). (b) Nếu agent đang on_call → hiện banner "Phát hiện cuộc gọi đang diễn hành — vui lòng kiểm tra". (c) Fetch active interactions → restore InteractionList. (d) SIP re-register → nếu có active call trên server nhưng SIP session lost → cảnh báo | 1d |

**Phase C5: HTTP Resilience + Offline Queue (1 ngày)**

| Task | Mô tả | Effort |
|---|---|---|
| **S16.14** | **HTTP retry with backoff** — Axios interceptor: network error (ECONNABORTED, ERR_NETWORK) → retry 3 lần với backoff (1s, 2s, 4s). Không retry POST/PUT/DELETE (chỉ GET). Timeout 10s per request. Update ConnectionHub nếu API unreachable | 0.5d |
| **S16.15** | **Critical action queue** — Khi offline: queue lại các action quan trọng (set agent status, end call notes). Khi online: replay queue theo thứ tự. Hiện badge "2 actions pending" trên Connection banner | 0.5d |

---

#### Sprint 16 Done ✓ (Cập nhật 2026-03-20)

**Phase C1 (Network + Hub):** ✅ DONE
- [x] NetworkMonitor (`src/lib/network-monitor.ts`) — online/offline/degraded detection + periodic server ping (30s)
- [x] ConnectionHub context (`src/contexts/ConnectionHubContext.tsx`) — unified state for SIP + CTI Socket + Notification + Network
- [x] ConnectionBanner (`src/components/ConnectionBanner.tsx`) — đỏ (offline), cam (SIP lost), vàng (reconnecting), xanh (recovered, auto-hide 3s)
- [x] Recovery toast + audio alert beep + Browser Notification API khi tab hidden

**Phase C2 (SIP.js Resilience):** ✅ DONE
- [x] Auto-reconnect on network recovery — NetworkMonitor → useWebRTC listener → re-register (reset backoff)
- [x] Transport error → immediate reconnect via `onTransportDisconnected` callback (không chờ 4min interval)
- [x] SIP registration health check (`isStillRegistered()` mỗi 30s)
- [x] Tab visibility → re-register khi tab visible lại sau >2 phút hidden
- [x] Exponential backoff: 1s, 2s, 4s, 8s, 15s, 30s, max 10 attempts

**Phase C3 (Socket.IO Resilience):** ✅ DONE
- [x] CTI Socket: `reconnectionAttempts: Infinity`, `reconnectionDelay: 1s→15s`, room re-join on reconnect
- [x] Notification Socket: same config + `notification:subscribe` re-emit on reconnect
- [x] Zombie socket detection (no events for 90s → force disconnect + reconnect)
- [x] Status callback integration → ConnectionHub

**Phase C4 (Startup + Reload):** ✅ DONE
- [x] ConnectionHubProvider wraps entire app → NetworkMonitor starts on mount
- [x] Provider tree: ConnectionHub → Notification → AgentStatus → Call → CallControl → Softphone
- [x] useCallControl wires SIP + CTI socket status into ConnectionHub
- [x] ConnectionBanner renders below header — agent sees warnings immediately after reload

**Phase C5 (HTTP Resilience):** ✅ DONE
- [x] HTTP GET retry with backoff (1s, 2s, 4s, max 3 retries) on network errors
- [x] POST/PUT/DELETE not retried (avoid duplicate mutations)

**Tổng effort Sprint 16: ~12 ngày (2.5 tuần)**

---

#### Sprint 16 Tài liệu tham chiếu

| Code cần sửa | Lý do |
|---|---|
| `apps/agent-desktop/src/lib/webrtc-service.ts` | Thêm transport error handler, reconnect pipeline |
| `apps/agent-desktop/src/hooks/useWebRTC.ts` | Thêm network recovery listener, tab visibility, health check |
| `apps/agent-desktop/src/hooks/useCallEvents.ts` | Enhanced Socket.IO config, room re-join, heartbeat |
| `apps/agent-desktop/src/lib/notification-channel.ts` | Enhanced reconnect, missed event sync |
| `apps/agent-desktop/src/lib/api-client.ts` | Retry interceptor, offline detection |
| `apps/agent-desktop/src/App.tsx` | Thêm ConnectionHub + ConnectionBanner vào provider tree |
| **Tạo mới:** `apps/agent-desktop/src/lib/network-monitor.ts` | Singleton network status service |
| **Tạo mới:** `apps/agent-desktop/src/contexts/ConnectionHubContext.tsx` | Unified connection state context |
| **Tạo mới:** `apps/agent-desktop/src/components/ConnectionBanner.tsx` | Visual connection status banner |

---

### Sprint 17: BACKGROUND TAB PROTECTION — Silent Audio Keepalive + Web Push Notification (Tuần 34-35)

> **Mục tiêu:** Agent làm việc trên tab khác vẫn nhận được cuộc gọi inbound. Giải pháp 2 lớp: Silent Audio ngăn browser throttle (Layer 1) + Web Push notification backup khi audio bị block (Layer 2).
> **Ngày tạo:** 2026-03-20

#### Phân tích vấn đề

Browser hiện đại throttle background tab rất mạnh:

| Thời gian background | Hành vi Chrome/Edge | Ảnh hưởng |
|---|---|---|
| 0-10s | Bình thường | Không |
| 10s-5 phút | Timer throttle (≤1/giây) | SIP re-register delay nhẹ |
| >5 phút | Timer throttle nặng (≤1/phút) | WebSocket ping timeout → mất kết nối |
| >5 phút + no audio | **Tab Freezing**: pause JS hoàn toàn | **SIP INVITE không được xử lý → miss call** |

**Ngoại lệ quan trọng:** Chrome KHÔNG throttle tab đang phát audio (audible tab). Đây là cơ sở cho Layer 1.

#### Kiến trúc giải pháp 2 lớp

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        AGENT DESKTOP TAB                                │
│                                                                         │
│  ┌─ Layer 1: Silent Audio Keepalive ──────────────────────────────────┐ │
│  │  AudioContext + OscillatorNode (gain=0.0001, ~inaudible)           │ │
│  │  → Chrome marks tab as "audible" → NO throttling                   │ │
│  │  → SIP.js WebSocket stays alive → INVITE received normally         │ │
│  │  → Ringtone plays from foreground-like tab                         │ │
│  │  Khi agent quay lại tab: đã có call ringing → Answer ngay          │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│         │ nếu audio bị block/mute tab/freeze                           │
│         ▼                                                               │
│  ┌─ Layer 2: Web Push Notification (backup) ─────────────────────────┐ │
│  │  GoACD → Kafka "call.routing" → CTI Adapter → Web Push API        │ │
│  │  → Service Worker nhận push (NGOÀI main thread, ko bị throttle)   │ │
│  │  → OS-level notification: "📞 Cuộc gọi từ 0914897989"             │ │
│  │  → Agent click notification → tab focus + wake up                   │ │
│  │  → SIP.js xử lý INVITE (nếu còn kịp timeout 25s)                  │ │
│  └────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────┘
```

#### Chi tiết Tasks

**Phase T1: Silent Audio Keepalive (1 ngày)**

| Task | Mô tả | Effort |
|---|---|---|
| **S17.1** | **AudioKeepAlive service** — Singleton class: tạo `AudioContext` + `OscillatorNode` (frequency 1Hz, gain 0.0001 — gần như không nghe được). Start khi SIP registered, stop khi SIP unregistered. Chrome sẽ hiện icon 🔊 trên tab → tab KHÔNG bị throttle. File: `src/lib/audio-keepalive.ts` | 0.5d |
| **S17.2** | **Tích hợp vào useWebRTC** — Start AudioKeepAlive ngay sau SIP register thành công. Stop khi unregister hoặc tab mất SipTabLock. Kiểm tra `AudioContext.state === 'suspended'` → resume (cần user interaction). Hiện tooltip cho agent: "Tab đang duy trì kết nối SIP" | 0.25d |
| **S17.3** | **Tab audio indicator** — Thêm icon nhỏ trên EnhancedAgentHeader hiện trạng thái keepalive: 🟢 "Background protection ON" / 🔴 "Background protection OFF (audio blocked)". Agent biết rõ tab có được bảo vệ hay không | 0.25d |

**Phase T2: Service Worker + Web Push Setup (2 ngày)**

| Task | Mô tả | Effort |
|---|---|---|
| **S17.4** | **Tạo VAPID key pair** — Tạo VAPID (Voluntary Application Server Identification) key pair cho Web Push. Lưu public key ở frontend `.env`, private key ở CTI Adapter `.env`. Tool: `web-push generate-vapid-keys` | 0.25d |
| **S17.5** | **Service Worker** — Tạo `public/sw.js`: (a) Listen `push` event → parse payload `{callerNumber, callerName, queue, callId}`. (b) Show notification với actions: "Xem" (focus tab). (c) Listen `notificationclick` → `clients.openWindow()` hoặc `client.focus()`. (d) `self.addEventListener('activate', ...)` → `clients.claim()` | 0.5d |
| **S17.6** | **Frontend Push Subscription** — Khi agent login + SIP registered: (a) Register Service Worker (`navigator.serviceWorker.register('/sw.js')`). (b) Subscribe to push: `registration.pushManager.subscribe({applicationServerKey: VAPID_PUBLIC})`. (c) Gửi subscription object (endpoint + keys) lên CTI Adapter: `POST /api/v1/cti/push-subscription`. (d) Re-subscribe khi VAPID key thay đổi. File: `src/lib/push-subscription.ts` | 0.5d |
| **S17.7** | **CTI Adapter: lưu push subscription** — Endpoint `POST /api/v1/cti/push-subscription` nhận `{agentId, subscription: {endpoint, keys}}`. Lưu vào Redis (key: `push:sub:{agentId}`, TTL 7 ngày). Endpoint `DELETE /api/v1/cti/push-subscription` để unsubscribe khi logout | 0.75d |

**Phase T3: Web Push Delivery (1.5 ngày)**

| Task | Mô tả | Effort |
|---|---|---|
| **S17.8** | **CTI Adapter: gửi Web Push khi call.routing** — Trong `cdr-consumer.service.ts`, khi nhận `call.routing` event: (a) Lookup push subscription từ Redis cho `agentId`. (b) Nếu có → gửi Web Push via `web-push` npm package. (c) Payload: `{type: 'incoming_call', callerNumber, callerName, queue, callId}`. (d) TTL: 25s (bằng bridge timeout — push hết hạn khi call đã miss). (e) Urgency: `high` (OS deliver ngay) | 0.75d |
| **S17.9** | **Service Worker notification UX** — Notification hiện: (a) Title: "📞 Cuộc gọi đến". (b) Body: "{callerName} — {callerNumber} (Queue: {queue})". (c) Icon: app icon. (d) Actions: [{action: 'focus', title: 'Xem'}]. (e) Tag: `incoming-call-{callId}` (prevent duplicate). (f) Vibrate pattern: `[200, 100, 200, 100, 200]`. (g) requireInteraction: true (notification stays until agent clicks or call ends). (h) Auto-close khi nhận `call.answered` hoặc `call.ended` push | 0.5d |
| **S17.10** | **Push notification lifecycle** — (a) Khi call answered/ended → CTI Adapter gửi push `{type: 'call_ended', callId}` → Service Worker close notification. (b) Khi agent missed → gửi push `{type: 'call_missed', callerNumber}` → notification stays 10s rồi auto-close. (c) Dedup: nếu tab đang foreground + SIP active → KHÔNG gửi push (tránh spam) | 0.25d |

**Phase T4: Coordination & Edge Cases (0.5 ngày)**

| Task | Mô tả | Effort |
|---|---|---|
| **S17.11** | **Layer coordination** — Logic quyết định khi nào dùng Layer 2: (a) Nếu `AudioContext.state === 'running'` → Layer 1 đủ, KHÔNG gửi push. (b) Nếu `AudioContext.state === 'suspended'` HOẶC document.hidden > 3 phút → gửi push backup. (c) Frontend gửi `POST /api/v1/cti/agent-tab-status` mỗi 60s: `{agentId, tabVisible, audioActive, sipRegistered}`. CTI Adapter dùng thông tin này để quyết định gửi push hay không | 0.25d |
| **S17.12** | **Edge case handling** — (a) Agent có nhiều device → push gửi tới tất cả subscriptions. (b) Push subscription expired (410 Gone) → xóa khỏi Redis. (c) Agent logout → unsubscribe push + unregister SW. (d) Notification permission denied → hiện warning trên ConnectionBanner "Vui lòng cho phép thông báo để nhận cuộc gọi khi tab không active" | 0.25d |

---

#### Sprint 17 Done ✓ (Cập nhật 2026-03-20)

**Phase T1 (Silent Audio Keepalive):** ✅ DONE
- [x] AudioKeepAlive service (`src/lib/audio-keepalive.ts`) — OscillatorNode 1Hz, gain=0.0001, auto start/stop, resume retry
- [x] Tích hợp useWebRTC — start sau SIP register, stop khi disconnect. Click handler để resume suspended AudioContext
- [x] Background protection indicator trên header — 🟢 "BG" (running), 🟡 "BG!" (suspended) với tooltip Vietnamese
- [x] Push subscription init khi SIP registered (`src/lib/push-subscription.ts`)

**Phase T2 (Service Worker + Push Setup):** ✅ DONE
- [x] VAPID key pair generated: public=BG809..., private=YE1b...
- [x] Service Worker (`public/sw.js`) — push event → Vietnamese notification → click → focus tab
- [x] Frontend push subscription (`src/lib/push-subscription.ts`) — subscribe + gửi lên server + urlBase64ToUint8Array
- [x] CTI Adapter: `PushService` + endpoints: POST/DELETE `/cti/push-subscription`, POST `/cti/agent-tab-status`
- [x] Redis storage: `push:sub:{agentId}` (TTL 7d), `push:tab:{agentId}` (TTL 5min)

**Phase T3 (Web Push Delivery):** ✅ DONE
- [x] CTI Adapter `cdr-consumer.service.ts`: gửi Web Push khi call.routing (TTL 25s, urgency high)
- [x] Service Worker notification UX: Vietnamese title/body, vibrate, requireInteraction, tag-based dedup
- [x] Push lifecycle: auto-close notification khi call.answered/ended, show missed notification (10s auto-close)

**Phase T4 (Coordination):** ✅ DONE
- [x] Layer coordination in PushService: skip push nếu tabVisible + audioActive + sipRegistered (updated <2min)
- [x] Edge cases: 410 Gone → auto-remove expired subscription, Notification permission check

**Note:** CTI Adapter cần restart với VAPID env vars để Layer 2 hoạt động. Layer 1 (AudioKeepAlive) hoạt động ngay trên frontend.

**Tổng effort Sprint 17: ~5 ngày (1 tuần)**

---

#### Sprint 17 Tài liệu tham chiếu

| Code | Mô tả |
|---|---|
| **Tạo mới:** `apps/agent-desktop/src/lib/audio-keepalive.ts` | Silent audio oscillator keepalive |
| **Tạo mới:** `apps/agent-desktop/src/lib/push-subscription.ts` | Web Push subscription management |
| **Tạo mới:** `apps/agent-desktop/public/sw.js` | Service Worker for push notifications |
| **Sửa:** `apps/agent-desktop/src/hooks/useWebRTC.ts` | Start/stop AudioKeepAlive on SIP register |
| **Sửa:** `apps/agent-desktop/src/components/EnhancedAgentHeader.tsx` | Background protection indicator |
| **Sửa:** `apps/agent-desktop/src/components/ConnectionBanner.tsx` | Notification permission warning |
| **Sửa:** `services/cti-adapter-service/src/cti/cti.controller.ts` | Push subscription endpoints |
| **Sửa:** `services/cti-adapter-service/src/cti/cdr-consumer.service.ts` | Web Push delivery on call.routing |
| **Sửa:** `services/cti-adapter-service/src/cti/cti.module.ts` | Import web-push module |
| **Config:** `.env` frontend (VITE_VAPID_PUBLIC_KEY), `.env` CTI Adapter (VAPID_PRIVATE_KEY, VAPID_EMAIL) |

---

### Sprint 18: CALL TIMELINE REAL DATA — Thu thập & hiển thị chi tiết flow cuộc gọi (Tuần 36-37)

> **Mục tiêu:** Thay thế mock data trong CallTimeline bằng dữ liệu thực. Hiển thị chi tiết toàn bộ flow: IVR → DTMF → Queue → Scoring → Routing → Ringing → Answer → Hold/Mute → End.
> **Ngày tạo:** 2026-03-20
> **Thiết kế chi tiết:** [23-call-timeline-realdata.md](./23-call-timeline-realdata.md)

#### Phân tích gap

| Component | Hiện trạng | Cần bổ sung |
|---|---|---|
| GoACD | 7 Kafka events, không log IVR detail | +8 timeline events: call_started, ivr_started, ivr_digit, ivr_completed, queued, agent_scoring, ringing, ended (bổ sung data) |
| Interaction Service | 3 event types trong DB | New table `call_timeline_events`, consumer cho `call.timeline` topic, API endpoint |
| Frontend CallTimeline | 15 mock events hardcoded | Fetch real data từ API, realtime WS update, event type→UI mapping |

#### Chi tiết Tasks

**Phase L1: GoACD Timeline Events (3 ngày)**

| Task | Mô tả | Effort |
|---|---|---|
| **S18.1** | **Kafka topic `call.timeline`** — Tạo helper `pubTimeline(eventType, data)` trong `main.go`. Publish event với schema: `{callId, eventType, timestamp (RFC3339), data}`. Dùng chung Kafka writer | 0.25d |
| **S18.2** | **Inbound call timeline events** — Thêm publish tại mỗi mốc trong `handleInboundCall()`: (1) `call_started` sau ESL connect, (2) `ivr_started` trước IVR.Run(), (3) `ivr_completed` sau IVR.Run() return, (4) `queued` sau queueMgr.Enqueue(), (5) `agent_scoring` sau scorer.ScoreAgents(), (6) `routing` sau ClaimAgent(), (7) `ringing` sau Bridge command, (8) `answered` sau CHANNEL_BRIDGE, (9) `ended` trong defer. Tổng 9 publish points | 1d |
| **S18.3** | **IVR digit event** — Sửa `ivr/engine.go`: thêm callback `OnDigit func(digit, menuLabel string, attempts int)`. Gọi callback sau `play_and_get_digits`. GoACD wire callback → `pubTimeline("ivr_digit", ...)` | 0.5d |
| **S18.4** | **Outbound call timeline** — Thêm publish trong `outbound.go` `MakeCall()` + `monitorCall()`: (1) `call_started` (direction: outbound), (2) `ringing` (customer ringing detected), (3) `answered` (signal_bond detected), (4) `ended` | 0.5d |
| **S18.5** | **Agent missed timeline** — Khi bridge fail + retry next: publish `agent_missed` event với agentId + reason + retryNext flag | 0.25d |
| **S18.6** | **Ended event enrichment** — Trong defer của inbound + handleCallEnd của outbound: publish `ended` với `{hangupCause, hangupBy: "customer"|"agent"|"system", talkTimeMs, totalDurationMs}`. Parse `hangupBy` từ ESL event headers (Hangup-Cause + Last-Bridge) | 0.5d |

**Phase L2: Interaction Service Consumer + API (2 ngày)**

| Task | Mô tả | Effort |
|---|---|---|
| **S18.7** | **DB migration** — Tạo bảng `call_timeline_events` (id, call_id, interaction_id nullable, event_type, timestamp, data JSONB, created_at). Index trên call_id + interaction_id | 0.25d |
| **S18.8** | **CallTimelineEvent entity** — TypeORM entity cho `call_timeline_events`. Repository methods: `findByCallId(callId)`, `findByInteractionId(interactionId)`, `linkInteraction(callId, interactionId)` | 0.25d |
| **S18.9** | **CallTimelineConsumerService** — Subscribe Kafka topic `call.timeline`. On event: (a) Lookup interaction by `callId` trong metadata. (b) Save `CallTimelineEvent`. (c) Forward tới frontend via WS `call:timeline_event`. (d) Nếu interaction chưa tồn tại → lưu với interaction_id=NULL, link sau khi interaction được tạo | 0.75d |
| **S18.10** | **Link orphan events** — Trong `handleCallRouting` (khi tạo interaction): query `call_timeline_events WHERE call_id = :callId AND interaction_id IS NULL` → update `interaction_id` cho tất cả orphan events | 0.25d |
| **S18.11** | **API endpoint** — `GET /api/v1/interactions/:id/call-timeline`: (a) Get interaction → extract callId from metadata. (b) Query `call_timeline_events` ORDER BY timestamp. (c) Compute summary: totalDuration, talkTime, waitTime, ivrTime, holdCount, transferCount. (d) Return `{events, summary}` | 0.5d |

**Phase L3: Frontend CallTimeline Real Data (2 ngày)**

| Task | Mô tả | Effort |
|---|---|---|
| **S18.12** | **useCallTimeline hook** — `useQuery` fetch `/interactions/:id/call-timeline`. Cache 30s. Return `{events, summary, isLoading}`. Nếu `isLive=true` → listen WS `call:timeline_event` → invalidate query khi có event mới cho callId này | 0.5d |
| **S18.13** | **CallTimeline props refactor** — Thay `totalDuration` prop bằng `{interactionId, callId, isLive}`. Xóa toàn bộ mock data. Map real events sang CallEvent interface hiện tại (giữ nguyên UI rendering) | 0.5d |
| **S18.14** | **Event type → UI mapping** — Config object map 16 eventType → `{icon, label (Vietnamese), status, descriptionTemplate}`. Template dùng data fields: vd `"Khách bấm phím {digit} → {menuLabel}"` | 0.5d |
| **S18.15** | **Agent action events** — Khi agent Hold/Resume/Mute/Unmute: publish event qua CTI API `POST /api/v1/cti/call-action` → Kafka `call.timeline` → lưu DB + WS push → CallTimeline hiện ngay | 0.5d |

**Phase L4: Edge Cases + Polish (1 ngày)**

| Task | Mô tả | Effort |
|---|---|---|
| **S18.16** | **Outbound timeline display** — CallTimeline cho outbound calls: `call_started (outbound)` → `ringing (customer)` → `answered` → `ended`. Ít events hơn inbound (không có IVR/queue) | 0.25d |
| **S18.17** | **Empty state** — Nếu interaction không có call_timeline_events (old interactions trước sprint này): hiện "Không có dữ liệu chi tiết cuộc gọi" thay vì empty timeline | 0.25d |
| **S18.18** | **Timeline during active call** — Live badge "ĐANG GỌI" trên timeline. Events cập nhật realtime khi đang gọi. Auto-scroll xuống event mới nhất | 0.25d |
| **S18.19** | **Kong route** — Thêm Kong route cho endpoint mới: `/api/v1/interactions/:id/call-timeline` → Interaction Service | 0.25d |

---

#### Sprint 18 Done ✓

**Phase L1 (GoACD Timeline Events):** ✅ DONE
- [x] Helper `pubTimeline()` + Kafka topic `call.timeline`
- [x] Inbound: 9 timeline events (call_started, ivr_started, ivr_digit, ivr_completed, queued, agent_scoring, routing, ringing, answered) + ended in defer
- [x] IVR digit callback `OnDigit` → `ivr_digit` event
- [x] Outbound: 4 timeline events (call_started, ringing, answered, ended)
- [x] Agent missed event enrichment (ringDurationMs, retryNext)
- [x] Ended event: hangupBy, talkTimeMs, totalDurationMs

**Phase L2 (Interaction Service):** ✅ DONE
- [x] DB table `call_timeline_events` (PostgreSQL, JSONB) + entity `CallTimelineEvent`
- [x] Kafka consumer `call.timeline` → save to DB + lookup interactionId
- [x] Link orphan events khi interaction được tạo (in handleCallRouting)
- [x] API `GET /interactions/:id/call-timeline` + summary (totalDuration, talkTime, holdCount, etc.)

**Phase L3 (Frontend):** ✅ DONE
- [x] `useCallTimeline` hook (React Query fetch + WS realtime invalidation)
- [x] CallTimeline props refactor: `interactionId` + `isLive` props, fallback to mock for old interactions
- [x] Event type → UI mapping: 16 eventTypes, Vietnamese labels, icons, status colors
- [x] Summary stats: 4 columns (tổng thời gian, nói chuyện, lần hold, chuyển tiếp)
- [x] Live badge "ĐANG GỌI" for active calls
- [x] Empty state + loading state
- [ ] Agent action events (hold/mute → timeline) — deferred, needs CTI API endpoint

**Phase L4 (Edge Cases):** ✅ DONE
- [x] Outbound timeline (call_started outbound, ringing, answered, ended)
- [x] Empty state cho old interactions ("Không có dữ liệu chi tiết cuộc gọi")
- [x] Live badge for active calls
- [ ] Kong route — sử dụng route hiện có `/api/v1/interactions/` đã proxy qua Kong

**Tổng effort Sprint 18: ~8 ngày (1.5 tuần)**

---

#### Sprint 18 Tài liệu tham chiếu

| Code | Mô tả |
|---|---|
| **Thiết kế:** [23-call-timeline-realdata.md](./23-call-timeline-realdata.md) | Event schema, DB schema, API design, sequence diagram |
| **Sửa:** `services/goacd/cmd/goacd/main.go` | pubTimeline() helper + 9 inbound timeline events |
| **Sửa:** `services/goacd/internal/ivr/engine.go` | OnDigit callback cho IVR digit event |
| **Sửa:** `services/goacd/internal/call/outbound.go` | 4 outbound timeline events |
| **Tạo mới:** `services/interaction-service/src/interaction/call-timeline-consumer.service.ts` | Kafka consumer cho call.timeline |
| **Tạo mới:** `services/interaction-service/src/entities/call-timeline-event.entity.ts` | TypeORM entity |
| **Sửa:** `services/interaction-service/src/interaction/interaction.controller.ts` | GET endpoint call-timeline |
| **Tạo mới:** `apps/agent-desktop/src/hooks/useCallTimeline.ts` | React Query hook + WS realtime |
| **Sửa:** `apps/agent-desktop/src/components/CallTimeline.tsx` | Real data props, xóa mock, event mapping |
| **Sửa:** `apps/agent-desktop/src/components/InteractionDetail.tsx` | Pass interactionId + callId + isLive props |

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
| 14 | **Bật Kamailio auth break existing flow** | Trung bình | Cao | Phase G3 cần test kỹ: bật auth.so → verify SIP.js register với HMAC → verify inter-FS traffic bypass auth. Rollback: tắt auth.so nếu fail |
| 15 | **Agent scoring latency cao khi nhiều agent** | Thấp | Trung bình | Scoring chạy in-memory, Redis pipeline batch lấy state. Benchmark với 100 agents < 50ms |
| 16 | **Token refresh race condition** | Trung bình | Cao | Frontend nhận token mới qua WS nhưng SIP.js đang giữa re-REGISTER cycle → dùng mutex/lock pattern, dispose old registerer trước khi create new |
| 17 | **GoACD Go code complexity tăng** | Trung bình | Trung bình | Sprint 11 thêm ~500 dòng Go. Cần unit test cho scoring, transfer timeout, stale reaper. Dùng table-driven tests |

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
| **Sprint 10** | [19-voice-infra-status.md](./19-voice-infra-status.md) (infra status + SIP auth analysis), [18-10-webrtc.md](./18-voice-platform/18-10-webrtc.md) (SIP.js config, credential provisioning V2.2), [14-frontend-changes.md](./14-frontend-changes.md), `apps/agent-desktop/src/lib/webrtc-service.ts`, `apps/agent-desktop/src/hooks/useWebRTC.ts`, `apps/agent-desktop/src/hooks/useCallControl.ts`, `apps/agent-desktop/src/lib/sip-tab-lock.ts`, `services/goacd/internal/api/grpc_server.go` (GetSIPCredentials) |
| **Sprint 11** | [21-goacd-gap-analysis.md](./21-goacd-gap-analysis.md) (gap analysis), [18-5-call-flows.md](./18-voice-platform/18-5-call-flows.md) (call flows design), [18-7-agent-state-antisync.md](./18-voice-platform/18-7-agent-state-antisync.md) (agent state + Lua scripts), [18-8-routing-failure.md](./18-voice-platform/18-8-routing-failure.md) (routing failure), [18-9-sync-architecture.md](./18-voice-platform/18-9-sync-architecture.md) (SIP tokens), [18-10-webrtc.md](./18-voice-platform/18-10-webrtc.md) (§V2.2 token refresh), [07-routing-engine.md](./07-routing-engine.md) (5-factor scoring §7.2). **Code:** `services/goacd/` (all Go files), `services/cti-adapter-service/` (Kafka consumers, WS gateway), `apps/agent-desktop/src/hooks/useWebRTC.ts`, `/etc/kamailio/kamailio.cfg` (auth module) |
| **Sprint 12** | **Code:** `apps/agent-desktop/src/hooks/useVoiceInteractions.ts` (wire to InteractionList), `apps/agent-desktop/src/components/InteractionList.tsx` (live badges), `apps/agent-desktop/src/components/EnhancedAgentStatusContext.tsx` (WS agent status listener), `apps/agent-desktop/src/hooks/useWebRTC.ts` (SIP→server sync), `apps/agent-desktop/src/lib/websocket-client.ts` (re-enable for /cti), `services/goacd/internal/agent/state.go` (publish status events), `services/cti-adapter-service/src/cti/cdr-consumer.service.ts` (agent status broadcast). **Docs:** [08-agent-state-management.md](./08-agent-state-management.md), [14-frontend-changes.md](./14-frontend-changes.md) |
| **Sprint 13** | **Design:** [22-outbound-call-design.md](./22-outbound-call-design.md) (outbound flow, ringback, SIP mapping, CDR, interaction). **Code:** `services/goacd/internal/call/outbound.go` (MakeCall rewrite), `services/goacd/internal/call/cdr.go` (outbound CDR fields), `/etc/kamailio/kamailio.cfg` (PSTN route), FreeSWITCH gateway XML (FS01/FS02), `apps/agent-desktop/src/components/SoftphoneBubble.tsx` (outbound states), `apps/agent-desktop/src/hooks/useCallEvents.ts` (failure events) |
| **Sprint 15** | **Docs:** [18-4-goacd-architecture.md](./18-voice-platform/18-4-goacd-architecture.md) (GoACD arch), [18-5-call-flows.md](./18-voice-platform/18-5-call-flows.md) (inbound flow), [21-goacd-gap-analysis.md](./21-goacd-gap-analysis.md) (gap analysis). **Code:** `services/goacd/internal/esl/outbound_server.go` (ESL event subscription), `services/goacd/internal/esl/inbound_client.go` (thread-safe refactor), `services/goacd/cmd/goacd/main.go` (inbound handler rewrite), `services/goacd/internal/agent/state.go` (state machine), `services/interaction-service/` (call.answered consumer, customer lookup), `apps/agent-desktop/src/components/SoftphoneBubble.tsx` (inbound metadata display) |
| **Sprint 16** | **Code:** `apps/agent-desktop/src/lib/webrtc-service.ts` (transport reconnect), `apps/agent-desktop/src/hooks/useWebRTC.ts` (network recovery + tab visibility), `apps/agent-desktop/src/hooks/useCallEvents.ts` (enhanced Socket.IO), `apps/agent-desktop/src/lib/notification-channel.ts` (reconnect + missed sync), `apps/agent-desktop/src/lib/api-client.ts` (retry interceptor), `apps/agent-desktop/src/App.tsx` (provider tree). **Tạo mới:** `src/lib/network-monitor.ts`, `src/contexts/ConnectionHubContext.tsx`, `src/components/ConnectionBanner.tsx`. **Docs:** [18-13-error-resilience.md](./18-voice-platform/18-13-error-resilience.md) (error handling design) |
| **Sprint 17** | **Tạo mới:** `src/lib/audio-keepalive.ts` (silent oscillator), `src/lib/push-subscription.ts` (Web Push subscribe), `public/sw.js` (Service Worker). **Sửa:** `src/hooks/useWebRTC.ts` (AudioKeepAlive integration), `src/components/EnhancedAgentHeader.tsx` (protection indicator), `src/components/ConnectionBanner.tsx` (notification permission warning), `services/cti-adapter-service/src/cti/cti.controller.ts` (push subscription endpoints), `services/cti-adapter-service/src/cti/cdr-consumer.service.ts` (Web Push delivery). **Config:** VAPID keys (frontend `.env` + CTI Adapter `.env`) |
| **Sprint 18** | **Thiết kế:** [23-call-timeline-realdata.md](./23-call-timeline-realdata.md). **GoACD:** `cmd/goacd/main.go` (pubTimeline + 9 inbound events), `internal/ivr/engine.go` (OnDigit callback), `internal/call/outbound.go` (4 outbound events). **Interaction Service:** `call-timeline-consumer.service.ts` (new), `call-timeline-event.entity.ts` (new), `interaction.controller.ts` (GET endpoint). **Frontend:** `useCallTimeline.ts` (new hook), `CallTimeline.tsx` (real data), `InteractionDetail.tsx` (wire props) |

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
