<!-- Part of: docs/omnichannel-upgrade/ — See INDEX.md for navigation -->

# 5. New Services & Modules

## 5.1 Channel Gateway Service (NEW — MS-20)

**Purpose:** Single entry point for all inbound/outbound channel messages. Hosts the adapter plugin registry. Normalizes messages to `ChannelMessage` format and forwards to Routing Engine.

**Port:** 3020

**Responsibilities:**
- Register/unregister channel adapters at runtime
- Receive inbound messages from adapters
- Normalize to `ChannelMessage` format
- Forward to Routing Engine via Kafka topic `channel.inbound`
- Receive outbound messages from agents via Kafka topic `channel.outbound`
- Route outbound to correct adapter
- Health check all adapters periodically

**Entities:**
- `ChannelConfig` — adapter configuration per tenant per channel
- `ChannelWebhook` — webhook endpoints for social channels

**Key Endpoints:**
- `POST /channels/inbound` — receive normalized message (internal)
- `POST /channels/outbound` — send message via adapter (internal)
- `GET /admin/channels` — list configured channels
- `POST /admin/channels` — configure new channel adapter
- `PUT /admin/channels/:id` — update channel config
- `DELETE /admin/channels/:id` — remove channel
- `POST /admin/channels/:id/test` — test connectivity

## 5.2 Routing Engine (NEW — MS-21)

**Purpose:** Receives normalized `ChannelMessage` from Channel Gateway, executes routing flows (IVR/email/chat), scores available agents, and assigns interactions.

**Port:** 3021

**Responsibilities:**
- Consume `channel.inbound` Kafka topic
- Execute flow (IVR, email rules, chat bot handoff)
- Query Agent State Manager for available agents
- Score agents based on skills, proficiency, current load, group match
- Assign interaction and publish `interaction.assigned` event
- Manage priority queues when no agent available
- SLA timer enforcement
- Queue overflow / failover logic

**Entities:**
- `RoutingRule` — routing rules (conditions → actions)
- `RoutingQueue` — queue definitions (name, priority, SLA, overflow)
- `QueueEntry` — current items in queue (interaction_id, priority, enqueue_time)

## 5.3 Flow Designer Engine (Backend — in Routing Engine)

**Purpose:** Execute IVR/Email/Chat flow graphs designed in Admin UI.

Detailed design covered in the Flow Designer Engine section of the full upgrade plan.

## 5.4 Live Chat Widget Service (NEW — embedded in Channel Gateway)

**Purpose:** Serve the embeddable live chat widget JS bundle and handle WebSocket connections from website visitors.

**Implementation:** React + Vite library mode → single `tpb-chat-widget.js` file.

---

## Related Files

- [01-current-state-analysis.md](./01-current-state-analysis.md) — Current services these new services complement
- [02-gap-analysis.md](./02-gap-analysis.md) — Critical gaps these services address
- [03-requirements.md](./03-requirements.md) — Requirements R1, R7, R8 fulfilled by these services
- [04-target-architecture.md](./04-target-architecture.md) — Where these services fit in the overall architecture
