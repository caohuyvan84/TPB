# Omnichannel Contact Center Upgrade Plan — V2

**Document Version:** 2.0
**Date:** 2026-03-16
**Status:** Draft — For Review & Approval
**Base Document:** `OMNICHANNEL-UPGRADE-PLAN.md` (V1 — PortSIP-based)
**Scope:** V2 replaces PortSIP with **Kamailio/dSIPRouter + FreeSWITCH + Custom ACD Server** for the voice channel in Phase 1.

---

## Table of Contents

- [V2 Change Summary](#v2-change-summary)
- [18. Voice Platform Integration Design (Kamailio + FreeSWITCH + GoACD)](#18-voice-platform-integration-design-kamailio--freeswitch--goacd)
  - [18.1 Architecture Overview](#181-architecture-overview)
  - [18.2 Component Roles & Capabilities](#182-component-roles--capabilities)
  - [18.2A Detailed Configuration — dSIPRouter / Kamailio](#182a-detailed-configuration--dsiprouter--kamailio)
  - [18.2B Detailed Configuration — rtpengine](#182b-detailed-configuration--rtpengine)
  - [18.2C Detailed Configuration — FreeSWITCH](#182c-detailed-configuration--freeswitch)
  - [18.3 ACD/Queue Server — Evaluation & Decision](#183-acdqueue-server--evaluation--decision)
  - [18.4 GoACD Architecture](#184-goacd-architecture)
  - [18.5 Call Flow Designs](#185-call-flow-designs)
    - [18.5.4 Call Transfer (Comprehensive — V2.2)](#1854-call-transfer-comprehensive--v22)
      - [18.5.4.1 Transfer to Agent (Blind)](#18541-transfer-to-agent-blind)
      - [18.5.4.2 Transfer to Queue](#18542-transfer-to-queue)
      - [18.5.4.3 Transfer to External Number](#18543-transfer-to-external-number)
      - [18.5.4.4 Attended Transfer (Full Lifecycle)](#18544-attended-transfer-full-lifecycle--v22)
      - [18.5.4.5 Transfer No-Answer Re-routing](#18545-transfer-no-answer-re-routing-strategy-v22)
    - [18.5.5 Cross-FreeSWITCH Transfer (Multi-FS Pool)](#1855-cross-freeswitch-transfer-multi-fs-pool)
    - [18.5.6 Internal Call — Agent-to-Agent (V2.2)](#1856-internal-call--agent-to-agent-direct-call-v22)
  - [18.6 IVR Architecture (Full Media Control via ESL)](#186-ivr-architecture-full-media-control-via-esl)
  - [18.7 Agent State Management & Anti-Desync](#187-agent-state-management--anti-desync)
  - [18.8 Call Routing Engine & Failure Handling](#188-call-routing-engine--failure-handling)
  - [18.9 Sync Architecture](#189-sync-architecture)
  - [18.10 WebRTC Integration](#1810-webrtc-integration)
  - [18.11 Real-time Event Pipeline](#1811-real-time-event-pipeline)
  - [18.12 Data Mapping Tables](#1812-data-mapping-tables)
  - [18.13 Error Handling & Resilience](#1813-error-handling--resilience)
  - [18.14 Performance, Resource Management & Operational Hardening (V2.1)](#1814-performance-resource-management--operational-hardening-v21)
  - [18.15 Docker Infrastructure](#1815-docker-infrastructure)
- [6.4 Built-in Adapters (V2 Update)](#64-built-in-adapters-v2-update)
- [9.1 Voice Channel (V2 Update)](#91-voice-channel-v2-update)
- [15. Phased Implementation Plan (V2 Update)](#15-phased-implementation-plan-v2-update)
- [16. Risk Assessment (V2 Update)](#16-risk-assessment-v2-update)
- [Appendix C: V1 vs V2 Comparison Matrix](#appendix-c-v1-vs-v2-comparison-matrix)
- [Appendix D: Docker Compose (V2)](#appendix-d-docker-compose-v2)

---

## V2 Change Summary

### Why V2?

V1 uses **PortSIP PBX v22.3** as a black-box PBX. This approach is simple to deploy but has critical limitations discovered during detailed design (§18.10–18.12 of V1):

| Limitation (V1/PortSIP) | Impact | V2 Solution |
|---|---|---|
| No REST API for media injection/DTMF collection on active calls | Cannot build programmable IVR from Omnichannel | FreeSWITCH ESL gives full media control |
| Queue routing is PortSIP-internal; Omnichannel cannot direct calls to specific agents | Cannot implement custom skill-based scoring (§7.2) | GoACD controls all routing decisions |
| Agent state sync requires bidirectional polling between 2 independent systems | Desync risk, complex reconciliation | GoACD IS the state authority for voice; single source of truth |
| Vendor lock-in to PortSIP (commercial, closed-source) | License cost, no source access, API changes | 100% open-source stack (Kamailio, FreeSWITCH, rtpengine) |
| PortSIP handles both signaling + media (monolithic) | Cannot scale independently | Kamailio (signaling) + FreeSWITCH (media) scale independently |

### Sections Changed from V1

| Section | Change Type | Description |
|---|---|---|
| **§18** | **REPLACED** | Entire section rewritten: Kamailio/dSIPRouter + FreeSWITCH + GoACD |
| §6.4 | Updated | `PortSipAdapter` → `FreeSwitchAdapter` in Phase 1 |
| §9.1 | Updated | WebRTC via Kamailio+rtpengine, call flows updated |
| §12.2 | Minor | Voice concurrent calls: FreeSWITCH capacity |
| §15 | Updated | Sprint plan reflects new components |
| §16 | Updated | Risk assessment updated |
| §1–5, §7–8, §10–11, §13–14, §17 | **UNCHANGED** | See V1 document |

---

## 18. Voice Platform Integration Design (Kamailio + FreeSWITCH + GoACD)

> **Design Philosophy:** Omnichannel is the MASTER system. Unlike V1 where PortSIP was a semi-autonomous PBX with its own routing, in V2 the **GoACD server has full control** over every voice interaction — IVR execution, queue management, agent selection, call bridging, and failure handling. FreeSWITCH is a "dumb" media server controlled entirely via ESL. Kamailio is a stateless SIP proxy + WebRTC gateway.

### 18.1 Architecture Overview

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

### 18.2 Component Roles & Capabilities

#### 18.2.1 dSIPRouter (Kamailio) — SIP Proxy & WebRTC Gateway

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

**Key Kamailio modules:**

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

**dSIPRouter management features:**
- Web GUI: manage SIP trunks, carriers, domains, routing rules
- FreeSWITCH integration: register FreeSWITCH instances as PBX endpoints
- Carrier groups with failover
- DID routing (DID → specific FreeSWITCH dialplan context)
- REST API for programmatic configuration

#### 18.2.2 rtpengine — Media Relay

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

**Why rtpengine instead of FreeSWITCH native WebRTC (mod_verto)?**
- rtpengine operates in **kernel space** → much lower latency and CPU usage than userspace transcoding
- Decouples WebRTC termination from media processing → can scale independently
- Kamailio has native rtpengine integration → simple SDP manipulation in routing scripts
- FreeSWITCH mod_verto is single-instance and tightly coupled

#### 18.2.3 FreeSWITCH — Media Server

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

**ESL Configuration (FreeSWITCH dialplan):**

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

**FreeSWITCH scaling:** Multiple FreeSWITCH instances behind Kamailio dispatcher. Each instance handles ~2,000 concurrent calls (media channels). Kamailio load-balances SIP INVITE across the pool.

---

### 18.2A Detailed Configuration — dSIPRouter / Kamailio

#### 18.2A.1 Kamailio Routing Script (kamailio.cfg)

```cfg
#!KAMAILIO
#!define WITH_WEBSOCKETS
#!define WITH_TLS
#!define WITH_RTPENGINE
#!define WITH_ANTIFLOOD
#!define WITH_AUTH

# ── Global Parameters ──────────────────────────────────
debug=2
log_strerror=yes
log_facility=LOG_LOCAL0
log_prefix="{$mt $hdr(CSeq) $ci} "

children=8                       # SIP worker processes
tcp_children=4                   # TCP workers (for WSS)
tcp_connection_lifetime=3600     # 1 hour (WebSocket keepalive)
tcp_accept_no_cl=yes             # Accept TCP without Content-Length (some WebRTC clients)
tcp_rd_buf_size=16384

listen=udp:KAMAILIO_IP:5060     # SIP UDP
listen=tcp:KAMAILIO_IP:5060     # SIP TCP
listen=tls:KAMAILIO_IP:5061     # SIP TLS
listen=tls:KAMAILIO_IP:5066     # WebSocket Secure (WSS)

# ── Module Loading ─────────────────────────────────────
loadmodule "db_mysql.so"         # MariaDB backend
loadmodule "tm.so"               # Transaction module
loadmodule "tmx.so"              # Transaction extensions
loadmodule "sl.so"               # Stateless replies
loadmodule "rr.so"               # Record-Route
loadmodule "pv.so"               # Pseudo-variables
loadmodule "maxfwd.so"           # Max-Forwards check
loadmodule "textops.so"          # SDP manipulation
loadmodule "siputils.so"         # SIP utilities
loadmodule "xlog.so"             # Extended logging
loadmodule "sanity.so"           # SIP message sanity checks
loadmodule "path.so"             # Path header (for NAT)
loadmodule "sdpops.so"           # SDP operations
loadmodule "nathelper.so"        # NAT traversal
loadmodule "dialog.so"           # Dialog tracking
loadmodule "htable.so"           # In-memory hash tables (rate limit, blacklist)

# Authentication (ephemeral token-based — no static SIP passwords sent to client)
loadmodule "auth.so"
loadmodule "auth_ephemeral.so"    # V2.2: HMAC-based time-limited SIP tokens (replaces auth_db for agent auth)

# User location
loadmodule "usrloc.so"
loadmodule "registrar.so"

# Dispatcher (FS load balancing)
loadmodule "dispatcher.so"

# Permissions (ACL)
loadmodule "permissions.so"

# WebSocket
loadmodule "websocket.so"

# TLS
loadmodule "tls.so"

# rtpengine
loadmodule "rtpengine.so"

# Anti-flood
loadmodule "pike.so"

# Topology hiding
loadmodule "topoh.so"

# JSON logging
loadmodule "jansson.so"

# ── Module Parameters ──────────────────────────────────

# --- TLS ---
modparam("tls", "config", "/etc/kamailio/tls.cfg")
modparam("tls", "tls_force_run", 1)

# --- Auth (Ephemeral Token) ---
# V2.2: auth_ephemeral uses HMAC-SHA1 time-limited tokens (TURN-style credentials).
# No DB lookup needed for agent SIP authentication — pure CPU computation.
# Shared secret must match GoACD's GOACD_SIP_EPHEMERAL_SECRET env var.
modparam("auth_ephemeral", "secret", "EPHEMERAL_SHARED_SECRET")
# Token validity window: ±300s (5 minutes) to handle clock skew + re-REGISTER timing
modparam("auth_ephemeral", "username_format", 1)  # Format: <expiry_timestamp>:<extension>

# --- Auth DB (retained for SIP trunk authentication only) ---
# Agent auth uses auth_ephemeral above. auth_db is only for trunk credentials.
loadmodule "auth_db.so"
modparam("auth_db", "db_url", "mysql://kamailio:KAMAILIO_DB_PASS@mariadb-kam/kamailio")
modparam("auth_db", "calculate_ha1", 0)
modparam("auth_db", "password_column", "ha1")
modparam("auth_db", "load_credentials", "")
modparam("auth_db", "use_domain", 1)

# --- User Location ---
modparam("usrloc", "db_url", "mysql://kamailio:KAMAILIO_DB_PASS@mariadb-kam/kamailio")
modparam("usrloc", "db_mode", 2)           # Write-Through (DB + memory)
modparam("usrloc", "use_domain", 1)
modparam("usrloc", "nat_bflag", 6)

# --- Registrar ---
modparam("registrar", "max_contacts", 1)    # Single registration per AOR (§18.14.7)
modparam("registrar", "max_expires", 120)    # Max 120s registration
modparam("registrar", "min_expires", 30)     # Min 30s (matches SIP.js config)
modparam("registrar", "default_expires", 60)

# --- Dispatcher (FreeSWITCH Pool) ---
modparam("dispatcher", "db_url", "mysql://kamailio:KAMAILIO_DB_PASS@mariadb-kam/kamailio")
modparam("dispatcher", "ds_ping_method", "OPTIONS")
modparam("dispatcher", "ds_ping_interval", 5)        # Probe FS every 5s
modparam("dispatcher", "ds_probing_threshold", 3)     # Mark down after 3 failed probes
modparam("dispatcher", "ds_inactive_threshold", 5)    # Mark back up after 5 successful probes
modparam("dispatcher", "ds_probing_mode", 1)          # Probe all destinations (not just failed)
modparam("dispatcher", "ds_ping_from", "sip:kamailio@SIP_DOMAIN")

# Dispatcher sets (populated via dSIPRouter GUI or SQL):
# SET 1: FreeSWITCH instances (for inbound PSTN calls)
#   1 sip:freeswitch-1:5080 0 0 weight=50
#   1 sip:freeswitch-2:5080 0 0 weight=50
# SET 2: FreeSWITCH instances (for WebRTC agent calls)
#   2 sip:freeswitch-1:5080 0 0 weight=50
#   2 sip:freeswitch-2:5080 0 0 weight=50

# --- rtpengine ---
modparam("rtpengine", "rtpengine_sock", "udp:rtpengine:22222")
# For HA: multiple rtpengine instances
# modparam("rtpengine", "rtpengine_sock", "udp:rtpengine-1:22222=1 udp:rtpengine-2:22222=1")
modparam("rtpengine", "rtpengine_disable_tout", 20)  # Retry disabled instance after 20s

# --- Dialog ---
modparam("dialog", "db_url", "mysql://kamailio:KAMAILIO_DB_PASS@mariadb-kam/kamailio")
modparam("dialog", "dlg_flag", 4)
modparam("dialog", "enable_stats", 1)

# --- NAT Helper ---
modparam("nathelper", "received_avp", "$avp(RECEIVED)")
modparam("nathelper", "natping_interval", 30)
modparam("nathelper", "sipping_from", "sip:keepalive@SIP_DOMAIN")
modparam("nathelper", "sipping_method", "OPTIONS")

# --- Pike (Anti-Flood) ---
modparam("pike", "sampling_time_unit", 2)    # 2 second window
modparam("pike", "reqs_density_per_unit", 30) # Max 30 requests per 2s per IP
modparam("pike", "remove_latency", 120)       # Unblock after 120s

# --- htable (Rate Limiting & Blacklist) ---
modparam("htable", "htable", "ipban=>size=8;autoexpire=300;")
modparam("htable", "htable", "failedauth=>size=8;autoexpire=120;")

# --- Topology Hiding ---
modparam("topoh", "mask_ip", "KAMAILIO_IP")
modparam("topoh", "mask_callid", 1)

# --- Transaction ---
modparam("tm", "fr_timer", 5000)       # Final response timeout: 5s
modparam("tm", "fr_inv_timer", 30000)  # INVITE final response timeout: 30s
modparam("tm", "restart_fr_on_each_reply", 1)

# ── Main Request Route ─────────────────────────────────

request_route {
    # --- Per-request initial checks ---
    if (!mf_process_maxfwd_header("10")) {
        sl_send_reply("483", "Too Many Hops");
        exit;
    }

    if (!sanity_check("17895", "7")) {
        xlog("L_WARN", "Malformed SIP message from $si:$sp\n");
        exit;
    }

    # --- Anti-flood protection ---
#!ifdef WITH_ANTIFLOOD
    if (src_ip != myself) {
        if ($sht(ipban=>$si) != $null) {
            xdbg("Banned IP $si — dropping\n");
            exit;
        }
        if (!pike_check_req()) {
            $sht(ipban=>$si) = 1;
            xlog("L_ALERT", "PIKE: Blocking IP $si — rate limit exceeded\n");
            exit;
        }
    }
#!endif

    # --- WebSocket handling ---
#!ifdef WITH_WEBSOCKETS
    if (nat_uac_test("64")) {
        # WebSocket request — force rport, fix contact
        force_rport();
        if (is_method("REGISTER")) {
            fix_nated_register();
        } else {
            if (is_first_hop()) {
                set_contact_alias();
            }
        }
    }
#!endif

    # --- NAT detection for non-WebSocket ---
    if (nat_uac_test("19")) {
        force_rport();
        if (is_method("REGISTER")) {
            fix_nated_register();
        } else {
            fix_nated_contact();
        }
        setbflag(6); # NAT flag
    }

    # --- CANCEL processing ---
    if (is_method("CANCEL")) {
        if (t_check_trans()) {
            route(RELAY);
        }
        exit;
    }

    # --- Retransmission absorption ---
    if (!is_method("ACK")) {
        if (t_precheck_trans()) {
            t_check_trans();
            exit;
        }
        t_check_trans();
    }

    # --- Record-Route for in-dialog requests ---
    if (is_method("INVITE|SUBSCRIBE")) {
        record_route();
    }

    # --- In-dialog requests (BYE, re-INVITE, etc.) ---
    if (has_totag()) {
        if (loose_route()) {
#!ifdef WITH_WEBSOCKETS
            if ($du == "") {
                if (!handle_ruri_alias()) {
                    xlog("L_ERR", "Bad alias <$ru> $si\n");
                    sl_send_reply("400", "Bad Request");
                    exit;
                }
            }
#!endif
            # rtpengine for in-dialog (re-INVITE, hold/unhold)
            if (is_method("INVITE|UPDATE")) {
                route(RTPENGINE);
            }
            route(RELAY);
            exit;
        }

        if (is_method("ACK")) {
            if (t_check_trans()) {
                route(RELAY);
                exit;
            }
            exit;
        }

        sl_send_reply("404", "Not Found");
        exit;
    }

    # ══════ Initial Requests (no to-tag) ══════

    # --- REGISTER ---
    if (is_method("REGISTER")) {
        route(AUTH);
        route(REGISTRAR);
        exit;
    }

    # --- Authentication for non-REGISTER ---
    if (is_method("INVITE|MESSAGE|SUBSCRIBE")) {
        if (from_uri != myself) {
            # External (trunk) — check IP ACL
            if (!allow_source_address("trusted_peers")) {
                sl_send_reply("403", "Forbidden");
                exit;
            }
        } else {
            # Internal (agent) — digest auth
            route(AUTH);
        }
    }

    # --- INVITE routing ---
    if (is_method("INVITE")) {
        # Track dialog for statistics
        setflag(4);

        # --- Cross-FS bridge (from GoACD) ---
        if (is_present_hf("X-Cross-FS-Bridge")) {
            route(RTPENGINE);
            $du = "sip:" + $hdr(X-Target-FS);
            route(RELAY);
            exit;
        }

        # --- From SIP Trunk (PSTN inbound) ---
        if (from_uri != myself) {
            route(RTPENGINE);
            route(DISPATCH_TO_FS);
            exit;
        }

        # --- From FreeSWITCH (to agent or trunk) ---
        if ($si == "freeswitch-1" || $si == "freeswitch-2" || $si =~ "^10\.0\.") {
            route(RTPENGINE);
            # If destination is a registered agent extension
            if ($rU =~ "^[0-9]{4}$") {
                route(AGENT_LOOKUP);
                exit;
            }
            # If destination is external (outbound call)
            route(PSTN_OUT);
            exit;
        }

        # --- From WebRTC Agent (click-to-call, etc.) ---
        # V2.2: ALL agent calls (including internal/agent-to-agent) MUST go through
        # GoACD via gRPC (Agent Desktop → CTI Adapter → GoACD → ESL → FS).
        # Direct SIP INVITE from agent to another extension is BLOCKED.
        # This ensures GoACD always knows agent state (on-call) and can prevent
        # inbound routing to busy agents. Without this, GoACD would not track
        # internal calls, leading to double-assignment.
        #
        # If an agent's SIP.js somehow sends a direct INVITE (bypassing CTI Adapter),
        # reject it with 403 and log for security review.
        if ($rU =~ "^[0-9]{4}$") {
            xlog("L_WARN", "BLOCKED: direct agent-to-agent INVITE from $fU to $rU — must use GoACD\n");
            sl_send_reply("403", "Direct calls not allowed — use Agent Desktop");
            exit;
        }

        sl_send_reply("404", "Not Found");
        exit;
    }

    # --- Other methods ---
    if (is_method("OPTIONS")) {
        sl_send_reply("200", "OK");
        exit;
    }

    route(RELAY);
}

# ── Sub-Routes ─────────────────────────────────────────

route[RELAY] {
    if (isbflagset(6)) {
        add_rr_param(";nat=yes");
    }
    if (!t_relay()) {
        sl_reply_error();
    }
    exit;
}

route[AUTH] {
    if (is_method("REGISTER") || from_uri == myself) {
        # V2.2: Determine auth method based on source
        # - WebSocket (agents with SIP.js) → auth_ephemeral (HMAC token)
        # - Non-WebSocket (SIP trunks) → auth_db (static HA1 credentials)
        if (proto == WS || proto == WSS) {
            # ── Agent auth via ephemeral token ──
            # Token format: username = "<expiry_unix>:<extension>"
            # Password = Base64(HMAC-SHA1(shared_secret, username))
            # Kamailio verifies: HMAC matches + timestamp not expired
            if (!autheph_check("SIP_DOMAIN")) {
                # Track failed auth for brute-force protection
                $var(authcount) = $shtinc(failedauth=>$si);
                if ($var(authcount) >= 5) {
                    $sht(ipban=>$si) = 1;
                    xlog("L_ALERT", "AUTH: Banning IP $si — 5 failed ephemeral auth attempts\n");
                    exit;
                }
                autheph_challenge("SIP_DOMAIN", "1");
                exit;
            }
        } else {
            # ── Trunk auth via static credentials (auth_db) ──
            if (!auth_check("SIP_DOMAIN", "subscriber", "1")) {
                $var(authcount) = $shtinc(failedauth=>$si);
                if ($var(authcount) >= 5) {
                    $sht(ipban=>$si) = 1;
                    xlog("L_ALERT", "AUTH: Banning IP $si — 5 failed trunk auth attempts\n");
                    exit;
                }
                auth_challenge("SIP_DOMAIN", "1");
                exit;
            }
        }
        # Reset failed auth counter on success
        $sht(failedauth=>$si) = $null;
    }
    consume_credentials();
}

route[REGISTRAR] {
    if (!save("location")) {
        sl_reply_error();
    }
    exit;
}

route[RTPENGINE] {
    # Determine rtpengine flags based on source/destination
    $var(rtp_flags) = "trust-address replace-origin replace-session-connection";

    if (nat_uac_test("64")) {
        # WebSocket source/destination
        $var(rtp_flags) = $var(rtp_flags) + " ICE=force DTLS=passive SDES-off";
    }

    # Preserve telephone-event (DTMF) through transcoding
    $var(rtp_flags) = $var(rtp_flags) + " codec-accept-PCMU codec-accept-PCMA codec-accept-telephone-event";

    # Apply rtpengine
    rtpengine_manage($var(rtp_flags));
}

route[DISPATCH_TO_FS] {
    # Load balance INVITE to FreeSWITCH pool (dispatcher set 1)
    if (!ds_select_dst("1", "4")) {
        # 4 = round-robin; alternatives: 0=hash, 10=weight
        xlog("L_ERR", "DISPATCH: No FreeSWITCH available\n");
        sl_send_reply("503", "Service Unavailable");
        exit;
    }

    # Set failure route — try next FS on failure
    t_on_failure("FS_FAILOVER");
    route(RELAY);
}

route[AGENT_LOOKUP] {
    # Lookup agent extension in usrloc
    if (!lookup("location")) {
        # Agent not registered
        sl_send_reply("404", "User Not Found");
        exit;
    }

    # Agent found — relay (rtpengine already applied)
    route(RELAY);
}

route[PSTN_OUT] {
    # Outbound via SIP trunk
    # dSIPRouter configures trunk routing rules
    # Example: route all external numbers via primary trunk, failover to secondary
    $du = "sip:sip_trunk_ip:5060";
    route(RELAY);
}

# ── Failure Routes ─────────────────────────────────────

failure_route[FS_FAILOVER] {
    if (t_is_canceled()) exit;

    # Try next FreeSWITCH instance
    if (t_check_status("5[0-9][0-9]") || t_check_status("408")) {
        xlog("L_WARN", "DISPATCH: FS $du failed — trying next\n");
        if (ds_next_dst()) {
            t_on_failure("FS_FAILOVER");
            route(RELAY);
            exit;
        }
        # All FS instances down
        xlog("L_CRIT", "DISPATCH: ALL FreeSWITCH instances down!\n");
    }
}

# ── Reply Route ────────────────────────────────────────

reply_route {
    if (nat_uac_test("64")) {
        # WebSocket reply — rtpengine for SDP
        rtpengine_manage("trust-address replace-origin replace-session-connection ICE=force DTLS=passive SDES-off codec-accept-PCMU codec-accept-PCMA codec-accept-telephone-event");
    }
}

# ── WebSocket Event Route ──────────────────────────────

event_route[xhttp:request] {
    # WebSocket upgrade handling
    if ($hdr(Upgrade) =~ "websocket" && $hdr(Connection) =~ "Upgrade") {
        if (ws_handle_handshake()) {
            exit;
        }
    }
    xhttp_reply("404", "Not Found", "text/html", "<html><body>Not Found</body></html>");
}
```

#### 18.2A.2 Kamailio TLS Configuration

```cfg
# /etc/kamailio/tls.cfg

[server:default]
method = TLSv1.2+
certificate = /etc/kamailio/certs/kamailio.pem
private_key = /etc/kamailio/certs/kamailio.key
ca_list = /etc/kamailio/certs/ca.pem
require_certificate = no        # Don't require client cert from WebRTC
verify_certificate = no         # SIP.js doesn't send client cert

# WSS listener (port 5066) — for WebRTC agents
[server:KAMAILIO_IP:5066]
method = TLSv1.2+
certificate = /etc/kamailio/certs/pbx.tpb.vn.pem   # Must match SIP domain
private_key = /etc/kamailio/certs/pbx.tpb.vn.key
require_certificate = no
verify_certificate = no

# SIP TLS listener (port 5061) — for SIP trunks
[server:KAMAILIO_IP:5061]
method = TLSv1.2+
certificate = /etc/kamailio/certs/kamailio.pem
private_key = /etc/kamailio/certs/kamailio.key
ca_list = /etc/kamailio/certs/ca.pem
require_certificate = no
verify_certificate = yes        # Verify trunk certificates

# Client TLS (Kamailio → FreeSWITCH, if TLS enabled)
[client:default]
method = TLSv1.2+
verify_certificate = no         # Internal network — trust FS
```

**Certificate provisioning:**
```bash
# Let's Encrypt for public domain (WebRTC WSS)
certbot certonly --standalone -d pbx.tpb.vn
ln -s /etc/letsencrypt/live/pbx.tpb.vn/fullchain.pem /etc/kamailio/certs/pbx.tpb.vn.pem
ln -s /etc/letsencrypt/live/pbx.tpb.vn/privkey.pem /etc/kamailio/certs/pbx.tpb.vn.key

# Auto-renewal cron (reload Kamailio after renewal)
# 0 3 * * * certbot renew --post-hook "kamctl tls.reload"
```

#### 18.2A.3 Kamailio Dispatcher Configuration (FS Pool)

```sql
-- Kamailio dispatcher table: FreeSWITCH pool
-- Managed via dSIPRouter GUI or direct SQL

-- Set 1: FreeSWITCH instances for inbound calls
INSERT INTO dispatcher (setid, destination, flags, priority, attrs, description)
VALUES
  (1, 'sip:freeswitch-1:5080', 0, 0, 'weight=50;duid=fs1', 'FreeSWITCH Node 1'),
  (1, 'sip:freeswitch-2:5080', 0, 0, 'weight=50;duid=fs2', 'FreeSWITCH Node 2');

-- Set 2: (reserved for future WebRTC-specific routing if needed)
-- For now, same pool as set 1
```

**Dispatcher algorithms available:**

| Algorithm | Value | Use Case |
|---|---|---|
| Hash over Call-ID | 0 | Stick same call to same FS (re-INVITE goes to same server) |
| Hash over From-URI | 1 | Stick same caller to same FS |
| Hash over To-URI | 2 | Stick same destination to same FS |
| Round-Robin | 4 | Even distribution (default for new calls) |
| Weight-based | 10 | Distribute by capacity ratio |

**Recommended:** Algorithm 4 (round-robin) for initial INVITE, algorithm 0 (Call-ID hash) for in-dialog.

#### 18.2A.4 Kamailio HA — keepalived (Active-Passive VIP)

```
                    ┌─────────────────┐
                    │  Virtual IP     │
                    │  (VIP)          │
                    │  SIP_DOMAIN     │
                    └────────┬────────┘
                             │
                    ┌────────┼────────┐
                    │                 │
            ┌───────▼───────┐ ┌──────▼────────┐
            │ Kamailio-1    │ │ Kamailio-2    │
            │ (MASTER)      │ │ (BACKUP)      │
            │ Priority: 101 │ │ Priority: 100 │
            │ keepalived    │ │ keepalived    │
            └───────────────┘ └───────────────┘
```

```bash
# /etc/keepalived/keepalived.conf (Kamailio-1 — MASTER)

vrrp_script chk_kamailio {
    script "/usr/bin/kamctl monitor | grep -q 'running'"
    interval 2
    weight -20
    fall 3
    rise 2
}

vrrp_instance VI_SIP {
    state MASTER
    interface eth0
    virtual_router_id 51
    priority 101
    advert_int 1

    virtual_ipaddress {
        KAMAILIO_VIP/24
    }

    track_script {
        chk_kamailio
    }

    notify_master "/etc/keepalived/scripts/kamailio-master.sh"
    notify_backup "/etc/keepalived/scripts/kamailio-backup.sh"
}
```

**Failover timeline:** Kamailio is **stateless** — no state to transfer. VIP moves in < 3s. SIP.js auto-re-REGISTERs. Active calls in-progress: SIP BYE/re-INVITE will route correctly via dialog module (both instances share DB). New calls: immediate availability.

#### 18.2A.5 dSIPRouter Initial Setup

```bash
# dSIPRouter one-time setup commands

# 1. Configure domain
dsip-cli domain add pbx.tpb.vn

# 2. Add FreeSWITCH as PBX endpoint
dsip-cli pbx add \
    --name "freeswitch-1" \
    --ip "freeswitch-1" \
    --port 5080 \
    --type freeswitch \
    --domain pbx.tpb.vn

dsip-cli pbx add \
    --name "freeswitch-2" \
    --ip "freeswitch-2" \
    --port 5080 \
    --type freeswitch \
    --domain pbx.tpb.vn

# 3. Add SIP trunk (carrier)
dsip-cli carrier add \
    --name "pstn-primary" \
    --ip "trunk.carrier.vn" \
    --port 5060 \
    --type carrier \
    --auth-type ip

# 4. Configure DID routing
# DID: 1800xxxx → route to FreeSWITCH dispatcher set 1
dsip-cli did add \
    --number "18001234" \
    --carrier "pstn-primary" \
    --pbx-group 1

# Note: V2.2 — Agent SIP auth uses ephemeral HMAC tokens (§18.9.1.3).
# GoACD does NOT write to Kamailio subscriber table for agents.
# subscriber table is used for SIP trunk credentials only.
# dSIPRouter manages trunk entries only.
```

---

### 18.2B Detailed Configuration — rtpengine

#### 18.2B.1 Complete Startup Configuration

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

#### 18.2B.2 Kernel Module vs Userspace Mode

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

#### 18.2B.3 Codec Transcoding Matrix

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

#### 18.2B.4 rtpengine Monitoring & Health

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

**rtpengine HA (dual-instance):**

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

### 18.2C Detailed Configuration — FreeSWITCH

#### 18.2C.1 Module Loading (modules.conf.xml)

```xml
<!-- /etc/freeswitch/autoload_configs/modules.conf.xml -->
<configuration name="modules.conf" description="Modules">
  <modules>
    <!-- ── Core ── -->
    <load module="mod_console"/>
    <load module="mod_logfile"/>
    <load module="mod_event_socket"/>      <!-- ESL — CRITICAL for GoACD -->
    <load module="mod_commands"/>
    <load module="mod_dptools"/>           <!-- Dialplan tools: bridge, park, etc. -->
    <load module="mod_dialplan_xml"/>

    <!-- ── SIP ── -->
    <load module="mod_sofia"/>             <!-- SIP UA -->

    <!-- ── Media / Codecs ── -->
    <load module="mod_spandsp"/>           <!-- T.38, tone detect -->
    <load module="mod_sndfile"/>           <!-- WAV file playback/recording -->
    <load module="mod_native_file"/>       <!-- Native FS file format -->
    <load module="mod_tone_stream"/>       <!-- Tone generation (ringback, etc.) -->
    <load module="mod_local_stream"/>      <!-- Music on Hold streaming -->
    <load module="mod_shout"/>             <!-- MP3 playback (optional: HTTP streams) -->

    <!-- ── DTMF ── -->
    <load module="mod_dtmf"/>              <!-- DTMF detection/generation -->

    <!-- ── Recording ── -->
    <load module="mod_rec"/>               <!-- Call recording -->

    <!-- ── Conference ── -->
    <load module="mod_conference"/>         <!-- 3-way calls, supervisor barge -->

    <!-- ── TTS (Phase 2+) ── -->
    <!-- <load module="mod_tts_commandline"/> -->

    <!-- ── ASR/AI (Phase 4) ── -->
    <!-- <load module="mod_audio_fork"/>   WebSocket audio streaming to AI -->

    <!-- ── Disable unnecessary modules ── -->
    <!-- DO NOT load these (security + performance): -->
    <!-- mod_voicemail, mod_fifo, mod_callcenter (GoACD replaces this),
         mod_verto (using rtpengine instead), mod_signalwire,
         mod_httapi (GoACD handles HTTP calls directly) -->
  </modules>
</configuration>
```

#### 18.2C.2 Event Socket (ESL) Configuration

```xml
<!-- /etc/freeswitch/autoload_configs/event_socket.conf.xml -->
<configuration name="event_socket.conf" description="Socket Client">
  <settings>
    <!-- Inbound ESL: GoACD connects here for monitoring -->
    <param name="nat-map" value="false"/>
    <param name="listen-ip" value="0.0.0.0"/>       <!-- Bind all interfaces -->
    <param name="listen-port" value="8021"/>
    <param name="password" value="FS_ESL_PASSWORD"/>

    <!-- ACL: Only allow GoACD instances to connect -->
    <param name="apply-inbound-acl" value="goacd"/>

    <!-- Event flow control -->
    <param name="stop-on-bind-error" value="true"/>
  </settings>
</configuration>
```

#### 18.2C.3 SIP Profiles

```xml
<!-- /etc/freeswitch/sip_profiles/internal.xml -->
<!-- Internal profile: receives calls FROM Kamailio (agent/trunk traffic) -->
<profile name="internal">
  <settings>
    <param name="sip-ip" value="$${local_ip_v4}"/>
    <param name="sip-port" value="5080"/>
    <param name="rtp-ip" value="$${local_ip_v4}"/>

    <!-- Codec preferences (§18.10): PCMA first for Vietnam carriers -->
    <param name="codec-prefs" value="PCMA,PCMU,opus@48000h@20i@1c"/>
    <param name="inbound-codec-negotiation" value="generous"/>

    <!-- DTMF (§18.14.5) -->
    <param name="dtmf-type" value="rfc2833"/>
    <param name="liberal-dtmf" value="true"/>
    <param name="rfc2833-pt" value="101"/>
    <param name="pass-rfc2833" value="true"/>

    <!-- NAT -->
    <param name="ext-rtp-ip" value="$${local_ip_v4}"/>
    <param name="ext-sip-ip" value="$${local_ip_v4}"/>
    <param name="aggressive-nat-detection" value="false"/>  <!-- Kamailio handles NAT -->
    <param name="NDLB-received-in-nat-reg-contact" value="true"/>

    <!-- Timing -->
    <param name="rtp-timeout-sec" value="60"/>           <!-- No RTP for 60s → hangup -->
    <param name="rtp-hold-timeout-sec" value="3600"/>    <!-- Hold can last 1 hour -->

    <!-- Security -->
    <param name="apply-inbound-acl" value="kamailio"/>   <!-- Only accept from Kamailio IPs -->
    <param name="auth-calls" value="false"/>             <!-- Kamailio already authenticated -->
    <param name="log-auth-failures" value="true"/>

    <!-- Dialplan -->
    <param name="context" value="public"/>               <!-- Route to public context → GoACD -->

    <!-- Recording -->
    <param name="record-path" value="/recordings"/>
    <param name="record-template" value="${strftime(%Y-%m-%d)}/${uuid}.wav"/>

    <!-- Misc -->
    <param name="manage-presence" value="false"/>         <!-- No presence — Kamailio handles -->
    <param name="manage-shared-appearance" value="false"/>
    <param name="disable-register" value="true"/>         <!-- No registration on FS — Kamailio handles -->

    <!-- TLS (optional: for Kamailio → FS if TLS desired internally) -->
    <!-- <param name="tls" value="true"/> -->
    <!-- <param name="tls-cert-dir" value="/etc/freeswitch/tls/"/> -->
  </settings>
</profile>

<!-- /etc/freeswitch/sip_profiles/external.xml -->
<!-- External profile: for direct trunk connections (if any bypass Kamailio) -->
<profile name="external">
  <settings>
    <param name="sip-ip" value="$${local_ip_v4}"/>
    <param name="sip-port" value="5060"/>
    <param name="rtp-ip" value="$${local_ip_v4}"/>

    <!-- Force G.711a for PSTN (§18.10) -->
    <param name="codec-prefs" value="PCMA,PCMU"/>

    <param name="dtmf-type" value="rfc2833"/>
    <param name="context" value="public"/>
    <param name="auth-calls" value="false"/>
    <param name="apply-inbound-acl" value="trusted_trunks"/>
    <param name="disable-register" value="true"/>
  </settings>
</profile>
```

#### 18.2C.4 ACL Configuration

```xml
<!-- /etc/freeswitch/autoload_configs/acl.conf.xml -->
<configuration name="acl.conf" description="Network Lists">
  <network-lists>
    <!-- GoACD instances (allowed to connect via ESL) -->
    <list name="goacd" default="deny">
      <node type="allow" cidr="10.0.0.0/8"/>        <!-- Docker network -->
      <node type="allow" cidr="172.16.0.0/12"/>      <!-- Docker bridge -->
      <node type="allow" cidr="GOACD_HOST_IP/32"/>   <!-- Specific GoACD host (production) -->
    </list>

    <!-- Kamailio (allowed to send SIP) -->
    <list name="kamailio" default="deny">
      <node type="allow" cidr="10.0.0.0/8"/>
      <node type="allow" cidr="172.16.0.0/12"/>
      <node type="allow" cidr="KAMAILIO_IP/32"/>
      <node type="allow" cidr="KAMAILIO_VIP/32"/>
    </list>

    <!-- Trusted trunks (for external profile) -->
    <list name="trusted_trunks" default="deny">
      <node type="allow" cidr="TRUNK_IP_1/32"/>
      <node type="allow" cidr="TRUNK_IP_2/32"/>
    </list>
  </network-lists>
</configuration>
```

#### 18.2C.5 Switch Configuration (Performance Tuning)

```xml
<!-- /etc/freeswitch/autoload_configs/switch.conf.xml -->
<configuration name="switch.conf" description="Core Configuration">
  <settings>
    <!-- ── Session Limits ── -->
    <param name="max-sessions" value="3000"/>             <!-- Max concurrent calls -->
    <param name="sessions-per-second" value="100"/>       <!-- Max new calls/sec -->
    <param name="rtp-start-port" value="16384"/>
    <param name="rtp-end-port" value="32768"/>

    <!-- ── DTMF (§18.14.5) ── -->
    <param name="rtp-digit-delay" value="40"/>

    <!-- ── Logging ── -->
    <param name="loglevel" value="warning"/>              <!-- Production: warning -->
    <param name="colorize-console" value="false"/>
    <param name="max-log-file-size" value="209715200"/>   <!-- 200MB log file max -->
    <param name="log-file-rotation-count" value="5"/>     <!-- Keep 5 rotated files -->

    <!-- ── Core Dumps (debugging) ── -->
    <param name="core-db-dsn" value=""/>                  <!-- Disable core DB (not needed) -->
    <param name="dump-cores" value="true"/>

    <!-- ── Timing ── -->
    <param name="rtp-timer-name" value="soft"/>
    <param name="min-idle-cpu" value="5"/>                <!-- Refuse new calls if CPU < 5% idle -->

    <!-- ── Internal Event System ── -->
    <param name="max-db-handles" value="50"/>
    <param name="db-handle-timeout" value="10"/>
  </settings>
</configuration>
```

#### 18.2C.6 Local Stream — Music on Hold

```xml
<!-- /etc/freeswitch/autoload_configs/local_stream.conf.xml -->
<configuration name="local_stream.conf" description="Music on Hold">
  <directory name="moh_default" path="/audio/moh/default">
    <param name="rate" value="8000"/>                <!-- 8kHz for G.711 compatibility -->
    <param name="channels" value="1"/>               <!-- Mono -->
    <param name="interval" value="20"/>              <!-- 20ms frames -->
    <param name="timer-name" value="soft"/>
    <param name="shuffle" value="true"/>             <!-- Random order -->
  </directory>

  <directory name="moh_premium" path="/audio/moh/premium">
    <param name="rate" value="8000"/>
    <param name="channels" value="1"/>
    <param name="shuffle" value="true"/>
  </directory>

  <!-- Usage in GoACD:
       session.SendESL("playback", "local_stream://moh_default", false)
       Queue config can specify different MOH streams per queue:
         queue.moh_stream = "moh_premium" for VIP queue
  -->
</configuration>
```

**Audio file preparation:**

```bash
# Convert audio files to FreeSWITCH-optimized format
# Input: any format (MP3, WAV, OGG)
# Output: 8kHz, 16-bit, mono, WAV (PCM alaw for PCMA)

# IVR prompts (PCMA for zero-transcode with PSTN)
sox input.wav -r 8000 -c 1 -e a-law /audio/vi/welcome.wav

# MOH (same format)
for f in /audio/moh/raw/*.mp3; do
    sox "$f" -r 8000 -c 1 -e a-law "/audio/moh/default/$(basename ${f%.mp3}.wav)"
done

# Verify format
soxi /audio/vi/welcome.wav
# Channels:      1
# Sample Rate:   8000
# Encoding:      A-law
```

#### 18.2C.7 Recording Configuration

```xml
<!-- Recording is controlled by GoACD via ESL, not FreeSWITCH config.
     But FreeSWITCH needs these settings for recording to work properly. -->

<!-- /etc/freeswitch/autoload_configs/switch.conf.xml (recording-related) -->
<!-- Already covered in §18.2C.5 -->

<!-- Recording path structure (controlled by GoACD):
     /recordings/{YYYY-MM-DD}/{interaction_id}.wav

     GoACD ESL command:
       record_session /recordings/2026-03-17/abc-123.wav

     Format: WAV, 8kHz, mono, PCM (standard for telephony compliance)
     GoACD ensures compliance recording rules:
       - Both legs recorded (caller + agent mixed)
       - Recording starts on bridge, stops on hangup
       - Recording announcement played to caller (if required by law)
-->
```

#### 18.2C.8 FreeSWITCH Directory (Agent SIP Accounts)

```xml
<!-- /etc/freeswitch/directory/default.xml -->
<!-- Agent SIP accounts are NOT manually configured in FreeSWITCH.
     V2.2: Agent auth uses ephemeral HMAC tokens (auth_ephemeral on Kamailio).
     No subscriber table entry needed per agent. Kamailio validates via shared secret.
     FreeSWITCH does NOT handle agent registration (§18.2.3: disable-register=true).

     However, FreeSWITCH needs a "catch-all" user for bridge commands:
-->
<domain name="$${domain}">
  <params>
    <param name="dial-string" value="{^^:sip_invite_domain=${dialed_domain}:presence_id=${dialed_user}@${dialed_domain}}${sofia_contact(*/${dialed_user}@${dialed_domain})}"/>
  </params>

  <!-- No individual user entries needed.
       FreeSWITCH bridges to Kamailio, which resolves agent location.

       GoACD bridge command:
         bridge sofia/internal/1007@pbx.tpb.vn

       FreeSWITCH sends INVITE to Kamailio (via internal profile)
       → Kamailio looks up 1007 in usrloc → forwards to agent's WebSocket

       This is why FreeSWITCH doesn't need per-agent config.
  -->
</domain>
```

#### 18.2C.9 FreeSWITCH HA (Pool Behind Kamailio)

```
FreeSWITCH does NOT cluster or share state between instances.
Each FS instance is independent. HA is achieved by:

1. Multiple FS instances behind Kamailio dispatcher
2. Kamailio health-probes each FS every 5s (SIP OPTIONS)
3. If FS fails probe 3x → removed from pool → no new calls routed there
4. Active calls on failed FS → LOST (FS has no HA for active media)
   → GoACD detects ESL connection drop → marks calls as "interrupted"
   → Agents get notification, CDR preserved from GoACD snapshot
5. Recovery: FS restarts → passes health probe 5x → added back to pool

Mitigation for FS crash:
  • GoACD snapshots active calls every 2s (§18.13.1)
  • CDR data preserved in Redis + GoACD memory
  • Recording file: if FS crashes mid-recording, partial file is preserved
    → Recording sync pipeline marks it as "partial" with actual file size
  • Probability: FS crashes are rare with proper resource allocation (§18.14.4)

Architecture:
  ┌──────────────┐
  │   Kamailio   │
  │  dispatcher  │
  └──────┬───────┘
         │ SIP INVITE (round-robin)
    ┌────┼────┐
    │         │
  ┌─▼──┐  ┌──▼─┐
  │FS-1│  │FS-2│    Each: max 2,000 concurrent calls
  └─┬──┘  └──┬─┘    Total capacity: 4,000 concurrent calls
    │         │
    │  ESL    │ ESL
    │         │
  ┌─▼─────────▼─┐
  │   GoACD     │    Single leader manages both FS instances
  │  (leader)   │    via inbound ESL connections
  └─────────────┘
```

#### 18.2C.10 FreeSWITCH Logging Configuration

```xml
<!-- /etc/freeswitch/autoload_configs/logfile.conf.xml -->
<configuration name="logfile.conf" description="File Logging">
  <settings>
    <param name="rotate-on-hup" value="true"/>
  </settings>
  <profiles>
    <profile name="default">
      <settings>
        <param name="logfile" value="/var/log/freeswitch/freeswitch.log"/>
        <param name="rollover" value="209715200"/>     <!-- 200MB -->
        <param name="maximum-rotate" value="5"/>
      </settings>
      <mappings>
        <!-- Production: WARNING and above only -->
        <map name="all" value="warning,err,crit,alert"/>

        <!-- Debug ESL events (enable temporarily for troubleshooting) -->
        <!-- <map name="all" value="debug,info,notice,warning,err,crit,alert"/> -->
      </mappings>
    </profile>
  </profiles>
</configuration>
```

#### 18.2C.11 Comprehensive Dialplan

```xml
<!-- /etc/freeswitch/dialplan/public.xml -->
<!-- All traffic from Kamailio enters here -->
<context name="public">

  <!-- ── ACL: Only accept from Kamailio ── -->
  <extension name="acl_check" continue="true">
    <condition field="${network_addr}" expression="^(KAMAILIO_IP|KAMAILIO_VIP|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2[0-9]|3[01])\.\d+\.\d+)$" break="on-false">
      <!-- Passed ACL -->
      <action application="log" data="INFO Accepted call from ${network_addr}: ${caller_id_number} → ${destination_number}"/>
    </condition>
    <anti-action application="log" data="WARNING Rejected call from unauthorized IP: ${network_addr}"/>
    <anti-action application="respond" data="403 Forbidden"/>
  </extension>

  <!-- ── Set global variables for GoACD ── -->
  <extension name="set_vars" continue="true">
    <condition>
      <action application="set" data="hangup_after_bridge=true"/>
      <action application="set" data="continue_on_fail=false"/>
      <action application="set" data="record_stereo=false"/>
    </condition>
  </extension>

  <!-- ── Route ALL calls to GoACD via outbound ESL ── -->
  <extension name="route_to_goacd">
    <condition field="destination_number" expression="^(.+)$">
      <action application="socket" data="goacd-vip:9090 async full"/>
    </condition>
  </extension>

</context>

<!-- /etc/freeswitch/dialplan/default.xml -->
<!-- Internal context (if needed for special routing) -->
<context name="default">

  <!-- Internal agent-to-agent calls also go through GoACD -->
  <extension name="internal_to_goacd">
    <condition field="destination_number" expression="^(\d{4})$">
      <action application="socket" data="goacd-vip:9090 async full"/>
    </condition>
  </extension>

  <!-- Voicemail deposit (from GoACD overflow handler) -->
  <extension name="voicemail">
    <condition field="destination_number" expression="^voicemail-(\d+)$">
      <action application="answer"/>
      <action application="playback" data="/audio/vi/voicemail_prompt.wav"/>
      <action application="set" data="record_waste_resources=true"/>
      <action application="record" data="/recordings/voicemail/${strftime(%Y-%m-%d)}/$1_${uuid}.wav 120 5"/>
      <action application="hangup"/>
    </condition>
  </extension>

  <!-- Park (used during attended transfer consultation) -->
  <extension name="park">
    <condition field="destination_number" expression="^park$">
      <action application="park"/>
    </condition>
  </extension>

</context>
```

---

#### 18.2.4 GoACD Server — Queue + Routing + IVR Controller

**What it is:** A custom ACD (Automatic Call Distribution) server written in **Go**, communicating with FreeSWITCH via **ESL** (Event Socket Library). GoACD is the brain of the voice channel — it controls every call from arrival to completion.

**Why a custom Go ACD?** See §18.3 for full evaluation of alternatives.

**Core responsibilities:**

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

### 18.3 ACD/Queue Server — Evaluation & Decision

#### 18.3.1 Options Evaluated

| Option | Description | Effort (1 senior dev) |
|---|---|---|
| **A. Custom Go + ESL** | Build ACD from scratch in Go, full ESL control | 25-35 weeks |
| **B. Jambonz + Custom routing** | Use Jambonz (drachtio+FS) as CPaaS layer, build routing as webhook service | 10-15 weeks |
| **C. mod_callcenter + External brain** | Use FreeSWITCH built-in ACD, add external routing intelligence via ESL | 12-18 weeks |
| **D. Kazoo (2600hz)** | Full Erlang/OTP platform with built-in ACD | 4-8 weeks deploy |
| **E. Wazo Platform** | API-first UC platform with agentd | 2-4 weeks deploy |
| **F. CGRateS** | Go-based rating/routing engine | N/A (not an ACD) |

#### 18.3.2 Detailed Comparison

| Criterion | A. Custom Go | B. Jambonz | C. mod_callcenter | D. Kazoo | E. Wazo |
|---|---|---|---|---|---|
| **Full routing control** | Yes | Yes (webhook) | Partial (tier-only) | Basic | Basic |
| **Skill-based weighted scoring** | Yes | Yes | No | No | No |
| **Customer affinity routing** | Yes | Yes | No | No | No |
| **IVR media control** | Full (ESL) | Full (verbs) | Dialplan only | Yes | Yes |
| **FS compatible** | Yes | Yes | Native | Yes | **No (Asterisk)** |
| **Kamailio compatible** | Yes | No (drachtio) | Yes | Yes | No |
| **Multi-node clustering** | You design | Redis-based | **No** | Yes (Erlang) | Limited |
| **Team skills required** | Go + telephony | Node.js | FS admin | **Erlang** | Python |
| **Vendor dependency** | None | drachtio project | None | 2600hz (declining) | Wazo Inc |
| **Community** | N/A | Small | Large | **Declining** | Medium |
| **License** | Custom | MIT | MPL | MPL | GPL |

#### 18.3.3 Decision: Option A — Custom Go ACD (GoACD)

**Lý do chọn Option A thay vì Option B (Jambonz):**

1. **Kamailio compatibility** — User requirement specifies dSIPRouter/Kamailio as SIP proxy. Jambonz uses drachtio (different SIP server), creating architectural conflict. Replacing drachtio with Kamailio in Jambonz is not straightforward.

2. **Full ESL control** — Direct ESL gives lower latency than webhook round-trips. For time-critical operations (no-answer detection, re-routing), ESL's TCP socket is faster than HTTP webhooks.

3. **Single binary deployment** — Go compiles to a single binary. No Node.js runtime, no drachtio, no jambonz-feature-server — fewer moving parts.

4. **Go advantages for ACD** — Goroutines map perfectly to per-call concurrency (1 goroutine per call, thousands concurrent). Low memory footprint. Excellent for real-time systems.

5. **No abstraction tax** — With direct ESL, GoACD has access to ALL FreeSWITCH capabilities without waiting for a middleware layer to add support.

**Lý do không chọn các options khác:**

- **Option C (mod_callcenter):** No true skill-based routing. Single-node only. Would need so much external logic that the "external brain" becomes a de facto ACD anyway.
- **Option D (Kazoo):** Erlang expertise not available. Community declining. Extreme deployment complexity. ACD module is basic.
- **Option E (Wazo):** Asterisk-only. Incompatible with FreeSWITCH requirement.
- **Option F (CGRateS):** Not an ACD — it's a billing/rating engine. Useful later for CDR rating, but not for call routing.

**Mitigation for high effort (25-35 weeks):**

1. **Phase the build** — Sprint 1.1-1.2: Core ESL + basic queue + round-robin routing. Sprint 1.3-1.4: Skill-based routing + IVR + no-answer handling. Phase 2: Customer affinity, predictive routing.
2. **Use `percipia/eslgo`** — Most mature Go ESL library. Handles connection management, event parsing, command execution.
3. **Reuse Omnichannel components** — Agent state (§8), scoring algorithm (§7.2), queue data structures (§7.3) are already designed. GoACD implements them, not redesigns.
4. **Start with mod_callcenter as scaffolding** — During development, use mod_callcenter for basic queueing while building GoACD. Cut over when GoACD is production-ready.

---

### 18.4 GoACD Architecture

#### 18.4.1 Module Structure

```
goacd/
├── cmd/
│   └── goacd/
│       └── main.go                    # Entry point
├── internal/
│   ├── esl/
│   │   ├── connection.go              # ESL connection management (percipia/eslgo)
│   │   ├── outbound_server.go         # TCP server for outbound ESL (FS → GoACD)
│   │   ├── inbound_client.go          # Persistent connection GoACD → FS (monitoring)
│   │   └── commands.go                # Typed ESL command builders
│   ├── ivr/
│   │   ├── engine.go                  # IVR flow executor (reads FlowDefinition from DB)
│   │   ├── nodes.go                   # IVR node handlers (play, collect, menu, http, condition)
│   │   └── session.go                 # Per-call IVR session state
│   ├── queue/
│   │   ├── manager.go                 # Queue CRUD, Redis sorted sets
│   │   ├── entry.go                   # Queue entry lifecycle (enqueue → assign → dequeue)
│   │   ├── moh.go                     # Music on hold orchestration (via ESL playback)
│   │   ├── sla.go                     # SLA timer, breach detection, overflow
│   │   └── overflow.go                # Overflow handler (priority escalation, voicemail, callback)
│   ├── routing/
│   │   ├── engine.go                  # Routing engine (§7.2 scoring algorithm)
│   │   ├── scorer.go                  # Agent scoring: skill × load × idle × group × affinity
│   │   ├── candidates.go              # Top-N candidate list management
│   │   └── delivery.go               # Call delivery: bridge to agent, no-answer timer, re-route
│   ├── agent/
│   │   ├── state.go                   # Agent state machine (Redis HASH)
│   │   ├── registry.go                # Agent ↔ Extension mapping
│   │   ├── sync.go                    # State sync with Omnichannel Agent Service
│   │   └── heartbeat.go              # SIP registration tracking, WS heartbeat, reconciliation
│   ├── call/
│   │   ├── session.go                 # Active call session tracking
│   │   ├── transfer.go                # Blind/attended transfer via ESL
│   │   ├── conference.go              # 3-way conference via ESL
│   │   ├── recording.go               # Call recording control via ESL
│   │   └── cdr.go                     # CDR generation from call events
│   ├── event/
│   │   ├── publisher.go               # Kafka event publisher
│   │   ├── consumer.go                # Kafka consumer (agent.created, agent.updated, etc.)
│   │   └── websocket.go               # WebSocket events → Omnichannel gateway
│   ├── api/
│   │   ├── grpc_server.go             # gRPC server for Omnichannel services
│   │   ├── rest_server.go             # REST API for admin/monitoring
│   │   └── proto/                     # Protobuf definitions
│   └── config/
│       └── config.go                  # Configuration (env vars, YAML)
├── go.mod
└── go.sum
```

#### 18.4.2 Key Dependencies

```go
// go.mod
module github.com/tpb/goacd

go 1.22

require (
    github.com/percipia/eslgo v0.9.0       // FreeSWITCH ESL library
    github.com/redis/go-redis/v9 v9.5.0    // Redis client
    github.com/segmentio/kafka-go v0.4.47  // Kafka producer/consumer
    google.golang.org/grpc v1.62.0         // gRPC server
    google.golang.org/protobuf v1.33.0     // Protobuf
    github.com/jackc/pgx/v5 v5.5.0        // PostgreSQL (config, CDR persistence)
    github.com/gorilla/websocket v1.5.0    // WebSocket for event streaming
    go.uber.org/zap v1.27.0               // Structured logging
    github.com/prometheus/client_golang    // Metrics
)
```

#### 18.4.3 ESL Connection Model

```
┌─────────────────────────────────────────────────────────┐
│                    GoACD Server                          │
│                                                         │
│  ┌──────────────────────┐  ┌──────────────────────┐    │
│  │ Outbound ESL Server  │  │ Inbound ESL Client   │    │
│  │ (TCP :9090)          │  │ (→ FS :8021)         │    │
│  │                      │  │                      │    │
│  │ FS connects here     │  │ GoACD connects to FS │    │
│  │ when call arrives    │  │ for monitoring &      │    │
│  │                      │  │ global commands       │    │
│  │ 1 goroutine/call     │  │                      │    │
│  │ Full call control    │  │ Subscribe to events:  │    │
│  │                      │  │ CHANNEL_CREATE        │    │
│  │ Commands:            │  │ CHANNEL_ANSWER        │    │
│  │ • playback           │  │ CHANNEL_HANGUP        │    │
│  │ • play_and_get_digits│  │ CUSTOM sofia::register│    │
│  │ • bridge             │  │ CUSTOM sofia::expire  │    │
│  │ • uuid_transfer      │  │                      │    │
│  │ • record_session     │  │ Commands:            │    │
│  │ • hangup             │  │ • uuid_bridge        │    │
│  │                      │  │ • uuid_transfer      │    │
│  └──────────────────────┘  │ • uuid_kill          │    │
│                             │ • originate          │    │
│                             └──────────────────────┘    │
└─────────────────────────────────────────────────────────┘
```

**Outbound ESL** (per-call control):
- FreeSWITCH dialplan routes call to `socket goacd-server:9090 async full`
- GoACD accepts TCP connection, spawns goroutine for that call
- Goroutine has full ESL control: play prompts, collect DTMF, bridge, transfer, hangup
- Connection lifetime = call lifetime
- Natural fit for Go concurrency: 5,000 concurrent calls = 5,000 goroutines (~50MB RAM)

**Inbound ESL** (global monitoring):
- GoACD maintains persistent connection to FreeSWITCH ESL port (8021)
- Subscribes to events: `sofia::register`, `sofia::expire`, `CHANNEL_*`, `DTMF`, `RECORD_*`
- Used for: SIP registration tracking (agent online/offline), global call monitoring, originating outbound calls
- Reconnects automatically on connection loss

#### 18.4.4 gRPC Interface (GoACD ↔ Omnichannel)

```protobuf
// proto/goacd.proto

service GoACDService {
  // Agent state management
  rpc SetAgentState(SetAgentStateRequest) returns (SetAgentStateResponse);
  rpc GetAgentState(GetAgentStateRequest) returns (AgentState);
  rpc ListAgentStates(ListAgentStatesRequest) returns (AgentStateList);

  // Call control (from Agent Desktop via CTI Adapter)
  rpc MakeCall(MakeCallRequest) returns (CallSession);
  rpc AnswerCall(AnswerCallRequest) returns (Empty);
  rpc HangupCall(HangupCallRequest) returns (Empty);
  rpc HoldCall(HoldCallRequest) returns (Empty);
  rpc UnholdCall(UnholdCallRequest) returns (Empty);
  rpc TransferCall(TransferCallRequest) returns (Empty);
  rpc CancelTransfer(CancelTransferRequest) returns (Empty);  // V2.2: abort attended transfer
  rpc ConferenceCall(ConferenceCallRequest) returns (ConferenceSession);

  // Queue management
  rpc GetQueueStats(GetQueueStatsRequest) returns (QueueStats);
  rpc ListQueues(ListQueuesRequest) returns (QueueList);

  // IVR flow sync
  rpc SyncFlowDefinition(FlowDefinition) returns (SyncResponse);

  // Agent registration (Omnichannel → GoACD)
  rpc RegisterAgent(RegisterAgentRequest) returns (AgentRegistration);
  rpc UnregisterAgent(UnregisterAgentRequest) returns (Empty);

  // Event stream (GoACD → Omnichannel)
  rpc StreamEvents(StreamEventsRequest) returns (stream CallEvent);
}
```

#### 18.4.5 Complete Protobuf Message Definitions

```protobuf
syntax = "proto3";
package goacd;

import "google/protobuf/timestamp.proto";

// ─── Agent State ───────────────────────────────────────

message SetAgentStateRequest {
  string agent_id = 1;
  string channel = 2;           // "voice"
  string status = 3;            // "ready", "not_ready", "wrap_up"
  string reason = 4;            // not_ready reason: "break", "training", "meeting"
  string request_id = 5;        // idempotency key (UUID)
}

message SetAgentStateResponse {
  bool success = 1;
  string error_message = 2;
  string actual_status = 3;     // confirmed status after server-side validation
  string previous_status = 4;
}

message GetAgentStateRequest {
  string agent_id = 1;
}

message AgentState {
  string agent_id = 1;
  string voice_status = 2;      // "offline", "registered", "ready", "not_ready", "ringing", "originating", "on_call", "wrap_up"
  string voice_reason = 3;
  int32 voice_count = 4;        // current active voice interactions
  int32 max_voice = 5;
  string extension = 6;
  bool sip_registered = 7;
  google.protobuf.Timestamp last_state_change = 8;
  google.protobuf.Timestamp last_sip_register = 9;
  string fs_instance = 10;      // which FreeSWITCH instance agent is on
  repeated string skills = 11;
  repeated string queue_ids = 12;
}

message ListAgentStatesRequest {
  string status_filter = 1;     // optional: "ready", "on_call", etc.
  string queue_filter = 2;      // optional: filter by queue membership
  int32 limit = 3;
  int32 offset = 4;
}

message AgentStateList {
  repeated AgentState agents = 1;
  int32 total = 2;
}

// ─── Call Control ──────────────────────────────────────

message MakeCallRequest {
  string agent_id = 1;
  string from_extension = 2;
  string to_number = 3;          // external number OR internal extension (4 digits)
  string caller_id_number = 4;   // outbound caller ID override (ignored for internal calls)
  map<string, string> metadata = 5;
  // V2.2: GoACD auto-detects call type:
  //   to_number matches ^[0-9]{4}$ → internal call (§18.5.6)
  //   otherwise → outbound call (§18.5.3)
}

message CallSession {
  string call_id = 1;
  string interaction_id = 2;
  string state = 3;             // "initiating", "ringing", "active", "hold", "wrap_up"
  string caller = 4;
  string callee = 5;
  string agent_id = 6;
  string agent_extension = 7;
  string fs_instance = 8;
  string caller_channel_uuid = 9;
  string agent_channel_uuid = 10;
  google.protobuf.Timestamp started_at = 11;
  google.protobuf.Timestamp answered_at = 12;
  bool recording = 13;
  string recording_path = 14;
}

message AnswerCallRequest {
  string call_id = 1;
  string agent_id = 2;
}

message HangupCallRequest {
  string call_id = 1;
  string agent_id = 2;
  string reason = 3;            // "normal", "busy", "no_answer"
}

message HoldCallRequest {
  string call_id = 1;
  string agent_id = 2;
}

message UnholdCallRequest {
  string call_id = 1;
  string agent_id = 2;
}

message TransferCallRequest {
  string call_id = 1;
  string from_agent_id = 2;
  string to_agent_id = 3;       // set if transferring to specific agent
  string to_number = 4;         // set if transferring to external number
  string to_queue_id = 5;       // set if transferring to queue (V2.2)
  string transfer_type = 6;     // "blind", "attended"
  // Exactly ONE of to_agent_id, to_number, to_queue_id must be set.
  // GoACD validates and rejects if zero or multiple targets specified.
}

// V2.2: Cancel an in-progress attended transfer (return to caller)
message CancelTransferRequest {
  string call_id = 1;
  string agent_id = 2;          // the agent who initiated the transfer
}

message ConferenceCallRequest {
  string call_id = 1;
  string initiator_agent_id = 2;
  string target_agent_id = 3;   // empty if conferencing external number
  string target_number = 4;
}

message ConferenceSession {
  string conference_id = 1;
  string call_id = 2;
  repeated string participant_channels = 3;
  string state = 4;             // "initiating", "active"
}

message Empty {}

// ─── Queue Management ──────────────────────────────────

message GetQueueStatsRequest {
  string queue_id = 1;
}

message QueueStats {
  string queue_id = 1;
  string name = 2;
  int32 entries_count = 3;
  int32 agents_available = 4;
  int32 agents_on_call = 5;
  int32 agents_total = 6;
  double avg_wait_time_seconds = 7;
  double max_wait_time_seconds = 8;
  int32 sla_breaches_today = 9;
  int32 calls_handled_today = 10;
  int32 calls_abandoned_today = 11;
}

message ListQueuesRequest {
  int32 limit = 1;
  int32 offset = 2;
}

message QueueList {
  repeated QueueStats queues = 1;
  int32 total = 2;
}

// ─── IVR Flow ──────────────────────────────────────────

message FlowDefinition {
  string flow_id = 1;
  string name = 2;
  string version = 3;
  bytes flow_json = 4;          // JSON-encoded flow nodes (matches §10.2 schema)
  string fallback_queue_id = 5;
  google.protobuf.Timestamp updated_at = 6;
}

message SyncResponse {
  bool success = 1;
  string error_message = 2;
}

// ─── Agent Registration ────────────────────────────────

message RegisterAgentRequest {
  string agent_id = 1;
  string display_name = 2;
  repeated string skills = 3;
  repeated string queue_ids = 4;
  int32 max_voice = 5;         // max concurrent voice interactions (usually 1)
}

message AgentRegistration {
  string agent_id = 1;
  string extension = 2;
  string sip_domain = 3;
  string wss_uri = 4;
  // V2.2: No sip_password field. Agent auth uses ephemeral HMAC tokens
  // obtained via GetAgentSIPCredentials RPC (§18.9.1.3).
}

// V2.2: Ephemeral SIP credentials (replaces static password delivery)
message SIPCredentials {
  string ws_uri = 1;
  string sip_uri = 2;
  string authorization_user = 3;   // "<expiry_unix>:<extension>" — ephemeral
  string password = 4;             // HMAC-SHA1 token — 5 min TTL
  string display_name = 5;
  string extension = 6;            // bare extension for display/routing
  int64  token_expires_at = 7;     // unix timestamp — client schedules refresh
  repeated ICEServer ice_servers = 8;
}

message UnregisterAgentRequest {
  string agent_id = 1;
}

// ─── Event Stream ──────────────────────────────────────

message StreamEventsRequest {
  repeated string event_types = 1;  // filter: ["call.*", "agent.*", "queue.*"]
  string agent_id = 2;             // optional: filter by agent
  string queue_id = 3;             // optional: filter by queue
}

message CallEvent {
  string event_type = 1;       // "call.started", "call.answered", "call.ended", etc.
  string call_id = 2;
  string interaction_id = 3;
  string agent_id = 4;
  string queue_id = 5;
  map<string, string> data = 6;
  google.protobuf.Timestamp timestamp = 7;
  string correlation_id = 8;
}
```

#### 18.4.6 Core Go Types & Interfaces

```go
// ─── Main GoACD Struct ─────────────────────────────────

type GoACD struct {
    config          *Config
    logger          *zap.Logger
    redis           *redis.Client
    pgPool          *pgxpool.Pool
    kafkaWriter     *kafka.Writer
    kafkaReaders    []*kafka.Reader

    // Core modules
    eslManager      *esl.Manager          // ESL connection lifecycle
    ivrEngine       *ivr.Engine           // IVR flow execution
    queueManager    *queue.Manager        // Queue CRUD, MOH, SLA
    routingEngine   *routing.Engine       // Scoring, candidate selection, claims
    agentState      *agent.StateManager   // Redis-backed agent state
    agentRegistry   *agent.Registry       // Agent ↔ Extension mapping
    agentHeartbeat  *agent.HeartbeatMonitor
    callTracker     *call.Tracker         // Active call sessions
    callRecorder    *call.Recorder        // Recording control
    cdrGenerator    *call.CDRGenerator
    recordingSync   *RecordingSyncPipeline
    eventPublisher  *event.Publisher      // Kafka + Redis pub/sub
    grpcServer      *api.GRPCServer
    restServer      *api.RESTServer
    customerCache   *CustomerCache

    // HA
    instanceID      string
    isLeader        atomic.Bool
    leaderCtx       context.Context
    leaderCancel    context.CancelFunc

    // Session tracking
    activeSessions  map[string]*call.Session
    sessionMu       sync.RWMutex

    // Metrics
    metrics         *Metrics

    // Lifecycle
    wg              sync.WaitGroup        // tracks all goroutines
    shutdownCh      chan struct{}
}

// ─── Configuration ─────────────────────────────────────

type Config struct {
    // Instance
    InstanceID          string        `env:"GOACD_INSTANCE_ID" required:"true"`
    LogLevel            string        `env:"GOACD_LOG_LEVEL" default:"info"`
    LogFormat           string        `env:"GOACD_LOG_FORMAT" default:"json"` // "json" or "console"

    // FreeSWITCH ESL
    FSESLHosts          []string      `env:"GOACD_FS_ESL_HOSTS" required:"true"` // comma-separated
    FSESLPassword       string        `env:"GOACD_FS_ESL_PASSWORD" required:"true"`
    FSESLReconnectDelay time.Duration `env:"GOACD_FS_ESL_RECONNECT_DELAY" default:"3s"`
    ESLListenPort       int           `env:"GOACD_ESL_LISTEN_PORT" default:"9090"`
    ESLMaxConnections   int           `env:"GOACD_ESL_MAX_CONNECTIONS" default:"5000"`
    ESLCmdBufferSize    int           `env:"GOACD_ESL_CMD_BUFFER_SIZE" default:"32"`

    // gRPC
    GRPCPort            int           `env:"GOACD_GRPC_PORT" default:"9091"`
    GRPCMaxRecvMsgSize  int           `env:"GOACD_GRPC_MAX_RECV_MSG_SIZE" default:"4194304"` // 4MB
    GRPCKeepaliveTime   time.Duration `env:"GOACD_GRPC_KEEPALIVE_TIME" default:"30s"`

    // REST API
    RESTPort            int           `env:"GOACD_REST_PORT" default:"9092"`

    // Prometheus
    MetricsPort         int           `env:"GOACD_METRICS_PORT" default:"9093"`

    // Redis
    RedisURL            string        `env:"GOACD_REDIS_URL" required:"true"`
    RedisPoolSize       int           `env:"GOACD_REDIS_POOL_SIZE" default:"200"`
    RedisMinIdleConns   int           `env:"GOACD_REDIS_MIN_IDLE_CONNS" default:"50"`
    RedisReadTimeout    time.Duration `env:"GOACD_REDIS_READ_TIMEOUT" default:"3s"`
    RedisWriteTimeout   time.Duration `env:"GOACD_REDIS_WRITE_TIMEOUT" default:"3s"`

    // Kafka
    KafkaBrokers        []string      `env:"GOACD_KAFKA_BROKERS" required:"true"`
    KafkaGroupID        string        `env:"GOACD_KAFKA_GROUP_ID" default:"goacd"`
    KafkaBatchSize      int           `env:"GOACD_KAFKA_BATCH_SIZE" default:"100"`
    KafkaBatchTimeout   time.Duration `env:"GOACD_KAFKA_BATCH_TIMEOUT" default:"100ms"`

    // PostgreSQL
    PGURL               string        `env:"GOACD_PG_URL" required:"true"`
    PGMaxConns          int32         `env:"GOACD_PG_MAX_CONNS" default:"20"`

    // SIP/Voice
    SIPDomain           string        `env:"GOACD_SIP_DOMAIN" required:"true"`
    ExtRangeStart       int           `env:"GOACD_EXT_RANGE_START" default:"1000"`
    ExtRangeEnd         int           `env:"GOACD_EXT_RANGE_END" default:"9999"`

    // Kamailio DB (for SIP trunk credential management + location queries)
    // V2.2: NOT used for agent SIP auth (ephemeral tokens via shared secret)
    KamailioDBHost      string        `env:"GOACD_KAMAILIO_DB_HOST"`
    KamailioDBName      string        `env:"GOACD_KAMAILIO_DB_NAME" default:"kamailio"`
    KamailioDBUser      string        `env:"GOACD_KAMAILIO_DB_USER" default:"kamailio"`
    KamailioDBPassword  string        `env:"GOACD_KAMAILIO_DB_PASSWORD"`

    // V2.2: Ephemeral SIP auth shared secret (must match Kamailio auth_ephemeral config)
    SIPEphemeralSecret  string        `env:"GOACD_SIP_EPHEMERAL_SECRET" required:"true"`

    // Leader Election
    LeaderTTL           time.Duration `env:"GOACD_LEADER_TTL" default:"10s"`
    LeaderRenewInterval time.Duration `env:"GOACD_LEADER_RENEW" default:"3s"`
    LeaderAcquireRetry  time.Duration `env:"GOACD_LEADER_ACQUIRE_RETRY" default:"1s"`

    // Call Handling
    MaxCallDuration     time.Duration `env:"GOACD_MAX_CALL_DURATION" default:"4h"`
    DefaultRingTimeout  int           `env:"GOACD_RING_TIMEOUT" default:"15"` // seconds
    CandidateListSize   int           `env:"GOACD_CANDIDATE_LIST_SIZE" default:"5"`
    ParallelRingCount   int           `env:"GOACD_PARALLEL_RING_COUNT" default:"2"`
    CallSnapshotInterval time.Duration `env:"GOACD_CALL_SNAPSHOT_INTERVAL" default:"2s"`
    DefaultACWTimeout   time.Duration `env:"GOACD_ACW_TIMEOUT" default:"60s"`
    MaxMissedCalls      int           `env:"GOACD_MAX_MISSED_CALLS" default:"2"`

    // IVR
    IVRMaxNodes         int           `env:"GOACD_IVR_MAX_NODES" default:"50"`
    IVRHTTPTimeout      time.Duration `env:"GOACD_IVR_HTTP_TIMEOUT" default:"5s"`
    DefaultFallbackQueueID string     `env:"GOACD_DEFAULT_FALLBACK_QUEUE"`

    // Recording Sync
    RecordingSyncWorkers  int           `env:"GOACD_RECORDING_SYNC_WORKERS" default:"4"`
    RecordingRetryMax     int           `env:"GOACD_RECORDING_RETRY_MAX" default:"5"`
    RecordingRetryBase    time.Duration `env:"GOACD_RECORDING_RETRY_BASE" default:"10s"`
    RecordingDiskLimit    float64       `env:"GOACD_RECORDING_DISK_LIMIT" default:"0.85"`
    RecordingCleanupDelay time.Duration `env:"GOACD_RECORDING_CLEANUP_DELAY" default:"1h"`

    // Customer Cache
    CustomerCacheSize     int           `env:"GOACD_CUSTOMER_CACHE_SIZE" default:"10000"`
    CustomerCacheTTL      time.Duration `env:"GOACD_CUSTOMER_CACHE_TTL" default:"5m"`

    // Session Reaper
    SessionReaperInterval time.Duration `env:"GOACD_SESSION_REAPER_INTERVAL" default:"30s"`
    StaleClaimReaperInterval time.Duration `env:"GOACD_STALE_CLAIM_REAPER_INTERVAL" default:"15s"`
    ReconciliationInterval   time.Duration `env:"GOACD_RECONCILIATION_INTERVAL" default:"60s"`
}

// ─── Module Interfaces ─────────────────────────────────

// IRoutingStrategy — pluggable routing strategies
type IRoutingStrategy interface {
    Name() string
    Score(agent AgentCandidate, call RoutingContext) float64
}

// Built-in strategies:
//   SkillBasedStrategy  — score = skill × load × idle × group × affinity (default)
//   RoundRobinStrategy  — equal distribution
//   LongestIdleStrategy — highest idle time wins
//   RingAllStrategy     — parallel ring all available agents

// IQueueDrainer — called when an agent becomes available
type IQueueDrainer interface {
    OnAgentAvailable(agentID string, channel ChannelType) error
}

// IEventSink — abstraction over event destinations
type IEventSink interface {
    Publish(ctx context.Context, topic string, event interface{}) error
    PublishBatch(ctx context.Context, topic string, events []interface{}) error
}

// ICallSessionHandler — lifecycle hooks for call session
type ICallSessionHandler interface {
    OnCallStarted(session *call.Session)
    OnCallAnswered(session *call.Session)
    OnCallEnded(session *call.Session, cause string)
    OnCallTransferred(session *call.Session, toAgent string)
}

// IAgentStateObserver — notified on agent state changes
type IAgentStateObserver interface {
    OnStateChanged(agentID string, oldState, newState string)
}
```

```go
// ─── Key Data Types ────────────────────────────────────

type ChannelType string
const (
    ChannelVoice ChannelType = "voice"
    ChannelChat  ChannelType = "chat"
    ChannelEmail ChannelType = "email"
)

type CallState string
const (
    CallStateIVR      CallState = "ivr"
    CallStateQueued   CallState = "queued"
    CallStateRinging  CallState = "ringing"
    CallStateActive   CallState = "active"
    CallStateHold     CallState = "hold"
    CallStateWrapUp   CallState = "wrap_up"
)

type AgentVoiceStatus string
const (
    AgentOffline    AgentVoiceStatus = "offline"
    AgentRegistered AgentVoiceStatus = "registered"
    AgentReady      AgentVoiceStatus = "ready"
    AgentNotReady   AgentVoiceStatus = "not_ready"
    AgentRinging    AgentVoiceStatus = "ringing"
    AgentOnCall     AgentVoiceStatus = "on_call"
    AgentWrapUp     AgentVoiceStatus = "wrap_up"
)

// RoutingContext — all info needed for routing decision
type RoutingContext struct {
    CallID          string
    InteractionID   string
    QueueID         string
    RequiredSkills  []string
    Priority        int             // 1=low, 2=normal, 3=high, 4=urgent
    CustomerID      string
    CustomerVIP     bool
    CallerNumber    string
    IVRSelections   []string
    Tags            map[string]string
    EnqueuedAt      time.Time
}

// AgentCandidate — agent evaluated during routing
type AgentCandidate struct {
    AgentID       string
    Extension     string
    FSInstance    string
    Skills        map[string]float64  // skill_name → proficiency (0.0-1.0)
    CurrentLoad   float64             // current_interactions / max_interactions
    IdleSeconds   float64             // seconds since last call ended
    GroupMatch    float64             // 1.0 if in same queue group, 0.5 if overflow
    Affinity      float64             // 1.0 if served this customer before, 0.0 otherwise
    Score         float64             // computed score (filled by routing engine)
}

// CallSnapshot — serialized to Redis for HA recovery
type CallSnapshot struct {
    CallID            string    `json:"call_id"`
    InteractionID     string    `json:"interaction_id"`
    CallerChannel     string    `json:"caller_channel"`
    AgentChannel      string    `json:"agent_channel"`
    AgentID           string    `json:"agent_id"`
    AgentExtension    string    `json:"agent_extension"`
    FSInstance        string    `json:"fs_instance"`
    State             CallState `json:"state"`
    QueueID           string    `json:"queue_id"`
    Recording         bool      `json:"recording"`
    RecordingPath     string    `json:"recording_path"`
    StartedAt         time.Time `json:"started_at"`
    AnsweredAt        time.Time `json:"answered_at,omitempty"`
    SnapshotAt        time.Time `json:"snapshot_at"`
    CorrelationID     string    `json:"correlation_id"`
    TransferHistory   []string  `json:"transfer_history,omitempty"`
}

// CDR — Call Detail Record
type CDR struct {
    ID              string            `json:"id"`
    CallID          string            `json:"call_id"`
    InteractionID   string            `json:"interaction_id"`
    Caller          string            `json:"caller"`
    Callee          string            `json:"callee"`
    AgentID         string            `json:"agent_id"`
    AgentExtension  string            `json:"agent_extension"`
    QueueID         string            `json:"queue_id"`
    StartTime       time.Time         `json:"start_time"`
    AnswerTime      *time.Time        `json:"answer_time,omitempty"`
    EndTime         time.Time         `json:"end_time"`
    Duration        int               `json:"duration"`           // total seconds
    TalkTime        int               `json:"talk_time"`          // answer→end seconds
    QueueWaitTime   int               `json:"queue_wait_time"`
    IVRTime         int               `json:"ivr_time"`
    HangupCause     string            `json:"hangup_cause"`
    RecordingPath   string            `json:"recording_path"`
    IVRSelections   []string          `json:"ivr_selections"`
    RoutingData     json.RawMessage   `json:"routing_data"`
    TransferHistory []string          `json:"transfer_history"`
    CorrelationID   string            `json:"correlation_id"`
}

// KafkaEvent types — published to Kafka topics
type CallStartedEvent struct {
    CallID        string    `json:"call_id"`
    InteractionID string    `json:"interaction_id"`
    Caller        string    `json:"caller"`
    CalledDID     string    `json:"called_did"`
    Timestamp     time.Time `json:"timestamp"`
    CorrelationID string    `json:"correlation_id"`
}

type CallAnsweredEvent struct {
    CallID        string    `json:"call_id"`
    AgentID       string    `json:"agent_id"`
    WaitTime      float64   `json:"wait_time_seconds"`
    Timestamp     time.Time `json:"timestamp"`
    CorrelationID string    `json:"correlation_id"`
}

type CallEndedEvent struct {
    CallID        string    `json:"call_id"`
    Duration      int       `json:"duration"`
    HangupCause   string    `json:"hangup_cause"`
    Timestamp     time.Time `json:"timestamp"`
    CorrelationID string    `json:"correlation_id"`
}

type AgentStateChangedEvent struct {
    AgentID       string    `json:"agent_id"`
    Channel       string    `json:"channel"`
    OldStatus     string    `json:"old_status"`
    NewStatus     string    `json:"new_status"`
    Reason        string    `json:"reason,omitempty"`
    Timestamp     time.Time `json:"timestamp"`
}
```

#### 18.4.7 Redis Data Model (Consolidated)

All Redis keys used by GoACD, consolidated in one place for implementation reference.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        GoACD Redis Data Model                          │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ── Agent State ──────────────────────────────────────────────────────  │
│                                                                         │
│  HASH  agent:state:{agentId}                    TTL: none (persistent)  │
│    voice_status        = "ready"|"not_ready"|"ringing"|"originating"|"on_call"|"wrap_up"  │
│    voice_reason        = "break"|"training"|""                          │
│    voice_count         = 0|1                     (current active calls) │
│    max_voice           = 1                       (max concurrent voice) │
│    voice_claimed_by    = "{callId}"              (set during ringing)   │
│    voice_claimed_at    = 1710000000              (unix timestamp)       │
│    extension           = "1007"                                         │
│    sip_registered      = "1"|"0"                                        │
│    sip_last_register   = 1710000000              (unix timestamp)       │
│    fs_instance         = "freeswitch-1"                                 │
│    last_state_change   = 1710000000                                     │
│    last_call_ended     = 1710000000              (for idle time calc)   │
│    miss_count          = 0                       (consecutive misses)   │
│                                                                         │
│  SET   agent:available:{channel}                TTL: none               │
│    Members: agentId1, agentId2, ...                                     │
│    (agents available for routing on this channel)                        │
│                                                                         │
│  SET   agent:skills:{skillName}                 TTL: none               │
│    Members: agentId1, agentId2, ...                                     │
│    (agents with this skill — used for SINTER with available set)        │
│                                                                         │
│  HASH  agent:skills:proficiency:{agentId}       TTL: none               │
│    {skillName} = "0.9"                           (proficiency 0.0-1.0)  │
│                                                                         │
│  SET   agent:queue:{queueId}                    TTL: none               │
│    Members: agentId1, agentId2, ...                                     │
│    (agents assigned to this queue)                                      │
│                                                                         │
│  HASH  agent:miss_count:{agentId}               TTL: 3600 (1 hour)     │
│    count = 0|1|2                                                        │
│    (consecutive missed calls — resets on successful answer)             │
│                                                                         │
│  ── Queue ────────────────────────────────────────────────────────────  │
│                                                                         │
│  ZSET  queue:{queueId}:entries                  TTL: none               │
│    Score: priority × 1000000 + (MAX_TS - enqueueTimestamp)              │
│    Member: interactionId                                                │
│    (sorted: higher priority + older → higher score → popped first)      │
│                                                                         │
│  HASH  queue:{queueId}:config                   TTL: none               │
│    name, routing_strategy, sla_seconds, moh_stream,                     │
│    overflow_queue_id, max_queue_size, ring_timeout                       │
│    required_skills (JSON array)                                         │
│                                                                         │
│  HASH  queue:{queueId}:stats                    TTL: none (updated live)│
│    entries_count, agents_available, agents_on_call,                      │
│    avg_wait_time, calls_handled_today, sla_breaches_today               │
│                                                                         │
│  ── Routing ──────────────────────────────────────────────────────────  │
│                                                                         │
│  HASH  routing:attempt:{callId}                 TTL: 300s               │
│    call_id, interaction_id, queue_id,                                    │
│    candidates (JSON: ["agentId:score", ...]),                            │
│    current_index, attempts, started_at, status                           │
│                                                                         │
│  ── Active Calls (HA Snapshots) ──────────────────────────────────────  │
│                                                                         │
│  HASH  goacd:active_calls                       TTL: 30s (auto-cleanup) │
│    {callId} = JSON(CallSnapshot)                                        │
│    (snapshotted every 2s by leader — used for failover recovery)        │
│                                                                         │
│  ── Leader Election ──────────────────────────────────────────────────  │
│                                                                         │
│  STRING goacd:leader                            TTL: 10s (renewed 3s)   │
│    Value: instanceId (e.g., "goacd-1")                                  │
│    Set via: SET NX EX (only acquired if key doesn't exist)              │
│                                                                         │
│  ── IVR Flows (Cache) ────────────────────────────────────────────────  │
│                                                                         │
│  STRING ivr:flow:{flowId}                       TTL: 600s (10 min)      │
│    Value: JSON(FlowDefinition)                                          │
│    (cached from PostgreSQL — invalidated on SyncFlowDefinition gRPC)    │
│                                                                         │
│  HASH  ivr:did_mapping                          TTL: none               │
│    {DID_number} = "{flowId}"                                            │
│    (which IVR flow handles which inbound DID)                           │
│                                                                         │
│  ── Idempotency ──────────────────────────────────────────────────────  │
│                                                                         │
│  STRING dedup:{requestId}                       TTL: 60s                │
│    Value: "1"                                                           │
│    (prevents duplicate gRPC request processing)                         │
│                                                                         │
│  ── Customer Affinity ────────────────────────────────────────────────  │
│                                                                         │
│  STRING customer:last_agent:{customerId}        TTL: 86400 (24h)        │
│    Value: agentId                                                       │
│    (last agent who served this customer — for affinity routing)         │
│                                                                         │
│  ── Pub/Sub Channels ─────────────────────────────────────────────────  │
│                                                                         │
│  CHANNEL channel:agent:{agentId}                                        │
│    → Agent-specific events (incoming call, state change)                │
│  CHANNEL channel:queue:{queueId}                                        │
│    → Queue events (new entry, agent assigned)                           │
│  CHANNEL channel:supervisor                                              │
│    → Supervisor events (SLA breach, overflow)                           │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

**Key sizing estimates (2,000 concurrent agents, 5,000 concurrent calls):**

| Redis Key Pattern | Count | Avg Size | Total RAM |
|---|---|---|---|
| `agent:state:*` | 2,000 | ~500B | ~1MB |
| `agent:available:voice` | 1 set, ~1,000 members | ~20KB | ~20KB |
| `agent:skills:*` | ~50 skill sets | ~10KB each | ~500KB |
| `queue:*:entries` | ~100 queues | ~5KB each | ~500KB |
| `queue:*:config` | ~100 queues | ~1KB each | ~100KB |
| `routing:attempt:*` | 5,000 | ~500B | ~2.5MB |
| `goacd:active_calls` | 1 hash, 5,000 fields | ~1KB each | ~5MB |
| `ivr:flow:*` | ~20 flows | ~10KB each | ~200KB |
| **Total** | | | **~10MB** |

#### 18.4.8 Concurrency Model

```
┌────────────────────────────────────────────────────────────────────┐
│                    GoACD Goroutine Architecture                     │
│                                                                     │
│  ┌─ Main Goroutine ────────────────────────────────────────────┐   │
│  │  main() → NewGoACD() → LeaderElection(ctx)                  │   │
│  │  Blocks on leader election loop                              │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                          │                                          │
│                  (becomes leader)                                    │
│                          ▼                                          │
│  ┌─ Leader Services (started on election) ─────────────────────┐   │
│  │                                                              │   │
│  │  ┌─ gRPC Server Goroutine ──────────────────────────────┐   │   │
│  │  │  grpc.NewServer().Serve(listener)                     │   │   │
│  │  │  → spawns goroutine per gRPC request (managed by gRPC)│   │   │
│  │  └───────────────────────────────────────────────────────┘   │   │
│  │                                                              │   │
│  │  ┌─ REST Server Goroutine ──────────────────────────────┐   │   │
│  │  │  http.Server.ListenAndServe()                         │   │   │
│  │  │  → goroutine per HTTP request (managed by net/http)   │   │   │
│  │  └───────────────────────────────────────────────────────┘   │   │
│  │                                                              │   │
│  │  ┌─ Outbound ESL Accept Loop (1 goroutine) ────────────┐   │   │
│  │  │  for { conn := listener.Accept(); go handle(conn) }   │   │   │
│  │  │  → spawns goroutine per call (bounded by semaphore)   │   │   │
│  │  └───────────────────────────────────────────────────────┘   │   │
│  │       │                                                      │   │
│  │       ├─ Call Session Goroutine #1 ──────────────┐           │   │
│  │       │  handleOutboundESL(conn)                  │           │   │
│  │       │  IVR → Queue → Route → Bridge → CDR      │           │   │
│  │       │   ├─ eslWriter goroutine (1 per session)  │           │   │
│  │       │   └─ queueMonitor goroutine (if queued)   │           │   │
│  │       │  Lifetime: same as call                   │           │   │
│  │       │  Cleanup: defer removeSession + cancel    │           │   │
│  │       ├──────────────────────────────────────────┘           │   │
│  │       ├─ Call Session Goroutine #2 ... #N                    │   │
│  │       └─ (up to ESLMaxConnections=5000)                      │   │
│  │                                                              │   │
│  │  ┌─ Inbound ESL Client Goroutines (1 per FS instance) ─┐   │   │
│  │  │  connectAndSubscribe(fsHost)                          │   │   │
│  │  │  → receives: sofia::register, CHANNEL_*, DTMF, etc.  │   │   │
│  │  │  → dispatches events to appropriate handler           │   │   │
│  │  │  → auto-reconnects on disconnect                      │   │   │
│  │  └──────────────────────────────────────────────────────┘   │   │
│  │                                                              │   │
│  │  ┌─ Background Workers (long-lived goroutines) ─────────┐   │   │
│  │  │  • leaderRenewer     — renews Redis lock every 3s     │   │   │
│  │  │  • callSnapshotter   — snapshots active calls / 2s    │   │   │
│  │  │  • sessionReaper     — kills zombie sessions / 30s    │   │   │
│  │  │  • staleClaimReaper  — releases stuck claims / 15s    │   │   │
│  │  │  • reconciliator     — SIP/Redis reconciliation / 60s │   │   │
│  │  │  • queueDrainer      — checks queues on agent-ready   │   │   │
│  │  │  • redisHealthCheck  — pool metrics / 5s              │   │   │
│  │  └──────────────────────────────────────────────────────┘   │   │
│  │                                                              │   │
│  │  ┌─ Kafka Consumer Goroutines (1 per topic) ────────────┐   │   │
│  │  │  • agent.created / agent.updated / agent.deleted       │   │   │
│  │  │  • queue.voice.updated / queue.agent.assigned          │   │   │
│  │  │  • agent.ws.disconnected (cross-trigger from WS)       │   │   │
│  │  └──────────────────────────────────────────────────────┘   │   │
│  │                                                              │   │
│  │  ┌─ Recording Sync Pool (N=4 worker goroutines) ────────┐   │   │
│  │  │  • uploadWorker #1..4 — upload recordings to SeaweedFS│   │   │
│  │  │  • verificationWorker — verify uploads / 5min         │   │   │
│  │  │  • cleanupWorker      — delete local files / 15min    │   │   │
│  │  └──────────────────────────────────────────────────────┘   │   │
│  │                                                              │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  Context Cancellation Tree:                                         │
│    rootCtx (main)                                                   │
│      └─ leaderCtx (cancelled on leadership loss or shutdown)        │
│           ├─ eslAcceptCtx                                           │
│           │   └─ callSessionCtx #1..N (cancelled on call end/4h)    │
│           ├─ inboundESLCtx #1..M (per FS instance)                  │
│           ├─ backgroundWorkerCtx                                     │
│           ├─ kafkaConsumerCtx                                        │
│           ├─ grpcServerCtx                                           │
│           └─ recordingSyncCtx                                        │
│                                                                     │
│  Communication Channels:                                             │
│    • ESLCommand chan (per call session, buffered=32)                 │
│    •  agentReadyCh chan string (agentID → triggers queue drain)      │
│    • recordingUploadCh chan RecordingJob (buffered=1000)             │
│    • eventBus (internal pub/sub for module-to-module events)        │
│                                                                     │
│  Synchronization:                                                    │
│    • sessionMu (RWMutex) — guards activeSessions map                │
│    • Redis Lua scripts — guards agent state (cross-instance safe)   │
│    • wg (WaitGroup) — tracks all goroutines for graceful shutdown   │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘
```

**Goroutine count estimate (steady state, 2,000 agents, 5,000 calls):**

| Goroutine Type | Count | Lifecycle |
|---|---|---|
| Main + leader election | 1 | Process lifetime |
| gRPC server (net/http2) | ~50 | Per-request, short-lived |
| REST server (net/http) | ~10 | Per-request, short-lived |
| ESL accept loop | 1 | Leader lifetime |
| Call session handlers | 5,000 | Per-call (~3 min avg) |
| ESL writers (1 per call) | 5,000 | Per-call |
| Queue monitors (queued calls) | ~500 | Until agent found |
| Inbound ESL clients | 2-3 | Leader lifetime (per FS) |
| Background workers | 7 | Leader lifetime |
| Kafka consumers | 3 | Leader lifetime |
| Recording sync pool | 6 | Leader lifetime |
| **Total** | **~10,580** | |

Memory: ~10,580 goroutines × 8KB stack = **~83MB** (goroutine overhead only, well within limits).

#### 18.4.9 Startup & Graceful Shutdown Lifecycle

```go
func main() {
    // ── Phase 1: Load Config & Initialize Dependencies ───────
    cfg := config.Load()                   // parse env vars, validate required fields
    logger := zap.Must(buildLogger(cfg))   // structured logger with instance ID
    defer logger.Sync()

    // ── Phase 2: Connect to External Services ────────────────
    redisClient := connectRedis(cfg)       // with pool sizing from config
    pgPool := connectPostgres(cfg)         // with max conns from config
    kafkaWriter := connectKafkaProducer(cfg)

    // ── Phase 3: Initialize Modules ──────────────────────────
    goacd := NewGoACD(cfg, logger, redisClient, pgPool, kafkaWriter)

    // ── Phase 4: Start Prometheus Metrics Server ─────────────
    // (runs regardless of leader status — standby also exports metrics)
    go goacd.startMetricsServer()

    // ── Phase 5: Start pprof Debug Server ────────────────────
    go func() {
        http.ListenAndServe(":6060", nil) // pprof registered via import
    }()

    // ── Phase 6: Enter Leader Election Loop ──────────────────
    // Blocks until:
    //   a) becomes leader → runs services → loses leadership → re-enters loop
    //   b) shutdown signal received
    rootCtx, rootCancel := context.WithCancel(context.Background())

    // ── Phase 7: Signal Handler ──────────────────────────────
    sigCh := make(chan os.Signal, 1)
    signal.Notify(sigCh, syscall.SIGTERM, syscall.SIGINT)

    go func() {
        sig := <-sigCh
        logger.Info("received shutdown signal", zap.String("signal", sig.String()))
        rootCancel()
    }()

    // ── Phase 8: Run ─────────────────────────────────────────
    goacd.LeaderElection(rootCtx)

    // ── Phase 9: Graceful Shutdown ───────────────────────────
    goacd.Shutdown()
    logger.Info("GoACD shutdown complete")
}
```

**Graceful Shutdown Procedure:**

```go
func (g *GoACD) Shutdown() {
    g.logger.Info("initiating graceful shutdown...")
    shutdownStart := time.Now()

    // Step 1: Stop accepting new calls (1s)
    //   Close ESL listener → FreeSWITCH outbound connections refused
    //   FS retries → eventually routes to other GoACD instance (if clustered)
    //   Or FS mod_callcenter takes over (fallback, if configured)
    g.stopESLListener()
    g.logger.Info("ESL listener closed — no new calls accepted")

    // Step 2: Stop gRPC server gracefully (5s)
    //   GracefulStop() waits for in-flight RPCs to complete
    g.grpcServer.GracefulStop()
    g.logger.Info("gRPC server stopped")

    // Step 3: Drain active calls (up to 30s)
    //   Wait for active calls to finish naturally
    //   If call is in IVR/queue: route to fallback immediately
    //   If call is active (bridged): let it continue up to drain timeout
    drainCtx, drainCancel := context.WithTimeout(context.Background(), 30*time.Second)
    defer drainCancel()
    g.drainActiveCalls(drainCtx)
    g.logger.Info("active calls drained", zap.Int("remaining", len(g.activeSessions)))

    // Step 4: Force-cleanup remaining sessions
    //   Any calls still active after 30s: snapshot to Redis for recovery by other instance
    g.sessionMu.Lock()
    for callID, session := range g.activeSessions {
        g.snapshotCallToRedis(callID, session)
        session.Cancel()
    }
    g.sessionMu.Unlock()

    // Step 5: Release leader lock
    //   Explicit DELETE so standby can acquire immediately (vs waiting TTL)
    g.releaseLeaderLock()
    g.logger.Info("leader lock released")

    // Step 6: Flush Kafka producer
    g.kafkaWriter.Close()

    // Step 7: Close connections
    g.redis.Close()
    g.pgPool.Close()

    // Step 8: Wait for all goroutines
    g.wg.Wait()

    g.logger.Info("graceful shutdown complete",
        zap.Duration("duration", time.Since(shutdownStart)))
}

func (g *GoACD) drainActiveCalls(ctx context.Context) {
    ticker := time.NewTicker(500 * time.Millisecond)
    defer ticker.Stop()

    for {
        select {
        case <-ctx.Done():
            return // drain timeout exceeded
        case <-ticker.C:
            g.sessionMu.RLock()
            count := len(g.activeSessions)
            g.sessionMu.RUnlock()

            if count == 0 {
                return // all calls finished
            }

            // Force-route any IVR/queued calls to fallback
            g.sessionMu.RLock()
            for _, session := range g.activeSessions {
                if session.State == CallStateIVR || session.State == CallStateQueued {
                    go g.routeToFallbackQueue(session.Snapshot())
                    session.Cancel()
                }
            }
            g.sessionMu.RUnlock()
        }
    }
}
```

**Shutdown timeline (worst case):**

```
T=0s    SIGTERM received
T=0s    ESL listener closed (instant)
T=1s    gRPC GracefulStop (in-flight RPCs finish)
T=1-31s Active calls draining (IVR/queued forced immediately, bridged wait up to 30s)
T=31s   Remaining sessions snapshot to Redis + force-cancel
T=31s   Leader lock released → standby acquires immediately
T=32s   Kafka flushed, Redis/PG closed
T=33s   All goroutines joined via WaitGroup
T=33s   Process exits cleanly
```

#### 18.4.10 Internal Module Interaction

```
┌────────────────────────────────────────────────────────────────────┐
│                  GoACD Internal Module Dependencies                 │
│                                                                     │
│  External Input                    External Output                  │
│  ─────────────                     ───────────────                  │
│  FreeSWITCH ESL ─┐           ┌──→ FreeSWITCH ESL (commands)       │
│  gRPC requests ──┤           ├──→ Kafka (events)                   │
│  Kafka events ───┤           ├──→ Redis Pub/Sub (realtime UI)      │
│  REST requests ──┘           └──→ PostgreSQL (CDR, recording sync) │
│                                                                     │
│  ┌──────────┐     ┌──────────┐     ┌──────────┐                   │
│  │  ESL     │────→│  IVR     │────→│  Queue   │                   │
│  │ Manager  │     │  Engine  │     │  Manager │                   │
│  │          │     │          │     │          │                   │
│  │ • accept │     │ • flow   │     │ • enqueue│                   │
│  │ • inbound│     │   exec   │     │ • drain  │                   │
│  │ • events │     │ • DTMF   │     │ • SLA    │                   │
│  │ • reconnect    │ • fallback│     │ • MOH    │                   │
│  └────┬─────┘     └────┬─────┘     └────┬─────┘                   │
│       │                │                │                          │
│       │         RoutingHints      agent available                  │
│       │                │                │                          │
│       │                ▼                ▼                          │
│       │           ┌──────────────────────────┐                    │
│       │           │    Routing Engine         │                    │
│       │           │                          │                    │
│       │           │ • scoring (§7.2)         │                    │
│       │           │ • candidate selection    │                    │
│       │           │ • atomic claim (Lua)     │                    │
│       │           │ • parallel ring          │                    │
│       │           │ • no-answer re-route     │                    │
│       │           └────────┬─────────────────┘                    │
│       │                    │                                       │
│       │               bridge ESL                                   │
│       │                    │                                       │
│       ▼                    ▼                                       │
│  ┌──────────┐     ┌──────────┐     ┌──────────┐                   │
│  │  Agent   │←───→│  Call    │────→│  CDR     │                   │
│  │  State   │     │  Tracker │     │ Generator│                   │
│  │ Manager  │     │          │     │          │                   │
│  │          │     │ • session│     │ • collect │                   │
│  │ • Redis  │     │ • transfer│    │   events  │                   │
│  │ • status │     │ • conf   │     │ • publish │                   │
│  │ • sync   │     │ • recording│   │   Kafka   │                   │
│  └────┬─────┘     └────┬─────┘     └──────────┘                   │
│       │                │                                           │
│       │                │                                           │
│       ▼                ▼                                           │
│  ┌──────────┐     ┌──────────┐     ┌──────────┐                   │
│  │ Heartbeat│     │ Recording│     │  Event   │                   │
│  │ Monitor  │     │  Sync    │     │ Publisher│                   │
│  │          │     │          │     │          │                   │
│  │ • SIP    │     │ • upload │     │ • Kafka  │                   │
│  │   probe  │     │ • verify │     │ • Redis  │                   │
│  │ • WS     │     │ • cleanup│     │   Pub/Sub│                   │
│  │   cross  │     │ • dead   │     │ • gRPC   │                   │
│  │ • recon  │     │   letter │     │   stream │                   │
│  └──────────┘     └──────────┘     └──────────┘                   │
│                                                                     │
│  ── API Layer ─────────────────────────────────────────────────    │
│                                                                     │
│  ┌──────────┐     ┌──────────┐                                    │
│  │  gRPC    │     │  REST    │                                    │
│  │  Server  │     │  Server  │                                    │
│  │          │     │          │                                    │
│  │ • agent  │     │ • health │                                    │
│  │   state  │     │ • metrics│                                    │
│  │ • call   │     │ • queue  │                                    │
│  │   control│     │   stats  │                                    │
│  │ • queue  │     │ • config │                                    │
│  │ • IVR    │     │ • debug  │                                    │
│  │ • events │     │          │                                    │
│  └──────────┘     └──────────┘                                    │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘
```

**Module dependency rules:**
1. **ESL Manager** → used by IVR Engine, Routing Engine, Call Tracker (via CallSession.SendESL)
2. **Agent State Manager** → used by Routing Engine (check available), Heartbeat Monitor (force offline), gRPC Server (set status)
3. **Routing Engine** → uses Agent State (claim/release), ESL Manager (bridge), Queue Manager (dequeue)
4. **Queue Manager** → uses Routing Engine (on agent available), ESL Manager (MOH via CallSession)
5. **No circular dependencies** — Queue→Routing is event-based (agentReadyCh), not direct call

#### 18.4.11 Health Check & Admin REST API

```go
// REST API endpoints (port 9092)

// ─── Health ────────────────────────────────────────────
// GET /health                  → 200 {"status":"ok"} or 503
// GET /health/ready            → 200 if leader and all deps connected
// GET /health/live             → 200 always (process alive)

func (r *RESTServer) healthHandler(w http.ResponseWriter, req *http.Request) {
    health := HealthStatus{
        Status:    "ok",
        Instance:  r.goacd.config.InstanceID,
        IsLeader:  r.goacd.isLeader.Load(),
        Uptime:    time.Since(r.startTime).String(),
        Checks: map[string]CheckResult{
            "redis":       r.checkRedis(),
            "postgres":    r.checkPostgres(),
            "kafka":       r.checkKafka(),
            "freeswitch":  r.checkFreeSWITCH(),
        },
    }

    for _, check := range health.Checks {
        if !check.OK {
            health.Status = "degraded"
            w.WriteHeader(http.StatusServiceUnavailable)
            break
        }
    }

    json.NewEncoder(w).Encode(health)
}

type HealthStatus struct {
    Status    string                   `json:"status"`
    Instance  string                   `json:"instance"`
    IsLeader  bool                     `json:"is_leader"`
    Uptime    string                   `json:"uptime"`
    Checks    map[string]CheckResult   `json:"checks"`
}

type CheckResult struct {
    OK       bool          `json:"ok"`
    Latency  string        `json:"latency"`
    Error    string        `json:"error,omitempty"`
}

// ─── Monitoring ────────────────────────────────────────
// GET /api/v1/stats                → system stats summary
// GET /api/v1/agents               → all agent states
// GET /api/v1/agents/:id           → single agent state
// GET /api/v1/queues               → all queue stats
// GET /api/v1/queues/:id           → single queue stats
// GET /api/v1/calls                → active calls
// GET /api/v1/calls/:id            → single call detail

// ─── Admin Operations ──────────────────────────────────
// POST /api/v1/agents/:id/force-offline  → force agent offline
// POST /api/v1/calls/:id/force-hangup    → force hangup a call
// POST /api/v1/queues/:id/drain          → drain queue to overflow
// POST /api/v1/ivr/reload                → reload IVR flows from DB
// POST /api/v1/reconcile                 → trigger manual reconciliation

// ─── Debug ─────────────────────────────────────────────
// GET /api/v1/debug/sessions       → active session details (dev only)
// GET /api/v1/debug/goroutines     → goroutine dump
// GET /api/v1/debug/redis-keys     → Redis key scan (dev only)
```

#### 18.4.12 Logging & Distributed Tracing

```go
// Structured logging with zap — all log entries include:
// - instance_id: which GoACD instance
// - correlation_id: traces a call across all log lines
// - component: which module (esl, ivr, routing, queue, agent, call, recording)

// Log levels per component (configurable via env):
//   GOACD_LOG_LEVEL=info (default)
//   GOACD_LOG_LEVEL_ESL=debug       (verbose ESL for troubleshooting)
//   GOACD_LOG_LEVEL_ROUTING=info
//   GOACD_LOG_LEVEL_IVR=info

// Example log output:
// {"level":"info","ts":"2024-03-17T10:30:15Z","caller":"routing/engine.go:142",
//  "msg":"agent claimed","instance":"goacd-1","correlation_id":"abc-123",
//  "component":"routing","agent_id":"agent-007","call_id":"fs-uuid-456",
//  "claim_latency_ms":0.8}

// Distributed tracing:
// correlation_id is generated at call start and propagated to:
//   1. All GoACD log lines for this call
//   2. SIP header X-GoACD-Correlation-ID (→ Kamailio → Agent Desktop)
//   3. Kafka events (correlation_id field)
//   4. gRPC metadata (x-correlation-id)
//   5. CDR record (correlation_id column)
//   6. Recording sync metadata (x-amz-meta-correlation-id in SeaweedFS)
//
// This allows tracing a single call from PSTN ingress through IVR, queue,
// routing, bridge, recording, CDR, audit — across all services.

func (g *GoACD) newCallLogger(callID, correlationID string) *zap.Logger {
    return g.logger.With(
        zap.String("call_id", callID),
        zap.String("correlation_id", correlationID),
        zap.String("component", "call"),
    )
}
```

#### 18.4.13 Testing Strategy

```
┌─────────────────────────────────────────────────────────────────┐
│                    GoACD Testing Pyramid                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Layer 1 — Unit Tests (go test, ~70% coverage target)           │
│  ─────────────────────────────────────────────────               │
│  • Routing scoring algorithm (deterministic, no I/O)             │
│  • Agent state machine transitions (mock Redis)                  │
│  • IVR flow parser & node traversal (mock ESL conn)              │
│  • CDR generation from call events                               │
│  • Config parsing & validation                                   │
│  • Queue entry scoring formula                                   │
│  • Customer cache TTL & eviction                                 │
│  • CallSnapshot serialization/deserialization                    │
│                                                                  │
│  Tools: Go standard testing, testify/assert, gomock              │
│  Run: `go test ./internal/... -short`                            │
│                                                                  │
│  Layer 2 — Integration Tests (docker-compose, ~20%)              │
│  ────────────────────────────────────────────────                 │
│  • Redis Lua scripts (real Redis in Docker)                      │
│    - Atomic claim: concurrent goroutines claiming same agent     │
│    - Release: verify state after release                         │
│    - Stale claim: verify reaper cleanup                          │
│  • Kafka event publish/consume round-trip                        │
│  • PostgreSQL CDR insert/query                                   │
│  • gRPC server: SetAgentState, MakeCall end-to-end               │
│  • Leader election: simulate failover (kill leader process)      │
│                                                                  │
│  Tools: testcontainers-go (Redis, PG, Kafka in Docker)           │
│  Run: `go test ./internal/... -tags=integration`                 │
│                                                                  │
│  Layer 3 — ESL Integration Tests (~5%)                           │
│  ─────────────────────────────────────                            │
│  • Real FreeSWITCH in Docker + GoACD                             │
│  • Test: outbound ESL connection, playback, bridge               │
│  • Test: inbound ESL events (sofia::register simulation)         │
│  • Test: IVR flow execution with actual DTMF simulation          │
│    (FS originate → socket → GoACD → play_and_get_digits)         │
│                                                                  │
│  Tools: docker-compose with FS, SIPp for SIP load generation     │
│  Run: `go test ./test/esl_integration/... -tags=esl`             │
│                                                                  │
│  Layer 4 — End-to-End / Load Tests (~5%)                         │
│  ────────────────────────────────────────                         │
│  • Full stack: Kamailio + rtpengine + FS + GoACD + Redis         │
│  • SIPp: generate 1,000 concurrent calls                         │
│  • Verify: calls routed, answered, CDR generated, recording saved│
│  • Measure: call setup time < 3s, claim latency < 5ms            │
│  • Stress: 5,000 concurrent calls, verify no goroutine leaks     │
│  • Failover: kill GoACD leader, verify standby takes over < 10s  │
│                                                                  │
│  Tools: SIPp, k6 (for gRPC load), custom Go test harness         │
│  Run: `make e2e-test` (requires full docker-compose up)          │
│                                                                  │
│  Key Test Scenarios (must-pass before production):                │
│  ──────────────────────────────────────────────                   │
│  ✓ Concurrent claim: 100 goroutines claim same agent → exactly 1 │
│  ✓ No-answer re-route: agent-1 timeout → agent-2 rings → answers │
│  ✓ Browser crash: SIP.js killed → agent marked offline < 30s     │
│  ✓ GoACD failover: kill leader → standby takes over → active     │
│    calls continue (bridged audio not interrupted)                 │
│  ✓ IVR fallback: invalid flow → caller routed to default queue   │
│  ✓ Recording sync: upload failure → retry → success → cleanup    │
│  ✓ Parallel ring: 2 agents ring → 1 answers → other released    │
│  ✓ Cross-FS transfer: agent on FS-1 → transfer to agent on FS-2 │
│  ✓ Memory stability: 4-hour soak test, no goroutine growth       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

#### 18.4.14 Build & Dockerfile

```dockerfile
# services/goacd/Dockerfile

# ── Stage 1: Build ────────────────────────────────────
FROM golang:1.22-alpine AS builder

RUN apk add --no-cache git ca-certificates tzdata

WORKDIR /app

# Cache dependencies
COPY go.mod go.sum ./
RUN go mod download

# Build binary
COPY . .
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 \
    go build -ldflags="-s -w -X main.version=$(git describe --tags --always)" \
    -o /goacd ./cmd/goacd/main.go

# ── Stage 2: Runtime ──────────────────────────────────
FROM alpine:3.19

RUN apk add --no-cache ca-certificates tzdata curl

# Non-root user
RUN addgroup -S goacd && adduser -S goacd -G goacd
USER goacd

COPY --from=builder /goacd /usr/local/bin/goacd

# Health check
HEALTHCHECK --interval=10s --timeout=3s --retries=3 \
    CMD curl -f http://localhost:9092/health/live || exit 1

EXPOSE 9090 9091 9092 9093

ENTRYPOINT ["goacd"]
```

```makefile
# services/goacd/Makefile

.PHONY: build test lint run docker

build:
	go build -o bin/goacd ./cmd/goacd/

test:
	go test ./internal/... -short -race -count=1

test-integration:
	go test ./internal/... -tags=integration -race -count=1

test-esl:
	go test ./test/esl_integration/... -tags=esl -count=1 -timeout=5m

lint:
	golangci-lint run ./...

run:
	go run ./cmd/goacd/

docker:
	docker build -t goacd:latest .

proto:
	protoc --go_out=. --go-grpc_out=. internal/api/proto/goacd.proto
```

---

### 18.5 Call Flow Designs

#### 18.5.1 Inbound PSTN → IVR → Queue → Agent

```
                                                        Time
[1] PSTN Call → SIP Trunk → Kamailio                    0s
    │ Kamailio: authenticate trunk, apply DID routing
    │ dispatcher → FreeSWITCH
    │
[2] FreeSWITCH receives INVITE                          ~50ms
    │ Dialplan match → socket goacd:9090 async full
    │ FreeSWITCH opens TCP connection to GoACD
    │
[3] GoACD receives call (outbound ESL)                   ~100ms
    │ Parse channel vars: caller_id, destination (DID)
    │ Lookup DID → IVR flow ID (Redis/PostgreSQL)
    │ Call Customer Service (gRPC): identify caller
    │   → customer_id, name, VIP status, account info
    │
[4] GoACD executes IVR flow                              ~200ms
    │ ESL → FreeSWITCH: answer
    │ ESL → FreeSWITCH: playback /audio/vi/welcome.wav
    │   "Chào mừng quý khách đến với TPBank"
    │ ESL → FreeSWITCH: play_and_get_digits 1 1 1 5000 # /audio/vi/menu.wav
    │   "Nhấn 1: Tiết kiệm, Nhấn 2: Vay vốn, Nhấn 0: Gặp tổng đài viên"
    │ FreeSWITCH collects DTMF → returns digit to GoACD
    │
[5] GoACD processes IVR result                           ~5-10s
    │ DTMF = "2" → Vay vốn
    │ IVR flow → set routing hints: skills=["loan"], priority="high"
    │ IVR flow → HTTP node: call BFSI service (check customer loan status)
    │ IVR flow → end node: route to queue "loan_processing"
    │
[6] GoACD: Queue Selection                               ~10-12s
    │ Find queue "loan_processing" in Redis
    │ Create queue entry (ZADD queue:{id}:entries)
    │ Set SLA timer (loan_processing.sla = 60s)
    │
[7] GoACD: Agent Scoring & Selection                     ~10-12s
    │ Query Redis: agent:available:voice ∩ agent:skills:loan
    │ Score candidates using §7.2 algorithm:
    │   agent-007: skill=0.9 × load=0.8 × idle=0.7 × group=1.0 × affinity=1.0 = 0.88
    │   agent-003: skill=0.7 × load=0.9 × idle=0.5 × group=1.0 × affinity=0.0 = 0.67
    │   agent-012: skill=0.8 × load=0.6 × idle=0.9 × group=0.5 × affinity=0.0 = 0.62
    │ Top-3 candidates stored in Redis: routing:attempt:{callId}
    │
[8] GoACD: Deliver call to agent-007                     ~12s
    │ Atomic claim: validateAndClaim(agent-007, voice) → true
    │ ESL → FreeSWITCH: playback /audio/vi/connecting.wav (once)
    │ ESL → FreeSWITCH: bridge sofia/internal/1007@${domain}
    │   (1007 = agent-007's extension, registered via Kamailio)
    │ Start no-answer timer: 20s
    │
    │ ── Meanwhile: ──
    │ Publish Kafka: call.routing { callId, agentId, interactionId }
    │ gRPC → Omnichannel: send call metadata to Agent Desktop
    │   { caller: "0901234567", customer: "Nguyễn Văn A", product: "Loan",
    │     ivr_selections: ["2"], queue: "loan_processing", wait_time: "12s" }
    │
[9a] Agent-007 answers                                   ~15-25s
    │ FreeSWITCH: CHANNEL_ANSWER event → GoACD
    │ GoACD: update agent state → on-call
    │ GoACD: update interaction status → active
    │ GoACD: start recording (ESL → record_session)
    │ Publish Kafka: call.answered { callId, agentId, waitTime }
    │
[9b] Agent-007 does NOT answer (20s timeout)             ~32s
    │ GoACD: no-answer timer fires
    │ → See §18.8.3 for re-routing flow
    │
[10] Call ends                                            Variable
    │ FreeSWITCH: CHANNEL_HANGUP event → GoACD
    │ GoACD: stop recording
    │ GoACD: set agent state → wrap-up (if auto-ACW enabled)
    │ GoACD: generate CDR → publish Kafka: call.cdr
    │ GoACD: dequeue interaction
    │ After ACW timer (configurable) → set agent state → ready
```

#### 18.5.2 WebRTC Agent Registration & Incoming Call

```
[1] Agent login (Agent Desktop)
    │ Frontend: SIP.js UserAgent.start()
    │ SIP REGISTER → WSS (port 5066) → Kamailio
    │ Kamailio: authenticate, store in usrloc
    │ rtpengine: not involved (REGISTER has no media)
    │
    │ GoACD (inbound ESL): receives sofia::register event
    │   → Agent extension 1007 registered
    │   → Check: is agent-007 mapped to ext 1007? Yes
    │   → Agent-007 SIP = registered
    │
[2] Agent sets "Ready" in Agent Desktop
    │ WebSocket → Agent Service → Kafka: agent.status.changed
    │ GoACD (Kafka consumer): receives event
    │   → Set voice_status = ready in Redis
    │   → SADD agent:available:voice agent-007
    │   → Agent-007 is now available for calls
    │
[3] Incoming call routed to agent-007 (from §18.5.1 step [8])
    │ GoACD (outbound ESL for the inbound call):
    │   ESL → bridge sofia/internal/1007@${domain}
    │
[4] Kamailio receives INVITE for 1007
    │ Lookup usrloc → 1007 is registered via WSS from Agent Desktop
    │ Proxy INVITE to Agent Desktop's WSS connection
    │ rtpengine: insert into media path (SDP rewrite)
    │   Offer side: RTP → SRTP+ICE (for WebRTC)
    │
[5] Agent Desktop receives INVITE via SIP.js
    │ SIP.js: incoming call event
    │ Agent Desktop UI: show incoming call popup
    │   (with metadata pushed via WebSocket from GoACD)
    │ Agent clicks "Answer"
    │ SIP.js: send 200 OK
    │
[6] Media established
    │ rtpengine: bridge RTP (FS) ↔ SRTP (Browser)
    │ Caller audio → FS → rtpengine → Browser
    │ Agent audio → Browser → rtpengine → FS → Caller
```

#### 18.5.3 Outbound Call (Agent → Customer)

> **V2.1 Update:** Added atomic claim BEFORE originate to prevent race condition.
> Without this, during the 10-30s window between MakeCall validation and customer
> answer, the agent remains in `agent:available:voice` with `voice_status = ready`,
> allowing the routing engine to assign an inbound call to the same agent.
> The fix mirrors the inbound claim pattern (§18.7.5): atomically set status +
> remove from available set before initiating the outbound leg.

```
[1] Agent clicks "Make Call" in Agent Desktop
    │ REST/gRPC → CTI Adapter → GoACD: MakeCall(from=1007, to=0901234567)
    │
[2] GoACD: Atomic Claim (MUST happen before originate)
    │ Run outbound_claim.lua (see below):
    │   Check: voice_status = ready, voice_count < max_voice
    │   Atomic set: voice_status = "originating"
    │   Atomic: voice_count += 1
    │   SREM agent:available:voice agent-007
    │ If claim fails → return error to Agent Desktop ("agent not available")
    │
[3] GoACD: Create call session + originate
    │ ESL (inbound) → FreeSWITCH: originate
    │   {origination_caller_id_number=18001234}
    │   sofia/gateway/pstn_trunk/0901234567
    │   &socket(goacd:9090 async full)
    │
[4] FreeSWITCH:
    │ Send INVITE to PSTN via Kamailio → SIP trunk
    │ Also connect to GoACD via outbound ESL
    │
[5] GoACD (outbound ESL):
    │ Wait for CHANNEL_ANSWER or timeout (configurable, default 60s)
    │
    ├─ [5a] Customer answers:
    │   │ Bridge to agent's extension:
    │   │   ESL → bridge sofia/internal/1007@${domain}
    │   │ Update agent state: voice_status → on_call
    │   │ Start recording (ESL → record_session)
    │   │ Publish Kafka: call.outbound.answered { callId, agentId, destination }
    │
    ├─ [5b] Customer does NOT answer (timeout / busy / rejected):
    │   │ Run outbound_release.lua:
    │   │   voice_count -= 1
    │   │   voice_status → ready
    │   │   SADD agent:available:voice agent-007
    │   │ Publish Kafka: call.outbound.failed { callId, agentId, cause }
    │   │ Notify Agent Desktop: "Call failed — {cause}"
    │
    └─ [5c] Originate itself fails (FS error, trunk down):
        │ Same as [5b] — release claim, notify agent
        │ Log error for ops alerting
```

**Lua script: outbound_claim.lua**

```lua
-- Redis Lua script: outbound_claim.lua
-- Atomically claims agent for outbound call, preventing inbound routing
-- KEYS[1] = agent:available:voice
-- KEYS[2] = agent:state:{agentId}
-- ARGV[1] = agentId
-- ARGV[2] = callId
--
-- Returns: 1 = claimed, 0 = rejected (agent not ready or at capacity)

local availableKey = KEYS[1]
local stateKey     = KEYS[2]
local agentId      = ARGV[1]
local callId       = ARGV[2]

-- Check 1: status must be "ready"
local status = redis.call('HGET', stateKey, 'voice_status')
if status ~= 'ready' then
    return 0
end

-- Check 2: current count < max capacity
local count    = tonumber(redis.call('HGET', stateKey, 'voice_count') or '0')
local maxCount = tonumber(redis.call('HGET', stateKey, 'max_voice') or '1')
if count >= maxCount then
    return 0
end

-- All checks passed — atomic claim for outbound
redis.call('HINCRBY', stateKey, 'voice_count', 1)
redis.call('HSET', stateKey, 'voice_status', 'originating')
redis.call('HSET', stateKey, 'voice_claimed_by', callId)
redis.call('HSET', stateKey, 'voice_claimed_at', redis.call('TIME')[1])

-- Remove from available set — agent is now busy
redis.call('SREM', availableKey, agentId)

return 1
```

**Lua script: outbound_release.lua**

```lua
-- Redis Lua script: outbound_release.lua
-- Releases agent claim when outbound call fails or is not answered
-- KEYS[1] = agent:available:voice
-- KEYS[2] = agent:state:{agentId}
-- ARGV[1] = agentId
--
-- Returns: 1 = released, 0 = agent was not in originating state (unexpected)

local availableKey = KEYS[1]
local stateKey     = KEYS[2]
local agentId      = ARGV[1]

local status = redis.call('HGET', stateKey, 'voice_status')
if status ~= 'originating' then
    -- Agent already transitioned (e.g., manually went not-ready) — don't override
    return 0
end

local count = tonumber(redis.call('HINCRBY', stateKey, 'voice_count', -1))
if count < 0 then
    redis.call('HSET', stateKey, 'voice_count', 0)
    count = 0
end

redis.call('HSET', stateKey, 'voice_status', 'ready')
redis.call('HDEL', stateKey, 'voice_claimed_by')
redis.call('HDEL', stateKey, 'voice_claimed_at')
redis.call('HSET', stateKey, 'last_state_change', redis.call('TIME')[1])

-- Re-add to available set
redis.call('SADD', availableKey, agentId)

return 1
```

**Agent state diagram update** — new `originating` state:

```
                  MakeCall (outbound_claim.lua)
    READY ──────────────────────────────────────► ORIGINATING
      ▲                                              │
      │  outbound_release.lua                        │ Customer answers
      │  (fail/no-answer/timeout)                    │ (voice_status → on_call)
      │                                              ▼
      └──────────── WRAP-UP ◄─────────────────── ON-CALL
                       │                          (hangup)
                       │ ACW timer expires
                       ▼
                     READY
```

#### 18.5.4 Call Transfer (Comprehensive — V2.2)

> **V2.2 Update:** Expanded from basic agent-to-agent transfer to cover all transfer
> scenarios: agent-to-agent, agent-to-queue, agent-to-external, attended transfer
> cancel/abort, and transfer no-answer re-routing. Each scenario includes full
> state management and error handling.

**Transfer target resolution:**

```
TransferCallRequest received by GoACD:
  ├─ to_agent_id set  → §18.5.4.1 Transfer to Agent
  ├─ to_queue_id set  → §18.5.4.2 Transfer to Queue
  └─ to_number set    → §18.5.4.3 Transfer to External Number
  (exactly ONE must be set — GoACD validates, rejects otherwise)
```

##### 18.5.4.1 Transfer to Agent (Blind)

```
[1] Agent-007 clicks "Transfer" → selects agent-003
    │ Agent Desktop → CTI Adapter → gRPC → GoACD:
    │   TransferCall(call_id, from=agent-007, to_agent_id=agent-003, type="blind")
    │
[2] GoACD: Validate + Claim
    │ Check: agent-007 is on-call with this call_id (prevent spoofing)
    │ Check: agent-003 exists and voice_status = ready
    │ Atomic claim: validateAndClaim(agent-003, voice, call_id)
    │   → agent-003: voice_status → ringing, SREM from available set
    │ If claim fails → return error "target agent not available"
    │
[3] GoACD: Execute transfer
    │ Check: isLocalTransfer(agent-007, agent-003)? (same FS instance?)
    │ ── Same FS: ──
    │   ESL → uuid_transfer {caller_uuid} sofia/internal/1003@${domain}
    │   FreeSWITCH: BYE agent-007 leg, INVITE agent-003
    │ ── Cross-FS: ──
    │   See §18.5.5 (Cross-FreeSWITCH Transfer)
    │
[4] GoACD: Start no-answer timer (20s, configurable per queue)
    │
    ├─ [4a] Agent-003 answers (CHANNEL_ANSWER):
    │   │ Update states:
    │   │   agent-003: voice_status → on_call
    │   │   agent-007: voice_status → wrap_up, start ACW timer
    │   │ Transfer call session ownership: session.AgentID = agent-003
    │   │ Update: session.TransferHistory append agent-007
    │   │ Continue recording (new segment with agent-003 metadata)
    │   │ Publish Kafka: call.transferred {
    │   │   callId, fromAgent: agent-007, toAgent: agent-003,
    │   │   type: "blind", success: true
    │   │ }
    │   │ Push to Agent Desktop (agent-003): incoming call screen with
    │   │   caller info + transfer context (who transferred, why)
    │
    └─ [4b] Agent-003 does NOT answer (20s timeout / reject):
        │ GoACD: cancel ringing on agent-003
        │   ESL → uuid_kill {agent003_uuid} (stop ringing)
        │ Release claim: releaseClaim(agent-003, voice)
        │   → agent-003: voice_status → ready, SADD back to available set
        │   → agent-003: miss_count++ (if ≥ 2 → voice_status → not_ready)
        │
        │ *** Re-route caller back to agent-007: ***
        │   Check: agent-007 still connected? (voice_status = wrap_up, not offline)
        │   ── Agent-007 still connected: ──
        │     ESL → uuid_bridge {caller_uuid} {agent007_uuid}
        │     agent-007: voice_status → on_call (cancel wrap-up timer)
        │     Notify Agent Desktop (agent-007): "Transfer failed — agent-003 unavailable"
        │   ── Agent-007 disconnected: ──
        │     Play MOH to caller
        │     Re-queue call with HIGH priority (see §18.5.4.2 transfer-to-queue logic)
        │     Publish Kafka: call.transfer_failed { callId, reason: "no_answer" }
```

##### 18.5.4.2 Transfer to Queue

> **V2.2 Addition:** Allows agent to transfer a call to a different queue
> (e.g., "general" → "loan_processing"). The caller is placed in the target
> queue with elevated priority and hears MOH while waiting.

```
[1] Agent-007 clicks "Transfer to Queue" → selects queue "loan_processing"
    │ Agent Desktop → CTI Adapter → gRPC → GoACD:
    │   TransferCall(call_id, from=agent-007, to_queue_id="loan_processing", type="blind")
    │
[2] GoACD: Validate
    │ Check: agent-007 is on-call with this call_id
    │ Check: target queue exists in Redis (queue:{queueId}:config)
    │ Check: target queue not full (entries_count < max_queue_size)
    │ If validation fails → return error to Agent Desktop
    │
[3] GoACD: Park caller + play MOH
    │ ESL → uuid_hold {caller_uuid}
    │ ESL → uuid_kill {agent007_uuid}  (disconnect agent-007 leg)
    │ ESL → uuid_setvar {caller_uuid} park_after_bridge=true
    │ ESL → playback {caller_uuid} /audio/vi/transfer_please_wait.wav (once)
    │ ESL → endless_playback {caller_uuid} local_stream://moh  (MOH loop)
    │
[4] GoACD: Enqueue in target queue with ELEVATED priority
    │ ZADD queue:loan_processing:entries
    │   Score = (original_priority + 1) × 1000000 + (MAX_TS - now)
    │   Member = interactionId
    │ Note: priority + 1 ensures transferred calls are served before
    │   new callers at the same base priority level.
    │
    │ Update interaction metadata:
    │   interaction.transferred_from_queue = original_queue_id
    │   interaction.transferred_by = agent-007
    │   interaction.transfer_reason = agent-provided reason (optional)
    │
[5] GoACD: Update agent-007 state
    │ agent-007: voice_status → wrap_up, start ACW timer
    │ voice_count -= 1
    │ Publish Kafka: call.transferred {
    │   callId, fromAgent: agent-007, toQueue: "loan_processing",
    │   type: "queue_transfer"
    │ }
    │
[6] GoACD: Normal queue routing takes over
    │ Queue router detects new entry in loan_processing queue
    │ Score candidates from agent:available:voice ∩ agent:skills:loan
    │ Route to best available agent (§18.5.1 steps [7]-[10])
    │
[7] SLA timer
    │ If original call already consumed part of SLA:
    │   new_sla = max(target_queue.sla - elapsed_time, 30s)
    │   (minimum 30s to give target queue a chance)
    │ SLA breach → escalate per target queue's overflow rules
```

##### 18.5.4.3 Transfer to External Number

> **V2.2 Addition:** Agent transfers caller to an external phone number
> (e.g., customer's mobile, branch office, partner company).

```
[1] Agent-007 clicks "Transfer" → enters external number 0901234567
    │ Agent Desktop → CTI Adapter → gRPC → GoACD:
    │   TransferCall(call_id, from=agent-007, to_number="0901234567", type="blind")
    │
[2] GoACD: Validate
    │ Check: agent-007 is on-call with this call_id
    │ Check: to_number matches allowed patterns (prevent toll fraud):
    │   - Vietnam mobile: ^0[3-9]\d{8}$
    │   - Vietnam landline: ^0[2]\d{9}$
    │   - Internal extensions: ^[0-9]{4}$
    │   - Whitelist: configurable per tenant (international, premium, etc.)
    │ If pattern not allowed → return error "number not permitted"
    │
[3] GoACD: Originate outbound leg to external number
    │ ESL (inbound) → FreeSWITCH: originate
    │   {origination_caller_id_number=18001234}
    │   sofia/gateway/pstn_trunk/0901234567
    │   &park()
    │
[4] Wait for external party to answer
    │
    ├─ [4a] External party answers:
    │   │ ESL → uuid_bridge {caller_uuid} {external_uuid}
    │   │ ESL → uuid_kill {agent007_uuid}  (disconnect agent)
    │   │ agent-007: voice_status → wrap_up
    │   │ Start recording new segment (caller ↔ external)
    │   │ Note: GoACD continues monitoring the call for CDR/hangup
    │   │ Publish Kafka: call.transferred {
    │   │   callId, fromAgent: agent-007, toNumber: "0901234567",
    │   │   type: "external_transfer"
    │   │ }
    │
    └─ [4b] External party does NOT answer (30s timeout / busy):
        │ Cancel originate: ESL → uuid_kill {external_uuid}
        │ Agent-007 remains connected to caller (no state change)
        │ Notify Agent Desktop: "Transfer failed — number not reachable"

──────────────────────────────────────────────────────────

Attended Transfer to External:
    │ Same attended flow as §18.5.4.4 below, except:
    │ Step 2: originate to external number instead of agent extension
    │ Step 3: agent-007 talks to external party (consultation)
    │ Step 4: agent-007 confirms → bridge caller ↔ external, disconnect agent
```

##### 18.5.4.4 Attended Transfer (Full Lifecycle — V2.2)

> **V2.2 Update:** Added cancel/abort flow, consultation timeout, and
> target no-answer handling. Attended transfer has 4 distinct phases,
> each with its own failure handling.

```
Phase 1: INITIATE — Hold caller + ring target
──────────────────────────────────────────────

[1] Agent-007 clicks "Attended Transfer" → selects agent-003
    │ Agent Desktop → gRPC → GoACD:
    │   TransferCall(call_id, from=agent-007, to_agent_id=agent-003, type="attended")
    │
[2] GoACD: Validate + Claim target
    │ Same validation as blind transfer (§18.5.4.1 step [2])
    │ Atomic claim: validateAndClaim(agent-003, voice, call_id)
    │
[3] GoACD: Hold caller + originate consultation
    │ ESL → uuid_hold {caller_uuid}
    │   → Caller hears MOH (local_stream://moh)
    │ ESL → originate sofia/internal/1003@${domain} &park()
    │   → Agent-003 phone rings
    │ GoACD: set transfer_state = "ringing" in call session
    │ Start no-answer timer: 20s
    │
    ├─ [3a] Agent-003 answers → go to Phase 2
    │
    └─ [3b] Agent-003 does NOT answer (20s timeout):
        │ ESL → uuid_kill {agent003_uuid}
        │ Release claim: releaseClaim(agent-003, voice)
        │ ESL → uuid_unhold {caller_uuid}
        │   → Caller reconnected to agent-007
        │ GoACD: clear transfer_state
        │ Notify Agent Desktop (agent-007): "Agent-003 did not answer"
        │ agent-007 remains on-call with caller (no state change)


Phase 2: CONSULTATION — Agent-007 talks to Agent-003
─────────────────────────────────────────────────────

[4] Agent-003 answers (CHANNEL_ANSWER):
    │ ESL → uuid_bridge {agent007_uuid} {agent003_uuid}
    │   → Agent-007 and agent-003 can now talk
    │   → Caller still on hold, hearing MOH
    │ GoACD: set transfer_state = "consulting"
    │ agent-003: voice_status → on_call (consultation)
    │ Start consultation timeout: 300s (5 min, configurable)
    │   → Prevents indefinite hold of caller
    │
    │ Agent Desktop (agent-007) shows 3 buttons:
    │   [Complete Transfer]  [Cancel Transfer]  [Conference]


Phase 3a: COMPLETE — Agent-007 confirms transfer
─────────────────────────────────────────────────

[5] Agent-007 clicks "Complete Transfer"
    │ Agent Desktop → gRPC → GoACD: confirm transfer
    │
    │ ESL → uuid_bridge {caller_uuid} {agent003_uuid}
    │   → Caller now connected to agent-003
    │ ESL → uuid_kill {agent007_uuid}
    │   → Agent-007 disconnected
    │
    │ Update states:
    │   agent-007: voice_status → wrap_up, start ACW timer
    │   agent-003: voice_status remains on_call (new call owner)
    │ Transfer session ownership: session.AgentID = agent-003
    │ session.TransferHistory append agent-007
    │ GoACD: clear transfer_state
    │ Publish Kafka: call.transferred { type: "attended", success: true }


Phase 3b: CANCEL — Agent-007 aborts transfer (V2.2)
────────────────────────────────────────────────────

[5] Agent-007 clicks "Cancel Transfer"
    │ Agent Desktop → gRPC → GoACD:
    │   CancelTransfer(call_id, agent_id=agent-007)
    │
[6] GoACD: Abort transfer
    │ Check: transfer_state = "consulting" (can only cancel during consultation)
    │
    │ ESL → uuid_kill {agent003_uuid}
    │   → Disconnect agent-003 (BYE)
    │ ESL → uuid_unhold {caller_uuid}
    │   → Stop MOH
    │ ESL → uuid_bridge {caller_uuid} {agent007_uuid}
    │   → Caller reconnected to agent-007
    │
    │ Release claim: releaseClaim(agent-003, voice)
    │   → agent-003: voice_status → ready, SADD back to available set
    │ GoACD: clear transfer_state
    │ agent-007: remains on_call (no state change)
    │ Publish Kafka: call.transfer_cancelled {
    │   callId, agent: agent-007, cancelled_target: agent-003
    │ }


Phase 3c: CONFERENCE — Merge all 3 parties (optional)
──────────────────────────────────────────────────────

[5] Agent-007 clicks "Conference" (3-way call)
    │ Agent Desktop → gRPC → GoACD:
    │   ConferenceCall(call_id, initiator=agent-007, target=agent-003)
    │
[6] GoACD: Create conference
    │ ESL → conference {conf_id} (create conference room)
    │ ESL → uuid_transfer {caller_uuid} conference:{conf_id}
    │ ESL → uuid_transfer {agent007_uuid} conference:{conf_id}
    │ ESL → uuid_transfer {agent003_uuid} conference:{conf_id}
    │   → All 3 parties now in conference
    │ GoACD: set transfer_state = "conference"
    │
    │ Agent Desktop shows: [Drop Agent-003] [Leave Conference]
    │ From conference, agent-007 can:
    │   - Drop agent-003 → caller ↔ agent-007 (back to normal call)
    │   - Leave conference → caller ↔ agent-003 (transfer complete)


Consultation Timeout (safety net):
──────────────────────────────────

[7] 300s consultation timeout fires
    │ GoACD: auto-complete transfer (same as Phase 3a)
    │ Rationale: caller has been on hold too long
    │ ESL → uuid_bridge {caller_uuid} {agent003_uuid}
    │ ESL → uuid_kill {agent007_uuid}
    │ Notify Agent Desktop (agent-007): "Consultation timed out — transfer completed"
    │ Publish Kafka: call.transferred { type: "attended", reason: "consultation_timeout" }
```

**Transfer state machine (per call session):**

```
                           TransferCall(attended)
    (none) ─────────────────────────────────────────► RINGING
                                                        │
                               target no-answer         │ target answers
                               → cancel, reconnect      │
                               caller to agent          │
                                 ┌──────────────────────┘
                                 ▼
                             CONSULTING
                            /    │     \
                  Cancel   /     │      \ Conference
                  transfer/      │       \
                         ▼       │        ▼
                      (none)     │    CONFERENCE
                   agent back    │      /     \
                   to caller     │     /       \
                                 │  Drop      Leave
                    Complete     │  target    conf
                    transfer     │    │         │
                         ┌───────┘    │         │
                         ▼            ▼         ▼
                      (none)       (none)    (none)
                   caller ↔       caller ↔  caller ↔
                   target         agent     target
```

##### 18.5.4.5 Transfer No-Answer Re-routing Strategy (V2.2)

> **V2.2 Addition:** Defines what happens when transfer target doesn't answer,
> for all transfer types.

```go
// GoACD: transfer/reroute.go

func (t *TransferManager) handleTransferNoAnswer(session *CallSession, attempt *TransferAttempt) {
    // Release claim on target agent
    t.routing.ReleaseClaim(attempt.TargetAgentID, ChannelVoice)

    switch attempt.Type {
    case TransferBlind:
        // Try to reconnect to original agent first
        origAgent := attempt.FromAgentID
        origState := t.state.GetAgentState(origAgent)

        if origState.VoiceStatus == "wrap_up" && origState.SIPRegistered {
            // Original agent still connected — reconnect caller
            t.esl.Bridge(session.CallerUUID, session.GetAgentUUID(origAgent))
            t.state.SetAgentState(origAgent, ChannelVoice, "on_call")
            t.notify.Send(origAgent, "transfer_failed", "Target agent unavailable")
        } else {
            // Original agent gone — re-queue with high priority
            t.requeue(session, attempt.OriginalQueueID, PriorityHigh)
        }

    case TransferAttended:
        // Consultation phase — just reconnect agent to caller
        t.esl.Unhold(session.CallerUUID)
        t.esl.Bridge(session.CallerUUID, session.GetAgentUUID(attempt.FromAgentID))
        t.notify.Send(attempt.FromAgentID, "transfer_failed", "Target agent unavailable")

    case TransferToQueue:
        // Already in queue — this case doesn't apply (queue handles routing)
        // No-answer on queue-routed agent is handled by normal routing logic (§18.8.3)
    }
}

func (t *TransferManager) requeue(session *CallSession, queueID string, priority int) {
    // Play MOH to caller while waiting
    t.esl.Playback(session.CallerUUID, "local_stream://moh")

    // Re-enqueue with elevated priority
    score := float64(priority+1)*1000000 + float64(maxTimestamp-time.Now().Unix())
    t.redis.ZAdd(ctx, fmt.Sprintf("queue:%s:entries", queueID), &redis.Z{
        Score:  score,
        Member: session.InteractionID,
    })

    t.kafka.Publish("call.requeued", map[string]interface{}{
        "callId":     session.CallID,
        "queueId":    queueID,
        "reason":     "transfer_no_answer",
        "priority":   priority + 1,
    })
}
```

#### 18.5.5 Cross-FreeSWITCH Transfer (Multi-FS Pool)

> **V2.1 Addition:** `uuid_transfer` and `uuid_bridge` only work within a single FreeSWITCH instance. When agents are on different FS instances (e.g., agent-007 on FS-1, agent-003 on FS-2), a different mechanism is needed.

```
GoACD receives transfer request: agent-007 (FS-1) → agent-003 (FS-2)

[1] GoACD: lookup agent FS instance
    agent-007 → FS-1 (from agent registry: agent_id → fs_host mapping)
    agent-003 → FS-2

[2] GoACD: detect cross-FS transfer (fs_host differs)

[3] Cross-FS Blind Transfer:
    │ a. ESL (FS-1): uuid_setvar {caller_uuid} park_after_bridge=true
    │ b. ESL (FS-1): uuid_kill {agent007_uuid}
    │    → Agent-007 leg BYE'd, caller leg parked (audio silence briefly)
    │ c. ESL (FS-2): originate {origination_uuid=NEW_UUID}sofia/internal/1003@domain &park()
    │    → Ring agent-003 on FS-2
    │ d. Agent-003 answers → FS-2 has agent leg
    │ e. GoACD: create media bridge via Kamailio
    │    → ESL (FS-1): uuid_bridge {caller_uuid} sofia/internal/proxy_bridge@kamailio
    │    → Kamailio routes RTP between FS-1 (caller) ↔ FS-2 (agent-003)
    │    → rtpengine: bridge both RTP streams
    │ f. Update states: agent-007 → wrap-up, agent-003 → on-call

[4] Cross-FS Attended Transfer:
    │ Same as within-FS attended transfer (§18.5.4.4), except:
    │ Step 2: originate call to agent-003 on FS-2 (not FS-1)
    │ Step 3: consultation bridge agent-007 (FS-1) ↔ agent-003 (FS-2)
    │   → Bridged via Kamailio + rtpengine (cross-FS media path)
    │ Step 4: final bridge caller (FS-1) ↔ agent-003 (FS-2)
    │   → Same cross-FS bridge mechanism
    │ Cancel: disconnect agent-003 leg on FS-2, unhold caller on FS-1
    │   → Same cancel flow as §18.5.4.4 Phase 3b
```

**Agent → FS Instance Mapping:**

```go
// GoACD maintains agent→FS mapping based on SIP registration
// When sofia::register event arrives for ext 1007 on FS-1:
//   agentRegistry[agent-007].FSHost = "freeswitch-1"
//   agentRegistry[agent-007].Extension = "1007"

func (r *AgentRegistry) GetFSInstance(agentID string) string {
    agent := r.agents[agentID]
    return agent.FSHost // "freeswitch-1" or "freeswitch-2"
}

func (d *Delivery) isLocalTransfer(fromAgent, toAgent string) bool {
    return d.registry.GetFSInstance(fromAgent) == d.registry.GetFSInstance(toAgent)
}
```

**Kamailio cross-FS bridge configuration:**

```
# Kamailio routing script: handle cross-FS bridge requests
# GoACD sends a special SIP INVITE with X-Cross-FS-Bridge header
if (is_present_hf("X-Cross-FS-Bridge")) {
    # Route media through rtpengine between two FS instances
    rtpengine_manage("trust-address replace-origin replace-session-connection");
    # Forward to target FS based on X-Target-FS header
    $du = "sip:" + $hdr(X-Target-FS);
    route(RELAY);
}
```

**Alternative: FS Affinity Routing (simpler, less flexible)**

For simpler deployments, assign agents to FS instances based on extension range:
```
Extensions 1000-4999 → FS-1
Extensions 5000-9999 → FS-2

Kamailio dispatcher: route based on destination extension:
  if ($rU >= 1000 && $rU <= 4999) { ds_select_dst(1, 0); }  # FS-1 group
  if ($rU >= 5000 && $rU <= 9999) { ds_select_dst(2, 0); }  # FS-2 group
```
This ensures transfers between agents in the same range stay on the same FS.
Tradeoff: less flexible load balancing, but avoids cross-FS complexity entirely.

#### 18.5.6 Internal Call — Agent-to-Agent Direct Call (V2.2)

> **V2.2 Addition:** Agent-to-agent direct calls (not transfer) must go through
> GoACD to ensure both agents' states are tracked. Without this, GoACD would
> not know the agents are on-call and could route inbound calls to them.
>
> **Critical rule:** SIP.js on Agent Desktop MUST NOT send direct SIP INVITE
> to another extension. All calls go through: Agent Desktop → CTI Adapter →
> GoACD (gRPC) → FreeSWITCH (ESL). Kamailio blocks direct agent→agent INVITE
> with 403 (see route[REQUESTS]).

```
[1] Agent-007 clicks "Call Agent" → selects agent-003 from directory
    │ Agent Desktop → CTI Adapter → gRPC → GoACD:
    │   MakeCall(from=1007, to=1003, call_type="internal")
    │
[2] GoACD: Validate + Claim BOTH agents
    │ a. Claim caller (agent-007):
    │   Run outbound_claim.lua (§18.5.3):
    │     voice_status → originating
    │     voice_count += 1
    │     SREM agent:available:voice agent-007
    │   If fail → return error "you are not available"
    │
    │ b. Claim callee (agent-003):
    │   Run agent_claim.lua (§18.7.5):
    │     voice_status → ringing
    │     voice_count += 1
    │     SREM agent:available:voice agent-003
    │   If fail → release agent-007 claim, return error "agent-003 not available"
    │
[3] GoACD: Create internal call session
    │ session.Type = "internal"
    │ session.CallerAgentID = agent-007
    │ session.CalleeAgentID = agent-003
    │ (no external caller leg — both legs are agent extensions)
    │
[4] GoACD: Ring callee via FreeSWITCH
    │ ESL (inbound) → FreeSWITCH: originate
    │   sofia/internal/1003@${domain}
    │   &park()
    │ Start no-answer timer: 20s
    │
    │ Push to Agent Desktop (agent-003): incoming internal call screen
    │   { caller: "Agent Nguyễn Văn A (1007)", type: "internal" }
    │
    ├─ [4a] Agent-003 answers (CHANNEL_ANSWER):
    │   │ ESL → bridge {agent007_uuid} {agent003_uuid}
    │   │ Update states:
    │   │   agent-007: voice_status → on_call
    │   │   agent-003: voice_status → on_call
    │   │ Start recording (internal calls recorded per compliance policy)
    │   │ Publish Kafka: call.internal.started {
    │   │   callId, caller: agent-007, callee: agent-003
    │   │ }
    │
    ├─ [4b] Agent-003 does NOT answer (20s timeout):
    │   │ ESL → uuid_kill {agent003_uuid}
    │   │ Release claims for BOTH agents:
    │   │   agent-007: run outbound_release.lua → voice_status → ready
    │   │   agent-003: run agent_release.lua → voice_status → ready
    │   │     miss_count++ (if ≥ 2 → voice_status → not_ready)
    │   │ Notify Agent Desktop (agent-007): "Agent-003 did not answer"
    │
    └─ [4c] Agent-003 rejects call (CHANNEL_HANGUP with cause USER_BUSY):
        │ Same as [4b] but different notification:
        │ Notify Agent Desktop (agent-007): "Agent-003 declined the call"
        │ agent-003: miss_count NOT incremented (intentional reject ≠ miss)

[5] Call ends (either agent hangs up)
    │ FreeSWITCH: CHANNEL_HANGUP → GoACD
    │ GoACD: disconnect both legs
    │ Update states:
    │   Both agents: voice_status → wrap_up (if ACW enabled)
    │                 OR voice_status → ready (if ACW disabled for internal calls)
    │   voice_count -= 1 for both
    │ Stop recording
    │ Publish Kafka: call.internal.ended { callId, duration }
    │ Generate CDR (internal call CDR, separate from customer call CDR)
```

**Internal call vs Outbound call comparison:**

| Aspect | Outbound (§18.5.3) | Internal (§18.5.6) |
|---|---|---|
| Caller agent claim | outbound_claim.lua | outbound_claim.lua (same) |
| Target claim | N/A (external number) | agent_claim.lua (claim callee agent) |
| Originate target | sofia/gateway/pstn_trunk/... | sofia/internal/{ext}@domain |
| Recording | Always | Per compliance policy (configurable) |
| ACW after hangup | Always | Configurable (typically disabled for internal) |
| CDR type | outbound | internal |
| Both agents busy? | Only caller | Both caller AND callee |

**GoACD implementation:**

```go
// GoACD: call/internal.go

func (c *CallControl) MakeInternalCall(ctx context.Context, req *MakeCallRequest) (*CallSession, error) {
    // Detect internal call: target is 4-digit extension
    if !isExtension(req.To) {
        return c.MakeOutboundCall(ctx, req) // delegate to outbound flow
    }

    callerAgentID := c.registry.GetAgentByExtension(req.From)
    calleeAgentID := c.registry.GetAgentByExtension(req.To)
    if calleeAgentID == "" {
        return nil, fmt.Errorf("extension %s not assigned to any agent", req.To)
    }

    callID := uuid.New().String()

    // Step 1: Claim caller (outbound_claim)
    claimed, err := c.routing.OutboundClaim(callerAgentID, callID)
    if err != nil || !claimed {
        return nil, fmt.Errorf("caller agent not available: %w", err)
    }

    // Step 2: Claim callee (agent_claim) — rollback caller on failure
    claimed, err = c.routing.ValidateAndClaim(calleeAgentID, ChannelVoice, callID)
    if err != nil || !claimed {
        c.routing.OutboundRelease(callerAgentID) // rollback
        return nil, fmt.Errorf("target agent not available: %w", err)
    }

    // Step 3: Create session + originate
    session := c.newInternalSession(callID, callerAgentID, calleeAgentID)

    eslCmd := fmt.Sprintf("sofia/internal/%s@%s", req.To, c.domain)
    originateUUID, err := c.esl.Originate(eslCmd, "&park()")
    if err != nil {
        // Rollback both claims
        c.routing.OutboundRelease(callerAgentID)
        c.routing.ReleaseClaim(calleeAgentID, ChannelVoice)
        return nil, fmt.Errorf("originate failed: %w", err)
    }

    session.CalleeUUID = originateUUID
    c.startNoAnswerTimer(session, 20*time.Second, func() {
        c.handleInternalNoAnswer(session)
    })

    return session, nil
}

func (c *CallControl) handleInternalNoAnswer(session *CallSession) {
    c.esl.Kill(session.CalleeUUID)
    c.routing.OutboundRelease(session.CallerAgentID)
    c.routing.ReleaseClaim(session.CalleeAgentID, ChannelVoice)
    c.notify.Send(session.CallerAgentID, "internal_call_failed", "Agent did not answer")
}
```

---

### 18.6 IVR Architecture (Full Media Control via ESL)

#### 18.6.1 V1 vs V2 IVR Comparison

| Aspect | V1 (PortSIP) | V2 (FreeSWITCH + GoACD) |
|---|---|---|
| IVR execution | PortSIP Virtual Receptionist (built-in, limited) | GoACD controls FreeSWITCH via ESL (fully programmable) |
| Audio playback | Upload .wav to PortSIP admin console | FreeSWITCH `playback` via ESL (any file path, URL, or TTS) |
| DTMF collection | PortSIP collects, sends webhook | FreeSWITCH `play_and_get_digits` via ESL, result returned to GoACD |
| Routing decision | Omnichannel returns destination in webhook response | GoACD makes decision directly (in-process, zero latency) |
| Multi-step IVR | Multiple webhook round-trips (latency) | Sequential ESL commands in same goroutine (fast) |
| External API calls | Webhook handler calls APIs between steps | GoACD goroutine calls gRPC/REST between ESL commands |
| Dynamic TTS | Not supported | FreeSWITCH `speak` via mod_tts_commandline or mod_unimrcp |
| Real-time ASR | Not supported | FreeSWITCH `mod_audio_fork` → WebSocket → ASR engine (Phase 4) |

#### 18.6.2 IVR Flow Execution in GoACD

GoACD reads `FlowDefinition` (same schema as §10.2) from PostgreSQL/Redis and executes IVR nodes by sending ESL commands to FreeSWITCH.

```go
// Pseudo-code: IVR execution in GoACD goroutine
func (s *IVRSession) Execute(conn eslgo.Conn, flow FlowDefinition) (*RoutingHints, error) {
    currentNode := findStartNode(flow)
    if currentNode == nil {
        s.logger.Error("IVR flow has no start node", zap.String("flowId", flow.ID))
        return s.fallbackRoute(conn, flow, "no_start_node")
    }

    variables := make(map[string]any)
    nodeCount := 0
    maxNodes  := 50 // Circuit breaker: prevent infinite loops in misconfigured flows

    for currentNode != nil {
        nodeCount++
        if nodeCount > maxNodes {
            s.logger.Error("IVR flow exceeded max node traversals",
                zap.String("flowId", flow.ID), zap.Int("maxNodes", maxNodes))
            return s.fallbackRoute(conn, flow, "max_nodes_exceeded")
        }

        switch node := currentNode.(type) {
        case *IVRPlayAudioNode:
            _, err := conn.Execute("playback", node.AudioPath, false)
            if err != nil {
                s.logger.Warn("IVR playback failed, continuing flow",
                    zap.String("audio", node.AudioPath), zap.Error(err))
                // Non-fatal: skip audio, continue flow (caller hears silence for this step)
            }

        case *IVRCollectDTMFNode:
            result, err := conn.Execute("play_and_get_digits",
                fmt.Sprintf("%d %d 1 %d # %s %s %s",
                    node.MinDigits, node.MaxDigits, node.Timeout,
                    node.PromptAudio, node.InvalidAudio, node.VariableName), false)
            if err != nil {
                s.logger.Warn("IVR DTMF collect failed", zap.Error(err))
                // Treat as timeout — use default option if configured, else fallback
                if node.TimeoutNextNode != "" {
                    currentNode = findNodeByID(flow, node.TimeoutNextNode)
                    continue
                }
                return s.fallbackRoute(conn, flow, "dtmf_collect_error")
            }
            variables[node.VariableName] = result

        case *IVRMenuNode:
            rawDigit, ok := variables[node.InputVariable]
            if !ok {
                s.logger.Warn("IVR menu: missing input variable",
                    zap.String("var", node.InputVariable))
                return s.fallbackRoute(conn, flow, "missing_menu_input")
            }
            digit, _ := rawDigit.(string)
            nextNode := findNodeByMenuOption(flow, node, digit)
            if nextNode == nil {
                // Invalid DTMF digit — retry up to MaxRetries, then fallback
                retryKey := fmt.Sprintf("menu_retry_%s", node.ID)
                retries, _ := variables[retryKey].(int)
                if retries < node.MaxRetries {
                    variables[retryKey] = retries + 1
                    conn.Execute("playback", node.InvalidOptionAudio, false)
                    currentNode = node // replay this menu node
                    continue
                }
                s.logger.Warn("IVR menu: max retries exceeded", zap.String("nodeId", node.ID))
                return s.fallbackRoute(conn, flow, "menu_max_retries")
            }
            currentNode = nextNode
            continue

        case *IVRHTTPRequestNode:
            ctx, cancel := context.WithTimeout(s.ctx, 5*time.Second)
            resp, err := s.httpClient.Do(node.BuildRequest(variables).WithContext(ctx))
            cancel()
            if err != nil {
                s.logger.Warn("IVR HTTP request failed (circuit breaker or timeout)",
                    zap.String("url", node.URL), zap.Error(err))
                // Play error prompt, skip this node's data, continue flow
                conn.Execute("playback", "/audio/vi/service_unavailable.wav", false)
                // Set response variable to nil — downstream nodes must handle nil
                variables[node.ResponseVariable] = nil
            } else {
                variables[node.ResponseVariable] = parseResponse(resp)
            }

        case *IVRQueueNode:
            // IVR complete — validate queue exists before returning
            if !s.queueManager.Exists(node.QueueID) {
                s.logger.Error("IVR references non-existent queue",
                    zap.String("queueId", node.QueueID))
                return s.fallbackRoute(conn, flow, "invalid_queue")
            }
            return &RoutingHints{
                QueueID:  node.QueueID,
                Priority: node.Priority,
                Skills:   node.RequiredSkills,
                Tags:     evaluateTags(node.Tags, variables),
                Customer: variables["customer"],
            }, nil

        default:
            s.logger.Error("IVR: unknown node type", zap.String("type", fmt.Sprintf("%T", currentNode)))
            // Skip unknown node, continue to next
        }

        currentNode = getNextNode(flow, currentNode)
    }

    // Flow ended without reaching a QueueNode — this is a design error in the IVR flow
    s.logger.Error("IVR flow ended without routing — missing QueueNode at end of path",
        zap.String("flowId", flow.ID), zap.Int("nodesTraversed", nodeCount))
    return s.fallbackRoute(conn, flow, "no_queue_node")
}

// fallbackRoute: guarantee every call gets routed, even when IVR breaks
func (s *IVRSession) fallbackRoute(conn eslgo.Conn, flow FlowDefinition, reason string) (*RoutingHints, error) {
    s.logger.Warn("IVR fallback activated",
        zap.String("flowId", flow.ID),
        zap.String("reason", reason),
        zap.String("callId", s.callID))

    // Publish metric for monitoring/alerting
    s.metrics.IVRFallbackTotal.WithLabelValues(flow.ID, reason).Inc()

    // Play apology announcement to caller
    conn.Execute("playback", "/audio/vi/transfer_to_agent.wav", false)
    // "Xin lỗi, hệ thống đang gặp sự cố. Chúng tôi sẽ chuyển bạn đến tổng đài viên."

    // Route to the flow's configured fallback queue, or system-wide default
    fallbackQueueID := flow.FallbackQueueID
    if fallbackQueueID == "" {
        fallbackQueueID = s.config.DefaultFallbackQueueID // system-wide default
    }

    return &RoutingHints{
        QueueID:  fallbackQueueID,
        Priority: PriorityHigh, // Escalated priority — caller already waited through broken IVR
        Skills:   []string{},   // No skill filter — any available agent
        Tags:     map[string]string{"ivr_fallback": reason, "flow_id": flow.ID},
        Customer: s.variables["customer"], // May be nil if identification also failed
    }, nil
}
```

**IVR Fallback Design Rules:**

1. **Every IVR flow MUST have a `FallbackQueueID`** configured in the Admin UI. Flows without one are rejected at save time.
2. **System-wide default queue** (`GOACD_DEFAULT_FALLBACK_QUEUE`) is the last resort — always exists, always has agents assigned.
3. **Fallback calls get `PriorityHigh`** — they've already had a degraded experience.
4. **Monitoring:** `ivr_fallback_total` Prometheus counter with labels `{flow_id, reason}` triggers alerts when > 0.
5. **Audio errors are non-fatal:** If a `playback` fails (file missing), the IVR continues — silence is better than a dropped call.
6. **DTMF collection failures** try the timeout path first, then fallback.
7. **HTTP node failures** (external API down) play an error prompt, set response to nil, and continue — downstream nodes handle nil gracefully.
8. **Max node traversal** (50) prevents infinite loops from circular flow configurations.

#### 18.6.3 IVR Audio Management

```
Audio files stored in SeaweedFS (MinIO):
  /audio/vi/welcome.wav
  /audio/vi/menu_main.wav
  /audio/vi/menu_loan.wav
  /audio/vi/connecting.wav
  /audio/vi/queue_position.wav
  /audio/vi/callback_offer.wav
  /audio/vi/moh/*.wav (music on hold playlist)

FreeSWITCH accesses via:
  Option A: Local filesystem (synced from SeaweedFS via cron)
  Option B: HTTP URL (FreeSWITCH mod_httapi / mod_shout)
    playback http://minio:9000/audio/vi/welcome.wav

Admin uploads audio via Omnichannel Admin UI → SeaweedFS → sync to FS.
```

#### 18.6.4 Dynamic TTS (Phase 2+)

```
GoACD can instruct FreeSWITCH to use TTS for dynamic messages:

ESL → speak flite|kal|"Xin chào anh Nguyễn Văn A, số tài khoản của anh là 1234567"

Hoặc sử dụng Google TTS / Azure TTS qua mod_tts_commandline:
  - GoACD gọi TTS API → nhận audio file → save to temp path
  - ESL → playback /tmp/tts_{session_id}.wav
  - Cleanup after call

Phase 4: mod_audio_fork → stream audio to AI service → real-time conversation
```

#### 18.6.5 Music on Hold (Queue Waiting)

> **V2.1 Update:** The original MOH design had a **critical data race** — `PlayMOH()` held the ESL `conn` in one goroutine while the queue monitor goroutine also called `conn.Execute("break")` to stop MOH. Two goroutines writing to the same TCP socket = data corruption. Fixed by introducing a **serialized ESL command channel** per call session.

**ESL Command Serialization (mandatory for all call sessions):**

```go
// Every call session has a single ESL writer goroutine.
// All other goroutines must send commands through the channel.
// This eliminates all data races on the ESL TCP connection.

type ESLCommand struct {
    App        string
    Args       string
    Block      bool
    ResultChan chan ESLResult
}

type ESLResult struct {
    Result string
    Err    error
}

type CallSession struct {
    callID   string
    conn     eslgo.Conn
    cmdChan  chan ESLCommand  // buffered, size=32
    ctx      context.Context
    cancel   context.CancelFunc
}

// eslWriter is the ONLY goroutine that writes to conn.
// Spawned once per call session.
func (s *CallSession) eslWriter() {
    for {
        select {
        case cmd := <-s.cmdChan:
            result, err := s.conn.Execute(cmd.App, cmd.Args, cmd.Block)
            cmd.ResultChan <- ESLResult{Result: result, Err: err}
        case <-s.ctx.Done():
            return
        }
    }
}

// SendESL is safe to call from any goroutine.
func (s *CallSession) SendESL(app, args string, block bool) (string, error) {
    resultChan := make(chan ESLResult, 1)
    select {
    case s.cmdChan <- ESLCommand{App: app, Args: args, Block: block, ResultChan: resultChan}:
        select {
        case result := <-resultChan:
            return result.Result, result.Err
        case <-s.ctx.Done():
            return "", fmt.Errorf("session cancelled")
        }
    case <-s.ctx.Done():
        return "", fmt.Errorf("session cancelled")
    }
}
```

**MOH implementation (data-race-free):**

```go
// GoACD: khi caller được enqueue
func (q *QueueManager) PlayMOH(session *CallSession, queueConfig QueueConfig, position int) {
    // Play position announcement first
    session.SendESL("playback", "/audio/vi/queue_position.wav", false)
    session.SendESL("speak", fmt.Sprintf("flite|kal|Bạn đang ở vị trí %d", position), false)

    // Loop music on hold until agent available
    // local_stream is a FreeSWITCH feature that loops audio files continuously
    session.SendESL("playback", fmt.Sprintf("local_stream://%s", queueConfig.MOHStream), false)

    // Queue monitor goroutine can safely call:
    //   session.SendESL("break", "", false)
    // This goes through cmdChan → serialized → no data race
}

// Queue drain goroutine (separate from IVR goroutine):
func (q *QueueManager) monitorQueue(session *CallSession, queueID string) {
    ticker := time.NewTicker(500 * time.Millisecond)
    defer ticker.Stop()

    for {
        select {
        case <-session.ctx.Done():
            return
        case <-ticker.C:
            agent, found := q.findAvailableAgent(queueID)
            if found {
                // Stop MOH — safe because SendESL serializes through channel
                session.SendESL("break", "", false)
                // Bridge to agent
                q.deliverToAgent(session, agent)
                return
            }
        }
    }
}
```

**Rule: ALL ESL commands in GoACD MUST go through `session.SendESL()`.** Direct `conn.Execute()` calls are forbidden outside `eslWriter()`. This is enforced by making `conn` unexported in `CallSession`.

---

### 18.7 Agent State Management & Anti-Desync

#### 18.7.1 Single Source of Truth: GoACD

**Key difference from V1:** In V1, agent state existed in both PortSIP AND Redis, requiring complex bidirectional sync. In V2, **GoACD IS the authority** for voice agent state. There is no "PBX state" to sync with — GoACD directly controls FreeSWITCH via ESL and manages state in Redis.

```
V1 (PortSIP):
  Agent Desktop ──→ Agent Service ──→ Redis
                                      ↕ (sync, conflict!)
  PortSIP PBX ←──→ StateSyncService ──→ Redis

V2 (GoACD) — ORIGINAL:
  Agent Desktop ──→ Agent Service ──→ Kafka ──→ GoACD ──→ Redis (single writer)
                                                  │
                                                  └──→ FreeSWITCH (ESL commands, no state to sync)

V2.1 (GoACD) — FIXED: Dual-path (gRPC for realtime, Kafka for audit):
  Agent Desktop ──→ Agent Service ──┬──→ gRPC direct ──→ GoACD ──→ Redis (< 10ms)
                                    │                       │
                                    │                       └──→ FreeSWITCH (ESL)
                                    │
                                    └──→ Kafka (async) ──→ Audit Service, Dashboard
                                         (agent.status.changed event)
```

> **V2.1 Critical Fix:** Agent voice status changes (Ready/Not-Ready) now use **gRPC direct call** from Agent Service to GoACD instead of Kafka. This reduces the state propagation latency from 50-500ms (Kafka consumer poll) to < 10ms (gRPC round-trip). Kafka still receives the event for audit trail and dashboard updates, but it is no longer in the critical routing path.
>
> **Why this matters:** If agent clicks "Not Ready" to take a break but GoACD receives the event 500ms later via Kafka, a call can be routed to them during that window. With gRPC, the state is updated in Redis within 10ms — before any routing decision can use it.

**Dual-path implementation:**

```protobuf
// Added to proto/goacd.proto
rpc SetAgentVoiceStatus(SetAgentVoiceStatusRequest) returns (SetAgentVoiceStatusResponse);

message SetAgentVoiceStatusRequest {
  string agent_id = 1;
  string status = 2;           // "ready", "not_ready"
  string reason = 3;           // not_ready reason (e.g., "break", "training")
  string request_id = 4;       // idempotency key
}

message SetAgentVoiceStatusResponse {
  bool success = 1;
  string error_message = 2;    // e.g., "SIP not registered"
  string actual_status = 3;    // confirmed status after server-side validation
}
```

```typescript
// Agent Service (NestJS): handleAgentStatusChange
async setVoiceStatus(agentId: string, status: string, reason?: string): Promise<SetAgentVoiceStatusResponse> {
  // 1. Synchronous gRPC call to GoACD (critical path)
  const response = await this.goacdClient.setAgentVoiceStatus({
    agentId,
    status,
    reason: reason ?? '',
    requestId: uuidv4(),
  });

  if (!response.success) {
    throw new BadRequestException(response.errorMessage);
    // e.g., "Cannot set Ready: SIP not registered"
  }

  // 2. Async Kafka publish (non-critical path, for audit + dashboard)
  this.kafkaProducer.emit('agent.status.changed', {
    agentId,
    channel: 'voice',
    oldStatus: response.actualStatus, // GoACD returns confirmed state
    newStatus: status,
    reason,
    timestamp: new Date().toISOString(),
  });

  return response;
}
```

```go
// GoACD: gRPC handler for SetAgentVoiceStatus
func (s *GRPCServer) SetAgentVoiceStatus(ctx context.Context, req *pb.SetAgentVoiceStatusRequest) (*pb.SetAgentVoiceStatusResponse, error) {
    // Validate SIP registration before allowing Ready
    if req.Status == "ready" {
        sipRegistered := s.agentState.IsSIPRegistered(req.AgentId)
        if !sipRegistered {
            return &pb.SetAgentVoiceStatusResponse{
                Success:      false,
                ErrorMessage: "SIP not registered — agent must be connected via WebRTC",
            }, nil
        }
    }

    // Idempotency check
    if s.dedup.HasSeen(req.RequestId) {
        return &pb.SetAgentVoiceStatusResponse{Success: true, ActualStatus: req.Status}, nil
    }
    s.dedup.Mark(req.RequestId, 60*time.Second)

    // Update Redis atomically
    err := s.agentState.SetVoiceStatus(req.AgentId, req.Status, req.Reason)
    if err != nil {
        return &pb.SetAgentVoiceStatusResponse{
            Success:      false,
            ErrorMessage: err.Error(),
        }, nil
    }

    // Publish internal event for queue drain trigger
    s.eventBus.Publish(AgentStatusChanged{AgentID: req.AgentId, Status: req.Status})

    return &pb.SetAgentVoiceStatusResponse{
        Success:      true,
        ActualStatus: req.Status,
    }, nil
}
```

**What still uses Kafka (unchanged):**
- `agent.created` / `agent.updated` / `agent.deleted` — CRUD events, not time-critical
- `queue.voice.updated` / `queue.agent.assigned` — queue config changes
- `call.*` events — CDR, audit, dashboard
- `recording.synced` — async background

**What now uses gRPC direct (changed from Kafka):**
- `SetAgentVoiceStatus` — Ready/NotReady for voice channel
- Future: `SetAgentChannelStatus` — for all channels (chat, email)

**Agent Desktop optimistic UI pattern:**

```typescript
// Agent Desktop: onClick "Ready"
async function handleSetReady() {
  // Optimistic UI: show Ready immediately
  setLocalStatus('ready');

  try {
    // WS → Agent Service → gRPC → GoACD → Redis (< 10ms total)
    const result = await agentApi.setVoiceStatus('ready');
    if (!result.success) {
      // Server rejected — revert UI
      setLocalStatus('not_ready');
      toast.error(result.errorMessage); // e.g., "SIP not registered"
    }
  } catch (err) {
    // Network error — revert UI
    setLocalStatus('not_ready');
    toast.error('Không thể kết nối server');
  }
}
```

Desync sources that DISAPPEAR in V2:
- ~~PortSIP agent status vs Redis status~~ → GoACD is the only writer
- ~~PortSIP API timeout khi set agent Ready~~ → No API call — GoACD writes Redis directly
- ~~Race condition: PortSIP routes while Omnichannel updates~~ → GoACD does both

Desync sources that DISAPPEAR in V2.1:
- ~~Kafka lag between agent "Ready" click and GoACD awareness~~ → gRPC direct (< 10ms)
- ~~Agent clicks "Not Ready" but Kafka delays → call routed anyway~~ → gRPC synchronous confirmation
- ~~UI shows "Ready" but server doesn't know yet~~ → gRPC response confirms or rejects

#### 18.7.2 Remaining Desync Sources (V2)

| Tình huống | Hậu quả | Xác suất | Mitigation |
|---|---|---|---|
| Browser crash (SIP.js không deregister) | GoACD thinks agent still registered | Cao | SIP re-REGISTER 30s + SIP OPTIONS probe 10s + WS heartbeat cross-check (see §18.7.3 Layer 1b) |
| Network timeout agent side | WS mất, SIP registration may linger | Trung bình | WS heartbeat 15s + SIP OPTIONS probe triggers within 10s of WS disconnect |
| GoACD crash/restart | Agent states in Redis survive, but in-flight calls lost | Thấp | Redis persistence + in-flight call recovery on restart (see §18.13.1) |
| FreeSWITCH crash | Active calls dropped | Rất thấp | FS pool behind Kamailio dispatcher, auto-failover |
| Redis crash | All agent state lost | Rất thấp | Redis Cluster + PostgreSQL backup |

#### 18.7.3 Multi-layer Detection (V2.1 — Tightened Windows)

> **V2.1 Update:** Giảm worst-case detection window từ 60s → 15s bằng cách kết hợp SIP re-REGISTER 30s + SIP OPTIONS active probe + WS heartbeat cross-trigger.

```
Layer 1a — SIP Registration (passive detection, ≤30s):
  GoACD (inbound ESL): subscribe to sofia::register and sofia::expire events

  sofia::register → agent extension online
    GoACD: mark agent SIP = registered
    GoACD: update HSET agent:state:{id} sip_last_register {timestamp}

  sofia::expire → agent extension offline (re-REGISTER timeout)
    GoACD: mark agent SIP = unregistered
    GoACD: force voice_status = offline
    GoACD: SREM agent:available:voice
    GoACD: if agent has active call → trigger §18.8.5 disconnect recovery

  SIP.js config: register_expires: 30 (re-REGISTER every ~25s)
  → Passive detection: max 30s after browser crash
  → Reduced from 60s (V2.0) to 30s — acceptable overhead (1 extra REGISTER/30s/agent)

Layer 1b — SIP OPTIONS Active Probe (on-demand, ~5s):
  Triggered WHEN: WebSocket heartbeat fails (Layer 2) OR before routing call to agent
  GoACD: send SIP OPTIONS to agent extension via FreeSWITCH

  ESL (inbound) → sofia_contact {agent_extension}
    → Returns contact URI if registered, "error/user_not_registered" if not

  Use case 1 — Pre-routing liveness check:
    Before bridge command, GoACD probes agent SIP registration:
      result := conn.API("sofia_contact", fmt.Sprintf("internal/%s@%s", ext, domain))
      if strings.Contains(result, "error") {
          // Agent SIP dead — skip, try next candidate
          releaseClaim(agentID)
          continue
      }
    → Prevents routing calls to agents whose SIP died within the 30s window

  Use case 2 — Cross-trigger from WS disconnect:
    When Kafka: agent.ws.disconnected received:
      GoACD immediately probes SIP → if unreachable → force offline
      → Reduces effective window from 30s to ~5s (WS detects in 45s + probe 5s)

Layer 2 — WebSocket Heartbeat (Omnichannel, ≤45s):
  Agent Desktop WS ping/pong mỗi 15s (tightened from 30s)
  Miss 3 consecutive pings (45s) → Agent Service marks WS disconnected
  → Kafka event: agent.ws.disconnected
  → GoACD receives → IMMEDIATELY probe SIP OPTIONS (Layer 1b)
  → If SIP unreachable → force offline within 5s of Kafka event
  → If SIP still registered → agent may be on VPN/network switch
    → Mark agent as "degraded" — still available but lower routing score (-0.3)
    → After 30s more without WS reconnect → force offline

Layer 3 — Periodic Reconciliation (mỗi 60s, tightened from 2 phút):
  GoACD reconciliation goroutine:
    1. ESL (inbound) → api sofia status profile internal
       → Get all registered extensions with contact timestamps
    2. Compare with Redis agent:available:voice set
    3. Fix drift:
       - Extension NOT registered but Redis = ready → force offline
       - Extension registered but Redis = offline AND WS connected → allow re-ready
       - Extension registered but last re-REGISTER > 35s ago → probe SIP OPTIONS
    4. Publish reconciliation report to Kafka: goacd.reconciliation
       → Dashboard/alerting can detect systemic drift

Layer 4 — Stale Claim Reaper (mỗi 15s):
  Scan agents in "ringing" state beyond ring_timeout + 10s
  → Release claim, re-route call, log anomaly
  (see §18.7.5 StaleClaimReaper)
```

**Effective detection windows (worst case):**

| Failure Scenario | V2.0 Window | V2.1 Window | Mechanism |
|---|---|---|---|
| Browser crash (tab closed gracefully) | 0s | 0s | SIP.js sends REGISTER with expires=0 (deregister) |
| Browser crash (killed/OOM) | 60s | 30s | SIP re-REGISTER timeout (passive) |
| Browser crash + call being routed | 60s | **~5s** | Pre-routing SIP OPTIONS probe (Layer 1b) |
| Network loss (gradual) | 90s | **~50s** | WS heartbeat (45s) + SIP OPTIONS probe (5s) |
| Network loss (sudden) | 60s | 30s | SIP re-REGISTER timeout |
| Agent process hang (browser freeze) | 60s | **~50s** | WS heartbeat fails (SIP.js may still re-REGISTER if on separate thread) → SIP OPTIONS probe |

#### 18.7.4 Agent State Machine

```
                     SIP REGISTER received
                     (sofia::register event)
    ┌─────────────────────────────────────────────┐
    │                                             ▼
OFFLINE ──────────────────────────────────► REGISTERED
    ▲                                         │
    │                                         │ Agent clicks "Ready"
    │                                         │ (via Kafka event)
    │                                         ▼
    │                                      READY ◄────────── ACW timer expires
    │                                     /   │  \                 ▲
    │    sofia::expire                   /    │    \                │
    │    OR WS + SIP both dead          /     │     \               │
    │                                  /      │      \              │
    │                  MakeCall       /       │       \ Call assigned│
    │               (outbound)      /        │        \ (inbound)  │
    │                              ▼         │         ▼            │
    │                        ORIGINATING      │      RINGING         │
    │                         │     │        │     /       \        │
    │            Customer    │     │ Fail/  │  Answered  No-answer │
    │            answers     │     │ timeout│    │         │        │
    │                        │     │        │    │    (re-route)    │
    │                        ▼     │        │    │    → miss_count++│
    │                     ON-CALL ◄┘        │    │    → if ≥2:     │
    │                        ▲              │    │      NOT-READY   │
    │                        │              │    │                  │
    │                        └──────────────┘    │                  │
    │                                   │◄───────┘                  │
    │                            Hangup │                           │
    │                                   ▼                           │
    │                                WRAP-UP ───────────────────────┘
    │                                   │
    │                                   │ Agent clicks "Not Ready"
    │                                   ▼
    └────────────────────────────── NOT-READY
                                    (with reason)
```

> **V2.1 Update:** Added `ORIGINATING` state for outbound calls. This state is set
> atomically via `outbound_claim.lua` (§18.5.3) **before** FreeSWITCH originate,
> preventing the routing engine from assigning inbound calls to the agent during
> the 10-30s window while waiting for the customer to answer. Valid transitions:
> - `READY → ORIGINATING`: agent initiates outbound call (outbound_claim.lua)
> - `ORIGINATING → ON_CALL`: customer answers
> - `ORIGINATING → READY`: customer doesn't answer / call fails (outbound_release.lua)

#### 18.7.5 Atomic State Operations — Redis Lua Script (Fully Atomic)

> **V2.1 Update:** Replaced optimistic Go-side MULTI/EXEC with a single Redis Lua script. The original design had a TOCTOU race: two goroutines could read the same `voice_count`, both pass the `< maxCount` check, and both increment — resulting in over-assignment. A Lua script executes atomically inside Redis (single-threaded), eliminating this race entirely. This is **mandatory** for horizontal GoACD scaling (§18.13.1) where multiple GoACD instances write to the same Redis.

```lua
-- Redis Lua script: agent_claim.lua
-- KEYS[1] = agent:available:{channel}
-- KEYS[2] = agent:state:{agentId}
-- ARGV[1] = agentId
-- ARGV[2] = channel (e.g., "voice")
-- ARGV[3] = callId (for claim tracking)
--
-- Returns: 1 = claimed, 0 = rejected
-- Atomic: entire script runs without interleaving

local availableKey = KEYS[1]
local stateKey     = KEYS[2]
local agentId      = ARGV[1]
local channel      = ARGV[2]
local callId       = ARGV[3]

-- Check 1: agent is in available set
if redis.call('SISMEMBER', availableKey, agentId) == 0 then
    return 0
end

-- Check 2: status is "ready"
local status = redis.call('HGET', stateKey, channel .. '_status')
if status ~= 'ready' then
    return 0
end

-- Check 3: current count < max capacity
local count    = tonumber(redis.call('HGET', stateKey, channel .. '_count') or '0')
local maxCount = tonumber(redis.call('HGET', stateKey, 'max_' .. channel) or '1')
if count >= maxCount then
    -- Agent is at capacity but still in available set (stale) — fix it
    redis.call('SREM', availableKey, agentId)
    return 0
end

-- All checks passed — atomic claim
local newCount = redis.call('HINCRBY', stateKey, channel .. '_count', 1)

-- Update status to 'ringing' to prevent double-assignment
redis.call('HSET', stateKey, channel .. '_status', 'ringing')
redis.call('HSET', stateKey, channel .. '_claimed_by', callId)
redis.call('HSET', stateKey, channel .. '_claimed_at', redis.call('TIME')[1])

-- Remove from available set (ringing agents are not available)
redis.call('SREM', availableKey, agentId)

return 1
```

```go
// GoACD: load Lua script at startup, call via EVALSHA
var claimScript *redis.Script

func init() {
    claimScript = redis.NewScript(agentClaimLuaSource)
}

func (r *RoutingEngine) ValidateAndClaim(agentID string, channel ChannelType, callID string) (bool, error) {
    ctx := context.Background()

    keys := []string{
        fmt.Sprintf("agent:available:%s", channel),
        fmt.Sprintf("agent:state:%s", agentID),
    }
    args := []interface{}{agentID, string(channel), callID}

    result, err := claimScript.Run(ctx, r.redis, keys, args...).Int()
    if err != nil {
        return false, fmt.Errorf("claim script failed: %w", err)
    }
    return result == 1, nil
}

// Release claim — also a Lua script for atomicity
func (r *RoutingEngine) ReleaseClaim(agentID string, channel ChannelType) error {
    ctx := context.Background()
    // Lua: decrement count, set status back to ready, SADD to available set
    result, err := releaseScript.Run(ctx, r.redis, []string{
        fmt.Sprintf("agent:available:%s", channel),
        fmt.Sprintf("agent:state:%s", agentID),
    }, agentID, string(channel)).Int()
    if err != nil { return err }
    if result == 0 {
        r.logger.Warn("release claim: agent was not in expected state", zap.String("agent", agentID))
    }
    return nil
}
```

```lua
-- Redis Lua script: agent_release.lua
-- Called when: agent doesn't answer (no-answer), call fails, or transfer completes
-- KEYS[1] = agent:available:{channel}
-- KEYS[2] = agent:state:{agentId}
-- ARGV[1] = agentId
-- ARGV[2] = channel

local availableKey = KEYS[1]
local stateKey     = KEYS[2]
local agentId      = ARGV[1]
local channel      = ARGV[2]

local count = tonumber(redis.call('HINCRBY', stateKey, channel .. '_count', -1))
if count < 0 then
    redis.call('HSET', stateKey, channel .. '_count', 0)
    count = 0
end

-- Clear claim tracking
redis.call('HDEL', stateKey, channel .. '_claimed_by')
redis.call('HDEL', stateKey, channel .. '_claimed_at')

-- Restore to ready if agent hasn't been manually set to not-ready
-- Handles both inbound (ringing) and outbound (originating) claim releases
local status = redis.call('HGET', stateKey, channel .. '_status')
if status == 'ringing' or status == 'originating' then
    redis.call('HSET', stateKey, channel .. '_status', 'ready')
    redis.call('HSET', stateKey, 'last_state_change', redis.call('TIME')[1])
    local maxCount = tonumber(redis.call('HGET', stateKey, 'max_' .. channel) or '1')
    if count < maxCount then
        redis.call('SADD', availableKey, agentId)
    end
end

return 1
```

**Stale claim protection:** GoACD runs a background goroutine that scans for agents stuck in `ringing` or `originating` status and force-releases them. This prevents "ghost claims" when the ESL goroutine crashes mid-delivery or an outbound originate hangs without a proper timeout event.

```go
func (r *RoutingEngine) StaleClaimReaper(ctx context.Context) {
    ticker := time.NewTicker(15 * time.Second)
    defer ticker.Stop()
    for {
        select {
        case <-ctx.Done(): return
        case <-ticker.C:
            // SCAN agent:state:* where voice_status = ringing AND claimed_at < now - 35s
            r.scanAndReleaseStale(ctx, "voice", "ringing", 35*time.Second)
            // SCAN agent:state:* where voice_status = originating AND claimed_at < now - 75s
            // (60s originate timeout + 15s grace period)
            r.scanAndReleaseStale(ctx, "voice", "originating", 75*time.Second)
        }
    }
}
```

---

### 18.8 Call Routing Engine & Failure Handling

#### 18.8.1 Routing Flow (integrated into GoACD)

GoACD implements the same scoring algorithm as §7.2 but with direct access to Redis (no network hop to a separate Routing Engine service for voice).

```
IVR complete → RoutingHints { queue, skills, priority, customer }
    │
    ▼
GoACD Routing Engine
    │
    ├── [1] Queue Selection
    │     Find queue by ID or match by skills + channel
    │     Check queue size < maxQueueSize
    │
    ├── [2] Immediate Agent Search
    │     SINTER agent:available:voice agent:skills:{skill} for each required skill
    │     Score candidates: §7.2 algorithm
    │     If agent found → deliver immediately (skip queue)
    │     If no agent → enqueue
    │
    ├── [3] Enqueue (if no immediate match)
    │     ZADD queue:{queueId}:entries {score} {interactionId}
    │     score = priority × 1000000 + (MAX_TS - enqueueTS)
    │     Play MOH to caller (ESL → local_stream)
    │     Start SLA timer
    │     Start position announcements (every 60s)
    │
    └── [4] Queue Drain (background)
          GoACD monitors queue continuously
          When agent becomes available:
            → Pop highest-priority entry from queue
            → Attempt delivery
```

#### 18.8.2 Pre-computed Candidate List (Top-N)

Same design as V1 §18.12.2:

```
HASH routing:attempt:{callId}
  call_id        = fs-call-uuid
  interaction_id = omni-interaction-uuid
  queue_id       = queue-uuid
  candidates     = ["agent-007:0.88", "agent-003:0.67", "agent-012:0.62"]
  current_index  = 0
  attempts       = 0
  started_at     = timestamp
  status         = "routing" | "answered" | "failed" | "queued"

TTL: 300s
```

#### 18.8.3 No-Answer & Fail Re-routing

```go
// GoACD: call delivery with no-answer handling
func (d *Delivery) DeliverToAgent(conn eslgo.Conn, callID string, candidates []Candidate) error {
    attempt := d.loadOrCreateAttempt(callID, candidates)

    for attempt.CurrentIndex < len(candidates) {
        candidate := candidates[attempt.CurrentIndex]

        // Atomic claim
        claimed, err := d.router.ValidateAndClaim(candidate.AgentID, "voice")
        if !claimed {
            attempt.CurrentIndex++
            continue
        }

        // Bridge call to agent
        ext := d.agentRegistry.GetExtension(candidate.AgentID)
        bridgeStr := fmt.Sprintf("sofia/internal/%s@%s", ext, d.domain)

        // Set timeout for no-answer
        conn.Execute("set", "call_timeout=20", false)
        conn.Execute("set", "continue_on_fail=true", false)

        result, err := conn.Execute("bridge", bridgeStr, true) // wait for result

        if err != nil || isNoAnswer(result) || isFail(result) {
            // Agent didn't answer or call failed
            d.handleMiss(candidate.AgentID)

            // Release claim
            d.router.ReleaseClaim(candidate.AgentID, "voice")

            attempt.CurrentIndex++
            attempt.Attempts++
            d.saveAttempt(attempt)

            continue // Try next candidate
        }

        // Success! Agent answered
        attempt.Status = "answered"
        d.saveAttempt(attempt)
        return nil
    }

    // All candidates exhausted → re-queue with escalated priority
    d.requeueWithEscalation(callID, attempt)
    return nil
}

func (d *Delivery) handleMiss(agentID string) {
    missCount := d.redis.HIncrBy(ctx,
        fmt.Sprintf("agent:miss_count:%s", agentID), "count", 1).Val()

    if missCount >= 2 {
        // Auto Not-Ready after 2 consecutive misses
        d.agentState.SetNotReady(agentID, "missed_calls")
        d.publishEvent(AgentAutoNotReady{AgentID: agentID, Reason: "missed_calls"})
    }
}
```

**Key advantage over V1:** In V1, no-answer detection relied on PortSIP webhook (`cdr_target_noanswer`) with HTTP latency. In V2, GoACD detects no-answer directly from the ESL `bridge` command result — zero external latency, immediate re-routing.

#### 18.8.4 Queue Overflow & Last Resort

Same waterfall as V1 §18.12.6, but GoACD executes it directly:

```
SLA timer breach OR max_wait_time exceeded
    │
    ├── Priority 1: Escalate priority in queue (re-score immediately)
    │     ZADD queue:{id}:entries {higher_score} {interactionId}
    │
    ├── Priority 2: Overflow to alternate queue
    │     Move caller to overflow queue (different skills/group)
    │
    ├── Priority 3: Voicemail
    │     ESL → playback /audio/vi/voicemail_prompt.wav
    │     ESL → record /recordings/{interactionId}.wav 120 (max 2 min)
    │     GoACD: publish voicemail event → Interaction Service
    │
    ├── Priority 4: Callback scheduling
    │     ESL → playback "Bạn có muốn được gọi lại? Nhấn 1"
    │     ESL → play_and_get_digits (collect confirmation)
    │     GoACD: create callback request → Kafka → Interaction Service
    │     ESL → playback "Chúng tôi sẽ gọi lại trong vòng 30 phút"
    │     ESL → hangup
    │
    └── Priority 5 (last resort): Route to supervisor
          Find supervisor extension → bridge directly
```

#### 18.8.5 Agent Disconnect During Active Call

```
GoACD (inbound ESL): sofia::expire event for extension 1007
    OR
GoACD (outbound ESL): CHANNEL_HANGUP for agent leg with cause=NORMAL_UNSPECIFIED

    ▼
GoACD: handleAgentDisconnect(agentID, callID)
    │
    ├── [1] If call was RINGING (agent hadn't answered yet):
    │     → bridge command returns fail → re-route loop continues (§18.8.3)
    │     → Transparent to caller
    │
    ├── [2] If call was IN-PROGRESS (active conversation):
    │     → Caller leg: FreeSWITCH continues holding the call
    │     → GoACD: play announcement to caller
    │       ESL → playback "Xin lỗi, kết nối bị gián đoạn. Xin vui lòng chờ..."
    │     → GoACD: attempt to find another available agent
    │       → If found: bridge caller to new agent
    │       → If not found: offer callback or queue
    │     → GoACD: update interaction status = 'interrupted'
    │     → Publish event: call.interrupted { reason: agent_disconnected }
    │
    └── [3] Force agent state:
          → Redis: voice_status = 'offline', SREM agent:available:voice
          → Push notification: "Bạn đã bị disconnect, vui lòng đăng nhập lại"
```

**Key advantage over V1:** In V1, when an agent disconnects during an active call, PortSIP drops both legs (SIP BYE). In V2, GoACD holds the caller leg in FreeSWITCH and can reconnect to another agent — **the caller never hears a disconnect tone**.

---

### 18.9 Sync Architecture

#### 18.9.1 Centralized Agent, Extension & Phone Management

> **V2.2 Update:** This section replaces the original brief §18.9.1 with a comprehensive design covering the full agent lifecycle, extension allocation, SIP credential management, authentication flow, database architecture, multi-instance synchronization, and performance analysis.

##### 18.9.1.1 Architecture Overview — Who Manages What

```
┌──────────────────────────────────────────────────────────────────────────┐
│                   Agent & Extension Management Architecture              │
│                                                                          │
│  ┌─────────────────┐     Kafka: agent.created     ┌──────────────────┐  │
│  │  Agent Service   │──────────────────────────────→│     GoACD        │  │
│  │  (MS-2, NestJS)  │     Kafka: agent.updated     │   (Go, Leader)   │  │
│  │                   │──────────────────────────────→│                  │  │
│  │  • Agent CRUD     │     Kafka: agent.deleted     │  • Extension     │  │
│  │  • Skills/Groups  │──────────────────────────────→│    allocation    │  │
│  │  • Auth (JWT)     │                              │  • Ephemeral     │  │
│  │                   │     gRPC: RegisterAgent       │    HMAC token    │  │
│  │                   │◄─────────────────────────────│    generation    │  │
│  │                   │     (returns ext)             │  • Redis state   │  │
│  └────────┬──────────┘                              │    init          │  │
│           │                                         │    init          │  │
│           │ JWT auth                                └───────┬──────────┘  │
│           ▼                                                 │             │
│  ┌─────────────────┐     REST: GET /cti/webrtc/creds       │             │
│  │  Agent Desktop   │──────────────────────────────┐        │             │
│  │  (Browser)       │                              │        │             │
│  │                   │     SIP REGISTER (WSS)       │        │             │
│  │  • SIP.js UA      │──────────────┐              │        │             │
│  └───────────────────┘              │              │        │             │
│                                     ▼              ▼        │ SQL write   │
│                            ┌─────────────────┐  ┌───▼────┐  │             │
│                            │   Kamailio      │  │  CTI   │  │             │
│                            │                 │  │Adapter │  │             │
│                            │ • auth_ephem:   │  │(MS-19) │  │             │
│                            │   HMAC token    │  │        │  │             │
│                            │   (no DB query) │  │→ GoACD │  │             │
│                            │ • usrloc:       │  │  gRPC  │  │             │
│                            │   store location│  │        │  │             │
│                            └────────┬────────┘  └────────┘  │             │
│                                     │                       │             │
│                                     ▼                       ▼             │
│                            ┌─────────────────────────────────┐           │
│                            │         MariaDB (Shared)         │           │
│                            │                                  │           │
│                            │  subscriber table:               │           │
│                            │    (V2.2: SIP trunks ONLY)       │           │
│                            │                                  │           │
│                            │  location table:                 │           │
│                            │    username | contact | socket   │           │
│                            │    (current SIP registration)    │           │
│                            │                                  │           │
│                            │  Written by: Kamailio (usrloc)   │           │
│                            │              GoACD (trunk creds)  │           │
│                            │  Read by:    Kamailio (loc only)  │           │
│                            │                                  │           │
│                            │  V2.2: Agent auth via            │           │
│                            │  auth_ephemeral (HMAC) — no DB   │           │
│                            └──────────────────────────────────┘           │
│                                                                          │
│  Databases Used:                                                         │
│  ┌──────────────────────┐  ┌──────────────────────┐                      │
│  │ GoACD PostgreSQL      │  │ Kamailio MariaDB     │                      │
│  │ (goacd database)     │  │ (kamailio database)  │                      │
│  │                       │  │                       │                      │
│  │ • agent_extensions    │  │ • subscriber (trunks) │  V2.2: agents use    │
│  │ • queues              │  │ • location (usrloc)   │                      │
│  │ • cdrs                │  │ • dispatcher (FS pool)│                      │
│  │ • recording_sync      │  │ • dialog              │                      │
│  │ • ivr_flows (cache)   │  │ • version             │                      │
│  └──────────────────────┘  └──────────────────────┘                      │
│                                                                          │
│  FreeSWITCH: NO database required.                                       │
│  FS uses XML config files only. No per-agent data stored.                │
│  FS does not handle registration (disable-register=true in §18.2C.3).   │
│  FS bridges to Kamailio which resolves agent location.                   │
│  Each FS instance is independent — zero DB sync needed between FS nodes. │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

##### 18.9.1.2 Extension Allocation Algorithm

```go
// GoACD: agent/registry.go

type ExtensionAllocator struct {
    pgPool     *pgxpool.Pool
    mu         sync.Mutex          // serialize allocation to prevent duplicate ext
    rangeStart int                  // GOACD_EXT_RANGE_START (default: 1000)
    rangeEnd   int                  // GOACD_EXT_RANGE_END (default: 9999)
    tenantID   string               // multi-tenant: prefix or separate range per tenant
}

// AllocateExtension finds the next available extension number.
// Strategy: sequential scan with gap-filling (reuses recycled extensions).
func (a *ExtensionAllocator) AllocateExtension(ctx context.Context, agentID string) (string, error) {
    a.mu.Lock()
    defer a.mu.Unlock()

    // Step 1: Try to reuse a recycled extension (status='recycled')
    var ext string
    err := a.pgPool.QueryRow(ctx, `
        UPDATE goacd.agent_extensions
        SET agent_id = $1, status = 'pending', updated_at = NOW()
        WHERE id = (
            SELECT id FROM goacd.agent_extensions
            WHERE status = 'recycled'
            ORDER BY extension_number ASC
            LIMIT 1
            FOR UPDATE SKIP LOCKED
        )
        RETURNING extension_number
    `, agentID).Scan(&ext)

    if err == nil {
        return ext, nil // reused recycled extension
    }

    // Step 2: Allocate next sequential extension
    // Find highest allocated extension → increment
    var maxExt int
    err = a.pgPool.QueryRow(ctx, `
        SELECT COALESCE(MAX(CAST(extension_number AS INTEGER)), $1 - 1)
        FROM goacd.agent_extensions
        WHERE CAST(extension_number AS INTEGER) BETWEEN $1 AND $2
    `, a.rangeStart, a.rangeEnd).Scan(&maxExt)
    if err != nil {
        return "", fmt.Errorf("query max extension: %w", err)
    }

    nextExt := maxExt + 1
    if nextExt > a.rangeEnd {
        return "", fmt.Errorf("extension range exhausted (%d-%d)", a.rangeStart, a.rangeEnd)
    }

    ext = fmt.Sprintf("%d", nextExt)
    return ext, nil
}

// RecycleExtension marks an extension for reuse after agent deletion.
// Extension is NOT immediately available — has a cooldown period (24h)
// to prevent SIP REGISTER from a stale client matching a new agent.
func (a *ExtensionAllocator) RecycleExtension(ctx context.Context, ext string) error {
    _, err := a.pgPool.Exec(ctx, `
        UPDATE goacd.agent_extensions
        SET status = 'cooldown', agent_id = NULL, updated_at = NOW()
        WHERE extension_number = $1
    `, ext)
    return err
}

// CooldownReaper: runs periodically, moves 'cooldown' → 'recycled' after 24h
func (a *ExtensionAllocator) CooldownReaper(ctx context.Context) {
    ticker := time.NewTicker(1 * time.Hour)
    defer ticker.Stop()
    for {
        select {
        case <-ctx.Done(): return
        case <-ticker.C:
            a.pgPool.Exec(ctx, `
                UPDATE goacd.agent_extensions
                SET status = 'recycled'
                WHERE status = 'cooldown'
                AND updated_at < NOW() - INTERVAL '24 hours'
            `)
        }
    }
}
```

**Extension lifecycle states:**

```
  Agent Created        Agent Deleted         24h cooldown        Re-allocated
      │                    │                     │                   │
      ▼                    ▼                     ▼                   ▼
  ┌────────┐          ┌──────────┐          ┌──────────┐       ┌────────┐
  │ pending │──────→  │  active  │──────→  │ cooldown │──────→│recycled│──→ pending
  └────────┘  OK     └──────────┘ delete  └──────────┘ 24h   └────────┘
      │                    │
      │ failed             │ suspend
      ▼                    ▼
  ┌────────┐          ┌───────────┐
  │ failed │          │ suspended │
  └────────┘          └───────────┘
```

##### 18.9.1.3 SIP Credential Generation & Security (Ephemeral Token — V2.2)

> **V2.2 Change:** Replaced static SIP password delivery with **HMAC-based ephemeral tokens** (`auth_ephemeral` module). The client never receives a long-lived SIP password. Instead, GoACD generates a short-lived HMAC token that Kamailio validates using a shared secret — no DB lookup required.

**Why ephemeral tokens?**

| Problem with static passwords | Ephemeral token solution |
|---|---|
| Password sent to browser → XSS/extension can steal it | Token expires in 5 min → stolen token is useless after expiry |
| Password valid for 90 days → long attack window | Token valid for 300s → minimal exposure window |
| Password stored in sessionStorage → persistent in tab | Token refreshed every 25s via WebSocket → never stale |
| Credential rotation requires Kamailio DB write + cache invalidation | No Kamailio DB write — pure HMAC computation |
| auth_db requires DB read per REGISTER | auth_ephemeral is CPU-only — zero DB reads for agent auth |

**How it works:**

```
┌─────────────────────────────────────────────────────────────────┐
│  Ephemeral Token Flow (TURN-style, RFC 5765 inspired)           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Shared Secret: known ONLY to GoACD + Kamailio (env var)        │
│  Agent Desktop NEVER knows the shared secret.                    │
│                                                                  │
│  GoACD generates token:                                          │
│    expiry = unix_timestamp(now + 300s)    // 5 minute validity  │
│    username = "<expiry>:<extension>"      // e.g. "1710500300:1007"│
│    password = Base64(HMAC-SHA1(shared_secret, username))         │
│                                                                  │
│  Agent Desktop receives: { authorizationUser, password }         │
│    → SIP.js uses these for REGISTER                             │
│                                                                  │
│  Kamailio validates (auth_ephemeral module):                    │
│    1. Parse username → extract expiry timestamp + extension      │
│    2. Check: expiry > current_time (token not expired)           │
│    3. Compute: HMAC-SHA1(shared_secret, username)                │
│    4. Compare with client's digest response                      │
│    5. Match → 200 OK. No match → 401 Unauthorized               │
│                                                                  │
│  No DB query. No subscriber table lookup. Pure CPU.              │
└─────────────────────────────────────────────────────────────────┘
```

```go
// GoACD: agent/credentials.go

import (
    "crypto/hmac"
    "crypto/sha1"
    "encoding/base64"
    "fmt"
    "time"
)

// EphemeralTokenTTL is the validity window for SIP auth tokens.
// Must match Kamailio auth_ephemeral's acceptance window.
const EphemeralTokenTTL = 300 * time.Second // 5 minutes

// GenerateEphemeralSIPToken creates a time-limited SIP credential.
// Format follows TURN REST API convention (RFC 5766-inspired):
//   username = "<expiry_unix>:<extension>"
//   password = Base64(HMAC-SHA1(shared_secret, username))
//
// The shared secret is known ONLY to GoACD and Kamailio.
// The agent receives (username, password) but CANNOT derive the secret.
func GenerateEphemeralSIPToken(extension string, sharedSecret string) (username string, password string) {
    expiry := time.Now().Add(EphemeralTokenTTL).Unix()
    username = fmt.Sprintf("%d:%s", expiry, extension)

    mac := hmac.New(sha1.New, []byte(sharedSecret))
    mac.Write([]byte(username))
    password = base64.StdEncoding.EncodeToString(mac.Sum(nil))

    return username, password
}

// GetAgentSIPCredentials returns ephemeral credentials for SIP.js registration.
// Called on each login + refreshed every ~25s via WebSocket push.
// No Kamailio DB write needed — Kamailio validates via HMAC locally.
func (r *Registry) GetAgentSIPCredentials(ctx context.Context, agentID string) (*SIPCredentials, error) {
    agent, err := r.GetAgent(ctx, agentID)
    if err != nil {
        return nil, fmt.Errorf("agent lookup failed: %w", err)
    }

    username, password := GenerateEphemeralSIPToken(agent.Extension, r.ephemeralSecret)

    return &SIPCredentials{
        WsURI:             fmt.Sprintf("wss://%s:5066", r.sipDomain),
        SipURI:            fmt.Sprintf("sip:%s@%s", agent.Extension, r.sipDomain),
        AuthorizationUser: username,   // "<expiry>:<extension>" — NOT the bare extension
        Password:          password,   // HMAC token — NOT a static password
        DisplayName:       agent.DisplayName,
        Extension:         agent.Extension,
        TokenExpiresAt:    time.Now().Add(EphemeralTokenTTL).Unix(),
    }, nil
}

// RefreshSIPToken generates a fresh token for an already-logged-in agent.
// Called by the periodic token refresh loop (every 25s, pushed via WebSocket).
func (r *Registry) RefreshSIPToken(ctx context.Context, agentID string) (username string, password string, expiresAt int64, err error) {
    agent, err := r.GetAgent(ctx, agentID)
    if err != nil {
        return "", "", 0, err
    }

    username, password = GenerateEphemeralSIPToken(agent.Extension, r.ephemeralSecret)
    expiresAt = time.Now().Add(EphemeralTokenTTL).Unix()
    return username, password, expiresAt, nil
}
```

> **Note on ProvisionSIPCredentials:** With ephemeral tokens, agent provisioning no longer writes to Kamailio's `subscriber` table for agent credentials. The subscriber table is retained only for **SIP trunk** authentication (static credentials for PSTN gateways). This eliminates the cross-database consistency problem described in §18.9.1.5 for agent provisioning (GoACD PG ↔ Kamailio MariaDB sync is no longer needed for agent auth).
```

**SIP credential security rules (V2.2 — ephemeral tokens):**

| Rule | Implementation |
|---|---|
| Token strength | HMAC-SHA1 (160-bit) over `<expiry>:<extension>` — cryptographically bound to shared secret |
| Token lifetime | 300 seconds (5 minutes) — expired tokens rejected by Kamailio |
| Token refresh | GoACD pushes new token every 25s via WebSocket → SIP.js updates credentials before re-REGISTER |
| Shared secret | 256-bit random key, stored only in GoACD env (`GOACD_SIP_EPHEMERAL_SECRET`) + Kamailio config. **Never sent to client** |
| Secret rotation | Rotate shared secret via config reload. Kamailio supports dual-secret (old+new) during rotation window |
| No static password | Agent Desktop **never** receives a long-lived SIP password. Token expires even if stolen |
| No Kamailio DB for agent auth | `auth_ephemeral` validates via CPU (HMAC). No subscriber table query for agents |
| Storage at rest | No SIP password stored in GoACD PG for auth purposes. `agent_extensions` table retains extension mapping only |
| Token never logged | GoACD logger: fields `sip_token`, `sip_password` excluded from all log levels |
| Client storage | Token stored in JS variable (memory only) — NOT sessionStorage, NOT localStorage. Garbage collected on tab close |
| Brute-force protection | Kamailio: 5 failed auth → IP banned 300s (§18.2A.1 route[AUTH]) — unchanged |
| Replay protection | Token username contains expiry timestamp → replayed token rejected after expiry |

##### 18.9.1.4 End-to-End Agent Registration Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│              Complete Agent Registration & Authentication Flow           │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  Phase 1: Agent Provisioning (one-time, admin action)                   │
│  ─────────────────────────────────────────────────────                   │
│                                                                          │
│  [1] Admin creates agent in Agent Service (MS-2)                        │
│      POST /agents { name: "Nguyễn Văn A", skills: ["loan"], ... }       │
│      → Agent Service: create agent in PostgreSQL                         │
│      → Kafka: agent.created { agentId, name, skills, maxVoice: 1 }      │
│                                                                          │
│  [2] GoACD consumes Kafka event                                         │
│      → Extension allocator: allocate ext "1007"                          │
│      → Write to GoACD PostgreSQL (agent_extensions):                     │
│        INSERT INTO agent_extensions (agent_id, extension_number)         │
│        VALUES ('<uuid>', '1007')                                         │
│      → Redis: HSET agent:state:<agentId> extension "1007"                │
│      → Kafka: agent.provisioned { agentId, extension: "1007" }           │
│                                                                          │
│      V2.2: NO write to Kamailio subscriber table.                        │
│      Agent auth uses ephemeral HMAC tokens (§18.9.1.3).                  │
│      Kamailio subscriber table is only for SIP trunk credentials.        │
│                                                                          │
│  Phase 2: Agent Login (every session)                                   │
│  ────────────────────────────────────                                    │
│                                                                          │
│  [3] Agent opens Agent Desktop in browser                               │
│      POST /auth/login { username: "nguyen.van.a", password: "..." }      │
│      → Identity Service (MS-1): validate credentials → return JWT        │
│      → Agent Desktop: store JWT in memory                                │
│                                                                          │
│  [4] Agent Desktop requests WebRTC/SIP credentials                      │
│      GET /cti/webrtc/credentials (Authorization: Bearer <JWT>)           │
│      → CTI Adapter (MS-19): validate JWT, extract agentId                │
│      → CTI Adapter → GoACD gRPC: GetAgentSIPCredentials(agentId)         │
│      → GoACD: lookup extension from PostgreSQL                           │
│      → GoACD: generate ephemeral token:                                  │
│        username = "<expiry_unix>:1007"                                   │
│        password = Base64(HMAC-SHA1(shared_secret, username))             │
│      → Return to Agent Desktop:                                          │
│        {                                                                 │
│          wsUri: "wss://pbx.tpb.vn:5066",                                │
│          sipUri: "sip:1007@pbx.tpb.vn",                                 │
│          authorizationUser: "1710500300:1007",  // ephemeral username    │
│          password: "a3F5...",                    // HMAC token (5min TTL)│
│          displayName: "Nguyễn Văn A",                                    │
│          extension: "1007",                      // bare ext for display │
│          tokenExpiresAt: 1710500300,             // client knows when    │
│          iceServers: [{ urls: "stun:..." }, { urls: "turn:..." }]        │
│        }                                                                 │
│      → Agent Desktop: store token in JS memory (NOT sessionStorage)      │
│                                                                          │
│  [5] SIP.js registers with Kamailio                                     │
│      SIP.js → WSS:5066 → Kamailio                                       │
│      REGISTER sip:pbx.tpb.vn SIP/2.0                                    │
│      From: <sip:1710500300:1007@pbx.tpb.vn>   // ephemeral username     │
│      To: <sip:1710500300:1007@pbx.tpb.vn>                               │
│      Contact: <sip:1007@...:5066;transport=ws>                           │
│      Expires: 30                                                         │
│                                                                          │
│  [5b] Token refresh loop (every 25s, via WebSocket):                     │
│      → GoACD pushes new token to Agent Desktop via WS:                   │
│        { event: "sip_token_refresh", username: "<new_expiry>:1007",      │
│          password: "<new_hmac>", tokenExpiresAt: <new_expiry> }          │
│      → Agent Desktop: update SIP.js registerer credentials               │
│      → Next re-REGISTER (within 5s) uses new token                       │
│                                                                          │
│  [6] Kamailio authenticates (auth_ephemeral)                             │
│      → route[AUTH]: detect WSS → use autheph_check("pbx.tpb.vn")        │
│      → auth_ephemeral:                                                    │
│        1. Parse username "1710500300:1007" → expiry=1710500300, ext=1007 │
│        2. Check: 1710500300 > current_unix_time → not expired            │
│        3. Compute: HMAC-SHA1(shared_secret, "1710500300:1007")           │
│        4. Compare HMAC with client digest response → match               │
│      → 200 OK (NO database query — pure CPU computation)                 │
│      → usrloc: save("location") → store contact in MariaDB location tbl  │
│        {username: "1007", contact: "<WSS endpoint>", socket: "tls:5066"} │
│        Note: usrloc stores the bare extension (extracted from ephemeral  │
│        username) for call routing — not the timestamped username.         │
│                                                                          │
│  [7] GoACD detects registration (inbound ESL)                           │
│      FreeSWITCH receives sofia::register event from Kamailio             │
│      → GoACD (ESL subscriber): agent ext 1007 registered                 │
│      → Redis: HSET agent:state:<agentId> sip_registered "1"             │
│      → Agent now eligible to set "Ready" and receive calls               │
│                                                                          │
│  Phase 3: Agent Goes Ready                                              │
│  ─────────────────────────                                               │
│                                                                          │
│  [8] Agent clicks "Ready" in UI                                         │
│      → Agent Service → gRPC → GoACD: SetAgentVoiceStatus(ready)          │
│      → GoACD: check sip_registered == true                               │
│        → If not registered: reject with "SIP not registered"             │
│        → If registered: set voice_status = "ready" in Redis              │
│      → SADD agent:available:voice <agentId>                              │
│      → Agent now receives calls                                          │
│                                                                          │
│  Phase 4: Agent Logout / Tab Close                                      │
│  ─────────────────────────────────                                       │
│                                                                          │
│  [9a] Graceful logout:                                                   │
│      → SIP.js: REGISTER with Expires: 0 (deregister)                    │
│      → Kamailio: delete from location table                              │
│      → GoACD: sofia::expire event → agent offline                        │
│      → GoACD: stop token refresh for this agent                          │
│      → JS memory garbage collected (ephemeral token discarded)           │
│                                                                          │
│  [9b] Tab close / browser crash:                                        │
│      → SIP.js may send deregister (beforeunload) or not (crash)         │
│      → Kamailio: registration expires after 30s (Expires header)         │
│      → GoACD: sofia::expire → agent offline (max 30s detection)          │
│      → Multi-layer detection (§18.7.3) catches faster                   │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

##### 18.9.1.5 Cross-Database Transaction Safety (V2.2 — Simplified)

> **V2.2 Change:** With ephemeral tokens, agent provisioning is now a **single-database operation** (GoACD PostgreSQL only). No Kamailio subscriber table write needed for agent auth. The cross-database saga pattern is eliminated for agent provisioning — only retained for SIP trunk management.

**Problem (V2.1 — resolved):** ~~Agent provisioning writes to 2 databases: GoACD PostgreSQL + Kamailio MariaDB. If one write fails, data is inconsistent.~~

**V2.2 Solution:** Agent auth uses ephemeral HMAC tokens → no Kamailio DB write at provisioning time.

```go
// GoACD: agent/provisioner.go
// V2.2: Single-database provisioning. No Kamailio subscriber write needed.

func (p *Provisioner) ProvisionAgent(ctx context.Context, event AgentCreatedEvent) error {
    // Step 1: Allocate extension in GoACD PostgreSQL (single DB transaction)
    ext, err := p.allocator.AllocateExtension(ctx, event.AgentID)
    if err != nil {
        return fmt.Errorf("extension allocation failed: %w", err)
    }

    // Step 2: Save extension mapping to GoACD PostgreSQL
    // V2.2: No SIP password stored — auth uses ephemeral HMAC tokens
    err = p.registry.SaveExtensionMapping(ctx, AgentExtension{
        AgentID:         event.AgentID,
        ExtensionNumber: ext,
        Status:          "active",
    })
    if err != nil {
        p.allocator.ReleaseExtension(ctx, ext)
        return fmt.Errorf("save mapping failed: %w", err)
    }

    // Step 3: Initialize Redis state
    p.agentState.InitAgentState(ctx, event.AgentID, ext, event.Skills, event.MaxVoice)

    // Step 4: Publish success event
    p.eventPublisher.Publish(ctx, "agent.provisioned", AgentProvisionedEvent{
        AgentID:   event.AgentID,
        Extension: ext,
    })

    p.logger.Info("agent provisioned",
        zap.String("agent_id", event.AgentID),
        zap.String("extension", ext))
    return nil
}

// De-provisioning (agent deleted)
// V2.2: No Kamailio subscriber deletion needed.
func (p *Provisioner) DeprovisionAgent(ctx context.Context, event AgentDeletedEvent) error {
    agent, err := p.registry.GetByAgentID(ctx, event.AgentID)
    if err != nil { return err }

    // Step 1: Force agent offline in Redis (stops call routing + token refresh)
    p.agentState.ForceOffline(ctx, event.AgentID)

    // Step 2: Kick current registration from Kamailio location table
    p.registry.DeleteRegistration(ctx, agent.ExtensionNumber, p.sipDomain)

    // Step 3: Notify agent via WebSocket → SIP.js cleanup
    p.eventPublisher.PublishToAgent(event.AgentID, "session_terminated", map[string]string{
        "reason": "account_deleted",
    })

    // Step 4: Recycle extension (24h cooldown before reuse)
    p.allocator.RecycleExtension(ctx, agent.ExtensionNumber)

    // Step 5: Cleanup Redis state
    p.agentState.RemoveAgent(ctx, event.AgentID)

    return nil
}
```

**Consistency check (startup reconciliation — V2.2 simplified):**

```go
// On GoACD leader startup: verify GoACD PG ↔ Redis consistency
// V2.2: No Kamailio subscriber reconciliation needed (ephemeral tokens).
// Only verify: GoACD PG extensions ↔ Redis agent states are consistent.
func (p *Provisioner) ReconcileState(ctx context.Context) {
    rows, _ := p.pgPool.Query(ctx, `
        SELECT ae.extension_number, ae.agent_id, ae.status
        FROM goacd.agent_extensions ae
    `)
    for rows.Next() {
        var ext, agentID, status string
        rows.Scan(&ext, &agentID, &status)

        // Check Redis state exists
        exists := p.agentState.Exists(ctx, agentID)
        if !exists && status == "active" {
            // Redis lost state (e.g., Redis restart) — reinitialize
            p.logger.Warn("reconciliation: reinitializing Redis state",
                zap.String("extension", ext), zap.String("agent_id", agentID))
            agent, _ := p.registry.GetAgent(ctx, agentID)
            p.agentState.InitAgentState(ctx, agentID, ext, agent.Skills, agent.MaxVoice)
        }
    }
}
```

##### 18.9.1.6 Database Architecture & Synchronization

**Kamailio — MariaDB:**

```
┌───────────────────────────────────────────────────────────────────┐
│                   Kamailio MariaDB Architecture                    │
│                                                                    │
│  ┌──────────────┐     ┌──────────────┐                            │
│  │ Kamailio-1   │     │ Kamailio-2   │                            │
│  │ (MASTER)     │     │ (BACKUP)     │                            │
│  │              │     │              │                            │
│  │ auth_ephem ──┼─ (no DB needed for agent auth — HMAC only) ──  │
│  │ auth_db  ────┼─────┼──────────────┼──┐  (trunk auth only)     │
│  │ usrloc   ────┼─────┼──────────────┼──┤    ┌──────────────────┐│
│  │ dispatcher ──┼─────┼──────────────┼──┼───→│   MariaDB        ││
│  │ dialog   ────┼─────┼──────────────┼──┘    │   (Shared)       ││
│  └──────────────┘     └──────────────┘       │                   ││
│                                               │ Tables:           ││
│  ┌──────────────┐                             │ • subscriber (*)  ││
│  │   GoACD      │──── SQL write (rare) ──────→│ • location        ││
│  │ (Leader)     │    (trunk creds + suspend)  │ • dispatcher      ││
│  └──────────────┘                             │ • dialog          ││
│                                               │ • version         ││
│  (*) subscriber table now used for SIP        └──────────────────┘│
│      trunks ONLY. Agent auth via auth_ephemeral (no DB).          │
│                                                                    │
│  Key Design Decisions:                                             │
│                                                                    │
│  1. BOTH Kamailio instances connect to the SAME MariaDB.           │
│     This is standard for Kamailio HA — Kamailio is stateless,     │
│     all state is in MariaDB.                                       │
│                                                                    │
│  2. usrloc db_mode=2 (Write-Through):                              │
│     Every REGISTER → write to MariaDB location table.              │
│     Both Kamailio instances see the same registration data.        │
│     If Kamailio-1 fails, Kamailio-2 reads location from MariaDB   │
│     → agent is found → no re-registration needed.                  │
│                                                                    │
│  3. V2.2: GoACD NO LONGER writes to subscriber table for agents.  │
│     Agent auth uses auth_ephemeral (HMAC shared secret).           │
│     GoACD only writes to subscriber for SIP trunk credentials     │
│     (rare admin operation, ~2-10 trunks total).                    │
│                                                                    │
│  4. No Kamailio-to-Kamailio DB sync needed.                       │
│     They share the same MariaDB instance. No replication.          │
│     Kamailio is horizontally scalable with shared DB.              │
│                                                                    │
│  5. V2.2: auth_ephemeral shared secret must be configured          │
│     identically on ALL Kamailio instances. Secret rotation:        │
│     update config on all instances + kamcmd cfg.sets (no restart). │
│                                                                    │
└───────────────────────────────────────────────────────────────────┘
```

**MariaDB HA (Critical — currently SPOF):**

```
┌───────────────────────────────────────────────────────────────────┐
│                 MariaDB HA — Galera Cluster (3 nodes)              │
│                                                                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐            │
│  │ MariaDB-1    │  │ MariaDB-2    │  │ MariaDB-3    │            │
│  │ (Primary)    │  │ (Replica)    │  │ (Replica)    │            │
│  │              │  │              │  │              │            │
│  │ wsrep sync   │←→│ wsrep sync   │←→│ wsrep sync   │            │
│  │ replication  │  │ replication  │  │ replication  │            │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘            │
│         │                 │                 │                     │
│         └─────────────────┼─────────────────┘                     │
│                           │                                       │
│                    ┌──────▼───────┐                               │
│                    │ HAProxy /    │  ← Load balancer               │
│                    │ MaxScale     │  ← Reads: round-robin          │
│                    │              │  ← Writes: primary only         │
│                    └──────────────┘                               │
│                                                                    │
│  Why Galera Cluster:                                               │
│  • Synchronous replication — all nodes have same data             │
│  • Automatic failover — node failure = transparent to Kamailio    │
│  • No data loss on failover (synchronous, not async)              │
│  • 3-node minimum for quorum (survives 1 node failure)            │
│                                                                    │
│  Alternative (simpler, less robust):                               │
│  • MariaDB Primary + 1 Replica with semi-sync replication         │
│  • MaxScale for automatic failover                                │
│  • Risk: small data loss window on failover (semi-sync, not full) │
│                                                                    │
│  Docker Compose (production):                                      │
│    mariadb-kam-1:                                                  │
│      image: mariadb:10.11                                          │
│      environment:                                                  │
│        MARIADB_GALERA_CLUSTER_NAME: kamailio_cluster              │
│        MARIADB_GALERA_CLUSTER_ADDRESS: gcomm://mariadb-kam-2,...  │
│        MARIADB_GALERA_MARIABACKUP_USER: backup                   │
│                                                                    │
│  Docker Compose (dev — single instance is acceptable):             │
│    mariadb-kam:                                                    │
│      image: mariadb:10.11                                          │
│      # Single instance — SPOF acceptable in dev                    │
│                                                                    │
└───────────────────────────────────────────────────────────────────┘
```

**FreeSWITCH — No Database:**

```
┌───────────────────────────────────────────────────────────────────┐
│                   FreeSWITCH Database Architecture                  │
│                                                                    │
│  FreeSWITCH does NOT use an external database for:                 │
│  • Agent accounts (handled by Kamailio)                            │
│  • Registration (handled by Kamailio, FS: disable-register=true)   │
│  • CDR (handled by GoACD → GoACD PostgreSQL)                       │
│  • Recording metadata (handled by GoACD → GoACD PostgreSQL)        │
│                                                                    │
│  FreeSWITCH uses:                                                  │
│  • XML configuration files (read at startup, reload via ESL)       │
│  • Internal SQLite: only for core module state (e.g., conference)  │
│    → Ephemeral, not replicated, not critical                       │
│    → Lost on restart = acceptable (conferences are short-lived)    │
│                                                                    │
│  Synchronization between FS instances: NONE required.              │
│  Each FS instance is independent. They share:                       │
│  • Same XML config (deployed via Docker volume or config management)│
│  • Same audio files (mounted from shared volume or synced)         │
│  • Same dialplan (all calls → GoACD via outbound ESL)              │
│                                                                    │
│  FS instance differences:                                          │
│  • Different RTP port ranges (if on same host — not recommended)   │
│  • Different ESL passwords (optional, same is fine in Docker net)   │
│  • Different recordings directory (each writes locally, GoACD syncs)│
│                                                                    │
│  If FS instance dies:                                              │
│  • Active calls on that FS: LOST (audio stops)                     │
│  • No data loss: CDR in GoACD, recordings synced by GoACD pipeline │
│  • New calls: Kamailio dispatcher routes to surviving FS           │
│  • No DB recovery needed: nothing to recover                       │
│                                                                    │
└───────────────────────────────────────────────────────────────────┘
```

##### 18.9.1.7 Performance Analysis

**Kamailio usrloc write performance:**

```
Scenario: 2,000 agents, SIP.js registerExpires=30s

  Writes per second:
    2,000 agents ÷ 30s = ~67 REGISTER/s
    Each REGISTER → 1 UPDATE to location table (usrloc db_mode=2)
    = 67 writes/s to MariaDB

  MariaDB capacity: ~10,000 simple writes/s on SSD
  Load: 67 / 10,000 = 0.67% → negligible

  With 10,000 agents:
    10,000 ÷ 30 = ~333 writes/s → still 3.3% of capacity → safe

  At 50,000 agents (extreme):
    50,000 ÷ 30 = ~1,667 writes/s → 16.7% → still safe
    If concerned: switch to usrloc db_mode=1 (Write-Back)
    → memory-first, periodic flush to DB (every 60s)
    → Tradeoff: on Kamailio crash, registrations lost (agents re-REGISTER within 30s)
```

**Kamailio auth_ephemeral performance (V2.2 — replaces auth_db for agents):**

```
  ┌─────────────────────────────────────────────────────────────────────────┐
  │  V2.2 Performance Impact: auth_ephemeral vs auth_db                    │
  ├─────────────────────────────────────────────────────────────────────────┤
  │                                                                         │
  │  auth_db (old):                                                         │
  │    REGISTER → SELECT ha1 FROM subscriber → MD5 compare                  │
  │    Cost: 1 DB query + 1 MD5 computation per REGISTER                    │
  │    With cache: first REGISTER = DB hit, subsequent = memory             │
  │    Cache invalidation needed on password rotation                        │
  │                                                                         │
  │  auth_ephemeral (new):                                                  │
  │    REGISTER → parse timestamp + HMAC-SHA1 computation → compare         │
  │    Cost: 1 string parse + 1 HMAC-SHA1 per REGISTER                      │
  │    NO database query. NO cache. NO cache invalidation.                  │
  │                                                                         │
  │  ── CPU benchmark: HMAC-SHA1 vs MD5 ──                                  │
  │                                                                         │
  │    MD5:       ~400 MB/s = ~6M hashes/s (for short strings)              │
  │    HMAC-SHA1: ~200 MB/s = ~3M hashes/s (for short strings)              │
  │                                                                         │
  │    HMAC-SHA1 is ~2x slower than MD5 per operation.                      │
  │    BUT: auth_ephemeral does 1 HMAC vs auth_db does 1 MD5 + 1 DB query  │
  │    Net result: auth_ephemeral is FASTER because DB I/O >> CPU cost.     │
  │                                                                         │
  │  ── Per-REGISTER cost comparison ──                                     │
  │                                                                         │
  │    auth_db:         ~50μs (MD5) + ~200μs (DB query, cached) = ~250μs    │
  │    auth_db (cold):  ~50μs (MD5) + ~1ms (DB query, uncached) = ~1.05ms   │
  │    auth_ephemeral:  ~1μs (parse) + ~100μs (HMAC-SHA1) = ~101μs          │
  │                                                                         │
  │    → auth_ephemeral is 2.5x faster than cached auth_db                  │
  │    → auth_ephemeral is 10x faster than uncached auth_db                 │
  │                                                                         │
  │  ── Throughput at scale ──                                               │
  │                                                                         │
  │    2,000 agents / 30s = 67 REGISTER/s                                   │
  │      auth_db:         67 × 250μs  = 16.7ms total CPU/s → 0.002%        │
  │      auth_ephemeral:  67 × 101μs  = 6.8ms total CPU/s  → 0.001%        │
  │      Both: negligible at this scale.                                     │
  │                                                                         │
  │    10,000 agents / 30s = 333 REGISTER/s                                 │
  │      auth_db:         333 × 250μs = 83.3ms/s → still negligible         │
  │      auth_ephemeral:  333 × 101μs = 33.6ms/s → still negligible         │
  │                                                                         │
  │    50,000 agents / 30s = 1,667 REGISTER/s (extreme)                     │
  │      auth_db:         1,667 × 1ms (uncached risk) = 1.67s/s → concern   │
  │        DB connection pool exhaustion risk at this scale                   │
  │      auth_ephemeral:  1,667 × 101μs = 168ms/s → still safe              │
  │        No DB dependency → no connection pool risk                         │
  │                                                                         │
  │  ── Verdict ──                                                          │
  │                                                                         │
  │    auth_ephemeral IMPROVES Kamailio performance:                         │
  │    ✓ Eliminates DB dependency for agent REGISTER auth                    │
  │    ✓ Eliminates cache invalidation complexity                            │
  │    ✓ Pure CPU: horizontally scalable (add Kamailio instances)            │
  │    ✓ No connection pool to Kamailio MariaDB for auth                     │
  │    ✓ Consistent latency (no cold-cache spikes)                           │
  │                                                                         │
  │    The only added cost is the WebSocket token refresh from GoACD:        │
  │    2,000 agents × 1 WS message/25s = 80 msg/s → trivial for GoACD      │
  │    10,000 agents × 1 WS message/25s = 400 msg/s → still manageable      │
  │                                                                         │
  │    Trade-off: GoACD must be available for token refresh.                 │
  │    If GoACD goes down: tokens expire in 5min → agents lose registration. │
  │    Mitigation: GoACD HA (leader election, §18.5) + 5min buffer.         │
  │                                                                         │
  └─────────────────────────────────────────────────────────────────────────┘
```

**Kamailio auth_db read performance (retained for SIP trunks only):**

```
  auth_db is now used ONLY for SIP trunk authentication (non-WebSocket).
  Typical trunk count: 2-10 trunks → ~1 REGISTER/min → negligible.
  No performance concern for trunk-only auth_db usage.
```

**Extension allocation throughput (V2.2 — simplified):**

```
  Agent creation: batch during initial setup (~100-500 agents)
  → 500 agents × 1 DB write (GoACD PG only) = 500 writes
  → V2.2: No Kamailio MariaDB write needed for agent provisioning
  → At 100 writes/s = 5s for batch provisioning → acceptable

  Steady state: ~1-2 new agents per day → negligible
```

**Kamailio SIP processing capacity:**

```
  Kamailio is one of the highest-performance SIP proxies:
  • Single instance: 5,000-10,000 INVITE/s (depending on routing complexity)
  • Our load: ~100 new calls/s peak + ~67 REGISTER/s = ~170 transactions/s
  • Utilization: 170 / 5,000 = 3.4% → massive headroom

  Scaling point: at 50,000+ concurrent calls → add second Kamailio + DNS SRV
```

**GoACD → Kamailio MariaDB connection pooling (V2.2 — reduced usage):**

```go
// GoACD: Kamailio MariaDB connection pool (separate from GoACD PostgreSQL)
// V2.2: This pool is now used ONLY for:
//   - SIP trunk credential management (rare admin operations)
//   - usrloc queries for agent location (call routing, if needed)
//   - Suspend/unsuspend agent (delete/restore location entry)
// Agent SIP auth no longer writes to subscriber table (ephemeral tokens).
kamailioPool, _ := sql.Open("mysql", fmt.Sprintf(
    "%s:%s@tcp(%s)/%s?parseTime=true&maxAllowedPacket=4194304",
    cfg.KamailioDBUser, cfg.KamailioDBPassword,
    cfg.KamailioDBHost, cfg.KamailioDBName,
))
kamailioPool.SetMaxOpenConns(5)    // V2.2: Even lower — no agent auth writes, only trunk/admin ops
kamailioPool.SetMaxIdleConns(2)    // Keep 2 idle for occasional trunk/suspend ops
kamailioPool.SetConnMaxLifetime(5 * time.Minute)
```

##### 18.9.1.8 Agent Suspension & Extension Management

```go
// Admin action: suspend agent (temporary disable, e.g., during investigation)
// V2.2: With ephemeral tokens, suspension is simpler — no subscriber table to modify.
// Just: (1) force offline, (2) kick location, (3) mark suspended in GoACD PG.
// GoACD token refresh loop checks agent status — suspended agents get no new tokens.
func (p *Provisioner) SuspendAgent(ctx context.Context, agentID, reason string) error {
    agent, _ := p.registry.GetByAgentID(ctx, agentID)

    // Step 1: Force offline in GoACD (stops call routing)
    p.agentState.ForceOffline(ctx, agentID)

    // Step 2: Mark suspended in GoACD PostgreSQL (blocks token refresh)
    p.pgPool.Exec(ctx, `
        UPDATE goacd.agent_extensions SET status = 'suspended', updated_at = NOW()
        WHERE agent_id = $1
    `, agentID)

    // Step 3: Kick current registration from Kamailio location table
    p.kamailioDBPool.Exec(ctx, `
        DELETE FROM location WHERE username = $1 AND domain = $2
    `, agent.ExtensionNumber, p.sipDomain)

    // Step 4: Stop token refresh for this agent (WebSocket notification)
    // Agent's current token expires in ≤5min → SIP.js REGISTER fails → auto-offline
    p.eventPublisher.PublishToAgent(agentID, "session_terminated", map[string]string{
        "reason": "account_suspended",
    })

    p.logger.Info("agent suspended",
        zap.String("agent_id", agentID),
        zap.String("reason", reason))
    return nil
}

// Admin action: unsuspend agent
// V2.2: No Kamailio subscriber re-provisioning needed.
// Just mark active → agent logs in again → gets fresh ephemeral token.
func (p *Provisioner) UnsuspendAgent(ctx context.Context, agentID string) error {
    // Update status → agent can login and receive tokens again
    p.pgPool.Exec(ctx, `
        UPDATE goacd.agent_extensions SET status = 'active', updated_at = NOW()
        WHERE agent_id = $1
    `, agentID)

    return nil
}
```

##### 18.9.1.9 Multi-Tenant Extension Ranges

```
For multi-tenant deployments, each tenant gets a dedicated extension range:

  Tenant A (TPBank):    extensions 1000-4999 (4,000 agents max)
  Tenant B (VietinBank): extensions 5000-8999 (4,000 agents max)
  System reserved:       extensions 9000-9999 (1,000 for internal/test)

Configuration:
  GOACD_EXT_RANGE_START=1000
  GOACD_EXT_RANGE_END=4999
  (set per GoACD instance, or per tenant_id in agent_extensions table)

Kamailio: uses domain-based multi-tenancy:
  Tenant A: pbx.tpbank.vn
  Tenant B: pbx.vietinbank.vn

  subscriber table:
    username=1007, domain=pbx.tpbank.vn → Tenant A agent
    username=1007, domain=pbx.vietinbank.vn → Tenant B agent (same ext# OK, different domain)

  SIP.js registers with tenant-specific domain in SIP URI.

Note: For initial deployment (single tenant, TPBank), this complexity is not needed.
Single range 1000-9999 with single domain is sufficient.
```

#### 18.9.2 Queue Sync (Omnichannel Routing Engine → GoACD)

GoACD manages voice queues independently. Omnichannel Routing Engine (MS-21) manages email/chat/social queues.

```
Queue Created/Updated (Kafka: queue.voice.updated)
    → GoACD: create/update queue in Redis
    → Queue config: skills, SLA, MOH, overflow rules

Queue Agent Assignment (Kafka: queue.agent.assigned)
    → GoACD: add agent to queue's skill matching set
```

#### 18.9.3 CDR Sync (GoACD → Omnichannel)

GoACD generates CDRs directly (no need to sync from external PBX):

```
Call ends → GoACD generates CDR:
  {
    call_id, interaction_id, caller, callee, agent_id,
    start_time, answer_time, end_time, duration,
    queue_id, queue_wait_time, ivr_duration,
    recording_path, hangup_cause,
    dtmf_collected, ivr_selections
  }

→ Publish to Kafka: call.cdr
→ Interaction Service consumes → updates interaction record
→ Audit Service consumes → immutable log
→ GoACD also saves to PostgreSQL (goacd_cdrs table) for backup
```

#### 18.9.4 Recording Sync (FreeSWITCH → SeaweedFS) — V2.1 Resilient Design

> **V2.1 Update:** Replaced simple directory-watch with a state machine-based sync pipeline with exponential backoff, dead-letter queue, and disk pressure protection. Recordings are compliance-critical — losing a recording can result in regulatory penalties.

```
GoACD controls recording via ESL:
  ESL → record_session /recordings/{date}/{interaction_id}.wav

FreeSWITCH saves recording to local disk.
```

**Recording lifecycle state machine:**

```
RECORDING → COMPLETED → PENDING_UPLOAD → UPLOADING → UPLOADED → VERIFIED → CLEANED
                                ↓ (failure)
                          RETRY (exp backoff, max 5 attempts)
                                ↓ (exhausted)
                          DEAD_LETTER (manual intervention required)
```

**Sync pipeline (GoACD goroutine pool):**

```go
// GoACD: recording sync pipeline
type RecordingSyncPipeline struct {
    workers     int           // default: 4 concurrent uploads
    retryMax    int           // default: 5
    retryBase   time.Duration // default: 10s (backoff: 10s, 20s, 40s, 80s, 160s)
    diskLimit   float64       // default: 0.85 (85% disk usage threshold)
    stateDB     *pgx.Pool     // PostgreSQL for sync state (survives GoACD restart)
}

// State tracked in PostgreSQL: goacd.recording_sync
// | id | interaction_id | local_path | remote_path | status | attempts |
// | last_attempt_at | error_message | file_size | checksum_sha256 | created_at |
```

**Step-by-step sync process:**

```
[1] Call ends → GoACD: ESL record_stop event
    → INSERT INTO recording_sync (status='COMPLETED', local_path=..., checksum=SHA256(file))
    → Enqueue to upload channel

[2] Upload worker picks up job:
    a. Check disk pressure: if FS disk usage > 85%
       → ALERT: "FreeSWITCH recording disk near full"
       → Prioritize this upload (move to front of queue)
    b. Check file exists and size > 0 (not truncated)
       → If size == 0: mark DEAD_LETTER reason="empty_recording"
    c. Upload to SeaweedFS via S3 API:
       → PUT recordings/{tenant}/{YYYY-MM-DD}/{interaction_id}.wav
       → With metadata: Content-Type=audio/wav, x-amz-meta-interaction-id, x-amz-meta-checksum
    d. Verify upload: HEAD request → compare Content-Length with local file size
       → If mismatch: retry (corruption during upload)
    e. Update PostgreSQL: status='UPLOADED', remote_path=...
    f. Publish Kafka: recording.synced { interactionId, remotePath, duration, fileSize, checksum }

[3] Verification worker (runs every 5 minutes):
    → SELECT * FROM recording_sync WHERE status='UPLOADED' AND updated_at < now() - '5m'
    → For each: HEAD request to SeaweedFS → verify exists + correct size
    → If verified: status='VERIFIED'
    → If missing: status='PENDING_UPLOAD' (re-upload)

[4] Cleanup worker (runs every 15 minutes):
    → SELECT * FROM recording_sync WHERE status='VERIFIED' AND updated_at < now() - '1h'
    → Delete local file from FreeSWITCH disk
    → status='CLEANED'
    → Local files are kept for 1 hour after verification (safety buffer)

[5] Retry handler:
    → On upload failure: attempts++, next_retry = now + retryBase * 2^(attempts-1)
    → Cap: retryBase * 2^4 = 160s max backoff
    → After 5 failed attempts: status='DEAD_LETTER'
    → ALERT to monitoring: "Recording upload permanently failed"
    → Dead-lettered recordings are NEVER deleted from local disk

[6] Startup recovery (GoACD restart):
    → SELECT * FROM recording_sync WHERE status IN ('PENDING_UPLOAD', 'UPLOADING', 'RETRY')
    → Re-enqueue all to upload channel
    → SCAN /recordings/ for files NOT in recording_sync table (missed during crash)
    → INSERT these as COMPLETED → enqueue
```

**Disk pressure protection:**

```go
func (p *RecordingSyncPipeline) checkDiskPressure() DiskStatus {
    stat := syscall.Statfs_t{}
    syscall.Statfs("/recordings", &stat)
    usedPct := 1.0 - float64(stat.Bavail)/float64(stat.Blocks)

    if usedPct > 0.95 {
        // CRITICAL: force-clean VERIFIED recordings older than 10 minutes
        p.emergencyCleanup(10 * time.Minute)
        return DiskCritical
    }
    if usedPct > 0.85 {
        // WARNING: accelerate cleanup, reduce retention from 1h to 15m
        p.accelerateCleanup(15 * time.Minute)
        return DiskWarning
    }
    return DiskOK
}
```

**SeaweedFS unavailability:**

| Duration | Behavior |
|---|---|
| < 5 min | Retry with backoff, recordings queue on local disk |
| 5-60 min | Alert fired, uploads queued in PostgreSQL, local disk fills |
| > 60 min | Disk pressure triggers alert, oldest VERIFIED recordings cleaned aggressively |
| SeaweedFS back | Startup recovery scans PostgreSQL → re-uploads all pending, no data loss |

**Integrity guarantees:**
- SHA-256 checksum computed at record-stop, verified after upload
- Local files NEVER deleted until remote verification passes
- Dead-lettered files NEVER auto-deleted (require manual resolution)
- PostgreSQL sync state survives GoACD crashes

---

### 18.10 WebRTC Integration

**Architecture:** SIP.js in browser → Kamailio WSS → rtpengine (media) → FreeSWITCH

```
┌──────────────────────────────────────────────────────┐
│ Agent Desktop (Browser)                               │
│                                                       │
│  SIP.js UserAgent                                     │
│    │ WSS (port 5066)                                  │
│    │ SIP signaling over WebSocket                     │
│    ▼                                                  │
│  Kamailio (dSIPRouter)                                │
│    │ SIP routing                                      │
│    │ websocket module: SIP-over-WSS ↔ SIP-over-UDP    │
│    ▼                                                  │
│  rtpengine                                            │
│    │ Media relay                                      │
│    │ SRTP (browser) ↔ RTP (FreeSWITCH)               │
│    │ ICE negotiation (browser side)                   │
│    │ DTLS-SRTP ↔ SDES-SRTP                           │
│    │ Opus ↔ PCMU/PCMA transcoding                    │
│    ▼                                                  │
│  FreeSWITCH                                           │
│    RTP media processing                               │
│    Recording, conferencing, etc.                      │
│                                                       │
│  coturn (TURN server)                                 │
│    NAT traversal for corporate firewalls              │
└──────────────────────────────────────────────────────┘
```

**Credential Provisioning (V2.2 — ephemeral tokens):**

```typescript
// GET /cti/webrtc/credentials
// CTI Adapter → GoACD (gRPC) → return ephemeral SIP credentials
{
  "wsUri": "wss://pbx.tpb.vn:5066",
  "sipUri": "sip:1007@pbx.tpb.vn",
  "authorizationUser": "1710500300:1007",    // ephemeral: "<expiry>:<extension>"
  "password": "a3F5dWJhbmsrY...",            // HMAC-SHA1 token (5min TTL)
  "displayName": "Nguyễn Văn Agent",
  "extension": "1007",                       // bare extension for display/routing
  "tokenExpiresAt": 1710500300,              // client knows expiry for refresh scheduling
  "iceServers": [
    { "urls": "stun:stun.tpb.vn:3478" },
    { "urls": "turn:turn.tpb.vn:3478", "username": "<temp>", "credential": "<temp>" }
  ]
}
```

**SIP.js configuration (Agent Desktop — V2.2 with token refresh):**

```typescript
// Initial SIP.js setup with ephemeral credentials
let currentCredentials = await fetchSIPCredentials(); // GET /cti/webrtc/credentials

const userAgent = new UserAgent({
  uri: UserAgent.makeURI(`sip:${currentCredentials.extension}@pbx.tpb.vn`),
  transportOptions: {
    server: currentCredentials.wsUri,
  },
  authorizationUsername: currentCredentials.authorizationUser,  // "<expiry>:<ext>"
  authorizationPassword: currentCredentials.password,           // HMAC token
  sessionDescriptionHandlerFactoryOptions: {
    peerConnectionConfiguration: {
      iceServers: currentCredentials.iceServers,
    },
  },
  register: true,
  registerExpires: 30,  // V2.1: 30s re-REGISTER interval (tightened from 60s, see §18.7.3)
});

// V2.2: Listen for token refresh events from GoACD via WebSocket
// GoACD pushes new tokens every 25s (before the 30s re-REGISTER cycle)
wsClient.on('sip_token_refresh', (data: { username: string; password: string; tokenExpiresAt: number }) => {
  // Update SIP.js registerer credentials for next re-REGISTER
  const registerer = userAgent.registerer;
  if (registerer) {
    registerer.dispose(); // stop current registration
    const newRegisterer = new Registerer(userAgent, {
      expires: 30,
      extraHeaders: [],
    });
    // Update UA auth credentials
    (userAgent as any).options.authorizationUsername = data.username;
    (userAgent as any).options.authorizationPassword = data.password;
    newRegisterer.register();
  }
  currentCredentials.authorizationUser = data.username;
  currentCredentials.password = data.password;
  currentCredentials.tokenExpiresAt = data.tokenExpiresAt;
});

// V2.1: ICE restart on network change (WiFi → LAN, VPN reconnect)
// Without this, agent loses audio when switching networks
navigator.connection?.addEventListener('change', () => {
  const activeSession = sipUserAgent.sessions[0];
  if (activeSession?.state === SessionState.Established) {
    const sdh = activeSession.sessionDescriptionHandler as Web.SessionDescriptionHandler;
    sdh.peerConnection?.restartIce();
    activeSession.invite({ requestDelegate: { onAccept: () => console.log('ICE restarted') }});
  }
});
```

**V2.1: Codec preference (Vietnam carrier compatibility):**

```xml
<!-- FreeSWITCH: /etc/freeswitch/sip_profiles/internal.xml -->
<!-- PCMA (G.711 alaw) preferred for Vietnam PSTN carriers -->
<!-- Opus for WebRTC agents, transcoding handled by rtpengine -->
<param name="codec-prefs" value="PCMA,PCMU,opus@48000h@20i@1c"/>

<!-- External (trunk) profile: force G.711a for PSTN -->
<!-- /etc/freeswitch/sip_profiles/external.xml -->
<param name="codec-prefs" value="PCMA,PCMU"/>
```

```
# rtpengine: codec negotiation
# Browser offers Opus → rtpengine transcodes to PCMA for FS/PSTN
# FS offers PCMA → rtpengine transcodes to Opus for browser
# This happens in kernel-space, low latency
```

---

### 18.11 Real-time Event Pipeline

```
FreeSWITCH ESL Events
    │
    ▼
GoACD (processes + enriches)
    │
    ├── Kafka Topics:
    │     call.started      → { callId, caller, calledDID, timestamp }
    │     call.ivr.complete → { callId, selections, routingHints }
    │     call.queued       → { callId, queueId, position, estimatedWait }
    │     call.routing      → { callId, agentId, attempt }
    │     call.ringing      → { callId, agentId, agentExt }
    │     call.answered     → { callId, agentId, waitTime }
    │     call.hold         → { callId, agentId }
    │     call.unhold       → { callId, agentId }
    │     call.transfer          → { callId, fromAgent, toAgent, type }
    │     call.transfer_cancelled → { callId, agent, cancelled_target }       (V2.2)
    │     call.transfer_failed   → { callId, reason }                        (V2.2)
    │     call.requeued          → { callId, queueId, reason, priority }     (V2.2)
    │     call.outbound.answered → { callId, agentId, destination }          (V2.2)
    │     call.outbound.failed   → { callId, agentId, cause }               (V2.2)
    │     call.internal.started  → { callId, caller, callee }               (V2.2)
    │     call.internal.ended    → { callId, duration }                     (V2.2)
    │     call.ended             → { callId, duration, hangupCause }
    │     call.cdr               → { full CDR record }
    │     call.recording         → { callId, recordingPath, duration }
    │     agent.state       → { agentId, channel, oldState, newState }
    │     queue.stats       → { queueId, size, avgWait, agents }
    │
    ├── Redis Pub/Sub (low-latency UI updates):
    │     channel:agent:{agentId}  → agent-specific events (incoming call, state change)
    │     channel:queue:{queueId}  → queue events (new entry, agent assigned)
    │     channel:supervisor       → supervisor events (SLA breach, overflow)
    │
    └── gRPC StreamEvents → CTI Adapter (MS-19) → WebSocket → Agent Desktop
```

**Agent Desktop receives call via WebSocket (before SIP INVITE arrives):**

GoACD pushes call metadata to Agent Desktop ~100ms before FreeSWITCH sends the SIP INVITE. This gives the UI time to display caller info before the phone rings.

```
GoACD decides to route call to agent-007
    │
    ├── [Immediate] gRPC → CTI Adapter → WS → Agent Desktop:
    │     { event: "call.incoming",
    │       callId: "...",
    │       caller: { number: "0901234567", name: "Nguyễn Văn A", customerId: "..." },
    │       queue: "loan_processing",
    │       ivrSelections: ["2"],
    │       metadata: { product: "loan", vip: true } }
    │
    ├── [100ms later] ESL → FreeSWITCH → bridge → Kamailio → SIP INVITE → Agent Desktop
    │     SIP.js: incoming call event → match with pre-pushed metadata
    │     UI: show rich call popup with customer info
    │
    └── Agent sees: "Cuộc gọi đến từ Nguyễn Văn A - Vay vốn - VIP"
        before the phone even rings
```

---

### 18.12 Data Mapping Tables

**Agent ↔ Extension Mapping (PostgreSQL: goacd.agent_extensions)**

| Column | Type | Description |
|---|---|---|
| `id` | UUID | Primary key |
| `agent_id` | UUID | FK → Agent Service |
| `extension_number` | VARCHAR(10) | SIP extension (e.g., "1007") |
| `status` | ENUM | 'active', 'suspended', 'pending' |
| `created_at` | TIMESTAMP | |
| `last_registered_at` | TIMESTAMP | Last SIP REGISTER timestamp |
<!-- V2.2: Removed sip_password and kamailio_subscriber_id columns.
     Agent auth uses ephemeral HMAC tokens (§18.9.1.3) — no stored password needed. -->

**Queue Mapping (PostgreSQL: goacd.queues)**

| Column | Type | Description |
|---|---|---|
| `id` | UUID | Primary key |
| `omni_queue_id` | UUID | FK → Omnichannel Routing Engine queue |
| `name` | VARCHAR(100) | Queue name |
| `routing_strategy` | ENUM | 'skill_based', 'round_robin', 'longest_idle', 'ring_all' |
| `required_skills` | JSONB | Required skills for this queue |
| `priority` | INTEGER | Queue priority |
| `sla_seconds` | INTEGER | SLA threshold |
| `moh_stream` | VARCHAR(100) | FreeSWITCH local_stream name |
| `overflow_queue_id` | UUID | Fallback queue |
| `max_queue_size` | INTEGER | Max entries |
| `ring_timeout` | INTEGER | Per-agent ring timeout (default 20s) |

**CDR Records (PostgreSQL: goacd.cdrs)**

| Column | Type | Description |
|---|---|---|
| `id` | UUID | Primary key |
| `call_id` | VARCHAR(100) | FreeSWITCH call UUID |
| `interaction_id` | UUID | FK → Interaction Service |
| `caller` | VARCHAR(20) | Caller number |
| `callee` | VARCHAR(20) | Called number / DID |
| `agent_id` | UUID | Assigned agent |
| `agent_extension` | VARCHAR(10) | Agent extension |
| `queue_id` | UUID | Queue used |
| `start_time` | TIMESTAMP | Call start |
| `answer_time` | TIMESTAMP | Call answered (NULL if missed) |
| `end_time` | TIMESTAMP | Call end |
| `duration` | INTEGER | Total duration (seconds) |
| `talk_time` | INTEGER | Talk time (answer → end) |
| `queue_wait_time` | INTEGER | Time in queue (seconds) |
| `ivr_time` | INTEGER | Time in IVR (seconds) |
| `hangup_cause` | VARCHAR(50) | FreeSWITCH hangup cause |
| `recording_path` | VARCHAR(500) | SeaweedFS path |
| `ivr_selections` | JSONB | DTMF selections during IVR |
| `routing_data` | JSONB | Scoring data, candidate list |
| `transfer_history` | JSONB | Transfer chain |

---

### 18.13 Error Handling & Resilience

#### 18.13.1 GoACD High Availability — Leader Election + In-Flight Call Recovery

> **V2.1 Update:** Replaced the vague "active-passive or single instance" with a concrete leader-election design using Redis-based distributed locking, plus in-flight call recovery on failover. This is the most critical HA improvement — without it, a GoACD crash drops all active calls.

**Architecture:**

```
                         ┌─────────────┐
                         │  Kamailio   │
                         │ (dispatcher)│
                         └──────┬──────┘
                                │ SIP
                         ┌──────┼──────┐
                         │      │      │
                   ┌─────▼──┐ ┌▼──────▼┐
                   │  FS-1  │ │  FS-2  │  ← FreeSWITCH pool
                   └────┬───┘ └────┬───┘
                        │          │
                        │ ESL      │ ESL
                        │          │
         ┌──────────────▼──────────▼──────────────┐
         │         GoACD Cluster (2-3 nodes)       │
         │                                         │
         │  ┌────────────┐    ┌────────────┐       │
         │  │  GoACD-1   │    │  GoACD-2   │       │
         │  │  (LEADER)  │    │ (STANDBY)  │       │
         │  │            │    │            │       │
         │  │ • ESL out  │    │ • Monitors │       │
         │  │   listener │    │   leader   │       │
         │  │ • ESL in   │    │   lock     │       │
         │  │   clients  │    │ • Warm     │       │
         │  │ • Routing  │    │   standby  │       │
         │  │ • IVR      │    │ • Ready to │       │
         │  │ • gRPC     │    │   takeover │       │
         │  └──────┬─────┘    └──────┬─────┘       │
         │         │                 │              │
         └─────────┼─────────────────┼──────────────┘
                   │                 │
              ┌────▼─────────────────▼────┐
              │       Redis Cluster        │
              │                            │
              │ • Agent state (HASH)       │
              │ • Leader lock (SET NX EX)  │
              │ • Active call registry     │
              │ • Call session snapshots   │
              └────────────────────────────┘
```

**Leader Election via Redis Distributed Lock:**

```go
const (
    leaderKey     = "goacd:leader"
    leaderTTL     = 10 * time.Second   // Lock expires in 10s
    renewInterval = 3 * time.Second    // Renew every 3s (well within TTL)
    acquireRetry  = 1 * time.Second    // Standby checks every 1s
)

func (g *GoACD) LeaderElection(ctx context.Context) {
    instanceID := g.config.InstanceID // unique per container: hostname or UUID

    for {
        select {
        case <-ctx.Done(): return
        default:
        }

        // Attempt to acquire leader lock
        acquired, err := g.redis.SetNX(ctx, leaderKey, instanceID, leaderTTL).Result()
        if err != nil {
            g.logger.Error("leader election: Redis error", zap.Error(err))
            time.Sleep(acquireRetry)
            continue
        }

        if acquired {
            g.logger.Info("elected as LEADER", zap.String("instance", instanceID))
            g.runAsLeader(ctx, instanceID)
            // If runAsLeader returns, we lost leadership
            g.logger.Warn("lost leadership, entering standby")
        } else {
            // Check if leader is still alive
            currentLeader, _ := g.redis.Get(ctx, leaderKey).Result()
            g.logger.Debug("standby — current leader", zap.String("leader", currentLeader))
            time.Sleep(acquireRetry)
        }
    }
}

func (g *GoACD) runAsLeader(ctx context.Context, instanceID string) {
    // Start all leader-only services
    g.startOutboundESLServer()      // TCP :9090 — accept FreeSWITCH connections
    g.startInboundESLClients()      // Connect to all FreeSWITCH instances
    g.startGRPCServer()             // gRPC :9091
    g.startReconciliation()
    g.startStaleClaimReaper()
    g.startRecordingSyncPipeline()

    // Recover in-flight calls from previous leader crash
    g.recoverInFlightCalls(ctx)

    // Renew leader lock periodically
    ticker := time.NewTicker(renewInterval)
    defer ticker.Stop()
    defer g.stopAllServices()

    for {
        select {
        case <-ctx.Done(): return
        case <-ticker.C:
            // Renew lock only if we still own it
            result, err := g.redis.Eval(ctx, `
                if redis.call('GET', KEYS[1]) == ARGV[1] then
                    return redis.call('PEXPIRE', KEYS[1], ARGV[2])
                else
                    return 0
                end
            `, []string{leaderKey}, instanceID, leaderTTL.Milliseconds()).Int()

            if err != nil || result == 0 {
                g.logger.Warn("leader lock renewal failed — stepping down")
                return // Exit runAsLeader, re-enter election loop
            }
        }
    }
}
```

**In-Flight Call Registry (Redis):**

Every active call session is periodically snapshotted to Redis, enabling recovery by the new leader.

```go
// GoACD leader: snapshot active calls every 2s
func (g *GoACD) snapshotActiveCalls(ctx context.Context) {
    ticker := time.NewTicker(2 * time.Second)
    defer ticker.Stop()

    for {
        select {
        case <-ctx.Done(): return
        case <-ticker.C:
            for callID, session := range g.activeSessions {
                snapshot := CallSnapshot{
                    CallID:         callID,
                    InteractionID:  session.InteractionID,
                    CallerChannel:  session.CallerChannelUUID,
                    AgentChannel:   session.AgentChannelUUID,
                    AgentID:        session.AgentID,
                    AgentExtension: session.AgentExtension,
                    FSInstance:     session.FreeSWITCHHost,
                    State:          session.State, // ivr, queued, ringing, active, hold
                    StartedAt:      session.StartedAt,
                    SnapshotAt:     time.Now(),
                }
                data, _ := json.Marshal(snapshot)
                g.redis.HSet(ctx, "goacd:active_calls", callID, data)
                g.redis.Expire(ctx, "goacd:active_calls", 30*time.Second) // auto-cleanup if all GoACD instances die
            }

            // Remove calls that ended since last snapshot
            g.cleanupEndedCallSnapshots(ctx)
        }
    }
}
```

**In-Flight Call Recovery (new leader startup):**

```go
func (g *GoACD) recoverInFlightCalls(ctx context.Context) {
    snapshots, err := g.redis.HGetAll(ctx, "goacd:active_calls").Result()
    if err != nil || len(snapshots) == 0 {
        g.logger.Info("no in-flight calls to recover")
        return
    }

    g.logger.Info("recovering in-flight calls", zap.Int("count", len(snapshots)))

    for callID, data := range snapshots {
        var snap CallSnapshot
        json.Unmarshal([]byte(data), &snap)

        // Check if the call is still alive on FreeSWITCH
        eslClient := g.getInboundESL(snap.FSInstance)
        if eslClient == nil {
            g.logger.Warn("FS instance not available for recovery", zap.String("fs", snap.FSInstance))
            continue
        }

        // Check caller channel exists
        result, err := eslClient.API("uuid_exists", snap.CallerChannel)
        if err != nil || strings.TrimSpace(result) != "true" {
            g.logger.Info("call already ended during failover", zap.String("callId", callID))
            g.redis.HDel(ctx, "goacd:active_calls", callID)
            continue
        }

        switch snap.State {
        case "active":
            // Call is bridged and active — just re-register monitoring
            g.logger.Info("re-attaching to active call", zap.String("callId", callID))
            g.reattachCallMonitoring(eslClient, snap)

        case "queued":
            // Caller is in queue (listening to MOH) — resume queue monitoring
            g.logger.Info("resuming queued call", zap.String("callId", callID))
            g.resumeQueuedCall(eslClient, snap)

        case "ringing":
            // Call was being delivered to agent — check if agent answered
            agentExists, _ := eslClient.API("uuid_exists", snap.AgentChannel)
            if strings.TrimSpace(agentExists) == "true" {
                // Agent channel exists — call was answered during failover
                g.reattachCallMonitoring(eslClient, snap)
            } else {
                // Agent didn't answer or channel gone — re-route
                g.logger.Info("re-routing ringing call after failover", zap.String("callId", callID))
                g.rerouteCall(eslClient, snap)
            }

        case "ivr":
            // IVR was in progress — cannot resume mid-flow
            // Route to fallback queue with apology
            g.logger.Info("IVR interrupted by failover — fallback routing", zap.String("callId", callID))
            eslClient.Execute("playback", "/audio/vi/transfer_to_agent.wav", snap.CallerChannel)
            g.routeToFallbackQueue(snap)

        default:
            g.logger.Warn("unknown call state during recovery", zap.String("state", snap.State))
        }
    }
}
```

**Failover timeline:**

```
T=0s    GoACD-1 (leader) crashes
T=0-2s  Active calls: audio continues (FS bridges are independent of GoACD)
        New calls: FS outbound ESL connections queued in TCP backlog
T=1s    GoACD-2: leader lock check → lock expired (TTL=10s? No — renew was 3s ago)
        Wait... TTL hasn't expired yet
T=7s    GoACD-2: leader lock TTL expires (worst case: 10s - 3s last renew = 7s)
T=7s    GoACD-2: acquires leader lock → becomes LEADER
T=7.5s  GoACD-2: starts outbound ESL server → FS connects pending calls
T=8s    GoACD-2: recoverInFlightCalls()
        → Reads Redis snapshots → checks each call on FreeSWITCH
        → Active calls: re-attach monitoring (no audio disruption)
        → Queued calls: resume queue management
        → Ringing calls: check and re-route if needed
T=10s   GoACD-2: fully operational

Total disruption:
  - Active calls (bridged): 0s audio disruption, ~10s monitoring gap
  - Queued calls (MOH): 0s audio disruption (FS local_stream continues), ~10s queue management gap
  - New calls during failover: ~10s delay (TCP backlog), then processed normally
  - Calls in IVR: IVR state lost, routed to fallback queue (~10s + apology message)
```

**Standby Warm-up:**

GoACD-2 (standby) is not idle — it performs:
- Consumes Kafka events (agent.created, queue.updated, etc.) to keep local cache warm
- Maintains Redis connection pool (pre-warmed)
- Subscribes to `goacd:active_calls` key via Redis keyspace notifications (knows call state)
- Does NOT connect to FreeSWITCH ESL (only leader connects, to avoid command conflicts)

**GoACD resilience strategy (V2.1 — updated):**

| Failure | Recovery | Audio Disruption | Data Loss |
|---|---|---|---|
| GoACD leader crash | Standby acquires lock in ≤10s. In-flight calls recovered from Redis snapshots. Active bridged calls: 0s audio disruption. IVR calls: routed to fallback queue. | 0s (active), ~10s (IVR/queue) | None (Redis + snapshot) |
| FreeSWITCH crash | Kamailio dispatcher detects (SIP OPTIONS, 5s interval), removes from pool. Active calls on that FS: lost. GoACD: ESL connection drop → mark calls 'interrupted' → notify agents. New calls: route to surviving FS. | Yes (FS calls) | CDR preserved (GoACD snapshot) |
| Kamailio crash | keepalived VIP failover to backup Kamailio (< 3s). Stateless — no state loss. SIP.js auto-reconnects. | ~3s (re-register) | None |
| rtpengine crash | Media stops. Restart rtpengine (< 5s). Run 2 instances with Kamailio dispatching to both. | < 5s | None |
| Redis crash | GoACD cannot route new calls. Active calls unaffected (FS bridges + GoACD in-memory). Redis Cluster auto-failover (< 15s). GoACD reconnects. | 0s | Agent state rebuilt from PostgreSQL backup on recovery |
| Network partition (GoACD ↔ Redis) | Leader loses lock renewal → steps down. Standby (if different partition) acquires lock. Split-brain protection: leader with stale lock stops accepting new calls after 2 missed renewals (6s). | 0s (active), ~10s (new calls) | None (Redis authoritative) |

#### 18.13.2 Circuit Breakers

```go
// GoACD: circuit breaker for external service calls
type CircuitBreaker struct {
    failures    int
    threshold   int    // default: 5
    resetAfter  time.Duration // default: 30s
    state       string // "closed" | "open" | "half-open"
}

// Applied to:
// - Customer Service gRPC calls (during IVR)
// - BFSI Service calls (during IVR)
// - Kafka publishing (non-blocking, with local buffer)
// - SeaweedFS uploads (recording sync)

// NOT applied to:
// - FreeSWITCH ESL (critical path, must always work)
// - Redis (critical path, must always work)
```

#### 18.13.3 Degraded Mode

When GoACD cannot reach external services:

| Service Down | Impact | Degraded Behavior |
|---|---|---|
| Customer Service | Cannot identify caller | IVR plays generic greeting, route to general queue |
| BFSI Service | Cannot check account status | Skip BFSI IVR nodes, route based on DTMF only |
| Kafka | Cannot publish events | Buffer events in local queue, replay when Kafka recovers |
| Agent Service (Omnichannel) | Cannot sync agent changes | Use cached agent data, reconcile when service recovers |
| Interaction Service | Cannot create interaction record | GoACD creates record locally, sync when service recovers |

---

### 18.14 Performance, Resource Management & Operational Hardening (V2.1)

> **V2.1 Addition:** This section addresses resource management, memory leak prevention, connection pool sizing, DTMF handling, metadata correlation, multi-tab protection, and system tuning for high-load production.

#### 18.14.1 GoACD Resource Management & Goroutine Leak Prevention

**Problem:** GoACD spawns 1 goroutine per call. Without proper lifecycle management, goroutines can leak on ESL connection drops, hung bridge commands, or missed CHANNEL_HANGUP events. At 5,000 concurrent calls, leaked goroutines accumulate and cause OOM.

**Call Session Lifecycle (mandatory):**

```go
func (g *GoACD) handleOutboundESL(conn eslgo.Conn) {
    // Max call duration: 4 hours (bank compliance — longest allowed call)
    ctx, cancel := context.WithTimeout(context.Background(), 4*time.Hour)
    defer cancel()

    session := g.createSession(ctx, conn)

    // Guaranteed cleanup — even on panic
    defer func() {
        if r := recover(); r != nil {
            g.logger.Error("goroutine panic recovered",
                zap.String("callId", session.CallID),
                zap.Any("panic", r),
                zap.String("stack", string(debug.Stack())))
        }
        g.removeSession(session.CallID)
        g.metrics.ActiveSessions.Dec()
        g.metrics.ActiveGoroutines.Dec()
    }()

    g.metrics.ActiveSessions.Inc()
    g.metrics.ActiveGoroutines.Inc()

    // ... IVR, routing, bridge logic ...
}
```

**Session Reaper (catches leaked sessions):**

```go
func (g *GoACD) sessionReaper(ctx context.Context) {
    ticker := time.NewTicker(30 * time.Second)
    defer ticker.Stop()

    for {
        select {
        case <-ctx.Done(): return
        case <-ticker.C:
            now := time.Now()
            g.sessionMu.RLock()
            candidates := make([]string, 0)
            for callID, session := range g.activeSessions {
                // Max session age: 4 hours
                if now.Sub(session.StartedAt) > 4*time.Hour {
                    candidates = append(candidates, callID)
                }
                // Zombie: ESL conn closed but session still in map
                if session.ConnClosed && now.Sub(session.ConnClosedAt) > 30*time.Second {
                    candidates = append(candidates, callID)
                }
            }
            g.sessionMu.RUnlock()

            for _, callID := range candidates {
                g.logger.Warn("reaping stale/zombie session", zap.String("callId", callID))
                if s, ok := g.activeSessions[callID]; ok {
                    s.Cancel() // cancel context → goroutine exits
                }
                g.removeSession(callID)
            }
        }
    }
}
```

**Prometheus Metrics (mandatory for production):**

```go
var (
    activeGoroutines = promauto.NewGauge(prometheus.GaugeOpts{
        Name: "goacd_active_goroutines",
        Help: "Number of active call-handling goroutines",
    })
    activeSessions = promauto.NewGauge(prometheus.GaugeOpts{
        Name: "goacd_active_call_sessions",
        Help: "Number of active call sessions in memory",
    })
    eslOutboundConns = promauto.NewGauge(prometheus.GaugeOpts{
        Name: "goacd_esl_outbound_connections",
        Help: "Number of outbound ESL TCP connections (FS → GoACD)",
    })
    eslInboundConns = promauto.NewGauge(prometheus.GaugeOpts{
        Name: "goacd_esl_inbound_connections",
        Help: "Number of inbound ESL connections (GoACD → FS)",
    })
    redisPoolActive = promauto.NewGauge(prometheus.GaugeOpts{
        Name: "goacd_redis_pool_active",
        Help: "Number of active Redis connections in pool",
    })
    callClaimDuration = promauto.NewHistogram(prometheus.HistogramOpts{
        Name:    "goacd_call_claim_duration_seconds",
        Help:    "Latency of Redis Lua claim script",
        Buckets: []float64{0.0005, 0.001, 0.005, 0.01, 0.05},
    })
    ivrFallbackTotal = promauto.NewCounterVec(prometheus.CounterOpts{
        Name: "goacd_ivr_fallback_total",
        Help: "Number of IVR fallback activations",
    }, []string{"flow_id", "reason"})
)

// pprof endpoint for debugging goroutine leaks
import _ "net/http/pprof"
// Started on :6060 — GET /debug/pprof/goroutine?debug=2
```

**Alert rules (Prometheus/Grafana):**

```yaml
# Alert if goroutine count diverges from session count (leak indicator)
- alert: GoACDGoroutineLeak
  expr: goacd_active_goroutines - goacd_active_call_sessions > 50
  for: 5m
  labels:
    severity: warning

# Alert if session count grows unbounded
- alert: GoACDSessionLeak
  expr: goacd_active_call_sessions > 6000
  for: 2m
  labels:
    severity: critical

# Alert if IVR fallback fires
- alert: GoACDIVRFallback
  expr: rate(goacd_ivr_fallback_total[5m]) > 0
  labels:
    severity: warning
```

#### 18.14.2 TCP Backlog & Connection Limits

**Problem:** Go `net.Listen("tcp", ":9090")` uses Linux `SOMAXCONN` for TCP backlog (default 128). During call bursts (e.g., 500 simultaneous new calls after queue emptied), FreeSWITCH sends 500 outbound ESL connections — backlog overflow → calls dropped with `ESL connection refused`.

**Fix:**

```bash
# System-level: /etc/sysctl.conf (on GoACD host)
net.core.somaxconn = 4096
net.ipv4.tcp_max_syn_backlog = 4096

# FreeSWITCH: max-sessions matches FS capacity
# /etc/freeswitch/autoload_configs/switch.conf.xml
<param name="max-sessions" value="3000"/>
<param name="sessions-per-second" value="100"/>

# FreeSWITCH: ESL outbound retry
# If GoACD refuses connection, FS retries 3x with 500ms delay
# (default mod_event_socket behavior)
```

```go
// GoACD: accept loop with connection limit
func (g *GoACD) startOutboundESLServer(ctx context.Context) {
    listener, _ := net.Listen("tcp", ":9090")

    // Semaphore: max concurrent ESL connections
    maxConns := 5000
    sem := make(chan struct{}, maxConns)

    for {
        conn, err := listener.Accept()
        if err != nil {
            if ctx.Err() != nil { return }
            g.logger.Error("ESL accept error", zap.Error(err))
            continue
        }

        select {
        case sem <- struct{}{}: // acquire slot
            g.metrics.ESLOutboundConns.Inc()
            go func() {
                defer func() { <-sem; g.metrics.ESLOutboundConns.Dec() }()
                g.handleOutboundESL(eslgo.NewConn(conn))
            }()
        default:
            // At capacity — reject connection, FS will retry
            g.logger.Warn("ESL connection rejected: at max capacity")
            conn.Close()
            g.metrics.ESLConnectionsRejected.Inc()
        }
    }
}
```

#### 18.14.3 Redis Connection Pool Sizing

```go
rdb := redis.NewClient(&redis.Options{
    Addr:            "redis:6379",
    PoolSize:        200,              // 5,000 calls ÷ ~25 concurrent Redis ops per call = 200
    MinIdleConns:    50,               // keep 50 warm connections
    PoolTimeout:     5 * time.Second,  // wait for available conn
    ReadTimeout:     3 * time.Second,
    WriteTimeout:    3 * time.Second,
    MaxRetries:      3,
    MinRetryBackoff: 8 * time.Millisecond,
    MaxRetryBackoff: 512 * time.Millisecond,
})

// Health check goroutine
func (g *GoACD) redisHealthCheck(ctx context.Context) {
    ticker := time.NewTicker(5 * time.Second)
    for {
        select {
        case <-ctx.Done(): return
        case <-ticker.C:
            stats := g.redis.PoolStats()
            g.metrics.RedisPoolActive.Set(float64(stats.TotalConns - stats.IdleConns))
            g.metrics.RedisPoolIdle.Set(float64(stats.IdleConns))

            if stats.Timeouts > 0 {
                g.logger.Warn("Redis pool timeouts detected",
                    zap.Uint32("timeouts", stats.Timeouts))
            }
        }
    }
}
```

#### 18.14.4 FreeSWITCH Resource Requirements

| Resource | 2,000 Concurrent Calls | Requirement |
|---|---|---|
| RAM | ~20MB per call with recording | **40GB minimum** |
| CPU | Codec transcoding handled by rtpengine | 4 cores sufficient (media processing offloaded) |
| File descriptors | 2 FD/call (RTP) + 1 FD/call (ESL) ≈ 6,000 | `ulimit -n 65535` |
| Disk I/O | 2,000 concurrent recordings × 64kbps ≈ 16MB/s sustained | **SSD required** |
| Disk space | 64kbps × 3600s × 2000 calls = ~57GB/hour worst case | 500GB+ with aggressive sync to SeaweedFS |
| Network | 2,000 × 64kbps × 2 legs = ~256Mbps RTP | 1Gbps NIC minimum |

```bash
# FreeSWITCH host: /etc/security/limits.conf
freeswitch soft nofile 65535
freeswitch hard nofile 65535
freeswitch soft core unlimited

# Kernel tuning for RTP: /etc/sysctl.conf
net.core.rmem_max = 16777216
net.core.wmem_max = 16777216
net.core.rmem_default = 1048576
net.core.wmem_default = 1048576
net.ipv4.udp_mem = 4096 87380 16777216
```

#### 18.14.5 DTMF Handling — rtpengine Passthrough & Buffer Flush

**Problem 1:** rtpengine may strip RFC 2833 telephone-event packets during transcoding if not configured correctly. This silently breaks IVR DTMF collection.

**Problem 2:** If caller presses DTMF before the prompt finishes playing, digits may be in the buffer and collected out-of-order.

**Fix — rtpengine configuration (Kamailio script):**

```
# Kamailio routing script: preserve telephone-event through rtpengine
rtpengine_manage("trust-address replace-origin replace-session-connection ICE=force DTLS=passive codec-accept-PCMU codec-accept-PCMA codec-accept-telephone-event");
```

**Fix — FreeSWITCH DTMF configuration:**

```xml
<!-- /etc/freeswitch/autoload_configs/switch.conf.xml -->
<param name="rtp-digit-delay" value="40"/>

<!-- /etc/freeswitch/sip_profiles/internal.xml -->
<param name="dtmf-type" value="rfc2833"/>
<param name="liberal-dtmf" value="true"/>
<param name="rfc2833-pt" value="101"/>
```

**Fix — GoACD: flush DTMF buffer before collection:**

```go
// Before every play_and_get_digits, flush any buffered DTMF
session.SendESL("flush_dtmf", "", false)
session.SendESL("play_and_get_digits",
    fmt.Sprintf("%d %d 1 %d # %s %s %s",
        node.MinDigits, node.MaxDigits, node.Timeout,
        node.PromptAudio, node.InvalidAudio, node.VariableName), false)
```

#### 18.14.6 Metadata Correlation — SIP Call-ID ↔ WebSocket callId

**Problem:** GoACD pre-pushes call metadata via gRPC/WS ~100ms before SIP INVITE arrives at Agent Desktop. Agent Desktop receives both:
1. WebSocket: `{ event: "call.incoming", callId: "goacd-uuid-123", ... }`
2. SIP.js: incoming INVITE with `Call-ID: fs-uuid-456@freeswitch`

These are different IDs. Without correlation, the UI cannot match the rich metadata to the SIP session.

**Fix — Custom SIP header injection:**

```go
// GoACD: before bridge, set custom SIP header on FreeSWITCH channel
correlationID := uuid.New().String()

// Set SIP header that will be included in the INVITE to agent
session.SendESL("set", fmt.Sprintf("sip_h_X-GoACD-Correlation-ID=%s", correlationID), false)

// Push metadata with same correlation ID
g.pushMetadataToAgent(agentID, CallMetadata{
    CorrelationID: correlationID,
    CallID:        session.CallID,
    Caller:        callerInfo,
    Queue:         queueName,
    IVRSelections: selections,
})

// Bridge to agent
session.SendESL("bridge", bridgeStr, true)
```

```typescript
// Agent Desktop: match SIP INVITE with pre-pushed metadata
sipUserAgent.delegate = {
  onInvite(invitation: Invitation) {
    // Extract correlation ID from SIP headers
    const correlationId = invitation.request.getHeader('X-GoACD-Correlation-ID');

    // Match with pre-pushed metadata from WebSocket
    const metadata = pendingCallMetadata.get(correlationId);
    if (metadata) {
      // Rich popup: "Nguyễn Văn A - Vay vốn - VIP"
      showIncomingCallWithMetadata(invitation, metadata);
    } else {
      // Metadata not yet received or correlation failed — show basic popup
      showIncomingCallBasic(invitation);
      // Retry match when metadata arrives (race condition)
      onMetadataReceived((meta) => {
        if (meta.correlationId === correlationId) {
          updateCallPopup(meta);
        }
      });
    }
  }
};
```

**Fallback:** If SIP header extraction fails (some SIP proxies strip unknown headers), use caller number as secondary correlation: match WebSocket `caller.number` with SIP `From` header.

#### 18.14.7 Multi-Tab SIP Registration Protection

**Problem:** Agent opens 2 browser tabs → 2 SIP.js instances attempt REGISTER → Kamailio accepts both (default `max_contacts=0` = unlimited) → calls may be delivered to either tab randomly.

**Fix — Client-side (BroadcastChannel API):**

```typescript
// Agent Desktop: single-tab SIP enforcement
const sipChannel = new BroadcastChannel('agent-desktop-sip');
let isSIPOwner = false;

sipChannel.onmessage = (event) => {
  if (event.data.type === 'SIP_CLAIM' && event.data.tabId !== myTabId) {
    if (isSIPOwner) {
      // Another tab is trying to claim SIP — reject
      sipChannel.postMessage({ type: 'SIP_ALREADY_OWNED', tabId: myTabId });
    }
  }
  if (event.data.type === 'SIP_ALREADY_OWNED' && event.data.tabId !== myTabId) {
    // Another tab owns SIP — disable voice in this tab
    disableSIPRegistration();
    showWarning('Voice đã active ở tab khác. Đóng tab kia để sử dụng voice ở đây.');
  }
};

// On startup: try to claim SIP
sipChannel.postMessage({ type: 'SIP_CLAIM', tabId: myTabId });
setTimeout(() => {
  if (!receivedAlreadyOwned) {
    isSIPOwner = true;
    startSIPRegistration();
  }
}, 500); // wait 500ms for response from other tabs

// On tab close: release
window.addEventListener('beforeunload', () => {
  sipChannel.postMessage({ type: 'SIP_RELEASED', tabId: myTabId });
});
```

**Fix — Server-side (Kamailio: enforce single registration):**

```
# Kamailio config: limit to 1 contact per AOR (Address of Record)
modparam("registrar", "max_contacts", 1)

# When a second REGISTER arrives for the same AOR:
# → Kamailio replaces the old contact with the new one
# → Old tab's SIP.js will receive a re-REGISTER failure → triggers re-register
# → If both tabs keep fighting, the BroadcastChannel client-side fix prevents this
```

#### 18.14.8 Customer Lookup Response Cache

**Problem:** During high load, 1,000 concurrent IVR calls all call Customer Service gRPC to identify caller by phone number. Many callers may call multiple times (redial, callback). Without caching, Customer Service is hammered.

```go
// GoACD: in-memory LRU cache for customer lookups
type CustomerCache struct {
    cache *lru.Cache  // hashicorp/golang-lru
    ttl   time.Duration
}

func NewCustomerCache(size int, ttl time.Duration) *CustomerCache {
    c, _ := lru.New(size) // default: 10,000 entries
    return &CustomerCache{cache: c, ttl: ttl}
}

func (c *CustomerCache) Get(phoneNumber string) (*CustomerInfo, bool) {
    if val, ok := c.cache.Get(phoneNumber); ok {
        entry := val.(*cacheEntry)
        if time.Since(entry.cachedAt) < c.ttl {
            return entry.customer, true
        }
        c.cache.Remove(phoneNumber) // expired
    }
    return nil, false
}

// Usage in IVR:
func (s *IVRSession) identifyCaller(callerNumber string) (*CustomerInfo, error) {
    // Check cache first
    if customer, ok := s.customerCache.Get(callerNumber); ok {
        return customer, nil
    }

    // Cache miss → gRPC call (with circuit breaker)
    customer, err := s.customerClient.Identify(s.ctx, callerNumber)
    if err != nil {
        return nil, err // circuit breaker will handle
    }

    // Cache for 5 minutes
    s.customerCache.Set(callerNumber, customer)
    return customer, nil
}
```

#### 18.14.9 Candidate List Sizing & Parallel Ring

**Problem:** With Top-3 candidates and 20s ring timeout per agent, worst case is 3 × 20s = 60s before all candidates exhausted and call re-queued. Caller experiences 60s additional wait.

**Fix — Increase candidates + parallel ring for top-2:**

```go
const (
    candidateListSize = 5  // Increased from 3 to 5
    parallelRingCount = 2  // Ring top-2 simultaneously
    ringTimeout       = 15 // Reduced from 20s to 15s
)

func (d *Delivery) DeliverToAgent(session *CallSession, candidates []Candidate) error {
    attempt := d.loadOrCreateAttempt(session.CallID, candidates)

    for attempt.CurrentIndex < len(candidates) {
        // Try to claim parallelRingCount agents simultaneously
        claimed := make([]Candidate, 0, parallelRingCount)
        for i := attempt.CurrentIndex; i < len(candidates) && len(claimed) < parallelRingCount; i++ {
            c := candidates[i]
            ok, _ := d.router.ValidateAndClaim(c.AgentID, "voice", session.CallID)
            if ok {
                claimed = append(claimed, c)
            }
            attempt.CurrentIndex = i + 1
        }

        if len(claimed) == 0 {
            continue // no agents claimed, try next batch
        }

        if len(claimed) == 1 {
            // Single ring (standard flow)
            result := d.ringAgent(session, claimed[0], ringTimeout)
            if result.Answered { return nil }
            d.handleMiss(claimed[0].AgentID)
            d.router.ReleaseClaim(claimed[0].AgentID, "voice")
            continue
        }

        // Parallel ring: first to answer wins, others get BYE
        winner := d.parallelRing(session, claimed, ringTimeout)
        if winner != nil {
            // Release claims for non-winners
            for _, c := range claimed {
                if c.AgentID != winner.AgentID {
                    d.router.ReleaseClaim(c.AgentID, "voice")
                }
            }
            return nil
        }

        // None answered — handle misses, release all claims
        for _, c := range claimed {
            d.handleMiss(c.AgentID)
            d.router.ReleaseClaim(c.AgentID, "voice")
        }
    }

    d.requeueWithEscalation(session.CallID, attempt)
    return nil
}
```

**Parallel ring via FreeSWITCH:**

```go
func (d *Delivery) parallelRing(session *CallSession, agents []Candidate, timeout int) *Candidate {
    // FreeSWITCH supports comma-separated bridge for simultaneous ring
    // First leg to answer cancels the others
    bridgeStr := ""
    for i, a := range agents {
        ext := d.agentRegistry.GetExtension(a.AgentID)
        if i > 0 { bridgeStr += "," }
        bridgeStr += fmt.Sprintf("sofia/internal/%s@%s", ext, d.domain)
    }

    session.SendESL("set", fmt.Sprintf("call_timeout=%d", timeout), false)
    session.SendESL("set", "continue_on_fail=true", false)

    // Comma-separated bridge = ring all simultaneously, first answer wins
    result, err := session.SendESL("bridge", bridgeStr, true)
    if err != nil || isNoAnswer(result) {
        return nil
    }

    // Determine which agent answered from channel variables
    answeredExt := extractAnsweredExtension(result)
    for _, a := range agents {
        if d.agentRegistry.GetExtension(a.AgentID) == answeredExt {
            return &a
        }
    }
    return nil
}
```

**Impact:** Worst-case wait reduced from 60s (3×20s sequential) to **30s** (5 candidates, 2 parallel, 15s timeout: ceil(5/2) × 15s = 45s theoretical, but typically 1-2 rounds = 15-30s).

---

### 18.15 Docker Infrastructure

```yaml
# Add to infra/docker-compose.yml

services:
  # ── Kamailio / dSIPRouter ─────────────────────────────
  dsiprouter:
    image: dsiprouter/dsiprouter:latest
    container_name: dsiprouter
    restart: unless-stopped
    ports:
      - "5060:5060/udp"     # SIP UDP
      - "5060:5060/tcp"     # SIP TCP
      - "5061:5061/tcp"     # SIP TLS
      - "5066:5066/tcp"     # WebSocket Secure (WSS) for WebRTC
      - "8443:443"          # dSIPRouter management GUI
    environment:
      - DSIP_DOMAIN=${SIP_DOMAIN:-pbx.tpb.vn}
      - DSIP_SERVERNAT=0
      - DSIP_EXTERNAL_IP=${PUBLIC_IP}
    volumes:
      - dsiprouter-data:/etc/dsiprouter
      - kamailio-config:/etc/kamailio
    depends_on:
      - mariadb-kam
    networks:
      - tpb-network

  # MariaDB for Kamailio — shared by all Kamailio instances + GoACD
  # Dev: single instance. Production: Galera Cluster (see §18.9.1.6)
  mariadb-kam:
    image: mariadb:10.11
    container_name: mariadb-kamailio
    restart: unless-stopped
    environment:
      - MYSQL_ROOT_PASSWORD=${KAM_DB_ROOT_PASSWORD}
      - MYSQL_DATABASE=kamailio
      - MYSQL_USER=kamailio
      - MYSQL_PASSWORD=${KAM_DB_PASSWORD}
    volumes:
      - kamailio-db:/var/lib/mysql
    healthcheck:
      test: ["CMD", "healthcheck.sh", "--su-mysql", "--connect", "--innodb_initialized"]
      interval: 10s
      timeout: 5s
      retries: 3
    networks:
      - tpb-network

  # ── rtpengine ──────────────────────────────────────────
  rtpengine:
    image: drachtio/rtpengine:latest
    container_name: rtpengine
    restart: unless-stopped
    network_mode: host          # Cần host networking cho RTP ports
    command: >
      rtpengine
        --interface=${PUBLIC_IP}
        --listen-ng=22222
        --port-min=40000
        --port-max=60000
        --log-level=5
        --delete-delay=30

  # ── FreeSWITCH ─────────────────────────────────────────
  freeswitch:
    image: signalwire/freeswitch:1.10
    container_name: freeswitch
    restart: unless-stopped
    ports:
      - "5080:5080/udp"     # SIP (internal profile, from Kamailio)
      - "5080:5080/tcp"
      - "8021:8021/tcp"     # ESL (Event Socket) — GoACD connects here
      - "16384:32768:16384-32768/udp"  # RTP media range
    environment:
      - FREESWITCH_DEFAULT_PASSWORD=${FS_ESL_PASSWORD}
      - FREESWITCH_DOMAIN=${SIP_DOMAIN:-pbx.tpb.vn}
    volumes:
      - freeswitch-config:/etc/freeswitch
      - freeswitch-recordings:/recordings
      - freeswitch-audio:/audio   # IVR prompts, MOH
    networks:
      - tpb-network

  # ── GoACD Cluster (Leader-Standby) ─────────────────────
  # Both instances run the same binary with leader election via Redis.
  # Only the elected leader binds ESL/gRPC ports. Standby stays warm.
  # FreeSWITCH dialplan connects to goacd-vip:9090 (Docker DNS round-robin).
  # In production (K8s), use a Service with leader-election sidecar.

  goacd-1:
    build:
      context: ./services/goacd
      dockerfile: Dockerfile
    hostname: goacd-1
    restart: unless-stopped
    ports:
      - "9090:9090/tcp"     # Outbound ESL listener (FS connects here) — only active on leader
      - "9091:9091/tcp"     # gRPC server (Omnichannel connects here)
      - "9092:9092/tcp"     # REST API (admin/monitoring)
      - "9093:9093/tcp"     # Prometheus metrics
    environment:
      - GOACD_INSTANCE_ID=goacd-1
      - GOACD_FS_ESL_HOSTS=freeswitch:8021          # comma-separated for multi-FS pool
      - GOACD_FS_ESL_PASSWORD=${FS_ESL_PASSWORD}
      - GOACD_REDIS_URL=redis://redis:6379
      - GOACD_KAFKA_BROKERS=kafka:9092
      - GOACD_PG_URL=postgres://goacd:${GOACD_DB_PASSWORD}@postgres:5432/goacd
      - GOACD_GRPC_PORT=9091
      - GOACD_ESL_LISTEN_PORT=9090
      - GOACD_EXT_RANGE_START=1000
      - GOACD_EXT_RANGE_END=9999
      - GOACD_SIP_DOMAIN=${SIP_DOMAIN:-pbx.tpb.vn}
      - GOACD_KAMAILIO_DB_HOST=mariadb-kam
      - GOACD_KAMAILIO_DB_NAME=kamailio
      - GOACD_LEADER_TTL_MS=10000
      - GOACD_LEADER_RENEW_MS=3000
      - GOACD_CALL_SNAPSHOT_INTERVAL_MS=2000
    depends_on:
      - freeswitch
      - redis
      - kafka
      - postgres
    networks:
      tpb-network:
        aliases:
          - goacd-vip    # Both instances share this alias for FS outbound ESL

  goacd-2:
    build:
      context: ./services/goacd
      dockerfile: Dockerfile
    hostname: goacd-2
    restart: unless-stopped
    ports:
      - "19090:9090/tcp"    # Different host port (standby, usually unused)
      - "19091:9091/tcp"
      - "19092:9092/tcp"
      - "19093:9093/tcp"
    environment:
      - GOACD_INSTANCE_ID=goacd-2
      - GOACD_FS_ESL_HOSTS=freeswitch:8021
      - GOACD_FS_ESL_PASSWORD=${FS_ESL_PASSWORD}
      - GOACD_REDIS_URL=redis://redis:6379
      - GOACD_KAFKA_BROKERS=kafka:9092
      - GOACD_PG_URL=postgres://goacd:${GOACD_DB_PASSWORD}@postgres:5432/goacd
      - GOACD_GRPC_PORT=9091
      - GOACD_ESL_LISTEN_PORT=9090
      - GOACD_EXT_RANGE_START=1000
      - GOACD_EXT_RANGE_END=9999
      - GOACD_SIP_DOMAIN=${SIP_DOMAIN:-pbx.tpb.vn}
      - GOACD_KAMAILIO_DB_HOST=mariadb-kam
      - GOACD_KAMAILIO_DB_NAME=kamailio
      - GOACD_LEADER_TTL_MS=10000
      - GOACD_LEADER_RENEW_MS=3000
      - GOACD_CALL_SNAPSHOT_INTERVAL_MS=2000
    depends_on:
      - freeswitch
      - redis
      - kafka
      - postgres
    networks:
      tpb-network:
        aliases:
          - goacd-vip    # Same alias — FS outbound ESL round-robins to whichever is leader

  # ── coturn (TURN server) ───────────────────────────────
  coturn:
    image: coturn/coturn:latest
    container_name: coturn
    restart: unless-stopped
    ports:
      - "3478:3478/udp"    # STUN/TURN UDP
      - "3478:3478/tcp"    # STUN/TURN TCP
      - "5349:5349/tcp"    # TURN TLS
      - "49152-65535:49152-65535/udp"  # TURN relay ports
    environment:
      - TURN_REALM=turn.tpb.vn
      - TURN_SECRET=${TURN_SECRET}
    networks:
      - tpb-network

volumes:
  dsiprouter-data:
  kamailio-config:
  kamailio-db:
  freeswitch-config:
  freeswitch-recordings:
  freeswitch-audio:
```

**Environment Variables:**

```env
# dSIPRouter / Kamailio
SIP_DOMAIN=pbx.tpb.vn
PUBLIC_IP=<server-public-ip>
KAM_DB_ROOT_PASSWORD=<encrypted>

# FreeSWITCH
FS_ESL_PASSWORD=<encrypted>

# GoACD
GOACD_DB_PASSWORD=<encrypted>
GOACD_EXT_RANGE_START=1000
GOACD_EXT_RANGE_END=9999

# coturn
TURN_SECRET=<encrypted>
```

---

## 6.4 Built-in Adapters (V2 Update)

| Adapter | Channel | Sub-Channel | Protocol | Phase |
|---|---|---|---|---|
| ~~`PortSipAdapter`~~ | ~~voice~~ | ~~portsip~~ | ~~PortSIP REST API~~ | ~~Phase 1~~ |
| **`FreeSwitchAdapter`** | **voice** | **freeswitch** | **GoACD gRPC** | **Phase 1** |
| `WebexCcAdapter` | voice | webex_cc | Cisco Webex CC REST API + WebSocket | Phase 3 |
| `GmailAdapter` | email | gmail | Google Gmail API (push + pull) | Phase 1 |
| `MicrosoftAdapter` | email | ms365 | Microsoft Graph API (webhooks) | Phase 1 |
| `ImapAdapter` | email | imap | IMAP + SMTP | Phase 2 |
| `FacebookAdapter` | social | facebook | Facebook Graph API + Webhooks | Phase 2 |
| `ZaloAdapter` | social | zalo | Zalo OA API + Webhooks | Phase 2 |
| `WhatsAppAdapter` | social | whatsapp | WhatsApp Business Cloud API | Phase 3 |
| `LiveChatAdapter` | chat | livechat | Internal WebSocket | Phase 1 |
| `TwilioSmsAdapter` | sms | twilio | Twilio REST API + Webhooks | Phase 3 |
| `LocalSmsAdapter` | sms | local | Local carrier API | Phase 3 |

**Note:** In V2, `FreeSwitchAdapter` in CTI Adapter Service (MS-19) is a thin gRPC client that delegates all voice operations to GoACD. It implements the same `IChannelAdapter` interface (§6.2) but the actual logic is in GoACD.

```typescript
// CTI Adapter Service: FreeSwitchAdapter
class FreeSwitchAdapter implements IChannelAdapter {
  channelType = 'voice';
  subChannel = 'freeswitch';

  constructor(private goacdClient: GoACDServiceClient) {} // gRPC client

  async sendMessage(msg: ChannelMessage): Promise<SendResult> {
    // Voice: "send" = make outbound call
    return this.goacdClient.makeCall({ from: msg.sender, to: msg.recipient });
  }

  async handleIncoming(msg: ChannelMessage): Promise<void> {
    // GoACD pushes events to CTI Adapter via gRPC stream
    // CTI Adapter normalizes and forwards to Omnichannel services
  }

  // Call control delegated to GoACD
  async holdCall(callId: string) { return this.goacdClient.holdCall({ callId }); }
  async transferCall(callId: string, dest: string) { return this.goacdClient.transferCall({ callId, destination: dest }); }
  // ... etc
}
```

---

## 9.1 Voice Channel (V2 Update)

#### 9.1.1 WebRTC (Browser-Based Calling)

**Stack:** SIP.js (client) → Kamailio WSS (SIP proxy) → rtpengine (media relay) → FreeSWITCH (media server)

> **Replaces V1:** PortSIP built-in WebRTC → Kamailio + rtpengine. Same SIP.js client, different server stack.

**Flow:**
```
Browser (SIP.js)
    │
    │ WebSocket Secure (WSS port 5066)
    │ SIP-over-WebSocket signaling
    ▼
Kamailio (dSIPRouter)
    │ SIP proxy + WebSocket module
    │
    ├──── rtpengine (media relay)
    │     SRTP (browser) ↔ RTP (FreeSWITCH)
    │     ICE, DTLS-SRTP, Opus↔G.711
    │
    │ SIP (internal, to FreeSWITCH)
    ▼
FreeSWITCH (Media Server)
    │ Audio processing, recording
    │
    │ ESL
    ▼
GoACD (Call Control)
```

#### 9.1.2 Voice Infrastructure (V2)

| Component | Role | Phase |
|---|---|---|
| **Kamailio (dSIPRouter)** | SIP proxy, WebRTC gateway, SIP trunk management | Phase 1 |
| **rtpengine** | Media relay (SRTP↔RTP, ICE, codec transcoding) | Phase 1 |
| **FreeSWITCH** | Media server (IVR, recording, MOH, conference) | Phase 1 |
| **GoACD** | ACD/Queue server (routing, IVR control, agent state) | Phase 1 |
| **coturn** | TURN server for NAT traversal | Phase 1 |
| Cisco Webex CC | Cloud PBX adapter (via separate `IChannelAdapter`) | Phase 3 |

#### 9.1.3 IVR Integration (V2)

Full media control via GoACD + FreeSWITCH ESL:
- GoACD receives call via outbound ESL
- Executes IVR flow (FlowDefinition from §10.2) by sending ESL commands
- Can: play audio, collect DTMF, call external APIs, set routing tags, play TTS
- Phase 4: real-time ASR via mod_audio_fork → WebSocket → AI Service
- Output: `routingHints` object with skills, priority, queue preferences

---

## 15. Phased Implementation Plan (V2 Update)

### Phase 1 Sprint Changes

#### Sprint 1.1 (Weeks 1-2): Channel Gateway, Plugin Architecture & Infrastructure Setup

| Task | Description | Effort |
|---|---|---|
| 1.1.1 | Scaffold Channel Gateway (MS-20) NestJS service — entities, DTOs, Kafka | 2d |
| 1.1.2 | Implement `IChannelAdapter` interface, `ChannelAdapterRegistry`, adapter lifecycle | 2d |
| 1.1.3 | Implement `ChannelMessage` normalization pipeline | 1d |
| 1.1.4 | Set up Kafka topics, consumer groups, event schemas | 1d |
| 1.1.5 | Scaffold `FreeSwitchAdapter` in CTI Adapter Service (gRPC client to GoACD) | 1d |
| 1.1.6 | Set up Kamailio/dSIPRouter + rtpengine + FreeSWITCH Docker containers | 2d |
| 1.1.7 | Configure Kamailio: SIP routing to FreeSWITCH, WebSocket module, rtpengine integration | 1d |

#### Sprint 1.2 (Weeks 3-4): GoACD Core + Agent Registry

| Task | Description | Effort |
|---|---|---|
| 1.2.1 | Initialize GoACD project (Go module, dependencies, config) | 1d |
| 1.2.2 | Implement ESL connection management (outbound server + inbound client using percipia/eslgo) | 3d |
| 1.2.3 | Implement Agent Registry: extension allocation, Kamailio subscriber provisioning | 2d |
| 1.2.4 | Implement Agent State Machine in Redis (§18.7.4) | 2d |
| 1.2.5 | Implement Kafka consumer: agent.created/updated/deleted → agent sync | 1d |
| 1.2.6 | Implement gRPC server (basic: SetAgentState, GetAgentState, MakeCall, HangupCall) | 1d |

#### Sprint 1.3 (Weeks 5-6): GoACD Queue + Routing + IVR

| Task | Description | Effort |
|---|---|---|
| 1.3.1 | Implement Queue Manager: Redis sorted sets, enqueue/dequeue, SLA timer | 2d |
| 1.3.2 | Implement Routing Engine: §7.2 scoring algorithm, TOP-3 candidates, atomic claim | 2d |
| 1.3.3 | Implement Call Delivery: bridge via ESL, no-answer timer (20s), re-routing (§18.8.3) | 2d |
| 1.3.4 | Implement IVR Engine: flow executor, ESL command builders (playback, play_and_get_digits) | 2d |
| 1.3.5 | Implement Music on Hold: FreeSWITCH local_stream, position announcements | 1d |
| 1.3.6 | Implement CDR generation: call event tracking, Kafka publishing | 1d |

#### Sprint 1.4 (Weeks 7-8): WebRTC + Frontend + Anti-Desync

| Task | Description | Effort |
|---|---|---|
| 1.4.1 | Implement WebRTC credential provisioning (CTI Adapter → GoACD gRPC) | 1d |
| 1.4.2 | Frontend: SIP.js integration with Kamailio WSS — register, make/receive calls | 3d |
| 1.4.3 | Frontend: integrate SIP.js with `CallContext.tsx` + `FloatingCallWidget.tsx` | 2d |
| 1.4.4 | Implement anti-desync: SIP registration tracking (sofia::register/expire), periodic reconciliation (§18.7.3) | 2d |
| 1.4.5 | Implement event pipeline: GoACD → Kafka → CTI Adapter → WebSocket → Agent Desktop | 1d |
| 1.4.6 | Implement call metadata pre-push (customer info before SIP INVITE) | 1d |

### Remaining Sprints

Sprints 2.1-5.2 remain unchanged from V1 except:
- All references to "PortSIP" replaced with "FreeSWITCH/GoACD"
- Phase 3 Cisco Webex CC adapter unchanged (plugs into same `IPbxProvider` interface)
- Phase 3 "FreeSWITCH adapter" from V1 is **removed** (already Phase 1 in V2)

---

## 16. Risk Assessment (V2 Update)

| # | Risk | Probability | Impact | Mitigation |
|---|---|---|---|---|
| R1 | **WebRTC + NAT traversal** — corporate firewalls may block | Medium | High | Deploy coturn TURN server; rtpengine handles SRTP↔RTP; test in corporate environments |
| R2 | **Social API changes** — Facebook/Zalo/WhatsApp APIs change frequently | Medium | Medium | Abstract behind `IChannelAdapter`; version-pin SDKs; adapter hot-reload |
| R3 | **Redis single point of failure** | Medium | Critical | Redis Cluster from day 1; PostgreSQL fallback for agent state recovery |
| R4 | **Kafka operational complexity** | Medium | Medium | Single-broker Docker first; cluster for production |
| R5 | **Email OAuth token refresh** | Medium | High | Robust refresh with retry; alert on failure |
| R6 | **Flow designer state persistence** | Low | Medium | Redis-backed state with PostgreSQL fallback |
| R7 | **Multi-tenant data isolation** | Medium | Critical | Tenant ID on every entity; RLS; Redis key prefix |
| R8 | **WebSocket scaling** — 10k+ connections | Medium | High | Socket.IO Redis adapter; horizontal instances |
| R9 | **Zalo API access** — requires business verification | Medium | Medium | Start verification immediately |
| R10 | **Scope creep** | High | High | Strict phase gates; MVP-first |
| R11 | **GoACD development effort** — 25-35 weeks is significant | High | High | Phase the build (basic→advanced); start with mod_callcenter as scaffolding during development; hire Go developer with telephony experience |
| R12 | **Kamailio + FreeSWITCH operational complexity** — 4 components vs 1 PBX | Medium | Medium | Docker Compose for dev; Ansible/Terraform for production; document all config; dSIPRouter GUI reduces Kamailio config complexity |
| R13 | **rtpengine kernel module** — requires host networking, kernel access | Medium | Medium | Test on target Linux kernel (Debian 12+); fallback to userspace mode if kernel module fails; works on Docker with `--network host` |
| R14 | **ESL reliability** — FreeSWITCH ESL connection may drop | Low | High | Auto-reconnect logic in GoACD; inbound ESL watchdog; FS process monitor; calls in progress survive brief ESL disconnects |
| R15 | **Go team expertise** — team may not have Go developers | Medium | High | GoACD is isolated service — can hire/contract Go developer; NestJS team does not need Go knowledge; GoACD communicates via gRPC (language-agnostic) |
| R16 | **FreeSWITCH ESL undocumented quirks** — edge cases in call handling | Medium | Medium | Extensive integration testing; subscribe to FreeSWITCH mailing list; maintain ESL command reference doc; Phase 1 starts simple (basic queue) |

---

## Appendix C: V1 vs V2 Comparison Matrix

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
| **Real-time ASR/AI** | Not possible (no media access) | mod_audio_fork → WebSocket → AI | **V2** |

**Recommendation:** V2 is the superior long-term architecture. The main cost is development time for GoACD (mitigated by phased approach). For organizations needing faster time-to-market, V1 can serve as Phase 1 stepping stone, migrating to V2 in Phase 2.

---

## Appendix D: Docker Compose (V2)

See §18.15 for full Docker Compose configuration.

**Port mapping summary:**

| Component | Port | Protocol | Purpose |
|---|---|---|---|
| dSIPRouter/Kamailio | 5060 | UDP/TCP | SIP signaling |
| dSIPRouter/Kamailio | 5061 | TCP | SIP TLS |
| dSIPRouter/Kamailio | 5066 | TCP | WebSocket Secure (WSS) for WebRTC |
| dSIPRouter GUI | 8443 | TCP | Management web interface |
| rtpengine | 22222 | UDP | Control protocol (Kamailio → rtpengine) |
| rtpengine | 40000-60000 | UDP | RTP media range |
| FreeSWITCH | 5080 | UDP/TCP | SIP (internal, from Kamailio) |
| FreeSWITCH | 8021 | TCP | ESL (GoACD inbound connection) |
| FreeSWITCH | 16384-32768 | UDP | RTP media range |
| GoACD | 9090 | TCP | Outbound ESL listener (FS → GoACD) |
| GoACD | 9091 | TCP | gRPC server (Omnichannel → GoACD) |
| GoACD | 9092 | TCP | REST API (admin/monitoring) |
| GoACD | 9093 | TCP | Prometheus metrics |
| coturn | 3478 | UDP/TCP | STUN/TURN |
| coturn | 5349 | TCP | TURN TLS |
| coturn | 49152-65535 | UDP | TURN relay ports |

---

> **Document end.** For sections not covered here (§1-5, §7-8, §10-14, §17), refer to V1 document (`OMNICHANNEL-UPGRADE-PLAN.md`).
