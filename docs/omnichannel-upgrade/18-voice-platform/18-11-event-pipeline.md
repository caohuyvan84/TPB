<!-- Part of: docs/omnichannel-upgrade/18-voice-platform/ — See README.md for navigation -->

# 18.11 Real-time Event Pipeline

## Event Flow Architecture

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

## Kafka Topics — Event Types

| Topic | Payload | Consumers |
|---|---|---|
| `call.started` | `{ callId, caller, calledDID, timestamp }` | Interaction Service, Audit Service |
| `call.ivr.complete` | `{ callId, selections, routingHints }` | Interaction Service |
| `call.queued` | `{ callId, queueId, position, estimatedWait }` | Dashboard Service, Interaction Service |
| `call.routing` | `{ callId, agentId, attempt }` | Audit Service |
| `call.ringing` | `{ callId, agentId, agentExt }` | CTI Adapter (→ WebSocket → Agent Desktop) |
| `call.answered` | `{ callId, agentId, waitTime }` | Interaction Service, Dashboard Service |
| `call.hold` | `{ callId, agentId }` | Interaction Service |
| `call.unhold` | `{ callId, agentId }` | Interaction Service |
| `call.transfer` | `{ callId, fromAgent, toAgent, type }` | Interaction Service, Audit Service |
| `call.transfer_cancelled` | `{ callId, agent, cancelled_target }` | Interaction Service (V2.2) |
| `call.transfer_failed` | `{ callId, reason }` | Interaction Service (V2.2) |
| `call.requeued` | `{ callId, queueId, reason, priority }` | Dashboard Service (V2.2) |
| `call.outbound.answered` | `{ callId, agentId, destination }` | Interaction Service (V2.2) |
| `call.outbound.failed` | `{ callId, agentId, cause }` | Interaction Service (V2.2) |
| `call.internal.started` | `{ callId, caller, callee }` | Audit Service (V2.2) |
| `call.internal.ended` | `{ callId, duration }` | Audit Service (V2.2) |
| `call.ended` | `{ callId, duration, hangupCause }` | Interaction Service, Dashboard Service, Audit Service |
| `call.cdr` | `{ full CDR record }` | Interaction Service, Audit Service |
| `call.recording` | `{ callId, recordingPath, duration }` | Media Service, Interaction Service |
| `agent.state` | `{ agentId, channel, oldState, newState }` | Dashboard Service, Interaction Service |
| `queue.stats` | `{ queueId, size, avgWait, agents }` | Dashboard Service |

## Redis Pub/Sub Channels

| Channel | Purpose | Subscribers |
|---|---|---|
| `channel:agent:{agentId}` | Agent-specific events (incoming call, state change) | CTI Adapter (per-agent WebSocket) |
| `channel:queue:{queueId}` | Queue events (new entry, agent assigned) | Dashboard Service, Supervisor UI |
| `channel:supervisor` | Supervisor events (SLA breach, overflow) | Supervisor WebSocket connections |

## WebSocket Delivery — Pre-push Call Metadata

Agent Desktop receives call metadata via WebSocket **before** the SIP INVITE arrives. This gives the UI time to display caller info before the phone rings.

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

## Delivery Guarantees

| Transport | Latency | Guarantee | Use Case |
|---|---|---|---|
| **Kafka** | ~10-50ms | At-least-once, persistent | Audit trail, CDR, cross-service sync |
| **Redis Pub/Sub** | ~1-5ms | Best-effort, no persistence | Real-time UI updates, agent events |
| **gRPC Stream** | ~2-10ms | Reliable within connection | GoACD → CTI Adapter event streaming |
| **WebSocket** | ~5-20ms (client) | Best-effort, reconnect on drop | CTI Adapter → Agent Desktop |

---

## Related Files

- [18-8-routing-failure.md](./18-8-routing-failure.md) — Call Routing Engine (generates routing/queue/delivery events)
- [18-9-sync-architecture.md](./18-9-sync-architecture.md) — Sync Architecture (CDR sync, recording sync events)
- [18-10-webrtc.md](./18-10-webrtc.md) — WebRTC Integration (SIP INVITE arrives after WebSocket pre-push)
- [18-12-data-mapping.md](./18-12-data-mapping.md) — Data Mapping Tables (CDR schema, agent state mappings)
