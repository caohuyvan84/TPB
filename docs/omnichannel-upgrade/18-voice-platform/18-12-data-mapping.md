<!-- Part of: docs/omnichannel-upgrade/18-voice-platform/ — See README.md for navigation -->

# 18.12 Data Mapping Tables

## Agent ↔ Extension Mapping (PostgreSQL: goacd.agent_extensions)

| Column | Type | Description |
|---|---|---|
| `id` | UUID | Primary key |
| `agent_id` | UUID | FK → Agent Service |
| `extension_number` | VARCHAR(10) | SIP extension (e.g., "1007") |
| `status` | ENUM | 'active', 'suspended', 'pending' |
| `created_at` | TIMESTAMP | |
| `last_registered_at` | TIMESTAMP | Last SIP REGISTER timestamp |

<!-- V2.2: Removed sip_password and kamailio_subscriber_id columns.
     Agent auth uses ephemeral HMAC tokens (§18.9.1.3) — no stored password needed. -->

## Queue Mapping (PostgreSQL: goacd.queues)

| Column | Type | Description |
|---|---|---|
| `id` | UUID | Primary key |
| `omni_queue_id` | UUID | FK → Omnichannel Routing Engine queue |
| `name` | VARCHAR(100) | Queue name |
| `routing_strategy` | ENUM | 'skill_based', 'round_robin', 'longest_idle', 'ring_all' |
| `required_skills` | JSONB | Required skills for this queue |
| `priority` | INTEGER | Queue priority |
| `sla_seconds` | INTEGER | SLA threshold |
| `moh_stream` | VARCHAR(100) | FreeSWITCH local_stream name |
| `overflow_queue_id` | UUID | Fallback queue |
| `max_queue_size` | INTEGER | Max entries |
| `ring_timeout` | INTEGER | Per-agent ring timeout (default 20s) |

## CDR Records (PostgreSQL: goacd.cdrs)

| Column | Type | Description |
|---|---|---|
| `id` | UUID | Primary key |
| `call_id` | VARCHAR(100) | FreeSWITCH call UUID |
| `interaction_id` | UUID | FK → Interaction Service |
| `caller` | VARCHAR(20) | Caller number |
| `callee` | VARCHAR(20) | Called number / DID |
| `agent_id` | UUID | Assigned agent |
| `agent_extension` | VARCHAR(10) | Agent extension |
| `queue_id` | UUID | Queue used |
| `start_time` | TIMESTAMP | Call start |
| `answer_time` | TIMESTAMP | Call answered (NULL if missed) |
| `end_time` | TIMESTAMP | Call end |
| `duration` | INTEGER | Total duration (seconds) |
| `talk_time` | INTEGER | Talk time (answer → end) |
| `queue_wait_time` | INTEGER | Time in queue (seconds) |
| `ivr_time` | INTEGER | Time in IVR (seconds) |
| `hangup_cause` | VARCHAR(50) | FreeSWITCH hangup cause |
| `recording_path` | VARCHAR(500) | SeaweedFS path |
| `ivr_selections` | JSONB | DTMF selections during IVR |
| `routing_data` | JSONB | Scoring data, candidate list |
| `transfer_history` | JSONB | Transfer chain |

---

## Related Files

- [18-8-routing-failure.md](./18-8-routing-failure.md) — Call Routing Engine (uses queue mapping, generates CDRs)
- [18-9-sync-architecture.md](./18-9-sync-architecture.md) — Sync Architecture (agent_extensions lifecycle, CDR sync, recording sync)
- [18-10-webrtc.md](./18-10-webrtc.md) — WebRTC Integration (uses agent extension mapping for SIP credentials)
- [18-11-event-pipeline.md](./18-11-event-pipeline.md) — Real-time Event Pipeline (CDR events, queue stats)
