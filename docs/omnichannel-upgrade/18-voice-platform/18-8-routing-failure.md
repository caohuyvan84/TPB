<!-- Part of: docs/omnichannel-upgrade/18-voice-platform/ — See README.md for navigation -->

# 18.8 Call Routing Engine & Failure Handling

## 18.8.1 Routing Flow (Integrated into GoACD)

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

## 18.8.2 Pre-computed Candidate List (Top-N)

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

## 18.8.3 No-Answer & Fail Re-routing

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

## 18.8.4 Queue Overflow & Last Resort

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

## 18.8.5 Agent Disconnect During Active Call

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

## Related Files

- [18-7-agent-state.md](../18-voice-platform/18-7-agent-state.md) — Agent State Management & Anti-Desync (state transitions that feed routing)
- [18-9-sync-architecture.md](./18-9-sync-architecture.md) — Sync Architecture (queue sync, CDR sync)
- [18-10-webrtc.md](./18-10-webrtc.md) — WebRTC Integration (SIP.js call delivery)
- [18-11-event-pipeline.md](./18-11-event-pipeline.md) — Real-time Event Pipeline (call events published by routing engine)
- [18-12-data-mapping.md](./18-12-data-mapping.md) — Data Mapping Tables (queue schema, CDR schema)
