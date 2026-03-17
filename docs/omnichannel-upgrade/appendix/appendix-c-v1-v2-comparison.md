<!-- Part of: docs/omnichannel-upgrade/ — See INDEX.md for navigation -->

# Appendix C: V1 vs V2 Comparison Matrix

> **Source:** V2 Appendix C
> **Last updated:** 2026-03-17

## Architecture Comparison

| Aspect | V1 (PortSIP) | V2 (Kamailio+FS+GoACD) | Winner |
|---|---|---|---|
| **Deployment complexity** | 1 container (PortSIP) + 1 (coturn) | 5 containers (dSIPRouter, rtpengine, FS, GoACD, coturn) | V1 |
| **Time to first call** | ~1 week (config PortSIP) | ~4 weeks (build GoACD core) | V1 |
| **IVR capabilities** | Limited (Virtual Receptionist + webhook) | Full (any audio, DTMF, TTS, ASR, external APIs) | **V2** |
| **Routing control** | PortSIP queue routing (Phase 1); limited | Full Omnichannel scoring from day 1 | **V2** |
| **Agent state desync** | High risk (2 systems) | Low risk (single authority) | **V2** |
| **No-answer handling** | Webhook-based (latency) | ESL-based (immediate, in-process) | **V2** |
| **Caller rescue on agent disconnect** | Call drops (SIP BYE) | Caller held, re-routed to another agent | **V2** |
| **Vendor lock-in** | PortSIP (commercial, closed-source) | 100% open-source | **V2** |
| **License cost** | PortSIP license fees | Zero | **V2** |
| **Scaling** | PortSIP = monolithic | Kamailio (signaling) + FS (media) scale independently | **V2** |
| **Community size** | Small (PortSIP) | Large (Kamailio ~10K users, FreeSWITCH ~20K users) | **V2** |
| **Team effort** | Low (integrate with existing PBX) | High (build custom ACD) | V1 |
| **Long-term flexibility** | Constrained by PortSIP API | Unlimited (own the code) | **V2** |
| **WebRTC stack** | PortSIP built-in (simple) | Kamailio + rtpengine (proven at scale) | **V2** |
| **Multi-PBX support** | Via IPbxProvider interface | Same interface, GoACD is just one adapter | Tie |
| **Real-time ASR/AI** | Not possible (no media access) | mod_audio_fork -> WebSocket -> AI | **V2** |

## Recommendation

V2 is the superior long-term architecture. The main cost is development time for GoACD (mitigated by phased approach). For organizations needing faster time-to-market, V1 can serve as a Phase 1 stepping stone, migrating to V2 in Phase 2.

### Key Differentiators

1. **Routing control:** V2's GoACD owns the routing engine, enabling full Omnichannel scoring (skills, priority, wait time, agent load) from day 1. V1 delegates routing to PortSIP queues, losing Omnichannel-level intelligence.

2. **Agent state authority:** V2 eliminates the dual-system desync problem. GoACD is the single authority for agent state. V1 requires complex bidirectional sync between Omnichannel and PortSIP.

3. **Caller rescue:** V2 can hold a caller in FreeSWITCH when an agent disconnects and re-route to another agent. V1 drops the call (SIP BYE propagation).

4. **IVR programmability:** V2's ESL-based IVR supports arbitrary logic — external API calls, real-time banking queries, TTS/ASR, multi-turn conversations. V1 is limited to PortSIP's Virtual Receptionist with webhook callbacks.

5. **AI integration:** V2 enables real-time ASR via FreeSWITCH mod_audio_fork, streaming audio to the AI Service for live transcription, sentiment analysis, and agent assist. V1 has no media access path.

---

## Related Files

- [16-risk-assessment.md](../16-risk-assessment.md) — risks specific to each architecture
- [appendix-d-docker-ports.md](./appendix-d-docker-ports.md) — V2 container port mapping
- [15-implementation-plan.md](../15-implementation-plan.md) — V2 sprint plan
