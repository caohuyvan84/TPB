<!-- Part of: docs/omnichannel-upgrade/ — See INDEX.md for navigation -->

# 2. Gap Analysis

## 2.1 Feature Gap Matrix

| Feature | Current State | Required State | Gap Severity |
|---|---|---|---|
| **Voice (PBX)** | Mock adapter, console.log stubs | Kamailio + FreeSWITCH real integration | Critical |
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

## 2.2 Code-Level Gaps

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

## Related Files

- [01-current-state-analysis.md](./01-current-state-analysis.md) — Detailed current state that these gaps are derived from
- [03-requirements.md](./03-requirements.md) — User requirements mapped to gap severities
- [04-target-architecture.md](./04-target-architecture.md) — Architecture designed to close these gaps
- [05-new-services.md](./05-new-services.md) — New services that address critical gaps
