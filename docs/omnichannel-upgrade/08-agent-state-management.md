<!-- Part of: docs/omnichannel-upgrade/ — See INDEX.md for navigation -->

# 8. Agent State Management

## 8.1 Redis Data Structures

**Agent State (Hot Path):**
```
HASH agent:state:{agentId}
  Fields:
    status              = "ready" | "not-ready" | "on-interaction" | "after-call-work" | "offline"
    voice_status        = "ready" | "not-ready" | "on-call" | "ringing" | "acw"
    email_status        = "ready" | "not-ready" | "composing"
    chat_status         = "ready" | "not-ready" | "chatting"
    social_status       = "ready" | "not-ready" | "responding"
    sms_status          = "ready" | "not-ready" | "responding"
    voice_count         = 0       (current voice interactions)
    email_count         = 2       (current email interactions)
    chat_count          = 1       (current chat interactions)
    social_count        = 0
    sms_count           = 0
    max_voice           = 1
    max_email           = 5
    max_chat            = 3
    max_social          = 3
    max_sms             = 5
    last_interaction_at = "2026-03-15T10:30:00Z"
    login_at            = "2026-03-15T08:00:00Z"
    heartbeat_at        = "2026-03-15T10:31:00Z"

TTL: 86400 (24h, refreshed on heartbeat)
```

**Agent Skills Index (for routing queries):**
```
SORTED SET agent:skills:{skillName}
  Score = proficiency (1-10)
  Member = agentId

Example:
  agent:skills:mortgage -> { "agent-001": 8, "agent-002": 5, "agent-003": 9 }
  agent:skills:credit-card -> { "agent-001": 7, "agent-004": 10 }
```

**Agent Group Membership:**
```
SET agent:group:{groupId}:members
  Members: agentId1, agentId2, ...

SET agent:{agentId}:groups
  Members: groupId1, groupId2, ...
```

**Available Agents by Channel (for fast routing):**
```
SET agent:available:{channelType}
  Members: agentId1, agentId2, ...

  Updated when agent status changes:
    - ready -> SADD
    - not-ready/offline -> SREM
    - capacity exceeded -> SREM
```

## 8.2 State Sync Protocol

```
1. Agent logs in:
   -> Create Redis state hash
   -> Add to available sets for configured channels
   -> Publish agent.login event to Kafka
   -> Persist session to PostgreSQL (async)

2. Agent changes channel status:
   -> Update Redis hash field (e.g., voice_status = 'ready')
   -> Update available set (SADD/SREM)
   -> Broadcast via WebSocket to supervisor dashboard
   -> Persist to PostgreSQL (async, batched every 10s)

3. Interaction assigned:
   -> Increment channel count (HINCRBY)
   -> If count >= max -> SREM from available set
   -> Update overall status if needed

4. Interaction completed:
   -> Decrement channel count
   -> If count < max -> SADD to available set
   -> Update last_interaction_at

5. Heartbeat (every 30s):
   -> Update heartbeat_at
   -> Refresh TTL on state hash
   -> If heartbeat missed for 90s -> mark disconnected, remove from available sets

6. Agent disconnects (WS close):
   -> Set status = disconnected
   -> Remove from all available sets
   -> Keep state hash for reconnection (grace period: 60s)
   -> After grace period -> set offline, persist final state
```

## 8.3 Capacity Model

```typescript
interface AgentCapacity {
  voice: { current: number; max: number; available: boolean };
  email: { current: number; max: number; available: boolean };
  chat: { current: number; max: number; available: boolean };
  social: { current: number; max: number; available: boolean };
  sms: { current: number; max: number; available: boolean };

  /** Overall availability — true if ANY channel has capacity and is ready */
  isAvailable: boolean;

  /** Utilization = total_current / total_max across all channels */
  utilization: number;
}
```

---

## Related Files

- [06-channel-adapter-architecture.md](./06-channel-adapter-architecture.md) -- Channel Adapter Architecture (adapters trigger state changes on interaction events)
- [07-routing-engine.md](./07-routing-engine.md) -- Routing Engine Design (queries agent state and skills during agent scoring)
