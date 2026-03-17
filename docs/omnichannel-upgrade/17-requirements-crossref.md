<!-- Part of: docs/omnichannel-upgrade/ — See INDEX.md for navigation -->

# 17. Requirements Cross-Reference

> **Source:** V1 Section 17 (updated references for V2 voice architecture)
> **Last updated:** 2026-03-17

## Traceability Matrix

| Req # | Requirement | Addressed In | Phase | Status |
|---|---|---|---|---|
| R1 | Real-time omnichannel (voice, chat, social, email, SMS) | Section 4 Target Architecture, Section 6 Plugin Architecture, Section 9 Channel Designs | 1-4 | Planned |
| R2 | High throughput (thousands msg/sec, thousands concurrent calls) | Section 12 Performance Architecture | 5 | Planned |
| R3 | Gmail + Microsoft 365 email integration | Section 9.2 Email Channel | 2 | Planned |
| R4 | WebRTC SDK for browser-based calling | Section 9.1.1 WebRTC Design, Section 18 Voice Platform (Kamailio WSS + rtpengine) | **1** (via Kamailio WebSocket + rtpengine) | Planned |
| R5 | Chat: Zalo OA, Facebook Fanpage, Live Chat widget | Section 9.3 Social Channels, Section 9.5 Live Chat | 3 | Planned |
| R6 | SMS adapter design | Section 9.4 SMS Channel, Section 6.4 Adapter Table | 4 | Planned |
| R7 | Open plugin architecture for new channels | Section 6 Channel Adapter Plugin Architecture | 1 | Planned |
| R8 | Skill/group-based routing with availability | Section 7 Routing Engine Design, Section 8 Agent State | 1 | Planned |
| R9 | Centralized high-performance agent state management | Section 8 Agent State Management (Redis) | 1 | Planned |
| R10 | Admin config for groups/skills | Section 13.2 Admin UI — Group & Skill Management | 1 | Planned |
| R11 | Single Agent Desktop for all channels | Section 14 Frontend Agent Desktop Changes | 1-3 | Planned |
| R12 | IVR flow designer (drag-and-drop) | Section 10 Flow Designer Engine, Section 13.1.1 IVR Designer | 4 | Planned |
| R13 | Email flow designer (drag-and-drop) | Section 10 Flow Designer Engine, Section 13.1.2 Email Designer | 2 | Planned |
| R14 | Chat/Social/SMS flow designer (drag-and-drop) | Section 10 Flow Designer Engine, Section 13.1.3 Chat Designer | 3 | Planned |
| R15 | External chatbot API for routing | Section 10.3 Chat Nodes (`chat_bot_handoff`) | 3 | Planned |
| R16 | Runtime agent config changes (no restart) | Section 6.3 Adapter Registry (`reloadConfig`) | 4 | Planned |
| R17 | High throughput, real-time, low latency | Section 8.1 Redis Hot Path, Section 12 Performance Architecture | 1,5 | Planned |

## Coverage Notes

- **R4 (WebRTC):** V2 uses Kamailio WebSocket module + rtpengine for SRTP<->RTP transcoding, replacing the V1 approach. SIP.js in the browser registers to Kamailio WSS (port 5066). rtpengine handles media relay and ICE/DTLS negotiation.
- **R8 (Routing):** V2 provides full Omnichannel scoring from day 1 via GoACD's built-in routing engine, rather than delegating to an external PBX queue.
- **R12 (IVR):** V2's GoACD IVR engine (ESL-based) provides full programmability — any audio, DTMF collection, TTS, ASR, and external HTTP API calls — without the limitations of a commercial PBX's built-in IVR.

---

## Related Files

- [03-requirements.md](./03-requirements.md) — detailed requirement definitions that this cross-reference indexes
- [15-implementation-plan.md](./15-implementation-plan.md) — phase assignments referenced in the matrix
- [16-risk-assessment.md](./16-risk-assessment.md) — risks mapped to these requirements
