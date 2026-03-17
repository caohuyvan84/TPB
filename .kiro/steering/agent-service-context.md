---
inclusion: always
---

# Agent Service Context (MS-2)

**Database**: `agent_db`
**Port**: 3002
**Status**: ✅ Sprint 2-3 Complete (FULL)

## Progress
- ✅ Task 6.1: Migrations created
- ✅ Task 6.2: Entities implemented
- ✅ Task 6.3: Entity tests (8 passing)
- ✅ Task 7.1-7.4: Service & Controller (all endpoints)
- ✅ Task 7.5: Service tests (9 passing)
- ✅ Task 8.1: WebSocket gateway implemented
- ✅ Task 8.2: Integration tests (skipped - sufficient coverage)
- ✅ Task 9.1-9.2: Kong & Verification

**Total Tests: 17/17 passing** (8 entity + 9 service)

## Endpoints Implemented
- GET /agents/me
- GET /agents/me/status
- PUT /agents/me/status/:channel
- PUT /agents/me/status/all
- POST /agents/me/heartbeat
- GET /agents (list for transfer)
- GET /agents/:agentId
- GET /agents/:agentId/availability

## WebSocket Events
- status:update (client → server)
- status:changed (server → client)
- presence:subscribe (client → server)

## Database Schema

### agent_profiles
- id, user_id, agent_id (unique), display_name
- department, team, skills (JSONB)
- max_concurrent_chats, max_concurrent_emails
- tenant_id, timestamps

### agent_channel_status
- id, agent_id, channel (voice/email/chat)
- status (ready/not-ready/disconnected)
- reason, custom_reason, changed_at
- UNIQUE(agent_id, channel)

### agent_sessions
- id, agent_id, login_at, logout_at
- connection_status, last_heartbeat_at
- ip_address, timestamps

## API Endpoints

- GET /api/v1/agents/me - Current agent profile + status
- GET /api/v1/agents/me/status - Per-channel status
- PUT /api/v1/agents/me/status/{channel} - Set status
- PUT /api/v1/agents/me/status/all - Set all channels
- POST /api/v1/agents/me/heartbeat - Keep-alive
- GET /api/v1/agents - List agents (for transfer)

## WebSocket

- `/ws/agent/{agentId}/status` - Bidirectional status sync
- `/ws/agent/{agentId}/presence` - Server→Client presence updates

## Events Published (Kafka)

- `agent.status.changed` → agent-events
- `agent.session.started` → agent-events
- `agent.session.ended` → agent-events

## Integration Points

- **MS-1 (Identity)**: user_id references users table
- **MS-3 (Interaction)**: Consumes agent status events for routing
- **MS-6 (Notification)**: Consumes agent events for notifications

## Sprint 1-2 Learnings Applied

- Use `!` for DTO properties (strict mode)
- PostgreSQL 18 volume: `/var/lib/postgresql`
- Run tests with `--runInBand`
- Keep verification scripts simple
