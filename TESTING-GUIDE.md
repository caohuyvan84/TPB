# Phase 1 Testing Guide

## 🚀 Quick Start

### 1. Start Infrastructure

```bash
cd infra
docker compose up -d
```

Wait for all services to be healthy (~30 seconds).

### 2. Seed Sample Data

```bash
chmod +x infra/scripts/seed-sample-data.sh
./infra/scripts/seed-sample-data.sh
```

### 3. Verify Setup

```bash
./infra/scripts/verify-phase-1.sh
```

Expected: **27/27 checks passed** ✅

---

## 🔑 Test Credentials

| Username | Password | Role | Agent ID |
|---|---|---|---|
| `agent1` | `password123` | Agent | AGT001 |
| `agent2` | `password123` | Agent | AGT002 |
| `supervisor` | `password123` | Supervisor | SUP001 |

**Note:** Password is hashed with bcrypt. The hash in database is for `password123`.

---

## 📡 API Testing with cURL

### 1. Authentication

#### Login
```bash
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "agent1",
    "password": "password123",
    "clientFingerprint": "test-device-001"
  }'
```

**Expected Response:**
```json
{
  "accessToken": "eyJhbGc...",
  "refreshToken": "eyJhbGc...",
  "expiresIn": 900,
  "tokenType": "Bearer",
  "user": {
    "id": "00000000-0000-0000-0000-000000000001",
    "agentId": "AGT001",
    "fullName": "Nguyễn Văn A",
    "roles": ["agent"],
    "permissions": ["interaction:read", "interaction:update", ...]
  },
  "requiresMfa": false
}
```

**Save the accessToken for next requests!**

#### Refresh Token
```bash
curl -X POST http://localhost:8000/api/v1/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "YOUR_REFRESH_TOKEN"
  }'
```

#### Logout
```bash
curl -X POST http://localhost:8000/api/v1/auth/logout \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "YOUR_REFRESH_TOKEN"
  }'
```

---

### 2. Agent Service

#### Get Current Agent Profile
```bash
curl -X GET http://localhost:8000/api/v1/agents/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

#### Get Agent Status
```bash
curl -X GET http://localhost:8000/api/v1/agents/me/status \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

#### Update Channel Status
```bash
curl -X PUT http://localhost:8000/api/v1/agents/me/status/voice \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "ready"
  }'
```

#### Send Heartbeat
```bash
curl -X POST http://localhost:8000/api/v1/agents/me/heartbeat \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

---

### 3. Interaction Service

#### List Interactions
```bash
curl -X GET "http://localhost:8000/api/v1/interactions?status=new" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

#### Get Interaction Detail
```bash
curl -X GET http://localhost:8000/api/v1/interactions/00000000-0000-0000-0000-000000000301 \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

#### Assign Interaction
```bash
curl -X PUT http://localhost:8000/api/v1/interactions/00000000-0000-0000-0000-000000000302/assign \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "agentId": "00000000-0000-0000-0000-000000000001",
    "agentName": "Nguyễn Văn A"
  }'
```

#### Add Note
```bash
curl -X POST http://localhost:8000/api/v1/interactions/00000000-0000-0000-0000-000000000301/notes \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Đã tư vấn khách hàng về sản phẩm"
  }'
```

---

### 4. Customer Service

#### Search Customers
```bash
curl -X GET "http://localhost:8000/api/v1/customers?q=Hoàng" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

#### Get Customer Detail
```bash
curl -X GET http://localhost:8000/api/v1/customers/00000000-0000-0000-0000-000000000202 \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

#### Get Customer Notes
```bash
curl -X GET http://localhost:8000/api/v1/customers/00000000-0000-0000-0000-000000000202/notes \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

#### Add Customer Note
```bash
curl -X POST http://localhost:8000/api/v1/customers/00000000-0000-0000-0000-000000000202/notes \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Khách hàng hài lòng với dịch vụ"
  }'
```

---

### 5. Ticket Service

#### List Tickets
```bash
curl -X GET "http://localhost:8000/api/v1/tickets?status=open" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

#### Get Ticket Detail
```bash
curl -X GET http://localhost:8000/api/v1/tickets/00000000-0000-0000-0000-000000000401 \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

#### Create Ticket
```bash
curl -X POST http://localhost:8000/api/v1/tickets \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "displayId": "TK-2026-000003",
    "tenantId": "00000000-0000-0000-0000-000000000010",
    "title": "Yêu cầu tăng hạn mức thẻ",
    "description": "Khách hàng yêu cầu tăng hạn mức từ 50M lên 100M",
    "status": "open",
    "priority": "medium",
    "category": "card",
    "customerId": "00000000-0000-0000-0000-000000000201"
  }'
```

#### Update Ticket
```bash
curl -X PATCH http://localhost:8000/api/v1/tickets/00000000-0000-0000-0000-000000000401 \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "in-progress"
  }'
```

#### Add Comment
```bash
curl -X POST http://localhost:8000/api/v1/tickets/00000000-0000-0000-0000-000000000401/comments \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Đã liên hệ khách hàng để xác nhận thông tin",
    "isInternal": false
  }'
```

---

### 6. Notification Service

#### List Notifications
```bash
curl -X GET http://localhost:8000/api/v1/notifications \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

#### Get Unread Count
```bash
curl -X GET http://localhost:8000/api/v1/notifications/unread-count \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

#### Update Notification State
```bash
curl -X PATCH http://localhost:8000/api/v1/notifications/NOTIFICATION_ID/state \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "state": "viewed"
  }'
```

#### Mark All as Read
```bash
curl -X POST http://localhost:8000/api/v1/notifications/mark-all-read \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

---

## 🧪 Testing Scenarios

### Scenario 1: Agent Login & Check Status

```bash
# 1. Login
TOKEN=$(curl -s -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"agent1","password":"password123","clientFingerprint":"test"}' \
  | jq -r '.accessToken')

# 2. Get agent profile
curl -X GET http://localhost:8000/api/v1/agents/me \
  -H "Authorization: Bearer $TOKEN"

# 3. Get agent status
curl -X GET http://localhost:8000/api/v1/agents/me/status \
  -H "Authorization: Bearer $TOKEN"
```

### Scenario 2: Handle Interaction

```bash
# 1. List new interactions
curl -X GET "http://localhost:8000/api/v1/interactions?status=new" \
  -H "Authorization: Bearer $TOKEN"

# 2. Assign to self
curl -X PUT http://localhost:8000/api/v1/interactions/00000000-0000-0000-0000-000000000302/assign \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"agentId":"00000000-0000-0000-0000-000000000001","agentName":"Nguyễn Văn A"}'

# 3. Add note
curl -X POST http://localhost:8000/api/v1/interactions/00000000-0000-0000-0000-000000000302/notes \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"content":"Đã xử lý yêu cầu"}'

# 4. Update status
curl -X PUT http://localhost:8000/api/v1/interactions/00000000-0000-0000-0000-000000000302/status \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status":"completed"}'
```

### Scenario 3: Create & Manage Ticket

```bash
# 1. Create ticket
TICKET_ID=$(curl -s -X POST http://localhost:8000/api/v1/tickets \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "displayId":"TK-2026-TEST",
    "tenantId":"00000000-0000-0000-0000-000000000010",
    "title":"Test Ticket",
    "customerId":"00000000-0000-0000-0000-000000000201",
    "status":"open",
    "priority":"medium"
  }' | jq -r '.id')

# 2. Add comment
curl -X POST http://localhost:8000/api/v1/tickets/$TICKET_ID/comments \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"content":"First comment"}'

# 3. Update status
curl -X PATCH http://localhost:8000/api/v1/tickets/$TICKET_ID \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status":"resolved"}'
```

---

## 🔍 Database Inspection

### Check Users
```bash
docker exec tpb-postgres psql -U postgres -d identity_db -c "SELECT username, full_name, agent_id FROM users;"
```

### Check Agents
```bash
docker exec tpb-postgres psql -U postgres -d agent_db -c "SELECT agent_id, display_name, department FROM agent_profiles;"
```

### Check Interactions
```bash
docker exec tpb-postgres psql -U postgres -d interaction_db -c "SELECT display_id, type, status, customer_name FROM interactions;"
```

### Check Tickets
```bash
docker exec tpb-postgres psql -U postgres -d ticket_db -c "SELECT display_id, title, status, priority FROM tickets;"
```

---

## 🐛 Troubleshooting

### Services not responding
```bash
# Check service health
docker compose ps

# Check logs
docker compose logs identity-service
docker compose logs kong
```

### Authentication fails
```bash
# Verify user exists
docker exec tpb-postgres psql -U postgres -d identity_db -c "SELECT * FROM users WHERE username='agent1';"

# Check password hash (should start with $2b$10$)
```

### Kong returns 404
```bash
# Verify Kong services
curl http://localhost:8001/services

# Re-run Kong setup
./infra/scripts/setup-kong-identity.sh
./infra/scripts/setup-kong-agent.sh
# ... etc
```

---

## 📊 Sample Data Summary

### Users (3)
- `agent1` - Nguyễn Văn A (Agent)
- `agent2` - Trần Thị B (Agent)
- `supervisor` - Lê Văn C (Supervisor)

### Customers (3)
- Phạm Văn D (CIF001234567) - Individual
- Hoàng Thị E (CIF002345678) - VIP Individual
- Công ty ABC (CIF003456789) - VIP Corporate

### Interactions (3)
- INT-2026-000001 - Call from VIP (in-progress)
- INT-2026-000002 - Email (new)
- INT-2026-000003 - Chat from corporate (new)

### Tickets (2)
- TK-2026-000001 - Card application (open)
- TK-2026-000002 - Fee complaint (in-progress)

### Notifications (3)
- New call notification
- Ticket assigned notification
- Ticket escalation notification

---

## ✅ Success Criteria

After testing, you should be able to:

- [x] Login with agent credentials
- [x] Get agent profile and status
- [x] List and filter interactions
- [x] Assign interactions to agents
- [x] Add notes to interactions
- [x] Search customers
- [x] View customer details
- [x] Create and update tickets
- [x] Add comments to tickets
- [x] View notifications
- [x] Mark notifications as read

---

**Last Updated:** 2026-03-09  
**Phase:** 1 - Core MVP Complete
