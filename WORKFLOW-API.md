# Workflow Service API Documentation

**Base URL (via Kong):** `http://localhost:8000/api/v1`
**Direct URL:** `http://localhost:3015/api/v1`

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

### 1. List Workflows
```
GET /workflows
```

Returns all workflows for the current tenant.

**Example:**
```bash
curl -X GET "http://localhost:8000/api/v1/workflows" \
  -H "Authorization: Bearer $TOKEN"
```

**Response:** `200 OK` — Array of workflow definitions

---

### 2. Create Workflow
```
POST /workflows
```

**Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | ✅ | Workflow name |
| `description` | string | ❌ | Description |
| `trigger` | object | ❌ | Trigger configuration |
| `steps` | array/object | ❌ | Workflow steps |
| `variables` | object | ❌ | Default variables |
| `errorHandling` | object | ❌ | Error handling config |

**Example:**
```bash
curl -X POST "http://localhost:8000/api/v1/workflows" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "SLA Alert Workflow",
    "description": "Notify supervisor when SLA is breached",
    "trigger": {"type": "sla_breach", "threshold": 90},
    "steps": [
      {"type": "notify", "target": "supervisor"},
      {"type": "escalate", "level": 2}
    ]
  }'
```

**Response:** `201 Created`
```json
{
  "id": "uuid",
  "tenantId": "00000000-0000-0000-0000-000000000000",
  "name": "SLA Alert Workflow",
  "description": "Notify supervisor when SLA is breached",
  "isActive": false,
  "version": 1,
  "trigger": {"type": "sla_breach"},
  "steps": [...],
  "variables": [],
  "errorHandling": {},
  "createdBy": "00000000-0000-0000-0000-000000000001",
  "createdAt": "timestamp",
  "updatedAt": "timestamp"
}
```

---

### 3. Get Workflow by ID
```
GET /workflows/:id
```

**Example:**
```bash
curl -X GET "http://localhost:8000/api/v1/workflows/<uuid>" \
  -H "Authorization: Bearer $TOKEN"
```

**Response:** `200 OK` — Single workflow object
**Not Found:** `404 Not Found`

---

### 4. Update Workflow
```
PUT /workflows/:id
```

All fields are optional (partial update).

**Example:**
```bash
curl -X PUT "http://localhost:8000/api/v1/workflows/<uuid>" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"description": "Updated description", "isActive": false}'
```

---

### 5. Delete Workflow
```
DELETE /workflows/:id
```

**Example:**
```bash
curl -X DELETE "http://localhost:8000/api/v1/workflows/<uuid>" \
  -H "Authorization: Bearer $TOKEN"
```

**Response:** `200 OK`
```json
{ "message": "Workflow deleted" }
```

---

### 6. Activate Workflow
```
POST /workflows/:id/activate
```

Sets `isActive: true`.

**Example:**
```bash
curl -X POST "http://localhost:8000/api/v1/workflows/<uuid>/activate" \
  -H "Authorization: Bearer $TOKEN"
```

**Response:** `200 OK` — Updated workflow with `isActive: true`

---

### 7. Deactivate Workflow
```
POST /workflows/:id/deactivate
```

Sets `isActive: false`.

**Example:**
```bash
curl -X POST "http://localhost:8000/api/v1/workflows/<uuid>/deactivate" \
  -H "Authorization: Bearer $TOKEN"
```

---

### 8. Trigger Workflow
```
POST /workflows/:id/trigger
```

Manually triggers a workflow (must be active). Creates an execution record.

**Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `eventData` | object | ❌ | Event payload |
| `variables` | object | ❌ | Override variables |

**Example:**
```bash
curl -X POST "http://localhost:8000/api/v1/workflows/<uuid>/trigger" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"eventData": {"ticketId": "TKT-001", "slaBreached": true}}'
```

**Response:** `201 Created`
```json
{
  "id": "uuid",
  "workflowId": "uuid",
  "status": "running",
  "inputData": {"ticketId": "TKT-001"},
  "startedAt": "timestamp"
}
```

**Error:** `404 Not Found` if workflow doesn't exist or is not active.

---

### 9. Get Executions
```
GET /workflows/:id/executions
```

Returns all execution records for a workflow.

**Example:**
```bash
curl -X GET "http://localhost:8000/api/v1/workflows/<uuid>/executions" \
  -H "Authorization: Bearer $TOKEN"
```

---

### 10. Get Execution by ID
```
GET /executions/:executionId
```

**Example:**
```bash
curl -X GET "http://localhost:8000/api/v1/executions/<execution-uuid>" \
  -H "Authorization: Bearer $TOKEN"
```

---

## Workflow Object Schema

```json
{
  "id": "uuid",
  "tenantId": "uuid",
  "name": "string",
  "description": "string | null",
  "isActive": false,
  "version": 1,
  "trigger": {},
  "steps": [],
  "variables": [],
  "errorHandling": {},
  "createdBy": "uuid",
  "createdAt": "timestamp",
  "updatedAt": "timestamp"
}
```

---

## Seeded Workflows (2 records)

| Name | Trigger | Active |
|------|---------|--------|
| SLA Escalation | `sla_breach` | ✅ |
| Auto Assignment | `ticket_created` | ✅ |

---

## Quick Test Script

```bash
TOKEN=$(curl -s -X POST "http://localhost:8000/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"Admin@123"}' \
  | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)

# List workflows
curl -s "http://localhost:8000/api/v1/workflows" -H "Authorization: Bearer $TOKEN"

# Create
WF=$(curl -s -X POST "http://localhost:8000/api/v1/workflows" \
  -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" \
  -d '{"name":"Test Workflow","trigger":{"type":"manual"},"steps":[]}')
WF_ID=$(echo "$WF" | python3 -c "import json,sys; print(json.load(sys.stdin)['id'])")

# Get
curl -s "http://localhost:8000/api/v1/workflows/$WF_ID" -H "Authorization: Bearer $TOKEN"

# Activate
curl -s -X POST "http://localhost:8000/api/v1/workflows/$WF_ID/activate" -H "Authorization: Bearer $TOKEN"

# Trigger
curl -s -X POST "http://localhost:8000/api/v1/workflows/$WF_ID/trigger" \
  -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" \
  -d '{"eventData":{"source":"test"}}'

# Get executions
curl -s "http://localhost:8000/api/v1/workflows/$WF_ID/executions" -H "Authorization: Bearer $TOKEN"

# Update
curl -s -X PUT "http://localhost:8000/api/v1/workflows/$WF_ID" \
  -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" \
  -d '{"description":"Updated"}'

# Deactivate
curl -s -X POST "http://localhost:8000/api/v1/workflows/$WF_ID/deactivate" -H "Authorization: Bearer $TOKEN"

# Delete
curl -s -X DELETE "http://localhost:8000/api/v1/workflows/$WF_ID" -H "Authorization: Bearer $TOKEN"
```

---

## Test Results (2026-03-13)

| Operation | Status |
|-----------|--------|
| List workflows | ✅ 2 seeded workflows |
| Create workflow | ✅ Returns created object |
| Get by ID | ✅ Full object returned |
| Update (partial) | ✅ Updated fields persisted |
| Activate | ✅ `isActive: true` |
| Deactivate | ✅ `isActive: false` |
| Trigger (active) | ✅ Execution record created, `status: running` |
| Trigger (inactive) | ✅ Returns `404 Not Found` |
| Get executions | ✅ Returns execution list |
| Delete | ✅ Returns `{ "message": "Workflow deleted" }` |

---

## Bugs Fixed (2026-03-13)

| Bug | Fix |
|-----|-----|
| Double URL prefix (`/api/v1/api/v1/workflows`) | Kong service had `path: "/api/v1"` which was prepended to incoming path → changed to `path: "/"` via Kong Admin API |
| CREATE returns 500 (null name) | DTO had no class-validator decorators + `whitelist: true` in ValidationPipe stripped all fields → added `@IsString()` etc. to DTO |
| LIST returns 500 (column not found) | Entity used `tenantId` without `name: 'tenant_id'` → added `name` to all snake_case columns |
| Execution entity mismatch | Entity had Temporal columns (`temporalWorkflowId`, etc.) not in actual DB table → rewrote entity to match actual schema |
