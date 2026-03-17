<!-- Part of: docs/omnichannel-upgrade/18-voice-platform/ — See README.md for navigation -->

# 18.13 Error Handling & Resilience

## 18.13.1 GoACD High Availability — Leader Election + In-Flight Call Recovery

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

### Leader Election via Redis Distributed Lock

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

### In-Flight Call Registry (Redis)

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

### In-Flight Call Recovery (new leader startup)

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

### Failover Timeline

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

### Standby Warm-up

GoACD-2 (standby) is not idle — it performs:
- Consumes Kafka events (agent.created, queue.updated, etc.) to keep local cache warm
- Maintains Redis connection pool (pre-warmed)
- Subscribes to `goacd:active_calls` key via Redis keyspace notifications (knows call state)
- Does NOT connect to FreeSWITCH ESL (only leader connects, to avoid command conflicts)

### GoACD Resilience Strategy (V2.1 — updated)

| Failure | Recovery | Audio Disruption | Data Loss |
|---|---|---|---|
| GoACD leader crash | Standby acquires lock in ≤10s. In-flight calls recovered from Redis snapshots. Active bridged calls: 0s audio disruption. IVR calls: routed to fallback queue. | 0s (active), ~10s (IVR/queue) | None (Redis + snapshot) |
| FreeSWITCH crash | Kamailio dispatcher detects (SIP OPTIONS, 5s interval), removes from pool. Active calls on that FS: lost. GoACD: ESL connection drop → mark calls 'interrupted' → notify agents. New calls: route to surviving FS. | Yes (FS calls) | CDR preserved (GoACD snapshot) |
| Kamailio crash | keepalived VIP failover to backup Kamailio (< 3s). Stateless — no state loss. SIP.js auto-reconnects. | ~3s (re-register) | None |
| rtpengine crash | Media stops. Restart rtpengine (< 5s). Run 2 instances with Kamailio dispatching to both. | < 5s | None |
| Redis crash | GoACD cannot route new calls. Active calls unaffected (FS bridges + GoACD in-memory). Redis Cluster auto-failover (< 15s). GoACD reconnects. | 0s | Agent state rebuilt from PostgreSQL backup on recovery |
| Network partition (GoACD ↔ Redis) | Leader loses lock renewal → steps down. Standby (if different partition) acquires lock. Split-brain protection: leader with stale lock stops accepting new calls after 2 missed renewals (6s). | 0s (active), ~10s (new calls) | None (Redis authoritative) |

## 18.13.2 Circuit Breakers

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

## 18.13.3 Degraded Mode

When GoACD cannot reach external services:

| Service Down | Impact | Degraded Behavior |
|---|---|---|
| Customer Service | Cannot identify caller | IVR plays generic greeting, route to general queue |
| BFSI Service | Cannot check account status | Skip BFSI IVR nodes, route based on DTMF only |
| Kafka | Cannot publish events | Buffer events in local queue, replay when Kafka recovers |
| Agent Service (Omnichannel) | Cannot sync agent changes | Use cached agent data, reconcile when service recovers |
| Interaction Service | Cannot create interaction record | GoACD creates record locally, sync when service recovers |

---

## Related Files

- [18-14-performance-ops.md](./18-14-performance-ops.md) — Performance, Resource Management & Operational Hardening
- [18-15-docker-infra.md](./18-15-docker-infra.md) — Docker Infrastructure
