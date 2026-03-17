<!-- Part of: docs/omnichannel-upgrade/09-channel-designs/ — See ../INDEX.md for navigation -->

# 9.1 Voice Channel

> **Source:** V2 Section 9.1 (Kamailio + FreeSWITCH + GoACD architecture)
> **Last updated:** 2026-03-17

The voice channel uses an open-source stack: **Kamailio/dSIPRouter** (SIP proxy + WebRTC gateway), **rtpengine** (media relay), **FreeSWITCH** (media server), and **GoACD** (custom ACD/queue server). Browser-based calling uses SIP.js over WebSocket Secure.

For the complete voice platform design (component configuration, call flows, GoACD architecture, IVR engine, agent state anti-desync, error handling, Docker infrastructure), see **[../voice-platform/README.md](../voice-platform/README.md)**.

---

## 9.1.1 WebRTC (Browser-Based Calling)

**Stack:** SIP.js (client) --> Kamailio WSS (SIP proxy) --> rtpengine (media relay) --> FreeSWITCH (media server)

**Flow:**

```
Browser (SIP.js)
    |
    | WebSocket Secure (WSS port 5066)
    | SIP-over-WebSocket signaling
    v
Kamailio (dSIPRouter)
    | SIP proxy + WebSocket module
    |
    +---- rtpengine (media relay)
    |     SRTP (browser) <-> RTP (FreeSWITCH)
    |     ICE, DTLS-SRTP, Opus<->G.711
    |
    | SIP (internal, to FreeSWITCH)
    v
FreeSWITCH (Media Server)
    | Audio processing, recording
    |
    | ESL
    v
GoACD (Call Control)
```

**Frontend Integration:**

- SIP.js in Agent Desktop registers to Kamailio WSS endpoint
- Credential provisioning via `GET /cti/webrtc/credentials` (returns extension, password, WSS URI)
- Integrates with existing `CallContext.tsx` + `FloatingCallWidget.tsx`
- Audio device selection (mic/speaker)
- SRTP encryption for media (rtpengine handles DTLS-SRTP termination)
- DTMF support (RFC 2833)
- coturn TURN server for NAT traversal in corporate firewalls

**Key APIs:**

```typescript
// Agent Desktop --> CTI Service --> GoACD (gRPC)
GET  /cti/webrtc/credentials           // Get SIP credentials + WSS URI for SIP.js registration
GET  /cti/webrtc/ice-servers           // Get TURN/STUN config (coturn)
POST /cti/calls/make                   // Initiate outbound call
POST /cti/calls/:id/answer             // Answer inbound call
POST /cti/calls/:id/hold               // Hold
POST /cti/calls/:id/unhold             // Resume
POST /cti/calls/:id/transfer           // Blind transfer
POST /cti/calls/:id/attended-transfer  // Attended transfer
POST /cti/calls/:id/hangup             // Hangup
POST /cti/calls/:id/conference         // Conference (3-way merge)
```

---

## 9.1.2 Voice Infrastructure

| Component | Role | Phase |
|---|---|---|
| **Kamailio (dSIPRouter)** | SIP proxy, WebRTC gateway, SIP trunk management | Phase 1 |
| **rtpengine** | Media relay (SRTP<->RTP, ICE, codec transcoding) | Phase 1 |
| **FreeSWITCH** | Media server (IVR, recording, MOH, conference) | Phase 1 |
| **GoACD** | ACD/Queue server (routing, IVR control, agent state) | Phase 1 |
| **coturn** | TURN server for NAT traversal | Phase 1 |

### Port Mapping

| Component | Port | Protocol | Purpose |
|---|---|---|---|
| dSIPRouter/Kamailio | 5060 | UDP/TCP | SIP signaling |
| dSIPRouter/Kamailio | 5061 | TCP | SIP TLS |
| dSIPRouter/Kamailio | 5066 | TCP | WebSocket Secure (WSS) for WebRTC |
| dSIPRouter GUI | 8443 | TCP | Management web interface |
| rtpengine | 22222 | UDP | Control protocol (Kamailio --> rtpengine) |
| rtpengine | 40000-60000 | UDP | RTP media range |
| FreeSWITCH | 5080 | UDP/TCP | SIP (internal, from Kamailio) |
| FreeSWITCH | 8021 | TCP | ESL (GoACD inbound connection) |
| FreeSWITCH | 16384-32768 | UDP | RTP media range |
| GoACD | 9090 | TCP | Outbound ESL listener (FS --> GoACD) |
| GoACD | 9091 | TCP | gRPC server (Omnichannel --> GoACD) |
| GoACD | 9092 | TCP | REST API (admin/monitoring) |
| GoACD | 9093 | TCP | Prometheus metrics |
| coturn | 3478 | UDP/TCP | STUN/TURN |
| coturn | 5349 | TCP | TURN TLS |
| coturn | 49152-65535 | UDP | TURN relay ports |

---

## 9.1.3 IVR Integration

Full media control via GoACD + FreeSWITCH ESL:

- GoACD receives call via outbound ESL
- Executes IVR flow (`FlowDefinition` from [../10-flow-designer-engine.md](../10-flow-designer-engine.md) section 10.2) by sending ESL commands
- Can: play audio, collect DTMF, call external APIs, set routing tags, play TTS
- Phase 4: real-time ASR via `mod_audio_fork` --> WebSocket --> AI Service
- Output: `routingHints` object with skills, priority, queue preferences

---

## Related Files

- **[../voice-platform/README.md](../voice-platform/README.md)** — Full voice platform design (GoACD architecture, call flows, configuration, Docker)
- [../voice-platform/kamailio-config.md](../voice-platform/kamailio-config.md) — Kamailio/dSIPRouter configuration
- [../voice-platform/rtpengine-config.md](../voice-platform/rtpengine-config.md) — rtpengine media relay configuration
- [../voice-platform/freeswitch-config.md](../voice-platform/freeswitch-config.md) — FreeSWITCH media server configuration
- [../voice-platform/goacd-architecture.md](../voice-platform/goacd-architecture.md) — GoACD architecture (gRPC, protobuf, Redis, Go)
- [../voice-platform/call-flows.md](../voice-platform/call-flows.md) — Inbound, transfer, and internal call flows
- [../voice-platform/ivr-architecture.md](../voice-platform/ivr-architecture.md) — IVR engine via FreeSWITCH ESL
- [../voice-platform/agent-state-anti-desync.md](../voice-platform/agent-state-anti-desync.md) — Agent state anti-desync (Lua, heartbeat)
- [../06-channel-adapter-architecture.md](../06-channel-adapter-architecture.md) — `IChannelAdapter` interface
- [../10-flow-designer-engine.md](../10-flow-designer-engine.md) — IVR flow node types and execution engine
- [../14-frontend-agent-desktop.md](../14-frontend-agent-desktop.md) — WebRTC softphone frontend integration
