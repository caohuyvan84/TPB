<!-- Part of: docs/omnichannel-upgrade/18-voice-platform/ — See README.md for navigation -->

# 18.2B Detailed Configuration — rtpengine

## 18.2B.1 Complete Startup Configuration

```bash
# rtpengine startup command (all flags documented)

rtpengine \
    # ── Network ──
    --interface="pub/PUBLIC_IP"                   # Public interface for WebRTC
    --interface="priv/10.0.0.0"                   # Private interface for FS
    --listen-ng=22222                             # Control socket (Kamailio → rtpengine)
    #
    # ── RTP Port Range ──
    --port-min=40000                              # Minimum RTP port
    --port-max=60000                              # Maximum RTP port
    # 10,000 ports ÷ 2 per call = 5,000 concurrent calls max
    #
    # ── DTLS (WebRTC encryption) ──
    --dtls-passive                                # DTLS passive role (WebRTC initiates)
    #
    # ── Codec Transcoding ──
    # rtpengine can transcode between codecs in kernel-space
    # Opus (WebRTC) ↔ PCMA (PSTN/FS) transcoding enabled by default
    # No explicit flag needed — handled by SDP negotiation
    #
    # ── Timeouts ──
    --timeout=60                                  # RTP session timeout (no media)
    --silent-timeout=3600                         # Call on hold (no media, but session active)
    --final-timeout=7200                          # Max RTP session lifetime (2h)
    --delete-delay=30                             # Keep media session 30s after BYE
    #
    # ── Logging ──
    --log-level=5                                 # 5=warning (production), 7=debug
    --log-facility=local1                         # syslog facility
    #
    # ── Performance ──
    --num-threads=0                               # Auto (= CPU cores)
    #
    # ── Recording (optional — for compliance) ──
    # --recording-dir=/var/spool/rtpengine       # If recording at media level
    # --recording-method=proc                     # proc filesystem method
    # Note: Recording is handled by FreeSWITCH (§18.9.4), not rtpengine
    #
    # ── Kernel Module (high performance) ──
    # If xt_RTPENGINE kernel module is loaded:
    --table=0                                     # Kernel table ID
    # Kernel mode: RTP forwarding happens in kernel space
    # ~10x lower latency, ~5x less CPU than userspace
    # Fallback: if kernel module not available, runs in userspace automatically
```

---

## 18.2B.2 Kernel Module vs Userspace Mode

```
Kernel Mode (recommended for production):
  ┌──────────────────────────────────────────────┐
  │ Kernel Space                                  │
  │  xt_RTPENGINE module                         │
  │  • RTP packet forwarding (zero-copy)         │
  │  • SRTP ↔ RTP transcryption                  │
  │  • ~10μs per-packet processing               │
  │                                               │
  │  Requirements:                                │
  │  • xt_RTPENGINE.ko loaded (modprobe)         │
  │  • Docker: --privileged or specific caps      │
  │  • Host kernel must support it                │
  └──────────────────────────────────────────────┘

Userspace Mode (fallback):
  ┌──────────────────────────────────────────────┐
  │ Userspace                                     │
  │  rtpengine daemon                             │
  │  • RTP forwarding via socket read/write       │
  │  • Higher CPU: ~100μs per-packet              │
  │  • Still adequate for < 2,000 concurrent calls│
  │                                               │
  │  Used when:                                   │
  │  • Docker without --privileged                │
  │  • Kernel module not available                │
  │  • Development/testing                        │
  └──────────────────────────────────────────────┘
```

```bash
# Kernel module setup (production host, not Docker)
modprobe xt_RTPENGINE
echo "xt_RTPENGINE" >> /etc/modules-load.d/rtpengine.conf

# Verify kernel module loaded
lsmod | grep xt_RTPENGINE
# xt_RTPENGINE    45056  1

# Docker (production): run with --privileged for kernel module access
docker run --privileged --network host drachtio/rtpengine:latest ...

# Docker (dev): userspace mode is automatic when kernel module not available
docker run --network host drachtio/rtpengine:latest ...
```

---

## 18.2B.3 Codec Transcoding Matrix

```
                        ┌──────────────────────────────────────┐
                        │     rtpengine Codec Handling          │
                        ├──────────────────────────────────────┤
                        │                                       │
                        │  WebRTC Agent (Browser)               │
                        │  Supported: Opus, PCMU, PCMA          │
                        │  Preferred: Opus (high quality, low BW)│
                        │  SDP: m=audio ... RTP/SAVPF           │
                        │       a=rtpmap:111 opus/48000/2       │
                        │       a=rtpmap:0 PCMU/8000            │
                        │       a=rtpmap:8 PCMA/8000            │
                        │       a=rtpmap:101 telephone-event    │
                        │                                       │
                        │          ↕ rtpengine                  │
                        │                                       │
                        │  FreeSWITCH (internal)                │
                        │  Supported: PCMA, PCMU, Opus, G.729   │
                        │  Preferred: PCMA (§18.10 Vietnam PSTN)│
                        │  SDP: m=audio ... RTP/AVP             │
                        │       a=rtpmap:8 PCMA/8000            │
                        │       a=rtpmap:0 PCMU/8000            │
                        │       a=rtpmap:101 telephone-event    │
                        │                                       │
                        │          ↕ FreeSWITCH bridge          │
                        │                                       │
                        │  PSTN Trunk                           │
                        │  Supported: PCMA, PCMU                │
                        │  SDP: m=audio ... RTP/AVP             │
                        │       a=rtpmap:8 PCMA/8000            │
                        │       a=rtpmap:101 telephone-event    │
                        │                                       │
                        └──────────────────────────────────────┘

Transcoding Scenarios:

  [1] Agent → PSTN caller (most common):
      Browser: Opus/48000 → rtpengine → PCMA/8000 → FS → PCMA → PSTN
      Latency: < 5ms (kernel mode)
      Quality: Excellent (Opus is better than G.711, transcoding to G.711 at last hop)

  [2] Agent → Agent (internal):
      Browser A: Opus → rtpengine → PCMA → FS → bridge → FS → PCMA → rtpengine → Opus → Browser B
      Note: Full media path through FS for recording. If no recording needed,
      rtpengine could bridge directly (future optimization).

  [3] IVR prompt playback:
      FS: playback file (PCMA .wav) → RTP/PCMA → rtpengine → SRTP/Opus → Browser
      Note: IVR audio files should be encoded in PCMA (8kHz, alaw) for zero-transcode on FS side.

  [4] DTMF passthrough:
      Browser: RFC 2833 telephone-event → rtpengine → telephone-event (passthrough) → FS
      rtpengine: codec-accept-telephone-event flag ensures DTMF packets are NOT transcoded
```

---

## 18.2B.4 rtpengine Monitoring & Health

```bash
# Health check from Kamailio (automatic via ds_ping)
# rtpengine control protocol (ng protocol on UDP 22222)

# Manual health check via rtpengine-ctl:
rtpengine-ctl list sessions     # Active RTP sessions
rtpengine-ctl list totals       # Aggregate statistics
# Output:
#   currentstatistics:
#     sessionsown: 1523           # Active sessions
#     transcodedmedia: 820        # Sessions with transcoding
#     packetrate: 150000          # Packets/s
#     byterate: 24000000          # Bytes/s (~192 Mbps)
#     errorrate: 0

# Prometheus exporter for rtpengine (community tool)
# https://github.com/sipwise/rtpengine-exporter
# Exports: rtpengine_sessions_total, rtpengine_packet_rate, etc.
```

### rtpengine HA (dual-instance)

```
# Kamailio config: 2 rtpengine instances in round-robin
modparam("rtpengine", "rtpengine_sock",
    "udp:rtpengine-1:22222=1 udp:rtpengine-2:22222=1")

# Kamailio automatically fails over to the other instance
# if one becomes unresponsive (rtpengine_disable_tout=20s)

# Note: Each rtpengine instance handles different calls —
# media sessions are NOT shared between instances.
# If an rtpengine crashes, its active media sessions stop.
# Calls must be re-INVITE'd to establish new media through the surviving instance.
# In practice, this causes < 3s audio disruption for affected calls.
```

---

## Related Files

| File | Description |
|---|---|
| `18-2a-kamailio-config.md` | Section 18.2A — Kamailio SIP proxy configuration |
| `18-2c-freeswitch-config.md` | Section 18.2C — FreeSWITCH media server configuration |
| `18-9-agent-webrtc.md` | Section 18.9 — Agent WebRTC endpoint and SIP auth |
| `18-10-vietnam-pstn.md` | Section 18.10 — Vietnam PSTN integration and codec selection |
| `README.md` | Navigation index for the 18-voice-platform section |
