<!-- Part of: docs/omnichannel-upgrade/18-voice-platform/ — See README.md for navigation -->

# 18.2A Detailed Configuration — dSIPRouter / Kamailio

---

## 18.2A.1 Kamailio Routing Script (kamailio.cfg)

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

---

## 18.2A.2 Kamailio TLS Configuration

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

---

## 18.2A.3 Kamailio Dispatcher Configuration (FreeSWITCH Pool)

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

---

## 18.2A.4 Kamailio HA — keepalived (Active-Passive VIP)

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

---

## 18.2A.5 dSIPRouter Initial Setup

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

## Related Files

- [18-voice-platform/README.md](./README.md) — Section 18 overview and navigation
- [OMNICHANNEL-UPGRADE-PLAN-V2.md](../../../OMNICHANNEL-UPGRADE-PLAN-V2.md) — Full upgrade plan (source document)
- Section 18.2B — rtpengine detailed configuration
- Section 18.9 — GoACD ephemeral token integration (referenced by auth_ephemeral)
- Section 18.14.7 — Single registration per AOR policy (referenced by registrar max_contacts)
