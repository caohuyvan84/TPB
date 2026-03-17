<!-- Part of: docs/omnichannel-upgrade/ — See INDEX.md for navigation -->

# 7. Routing Engine Design

## 7.1 Routing Flow

```
ChannelMessage arrives
        |
        v
+-----------------+
| 1. Customer     | -> Lookup customer by sender.externalId
|    Identification|   Set metadata.customerId, isVip, priority
+--------+--------+
         |
         v
+-----------------+
| 2. Flow Engine  | -> Execute IVR/Email/Chat flow graph
|    Execution    |   May: set tags, change priority, route to bot,
|                 |   play prompts, collect input, etc.
+--------+--------+
         | (flow output: routingHints)
         v
+-----------------+
| 3. Queue        | -> Find matching queue based on routingHints
|    Selection    |   (channel + skills + priority + tenant)
+--------+--------+
         |
         v
+-----------------+
| 4. Agent        | -> Query Redis for available agents in queue's skill groups
|    Scoring      |   Score = f(skill_proficiency, load_ratio, wait_time, affinity)
|                 |   If agent found -> assign
|                 |   If no agent -> enqueue with SLA timer
+--------+--------+
         |
         v
+-----------------+
| 5. Interaction  | -> Create Interaction record in MS-3
|    Creation     |   Publish interaction.created to Kafka
|                 |   Notify agent via WebSocket
+-----------------+
```

## 7.2 Agent Scoring Algorithm

```
Score(agent, interaction) = Sum(weights x factors)

Factors:
  1. skill_match      = max_proficiency_for_required_skills / 10       [0.0 - 1.0]
  2. load_ratio       = 1 - (current_interactions / max_capacity)      [0.0 - 1.0]
  3. idle_time        = min(seconds_since_last_interaction / 300, 1.0) [0.0 - 1.0]
  4. group_match      = 1.0 if agent in preferred group, 0.5 otherwise [0.5 - 1.0]
  5. customer_affinity = 1.0 if agent served this customer before       [0.0 - 1.0]

Default Weights:
  skill_match:       0.30
  load_ratio:        0.25
  idle_time:         0.20
  group_match:       0.15
  customer_affinity: 0.10

Total Score = 0.30*skill + 0.25*load + 0.20*idle + 0.15*group + 0.10*affinity
```

Weights are configurable per tenant via Admin UI.

## 7.3 Queue Management

```typescript
interface RoutingQueue {
  id: string;
  tenantId: string;
  name: string;                    // e.g., "VIP Voice", "General Email"
  channelTypes: ChannelType[];     // which channels feed into this queue
  requiredSkills: string[];        // skills needed to serve this queue
  priority: number;                // queue priority (higher = served first)
  slaThresholdSeconds: number;     // SLA target for first response
  overflowQueueId?: string;        // fallback queue on timeout
  overflowAfterSeconds: number;    // when to overflow
  maxQueueSize: number;            // max items before rejecting
  businessHours?: BusinessHours;   // operating hours
}
```

**Queue Data Structure (Redis):**
```
SORTED SET: queue:{queueId}:entries
  Score = priority * 1000000 + (MAX_TIMESTAMP - enqueueTimestamp)
  Member = interactionId

HASH: queue:{queueId}:meta
  Fields: size, oldest_entry, avg_wait_time
```

## 7.4 SLA Enforcement

```
Every 5 seconds (configurable):
  1. Scan all queue entries
  2. For entries approaching SLA threshold (80%):
     -> Publish sla.warning event
     -> Notify supervisor via WebSocket
  3. For entries exceeding SLA threshold:
     -> Set slaBreached = true on Interaction
     -> Publish sla.breached event
     -> Attempt overflow queue
     -> Notify supervisor
```

---

## Related Files

- [06-channel-adapter-architecture.md](./06-channel-adapter-architecture.md) -- Channel Adapter Architecture (produces ChannelMessage consumed by routing)
- [08-agent-state-management.md](./08-agent-state-management.md) -- Agent State Management (Redis structures queried during agent scoring)
