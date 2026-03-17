<!-- Part of: docs/omnichannel-upgrade/18-voice-platform/ — See README.md for navigation -->

# 18.9 Sync Architecture

## 18.9.1 Centralized Agent, Extension & Phone Management

> **V2.2 Update:** This section replaces the original brief §18.9.1 with a comprehensive design covering the full agent lifecycle, extension allocation, SIP credential management, authentication flow, database architecture, multi-instance synchronization, and performance analysis.

### 18.9.1.1 Architecture Overview — Who Manages What

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

### 18.9.1.2 Extension Allocation Algorithm

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

### 18.9.1.3 SIP Credential Generation & Security (Ephemeral Token — V2.2)

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

### 18.9.1.4 End-to-End Agent Registration Flow

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
│          wsUri: "wss://nextgen.omicx.vn:5066",                                │
│          sipUri: "sip:1007@nextgen.omicx.vn",                                 │
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
│      REGISTER sip:nextgen.omicx.vn SIP/2.0                                    │
│      From: <sip:1710500300:1007@nextgen.omicx.vn>   // ephemeral username     │
│      To: <sip:1710500300:1007@nextgen.omicx.vn>                               │
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
│      → route[AUTH]: detect WSS → use autheph_check("nextgen.omicx.vn")        │
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

### 18.9.1.5 Cross-Database Transaction Safety (V2.2 — Simplified)

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

### 18.9.1.6 Database Architecture & Synchronization

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

### 18.9.1.7 Performance Analysis

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

### 18.9.1.8 Agent Suspension & Extension Management

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

### 18.9.1.9 Multi-Tenant Extension Ranges

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

## 18.9.2 Queue Sync (Omnichannel Routing Engine → GoACD)

GoACD manages voice queues independently. Omnichannel Routing Engine (MS-21) manages email/chat/social queues.

```
Queue Created/Updated (Kafka: queue.voice.updated)
    → GoACD: create/update queue in Redis
    → Queue config: skills, SLA, MOH, overflow rules

Queue Agent Assignment (Kafka: queue.agent.assigned)
    → GoACD: add agent to queue's skill matching set
```

## 18.9.3 CDR Sync (GoACD → Omnichannel)

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

## 18.9.4 Recording Sync (FreeSWITCH → SeaweedFS) — V2.1 Resilient Design

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

## Related Files

- [18-7-agent-state.md](../18-voice-platform/18-7-agent-state.md) — Agent State Management & Anti-Desync (agent states that sync architecture maintains)
- [18-8-routing-failure.md](./18-8-routing-failure.md) — Call Routing Engine & Failure Handling (depends on synced agent/queue state)
- [18-10-webrtc.md](./18-10-webrtc.md) — WebRTC Integration (SIP.js credential provisioning flow)
- [18-11-event-pipeline.md](./18-11-event-pipeline.md) — Real-time Event Pipeline (Kafka events published by sync processes)
- [18-12-data-mapping.md](./18-12-data-mapping.md) — Data Mapping Tables (agent_extensions, queues, CDR schemas)
