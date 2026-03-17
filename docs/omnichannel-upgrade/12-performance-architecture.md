<!-- Part of: docs/omnichannel-upgrade/ — See INDEX.md for navigation -->

# Performance Architecture

> **Source:** V1 Section 12

---

## 12.1 Hot / Warm / Cold Path Separation

| Path | Latency Target | Technology | Data |
|---|---|---|---|
| **Hot** | < 10ms | Redis | Agent state, available agents sets, queue entries, routing decisions |
| **Warm** | < 100ms | PostgreSQL (indexed) | Interaction records, agent profiles, routing rules, flow definitions |
| **Cold** | < 1s | Elasticsearch / SeaweedFS | Full-text search, call recordings, email archives, analytics |

## 12.2 Throughput Targets

| Channel | Target | Architecture |
|---|---|---|
| **Text messages** (chat/social/SMS) | 5,000 msg/sec | Channel Gateway -> Kafka -> Routing Engine (horizontally scaled) |
| **Email** | 500 emails/min | Gmail/Graph API with webhook push, BullMQ for IMAP polling |
| **Voice (concurrent calls)** | 2,000 | mediasoup SFU (can handle 2k+ streams per instance), horizontal scaling |
| **WebSocket connections** | 10,000 agents | Socket.IO with Redis adapter for multi-instance |
| **Routing decisions** | 5,000/sec | Redis-based scoring, all agent state in Redis |

## 12.3 Scaling Strategy

```
                    Load Balancer (Kong)
                         │
           ┌─────────────┼─────────────┐
           │             │             │
     ┌─────▼─────┐ ┌────▼─────┐ ┌────▼─────┐
     │ Gateway-1 │ │ Gateway-2│ │ Gateway-3│  ← Horizontal: 1 per 2000 WS connections
     └─────┬─────┘ └────┬─────┘ └────┬─────┘
           │             │             │
           └─────────────┼─────────────┘
                         │ Kafka
           ┌─────────────┼─────────────┐
     ┌─────▼─────┐ ┌────▼─────┐ ┌────▼─────┐
     │ Router-1  │ │ Router-2 │ │ Router-3 │  ← Horizontal: Kafka consumer group
     └───────────┘ └──────────┘ └──────────┘
                         │
                    Redis Cluster
                    (3 masters + 3 replicas)
```

## 12.4 WebSocket Consolidation

**Before:** 3 separate Socket.IO connections per agent:
1. `wsClient` -> `localhost:8000` (Kong gateway)
2. `ctiChannel` -> `localhost:3019` (CTI service)
3. `notificationChannel` -> `localhost:3006` (Notification service)

**After:** Single Socket.IO connection with 5 namespaces:
```
ws://gateway:8000/
  ├── /agent        → agent status, presence
  ├── /interactions → queue updates, SLA events
  ├── /cti          → call events, WebRTC signaling
  ├── /notifications→ push notifications
  └── /chat         → real-time chat messages
```

**Implementation:** Socket.IO Redis adapter (`@socket.io/redis-adapter`) for multi-instance broadcasting.

---

## Related Files

- [voice-platform/performance-hardening.md](./voice-platform/performance-hardening.md) -- Detailed voice-specific performance tuning (goroutines, DTMF, caching)
- [08-agent-state-management.md](./08-agent-state-management.md) -- Redis data structures used in the hot path
- [07-routing-engine.md](./07-routing-engine.md) -- Routing engine throughput that depends on this architecture
- [14-frontend-changes.md](./14-frontend-changes.md) -- WebSocket consolidation client-side implementation
- [voice-platform/docker-infrastructure.md](./voice-platform/docker-infrastructure.md) -- Docker Compose for scaling voice stack
