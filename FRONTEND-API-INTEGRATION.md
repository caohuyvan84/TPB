# Frontend API Integration Guide — Agent Desktop

**Mục đích:** Tài liệu toàn bộ API backend và mapping để thay thế tất cả mock data trên giao diện Agent Desktop bằng real API.

**Kong Gateway:** `http://localhost:8000`
**Auth:** JWT Bearer token từ `POST /api/v1/auth/login`

---

## Credentials

| Username | Password | Role |
|----------|----------|------|
| `admin` | `Admin@123` | admin |
| `agent001` | `Agent@123` | agent |

---

## MỤC LỤC

1. [Auth / Identity Service](#1-auth--identity-service)
2. [Agent Service](#2-agent-service)
3. [Interaction Service](#3-interaction-service)
4. [Ticket Service](#4-ticket-service)
5. [Customer Service](#5-customer-service)
6. [Knowledge Service](#6-knowledge-service)
7. [Notification Service](#7-notification-service)
8. [BFSI Core Service](#8-bfsi-core-service)
9. [AI Service](#9-ai-service)
10. [Media Service](#10-media-service)
11. [CTI Adapter Service](#11-cti-adapter-service)
12. [Object Schema Service](#12-object-schema-service)
13. [Workflow Service](#13-workflow-service)
14. [Audit / Dashboard / Report / Layout / Enrichment Services](#14-other-services)
15. [Mock Data → Real API Mapping](#15-mock-data--real-api-mapping)
16. [Frontend Files Cần Sửa](#16-frontend-files-cần-sửa)

---

## 1. Auth / Identity Service

**Port:** 3001 | **Kong:** `http://localhost:8000/api/v1/auth`

### Endpoints

| Method | Path | Mô tả | Request Body | Response |
|--------|------|--------|-------------|----------|
| POST | `/api/v1/auth/login` | Đăng nhập | `{ username, password }` | `{ accessToken, refreshToken, user }` |
| POST | `/api/v1/auth/refresh` | Refresh token | `{ refreshToken }` | `{ accessToken, refreshToken }` |
| POST | `/api/v1/auth/logout` | Đăng xuất | — | `{ message }` |
| GET | `/api/v1/users/me` | Lấy thông tin user hiện tại | — | User object |

### User Object
```json
{
  "id": "uuid",
  "username": "admin",
  "fullName": "System Administrator",
  "email": "admin@tpbank.com.vn",
  "roles": ["admin"],
  "tenantId": "uuid",
  "isActive": true
}
```

### Frontend Files
- `src/lib/api-client.ts` — Axios instance, interceptor tự động refresh token
- `src/lib/api/auth.ts` — API functions
- `src/contexts/AuthContext.tsx` — Auth state, login/logout

---

## 2. Agent Service

**Port:** 3002 | **Kong:** `http://localhost:8000/api/v1/agents`

### Endpoints

| Method | Path | Mô tả |
|--------|------|--------|
| GET | `/api/v1/agents/me` | Lấy profile agent hiện tại (auto-create nếu chưa có) |
| GET | `/api/v1/agents/me/status` | Lấy channel statuses của agent |
| PUT | `/api/v1/agents/me/status/:channel` | Set status cho 1 channel (`voice`/`email`/`chat`) |
| PUT | `/api/v1/agents/me/status/all` | Set tất cả channels cùng status |
| POST | `/api/v1/agents/me/heartbeat` | Gửi heartbeat (keep-alive) |
| GET | `/api/v1/agents` | Danh sách tất cả agents |
| GET | `/api/v1/agents/:agentId` | Lấy agent profile theo agentId |
| GET | `/api/v1/agents/:agentId/availability` | Check agent available trên channels nào |

### Set Channel Status
```json
// PUT /api/v1/agents/me/status/voice
{ "status": "ready" }             // hoặc "not-ready", "busy", "offline"

// PUT /api/v1/agents/me/status/all
{ "status": "not-ready", "reason": "break" }
```

### AgentProfile Response
```json
{
  "id": "uuid",
  "userId": "uuid",
  "agentId": "AGT001",
  "displayName": "Lê Thị Lan",
  "department": "Customer Service",
  "team": "Team A",
  "skills": ["voice", "chat"],
  "maxConcurrentChats": 3,
  "maxConcurrentEmails": 5,
  "tenantId": "uuid",
  "channelStatuses": [
    { "id": "uuid", "channel": "voice", "status": "ready", "reason": null, "changedAt": "timestamp" }
  ]
}
```

### Thay thế Mock
| Mock hiện tại | File | Thay bằng |
|--------------|------|-----------|
| `EnhancedAgentStatusContext.tsx` — per-channel status state | Context | `GET /agents/me/status` + `PUT /agents/me/status/:channel` |
| `AgentStatusWidget.tsx` — hardcoded agent info | Component | `GET /agents/me` |

### Frontend Files
- `src/lib/api/agents.ts` — API functions
- `src/hooks/useAgents.ts` — `useAgentProfile()`, `useAgentStatus()`, `useAgentList()`

---

## 3. Interaction Service

**Port:** 3003 | **Kong:** `http://localhost:8000/api/v1/interactions`

### Endpoints

| Method | Path | Mô tả |
|--------|------|--------|
| GET | `/api/v1/interactions` | Danh sách interactions (max 50) |
| GET | `/api/v1/interactions?channel=voice&status=active` | Filter by channel/status |
| GET | `/api/v1/interactions/:id` | Chi tiết interaction |
| PUT | `/api/v1/interactions/:id/status` | Cập nhật status |
| POST | `/api/v1/interactions/:id/assign` | Gán agent |
| GET | `/api/v1/interactions/:id/notes` | Lấy notes |
| POST | `/api/v1/interactions/:id/notes` | Thêm note |

### Interaction Object
```json
{
  "id": "uuid",
  "displayId": "INT-2026-001",
  "type": "call | missed-call | email | chat",
  "channel": "voice | email | chat",
  "status": "active | in-progress | waiting | closed",
  "priority": "low | medium | high | urgent",
  "customerId": "uuid",
  "customerName": "Nguyễn Văn An",
  "assignedAgentId": "uuid | null",
  "assignedAgentName": "Lê Thị Lan",
  "subject": "Hỏi về lãi suất vay",
  "tags": ["loan", "inquiry"],
  "isVip": true,
  "direction": "inbound | outbound",
  "metadata": {},
  "slaDueAt": "timestamp | null",
  "slaBreached": false,
  "createdAt": "timestamp",
  "closedAt": "timestamp | null"
}
```

### Note Object
```json
{
  "id": "uuid",
  "interactionId": "uuid",
  "agentId": "uuid",
  "agentName": "Lê Thị Lan",
  "content": "Customer asking about home loan",
  "tag": "inquiry | complaint | callback | technical | payment | general",
  "isPinned": false,
  "createdAt": "timestamp"
}
```

### Thay thế Mock (CRITICAL — nhiều mock nhất)

| Mock hiện tại | File | Thay bằng |
|--------------|------|-----------|
| `mockInteractionsList` (13+ items) | `App.tsx:69-496` | `GET /interactions` |
| `defaultInteraction` | `App.tsx:43-66` | `GET /interactions/:id` |
| `missedCalls` (3 items) | `App.tsx:499-529` | `GET /interactions?type=missed-call` |
| `InteractionList.tsx` — queue filters | Component | `GET /interactions?channel=x&status=y` |
| CallNotes initial data (3 notes) | `CallNotes.tsx:56-85` | `GET /interactions/:id/notes` |
| CallTimeline events (10+ events) | `CallTimeline.tsx:56-200` | `GET /interactions/:id/timeline` (⚠️ chưa implement) |
| Email threads (3 scenarios) | `InteractionDetail.tsx:90-400` | `GET /interactions/:id` + metadata |
| Customer interaction history (14 items) | `CustomerInfoScrollFixed.tsx:88-150` | `GET /customers/:id/interactions` |

### Frontend Files
- `src/lib/api/interactions.ts` — API functions
- `src/lib/interactions-api.ts` — Extended API với type mapping
- `src/lib/mock-interactions.ts` — **XÓA** sau khi integrate
- `src/hooks/useInteractionsApi.ts` — Hooks (đã có fallback to mock)

---

## 4. Ticket Service

**Port:** 3004 | **Kong:** `http://localhost:8000/api/v1/tickets`

### Endpoints

| Method | Path | Mô tả |
|--------|------|--------|
| GET | `/api/v1/tickets` | Danh sách tickets |
| GET | `/api/v1/tickets/:id` | Chi tiết ticket |
| POST | `/api/v1/tickets` | Tạo ticket mới |
| PATCH | `/api/v1/tickets/:id` | Cập nhật ticket |

### Create Ticket
```json
// POST /api/v1/tickets
{
  "title": "Khách hàng phàn nàn phí ATM",
  "customerId": "c0000000-0000-0000-0000-000000000001",
  "description": "Chi tiết...",
  "priority": "high",           // low | medium | high | urgent
  "status": "open",             // open | in-progress | resolved | closed
  "category": "complaint",
  "department": "CS",
  "assignedAgentId": "uuid",
  "interactionId": "uuid"
}
```

### Ticket Response
```json
{
  "id": "uuid",
  "displayId": "TKT-2026-123456",
  "tenantId": "uuid",
  "title": "string",
  "description": "string",
  "status": "open",
  "priority": "high",
  "customerId": "uuid",
  "assignedAgentId": "uuid | null",
  "category": "string | null",
  "department": "string | null",
  "interactionId": "uuid | null",
  "createdAt": "timestamp",
  "updatedAt": "timestamp"
}
```

### Thay thế Mock
| Mock hiện tại | File | Thay bằng |
|--------------|------|-----------|
| `CreateTicketDialog.tsx` — mock submit | Component | `POST /tickets` |
| `TicketDetail.tsx` — mock ticket data | Component | `GET /tickets/:id` |
| Notification `ticketAssignment` | `App.tsx:534-550` | Real notifications from `GET /notifications` |

### Frontend Files
- `src/lib/api/tickets.ts` — API functions
- `src/hooks/useTickets.ts` — `useTickets()`, `useCreateTicket()`, `useUpdateTicket()`

---

## 5. Customer Service

**Port:** 3005 | **Kong:** `http://localhost:8000/api/v1/customers`

### Endpoints

| Method | Path | Mô tả |
|--------|------|--------|
| GET | `/api/v1/customers` | Danh sách (max 50) |
| GET | `/api/v1/customers?q=Nguyen` | Tìm kiếm (ILIKE: fullName, cif, email, phone) |
| GET | `/api/v1/customers/:id` | Chi tiết customer |
| GET | `/api/v1/customers/:id/interactions` | Lịch sử interactions |
| GET | `/api/v1/customers/:id/notes` | Danh sách notes |
| POST | `/api/v1/customers/:id/notes` | Thêm note |

### Customer Object
```json
{
  "id": "uuid",
  "cif": "CIF001",
  "fullName": "Nguyễn Văn An",
  "email": "nguyen.van.an@email.com",
  "phone": "0901234567",
  "segment": "Premium | Standard | VIP | Corporate | Private",
  "isVip": true,
  "satisfactionRating": 5,
  "dynamicFields": {},
  "createdAt": "timestamp"
}
```

### Thay thế Mock

| Mock hiện tại | File | Thay bằng |
|--------------|------|-----------|
| Mock customer profile | `CustomerInfoScrollFixed.tsx:61-85` | `GET /customers/:id` |
| Mock interaction history (14 items) | `CustomerInfoScrollFixed.tsx:88-150` | `GET /customers/:id/interactions` |
| Mock customer notes (3 items) | `CustomerInfoScrollFixed.tsx:155-180` | `GET /customers/:id/notes` |
| Mock customer database (7 items) | `CustomerSelection.tsx:54-149` | `GET /customers?q=search` |

### Frontend Files
- `src/lib/api/customers.ts` — API functions
- `src/hooks/useCustomers.ts` — `useCustomer()`, `useCustomerSearch()`, `useAddCustomerNote()`

---

## 6. Knowledge Service

**Port:** 3007 | **Kong:** `http://localhost:8000/api/v1/kb`

### Endpoints

| Method | Path | Mô tả |
|--------|------|--------|
| GET | `/api/v1/kb/articles` | Danh sách articles (paginated) |
| GET | `/api/v1/kb/articles?query=card&category=Cards` | Tìm kiếm |
| GET | `/api/v1/kb/articles?page=1&limit=10` | Phân trang |
| GET | `/api/v1/kb/articles/:id` | Chi tiết article (tăng viewCount) |
| POST | `/api/v1/kb/articles` | Tạo article |
| POST | `/api/v1/kb/articles/:id/rate` | Đánh giá (1-5) |
| POST | `/api/v1/kb/bookmarks` | Bookmark article |
| GET | `/api/v1/kb/bookmarks` | Danh sách bookmarks |

### Article Object
```json
{
  "id": "uuid",
  "title": "Credit Card Limit Increase Process",
  "summary": "How to request...",
  "content": "Markdown content...",
  "tags": ["credit card", "limit"],
  "category": "Cards | Savings | Loans | Security | Digital Banking | Complaints | FX",
  "rating": 4.60,
  "viewCount": 315,
  "createdBy": "uuid",
  "createdAt": "timestamp"
}
```

### Thay thế Mock

| Mock hiện tại | File | Thay bằng |
|--------------|------|-----------|
| KnowledgeFolder tree + articles | `KnowledgeBaseSearch.tsx:61-200` | `GET /kb/articles?query=x&category=y` |
| Article detail view | Component | `GET /kb/articles/:id` |
| Bookmark state | Component | `POST /kb/bookmarks` + `GET /kb/bookmarks` |

### Frontend Files
- `src/lib/api/knowledge.ts` — API functions
- `src/lib/knowledge-api.ts` — Extended API
- `src/hooks/useKnowledge.ts` — `useKbArticles()`, `useKbArticle()`, `useBookmarkArticle()`

---

## 7. Notification Service

**Port:** 3006 | **Kong:** `http://localhost:8000/api/v1/notifications`

### Endpoints

| Method | Path | Mô tả |
|--------|------|--------|
| GET | `/api/v1/notifications` | Danh sách notifications |
| GET | `/api/v1/notifications/unread-count` | Số lượng chưa đọc |
| PATCH | `/api/v1/notifications/:id/state` | Cập nhật trạng thái |
| POST | `/api/v1/notifications/mark-all-read` | Đánh dấu tất cả đã đọc |

### Notification Object
```json
{
  "id": "uuid",
  "agentId": "uuid",
  "type": "ticket_assignment | sla_warning | system_alert | schedule",
  "priority": "low | medium | high | urgent",
  "state": "new | viewed | actioned | dismissed",
  "title": "Ticket assigned",
  "message": "You have been assigned ticket TKT-2026-001",
  "actionUrl": "/tickets/uuid",
  "actionLabel": "View Ticket",
  "metadata": {},
  "autoHideSeconds": 10,
  "expiresAt": "timestamp | null",
  "createdAt": "timestamp"
}
```

### Thay thế Mock

| Mock hiện tại | File | Thay bằng |
|--------------|------|-----------|
| `ticketAssignment` notification | `App.tsx:534-544` | `GET /notifications` |
| `ticketDue` notification | `App.tsx:545-554` | `GET /notifications` |
| `systemAlert` notification | `App.tsx:555-562` | `GET /notifications` |
| `scheduleReminder` notification | `App.tsx:563-570` | `GET /notifications` |
| `NotificationCenter.tsx` — mock data | Component | `GET /notifications` + WebSocket |

### WebSocket Channel
```typescript
// notification-channel.ts
// Events: notification:new, notification:updated, notification:deleted
```

### Frontend Files
- `src/lib/api/notifications.ts` — API functions
- `src/lib/notifications-api.ts` — Extended API
- `src/lib/notification-channel.ts` — WebSocket real-time
- `src/hooks/useNotifications.ts` — `useNotificationsApi()`, `useUnreadCount()`, `useRealtimeNotifications()`

---

## 8. BFSI Core Service

**Port:** 3008 | **Kong:** `http://localhost:8000/api/v1/bfsi`

### Endpoints

| Method | Path | Mô tả |
|--------|------|--------|
| GET | `/api/v1/bfsi/customers/:cif/products` | Sản phẩm ngân hàng theo CIF |
| GET | `/api/v1/bfsi/customers/:cif/products?type=account` | Filter theo loại |
| GET | `/api/v1/bfsi/customers/:cif/transactions?accountNumber=xxx&limit=20` | Lịch sử giao dịch |
| GET | `/api/v1/bfsi/health/circuit-breaker` | Circuit breaker status |

### Product Types
- `account` — Tài khoản thanh toán
- `savings` — Tài khoản tiết kiệm
- `loan` — Khoản vay
- `card` — Thẻ tín dụng/ghi nợ
- `digital_banking` — Ngân hàng số
- `payments` — Thanh toán
- `investments` — Đầu tư
- `merchant_services` — Dịch vụ merchant

### BankProduct Object
```json
{
  "id": "uuid",
  "customerId": "uuid",
  "type": "account | savings | loan | card",
  "accountNumber": "***1234",
  "balance": "50000000",
  "status": "active",
  "currency": "VND",
  "openedAt": "timestamp",
  "dynamicFields": {
    "interestRate": 6.5,
    "term": 12,
    "maturityDate": "2027-03-01"
  }
}
```

### Thay thế Mock (HIGH PRIORITY)

| Mock hiện tại | File | Thay bằng |
|--------------|------|-----------|
| Cards, Loans, Insurance, Claims (8 items) | `CoreBFSI.tsx:45-138` | `GET /bfsi/customers/:cif/products?type=card` etc. |
| 8 product categories | `InformationQuery.tsx:100-200` | `GET /bfsi/customers/:cif/products` grouped by type |
| Transaction history | `InformationQuery.tsx` | `GET /bfsi/customers/:cif/transactions` |

### Frontend Files
- `src/lib/api/bfsi.ts` — API functions
- `src/lib/bfsi-api.ts` — Extended API với type definitions
- `src/hooks/useBFSI.ts` — `useBankAccounts()`, `useLoanProducts()`, `useCardProducts()`, `useTransactions()`

---

## 9. AI Service

**Port:** 3009 | **Kong:** `http://localhost:8000/api/v1/ai`

### Endpoints

| Method | Path | Mô tả | Request Body |
|--------|------|--------|-------------|
| POST | `/api/v1/ai/suggest` | Gợi ý trả lời | `{ context: string (1-5000), interactionId?: string }` |
| POST | `/api/v1/ai/summarize` | Tóm tắt cuộc hội thoại | `{ text: string (1-10000) }` |
| POST | `/api/v1/ai/sentiment` | Phân tích cảm xúc | `{ text: string (1-5000) }` |
| POST | `/api/v1/ai/classify` | Phân loại nội dung | `{ text: string (1-5000) }` |

### Frontend Files
- `src/lib/api/ai.ts` — API functions
- `src/lib/ai-api.ts` — Extended API (suggest, summarize, sentiment, classify, generate)
- `src/hooks/useAI.ts` — `useAiSuggest()`, `useAiSummarize()`, `useAiClassify()`, `useAiSentiment()`
- `src/components/ai-assistant/` — AI assistant UI components

---

## 10. Media Service

**Port:** 3010 | **Kong:** `http://localhost:8000/api/v1/media`

### Endpoints

| Method | Path | Mô tả |
|--------|------|--------|
| POST | `/api/v1/media/upload` | Upload file (multipart) |
| GET | `/api/v1/media/:id/url` | Lấy presigned URL |
| GET | `/api/v1/media/recordings/:interactionId` | Danh sách recordings |
| GET | `/api/v1/media/recordings/:id/stream` | Stream recording |

### Recording Object
```json
{
  "id": "uuid",
  "interactionId": "uuid",
  "duration": 320,
  "recordingStart": "timestamp",
  "recordingEnd": "timestamp",
  "streamUrl": "presigned-url"
}
```

### Thay thế Mock

| Mock hiện tại | File | Thay bằng |
|--------------|------|-----------|
| Recording URL/metadata | `App.tsx:55-64` (defaultInteraction.recording) | `GET /media/recordings/:interactionId` |
| Attachment URLs in emails | `InteractionDetail.tsx` | `GET /media/:id/url` |

### Frontend Files
- `src/lib/api/media.ts` — API functions
- `src/lib/media-api.ts` — Extended API
- `src/hooks/useMedia.ts` — `useRecordings()`, `useFileUrl()`, `useUploadFile()`

---

## 11. CTI Adapter Service

**Port:** 3019 | **Kong:** `http://localhost:8000/api/v1/cti`

### Endpoints

| Method | Path | Mô tả |
|--------|------|--------|
| POST | `/api/v1/cti/calls/answer` | Trả lời cuộc gọi |
| POST | `/api/v1/cti/calls/hangup` | Kết thúc cuộc gọi |
| POST | `/api/v1/cti/calls/hold` | Giữ cuộc gọi |
| POST | `/api/v1/cti/calls/transfer` | Chuyển cuộc gọi |
| GET | `/admin/cti/config` | Cấu hình CTI |
| PATCH | `/admin/cti/config` | Cập nhật cấu hình |

### Call Control
```json
// POST /api/v1/cti/calls/answer
{ "callId": "uuid" }

// POST /api/v1/cti/calls/transfer
{ "callId": "uuid", "destination": "+84901234567" }
```

### WebSocket Channel
```typescript
// cti-channel.ts — Real-time call events
// Events: call:incoming, call:answered, call:ended, call:transferred, call:held, call:resumed
```

### Thay thế Mock

| Mock hiện tại | File | Thay bằng |
|--------------|------|-----------|
| `CallContext.tsx` — mock call state | Context | WebSocket `call:incoming` + REST `/cti/calls/answer` |
| `FloatingCallWidget.tsx` — mock controls | Component | REST `/cti/calls/hold|hangup|transfer` |
| `TransferCallDialog.tsx` — mock transfer | Component | REST `/cti/calls/transfer` |

### Frontend Files
- `src/lib/api/cti.ts` — API functions (⚠️ chưa tồn tại, cần tạo thêm)
- `src/lib/cti-api.ts` — Extended API
- `src/lib/cti-channel.ts` — WebSocket real-time
- `src/hooks/useCTI.ts` — `useAnswerCall()`, `useHangupCall()`, `useRealtimeCti()`

---

## 12. Object Schema Service

**Port:** 3013 | **Kong:** `http://localhost:8000/api/v1`

### Endpoints

| Method | Path | Mô tả |
|--------|------|--------|
| GET | `/api/v1/object-types` | Danh sách object types |
| POST | `/api/v1/object-types` | Tạo object type mới |
| POST | `/api/v1/object-types/:id/fields` | Thêm field definition |
| GET | `/api/v1/schemas/:objectType` | Lấy schema (cho rendering) |

### ObjectType
```json
{
  "id": "uuid",
  "name": "interaction",
  "displayName": "Interaction",
  "displayNamePlural": "Interactions",
  "icon": "phone",
  "version": 1,
  "isSystem": true
}
```

---

## 13. Workflow Service

**Port:** 3015 | **Kong:** `http://localhost:8000/api/v1/workflows`

### Endpoints

| Method | Path | Mô tả |
|--------|------|--------|
| GET | `/api/v1/workflows` | Danh sách workflows |
| POST | `/api/v1/workflows` | Tạo workflow |
| GET | `/api/v1/workflows/:id` | Chi tiết |
| PUT | `/api/v1/workflows/:id` | Cập nhật |
| DELETE | `/api/v1/workflows/:id` | Xóa |
| POST | `/api/v1/workflows/:id/activate` | Kích hoạt |
| POST | `/api/v1/workflows/:id/deactivate` | Tắt |
| POST | `/api/v1/workflows/:id/trigger` | Trigger thủ công |
| GET | `/api/v1/workflows/:id/executions` | Lịch sử chạy |

---

## 14. Other Services

### Audit Service (Port 3011)
| Method | Path | Mô tả |
|--------|------|--------|
| GET | `/api/v1/audit/logs` | Query audit logs |
| POST | `/api/v1/audit/log` | Tạo audit entry |
| GET | `/api/v1/audit/verify-chain` | Verify hash chain |

### Dashboard Service (Port 3017)
| Method | Path | Mô tả |
|--------|------|--------|
| GET | `/api/v1/dashboards` | Danh sách dashboards |
| POST | `/api/v1/dashboards` | Tạo dashboard |
| POST | `/api/v1/dashboards/:id/widgets` | Thêm widget |
| GET | `/api/v1/dashboards/widgets/:id/data` | Lấy dữ liệu widget |

### Report Service (Port 3018)
| Method | Path | Mô tả |
|--------|------|--------|
| GET | `/api/v1/reports` | Danh sách reports |
| POST | `/api/v1/reports/:id/embed-token` | Tạo Superset guest token |

### Layout Service (Port 3014)
| Method | Path | Mô tả |
|--------|------|--------|
| GET | `/api/v1/layouts/:objectType/:context` | Lấy layout config |
| GET | `/admin/layouts` | Danh sách layouts (admin) |
| POST | `/admin/layouts` | Tạo layout |

### Data Enrichment Service (Port 3016)
| Method | Path | Mô tả |
|--------|------|--------|
| GET | `/api/v1/enrichment/sources` | Danh sách sources |
| POST | `/api/v1/enrichment/request` | Yêu cầu enrichment |
| GET | `/api/v1/enrichment/status/:id` | Trạng thái request |

---

## 15. Mock Data → Real API Mapping

### Priority 1: CRITICAL (App không chạy được nếu thiếu)

| # | Component | Mock Location | Real API | Service |
|---|-----------|--------------|----------|---------|
| 1 | **Interaction List** (left panel) | `App.tsx:69-496` (`mockInteractionsList`) | `GET /interactions` | MS-3 |
| 2 | **Customer Profile** (right panel) | `CustomerInfoScrollFixed.tsx:61-85` | `GET /customers/:id` | MS-5 |
| 3 | **Missed Calls** | `App.tsx:499-529` | `GET /interactions?channel=voice&status=missed` | MS-3 |
| 4 | **Agent Status** | `EnhancedAgentStatusContext.tsx` | `GET /agents/me` + `GET /agents/me/status` | MS-2 |

### Priority 2: HIGH (Core features)

| # | Component | Mock Location | Real API | Service |
|---|-----------|--------------|----------|---------|
| 5 | **Call Notes** | `CallNotes.tsx:56-85` | `GET /interactions/:id/notes` | MS-3 |
| 6 | **Call Timeline** | `CallTimeline.tsx:56-200` | `GET /interactions/:id/timeline` | MS-3 |
| 7 | **Email Threads** | `InteractionDetail.tsx:90-400` | `GET /interactions/:id` (metadata) | MS-3 |
| 8 | **Customer Notes** | `CustomerInfoScrollFixed.tsx:155-180` | `GET /customers/:id/notes` | MS-5 |
| 9 | **Customer History** | `CustomerInfoScrollFixed.tsx:88-150` | `GET /customers/:id/interactions` | MS-5 |
| 10 | **Customer Search** | `CustomerSelection.tsx:54-149` | `GET /customers?q=search` | MS-5 |
| 11 | **Knowledge Base** | `KnowledgeBaseSearch.tsx:61-200` | `GET /kb/articles?query=x` | MS-7 |
| 12 | **BFSI Products** | `CoreBFSI.tsx:45-138` | `GET /bfsi/customers/:cif/products` | MS-8 |
| 13 | **BFSI Info Query** | `InformationQuery.tsx:100-200` | `GET /bfsi/customers/:cif/products?type=x` | MS-8 |
| 14 | **Notifications** | `App.tsx:532-571` | `GET /notifications` | MS-6 |
| 15 | **Ticket Create** | `CreateTicketDialog.tsx` | `POST /tickets` | MS-4 |

### Priority 3: MEDIUM (Enhancement features)

| # | Component | Mock Location | Real API | Service |
|---|-----------|--------------|----------|---------|
| 16 | **Recording Player** | `App.tsx:55-64` | `GET /media/recordings/:interactionId` | MS-10 |
| 17 | **Chat Timeline** | `ChatTimeline.tsx` | `GET /interactions/:id` (chat messages) | MS-3 |
| 18 | **AI Suggestions** | `ai-assistant/` | `POST /ai/suggest` | MS-9 |
| 19 | **Call Controls** | `FloatingCallWidget.tsx` | `POST /cti/calls/answer\|hangup\|hold` | MS-19 |

---

## 16. Frontend Files Cần Sửa

### Đã có API client (chỉ cần kết nối mock → real)

| File | Trạng thái | Ghi chú |
|------|-----------|---------|
| `src/lib/api-client.ts` | ✅ Sẵn sàng | Axios + JWT interceptor |
| `src/lib/query-client.ts` | ✅ Sẵn sàng | TanStack Query config |
| `src/lib/api/auth.ts` | ✅ Sẵn sàng | Login/refresh/logout |
| `src/lib/api/agents.ts` | ✅ Sẵn sàng | Agent profile + status |
| `src/lib/api/interactions.ts` | ✅ Sẵn sàng | CRUD + notes |
| `src/lib/api/tickets.ts` | ✅ Sẵn sàng | CRUD + comments |
| `src/lib/api/customers.ts` | ✅ Sẵn sàng | Search + notes |
| `src/lib/api/knowledge.ts` | ✅ Sẵn sàng | Articles + bookmarks |
| `src/lib/api/notifications.ts` | ✅ Sẵn sàng | CRUD + mark-all-read |
| `src/lib/api/bfsi.ts` | ✅ Sẵn sàng | Products + transactions |
| `src/lib/api/ai.ts` | ✅ Sẵn sàng | Suggest/summarize/classify |
| `src/lib/api/media.ts` | ✅ Sẵn sàng | Upload + recordings |
| `src/hooks/useAgents.ts` | ✅ Sẵn sàng | React Query hooks |
| `src/hooks/useInteractionsApi.ts` | ✅ Sẵn sàng | Hooks + mock fallback |
| `src/hooks/useTickets.ts` | ✅ Sẵn sàng | CRUD hooks |
| `src/hooks/useCustomers.ts` | ✅ Sẵn sàng | Search + note hooks |
| `src/hooks/useKnowledge.ts` | ✅ Sẵn sàng | Article hooks |
| `src/hooks/useNotifications.ts` | ✅ Sẵn sàng | + real-time hook |
| `src/hooks/useBFSI.ts` | ✅ Sẵn sàng | Product hooks |
| `src/hooks/useAI.ts` | ✅ Sẵn sàng | AI mutation hooks |
| `src/hooks/useMedia.ts` | ✅ Sẵn sàng | Recording hooks |
| `src/hooks/useCTI.ts` | ✅ Sẵn sàng | Call control hooks |

### Components cần sửa (xóa mock, dùng hooks)

| File | Thay đổi cần thiết |
|------|-------------------|
| `src/App.tsx` | Xóa `mockInteractionsList` (line 69-496), `missedCalls` (499-529), `sampleNotifications` (532-571). Dùng `useInteractions()` hook thay thế |
| `src/components/CustomerInfoScrollFixed.tsx` | Xóa mock customer (61-85), history (88-150), notes (155-180). Dùng `useCustomer()`, `useCustomerInteractions()`, `useCustomerNotes()` |
| `src/components/CallNotes.tsx` | Xóa mock initialNotes (56-85). Dùng `useInteractionNotes()` |
| `src/components/CallTimeline.tsx` | Xóa mock events (56-200). Dùng `useInteractionTimeline()` |
| `src/components/CoreBFSI.tsx` | Xóa mock cards/loans/insurance/claims (45-138). Dùng `useBankAccounts()`, `useLoanProducts()`, `useCardProducts()` |
| `src/components/InformationQuery.tsx` | Xóa mock product arrays (100-200). Dùng BFSI hooks theo CIF |
| `src/components/KnowledgeBaseSearch.tsx` | Xóa mock folders/articles (61-200). Dùng `useKbArticles()` |
| `src/components/CustomerSelection.tsx` | Xóa mock customer database (54-149). Dùng `useCustomerSearch()` |
| `src/components/InteractionDetail.tsx` | Xóa `getEmailData()` (90-400). Load email data từ interaction metadata |
| `src/lib/mock-interactions.ts` | **XÓA FILE** — không cần sau khi integrate |

### Env Variables cần set

```env
# apps/agent-desktop/.env.development
VITE_API_BASE_URL=http://localhost:8000
VITE_WS_URL=http://localhost:8000
```

---

## Seeded Data Summary

| Service | Data | Count |
|---------|------|-------|
| Identity | Users | 2 (admin, agent001) |
| Agent | Agent profiles | 10 |
| Interaction | Interactions | 12 |
| Ticket | Tickets | 15 |
| Customer | Customers | 12 |
| Knowledge | KB Articles | 8 (+ 3 tạo mới = 11) |
| Workflow | Workflows | 2 |
| Object Schema | Object Types | 2 |
| Notification | Notifications | 0 (cần seed hoặc tạo via API) |
| BFSI | Bank Products | (cần check) |

---

## Test toàn bộ API

```bash
# Login
TOKEN=$(curl -s -X POST "http://localhost:8000/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"Admin@123"}' \
  | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)

# Test tất cả services
echo "Auth:         $(curl -s http://localhost:8000/api/v1/users/me -H "Authorization: Bearer $TOKEN" | python3 -c 'import json,sys; print(json.load(sys.stdin).get("username","FAIL"))')"
echo "Agents:       $(curl -s http://localhost:8000/api/v1/agents -H "Authorization: Bearer $TOKEN" | python3 -c 'import json,sys; print(len(json.load(sys.stdin)))')"
echo "Interactions: $(curl -s http://localhost:8000/api/v1/interactions -H "Authorization: Bearer $TOKEN" | python3 -c 'import json,sys; print(len(json.load(sys.stdin)))')"
echo "Tickets:      $(curl -s http://localhost:8000/api/v1/tickets -H "Authorization: Bearer $TOKEN" | python3 -c 'import json,sys; print(len(json.load(sys.stdin)))')"
echo "Customers:    $(curl -s http://localhost:8000/api/v1/customers -H "Authorization: Bearer $TOKEN" | python3 -c 'import json,sys; print(len(json.load(sys.stdin)))')"
echo "KB Articles:  $(curl -s http://localhost:8000/api/v1/kb/articles -H "Authorization: Bearer $TOKEN" | python3 -c 'import json,sys; print(json.load(sys.stdin).get("total",0))')"
echo "Workflows:    $(curl -s http://localhost:8000/api/v1/workflows -H "Authorization: Bearer $TOKEN" | python3 -c 'import json,sys; print(len(json.load(sys.stdin)))')"
echo "Notifications:$(curl -s http://localhost:8000/api/v1/notifications -H "Authorization: Bearer $TOKEN" | python3 -c 'import json,sys; d=json.load(sys.stdin); print(len(d) if isinstance(d,list) else d.get("total",0))')"
```
