<!-- Part of: docs/omnichannel-upgrade/18-voice-platform/ — See README.md for navigation -->

# 18.2 Component Roles & Capabilities

## 18.2.1 dSIPRouter (Kamailio) — SIP Proxy & WebRTC Gateway

**What it is:** dSIPRouter is an open-source web-based management layer on top of Kamailio. It generates and manages Kamailio configuration, provides a REST API and web UI for SIP routing administration. Kamailio does all actual SIP processing.

**Role in V2:** Edge SIP proxy — all SIP traffic enters and exits through Kamailio. It does NOT process media.

| Responsibility | Mechanism |
|---|---|
| SIP registration (agents + trunks) | Kamailio `registrar` + `usrloc` modules |
| SIP authentication | Kamailio `auth_db` module |
| SIP routing to FreeSWITCH | Kamailio `dispatcher` module (load balancing) |
| WebRTC → SIP translation | Kamailio `websocket` module (SIP-over-WSS) |
| Media relay for WebRTC | `rtpengine` (SRTP↔RTP, ICE, DTLS-SRTP) |
| NAT traversal | Kamailio `nathelper` + rtpengine |
| Topology hiding | Kamailio `topoh` module |
| TLS termination | Kamailio `tls` module |
| SIP trunk management | dSIPRouter GUI + API |
| Load balancing to FS pool | Kamailio `dispatcher` with health probing |
| Rate limiting / DDoS protection | Kamailio `pike` + `htable` modules |
| Multi-tenant routing | dSIPRouter domain-based routing |

### Key Kamailio Modules

```
# Signaling
dispatcher      — load balance to FreeSWITCH pool
dialog          — call tracking (in-dialog routing)
registrar       — SIP REGISTER handling
usrloc          — user location database
auth_db         — digest authentication against DB
permissions     — IP-based ACL for trunks
nathelper       — NAT detection + fix

# WebRTC
websocket       — SIP over WebSocket (WSS)
rtpengine       — control rtpengine for media relay

# Security
tls             — TLS for SIP signaling
pike            — flood detection
htable          — in-memory hash tables (rate limiting, blacklists)
topoh           — topology hiding (hide internal IPs)

# Routing
drouting        — dynamic routing (DID → FreeSWITCH destination)
```

### dSIPRouter Management Features

- Web GUI: manage SIP trunks, carriers, domains, routing rules
- FreeSWITCH integration: register FreeSWITCH instances as PBX endpoints
- Carrier groups with failover
- DID routing (DID → specific FreeSWITCH dialplan context)
- REST API for programmatic configuration

---

## 18.2.2 rtpengine — Media Relay

**What it is:** rtpengine (by Sipwise) is a standalone, kernel-space RTP proxy. It sits in the media path and bridges between different media types.

**Role in V2:** Bridge WebRTC media (SRTP + ICE + DTLS) to standard RTP for FreeSWITCH.

```
Agent Desktop (Browser)                           FreeSWITCH
  SIP.js                                          (Media Server)
    │                                                  │
    │ SRTP (encrypted)                                │ RTP (plain)
    │ ICE candidates                                  │
    │ DTLS-SRTP key exchange                         │
    │                                                  │
    └──────────► rtpengine ◄──────────────────────────┘
                 │
                 ├── SRTP ↔ RTP transcoding
                 ├── ICE negotiation (WebRTC side)
                 ├── DTLS-SRTP ↔ SDES-SRTP
                 ├── Codec transcoding (Opus ↔ G.711)
                 └── Kernel-space forwarding (high performance)
```

### Why rtpengine instead of FreeSWITCH native WebRTC (mod_verto)?

- rtpengine operates in **kernel space** — much lower latency and CPU usage than userspace transcoding
- Decouples WebRTC termination from media processing — can scale independently
- Kamailio has native rtpengine integration — simple SDP manipulation in routing scripts
- FreeSWITCH mod_verto is single-instance and tightly coupled

---

## 18.2.3 FreeSWITCH — Media Server

**Role in V2:** "Dumb" media server — executes media operations (play audio, collect DTMF, record, bridge, conference) as instructed by GoACD via ESL. FreeSWITCH does NOT make routing decisions.

| Capability | FreeSWITCH Feature | Used For |
|---|---|---|
| Audio playback | `playback`, `play_and_get_digits` | IVR prompts, announcements |
| DTMF collection | `play_and_get_digits`, `read` | IVR menus, PIN entry |
| Music on Hold | `playback` (loop), `local_stream` | Queue waiting |
| Call recording | `record`, `record_session` | Compliance recording |
| Call bridging | `bridge`, `uuid_bridge` | Connect caller to agent |
| Call transfer | `uuid_transfer`, `att_xfer` | Agent transfers |
| Conference | `conference` application | 3-way calls, supervisor barge-in |
| TTS | `speak` (mod_tts) | Dynamic announcements |
| Audio streaming | `mod_audio_fork` (WebSocket) | Real-time ASR/AI (Phase 4) |
| Codec transcoding | Built-in | G.711 ↔ Opus, G.729, etc. |

### ESL Configuration (FreeSWITCH Dialplan)

All inbound calls are immediately handed off to GoACD via outbound ESL:

```xml
<!-- FreeSWITCH dialplan: route all calls to GoACD -->
<!-- V2.1: Added ACL — only accept calls from Kamailio IP, reject SIP scanners -->
<context name="public">
  <extension name="acl_check">
    <condition field="${network_addr}" expression="^(kamailio_ip|10\.0\.0\.\d+)$" break="on-false">
      <!-- Passed ACL: hand off to GoACD via outbound ESL -->
      <action application="socket" data="goacd-vip:9090 async full"/>
    </condition>
    <!-- Failed ACL: reject with 403 -->
    <anti-action application="respond" data="403 Forbidden"/>
  </extension>
</context>

<context name="default">
  <!-- V2.2: Internal calls (agent-to-agent) also go through GoACD.
       This context is reached ONLY when GoACD itself originates the call
       via ESL (e.g., MakeCall, Transfer). Direct SIP INVITE from agents
       are blocked at Kamailio level (see route[REQUESTS] — 403 for
       direct agent→agent INVITE). GoACD controls the full lifecycle:
         1. Agent Desktop → gRPC → GoACD: MakeCall(from=1007, to=1003)
         2. GoACD: atomic claim both agents (outbound_claim for caller,
            validateAndClaim for callee)
         3. GoACD → ESL → FS: originate sofia/internal/1003 &park()
         4. FS → Kamailio → Agent-003's SIP.js (WebSocket)
         5. GoACD tracks both agents as on-call → no inbound routing
  -->
  <extension name="internal_to_goacd">
    <condition field="destination_number" expression="^(\d{4})$">
      <action application="socket" data="goacd-vip:9090 async full"/>
    </condition>
  </extension>
</context>
```

### FreeSWITCH Scaling

Multiple FreeSWITCH instances behind Kamailio dispatcher. Each instance handles ~2,000 concurrent calls (media channels). Kamailio load-balances SIP INVITE across the pool.

---

## 18.2.4 GoACD Server — Queue + Routing + IVR Controller

**What it is:** A custom ACD (Automatic Call Distribution) server written in **Go**, communicating with FreeSWITCH via **ESL** (Event Socket Library). GoACD is the brain of the voice channel — it controls every call from arrival to completion.

**Why a custom Go ACD?** See [18-3-acd-evaluation.md](./18-3-acd-evaluation.md) for full evaluation of alternatives.

### Core Responsibilities

| Responsibility | Description |
|---|---|
| **IVR flow execution** | Receive call via outbound ESL → execute IVR flow designed in Omnichannel Admin → send ESL commands to FreeSWITCH (play audio, collect DTMF) → make routing decisions |
| **Queue management** | Maintain caller queues in Redis → play MOH via FreeSWITCH → track position, wait time, SLA |
| **Agent state machine** | Track per-channel agent states (ready/not-ready/on-call/wrap-up/offline) → single source of truth for voice channel |
| **Skill-based routing** | Score available agents using §7.2 algorithm → select TOP-N candidates → attempt delivery |
| **Call bridging** | Instruct FreeSWITCH to bridge caller to selected agent's extension |
| **No-answer handling** | Detect no-answer (timer) → re-route to next candidate → auto Not-Ready agent after N misses |
| **Transfer orchestration** | Handle blind/attended transfer requests from Agent Desktop → instruct FreeSWITCH |
| **CDR generation** | Track call events → generate CDR → publish to Kafka for Interaction Service |
| **Metadata dispatch** | Send call info (caller ID, customer data, IVR selections, queue info) to Agent Desktop via Omnichannel WebSocket |
| **Real-time events** | Publish call/queue/agent events to Kafka → consumed by Omnichannel services |

---

## Related Files

- [README.md](./README.md) — Section index and navigation
- [18-1-architecture-overview.md](./18-1-architecture-overview.md) — High-level architecture diagram
- [18-2a-kamailio-config.md](./18-2a-kamailio-config.md) — Detailed Kamailio configuration
- [18-2b-rtpengine-config.md](./18-2b-rtpengine-config.md) — Detailed rtpengine configuration
- [18-2c-freeswitch-config.md](./18-2c-freeswitch-config.md) — Detailed FreeSWITCH configuration
- [18-3-acd-evaluation.md](./18-3-acd-evaluation.md) — ACD evaluation and decision rationale
- [18-4-goacd-architecture.md](./18-4-goacd-architecture.md) — GoACD internal architecture
