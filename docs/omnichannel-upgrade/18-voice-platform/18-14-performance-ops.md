<!-- Part of: docs/omnichannel-upgrade/18-voice-platform/ — See README.md for navigation -->

# 18.14 Performance, Resource Management & Operational Hardening (V2.1)

> **V2.1 Addition:** This section addresses resource management, memory leak prevention, connection pool sizing, DTMF handling, metadata correlation, multi-tab protection, and system tuning for high-load production.

## 18.14.1 GoACD Resource Management & Goroutine Leak Prevention

**Problem:** GoACD spawns 1 goroutine per call. Without proper lifecycle management, goroutines can leak on ESL connection drops, hung bridge commands, or missed CHANNEL_HANGUP events. At 5,000 concurrent calls, leaked goroutines accumulate and cause OOM.

### Call Session Lifecycle (mandatory)

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

### Session Reaper (catches leaked sessions)

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

### Prometheus Metrics (mandatory for production)

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

### Alert Rules (Prometheus/Grafana)

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

## 18.14.2 TCP Backlog & Connection Limits

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

## 18.14.3 Redis Connection Pool Sizing

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

## 18.14.4 FreeSWITCH Resource Requirements

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

## 18.14.5 DTMF Handling — rtpengine Passthrough & Buffer Flush

**Problem 1:** rtpengine may strip RFC 2833 telephone-event packets during transcoding if not configured correctly. This silently breaks IVR DTMF collection.

**Problem 2:** If caller presses DTMF before the prompt finishes playing, digits may be in the buffer and collected out-of-order.

### Fix — rtpengine configuration (Kamailio script)

```
# Kamailio routing script: preserve telephone-event through rtpengine
rtpengine_manage("trust-address replace-origin replace-session-connection ICE=force DTLS=passive codec-accept-PCMU codec-accept-PCMA codec-accept-telephone-event");
```

### Fix — FreeSWITCH DTMF configuration

```xml
<!-- /etc/freeswitch/autoload_configs/switch.conf.xml -->
<param name="rtp-digit-delay" value="40"/>

<!-- /etc/freeswitch/sip_profiles/internal.xml -->
<param name="dtmf-type" value="rfc2833"/>
<param name="liberal-dtmf" value="true"/>
<param name="rfc2833-pt" value="101"/>
```

### Fix — GoACD: flush DTMF buffer before collection

```go
// Before every play_and_get_digits, flush any buffered DTMF
session.SendESL("flush_dtmf", "", false)
session.SendESL("play_and_get_digits",
    fmt.Sprintf("%d %d 1 %d # %s %s %s",
        node.MinDigits, node.MaxDigits, node.Timeout,
        node.PromptAudio, node.InvalidAudio, node.VariableName), false)
```

## 18.14.6 Metadata Correlation — SIP Call-ID ↔ WebSocket callId

**Problem:** GoACD pre-pushes call metadata via gRPC/WS ~100ms before SIP INVITE arrives at Agent Desktop. Agent Desktop receives both:
1. WebSocket: `{ event: "call.incoming", callId: "goacd-uuid-123", ... }`
2. SIP.js: incoming INVITE with `Call-ID: fs-uuid-456@freeswitch`

These are different IDs. Without correlation, the UI cannot match the rich metadata to the SIP session.

### Fix — Custom SIP header injection

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

## 18.14.7 Multi-Tab SIP Registration Protection

**Problem:** Agent opens 2 browser tabs → 2 SIP.js instances attempt REGISTER → Kamailio accepts both (default `max_contacts=0` = unlimited) → calls may be delivered to either tab randomly.

### Fix — Client-side (BroadcastChannel API)

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

### Fix — Server-side (Kamailio: enforce single registration)

```
# Kamailio config: limit to 1 contact per AOR (Address of Record)
modparam("registrar", "max_contacts", 1)

# When a second REGISTER arrives for the same AOR:
# → Kamailio replaces the old contact with the new one
# → Old tab's SIP.js will receive a re-REGISTER failure → triggers re-register
# → If both tabs keep fighting, the BroadcastChannel client-side fix prevents this
```

## 18.14.8 Customer Lookup Response Cache

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

## 18.14.9 Candidate List Sizing & Parallel Ring

**Problem:** With Top-3 candidates and 20s ring timeout per agent, worst case is 3 × 20s = 60s before all candidates exhausted and call re-queued. Caller experiences 60s additional wait.

### Fix — Increase candidates + parallel ring for top-2

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

### Parallel ring via FreeSWITCH

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

**Impact:** Worst-case wait reduced from 60s (3x20s sequential) to **30s** (5 candidates, 2 parallel, 15s timeout: ceil(5/2) x 15s = 45s theoretical, but typically 1-2 rounds = 15-30s).

---

## Related Files

- [18-13-error-resilience.md](./18-13-error-resilience.md) — Error Handling & Resilience
- [18-15-docker-infra.md](./18-15-docker-infra.md) — Docker Infrastructure
