# WORKFLOW SERVICE (MS-15) — Tài Liệu Toàn Diện

> **Ngày tạo:** 2026-03-15
> **Phiên bản tài liệu:** 1.0
> **Trạng thái service:** Scaffolding hoàn chỉnh — Execution engine chưa implement

---

## Mục Lục

1. [Tổng Quan Module](#1-tổng-quan-module)
2. [Yêu Cầu Nghiệp Vụ](#2-yêu-cầu-nghiệp-vụ)
3. [Trạng Thái Triển Khai Thực Tế](#3-trạng-thái-triển-khai-thực-tế)
4. [Database Schema](#4-database-schema)
5. [API Endpoints Chi Tiết](#5-api-endpoints-chi-tiết)
6. [Cấu Trúc Dữ Liệu Nội Bộ](#6-cấu-trúc-dữ-liệu-nội-bộ)
7. [Luồng Hoạt Động](#7-luồng-hoạt-động)
8. [Kiến Trúc Kỹ Thuật](#8-kiến-trúc-kỹ-thuật)
9. [Gap Analysis — Tính Năng Cần Bổ Sung](#9-gap-analysis--tính-năng-cần-bổ-sung)
10. [Vấn Đề Cần Giải Quyết](#10-vấn-đề-cần-giải-quyết)
11. [Kong Gateway Configuration](#11-kong-gateway-configuration)
12. [Testing](#12-testing)
13. [Verification Checklist](#13-verification-checklist)

---

## 1. Tổng Quan Module

| Thuộc tính | Giá trị |
|------------|---------|
| **Service ID** | MS-15 |
| **Tên** | Workflow Service |
| **Port** | 3015 (direct) |
| **API Gateway** | Kong port 8000 |
| **Database** | `workflow_db` (PostgreSQL 16) |
| **API Prefix** | `/api/v1` |
| **Vị trí** | `services/workflow-service/` |
| **Phase** | Phase 3 (Automation & Analytics) |

**Mục đích:** Tự động hóa nghiệp vụ dựa trên sự kiện (event-driven), lịch (cron), kích hoạt thủ công, hoặc webhook — tích hợp Temporal cho durable execution, hỗ trợ SLA automation, auto assignment, và các luồng nghiệp vụ phức tạp trong môi trường contact center ngân hàng.

---

## 2. Yêu Cầu Nghiệp Vụ

*(Nguồn: `FullStack-RequirementsV3.md` & `ImplementationPlan.md`)*

### 2.1 Trigger Types (4 loại kích hoạt)

| Loại | Mô tả | Ví dụ |
|------|--------|-------|
| `event` | Kafka event từ các service khác | `ticket.created`, `sla.breached` |
| `schedule` | Cron expression | `0 9 * * *` (mỗi ngày 9h sáng) |
| `manual` | Admin kích hoạt thủ công qua API | `POST /trigger` |
| `webhook` | HTTP callback từ hệ thống ngoài | `POST /webhook/{workflowId}/{token}` |

**Kafka topics lắng nghe:**
- `agent-events`
- `interaction-events`
- `ticket-events`
- `customer-events`
- `sla-events`

### 2.2 Step Types (18 loại bước)

| Nhóm | Step Types |
|------|-----------|
| **Logic/Control** | `condition`, `switch`, `parallel`, `loop` |
| **Thông báo** | `send_notification`, `send_email`, `send_sms` |
| **Dữ liệu** | `update_object`, `create_ticket` |
| **Agent** | `assign_agent`, `escalate_ticket` |
| **Tích hợp** | `call_webhook`, `call_api` |
| **Thời gian** | `wait`, `wait_for_event` |
| **AI** | `ai_classify`, `ai_generate` |
| **Tùy chỉnh** | `custom` |

### 2.3 Workflow Mẫu Được Định Nghĩa

#### SLA Breach Escalation
```
Trigger: sla.breached (Kafka event)
  → send_notification (supervisor)
  → wait (15 phút)
  → condition (ticket resolved?)
      ├── YES: end
      └── NO: escalate_ticket (level 2)
               → send_sms (supervisor)
```

#### Auto Assignment
```
Trigger: ticket.created (Kafka event)
  → assign_agent (strategy: round_robin, skill_match)
  → send_notification (assigned agent)
  → update_object (ticket.assignedAt = now())
```

#### VIP Customer Routing
```
Trigger: customer.vip.detected (Kafka event)
  → assign_agent (strategy: senior_only)
  → send_notification (priority channel)
```

### 2.4 Error Handling Strategies

| Strategy | Mô tả |
|----------|-------|
| `retry` | Thử lại với exponential backoff (max 3 lần) |
| `skip` | Bỏ qua bước lỗi, tiếp tục workflow |
| `fail_workflow` | Dừng toàn bộ workflow, đánh dấu `failed` |
| `compensate` | Chạy bước rollback (compensation step) |

### 2.5 Performance Targets

| Metric | Target |
|--------|--------|
| Step execution P99 | < 500ms (trừ external calls và wait steps) |
| Concurrent executions | 100+ |
| Event deduplication | Redis, TTL 24h (key: `eventId:workflowId`) |

---

## 3. Trạng Thái Triển Khai Thực Tế

### 3.1 Đã Hoàn Thành ✅

| Thành phần | File | Mô tả |
|------------|------|-------|
| Bootstrap | `src/main.ts` | NestJS app, port 3015, ValidationPipe, CORS |
| App module | `src/app/app.module.ts` | TypeORM config, imports WorkflowModule |
| Health check | `src/app/app.controller.ts` | `GET /api/v1/health` → `{ status: 'ok', timestamp }` |
| Entities | `src/entities/` | 3 entities: WorkflowDefinition, WorkflowExecution, WorkflowStepLog |
| Schema (v1) | `src/migrations/schema.sql` | 3 tables cơ bản (không có Temporal fields) |
| Schema (v2) | `migrations/001_init_workflow_schema.sql` | Schema đầy đủ có Temporal fields + indexes |
| Workflow module | `src/workflow/workflow.module.ts` | TypeORM features, DI wiring |
| Workflow service | `src/workflow/workflow.service.ts` | 10 methods, tenant isolation |
| REST controller | `src/workflow/workflow.controller.ts` | 10 endpoints |
| DTOs | `src/workflow/dto/workflow.dto.ts` | 4 DTOs với class-validator |
| Mock Temporal | `src/temporal/mock-temporal.ts` | MockTemporalClient + MockActivityExecutor |
| Unit tests | `src/workflow/workflow.service.spec.ts` | 9 test cases (mocked repos) |

### 3.2 Còn Thiếu / Placeholder ⚠️

| Thành phần | Trạng thái | Chi tiết |
|------------|-----------|---------|
| **Temporal integration** | Stub tồn tại, không được gọi | `MockTemporalClient` có nhưng không được inject vào `WorkflowService` |
| **Step execution engine** | Không có | `triggerWorkflow()` chỉ tạo DB record, không chạy bất kỳ step nào |
| **Activity workers** | Không có | 18 step types chưa có implementation thực tế |
| **Step log persistence** | Không có | `WorkflowStepLog` entity tồn tại nhưng không được ghi sau khi chạy step |
| **Kafka consumer** | Không có | Event-triggered workflows hoàn toàn không hoạt động |
| **Cron scheduler** | Không có | Schedule-triggered workflows không hoạt động |
| **Webhook endpoint** | Không có | Không có route `/webhook/:workflowId/:token` |
| **Error recovery** | Không có | Retry, skip, compensate chưa implement |
| **RBAC decorators** | Không có | Không có `@Roles()` hay `@UseGuards(JwtAuthGuard)` trên controller |
| **Audit logging** | Không có | Không emit Kafka event cho mutations (create/update/delete/trigger) |
| **Vault integration** | Không có | Credentials cho `call_webhook`/`call_api` steps chưa có |
| **Pagination** | Không có | `findAll()` và `getExecutions()` không có page/limit |
| **Test endpoint** | Không có | Sandbox mode để test workflow chưa có |
| **Step logs endpoint** | Không có | `GET /executions/:id/logs` chưa có |
| **E2E tests** | Không có | Chỉ có unit tests với mocked repositories |

### 3.3 Discrepancy Quan Trọng — Migration Files Mâu Thuẫn

Có **2 migration files** với schema khác nhau đáng kể:

| Điểm khác biệt | `src/migrations/schema.sql` | `migrations/001_init_workflow_schema.sql` |
|---------------|---------------------------|------------------------------------------|
| Temporal fields | Không có | Có (`temporal_workflow_id`, `temporal_run_id`) |
| `tenant_id` trong executions | Không có | Có |
| Execution input column | `input_data` JSONB | `trigger_event` JSONB |
| Execution output column | `output_data` JSONB | `variables` JSONB |
| Error column | `error_message` TEXT | `error` TEXT |
| `step_type` trong step_logs | Không có | Có |
| Tên input/output | `input_data`, `output_data` | `input`, `output` |
| Indexes | Không có | Có đầy đủ indexes |

**Entity hiện tại (`WorkflowExecution`) match với `src/migrations/schema.sql`** (không có Temporal fields). Tuy nhiên `WorkflowStepLog` entity có field `stepType` nhưng `src/migrations/schema.sql` không có cột `step_type` — **entity-schema mismatch**.

**Khuyến nghị:** Dùng `migrations/001_init_workflow_schema.sql` làm canonical schema, cập nhật entity để thêm Temporal fields và đồng bộ column names.

---

## 4. Database Schema

### 4.1 Schema Hiện Tại (`src/migrations/schema.sql` — đang dùng)

#### Bảng `workflow_definitions`
```sql
id             UUID PRIMARY KEY DEFAULT gen_random_uuid()
tenant_id      UUID NOT NULL
name           VARCHAR NOT NULL
description    TEXT
is_active      BOOLEAN DEFAULT false
version        INTEGER DEFAULT 1
trigger        JSONB NOT NULL
steps          JSONB NOT NULL
variables      JSONB DEFAULT '[]'
error_handling JSONB DEFAULT '{}'
created_by     UUID NOT NULL
created_at     TIMESTAMPTZ DEFAULT NOW()
updated_at     TIMESTAMPTZ DEFAULT NOW()
```

#### Bảng `workflow_executions`
```sql
id             UUID PRIMARY KEY DEFAULT gen_random_uuid()
workflow_id    UUID NOT NULL → workflow_definitions(id) ON DELETE CASCADE
status         VARCHAR NOT NULL        -- running|completed|failed|timed_out|cancelled
input_data     JSONB
output_data    JSONB
error_message  TEXT
started_at     TIMESTAMPTZ DEFAULT NOW()
completed_at   TIMESTAMPTZ
```

#### Bảng `workflow_step_logs`
```sql
id            UUID PRIMARY KEY DEFAULT gen_random_uuid()
execution_id  UUID NOT NULL → workflow_executions(id) ON DELETE CASCADE
step_name     VARCHAR NOT NULL
-- THIẾU: step_type (entity có field này nhưng schema không có cột)
status        VARCHAR NOT NULL        -- success|failed|pending
input_data    JSONB
output_data   JSONB
error_message TEXT
started_at    TIMESTAMPTZ DEFAULT NOW()
completed_at  TIMESTAMPTZ
```

### 4.2 Schema Đích (`migrations/001_init_workflow_schema.sql` — khuyến nghị)

Thêm vào schema hiện tại:
- `workflow_executions.tenant_id UUID NOT NULL`
- `workflow_executions.temporal_workflow_id TEXT UNIQUE NOT NULL`
- `workflow_executions.temporal_run_id TEXT NOT NULL`
- `workflow_executions.trigger_event JSONB` (thay `input_data`)
- `workflow_step_logs.step_type TEXT NOT NULL`
- 6 indexes (tenant, active, temporal_id, status, execution_id)

---

## 5. API Endpoints Chi Tiết

### 5.1 Endpoints Đang Hoạt Động (10 endpoints)

Tất cả routes đều có prefix `/api/v1/` và không có auth guard (dùng fallback DEFAULT_TENANT UUID).

---

#### `GET /api/v1/workflows`
Lấy danh sách workflows theo tenant.

**Headers:** Không bắt buộc (lấy tenant từ JWT `user.tenantId` hoặc fallback)

**Response 200:**
```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "tenantId": "00000000-0000-0000-0000-000000000000",
    "name": "SLA Escalation",
    "description": "Escalate when SLA is breached",
    "isActive": true,
    "version": 1,
    "trigger": { "type": "event", "event": "sla.breached" },
    "steps": [...],
    "variables": {},
    "errorHandling": { "strategy": "retry", "maxRetries": 3 },
    "createdBy": "00000000-0000-0000-0000-000000000001",
    "createdAt": "2026-03-13T10:00:00Z",
    "updatedAt": "2026-03-13T10:00:00Z"
  }
]
```

---

#### `POST /api/v1/workflows`
Tạo workflow mới.

**Request body:**
```json
{
  "name": "Auto Assignment",
  "description": "Auto assign ticket to agent",
  "trigger": {
    "type": "event",
    "event": "ticket.created"
  },
  "steps": [
    {
      "id": "step-1",
      "name": "Assign Agent",
      "type": "assign_agent",
      "config": { "strategy": "round_robin" },
      "onSuccess": "step-2",
      "onFailure": "end",
      "timeout": 30
    },
    {
      "id": "step-2",
      "name": "Notify Agent",
      "type": "send_notification",
      "config": {
        "recipientType": "agent",
        "template": "new_ticket_assigned",
        "channel": "in_app"
      },
      "onSuccess": "end"
    }
  ],
  "variables": { "maxWaitTime": 300 },
  "errorHandling": { "strategy": "retry", "maxRetries": 3 }
}
```

**Response 201:** WorkflowDefinition object (xem cấu trúc GET bên trên)

**Validation (class-validator):**
- `name` — required, string, not empty
- `description` — optional, string
- `trigger` — optional, object
- `steps` — optional (không ràng buộc type cụ thể — cần cải thiện)
- `variables` — optional
- `errorHandling` — optional

---

#### `GET /api/v1/workflows/:id`
Lấy chi tiết 1 workflow theo ID.

**Response 200:** WorkflowDefinition object
**Response 404:** Nếu không tìm thấy hoặc sai tenant

---

#### `PUT /api/v1/workflows/:id`
Cập nhật workflow (partial update qua `Object.assign`).

**Request body:** Bất kỳ field nào từ `UpdateWorkflowDto`
**Response 200:** WorkflowDefinition object đã cập nhật
**Response 404:** Nếu không tìm thấy

---

#### `DELETE /api/v1/workflows/:id`
Xóa workflow (hard delete).

**Response 200:**
```json
{ "message": "Workflow deleted" }
```
**Response 404:** Nếu không tìm thấy

---

#### `POST /api/v1/workflows/:id/activate`
Bật workflow (`isActive = true`).

**Response 200:** WorkflowDefinition object với `isActive: true`
**Response 404:** Nếu không tìm thấy

---

#### `POST /api/v1/workflows/:id/deactivate`
Tắt workflow (`isActive = false`).

**Response 200:** WorkflowDefinition object với `isActive: false`

---

#### `POST /api/v1/workflows/:id/trigger`
Kích hoạt workflow thủ công.

**Request body:**
```json
{
  "eventData": { "ticketId": "uuid", "priority": "high" },
  "variables": { "escalationLevel": 1 }
}
```

**Response 201:**
```json
{
  "id": "exec-uuid",
  "workflowId": "workflow-uuid",
  "status": "running",
  "inputData": { "ticketId": "uuid", "priority": "high" },
  "startedAt": "2026-03-15T09:00:00Z",
  "completedAt": null,
  "errorMessage": null
}
```

> **⚠️ QUAN TRỌNG:** Response luôn là `status: "running"` và **không bao giờ chuyển sang `completed`** vì execution engine chưa được implement. Execution record tồn tại mãi trong DB với trạng thái `running`.

**Validation:**
- Workflow phải tồn tại và `isActive === true`
- Nếu `isActive === false`: throw `NotFoundException('Workflow is not active')`

---

#### `GET /api/v1/workflows/:id/executions`
Lấy lịch sử executions của workflow.

**Response 200:**
```json
[
  {
    "id": "exec-uuid",
    "workflowId": "workflow-uuid",
    "status": "running",
    "inputData": {...},
    "outputData": null,
    "errorMessage": null,
    "startedAt": "2026-03-15T09:00:00Z",
    "completedAt": null
  }
]
```

> **Lưu ý:** Không có pagination, không filter theo tenant (bug: thiếu `tenantId` filter trong query)

---

#### `GET /api/v1/executions/:executionId`
Lấy chi tiết 1 execution.

**Response 200:** WorkflowExecution object
> **Lưu ý:** Route này phải được định nghĩa trước `GET :id` trong controller để tránh conflict. Hiện tại đã đúng thứ tự.

---

### 5.2 Endpoints Được Yêu Cầu Nhưng Chưa Implement

#### `POST /api/v1/admin/workflows/:id/test` *(Chưa có)*
Test workflow với sample data trong sandbox mode (không có side effects thực).

**Request:**
```json
{ "sampleEvent": { "ticketId": "test-id", "priority": "high" } }
```

**Response:**
```json
{
  "executionId": "sandbox-exec-uuid",
  "sandbox": true,
  "steps": [
    { "name": "Assign Agent", "type": "assign_agent", "status": "success", "output": { "agentId": "mock-agent-id" }, "durationMs": 12 },
    { "name": "Notify Agent", "type": "send_notification", "status": "success", "output": { "notificationId": "mock-notif-id" }, "durationMs": 5 }
  ],
  "totalDurationMs": 17
}
```

---

#### `POST /api/v1/workflows/webhook/:workflowId/:token` *(Chưa có)*
Webhook trigger từ hệ thống ngoài.

**Headers:** `X-Signature: sha256=<hmac>` (nếu có secret)
**Request:** Any JSON payload
**Response 200:**
```json
{ "message": "Workflow triggered", "executionId": "uuid" }
```

**Response 401:** Token không hợp lệ
**Response 404:** Workflow không tìm thấy hoặc inactive

---

#### `GET /api/v1/executions/:executionId/logs` *(Chưa có)*
Lấy step-level logs của một execution.

**Response 200:**
```json
[
  {
    "id": "log-uuid",
    "executionId": "exec-uuid",
    "stepName": "Assign Agent",
    "stepType": "assign_agent",
    "status": "success",
    "input": { "strategy": "round_robin" },
    "output": { "agentId": "agent-uuid" },
    "startedAt": "2026-03-15T09:00:00Z",
    "completedAt": "2026-03-15T09:00:00.012Z"
  }
]
```

---

## 6. Cấu Trúc Dữ Liệu Nội Bộ

### 6.1 Trigger Configuration Object
```typescript
interface TriggerConfig {
  type: 'event' | 'schedule' | 'manual' | 'webhook';

  // type === 'event'
  event?: string;           // e.g., "ticket.created", "sla.breached"
  conditions?: Condition[]; // filter conditions trên event payload

  // type === 'schedule'
  cron?: string;            // e.g., "0 9 * * *"
  timezone?: string;        // e.g., "Asia/Ho_Chi_Minh"

  // type === 'webhook'
  token?: string;           // auth token (plain, compare với hash)
  secretHash?: string;      // HMAC-SHA256 secret (lưu trong Vault)
}

interface Condition {
  field: string;    // e.g., "ticket.priority", "customer.segment"
  operator: 'equals' | 'not_equals' | 'contains' | 'gt' | 'lt' |
            'in' | 'not_in' | 'matches' | 'exists';
  value: any;
}
```

### 6.2 Step Definition Object
```typescript
interface WorkflowStep {
  id: string;                   // unique ID trong workflow
  name: string;                 // display name
  type: StepType;               // một trong 18 loại
  config: StepConfig;           // cấu hình theo từng type
  onSuccess?: string;           // ID của step tiếp theo hoặc 'end'
  onFailure?: string;           // ID của step fallback
  timeout?: number;             // seconds (default 30, max 300)
  retryPolicy?: {
    maxRetries: number;         // default 3
    backoffCoefficient: number; // default 2 (exponential)
    initialInterval: number;    // ms (default 1000)
  };
}
```

### 6.3 Step Config Theo Type
```typescript
// assign_agent
{
  strategy: 'round_robin' | 'least_busy' | 'skill_match' | 'senior_only';
  skill?: string;               // skill tag required (for skill_match)
  queue?: string;               // queue name
}

// send_notification
{
  recipientType: 'agent' | 'supervisor' | 'customer' | 'specific';
  recipientId?: string;         // for 'specific'
  template: string;             // template key in Notification Service
  channel: 'in_app' | 'push' | 'both';
  variables?: Record<string, any>; // template variables
}

// send_email
{
  to: string;                   // email hoặc template var "{{customer.email}}"
  subject: string;
  templateId: string;           // email template ID
  variables?: Record<string, any>;
}

// send_sms
{
  to: string;                   // phone hoặc "{{customer.phone}}"
  message: string;              // max 160 chars
}

// condition
{
  expression: string;           // e.g., "{{ticket.status}} == 'resolved'"
  trueStep: string;             // step ID nếu true
  falseStep: string;            // step ID nếu false
}

// wait
{
  duration: number;
  unit: 'seconds' | 'minutes' | 'hours' | 'days';
}

// wait_for_event
{
  event: string;                // Kafka event name
  timeout: number;              // seconds
  conditions?: Condition[];     // filter event
  timeoutStep?: string;         // step ID khi timeout
}

// update_object
{
  objectType: 'ticket' | 'customer' | 'interaction';
  objectId: string;             // hoặc "{{trigger.ticketId}}"
  fields: Record<string, any>;  // fields to update, values có thể là template vars
}

// escalate_ticket
{
  escalationLevel: number;      // 1, 2, 3
  assignTo?: string;            // specific agent ID hoặc null (auto-assign)
  reason?: string;
}

// create_ticket
{
  subject: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  customerId?: string;          // hoặc template var
  channel: string;
}

// call_api / call_webhook
{
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  headers?: Record<string, string>;
  body?: any;                   // có thể chứa template vars
  credentialRef?: string;       // Vault secret path
  responseVariable?: string;    // lưu response vào biến workflow
}

// ai_classify
{
  model: 'claude-haiku-4-5' | 'claude-sonnet-4-6';
  input: string;                // hoặc template var "{{trigger.description}}"
  categories: string[];         // ["billing", "technical", "complaint"]
  outputVariable: string;       // tên biến lưu category
}

// ai_generate
{
  model: 'claude-haiku-4-5' | 'claude-sonnet-4-6';
  prompt: string;               // template string với vars
  outputVariable: string;
  maxTokens?: number;
}

// parallel
{
  branches: WorkflowStep[][];   // mảng của mảng steps, chạy song song
  waitForAll: boolean;          // default true
}

// loop
{
  over: string;                 // biến array "{{trigger.customers}}"
  itemVariable: string;         // "customer"
  steps: WorkflowStep[];        // steps chạy cho mỗi item
  maxIterations?: number;       // giới hạn số lần lặp (default 100)
}

// switch
{
  expression: string;           // biến cần switch
  cases: Array<{ value: any; step: string; }>;
  defaultStep?: string;
}

// custom
{
  handler: string;              // registered custom handler name
  params: Record<string, any>;
}
```

---

## 7. Luồng Hoạt Động

### 7.1 Event-Triggered Workflow (Thiết Kế Đích — Chưa Implement)

```
Kafka Event Published
(e.g., ticket-events: { type: "ticket.created", ticketId: "...", tenantId: "..." })
  │
  ▼
KafkaConsumer.onMessage(event)
  │
  ▼
WorkflowTriggerMatcher.matchEvent(event)
  ├── Load active workflows WHERE trigger->>'type' = 'event'
  │   AND trigger->>'event' = event.type
  │   AND tenant_id = event.tenantId
  ├── Evaluate trigger.conditions (if any) against event payload
  └── Deduplicate: Redis SETNX "dedup:{eventId}:{workflowId}" TTL 24h
  │
  ▼ (for each matching workflow)
Create WorkflowExecution (status: "running", trigger_event: eventPayload)
  │
  ▼
TemporalClient.startWorkflow({
  workflowId: "wf-{workflowDefId}-{executionId}",
  workflowType: "WorkflowExecutorWorkflow",
  taskQueue: "workflow-service",
  args: [{ steps, inputData, errorHandling, executionId }]
})
  │
  ▼
Temporal Worker executes workflow function:
  For each step:
    ActivityExecutor.execute(step, context)
    ├── call appropriate activity (send_notification → NotificationService API)
    ├── update WorkflowStepLog (status, output, timing)
    └── handle error per retryPolicy + errorHandling.strategy
  │
  ▼
Update WorkflowExecution:
  status: "completed" | "failed"
  output_data: { lastStepOutput }
  completed_at: now()
  │
  ▼
Publish Kafka: workflow-events
{ type: "workflow.completed", workflowId, executionId, tenantId, durationMs }
```

### 7.2 Manual Trigger (Hoạt Động Hiện Tại — Không Hoàn Chỉnh)

```
POST /api/v1/workflows/:id/trigger
  │
  ▼
WorkflowService.triggerWorkflow(id, tenantId, dto)
  ├── findOne(id, tenantId)  ← nếu không tìm thấy: 404
  ├── if !workflow.isActive  ← throw NotFoundException
  │
  ▼
executionRepo.create({ workflowId: id, status: 'running', inputData: dto.eventData || dto.variables })
  │
  ▼
executionRepo.save(execution)
  │
  ▼
Return execution object (status: "running" — DỪNG Ở ĐÂY, không chạy steps)
```

**Kết quả:** Execution record tồn tại mãi trong DB với `status = "running"`, `completed_at = null`.

### 7.3 Schedule Trigger (Chưa Implement)

```
NestJS ScheduleModule (node-cron)
  │
  ▼
CronWorker.tick() — mỗi phút
  ├── Load active workflows WHERE trigger->>'type' = 'schedule'
  ├── Parse cron expression
  ├── Check if current time matches cron (trong timezone)
  └── Trigger execution (same as event-triggered, event = null)
```

### 7.4 Webhook Trigger (Chưa Implement)

```
POST /api/v1/workflows/webhook/:workflowId/:token
  │
  ▼
Validate token:
  hash = SHA256(token + secret)
  compare với workflow.trigger.secretHash
  │
  ▼
Same as event-triggered flow (inputData = request body)
```

---

## 8. Kiến Trúc Kỹ Thuật

### 8.1 Stack Hiện Tại

| Layer | Technology | Trạng thái |
|-------|-----------|-----------|
| Framework | NestJS 10 (TypeScript) | ✅ Active |
| ORM | TypeORM với PostgreSQL 16 | ✅ Active |
| Validation | class-validator + class-transformer | ✅ Active |
| Workflow Engine | Temporal (self-hosted) | ❌ Mock only |
| Event Bus | Apache Kafka | ❌ Chưa tích hợp |
| Cache/Dedup | Redis 7 | ❌ Chưa tích hợp |
| Scheduler | NestJS Schedule Module | ❌ Chưa thêm |
| Secrets | HashiCorp Vault | ❌ Chưa tích hợp |
| Auth | JWT Guard | ❌ Chưa có |

### 8.2 Dependency Graph

```
WorkflowService (MS-15)
  ├── calls → Notification Service (MS-6) — via HTTP (send_notification, send_email, send_sms)
  ├── calls → Agent Service (MS-2)        — via HTTP (assign_agent)
  ├── calls → Ticket Service (MS-4)       — via HTTP (create_ticket, escalate_ticket, update_object)
  ├── calls → Customer Service (MS-5)     — via HTTP (update_object customer)
  ├── calls → AI Service (MS-9)           — via HTTP (ai_classify, ai_generate)
  ├── calls → any URL                     — via HTTP (call_api, call_webhook)
  ├── consumes ← Kafka topics:
  │     ticket-events, sla-events, agent-events, interaction-events, customer-events
  ├── publishes → Kafka: workflow-events  — for audit trail
  └── uses → Temporal Server              — durable workflow execution
```

### 8.3 Cấu Trúc File

```
services/workflow-service/
├── src/
│   ├── main.ts                          ← Bootstrap (port 3015)
│   ├── app/
│   │   ├── app.module.ts                ← Root module, TypeORM config
│   │   ├── app.controller.ts            ← GET /health
│   │   └── app.service.ts              ← getHealth()
│   ├── workflow/
│   │   ├── workflow.module.ts           ← Feature module
│   │   ├── workflow.controller.ts       ← 10 REST endpoints
│   │   ├── workflow.service.ts          ← 10 service methods
│   │   ├── workflow.service.spec.ts     ← 9 unit tests
│   │   └── dto/
│   │       └── workflow.dto.ts          ← 4 DTOs
│   ├── entities/
│   │   ├── index.ts
│   │   ├── workflow-definition.entity.ts
│   │   ├── workflow-execution.entity.ts
│   │   └── workflow-step-log.entity.ts
│   ├── temporal/
│   │   └── mock-temporal.ts             ← MockTemporalClient (không được dùng)
│   └── migrations/
│       └── schema.sql                   ← Schema v1 (không có Temporal fields)
├── migrations/
│   └── 001_init_workflow_schema.sql     ← Schema v2 (có Temporal fields + indexes)
├── project.json                         ← Nx config
├── jest.config.ts
├── tsconfig.json / tsconfig.app.json / tsconfig.spec.json
└── webpack.config.js
```

### 8.4 Environment Variables

```bash
PORT=3015
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
# Database hardcoded: workflow_db

CORS_ORIGIN=http://localhost:3000

# Chưa có (cần thêm):
KAFKA_BROKERS=localhost:9092
REDIS_URL=redis://localhost:6379
TEMPORAL_ADDRESS=localhost:7233
TEMPORAL_NAMESPACE=default
VAULT_ADDR=http://localhost:8200
VAULT_TOKEN=...
```

### 8.5 Tenant Isolation

Tất cả queries filter theo `tenantId`. Hiện tại sử dụng constant UUID fallback khi không có JWT:

```typescript
const DEFAULT_TENANT = '00000000-0000-0000-0000-000000000000';
const DEFAULT_USER   = '00000000-0000-0000-0000-000000000001';
```

`getExecutions()` và `getExecution()` **không filter theo tenant** — security bug hiện tại.

---

## 9. Gap Analysis — Tính Năng Cần Bổ Sung

### 9.1 Core Execution Engine (Ưu tiên: Cao 🔴)

| Task | Mô tả | File cần tạo/sửa |
|------|--------|-----------------|
| Temporal Worker | Đăng ký workflow function với Temporal server | `src/temporal/temporal.worker.ts` |
| WorkflowExecutor | Temporal workflow function chạy steps | `src/temporal/workflow-executor.ts` |
| ActivityExecutor | Implement 18 activity types | `src/temporal/activities/` |
| Step log writer | Persist WorkflowStepLog sau mỗi bước | Trong ActivityExecutor |
| Execution finalizer | Cập nhật status, completed_at, output | Cuối WorkflowExecutor |
| Error handler | Retry/skip/fail/compensate logic | `src/temporal/error-handler.ts` |

**Priority activities cần implement trước:**
1. `assign_agent` — gọi Agent Service
2. `send_notification` — gọi Notification Service
3. `escalate_ticket` — gọi Ticket Service
4. `condition` — evaluate expression
5. `wait` — Temporal sleep

### 9.2 Trigger System (Ưu tiên: Cao 🔴)

| Task | Mô tả | File cần tạo/sửa |
|------|--------|-----------------|
| Kafka consumer | `@EventPattern()` cho 5 topics | `src/workflow/workflow.consumer.ts` |
| TriggerMatcher | Match event → active workflows | `src/workflow/trigger-matcher.service.ts` |
| Condition evaluator | Evaluate trigger.conditions | `src/workflow/condition-evaluator.ts` |
| Redis deduplication | SETNX dedup key, TTL 24h | Trong consumer |
| Cron scheduler | Load schedule-type workflows, run on cron | `src/workflow/workflow.scheduler.ts` |
| Webhook endpoint | `POST /webhook/:workflowId/:token` | Thêm vào controller |
| Token validator | HMAC-SHA256 token validation | Trong webhook handler |

### 9.3 API Completeness (Ưu tiên: Trung bình 🟡)

| Task | Mô tả |
|------|--------|
| Test endpoint | `POST /admin/workflows/:id/test` sandbox mode |
| Step logs endpoint | `GET /executions/:id/logs` |
| Pagination | `page`, `limit`, `status`, `from`/`to` params cho list endpoints |
| RBAC guards | `@UseGuards(JwtAuthGuard)` + `@Roles('workflow:read'/'workflow:write')` |
| Webhook trigger route | `POST /workflows/webhook/:workflowId/:token` |
| Tenant filter fix | Fix `getExecutions()` và `getExecution()` để filter theo tenant |
| Cancel execution | `POST /executions/:id/cancel` — hủy execution đang chạy |

### 9.4 Security (Ưu tiên: Trung bình 🟡)

| Task | Mô tả |
|------|--------|
| JWT validation | `@UseGuards(JwtAuthGuard)` trên tất cả endpoints |
| RBAC | `@Roles('workflow:read')` cho GET, `@Roles('workflow:write')` cho mutations |
| Audit logging | Kafka emit cho mọi create/update/delete/trigger |
| Vault integration | Store webhook secrets, API credentials |
| Rate limiting | Kong 30 req/min cho admin, 100 req/min cho agent |

### 9.5 Schema/Entity Fixes (Ưu tiên: Cao 🔴)

| Task | Mô tả |
|------|--------|
| Thống nhất migration | Chọn `migrations/001_init_workflow_schema.sql` làm canonical |
| Cập nhật entity | Thêm `temporalWorkflowId`, `temporalRunId`, `tenantId` vào `WorkflowExecution` |
| Fix step_logs schema | Thêm `step_type` column vào `src/migrations/schema.sql` |
| Align column names | `trigger_event` vs `input_data`, `variables` vs `output_data`, `error` vs `error_message` |

### 9.6 Frontend Admin UI (Ưu tiên: Thấp 🟢 — Phase 3)

| Component | Mô tả | Framework |
|-----------|--------|-----------|
| WorkflowDesigner | Canvas-based visual designer | React Flow |
| Step Palette | Drag-and-drop 18 step types | shadcn/ui |
| Trigger Configurator | UI cho 4 trigger types | shadcn/ui Form |
| Condition Builder | Visual condition editor | shadcn/ui |
| Execution History | Step-by-step status viewer | TanStack Query |
| JSON Editor Mode | Raw JSON editing | Monaco Editor |
| Import/Export | JSON workflow templates | — |

### 9.7 Testing (Ưu tiên: Trung bình 🟡)

| Task | Mô tả |
|------|--------|
| Unit test coverage ≥ 70% | Thêm tests cho execution, trigger matching, condition evaluation |
| Integration tests | Tất cả 10 API endpoints + 3 endpoints mới |
| Temporal integration tests | Mock Temporal server |
| Kafka consumer tests | Test event matching và deduplication |
| E2E tests | `e2e/workflow.spec.ts` với Playwright |
| Load tests | 500 concurrent users với k6 |

---

## 10. Vấn Đề Cần Giải Quyết

| # | Vấn đề | Mức độ | Giải pháp khuyến nghị |
|---|--------|--------|-----------------------|
| 1 | **2 migration files mâu thuẫn** | 🔴 Cao | Xóa `src/migrations/schema.sql`, dùng `migrations/001_init_workflow_schema.sql` làm chuẩn |
| 2 | **Entity-schema mismatch** (`step_type` missing, column names khác nhau) | 🔴 Cao | Cập nhật entities để align với schema canonical |
| 3 | **`triggerWorkflow()` không chạy steps** | 🔴 Cao | Implement Temporal integration (hoặc simple in-process executor cho MVP) |
| 4 | **`MockTemporalClient` không được dùng** | 🟡 Trung bình | Inject vào `WorkflowService`, sử dụng trong `triggerWorkflow()` |
| 5 | **Không có Kafka consumer** | 🔴 Cao | Thêm `KafkaModule` + `WorkflowConsumer` |
| 6 | **Không có RBAC/Auth** | 🟡 Trung bình | Thêm `JwtAuthGuard` + `@Roles()` decorators |
| 7 | **`getExecutions()` không filter theo tenant** | 🟡 Trung bình | Thêm join với `workflow_definitions` để filter `tenant_id` |
| 8 | **Không có audit logging** | 🟡 Trung bình | Thêm Kafka producer cho mọi mutations |
| 9 | **Thiếu pagination** | 🟢 Thấp | Thêm `page`/`limit` params, dùng TypeORM `findAndCount()` |
| 10 | **DEFAULT_TENANT hardcoded** | 🟢 Thấp | Enforce JWT auth, xóa fallback |
| 11 | **`variables` field type là `object` nhưng DTO không validate** | 🟢 Thấp | Thêm `@IsArray()` hoặc `@IsObject()` tùy theo spec |

---

## 11. Kong Gateway Configuration

*(Chưa được cấu hình — cần thiết lập khi deploy)*

```yaml
# --- Admin endpoints (chỉ admin role) ---
- path: /api/v1/admin/workflows
  service: workflow-service:3015
  plugins:
    - jwt (RS256, issuer: identity-service)
    - acl (allow: workflow:write)
    - rate-limiting (minute: 30)
    - cors (origins: admin-module-origin)

# --- Agent read endpoints ---
- path: /api/v1/workflows
  service: workflow-service:3015
  methods: [GET]
  plugins:
    - jwt (RS256)
    - acl (allow: workflow:read)
    - rate-limiting (minute: 100)

# --- Agent write endpoints ---
- path: /api/v1/workflows
  service: workflow-service:3015
  methods: [POST, PUT, DELETE]
  plugins:
    - jwt (RS256)
    - acl (allow: workflow:write)
    - rate-limiting (minute: 30)

# --- Webhook endpoint (no JWT, token-based) ---
- path: /api/v1/workflows/webhook
  service: workflow-service:3015
  plugins:
    - request-termination (if token invalid — handled in service)
    - rate-limiting (minute: 60)
    - ip-restriction (optional whitelist)

# --- Health check (no auth) ---
- path: /api/v1/health
  service: workflow-service:3015
```

---

## 12. Testing

### 12.1 Unit Tests Hiện Tại (`workflow.service.spec.ts`)

9 test cases, tất cả mock `workflowRepo` và `executionRepo`:

| Test | Mô tả |
|------|-------|
| `createWorkflow` | Tạo workflow với đầy đủ fields, verify `save()` được gọi |
| `findAll` | Lấy danh sách với tenant filter |
| `findOne` | Lấy 1 workflow theo id + tenant |
| `updateWorkflow` | Cập nhật fields, verify `404` khi không tìm thấy |
| `deleteWorkflow` | Xóa workflow, verify `404` khi không tìm thấy |
| `activateWorkflow` | Set `isActive = true` |
| `deactivateWorkflow` | Set `isActive = false` (implied trong service) |
| `triggerWorkflow` | Tạo execution record, verify `404` khi inactive |
| `getExecutions` | Lấy executions theo workflowId |

**Coverage:** Chỉ CRUD + basic trigger. Không có tests cho execution engine, trigger matching, error recovery.

### 12.2 Chạy Tests

```bash
# Unit tests
npx nx test workflow-service

# Unit tests với coverage
npx nx test workflow-service --coverage

# E2E tests (khi có)
npx playwright test e2e/workflow.spec.ts

# Load tests (khi có k6)
k6 run scripts/workflow-load-test.js
```

---

## 13. Verification Checklist

Sau khi implement các tính năng mới, verify theo thứ tự:

```bash
# 1. Health check
curl http://localhost:3015/api/v1/health
# Expected: { "status": "ok", "timestamp": "..." }

# 2. CRUD cơ bản
curl -X POST http://localhost:3015/api/v1/workflows \
  -H "Content-Type: application/json" \
  -d '{"name":"Test WF","trigger":{"type":"manual"},"steps":[]}'
# Expected 201 với workflow object

# 3. Activate và trigger
WORKFLOW_ID=<id từ bước 2>
curl -X POST http://localhost:3015/api/v1/workflows/$WORKFLOW_ID/activate
curl -X POST http://localhost:3015/api/v1/workflows/$WORKFLOW_ID/trigger \
  -H "Content-Type: application/json" \
  -d '{"eventData":{"test":true}}'
# Expected 201 với execution object

# 4. Verify execution chạy steps (sau khi implement engine)
EXEC_ID=<id từ bước 3>
curl http://localhost:3015/api/v1/executions/$EXEC_ID
# Expected: status = "completed" (không phải "running" mãi mãi)

# 5. Verify step logs
curl http://localhost:3015/api/v1/executions/$EXEC_ID/logs
# Expected: array of WorkflowStepLog

# 6. Kafka trigger (sau khi implement consumer)
# Publish event tới Kafka topic ticket-events
# Verify workflow tự động trigger

# 7. Unit tests
npx nx test workflow-service
# Expected: 9/9 pass (sau đó thêm tests mới)
```

---

## Tóm Tắt

### Hiện Trạng
Workflow Service là một **API scaffolding hoàn chỉnh** với CRUD đầy đủ, DB schema, entities, DTOs, và unit tests cho CRUD operations. Service có thể chạy và tạo execution records — nhưng **không có bất kỳ step nào được thực thi**.

### Để Production-Ready Cần

| Priority | Việc cần làm | Effort |
|----------|-------------|--------|
| 🔴 Cao | Fix migration mâu thuẫn + sync entities | 0.5 ngày |
| 🔴 Cao | Implement step execution engine (Temporal hoặc in-process) | 5-8 ngày |
| 🔴 Cao | Kafka consumer + trigger matcher | 2-3 ngày |
| 🟡 Trung | RBAC + JWT guards | 1 ngày |
| 🟡 Trung | Audit logging (Kafka emission) | 0.5 ngày |
| 🟡 Trung | Webhook endpoint + cron scheduler | 1 ngày |
| 🟡 Trung | Missing API endpoints + pagination | 1 ngày |
| 🟡 Trung | Integration + E2E tests | 2-3 ngày |
| 🟢 Thấp | Frontend Workflow Designer (React Flow) | 5-8 ngày |

**Tổng estimate để đạt production-ready (không bao gồm frontend):** ~13-17 ngày công.
