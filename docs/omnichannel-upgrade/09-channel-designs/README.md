<!-- Part of: docs/omnichannel-upgrade/09-channel-designs/ — See ../INDEX.md for navigation -->

# Channel-Specific Designs — Overview

> **Source:** V1 Section 9 + V2 Section 9.1
> **Last updated:** 2026-03-17

This directory contains detailed designs for each communication channel supported by the TPB Omnichannel Contact Center. Each channel implements the `IChannelAdapter` interface defined in [06-channel-adapter-architecture.md](../06-channel-adapter-architecture.md) and normalizes inbound messages into the common `ChannelMessage` format.

---

## Channel Index

| # | Channel | File | Protocol / Stack | Phase |
|---|---------|------|-------------------|-------|
| 9.1 | **Voice** | [09-1-voice-channel.md](./09-1-voice-channel.md) | SIP.js + Kamailio + rtpengine + FreeSWITCH + GoACD | Phase 1 |
| 9.2 | **Email** | [09-2-email-channel.md](./09-2-email-channel.md) | Gmail API, Microsoft Graph API, IMAP/SMTP | Phase 1 |
| 9.3 | **Social** | [09-3-social-channels.md](./09-3-social-channels.md) | Facebook Graph API, Zalo OA API v3, WhatsApp Business Cloud API | Phase 2 |
| 9.4 | **SMS** | [09-4-sms-channel.md](./09-4-sms-channel.md) | Twilio REST API, local carrier API | Phase 2 |
| 9.5 | **Live Chat** | [09-5-livechat-channel.md](./09-5-livechat-channel.md) | WebSocket (embeddable JS widget) | Phase 1 |

---

## Common Pattern

All channels follow the same inbound flow:

```
External Platform --> Channel Adapter --> ChannelMessage normalization --> Channel Gateway (MS-20) --> Routing Engine (MS-21)
```

Outbound (agent reply) flow:

```
Agent Desktop --> Channel Gateway --> Channel Adapter.sendMessage() --> External Platform API
```

---

## Related Files

- [../06-channel-adapter-architecture.md](../06-channel-adapter-architecture.md) — `IChannelAdapter` interface, `ChannelAdapterRegistry`, adapter lifecycle
- [../07-routing-engine.md](../07-routing-engine.md) — Routing/scoring algorithm that processes routed `ChannelMessage` items
- [../08-agent-state-management.md](../08-agent-state-management.md) — Per-channel agent readiness state
- [../10-flow-designer-engine.md](../10-flow-designer-engine.md) — IVR, Email, and Chat flow designers that trigger before routing
- [../11-type-system.md](../11-type-system.md) — `ChannelType` enum, `ChannelMessage` interface, updated `Interaction` entity
- [../voice-platform/README.md](../voice-platform/README.md) — Full voice platform documentation (GoACD, FreeSWITCH, Kamailio)
