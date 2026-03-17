<!-- Part of: docs/omnichannel-upgrade/ — See INDEX.md for navigation -->

# 15. Phased Implementation Plan

> **Merged from:** V1 Section 15 + V2 Section 15 updates
> **Voice platform:** Kamailio/dSIPRouter + rtpengine + FreeSWITCH + GoACD (V2 architecture)
> **Last updated:** 2026-03-17

## Overview

| Phase | Duration | Focus | Key Deliverables |
|---|---|---|---|
| **Phase 1** | 8 weeks | Core Infrastructure + Voice Platform | Channel Gateway, Routing Engine, Redis Agent State, WebSocket consolidation, **Kamailio/FreeSWITCH/GoACD voice platform**, WebRTC softphone |
| **Phase 2** | 4 weeks | Email Integration | Gmail/MS365 adapters, email flow designer |
| **Phase 3** | 4 weeks | Social, Live Chat & Additional Channels | Facebook, Zalo, Live Chat widget, chat flow designer |
| **Phase 4** | 4 weeks | IVR, SMS & Advanced Routing | IVR flow designer, SMS adapters, advanced routing rules |
| **Phase 5** | 4 weeks | Polish & Production | Performance tuning, monitoring, load testing, documentation |

**Total: ~24 weeks**

---

## Phase 1: Core Infrastructure + Voice Platform (Weeks 1-8)

### Sprint 1.1 (Weeks 1-2): Channel Gateway, Plugin Architecture & Infrastructure Setup

| Task | Description | Effort |
|---|---|---|
| 1.1.1 | Scaffold Channel Gateway (MS-20) NestJS service — entities, DTOs, Kafka | 2d |
| 1.1.2 | Implement `IChannelAdapter` interface, `ChannelAdapterRegistry`, adapter lifecycle | 2d |
| 1.1.3 | Implement `ChannelMessage` normalization pipeline | 1d |
| 1.1.4 | Set up Kafka topics (`channel.inbound`, `channel.outbound`, `interaction.*`, `agent.*`, `cdr.*`), consumer groups, event schemas | 1d |
| 1.1.5 | Scaffold `FreeSwitchAdapter` in CTI Adapter Service (gRPC client to GoACD) | 1d |
| 1.1.6 | Set up Kamailio/dSIPRouter + rtpengine + FreeSWITCH Docker containers | 2d |
| 1.1.7 | Configure Kamailio: SIP routing to FreeSWITCH, WebSocket module, rtpengine integration | 1d |

### Sprint 1.2 (Weeks 3-4): GoACD Core + Agent Registry

| Task | Description | Effort |
|---|---|---|
| 1.2.1 | Initialize GoACD project (Go module, dependencies, config) | 1d |
| 1.2.2 | Implement ESL connection management (outbound server + inbound client using percipia/eslgo) | 3d |
| 1.2.3 | Implement Agent Registry: extension allocation, Kamailio subscriber provisioning | 2d |
| 1.2.4 | Implement Agent State Machine in Redis (Section 18.7.4) | 2d |
| 1.2.5 | Implement Kafka consumer: agent.created/updated/deleted -> agent sync | 1d |
| 1.2.6 | Implement gRPC server (basic: SetAgentState, GetAgentState, MakeCall, HangupCall) | 1d |

### Sprint 1.3 (Weeks 5-6): GoACD Queue + Routing + IVR

| Task | Description | Effort |
|---|---|---|
| 1.3.1 | Implement Queue Manager: Redis sorted sets, enqueue/dequeue, SLA timer | 2d |
| 1.3.2 | Implement Routing Engine: Section 7.2 scoring algorithm, TOP-3 candidates, atomic claim | 2d |
| 1.3.3 | Implement Call Delivery: bridge via ESL, no-answer timer (20s), re-routing (Section 18.8.3) | 2d |
| 1.3.4 | Implement IVR Engine: flow executor, ESL command builders (playback, play_and_get_digits) | 2d |
| 1.3.5 | Implement Music on Hold: FreeSWITCH local_stream, position announcements | 1d |
| 1.3.6 | Implement CDR generation: call event tracking, Kafka publishing | 1d |

### Sprint 1.4 (Weeks 7-8): WebRTC + Frontend + Anti-Desync

| Task | Description | Effort |
|---|---|---|
| 1.4.1 | Implement WebRTC credential provisioning (CTI Adapter -> GoACD gRPC) | 1d |
| 1.4.2 | Frontend: SIP.js integration with Kamailio WSS — register, make/receive calls | 3d |
| 1.4.3 | Frontend: integrate SIP.js with `CallContext.tsx` + `FloatingCallWidget.tsx` | 2d |
| 1.4.4 | Implement anti-desync: SIP registration tracking (sofia::register/expire), periodic reconciliation (Section 18.7.3) | 2d |
| 1.4.5 | Implement event pipeline: GoACD -> Kafka -> CTI Adapter -> WebSocket -> Agent Desktop | 1d |
| 1.4.6 | Implement call metadata pre-push (customer info before SIP INVITE) | 1d |

---

## Phase 2: Email Integration (Weeks 9-12)

### Sprint 2.1 (Weeks 9-10): Gmail & Microsoft 365

| Task | Description | Effort |
|---|---|---|
| 2.1.1 | Implement `GmailAdapter` (OAuth, push notifications, send/receive) | 3d |
| 2.1.2 | Implement `MicrosoftAdapter` (Azure AD, Graph API webhooks, send/receive) | 3d |
| 2.1.3 | Implement email threading (map external thread ID -> interaction) | 1d |
| 2.1.4 | Frontend: enhance `EmailReplyDialog` with real send via API | 1d |
| 2.1.5 | Admin: email channel configuration page (Gmail OAuth, MS365 OAuth) | 1d |

### Sprint 2.2 (Weeks 11-12): Email Flows & IMAP

| Task | Description | Effort |
|---|---|---|
| 2.2.1 | Implement `ImapAdapter` for generic email providers | 2d |
| 2.2.2 | Implement basic email flow designer (auto-categorize, auto-reply nodes) | 3d |
| 2.2.3 | Frontend: expand channel filters and types for email sub-channels | 1d |
| 2.2.4 | Frontend: implement `UnifiedSocketClient` replacing 3 separate connections | 1d |

---

## Phase 3: Social, Live Chat & Additional Channels (Weeks 13-16)

### Sprint 3.1 (Weeks 13-14): Facebook, Zalo & Social Adapters

| Task | Description | Effort |
|---|---|---|
| 3.1.1 | Implement `FacebookAdapter` (Page connect, webhooks, send/receive) | 3d |
| 3.1.2 | Implement `ZaloAdapter` (OA API, webhooks, send/receive) | 3d |
| 3.1.3 | Implement rich message rendering (buttons, cards, quick replies) per channel | 2d |
| 3.1.4 | Frontend: extend `ChatTimeline` for social channel rich elements | 2d |
| 3.1.5 | Admin: social channel configuration (Facebook Page OAuth, Zalo OA setup) | 1d |

> **Note:** The V1 FreeSWITCH adapter task originally planned for Phase 3 is removed — FreeSWITCH is already integrated in Phase 1 via the GoACD architecture.

### Sprint 3.2 (Weeks 15-16): Live Chat Widget & Chat Flows

| Task | Description | Effort |
|---|---|---|
| 3.2.1 | Implement `LiveChatAdapter` (internal WebSocket handler) | 2d |
| 3.2.2 | Build live chat widget (React + Vite library mode -> JS bundle) | 3d |
| 3.2.3 | Widget features: pre-chat form, file upload, typing indicator, transcript | 2d |
| 3.2.4 | Admin: live chat widget designer (colors, logo, position, greeting) | 2d |
| 3.2.5 | Implement chat/social flow designer (bot greeting, FAQ, handoff nodes) | 2d |
| 3.2.6 | Implement external chatbot API handoff node | 1d |

---

## Phase 4: IVR, SMS & Advanced Routing (Weeks 17-20)

### Sprint 4.1 (Weeks 17-18): IVR Flow Designer

| Task | Description | Effort |
|---|---|---|
| 4.1.1 | Implement IVR flow execution engine (state machine) | 3d |
| 4.1.2 | Implement IVR nodes: play audio, collect DTMF, menu, HTTP request | 3d |
| 4.1.3 | Admin: IVR flow designer UI (React Flow canvas + node palette) | 3d |
| 4.1.4 | TTS integration (Google TTS or local) | 1d |
| 4.1.5 | IVR flow testing/simulation mode | 1d |

### Sprint 4.2 (Weeks 19-20): SMS & Advanced Routing

| Task | Description | Effort |
|---|---|---|
| 4.2.1 | Implement `TwilioSmsAdapter` | 2d |
| 4.2.2 | Implement `WhatsAppAdapter` (Cloud API) | 2d |
| 4.2.3 | Implement advanced routing rules (time-based, skills-based, priority-based) | 2d |
| 4.2.4 | Implement queue overflow and failover logic | 1d |
| 4.2.5 | Admin: routing rules configuration UI | 2d |
| 4.2.6 | Implement runtime agent config changes (reload adapter configs without restart) | 1d |

---

## Phase 5: Polish & Production (Weeks 21-24)

### Sprint 5.1 (Weeks 21-22): Performance & Monitoring

| Task | Description | Effort |
|---|---|---|
| 5.1.1 | Load testing (k6): validate throughput targets per channel | 2d |
| 5.1.2 | Redis cluster setup (3 masters + 3 replicas) | 1d |
| 5.1.3 | Kafka partition optimization | 1d |
| 5.1.4 | WebSocket Redis adapter for multi-instance broadcasting | 1d |
| 5.1.5 | Prometheus metrics for all new services | 2d |
| 5.1.6 | Grafana dashboards (agent state, queue metrics, channel throughput) | 2d |

### Sprint 5.2 (Weeks 23-24): Hardening & Documentation

| Task | Description | Effort |
|---|---|---|
| 5.2.1 | End-to-end testing: full interaction lifecycle per channel | 3d |
| 5.2.2 | Security audit: webhook signature verification, credential encryption | 2d |
| 5.2.3 | FreeSWITCH/GoACD adapter interop testing with additional PBX adapters | 2d |
| 5.2.4 | Operational runbook and troubleshooting guide | 1d |
| 5.2.5 | API documentation (OpenAPI specs for all new endpoints) | 1d |

---

## Related Files

- [16-risk-assessment.md](./16-risk-assessment.md) — risks associated with this implementation plan, including GoACD development effort
- [17-requirements-crossref.md](./17-requirements-crossref.md) — traceability matrix mapping requirements to phases
- [Voice Platform Architecture](./18-voice-platform/) — detailed design for the Kamailio/FreeSWITCH/GoACD stack
- [appendix/appendix-a-file-changes.md](./appendix/appendix-a-file-changes.md) — file-level change summary
