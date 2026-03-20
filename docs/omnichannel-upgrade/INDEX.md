# Omnichannel Contact Center Upgrade — Documentation Index

> **Start here.** This is the master index for the omnichannel upgrade documentation.
> All content originates from `OMNICHANNEL-UPGRADE-PLAN.md` (V1) and `OMNICHANNEL-UPGRADE-PLAN-V2.md` (V2), restructured into modular files.
> PBX integration focuses on **Kamailio + FreeSWITCH + GoACD** (open-source stack).
> **Last updated:** 2026-03-20

---

## Active Implementation Plan

> **[VOICE-IMPLEMENTATION-PLAN.md](./VOICE-IMPLEMENTATION-PLAN.md)** — Kế hoạch triển khai Voice Channel (14 tuần, 9 sprint)
> Ưu tiên #1: Hoàn thiện kênh voice end-to-end (hạ tầng + backend + GoACD + frontend WebRTC)

> **[19-voice-infra-status.md](./19-voice-infra-status.md)** — Hiện trạng hạ tầng Voice & Kế hoạch triển khai Softphone (2026-03-19)
> Kết quả kiểm tra Kamailio/rtpengine/coturn/FreeSWITCH, phân tích SIP auth flow, task list triển khai softphone SIP.js

> **[20-deployed-infrastructure.md](./20-deployed-infrastructure.md)** — Toàn bộ hạ tầng đã triển khai (2026-03-19)
> Docker containers, 20 NestJS services, Kong routes, PostgreSQL 26 DBs, Kafka 15 topics, Nginx proxy, firewall, user accounts, voice infra

---

## Quick Find

| Looking for... | Go to |
|---|---|
| What exists today (services, gaps) | [01-current-state-analysis.md](./01-current-state-analysis.md), [02-gap-analysis.md](./02-gap-analysis.md) |
| Requirements (R1-R17) | [03-requirements.md](./03-requirements.md) |
| Overall architecture diagram | [04-target-architecture.md](./04-target-architecture.md) |
| New services (MS-20 Gateway, MS-21 Routing) | [05-new-services.md](./05-new-services.md) |
| Channel adapter plugin interface | [06-channel-adapter-architecture.md](./06-channel-adapter-architecture.md) |
| Routing / scoring / queues / SLA | [07-routing-engine.md](./07-routing-engine.md) |
| Agent state (Redis structures, capacity) | [08-agent-state-management.md](./08-agent-state-management.md) |
| Voice channel overview | [09-channel-designs/09-1-voice-channel.md](./09-channel-designs/09-1-voice-channel.md) |
| Email channel | [09-channel-designs/09-2-email-channel.md](./09-channel-designs/09-2-email-channel.md) |
| Social channels (Facebook, Zalo, WhatsApp) | [09-channel-designs/09-3-social-channels.md](./09-channel-designs/09-3-social-channels.md) |
| SMS channel | [09-channel-designs/09-4-sms-channel.md](./09-channel-designs/09-4-sms-channel.md) |
| Live Chat widget | [09-channel-designs/09-5-livechat-channel.md](./09-channel-designs/09-5-livechat-channel.md) |
| IVR / Email / Chat flow designer | [10-flow-designer-engine.md](./10-flow-designer-engine.md) |
| TypeScript types & entities | [11-type-system.md](./11-type-system.md) |
| Performance / scaling targets | [12-performance-architecture.md](./12-performance-architecture.md) |
| Admin UI pages | [13-admin-ui.md](./13-admin-ui.md) |
| Agent Desktop frontend changes | [14-frontend-changes.md](./14-frontend-changes.md) |
| Sprint plan / timeline | [15-implementation-plan.md](./15-implementation-plan.md) |
| Risks | [16-risk-assessment.md](./16-risk-assessment.md) |
| Requirement → section mapping | [17-requirements-crossref.md](./17-requirements-crossref.md) |
| **Voice Platform (Kamailio + FreeSWITCH + GoACD)** | [18-voice-platform/README.md](./18-voice-platform/README.md) |
| **Voice Infra Status & Softphone Plan** | [19-voice-infra-status.md](./19-voice-infra-status.md) |
| **Full Deployed Infrastructure Inventory** | [20-deployed-infrastructure.md](./20-deployed-infrastructure.md) |
| **GoACD Gap Analysis (Design vs Code)** | [21-goacd-gap-analysis.md](./21-goacd-gap-analysis.md) |
| **Outbound Call Design (routing, ringback, CDR)** | [22-outbound-call-design.md](./22-outbound-call-design.md) |
| **Call Timeline Real Data (IVR, queue, scoring, events)** | [23-call-timeline-realdata.md](./23-call-timeline-realdata.md) |
| Kamailio / SIP proxy config | [18-voice-platform/18-2a-kamailio-config.md](./18-voice-platform/18-2a-kamailio-config.md) |
| rtpengine / media relay | [18-voice-platform/18-2b-rtpengine-config.md](./18-voice-platform/18-2b-rtpengine-config.md) |
| FreeSWITCH / media server | [18-voice-platform/18-2c-freeswitch-config.md](./18-voice-platform/18-2c-freeswitch-config.md) |
| GoACD evaluation (why custom ACD) | [18-voice-platform/18-3-acd-evaluation.md](./18-voice-platform/18-3-acd-evaluation.md) |
| GoACD architecture (gRPC, protobuf, Redis, Go) | [18-voice-platform/18-4-goacd-architecture.md](./18-voice-platform/18-4-goacd-architecture.md) |
| Call flows (inbound, transfer, internal) | [18-voice-platform/18-5-call-flows.md](./18-voice-platform/18-5-call-flows.md) |
| IVR via FreeSWITCH ESL | [18-voice-platform/18-6-ivr-architecture.md](./18-voice-platform/18-6-ivr-architecture.md) |
| Agent state anti-desync (Lua, heartbeat) | [18-voice-platform/18-7-agent-state-antisync.md](./18-voice-platform/18-7-agent-state-antisync.md) |
| Call routing failure / no-answer | [18-voice-platform/18-8-routing-failure.md](./18-voice-platform/18-8-routing-failure.md) |
| Extension sync / SIP tokens / DB sync | [18-voice-platform/18-9-sync-architecture.md](./18-voice-platform/18-9-sync-architecture.md) |
| WebRTC browser integration | [18-voice-platform/18-10-webrtc.md](./18-voice-platform/18-10-webrtc.md) |
| Real-time event pipeline | [18-voice-platform/18-11-event-pipeline.md](./18-voice-platform/18-11-event-pipeline.md) |
| Data mapping (SIP ↔ Omnichannel) | [18-voice-platform/18-12-data-mapping.md](./18-voice-platform/18-12-data-mapping.md) |
| Error handling / HA / circuit breakers | [18-voice-platform/18-13-error-resilience.md](./18-voice-platform/18-13-error-resilience.md) |
| Performance hardening (goroutines, DTMF, caching) | [18-voice-platform/18-14-performance-ops.md](./18-voice-platform/18-14-performance-ops.md) |
| Docker infrastructure (voice) | [18-voice-platform/18-15-docker-infra.md](./18-voice-platform/18-15-docker-infra.md) |
| File change inventory | [appendix/appendix-a-file-changes.md](./appendix/appendix-a-file-changes.md) |
| V1 vs V2 comparison | [appendix/appendix-c-v1-v2-comparison.md](./appendix/appendix-c-v1-v2-comparison.md) |
| Docker port mapping | [appendix/appendix-d-docker-ports.md](./appendix/appendix-d-docker-ports.md) |

---

## Full Section Listing

### Foundation & Cross-Channel

| # | File | Description | Key Content |
|---|---|---|---|
| 01 | [current-state-analysis.md](./01-current-state-analysis.md) | Existing services — what exists and what's missing | MS-2 Agent, MS-3 Interaction, MS-6 Notification, MS-19 CTI, Frontend |
| 02 | [gap-analysis.md](./02-gap-analysis.md) | Feature gap matrix + code-level gaps | 23 feature gaps, 9 code-level gaps |
| 03 | [requirements.md](./03-requirements.md) | User requirements with priorities | R1-R17, P0/P1/P2 classification |
| 04 | [target-architecture.md](./04-target-architecture.md) | Architecture diagram, infrastructure additions | Channel Gateway → Routing Engine → Agent State flow |
| 05 | [new-services.md](./05-new-services.md) | New microservices | MS-20 Channel Gateway, MS-21 Routing Engine, Live Chat Widget |

### Channel & Adapter Design

| # | File | Description | Key Content |
|---|---|---|---|
| 06 | [channel-adapter-architecture.md](./06-channel-adapter-architecture.md) | Plugin architecture | IChannelAdapter interface, ChannelMessage format, adapter registry, built-in adapters |
| 07 | [routing-engine.md](./07-routing-engine.md) | Routing & scoring | 5-step routing flow, agent scoring (5 factors), Redis queues, SLA enforcement |
| 08 | [agent-state-management.md](./08-agent-state-management.md) | Agent state in Redis | State hash, skills index, available sets, capacity model, 6-step sync protocol |
| 09 | [09-channel-designs/](./09-channel-designs/README.md) | Channel-specific designs | 5 sub-files: Voice, Email, Social, SMS, Live Chat |

### Frontend & Admin

| # | File | Description | Key Content |
|---|---|---|---|
| 10 | [flow-designer-engine.md](./10-flow-designer-engine.md) | Flow designer engine | IVR/Email/Chat flow graphs, 25+ node types, FlowExecutor state machine |
| 11 | [type-system.md](./11-type-system.md) | Expanded type system | ChannelType, SubChannel, InteractionType, updated entities, new AgentGroup/SkillDefinition |
| 12 | [performance-architecture.md](./12-performance-architecture.md) | Performance & scaling | Hot/warm/cold paths, throughput targets, WebSocket consolidation (5 namespaces) |
| 13 | [admin-ui.md](./13-admin-ui.md) | Admin UI requirements | Flow designers (React Flow), group/skill CRUD, channel config, chat widget designer |
| 14 | [frontend-changes.md](./14-frontend-changes.md) | Agent Desktop changes | Expanded filters, WebRTC softphone, unified WebSocket, new React Query hooks |

### Planning & Risk

| # | File | Description | Key Content |
|---|---|---|---|
| 15 | [implementation-plan.md](./15-implementation-plan.md) | Phased sprint plan | 5 phases, 24 weeks, Kamailio/FS/GoACD timeline |
| 16 | [risk-assessment.md](./16-risk-assessment.md) | Risk matrix | 16 risks with probability/impact/mitigation |
| 17 | [requirements-crossref.md](./17-requirements-crossref.md) | Traceability matrix | R1-R17 → section/phase mapping |

### Voice Platform — Kamailio + FreeSWITCH + GoACD (Section 18)

> All voice platform files are in [`18-voice-platform/`](./18-voice-platform/README.md).
> **Design philosophy:** Omnichannel is the MASTER system. GoACD has full control over every voice interaction. FreeSWITCH is a "dumb" media server via ESL. Kamailio is a stateless SIP proxy + WebRTC gateway.

| File | Description | Key Content |
|---|---|---|
| [README.md](./18-voice-platform/README.md) | Voice platform overview & navigation | Design philosophy, component summary, links to all sub-files |
| [18-1-architecture-overview.md](./18-voice-platform/18-1-architecture-overview.md) | Architecture diagram | Signal/media path: PSTN/WebRTC → Kamailio → FS → GoACD → NestJS |
| [18-2-component-roles.md](./18-voice-platform/18-2-component-roles.md) | Component responsibilities | Kamailio modules, rtpengine media relay, FreeSWITCH ESL, GoACD overview |
| [18-2a-kamailio-config.md](./18-voice-platform/18-2a-kamailio-config.md) | Kamailio detailed config | Complete kamailio.cfg, TLS, dispatcher, keepalived HA, dSIPRouter setup |
| [18-2b-rtpengine-config.md](./18-voice-platform/18-2b-rtpengine-config.md) | rtpengine config | Startup flags, kernel vs userspace, codec matrix, monitoring, HA |
| [18-2c-freeswitch-config.md](./18-voice-platform/18-2c-freeswitch-config.md) | FreeSWITCH config | modules.conf, ESL, SIP profiles, ACL, MOH, recording, dialplan, HA |
| [18-3-acd-evaluation.md](./18-voice-platform/18-3-acd-evaluation.md) | ACD solution evaluation | 6 options compared, decision: custom Go ACD (GoACD) |
| [18-4-goacd-architecture.md](./18-voice-platform/18-4-goacd-architecture.md) | GoACD architecture | gRPC API, protobuf, Go types, Redis model, concurrency, lifecycle, testing, Docker |
| [18-5-call-flows.md](./18-voice-platform/18-5-call-flows.md) | Call flow designs | Inbound, outbound (atomic claim), blind/attended/queue transfer, cross-FS, internal |
| [18-6-ivr-architecture.md](./18-voice-platform/18-6-ivr-architecture.md) | IVR via ESL | Flow schema, node types, execution engine, DTMF, TTS, MOH |
| [18-7-agent-state-antisync.md](./18-voice-platform/18-7-agent-state-antisync.md) | Agent state & anti-desync | State machine, Lua atomic scripts (claim/release), 4-layer detection, reconciliation |
| [18-8-routing-failure.md](./18-voice-platform/18-8-routing-failure.md) | Routing & failure handling | Top-N scoring, no-answer re-routing, queue overflow waterfall, disconnect handling |
| [18-9-sync-architecture.md](./18-voice-platform/18-9-sync-architecture.md) | Sync architecture | Extension allocation, ephemeral SIP tokens, cross-DB sync, queue/CDR/recording sync |
| [18-10-webrtc.md](./18-voice-platform/18-10-webrtc.md) | WebRTC integration | SIP.js config, DTLS/SRTP, ICE/TURN, codec negotiation, multi-tab protection |
| [18-11-event-pipeline.md](./18-voice-platform/18-11-event-pipeline.md) | Real-time events | 22 Kafka topics, Redis Pub/Sub, gRPC→WebSocket chain, delivery guarantees |
| [18-12-data-mapping.md](./18-voice-platform/18-12-data-mapping.md) | Data mapping tables | PostgreSQL schemas: agent_extensions, queues, cdrs |
| [18-13-error-resilience.md](./18-voice-platform/18-13-error-resilience.md) | Error handling & HA | Leader election, in-flight recovery, circuit breakers, degraded mode |
| [18-14-performance-ops.md](./18-voice-platform/18-14-performance-ops.md) | Performance & ops hardening | Goroutine management, Prometheus alerts, connection pools, DTMF, caching |
| [18-15-docker-infra.md](./18-voice-platform/18-15-docker-infra.md) | Docker infrastructure | docker-compose.yml, all services, env vars, volumes, networks, health checks |

### Voice Infrastructure Status & Softphone Deployment

| # | File | Description | Key Content |
|---|---|---|---|
| 19 | [19-voice-infra-status.md](./19-voice-infra-status.md) | Voice infra verification + softphone deployment plan | Kamailio/rtpengine/coturn/FS status, SIP auth flow analysis, 16 tasks for softphone MVP |
| 20 | [20-deployed-infrastructure.md](./20-deployed-infrastructure.md) | Full deployed infrastructure inventory | Docker, 20 NestJS services, Kong routes, 26 DBs, Kafka topics, Nginx, firewall, user accounts |
| 21 | [21-goacd-gap-analysis.md](./21-goacd-gap-analysis.md) | GoACD Design vs Implementation Gap Analysis | 7 areas analyzed, CRITICAL: outbound no bridge, HIGH: no scoring/re-route/metadata push |
| 22 | [22-outbound-call-design.md](./22-outbound-call-design.md) | Outbound Call Design | Flow, ringback, SIP→status mapping, CDR fields, Kamailio route, FS gateway, interaction history |
| 23 | [23-call-timeline-realdata.md](./23-call-timeline-realdata.md) | Call Timeline Real Data | Event schema (16 types), DB schema, API design, GoACD publish points, frontend mapping, sequence diagram |

### Appendices

| File | Description |
|---|---|
| [appendix-a-file-changes.md](./appendix/appendix-a-file-changes.md) | Inventory of files to create/modify across the codebase |
| [appendix-c-v1-v2-comparison.md](./appendix/appendix-c-v1-v2-comparison.md) | V1 (PortSIP) vs V2 (Kamailio+FS+GoACD) comparison matrix |
| [appendix-d-docker-ports.md](./appendix/appendix-d-docker-ports.md) | Complete port mapping for all Docker services |

---

## How to Use This Documentation

### For AI Agents (Claude Code) — QUAN TRỌNG: Đọc khi mở phiên mới

**Mỗi khi bắt đầu phiên làm việc mới, Claude Code PHẢI đọc:**
1. **File này (INDEX.md)** — để nắm toàn bộ cấu trúc tài liệu và task đang chờ
2. **[20-deployed-infrastructure.md](./20-deployed-infrastructure.md)** — để biết hạ tầng đã triển khai: 20 NestJS services, ports, Docker containers, DBs, Kong routes, user accounts, voice infra
3. **[VOICE-IMPLEMENTATION-PLAN.md](./VOICE-IMPLEMENTATION-PLAN.md)** (section 5 + Sprint hiện tại) — để biết task nào đang thực hiện
4. **Claude Code memory** (`/root/.claude/projects/...`) — để recall context từ phiên trước

**Khi thực hiện task cụ thể:**
5. **Read only the specific file** relevant to your task — each file is self-contained with enough context
6. **Follow "Related Files" links** at the bottom of each file if you need more context
7. **When modifying a feature**: read the feature file + its related files, never need to read all files
8. **Voice platform changes**: start from [18-voice-platform/README.md](./18-voice-platform/README.md)

**Task đang chờ triển khai (cập nhật 2026-03-19):**
- **Sprint 10: DONE** — Softphone wired, SIP registration verified
- **Sprint 11 Phase G1-G3: DONE** — Outbound via GoACD, 5-factor scoring, transfer state, 8 Kafka events
- **Sprint 12: DONE** — Real-time state sync + SoftphoneBubble
- **Sprint 13: DONE** — Outbound via GoACD, telco simulator, FS gateway, Kamailio PSTN route
- **Sprint 15: NEXT** — GoACD Inbound Overhaul: ESL event-driven, bridge detection, call end, metadata, state machine. 17 tasks, 5 phases, ~17 ngày

### For Developers
- **Planning**: Start with [03-requirements.md](./03-requirements.md) → [15-implementation-plan.md](./15-implementation-plan.md)
- **Backend implementation**: [05-new-services.md](./05-new-services.md) → [06-channel-adapter-architecture.md](./06-channel-adapter-architecture.md) → specific channel design
- **Frontend integration**: [14-frontend-changes.md](./14-frontend-changes.md) → [11-type-system.md](./11-type-system.md)
- **Voice/PBX work**: [18-voice-platform/README.md](./18-voice-platform/README.md) → relevant sub-section

---

## V1 → V2 Migration Notes

V2 replaces PortSIP PBX with an open-source voice stack: **Kamailio** (SIP proxy) + **FreeSWITCH** (media server) + **GoACD** (custom ACD in Go).

| V1 Section | V2 Change | New Location |
|---|---|---|
| §18 PortSIP Integration | **REPLACED** entirely | [18-voice-platform/](./18-voice-platform/README.md) |
| §6.4 PortSipAdapter | **REPLACED** with FreeSwitchAdapter | [06-channel-adapter-architecture.md](./06-channel-adapter-architecture.md) |
| §9.1 Voice (PortSIP) | **REPLACED** with Kamailio+FS design | [09-channel-designs/09-1-voice-channel.md](./09-channel-designs/09-1-voice-channel.md) |
| §15 Sprint plan | **UPDATED** for GoACD timeline | [15-implementation-plan.md](./15-implementation-plan.md) |
| §16 Risks | **UPDATED** with GoACD/FS risks | [16-risk-assessment.md](./16-risk-assessment.md) |
| §1-5, §7-8, §10-14, §17 | **UNCHANGED** | Same section numbers |
