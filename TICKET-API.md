# Ticket Service API Documentation

**Base URL (via Kong):** `http://localhost:8000/api/v1`
**Direct URL:** `http://localhost:3004/api/v1`

---

## Authentication

### Login
```
POST /auth/login
```
**Body:**
```json
{
  "username": "admin",
  "password": "Admin@123"
}
```
**Response:**
```json
{
  "accessToken": "<jwt_token>",
  "refreshToken": "<refresh_token>",
  "expiresIn": 900,
  "tokenType": "Bearer",
  "user": {
    "id": "00000000-0000-0000-0000-000000000001",
    "agentId": "ADM001",
    "fullName": "System Administrator",
    "roles": ["admin"],
    "permissions": ["*:*:all"]
  }
}
```

**Get Token (bash):**
```bash
TOKEN=$(curl -s -X POST "http://localhost:8000/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"Admin@123"}' \
  | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)
```

---

## Users & Passwords

| Username | Password | Role | Full Name |
|----------|----------|------|-----------|
| `admin` | `Admin@123` | admin | System Administrator |
| `agent001` | `Agent@123` | agent | Agent Tung |

---

## Ticket API Endpoints

All requests require header: `Authorization: Bearer <token>`

---

### 1. List Tickets
```
GET /tickets
```
**Query Parameters:**

| Param | Type | Description |
|-------|------|-------------|
| `status` | string | Filter by status: `open`, `in-progress`, `resolved`, `closed` |
| `assignedAgentId` | string | Filter by assigned agent UUID |
| `customerId` | string | Filter by customer UUID |

**Example:**
```bash
curl -X GET "http://localhost:8000/api/v1/tickets?status=open" \
  -H "Authorization: Bearer $TOKEN"
```

**Response:** `200 OK` — Array of tickets (max 50, sorted newest first)

---

### 2. Get Ticket by ID
```
GET /tickets/:id
```
**Example:**
```bash
curl -X GET "http://localhost:8000/api/v1/tickets/3a060d30-e7d7-441b-a4cf-e414f0df4d28" \
  -H "Authorization: Bearer $TOKEN"
```

**Response:** `200 OK` — Single ticket object
**Error:** `404 Not Found` if ticket does not exist

---

### 3. Create Ticket
```
POST /tickets
```
**Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `title` | string | ✅ | Ticket title |
| `customerId` | string | ✅ | Customer UUID |
| `description` | string | ❌ | Ticket description |
| `status` | string | ❌ | `open` (default), `in-progress`, `resolved`, `closed` |
| `priority` | string | ❌ | `low`, `medium` (default), `high`, `urgent` |
| `category` | string | ❌ | e.g. `Complaint`, `Digital Banking` |
| `department` | string | ❌ | e.g. `Retail Banking`, `Customer Relations` |
| `assignedAgentId` | string | ❌ | Agent UUID |
| `interactionId` | string | ❌ | Linked interaction UUID |

**Example:**
```bash
curl -X POST "http://localhost:8000/api/v1/tickets" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "title": "ATM fee incorrectly charged",
    "description": "Customer charged 55,000 VND ATM fee on 2026-03-01",
    "customerId": "c0000000-0000-0000-0000-000000000001",
    "priority": "high",
    "category": "Complaint",
    "department": "Customer Relations"
  }'
```

**Response:** `201 Created`
```json
{
  "id": "uuid",
  "displayId": "TKT-2026-XXXXXX",
  "title": "ATM fee incorrectly charged",
  "status": "open",
  "priority": "high",
  "customerId": "c0000000-0000-0000-0000-000000000001",
  "createdAt": "2026-03-13T00:00:00.000Z"
}
```

**Validation Errors:** `400 Bad Request` if `title` or `customerId` is missing.

---

### 4. Update Ticket
```
PATCH /tickets/:id
```
**Body** (all fields optional):

| Field | Type | Description |
|-------|------|-------------|
| `title` | string | New title |
| `description` | string | New description |
| `status` | string | `open`, `in-progress`, `resolved`, `closed` |
| `priority` | string | `low`, `medium`, `high`, `urgent` |
| `category` | string | Ticket category |
| `department` | string | Responsible department |
| `assignedAgentId` | string | Agent UUID to assign |
| `interactionId` | string | Linked interaction UUID |
| `dynamicFields` | object | Custom dynamic fields |

**Example:**
```bash
curl -X PATCH "http://localhost:8000/api/v1/tickets/<id>" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "status": "in-progress",
    "priority": "medium",
    "assignedAgentId": "00000000-0000-0000-0000-000000000002"
  }'
```

**Response:** `200 OK` — Updated ticket object

---

### 5. Add Comment
```
POST /tickets/:id/comments
```
**Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `content` | string | ✅ | Comment text |
| `isInternal` | boolean | ❌ | `false` (default) = public, `true` = internal only |

**Example:**
```bash
curl -X POST "http://localhost:8000/api/v1/tickets/<id>/comments" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "content": "Customer confirmed issue. Processing refund.",
    "isInternal": false
  }'
```

**Response:** `201 Created`
```json
{
  "id": "uuid",
  "ticketId": "uuid",
  "agentId": "uuid",
  "agentName": "System Administrator",
  "content": "Customer confirmed issue. Processing refund.",
  "isInternal": false,
  "createdAt": "2026-03-13T00:00:00.000Z"
}
```

---

### 6. Get Comments
```
GET /tickets/:id/comments
```
**Example:**
```bash
curl -X GET "http://localhost:8000/api/v1/tickets/<id>/comments" \
  -H "Authorization: Bearer $TOKEN"
```

**Response:** `200 OK` — Array of comments (sorted newest first)

---

### 7. Get History
```
GET /tickets/:id/history
```
**Example:**
```bash
curl -X GET "http://localhost:8000/api/v1/tickets/<id>/history" \
  -H "Authorization: Bearer $TOKEN"
```

**Response:** `200 OK` — Array of history entries

---

## Ticket Object Schema

```json
{
  "id": "uuid",
  "displayId": "TKT-2026-XXXXXX",
  "tenantId": "uuid",
  "title": "string",
  "description": "string | null",
  "status": "open | in-progress | resolved | closed",
  "priority": "low | medium | high | urgent",
  "category": "string | null",
  "department": "string | null",
  "assignedAgentId": "uuid | null",
  "customerId": "uuid",
  "interactionId": "uuid | null",
  "dueAt": "timestamp | null",
  "resolvedAt": "timestamp | null",
  "dynamicFields": {},
  "createdAt": "timestamp",
  "updatedAt": "timestamp"
}
```

---

## Status Flow

```
open → in-progress → resolved → closed
```

---

## Quick Test Script

```bash
# 1. Login
TOKEN=$(curl -s -X POST "http://localhost:8000/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"Admin@123"}' \
  | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)

# 2. Create
TICKET=$(curl -s -X POST "http://localhost:8000/api/v1/tickets" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"title":"Test","customerId":"c0000000-0000-0000-0000-000000000001","priority":"high"}')
ID=$(echo $TICKET | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)

# 3. Read
curl -s "http://localhost:8000/api/v1/tickets/$ID" -H "Authorization: Bearer $TOKEN"

# 4. Update
curl -s -X PATCH "http://localhost:8000/api/v1/tickets/$ID" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"status":"in-progress"}'

# 5. Comment
curl -s -X POST "http://localhost:8000/api/v1/tickets/$ID/comments" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"content":"Test comment"}'

# 6. List
curl -s "http://localhost:8000/api/v1/tickets" -H "Authorization: Bearer $TOKEN"
```
