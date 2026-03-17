<!-- Part of: docs/omnichannel-upgrade/18-voice-platform/ — See README.md for navigation -->

# 18.1 Architecture Overview

> **Design Philosophy:** Omnichannel is the MASTER system. Unlike V1 where PortSIP was a semi-autonomous PBX with its own routing, in V2 the **GoACD server has full control** over every voice interaction — IVR execution, queue management, agent selection, call bridging, and failure handling. FreeSWITCH is a "dumb" media server controlled entirely via ESL. Kamailio is a stateless SIP proxy + WebRTC gateway.

## Signal and Media Path

```
                         ┌─────────────────────────────┐
                         │       Internet / PSTN        │
                         └──────────┬──────────────────┘
                                    │
                    ┌───────────────┼───────────────┐
                    │ SIP Trunks    │ WebRTC (WSS)  │
                    │ (PSTN GW)     │ (Agent Desktop)│
                    │               │               │
              ┌─────▼───────────────▼─────┐         │
              │                           │         │
              │   dSIPRouter / Kamailio   │◄────────┘
              │   (SIP Proxy + WebRTC GW) │
              │                           │
              │   ┌─────────────────┐     │
              │   │   rtpengine     │     │  ← SRTP↔RTP, ICE, DTLS
              │   └─────────────────┘     │
              └───────────┬───────────────┘
                          │ SIP (internal)
                          │
              ┌───────────▼───────────────┐
              │                           │
              │      FreeSWITCH           │
              │    (Media Server)         │
              │                           │
              │  • IVR audio playback     │
              │  • DTMF detection         │
              │  • Music on Hold          │
              │  • Call recording         │
              │  • Conference bridge      │
              │  • Codec transcoding      │
              │                           │
              └───────────┬───────────────┘
                          │ ESL (Event Socket)
                          │ Outbound mode: FS → GoACD
                          │ Inbound mode:  GoACD → FS
                          │
              ┌───────────▼───────────────┐
              │                           │
              │   GoACD Server (Go)       │
              │   (Queue + Routing + IVR  │
              │    Flow Controller)       │
              │                           │
              │  • IVR flow execution     │
              │  • Agent state machine    │
              │  • Skill-based routing    │
              │  • Queue management       │
              │  • MOH orchestration      │
              │  • No-answer re-routing   │
              │  • Call metadata dispatch  │
              │                           │
              └───────────┬───────────────┘
                          │ gRPC / Kafka / Redis
                          │
              ┌───────────▼───────────────┐
              │                           │
              │  Omnichannel Platform     │
              │  (NestJS Microservices)   │
              │                           │
              │  • Agent Service (MS-2)   │
              │  • Interaction Svc (MS-3) │
              │  • Customer Service (MS-5)│
              │  • CTI Adapter (MS-19)    │
              │  • Routing Engine (MS-21) │
              │                           │
              └───────────────────────────┘
```

## Layer Responsibilities

| Layer | Component | Role |
|---|---|---|
| **Edge** | dSIPRouter / Kamailio | SIP proxy, WebRTC gateway, SIP authentication, NAT traversal, topology hiding, load balancing to FreeSWITCH pool |
| **Media Relay** | rtpengine | SRTP to RTP bridging, ICE negotiation, DTLS-SRTP, Opus to G.711 transcoding, kernel-space packet forwarding |
| **Media Server** | FreeSWITCH | Audio playback, DTMF collection, music on hold, call recording, call bridging, conference, codec transcoding |
| **Call Control** | GoACD Server (Go) | IVR flow execution, agent state machine, skill-based routing, queue management, MOH orchestration, no-answer re-routing, CDR generation, metadata dispatch |
| **Platform** | Omnichannel (NestJS) | Agent Service, Interaction Service, Customer Service, CTI Adapter, Routing Engine |

## Key Integration Points

- **Kamailio → FreeSWITCH:** SIP (internal), load-balanced via `dispatcher` module with health probing
- **FreeSWITCH → GoACD:** ESL outbound mode (all inbound calls handed off immediately)
- **GoACD → FreeSWITCH:** ESL inbound mode (GoACD sends commands: play, bridge, record, transfer)
- **GoACD → Omnichannel:** gRPC for synchronous operations, Kafka for event streaming, Redis for state and pub/sub

---

## Related Files

- [README.md](./README.md) — Section index and navigation
- [18-2-component-roles.md](./18-2-component-roles.md) — Detailed roles and capabilities for each component
- [18-2a-kamailio-config.md](./18-2a-kamailio-config.md) — Kamailio configuration details
- [18-2b-rtpengine-config.md](./18-2b-rtpengine-config.md) — rtpengine configuration details
- [18-2c-freeswitch-config.md](./18-2c-freeswitch-config.md) — FreeSWITCH configuration details
- [18-4-goacd-architecture.md](./18-4-goacd-architecture.md) — GoACD internal architecture
