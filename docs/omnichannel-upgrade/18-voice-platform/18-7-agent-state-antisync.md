<!-- Part of: docs/omnichannel-upgrade/18-voice-platform/ — See README.md for navigation -->

# 18.7 Agent State Management & Anti-Desync

## 18.7.1 Single Source of Truth: GoACD

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

### Dual-path Implementation

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

### What Still Uses Kafka (unchanged)

- `agent.created` / `agent.updated` / `agent.deleted` — CRUD events, not time-critical
- `queue.voice.updated` / `queue.agent.assigned` — queue config changes
- `call.*` events — CDR, audit, dashboard
- `recording.synced` — async background

### What Now Uses gRPC Direct (changed from Kafka)

- `SetAgentVoiceStatus` — Ready/NotReady for voice channel
- Future: `SetAgentChannelStatus` — for all channels (chat, email)

### Agent Desktop Optimistic UI Pattern

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

### Desync Sources Eliminated

Desync sources that DISAPPEAR in V2:
- ~~PortSIP agent status vs Redis status~~ → GoACD is the only writer
- ~~PortSIP API timeout khi set agent Ready~~ → No API call — GoACD writes Redis directly
- ~~Race condition: PortSIP routes while Omnichannel updates~~ → GoACD does both

Desync sources that DISAPPEAR in V2.1:
- ~~Kafka lag between agent "Ready" click and GoACD awareness~~ → gRPC direct (< 10ms)
- ~~Agent clicks "Not Ready" but Kafka delays → call routed anyway~~ → gRPC synchronous confirmation
- ~~UI shows "Ready" but server doesn't know yet~~ → gRPC response confirms or rejects

## 18.7.2 Remaining Desync Sources (V2)

| Tình huống | Hậu quả | Xác suất | Mitigation |
|---|---|---|---|
| Browser crash (SIP.js không deregister) | GoACD thinks agent still registered | Cao | SIP re-REGISTER 30s + SIP OPTIONS probe 10s + WS heartbeat cross-check (see §18.7.3 Layer 1b) |
| Network timeout agent side | WS mất, SIP registration may linger | Trung bình | WS heartbeat 15s + SIP OPTIONS probe triggers within 10s of WS disconnect |
| GoACD crash/restart | Agent states in Redis survive, but in-flight calls lost | Thấp | Redis persistence + in-flight call recovery on restart (see §18.13.1) |
| FreeSWITCH crash | Active calls dropped | Rất thấp | FS pool behind Kamailio dispatcher, auto-failover |
| Redis crash | All agent state lost | Rất thấp | Redis Cluster + PostgreSQL backup |

## 18.7.3 Multi-layer Detection (V2.1 — Tightened Windows)

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

### Effective Detection Windows (worst case)

| Failure Scenario | V2.0 Window | V2.1 Window | Mechanism |
|---|---|---|---|
| Browser crash (tab closed gracefully) | 0s | 0s | SIP.js sends REGISTER with expires=0 (deregister) |
| Browser crash (killed/OOM) | 60s | 30s | SIP re-REGISTER timeout (passive) |
| Browser crash + call being routed | 60s | **~5s** | Pre-routing SIP OPTIONS probe (Layer 1b) |
| Network loss (gradual) | 90s | **~50s** | WS heartbeat (45s) + SIP OPTIONS probe (5s) |
| Network loss (sudden) | 60s | 30s | SIP re-REGISTER timeout |
| Agent process hang (browser freeze) | 60s | **~50s** | WS heartbeat fails (SIP.js may still re-REGISTER if on separate thread) → SIP OPTIONS probe |

## 18.7.4 Agent State Machine

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

## 18.7.5 Atomic State Operations — Redis Lua Scripts (Fully Atomic)

> **V2.1 Update:** Replaced optimistic Go-side MULTI/EXEC with a single Redis Lua script. The original design had a TOCTOU race: two goroutines could read the same `voice_count`, both pass the `< maxCount` check, and both increment — resulting in over-assignment. A Lua script executes atomically inside Redis (single-threaded), eliminating this race entirely. This is **mandatory** for horizontal GoACD scaling (§18.13.1) where multiple GoACD instances write to the same Redis.

### agent_claim.lua — Claim Agent for Call

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

### Go Wrapper — ValidateAndClaim / ReleaseClaim

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

### agent_release.lua — Release Agent Claim

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

### Stale Claim Protection — StaleClaimReaper

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

## Related Files

- [18-6-ivr-architecture.md](./18-6-ivr-architecture.md) — IVR Architecture (Full Media Control via ESL)
- [README.md](./README.md) — Section 18 navigation and overview
