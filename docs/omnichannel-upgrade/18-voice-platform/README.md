<!-- Part of: docs/omnichannel-upgrade/18-voice-platform/ — See README.md for navigation -->

# 18. Voice Platform Integration Design (Kamailio + FreeSWITCH + GoACD)

> **Design Philosophy:** Omnichannel is the MASTER system. Unlike V1 where PortSIP was a semi-autonomous PBX with its own routing, in V2 the **GoACD server has full control** over every voice interaction — IVR execution, queue management, agent selection, call bridging, and failure handling. FreeSWITCH is a "dumb" media server controlled entirely via ESL. Kamailio is a stateless SIP proxy + WebRTC gateway.

## Section Index

| File | Section | Description |
|---|---|---|
| [18-1-architecture-overview.md](./18-1-architecture-overview.md) | 18.1 | High-level architecture diagram showing the full signal and media path: Internet/PSTN → Kamailio → FreeSWITCH → GoACD → Omnichannel Platform |
| [18-2-component-roles.md](./18-2-component-roles.md) | 18.2 | Component roles and capabilities for all four major components: dSIPRouter/Kamailio (SIP proxy + WebRTC gateway), rtpengine (media relay), FreeSWITCH (media server with ESL), and GoACD (queue + routing + IVR controller) |
| [18-2a-kamailio-config.md](./18-2a-kamailio-config.md) | 18.2A | Detailed Kamailio configuration — routing script (kamailio.cfg), TLS config, dispatcher setup, HA with keepalived, and dSIPRouter initial setup |
| [18-2b-rtpengine-config.md](./18-2b-rtpengine-config.md) | 18.2B | Detailed rtpengine configuration — startup flags, kernel vs userspace mode, codec transcoding matrix, monitoring, and HA setup |
| [18-2c-freeswitch-config.md](./18-2c-freeswitch-config.md) | 18.2C | Detailed FreeSWITCH configuration — module loading, ESL config, SIP profiles, ACL, performance tuning, MOH, recording, directory, HA, logging, and comprehensive dialplan |
| [18-3-acd-evaluation.md](./18-3-acd-evaluation.md) | 18.3 | ACD/Queue server evaluation — comparison of Custom Go, Jambonz, mod_callcenter, Kazoo, and Wazo; decision rationale for Option A (Custom Go ACD) |
| [18-4-goacd-architecture.md](./18-4-goacd-architecture.md) | 18.4 | GoACD internal architecture — module structure, goroutine model, ESL connection management, state machines, and Redis data structures |
| [18-5-call-flows.md](./18-5-call-flows.md) | 18.5 | End-to-end call flows — inbound PSTN, outbound click-to-call, agent-to-agent, blind transfer, attended transfer, conference/barge-in |
| [18-6-ivr-architecture.md](./18-6-ivr-architecture.md) | 18.6 | IVR architecture — flow definition schema, node types, execution engine, DTMF collection, TTS integration, and admin UI flow designer integration |
| [18-7-agent-state-antisync.md](./18-7-agent-state-antisync.md) | 18.7 | Agent state anti-sync patterns — scenarios where GoACD and Omnichannel agent state can diverge, detection mechanisms, and reconciliation strategies |
| [18-8-routing-failure.md](./18-8-routing-failure.md) | 18.8 | Routing failure handling — no-answer re-routing, agent reject, all-agents-busy overflow, SLA breach escalation, and voicemail/callback fallbacks |
| [18-9-sync-architecture.md](./18-9-sync-architecture.md) | 18.9 | Synchronization architecture — GoACD ↔ Omnichannel state sync via Redis pub/sub and Kafka events, CDR reconciliation, and recording file sync |
| [18-10-webrtc.md](./18-10-webrtc.md) | 18.10 | WebRTC integration — SIP.js configuration in Agent Desktop, codec negotiation (Opus/PCMA for Vietnam PSTN), SRTP/DTLS, ICE, and certificate requirements |
| [18-11-event-pipeline.md](./18-11-event-pipeline.md) | 18.11 | Event pipeline — Kafka topics for voice events, event schemas, consumer mapping to Omnichannel services, and real-time dashboard feeds |
| [18-12-data-mapping.md](./18-12-data-mapping.md) | 18.12 | Data mapping — mapping between GoACD call metadata, FreeSWITCH channel variables, and Omnichannel Interaction/CDR entities |
| [18-13-error-resilience.md](./18-13-error-resilience.md) | 18.13 | Error resilience — GoACD crash recovery, FreeSWITCH crash handling, ESL reconnection, call state snapshots, and Redis persistence |
| [18-14-performance-ops.md](./18-14-performance-ops.md) | 18.14 | Performance and operations — capacity planning, resource allocation, monitoring/alerting, DTMF tuning, log aggregation, and single-registration enforcement |
| [18-15-docker-infra.md](./18-15-docker-infra.md) | 18.15 | Docker infrastructure — Docker Compose definitions for Kamailio, rtpengine, FreeSWITCH, and GoACD; networking, volumes, and production deployment notes |

## Related Files

- [../INDEX.md](../INDEX.md) — Master index for the entire Omnichannel Upgrade Plan
- [../07-routing-engine.md](../07-routing-engine.md) — Routing engine design (scoring algorithm referenced by GoACD)
- [../08-agent-state-management.md](../08-agent-state-management.md) — Agent state management (state machine shared with GoACD)
- [../06-channel-adapter-architecture.md](../06-channel-adapter-architecture.md) — Channel adapter architecture (CTI Adapter MS-19)
