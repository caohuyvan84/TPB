# Knowledge Base Service API Documentation

**Base URL (via Kong):** `http://localhost:8000/api/v1/kb`
**Direct URL:** `http://localhost:3007/api/v1/kb`

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

### 1. List / Search Articles
```
GET /kb/articles
```

| Query Param | Type | Default | Description |
|-------------|------|---------|-------------|
| `query` | string | — | Full-text search in `title` and `content` (case-insensitive) |
| `category` | string | — | Filter by category |
| `folderId` | uuid | — | Filter by folder UUID |
| `page` | number | `1` | Page number |
| `limit` | number | `20` | Items per page (max 100) |

**Examples:**
```bash
# List all articles
curl -X GET "http://localhost:8000/api/v1/kb/articles" \
  -H "Authorization: Bearer $TOKEN"

# Full-text search
curl -X GET "http://localhost:8000/api/v1/kb/articles?query=card" \
  -H "Authorization: Bearer $TOKEN"

# Filter by category
curl -X GET "http://localhost:8000/api/v1/kb/articles?category=Cards" \
  -H "Authorization: Bearer $TOKEN"

# Pagination
curl -X GET "http://localhost:8000/api/v1/kb/articles?page=1&limit=5" \
  -H "Authorization: Bearer $TOKEN"

# Combined
curl -X GET "http://localhost:8000/api/v1/kb/articles?query=loan&category=Loans&page=1&limit=10" \
  -H "Authorization: Bearer $TOKEN"
```

**Response:** `200 OK`
```json
{
  "articles": [
    {
      "id": "33330000-0000-0000-0000-000000000003",
      "tenantId": "00000000-0000-0000-0000-000000000000",
      "title": "Credit Card Limit Increase Process",
      "summary": "How to request a credit card limit increase at TPBank",
      "content": "...",
      "tags": ["credit card", "limit", "increase"],
      "category": "Cards",
      "folderId": null,
      "rating": 4.60,
      "viewCount": 315,
      "createdBy": "uuid",
      "createdAt": "2026-03-12T00:00:00.000Z",
      "updatedAt": "2026-03-12T00:00:00.000Z"
    }
  ],
  "total": 8,
  "page": 1,
  "limit": 20
}
```

---

### 2. Get Article by ID
```
GET /kb/articles/:id
```

> **Note:** Each read increments `viewCount` by 1.

**Example:**
```bash
curl -X GET "http://localhost:8000/api/v1/kb/articles/33330000-0000-0000-0000-000000000003" \
  -H "Authorization: Bearer $TOKEN"
```

**Response:** `200 OK` — Full article object
**Not Found:**
```json
{ "statusCode": 404, "message": "Article not found" }
```

---

### 3. Create Article
```
POST /kb/articles
```

**Body:**

| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| `title` | string | ✅ | 1–500 chars | Article title |
| `content` | string | ✅ | 10–100,000 chars | Article body (Markdown supported) |
| `summary` | string | ❌ | 0–1,000 chars | Short description |
| `tags` | string[] | ❌ | — | Array of tag strings |
| `category` | string | ❌ | — | e.g. `Cards`, `Loans`, `Security` |
| `folderId` | uuid | ❌ | — | Folder UUID to organize under |

**Example:**
```bash
curl -X POST "http://localhost:8000/api/v1/kb/articles" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "title": "How to Reset Internet Banking Password",
    "summary": "Step-by-step guide for TPBank customers",
    "content": "Follow these steps to reset your TPBank Internet Banking password:\n\n1. Visit tpbank.com.vn\n2. Click Forgot Password\n3. Enter your registered phone number\n4. Enter OTP received via SMS\n5. Set a new password (min 8 characters)\n\nFor help, call hotline 1900 58 58 85.",
    "tags": ["password", "internet banking", "reset", "security"],
    "category": "Digital Banking"
  }'
```

**Response:** `201 Created`
```json
{
  "id": "uuid",
  "tenantId": "00000000-0000-0000-0000-000000000000",
  "title": "How to Reset Internet Banking Password",
  "summary": "Step-by-step guide for TPBank customers",
  "content": "...",
  "tags": ["password", "internet banking", "reset", "security"],
  "category": "Digital Banking",
  "folderId": null,
  "rating": null,
  "viewCount": 0,
  "createdBy": "00000000-0000-0000-0000-000000000001",
  "createdAt": "2026-03-13T00:00:00.000Z",
  "updatedAt": "2026-03-13T00:00:00.000Z"
}
```

**Validation errors:** `400 Bad Request` — e.g. title missing, content too short.

---

### 4. Rate Article
```
POST /kb/articles/:id/rate
```

**Body:**

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| `rating` | number | ✅ | Integer 1–5 |

**Example:**
```bash
curl -X POST "http://localhost:8000/api/v1/kb/articles/33330000-0000-0000-0000-000000000003/rate" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"rating": 5}'
```

**Response:** `200 OK` — Updated article with new average rating.

> Rating is stored as a running average. Each call updates the stored rating using: `newRating = (currentRating + rating) / 2`

**Validation:** `400 Bad Request` if `rating < 1` or `rating > 5`.

---

### 5. Bookmark Article
```
POST /kb/bookmarks
```

**Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `articleId` | uuid | ✅ | Article UUID to bookmark |

**Example:**
```bash
curl -X POST "http://localhost:8000/api/v1/kb/bookmarks" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"articleId": "33330000-0000-0000-0000-000000000003"}'
```

**Response:** `201 Created`
```json
{
  "id": "uuid",
  "articleId": "33330000-0000-0000-0000-000000000003",
  "userId": "00000000-0000-0000-0000-000000000001",
  "createdAt": "2026-03-13T00:00:00.000Z"
}
```

> **Idempotent** — bookmarking the same article twice returns the existing bookmark (no duplicate created).

---

### 6. Get My Bookmarks
```
GET /kb/bookmarks
```

Returns all bookmarks of the currently logged-in user (from JWT token).

**Example:**
```bash
curl -X GET "http://localhost:8000/api/v1/kb/bookmarks" \
  -H "Authorization: Bearer $TOKEN"
```

**Response:** `200 OK` — Array of bookmarks with nested article data.

---

## Article Object Schema

```json
{
  "id": "uuid",
  "tenantId": "uuid",
  "title": "string (1–500 chars)",
  "summary": "string | null",
  "content": "string (Markdown)",
  "tags": ["string"],
  "category": "string | null",
  "folderId": "uuid | null",
  "rating": 4.60,
  "viewCount": 315,
  "createdBy": "uuid",
  "createdAt": "timestamp",
  "updatedAt": "timestamp"
}
```

---

## Categories (Seeded)

| Category | Description |
|----------|-------------|
| `Cards` | Credit/debit card operations |
| `Savings` | Savings account products |
| `Loans` | Home/personal/business loans |
| `Security` | PIN reset, account security |
| `Digital Banking` | Mobile app, internet banking |
| `Complaints` | Dispute & complaint procedures |
| `FX` | Foreign exchange, wire transfers |

---

## Seeded Articles (8 records)

| ID Suffix | Title | Category | Rating | Views |
|-----------|-------|----------|--------|-------|
| `...0001` | TPBank Savings Account Interest Rates 2026 | Savings | 4.80 | 245 |
| `...0002` | Home Loan Products & Interest Rates | Loans | 4.70 | 189 |
| `...0003` | Credit Card Limit Increase Process | Cards | 4.60 | 315 |
| `...0004` | ATM Fee Dispute Resolution Procedure | Complaints | 4.90 | 98 |
| `...0005` | Mobile App Login Troubleshooting | Digital Banking | 4.50 | 156 |
| `...0006` | Emergency Card Replacement Procedure | Cards | 4.70 | 203 |
| `...0007` | PIN Reset & Account Unlock Process | Security | 4.80 | 178 |
| `...0008` | FX Rates & International Wire Transfer | FX | 4.40 | 89 |

---

## Quick Test Script

```bash
# 1. Login
TOKEN=$(curl -s -X POST "http://localhost:8000/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"Admin@123"}' \
  | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)

# 2. List articles
curl -s "http://localhost:8000/api/v1/kb/articles" \
  -H "Authorization: Bearer $TOKEN"

# 3. Search
curl -s "http://localhost:8000/api/v1/kb/articles?query=card&limit=5" \
  -H "Authorization: Bearer $TOKEN"

# 4. Read single
curl -s "http://localhost:8000/api/v1/kb/articles/33330000-0000-0000-0000-000000000003" \
  -H "Authorization: Bearer $TOKEN"

# 5. Create article
curl -s -X POST "http://localhost:8000/api/v1/kb/articles" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "title": "New KB Article",
    "content": "Article content goes here (min 10 chars).",
    "category": "Digital Banking",
    "tags": ["tag1", "tag2"]
  }'

# 6. Rate article
curl -s -X POST "http://localhost:8000/api/v1/kb/articles/33330000-0000-0000-0000-000000000003/rate" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"rating": 5}'

# 7. Bookmark
curl -s -X POST "http://localhost:8000/api/v1/kb/bookmarks" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"articleId": "33330000-0000-0000-0000-000000000003"}'

# 8. Get my bookmarks
curl -s "http://localhost:8000/api/v1/kb/bookmarks" \
  -H "Authorization: Bearer $TOKEN"
```

---

## Test Results (2026-03-13)

| Operation | Status |
|-----------|--------|
| List articles | ✅ 8 seeded articles returned |
| Search `?query=card` | ✅ ILIKE full-text search works |
| Filter `?category=Cards` | ✅ Category filter works |
| Pagination `?page=1&limit=3` | ✅ Returns exactly 3 results |
| Read by ID | ✅ viewCount incremented on each read |
| Create article | ✅ Saved with JWT user as `createdBy` |
| Rate (1–5) | ✅ Average calculated and stored |
| Validation rating > 5 | ✅ Returns `400 Bad Request` |
| Bookmark article | ✅ Idempotent (no duplicates) |
| Get bookmarks | ✅ Returns user's bookmarks |
| 404 unknown article | ✅ Returns `404 Not Found` |

---

## Bugs Fixed (2026-03-13)

| Bug | Fix |
|-----|-----|
| Double URL prefix (`/api/v1/api/v1/kb/...`) | `@Controller('api/v1/kb')` → `@Controller('kb')` |
| Wrong `tenantId` hardcoded | Read from JWT `user.tenantId`, fallback `00000000-...` |
| Pagination `400` on `?page=1&limit=3` | Added `enableImplicitConversion: true` to `ValidationPipe` |
| Wrong `userId` hardcoded | Read from JWT `user.sub`, fallback to admin UUID |
