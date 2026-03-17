<!-- Part of: docs/omnichannel-upgrade/ — See INDEX.md for navigation -->

# Appendix D: Docker Compose Port Mapping (V2)

> **Source:** V2 Appendix D
> **Last updated:** 2026-03-17

## Port Mapping Summary

| Component | Port | Protocol | Purpose |
|---|---|---|---|
| dSIPRouter/Kamailio | 5060 | UDP/TCP | SIP signaling |
| dSIPRouter/Kamailio | 5061 | TCP | SIP TLS |
| dSIPRouter/Kamailio | 5066 | TCP | WebSocket Secure (WSS) for WebRTC |
| dSIPRouter GUI | 8443 | TCP | Management web interface |
| rtpengine | 22222 | UDP | Control protocol (Kamailio -> rtpengine) |
| rtpengine | 40000-60000 | UDP | RTP media range |
| FreeSWITCH | 5080 | UDP/TCP | SIP (internal, from Kamailio) |
| FreeSWITCH | 8021 | TCP | ESL (GoACD inbound connection) |
| FreeSWITCH | 16384-32768 | UDP | RTP media range |
| GoACD | 9090 | TCP | Outbound ESL listener (FS -> GoACD) |
| GoACD | 9091 | TCP | gRPC server (Omnichannel -> GoACD) |
| GoACD | 9092 | TCP | REST API (admin/monitoring) |
| GoACD | 9093 | TCP | Prometheus metrics |
| coturn | 3478 | UDP/TCP | STUN/TURN |
| coturn | 5349 | TCP | TURN TLS |
| coturn | 49152-65535 | UDP | TURN relay ports |

## Network Architecture

```
Browser (SIP.js)
    |
    | WSS :5066 (SIP signaling)
    v
Kamailio/dSIPRouter (:5060/5061/5066)
    |                           |
    | SIP :5080                 | UDP :22222 (control)
    v                           v
FreeSWITCH (:5080)         rtpengine (:40000-60000)
    |                           ^
    | ESL :8021 (inbound)       | RTP media relay
    | ESL :9090 (outbound)      |
    v                       Browser (WebRTC SRTP)
GoACD (:9090/9091/9092/9093)
    |
    | gRPC :9091
    v
CTI Adapter Service (NestJS)
    |
    | Kafka
    v
Omnichannel Platform Services
```

## Port Conflict Notes

- **SIP signaling (5060):** Kamailio owns this port. FreeSWITCH uses 5080 for internal SIP from Kamailio only.
- **WebSocket (5066):** Kamailio's WebSocket module handles WSS for browser SIP.js clients. FreeSWITCH does not expose its own WebSocket port externally.
- **RTP media:** rtpengine (40000-60000) handles external media relay. FreeSWITCH (16384-32768) handles internal media processing (recording, IVR audio, MoH). These ranges do not overlap.
- **ESL ports:** GoACD listens on 9090 for outbound ESL (FreeSWITCH connects to GoACD). GoACD connects to FreeSWITCH on 8021 for inbound ESL commands.

## Docker Networking

All voice platform containers should be on the same Docker bridge network (`tpb-voice-network`) for internal communication. Only the following ports need to be exposed to the host:

- Kamailio: 5060 (SIP), 5061 (SIP TLS), 5066 (WSS)
- rtpengine: 40000-60000 (RTP media)
- coturn: 3478 (STUN/TURN), 5349 (TURN TLS), 49152-65535 (relay)
- GoACD: 9091 (gRPC, for CTI Adapter Service)
- dSIPRouter GUI: 8443 (management, restrict to admin network)

FreeSWITCH ESL (8021) and GoACD internal ports (9090, 9092, 9093) should remain internal to the Docker network.

---

## Related Files

- [appendix-c-v1-v2-comparison.md](./appendix-c-v1-v2-comparison.md) — architecture comparison including deployment complexity
- [appendix-a-file-changes.md](./appendix-a-file-changes.md) — file-level change summary
- [Voice Platform Architecture](../18-voice-platform/) — detailed Kamailio/FreeSWITCH/GoACD design
