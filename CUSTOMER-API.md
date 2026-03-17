# Customer Service API Documentation

**Base URL (via Kong):** `http://localhost:8000/api/v1`
**Direct URL:** `http://localhost:3005/api/v1`

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

### 1. List / Search Customers
```
GET /customers
GET /customers?q=<search_term>
```

| Query Param | Type | Description |
|-------------|------|-------------|
| `q` | string | Case-insensitive search across: `fullName`, `cif`, `email`, `phone` |

**Examples:**
```bash
# List all customers (max 50)
curl -X GET "http://localhost:8000/api/v1/customers" \
  -H "Authorization: Bearer $TOKEN"

# Search by name (Vietnamese supported)
curl -X GET "http://localhost:8000/api/v1/customers?q=Nguyen" \
  -H "Authorization: Bearer $TOKEN"

# Search by phone
curl -X GET "http://localhost:8000/api/v1/customers?q=0901234" \
  -H "Authorization: Bearer $TOKEN"

# Search by CIF
curl -X GET "http://localhost:8000/api/v1/customers?q=CIF001" \
  -H "Authorization: Bearer $TOKEN"
```

**Response:** `200 OK`
```json
[
  {
    "id": "c0000000-0000-0000-0000-000000000001",
    "tenantId": "00000000-0000-0000-0000-000000000000",
    "cif": "CIF001",
    "fullName": "Nguyễn Văn An",
    "email": "nguyen.van.an@email.com",
    "phone": "0901234567",
    "segment": "Premium",
    "isVip": true,
    "satisfactionRating": 5,
    "dynamicFields": {},
    "createdAt": "2026-03-12T19:57:44.541Z",
    "updatedAt": "2026-03-12T19:57:44.541Z"
  }
]
```

---

### 2. Get Customer by ID
```
GET /customers/:id
```

**Example:**
```bash
curl -X GET "http://localhost:8000/api/v1/customers/c0000000-0000-0000-0000-000000000001" \
  -H "Authorization: Bearer $TOKEN"
```

**Response:** `200 OK` — Single customer object
**Error:** `404 Not Found`
```json
{ "statusCode": 404, "message": "Customer not found" }
```

---

### 3. Get Customer Interactions
```
GET /customers/:id/interactions
```

Returns all interactions linked to this customer (calls, chats, emails).

**Example:**
```bash
curl -X GET "http://localhost:8000/api/v1/customers/c0000000-0000-0000-0000-000000000001/interactions" \
  -H "Authorization: Bearer $TOKEN"
```

**Response:** `200 OK` — Array of interactions

---

### 4. Get Customer Notes
```
GET /customers/:id/notes
```

Returns all notes for this customer, sorted newest first.

**Example:**
```bash
curl -X GET "http://localhost:8000/api/v1/customers/c0000000-0000-0000-0000-000000000001/notes" \
  -H "Authorization: Bearer $TOKEN"
```

**Response:** `200 OK`
```json
[
  {
    "id": "uuid",
    "customerId": "c0000000-0000-0000-0000-000000000001",
    "agentId": "00000000-0000-0000-0000-000000000001",
    "agentName": "System Administrator",
    "content": "VIP customer. Owns 3 business accounts. Prefers morning contact.",
    "createdAt": "2026-03-12T19:57:44.541Z",
    "updatedAt": "2026-03-12T19:57:44.541Z"
  }
]
```

---

### 5. Add Customer Note
```
POST /customers/:id/notes
```

**Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `content` | string | ✅ | Note content |

**Example:**
```bash
curl -X POST "http://localhost:8000/api/v1/customers/c0000000-0000-0000-0000-000000000001/notes" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"content":"Khách hàng VIP. Ưu tiên xử lý trong 2 giờ."}'
```

**Response:** `201 Created`
```json
{
  "id": "uuid",
  "customerId": "c0000000-0000-0000-0000-000000000001",
  "agentId": "00000000-0000-0000-0000-000000000001",
  "agentName": "System Administrator",
  "content": "Khách hàng VIP. Ưu tiên xử lý trong 2 giờ.",
  "createdAt": "2026-03-13T05:50:00.000Z",
  "updatedAt": "2026-03-13T05:50:00.000Z"
}
```

**Error:** `404 Not Found` if customer does not exist.

---

## Customer Object Schema

```json
{
  "id": "uuid",
  "tenantId": "uuid",
  "cif": "CIF001",
  "fullName": "Nguyễn Văn An",
  "email": "nguyen.van.an@email.com",
  "phone": "0901234567",
  "segment": "Premium | Standard | VIP | ...",
  "isVip": true,
  "avatarUrl": "string | null",
  "satisfactionRating": 5,
  "dynamicFields": {},
  "createdAt": "timestamp",
  "updatedAt": "timestamp"
}
```

---

## Seeded Customers (12 records)

| ID Suffix | Full Name | CIF | Segment | VIP |
|-----------|-----------|-----|---------|-----|
| `...0001` | Nguyễn Văn An | CIF001 | Premium | ✅ |
| `...0002` | Trần Thị Bích | CIF002 | Standard | ❌ |
| `...0003` | Lê Văn Cường | CIF003 | VIP | ✅ |
| `...0004` | Phạm Thị Dung | CIF004 | Standard | ❌ |
| `...0005` | Hoàng Văn Em | CIF005 | Premium | ✅ |
| `...0006` | Vũ Thị Giang | CIF006 | Corporate | ✅ |
| `...0007` | Đặng Văn Hùng | CIF007 | Standard | ❌ |
| `...0008` | Bùi Thị Khánh | CIF008 | Standard | ❌ |
| `...0009` | Ngô Văn Long | CIF009 | Private | ✅ |
| `...0010` | Lý Thị Mai | CIF010 | Standard | ❌ |
| `...0011` | Đỗ Văn Nam | CIF011 | Standard | ❌ |
| `...0012` | Lý Thị Oanh | CIF012 | Premium | ✅ |

---

## Quick Test Script

```bash
# 1. Login
TOKEN=$(curl -s -X POST "http://localhost:8000/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"Admin@123"}' \
  | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)

# 2. List all customers
curl -s "http://localhost:8000/api/v1/customers" \
  -H "Authorization: Bearer $TOKEN"

# 3. Search
curl -s "http://localhost:8000/api/v1/customers?q=Nguyen" \
  -H "Authorization: Bearer $TOKEN"

# 4. Get by ID
curl -s "http://localhost:8000/api/v1/customers/c0000000-0000-0000-0000-000000000001" \
  -H "Authorization: Bearer $TOKEN"

# 5. Get interactions
curl -s "http://localhost:8000/api/v1/customers/c0000000-0000-0000-0000-000000000001/interactions" \
  -H "Authorization: Bearer $TOKEN"

# 6. Get notes
curl -s "http://localhost:8000/api/v1/customers/c0000000-0000-0000-0000-000000000001/notes" \
  -H "Authorization: Bearer $TOKEN"

# 7. Add note
curl -s -X POST "http://localhost:8000/api/v1/customers/c0000000-0000-0000-0000-000000000001/notes" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"content":"Ghi chú mới từ agent"}'
```

---

## Test Results (2026-03-13)

| Operation | Status |
|-----------|--------|
| List customers | ✅ 12 records |
| Search `?q=Nguyen` | ✅ Case-insensitive (ILike) |
| Read by ID | ✅ Full object returned |
| Get interactions | ✅ Returns array |
| Get notes | ✅ Returns seeded notes |
| Add note | ✅ Saved with agent info from JWT |
| 404 unknown ID | ✅ Proper error response |
| Search no results | ✅ Returns `[]` |
