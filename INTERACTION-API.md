# Interaction Service API Documentation

**Base URL (via Kong):** `http://localhost:8000/api/v1`
**Direct URL:** `http://localhost:3003/api/v1`

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

### 1. List Interactions
```
GET /interactions
```

| Query Param | Type | Description |
|-------------|------|-------------|
| `status` | string | Filter by status: `active`, `in-progress`, `closed`, `waiting` |
| `channel` | string | Filter by channel: `voice`, `email`, `chat` |
| `assignedAgentId` | uuid | Filter by assigned agent UUID |
| `customerId` | uuid | Filter by customer UUID |

**Example:**
```bash
curl -X GET "http://localhost:8000/api/v1/interactions" \
  -H "Authorization: Bearer $TOKEN"

curl -X GET "http://localhost:8000/api/v1/interactions?channel=voice&status=active" \
  -H "Authorization: Bearer $TOKEN"
```

**Response:** `200 OK` — Array of up to 50 interactions (newest first)

---

### 2. Get Interaction by ID
```
GET /interactions/:id
```

**Example:**
```bash
curl -X GET "http://localhost:8000/api/v1/interactions/11110000-0000-0000-0000-000000000001" \
  -H "Authorization: Bearer $TOKEN"
```

**Response:** `200 OK` — Single interaction object
**Not Found:** `404 Not Found`

---

### 3. Update Interaction Status
```
PUT /interactions/:id/status
```

**Body:**

| Field | Type | Required | Values |
|-------|------|----------|--------|
| `status` | string | ✅ | `active`, `in-progress`, `waiting`, `closed` |

**Example:**
```bash
curl -X PUT "http://localhost:8000/api/v1/interactions/11110000-0000-0000-0000-000000000001/status" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"status":"closed"}'
```

---

### 4. Assign Agent
```
POST /interactions/:id/assign
```

**Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `agentId` | uuid | ✅ | Agent UUID |
| `agentName` | string | ❌ | Agent display name |

**Example:**
```bash
curl -X POST "http://localhost:8000/api/v1/interactions/11110000-0000-0000-0000-000000000001/assign" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"agentId":"00000000-0000-0000-0000-000000000004","agentName":"Lê Thị Lan"}'
```

---

### 5. Get Interaction Notes
```
GET /interactions/:id/notes
```

**Example:**
```bash
curl -X GET "http://localhost:8000/api/v1/interactions/11110000-0000-0000-0000-000000000001/notes" \
  -H "Authorization: Bearer $TOKEN"
```

**Response:** `200 OK` — Array of notes (newest first)

```json
[
  {
    "id": "uuid",
    "interactionId": "11110000-0000-0000-0000-000000000001",
    "agentId": "00000000-0000-0000-0000-000000000004",
    "agentName": "Lê Thị Lan",
    "content": "Customer asking about home loan.",
    "tag": "inquiry",
    "isPinned": false,
    "createdAt": "2026-03-12T19:58:33.701Z",
    "updatedAt": "2026-03-12T19:58:33.701Z"
  }
]
```

---

### 6. Add Note
```
POST /interactions/:id/notes
```

**Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `content` | string | ✅ | Note text |
| `tag` | string | ❌ | Category tag (e.g. `inquiry`, `complaint`) |
| `isPinned` | boolean | ❌ | Pin note to top (default: false) |

**Example:**
```bash
curl -X POST "http://localhost:8000/api/v1/interactions/11110000-0000-0000-0000-000000000001/notes" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"content":"Customer wants loan brochure sent via email","tag":"inquiry","isPinned":false}'
```

**Response:** `201 Created` — Note object with JWT user as `agentId`/`agentName`

---

## Interaction Object Schema

```json
{
  "id": "uuid",
  "displayId": "INT-2026-001",
  "tenantId": "uuid",
  "type": "call | missed-call | email | chat",
  "channel": "voice | email | chat",
  "status": "active | in-progress | waiting | closed",
  "priority": "low | medium | high | urgent",
  "customerId": "uuid",
  "customerName": "string",
  "assignedAgentId": "uuid | null",
  "assignedAgentName": "string | null",
  "subject": "string | null",
  "tags": ["string"],
  "isVip": false,
  "direction": "inbound | outbound",
  "source": "string",
  "metadata": {},
  "dynamicFields": {},
  "slaDueAt": "timestamp | null",
  "slaBreached": false,
  "createdAt": "timestamp",
  "updatedAt": "timestamp",
  "closedAt": "timestamp | null"
}
```

---

## Seeded Interactions (12 records)

| ID Suffix | Channel | Status | Customer | Priority |
|-----------|---------|--------|----------|----------|
| `...0001` | voice | active | Nguyễn Văn An | high |
| `...0002` | chat | waiting | Trần Thị Bích | medium |
| `...0003` | email | in-progress | Lê Văn Cường | low |
| `...0004–0012` | mixed | various | various | various |

---

## Quick Test Script

```bash
TOKEN=$(curl -s -X POST "http://localhost:8000/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"Admin@123"}' \
  | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)

INT_ID="11110000-0000-0000-0000-000000000001"

# List interactions
curl -s "http://localhost:8000/api/v1/interactions" -H "Authorization: Bearer $TOKEN"

# Get one
curl -s "http://localhost:8000/api/v1/interactions/$INT_ID" -H "Authorization: Bearer $TOKEN"

# Update status
curl -s -X PUT "http://localhost:8000/api/v1/interactions/$INT_ID/status" \
  -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" \
  -d '{"status":"in-progress"}'

# Assign agent
curl -s -X POST "http://localhost:8000/api/v1/interactions/$INT_ID/assign" \
  -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" \
  -d '{"agentId":"00000000-0000-0000-0000-000000000004","agentName":"Lê Thị Lan"}'

# Get notes
curl -s "http://localhost:8000/api/v1/interactions/$INT_ID/notes" -H "Authorization: Bearer $TOKEN"

# Add note
curl -s -X POST "http://localhost:8000/api/v1/interactions/$INT_ID/notes" \
  -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" \
  -d '{"content":"Follow-up required","tag":"inquiry"}'
```

---

## Test Results (2026-03-13)

| Operation | Status |
|-----------|--------|
| List interactions | ✅ 12 records returned |
| Filter by channel/status | ✅ Works |
| Get by ID | ✅ Full object returned |
| Update status | ✅ Status updated, closedAt set when closed |
| Assign agent (POST) | ✅ Agent assigned |
| Get notes | ✅ Returns notes with proper column mapping |
| Add note | ✅ Saved with JWT user as agentId/agentName |
| 404 unknown ID | ✅ Proper error response |

---

## Bugs Fixed (2026-03-13)

| Bug | Fix |
|-----|-----|
| GET/POST notes returning 500 | Entity `interaction-note.entity.ts` missing `name` on camelCase columns → added `name: 'interaction_id'`, `name: 'agent_id'`, etc. |
| POST /assign returning 404 | Route was `PUT` only → added `@Post()` decorator |
| Wrong agentId fallback `'test-agent-id'` | Invalid UUID → changed to `'00000000-0000-0000-0000-000000000001'` |
