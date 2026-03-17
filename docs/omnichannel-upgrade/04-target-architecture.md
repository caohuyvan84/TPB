<!-- Part of: docs/omnichannel-upgrade/ — See INDEX.md for navigation -->

# 4. Target Architecture

```
                           ┌─────────────────────────────────────────────────┐
                           │               EXTERNAL CHANNELS                 │
                           │  PBX (Kamailio + FreeSWITCH)                   │
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

## Infrastructure Additions

| Component | Purpose | Why |
|---|---|---|
| **Kamailio / dSIPRouter** | SIP proxy + routing logic + GUI management | SIP signaling, call routing rules, load balancing across FreeSWITCH nodes, carrier management via dSIPRouter web UI |
| **rtpengine** | RTP media relay / proxy | NAT traversal for RTP streams, codec transcoding, call recording tap, WebRTC-to-SIP media bridging |
| **FreeSWITCH** | Media server + WebRTC gateway | Voice channel media handling, IVR execution, conference bridges, call recording, WebRTC-to-SIP gateway (verto/wss) |
| **GoACD** | Automatic Call Distribution engine | Skill-based call routing, queue management, agent state tracking, real-time stats — lightweight Go-based ACD layer on top of Kamailio + FreeSWITCH |
| **coturn** | TURN/STUN server | NAT traversal for WebRTC in corporate firewalls |
| **Redis Streams** | Agent state hot path + event pub/sub | Microsecond latency for routing decisions |
| **Bull/BullMQ** | Job queues (email polling, retries, recording sync) | Reliable background processing |

> **Note:** SIP.js in the browser registers to FreeSWITCH via WebSocket (WSS). Kamailio handles SIP routing and load balancing. rtpengine proxies the RTP media. This open-source stack provides full control over the voice pipeline without vendor lock-in.

---

## Related Files

- [01-current-state-analysis.md](./01-current-state-analysis.md) — Current state this architecture evolves from
- [02-gap-analysis.md](./02-gap-analysis.md) — Gaps this architecture is designed to close
- [03-requirements.md](./03-requirements.md) — Requirements fulfilled by this architecture
- [05-new-services.md](./05-new-services.md) — Detailed design of the new services shown in the diagram
