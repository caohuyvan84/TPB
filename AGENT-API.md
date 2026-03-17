# Agent Service API Documentation

**Base URL (via Kong):** `http://localhost:8000/api/v1`
**Direct URL:** `http://localhost:3002/api/v1`

---

## Users & Passwords

| Username | Password | Role | Full Name |
|----------|----------|------|-----------|
| `admin` | `Admin@123` | admin | System Administrator |
| `agent001` | `Agent@123` | agent | Agent Tung |

---

## Authentication

```bash
TOKEN=$(curl -s -X POST "http://localhost:8000/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"Admin@123"}' \
  | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)
```

All requests require: `Authorization: Bearer <token>`

---

## Endpoints

### 1. Get My Profile (`/me`)
```
GET /agents/me
```

Returns the current agent's profile based on JWT token. Auto-creates a profile on first access if one doesn't exist.

**Example:**
```bash
curl -X GET "http://localhost:8000/api/v1/agents/me" \
  -H "Authorization: Bearer $TOKEN"
```

**Response:** `200 OK`
```json
{
  "id": "uuid",
  "userId": "00000000-0000-0000-0000-000000000001",
  "agentId": "AGT001",
  "displayName": "Lê Thị Lan",
  "department": "Customer Service",
  "team": "Team A",
  "skills": ["voice", "chat"],
  "maxConcurrentChats": 3,
  "maxConcurrentEmails": 5,
  "tenantId": "uuid",
  "channelStatuses": [],
  "createdAt": "timestamp",
  "updatedAt": "timestamp"
}
```

---

### 2. Get My Channel Statuses
```
GET /agents/me/status
```

**Example:**
```bash
curl -X GET "http://localhost:8000/api/v1/agents/me/status" \
  -H "Authorization: Bearer $TOKEN"
```

**Response:** `200 OK` — Array of channel status objects

```json
[
  { "id": "uuid", "agentId": "uuid", "channel": "voice", "status": "ready", "changedAt": "timestamp" },
  { "id": "uuid", "agentId": "uuid", "channel": "email", "status": "not-ready", "reason": "break", "changedAt": "timestamp" }
]
```

---

### 3. Set Channel Status
```
PUT /agents/me/status/:channel
```

| Param | Values |
|-------|--------|
| `:channel` | `voice`, `email`, `chat` |

**Body:**

| Field | Type | Required | Values |
|-------|------|----------|--------|
| `status` | string | ✅ | `ready`, `not-ready`, `busy`, `offline` |
| `reason` | string | ❌ | `break`, `lunch`, `training`, `admin` |
| `customReason` | string | ❌ | Free-text reason |

**Example:**
```bash
curl -X PUT "http://localhost:8000/api/v1/agents/me/status/voice" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"status":"ready"}'

curl -X PUT "http://localhost:8000/api/v1/agents/me/status/email" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"status":"not-ready","reason":"break","customReason":"Lunch break"}'
```

---

### 4. Set All Channels Status
```
PUT /agents/me/status/all
```

Sets voice, email, and chat channels to the same status at once.

**Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `status` | string | ✅ | `ready`, `not-ready`, `busy`, `offline` |
| `reason` | string | ❌ | Status reason |

**Example:**
```bash
curl -X PUT "http://localhost:8000/api/v1/agents/me/status/all" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"status":"not-ready","reason":"break"}'
```

**Response:** `200 OK` — Array of 3 channel status objects

---

### 5. Heartbeat
```
POST /agents/me/heartbeat
```

Updates the agent's last heartbeat time and marks connection as active.

**Example:**
```bash
curl -X POST "http://localhost:8000/api/v1/agents/me/heartbeat" \
  -H "Authorization: Bearer $TOKEN"
```

**Response:** `200 OK`
```json
{ "success": true, "timestamp": "2026-03-13T06:30:00.000Z" }
```

---

### 6. List All Agents
```
GET /agents
```

Returns basic profile info for all agents (sorted by display name).

**Example:**
```bash
curl -X GET "http://localhost:8000/api/v1/agents" \
  -H "Authorization: Bearer $TOKEN"
```

**Response:** `200 OK` — Array of agent profiles (id, agentId, displayName, department, team only)

---

### 7. Get Agent by ID
```
GET /agents/:agentId
```

**Example:**
```bash
curl -X GET "http://localhost:8000/api/v1/agents/AGT001" \
  -H "Authorization: Bearer $TOKEN"
```

**Response:** `200 OK` — Full agent profile with channelStatuses
**Not Found:** `404 Not Found`

---

### 8. Check Availability
```
GET /agents/:agentId/availability
```

**Example:**
```bash
curl -X GET "http://localhost:8000/api/v1/agents/AGT001/availability" \
  -H "Authorization: Bearer $TOKEN"
```

**Response:** `200 OK`
```json
{
  "agentId": "AGT001",
  "available": true,
  "channels": [
    { "channel": "voice", "status": "ready", "available": true },
    { "channel": "email", "status": "not-ready", "available": false },
    { "channel": "chat", "status": "ready", "available": true }
  ]
}
```

---

## Seeded Agents (10 records)

| Agent ID | Display Name | Department |
|----------|-------------|------------|
| `SUP001` | Nguyễn Thị Hương | Supervisor |
| `SUP002` | Trần Văn Minh | Supervisor |
| `AGT001` | Lê Thị Lan | Customer Service |
| `AGT002` | Phạm Văn Đức | Customer Service |
| `AGT003` | Hoàng Thị Mai | Customer Service |
| `AGT004–AGT008` | Various | Various |

---

## Quick Test Script

```bash
TOKEN=$(curl -s -X POST "http://localhost:8000/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"Admin@123"}' \
  | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)

# Get my profile
curl -s "http://localhost:8000/api/v1/agents/me" -H "Authorization: Bearer $TOKEN"

# Get my status
curl -s "http://localhost:8000/api/v1/agents/me/status" -H "Authorization: Bearer $TOKEN"

# Set voice ready
curl -s -X PUT "http://localhost:8000/api/v1/agents/me/status/voice" \
  -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" \
  -d '{"status":"ready"}'

# Set all channels not-ready
curl -s -X PUT "http://localhost:8000/api/v1/agents/me/status/all" \
  -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" \
  -d '{"status":"not-ready","reason":"break"}'

# Heartbeat
curl -s -X POST "http://localhost:8000/api/v1/agents/me/heartbeat" -H "Authorization: Bearer $TOKEN"

# List agents
curl -s "http://localhost:8000/api/v1/agents" -H "Authorization: Bearer $TOKEN"

# Get specific agent
curl -s "http://localhost:8000/api/v1/agents/AGT001" -H "Authorization: Bearer $TOKEN"

# Check availability
curl -s "http://localhost:8000/api/v1/agents/AGT001/availability" -H "Authorization: Bearer $TOKEN"
```

---

## Test Results (2026-03-13)

| Operation | Status |
|-----------|--------|
| GET /me (admin) | ✅ Auto-creates profile on first access |
| GET /me (agent001) | ✅ Returns existing profile |
| GET /me/status | ✅ Returns channel statuses |
| PUT /me/status/:channel | ✅ Sets specific channel status |
| PUT /me/status/all | ✅ Sets all 3 channels |
| POST /me/heartbeat | ✅ Returns `{ success: true }` |
| GET /agents | ✅ Returns 10 seeded agents |
| GET /agents/:agentId | ✅ Returns profile with channelStatuses |
| GET /agents/:agentId/availability | ✅ Returns availability per channel |
| 404 unknown agentId | ✅ Proper error response |

---

## Bugs Fixed (2026-03-13)

| Bug | Fix |
|-----|-----|
| `/me` returns 404 for admin | Admin has no agent profile → service now auto-creates profile on first access |
