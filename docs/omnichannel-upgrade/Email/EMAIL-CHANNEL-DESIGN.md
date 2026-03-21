# Email Channel Design — Thiết kế chi tiết kênh Email

> **Mục tiêu:** Tích hợp kênh Email vào hệ thống omnichannel TPB CRM. Mỗi email inbound tạo 1 interaction, routing qua GoACD theo Agent Group + Skill. Tích hợp Gmail API (OAuth2) để gửi/nhận email. Email threading qua Interaction ID trong subject.
> **Ngày tạo:** 2026-03-20
> **Tham chiếu:** [INDEX.md](../INDEX.md) | [09-2-email-channel.md](../09-channel-designs/09-2-email-channel.md) | [06-channel-adapter-architecture.md](../06-channel-adapter-architecture.md) | [07-routing-engine.md](../07-routing-engine.md)

---

## Mục lục

1. [Tổng quan](#1-tổng-quan)
2. [Kiến trúc Email Channel](#2-kiến-trúc-email-channel)
3. [Email Alias System](#3-email-alias-system)
4. [Gmail Integration (OAuth2)](#4-gmail-integration-oauth2)
5. [Email Threading — Interaction ID](#5-email-threading--interaction-id)
6. [Agent Email Capacity](#6-agent-email-capacity)
7. [GoACD Email Routing](#7-goacd-email-routing)
8. [Frontend — InteractionList Tabs](#8-frontend--interactionlist-tabs)
9. [Frontend — InteractionDetail (Email Thread + Reply)](#9-frontend--interactiondetail-email-thread--reply)
10. [Customer Auto-Match](#10-customer-auto-match)
11. [Entities & Database Schema](#11-entities--database-schema)
12. [API Endpoints](#12-api-endpoints)
13. [Kafka Topics](#13-kafka-topics)
14. [Luồng xử lý chi tiết](#14-luồng-xử-lý-chi-tiết)

---

## 1. Tổng quan

### Yêu cầu chức năng

| # | Yêu cầu | Mô tả |
|---|---|---|
| E1 | Email → Interaction | Mỗi email gửi vào hệ thống được gắn với 1 interaction |
| E2 | Routing qua GoACD | Sử dụng chung module GoACD để routing email theo Agent Group và Agent Skill |
| E3 | Email capacity limit | Admin set được limit số email nhận trên 1 agent |
| E4 | Hàng chờ | Email không phân bổ được → tab "Hàng chờ" trong InteractionList |
| E5 | Đã nhận | Email phân bổ cho agent → tab "Đã nhận" |
| E6 | Đã đóng | Interaction đã gửi mail ra + đóng → tab "Đã đóng" |
| E7 | Gmail integration | Tích hợp Gmail, sử dụng Google OAuth2 để gửi email |
| E8 | Email Alias | Mỗi alias gắn với 1 agent group (skill-based hoặc round-robin) |
| E9 | Gmail forward → alias | Gmail forward inbound email vào alias để phân bổ đến agent |
| E10 | Auto Interaction ID thread | Email gửi ra/vào nếu subject không có interaction ID → tự tạo |
| E11 | Thread grouping | Email reply có cùng interaction ID → group vào 1 thread |
| E12 | Thread display | Click interaction → hiển thị toàn bộ email trong thread ở InteractionDetail |
| E13 | Reply with thread history | Reply copy tất cả email trước đó vào nội dung (giống Outlook) |
| E14 | Auto-focus latest | Mặc định focus vào email gần nhất trong thread |
| E15 | Customer auto-match | Tự động match email address với khách hàng → hiển thị CustomerInfo |

---

## 2. Kiến trúc Email Channel

```
Gmail Inbox
  │
  │ Gmail Filter → Forward to alias (support@crm.tpbank.vn)
  │
  ▼
Google Pub/Sub (push notification khi có email mới)
  │
  ▼
NestJS: EmailAdapter (Channel Gateway MS-20)
  │ normalize → ChannelMessage
  │ extract threadId from subject: [INT-XXXX1234]
  │ nếu có threadId → append vào thread (existing interaction)
  │ nếu không → tạo interaction mới + gắn [INT-XXXX1234] vào subject
  │
  ├──→ Kafka: channel.email.inbound
  │
  ▼
GoACD: Email Queue Manager (MỚI)
  │ lookup alias → agent group
  │ routing mode: skill-based HOẶC round-robin (per alias config)
  │ check agent email capacity (email_count < email_max)
  │ score agents (5-factor, channel=email)
  │
  ├── Agent available → assign → Kafka: email.assigned
  │     → CTI Adapter → WS → Frontend (tab "Đã nhận")
  │
  └── No agent available → enqueue → Kafka: email.queued
        → Frontend (tab "Hàng chờ")

Agent reply:
  Frontend → POST /api/v1/interactions/{id}/email/reply
    → Interaction Service → Gmail API (send)
    → Gắn [INT-XXXX1234] vào subject
    → Kafka: interaction.email.sent
    → Khi tất cả xử lý xong → agent bấm "Đóng" → tab "Đã đóng"
```

### Component tham gia

| Component | Vai trò | Thay đổi |
|---|---|---|
| **Channel Gateway (MS-20)** | EmailAdapter: nhận email từ Gmail, normalize, publish Kafka | Thêm EmailAdapter |
| **GoACD (Go)** | Email routing: scoring, claim, queue, poller | Thêm email routing module |
| **Interaction Service (MS-3)** | Email thread CRUD, reply, threading logic | Thêm EmailMessage entity, threading |
| **CTI Adapter (MS-19)** | Kafka consume → WS broadcast email events | Thêm email event handlers |
| **Agent Service (MS-2)** | Email capacity (email_count, email_max) | Thêm maxConcurrentEmail field |
| **Customer Service (MS-5)** | Auto-match email → customer | Thêm email lookup endpoint |
| **Frontend** | InteractionList tabs, EmailThread, Reply | Refactor tabs, wire real data |

---

## 3. Email Alias System

### Khái niệm

| Thuật ngữ | Mô tả |
|---|---|
| **Email Alias** | Địa chỉ email ảo (vd: `sales@crm.tpbank.vn`, `support@crm.tpbank.vn`) |
| **Gắn với Agent Group** | Mỗi alias map tới 1 agent group |
| **Routing Mode** | `skill-based` (GoACD 5-factor scoring) hoặc `round-robin` (agent ít email nhất) |
| **Gmail Forward** | Admin setup Gmail filter: forward all emails matching criteria → alias |
| **Cấu hình Admin** | Admin UI: CRUD aliases, chọn group, chọn routing mode, set SLA |

### Luồng alias hoạt động

```
1. Admin tạo alias "support@crm.tpbank.vn" → gắn Agent Group "Support Team"
   → routing mode: skill-based, requiredSkills: ['email', 'support']
   → SLA: 60 phút

2. Admin setup Gmail filter:
   Gmail Account: tpbank.cs@gmail.com
   Filter: Forward all incoming → support@crm.tpbank.vn

3. Khách hàng gửi email tới tpbank.cs@gmail.com
   → Gmail forward tới support@crm.tpbank.vn
   → Google Pub/Sub push → Channel Gateway webhook
   → EmailAdapter fetch email via Gmail API
   → Lookup alias "support@crm.tpbank.vn" → Agent Group "Support Team"
   → GoACD route: score agents trong group có skill 'email' + 'support'
   → Assign agent có score cao nhất + email_count < email_max
```

### Entity: EmailAlias

```typescript
@Entity('email_aliases')
export class EmailAlias {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  tenantId: string;

  @Column({ unique: true })
  aliasAddress: string;          // "support@crm.tpbank.vn"

  @Column()
  displayName: string;           // "Hỗ trợ khách hàng"

  @Column()
  agentGroupId: string;          // FK → AgentGroup

  @Column({ type: 'enum', enum: ['skill-based', 'round-robin'] })
  routingMode: 'skill-based' | 'round-robin';

  @Column({ type: 'simple-array', default: '' })
  requiredSkills: string[];      // Skills cần cho skill-based routing

  @Column({ default: 60 })
  slaThresholdMinutes: number;   // SLA phản hồi (phút)

  @Column({ default: 100 })
  maxQueueSize: number;          // Giới hạn hàng chờ

  @Column({ default: true })
  isActive: boolean;

  @Column()
  gmailAccountId: string;        // FK → GmailAccount (OAuth2 credential)

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
```

---

## 4. Gmail Integration (OAuth2)

### OAuth2 Setup Flow

```
1. Admin → Settings → Email Integration → "Kết nối Gmail"
2. Redirect → Google OAuth2 consent screen
   Scopes:
     - https://www.googleapis.com/auth/gmail.readonly
     - https://www.googleapis.com/auth/gmail.send
     - https://www.googleapis.com/auth/gmail.modify
     - https://www.googleapis.com/auth/pubsub
3. User consent → callback → /api/v1/channel-gateway/gmail/oauth/callback
4. Lưu access_token + refresh_token (encrypted AES-256-GCM)
5. Tạo Gmail watch subscription:
   POST https://gmail.googleapis.com/gmail/v1/users/me/watch
   Body: { topicName: "projects/{project}/topics/gmail-push", labelIds: ["INBOX"] }
   → Watch expires 7 ngày → auto-renew via cron job
6. Lưu historyId cho incremental sync
```

### Entity: GmailAccount

```typescript
@Entity('gmail_accounts')
export class GmailAccount {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  tenantId: string;

  @Column({ unique: true })
  email: string;                  // "tpbank.cs@gmail.com"

  @Column()
  displayName: string;

  @Column()
  accessToken: string;            // Encrypted AES-256-GCM

  @Column()
  refreshToken: string;           // Encrypted AES-256-GCM

  @Column({ type: 'timestamptz' })
  tokenExpiresAt: Date;

  @Column({ type: 'timestamptz', nullable: true })
  watchExpiration: Date;          // Gmail Pub/Sub watch (7 ngày)

  @Column({ nullable: true })
  historyId: string;              // Gmail incremental sync cursor

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
```

### Inbound Flow (nhận email)

```
Google Pub/Sub push notification
  → POST /api/v1/channel-gateway/gmail/webhook
  → Verify Pub/Sub signature
  → Extract: emailAddress, historyId
  → Gmail API: GET /users/me/history?startHistoryId={historyId}
  → Lấy list message IDs mới
  → For each message:
    → Gmail API: GET /users/me/messages/{messageId}?format=full
    → Parse: from, to, cc, subject, body (HTML + text), attachments
    → Sanitize HTML (DOMPurify)
    → Upload attachments → MinIO/SeaweedFS
    → Normalize → ChannelMessage
    → Publish Kafka: channel.email.inbound
  → Update historyId trong GmailAccount
```

### Outbound Flow (gửi email)

```
Agent bấm "Gửi"
  → POST /api/v1/interactions/{id}/email/reply
  → Interaction Service:
    1. Build email content: agent reply + quoted thread content
    2. Gắn [INT-XXXX1234] vào subject (Re: [INT-XXXX1234] Original Subject)
    3. Set headers: In-Reply-To, References (cho Gmail thread đúng)
    4. Upload attachments → MinIO
    5. Build MIME message (RFC 2822)
    6. Gmail API: POST /users/me/messages/send (base64url encoded)
    7. Lưu EmailMessage (direction: outbound) vào DB
    8. Publish Kafka: interaction.email.sent
```

### Token Refresh

```
Trước mỗi Gmail API call:
  → Check tokenExpiresAt > now + 5 min buffer
  → Nếu sắp hết → POST https://oauth2.googleapis.com/token
    { grant_type: "refresh_token", refresh_token, client_id, client_secret }
  → Cập nhật accessToken + tokenExpiresAt
```

### Watch Renewal (Cron)

```
BullMQ cron job chạy mỗi 6 ngày:
  → For each GmailAccount where watchExpiration < now + 1 day:
    → Gmail API: POST /users/me/watch (renew)
    → Cập nhật watchExpiration
```

### Fallback Polling

```
Nếu Pub/Sub push fail hoặc delay > 60s:
  → BullMQ job mỗi 60s:
    → For each active GmailAccount:
      → Gmail API: GET /users/me/history?startHistoryId={historyId}
      → Process new messages (dedup by messageId)
```

---

## 5. Email Threading — Interaction ID

### Quy tắc threading

| Trường hợp | Hành vi |
|---|---|
| Email inbound mới (subject **không** chứa `[INT-XXXXXXXX]`) | Tạo Interaction mới → gắn `[INT-XXXXXXXX]` vào subject khi reply |
| Email inbound có `[INT-XXXXXXXX]` trong subject | Lookup interaction → append email vào thread |
| Agent reply | Subject: `Re: [INT-XXXXXXXX] Original Subject` → customer reply giữ nguyên thread |
| Forward | Subject: `Fwd: [INT-XXXXXXXX] Original Subject` → vẫn thuộc thread gốc |
| Subject bị customer xoá `[INT-...]` | Fallback: match bằng Gmail `threadId` hoặc `In-Reply-To` header |

### Thread ID format

- **Pattern:** `[INT-XXXXXXXX]` — 8 ký tự uppercase alphanumeric
- **Extraction regex:** `\[INT-([A-Z0-9]{8})\]`
- **Vị trí:** Ở CUỐI subject line (trước khi thêm Re:/Fwd:)
- **Ví dụ:**
  - Inbound: `Yêu cầu mở thẻ tín dụng` → Agent reply: `Re: Yêu cầu mở thẻ tín dụng [INT-ABCD1234]`
  - Customer reply: `Re: Re: Yêu cầu mở thẻ tín dụng [INT-ABCD1234]`

### Threading logic (pseudo-code)

```
function processInboundEmail(email):
  // Step 1: Extract thread ID from subject
  threadId = extractThreadId(email.subject)  // regex [INT-XXXXXXXX]

  // Step 2: Lookup interaction
  if threadId:
    interaction = findInteractionByDisplayId(threadId)
    if interaction:
      // Append to existing thread
      saveEmailMessage(email, interaction.id)
      publishKafka('email.thread.updated', { interactionId: interaction.id })
      return

  // Step 3: Fallback — Gmail threadId
  if email.gmailThreadId:
    existingEmail = findEmailByGmailThreadId(email.gmailThreadId)
    if existingEmail:
      saveEmailMessage(email, existingEmail.interactionId)
      publishKafka('email.thread.updated', { interactionId: existingEmail.interactionId })
      return

  // Step 4: Fallback — In-Reply-To header
  if email.headers['In-Reply-To']:
    existingEmail = findEmailByMessageId(email.headers['In-Reply-To'])
    if existingEmail:
      saveEmailMessage(email, existingEmail.interactionId)
      publishKafka('email.thread.updated', { interactionId: existingEmail.interactionId })
      return

  // Step 5: New interaction
  interaction = createInteraction({
    type: 'email',
    channel: 'email',
    direction: 'inbound',
    subject: email.subject,
    source: email.fromEmail,
    status: 'new'
  })
  saveEmailMessage(email, interaction.id)

  // Step 6: Route via GoACD
  routeEmailViaGoACD(interaction, email.toAlias)
```

---

## 6. Agent Email Capacity

### Mở rộng Agent Profile

```typescript
// Thêm vào AgentProfile entity (services/agent-service)
@Column({ default: 10 })
maxConcurrentEmail: number;      // Admin configurable, default 10
```

### Mở rộng Redis Agent State Hash

```
Hash Key: agent:state:{agentId}

Existing fields:
  status, voice_status, voice_count, voice_max, skills, groups, ...

New fields:
  + email_status: "ready" | "not_ready" | "offline"
  + email_count: int     // Số email đang xử lý (assigned, chưa đóng)
  + email_max: int       // Giới hạn (từ AgentProfile.maxConcurrentEmail)
```

### Capacity enforcement

```
Trước khi assign email:
  redis> HGET agent:state:{id} email_count   → current
  redis> HGET agent:state:{id} email_max     → max
  IF current >= max → SKIP agent (không assign thêm)

Sau khi assign:
  redis> HINCRBY agent:state:{id} email_count 1
  IF email_count >= email_max → SREM available:email {agentId}

Sau khi đóng interaction:
  redis> HINCRBY agent:state:{id} email_count -1
  IF email_count < email_max → SADD available:email {agentId}
```

### Admin config

Admin vào Agent Management → chọn agent → set "Giới hạn email đồng thời" (input number, default 10).
Khi save → update AgentProfile.maxConcurrentEmail + Redis `agent:state:{id}.email_max`.

---

## 7. GoACD Email Routing

### Thiết kế: Mở rộng GoACD cho multi-channel

GoACD hiện chỉ xử lý voice (ESL/SIP). Email routing **không cần ESL** — chỉ cần scoring + queue management qua Redis.

**Phương án:** Thêm HTTP endpoint `POST /rpc/RouteEmail` vào GoACD REST server.

### API: POST /rpc/RouteEmail

**Request:**
```json
{
  "aliasId": "uuid-of-alias",
  "aliasAddress": "support@crm.tpbank.vn",
  "interactionId": "uuid-of-interaction",
  "fromEmail": "nguyenvana@gmail.com",
  "fromName": "Nguyễn Văn A",
  "subject": "Yêu cầu mở thẻ tín dụng"
}
```

**Response (assigned):**
```json
{
  "assigned": true,
  "agentId": "AGT001",
  "agentName": "Nguyễn Thị B",
  "queuePosition": 0
}
```

**Response (queued):**
```json
{
  "assigned": false,
  "agentId": null,
  "queuePosition": 5,
  "estimatedWaitMinutes": 15
}
```

### Routing logic

```go
func handleRouteEmail(req RouteEmailRequest) RouteEmailResponse {
  // 1. Lookup alias → get agentGroupId, routingMode, requiredSkills
  alias := lookupAlias(req.AliasId)

  // 2. Get candidate agents: agents trong group + email_status=ready + email_count < email_max
  candidates := getEmailCandidates(alias.AgentGroupId)

  if len(candidates) == 0 {
    // 3a. No agent → enqueue
    enqueueEmail(alias, req.InteractionId)
    publishKafka("email.queued", { interactionId, aliasId, queuePosition })
    return RouteEmailResponse{ Assigned: false, QueuePosition: getQueueSize(alias.Id) }
  }

  // 3b. Route based on mode
  var selectedAgent Agent
  switch alias.RoutingMode {
  case "round-robin":
    // Agent có email_count thấp nhất → nếu bằng nhau → idle lâu nhất
    selectedAgent = selectRoundRobin(candidates)

  case "skill-based":
    // GoACD 5-factor scoring (reuse scorer.go)
    scored := ScoreAgents(alias.RequiredSkills, candidates, "email")
    selectedAgent = scored[0].Agent  // top-1
  }

  // 4. Claim agent
  ok := ClaimAgentEmail(selectedAgent.Id, req.InteractionId)
  if !ok {
    // Claim failed (race condition) → enqueue
    enqueueEmail(alias, req.InteractionId)
    return RouteEmailResponse{ Assigned: false }
  }

  // 5. Publish assigned event
  publishKafka("email.assigned", {
    interactionId, agentId: selectedAgent.Id, agentName: selectedAgent.Name
  })

  return RouteEmailResponse{ Assigned: true, AgentId: selectedAgent.Id }
}
```

### Lua Scripts mới

**email_claim.lua** — Claim agent cho email interaction:
```lua
-- KEYS[1] = agent:state:{agentId}
-- ARGV[1] = interactionId
-- Returns: 1 = success, 0 = fail

local status = redis.call('HGET', KEYS[1], 'email_status')
local count = tonumber(redis.call('HGET', KEYS[1], 'email_count') or '0')
local max = tonumber(redis.call('HGET', KEYS[1], 'email_max') or '10')

if status ~= 'ready' then return 0 end
if count >= max then return 0 end

redis.call('HINCRBY', KEYS[1], 'email_count', 1)

-- Remove from available set if at capacity
if count + 1 >= max then
  redis.call('SREM', 'available:email', ARGV[1])
end

return 1
```

**email_release.lua** — Release email slot:
```lua
-- KEYS[1] = agent:state:{agentId}
-- ARGV[1] = agentId

local count = tonumber(redis.call('HGET', KEYS[1], 'email_count') or '0')
local max = tonumber(redis.call('HGET', KEYS[1], 'email_max') or '10')

if count > 0 then
  redis.call('HINCRBY', KEYS[1], 'email_count', -1)
end

-- Add back to available set if under capacity
if count - 1 < max then
  redis.call('SADD', 'available:email', ARGV[1])
end

return 1
```

### Email Queue Poller

Khác voice (real-time bridge), email queue polling periodic:

```go
func emailQueuePoller() {
  ticker := time.NewTicker(10 * time.Second)
  for range ticker.C {
    // For each active email queue (alias)
    for _, alias := range getActiveAliases() {
      queueKey := fmt.Sprintf("queue:email:%s:entries", alias.Id)

      // Peek queue entries
      entries := redis.ZRangeWithScores(queueKey, 0, -1)
      for _, entry := range entries {
        // Try to find available agent
        candidates := getEmailCandidates(alias.AgentGroupId)
        if len(candidates) == 0 {
          break // No agents available, try next poll
        }

        // Route (same logic as handleRouteEmail)
        agent := selectAgent(alias.RoutingMode, alias.RequiredSkills, candidates)
        ok := ClaimAgentEmail(agent.Id, entry.InteractionId)
        if ok {
          redis.ZRem(queueKey, entry.InteractionId)
          publishKafka("email.assigned", { interactionId: entry.InteractionId, agentId: agent.Id })
        }
      }
    }
  }
}
```

### 5-Factor Scoring cho Email

Reuse `scorer.go` với channel parameter:

| Factor | Points | Cho Email |
|---|---|---|
| Skill Match | 40pt | Agent có skills matching alias.requiredSkills |
| Capacity | 20pt | `(email_max - email_count) / email_max × 20` |
| Idle Time | 20pt | `min(seconds_since_last_email_assign / 300, 1.0) × 20` |
| Group Bonus | 10pt | Agent cùng group với alias.agentGroupId |
| Random | 10pt | Tiebreaker |

---

## 8. Frontend — InteractionList Tabs

### 3 sub-tabs khi channel = email

```
┌─────────────────────────────────────────┐
│ 📧 Email                                │
│                                          │
│ ┌──────────┬───────────┬──────────────┐ │
│ │ Đã nhận  │ Hàng chờ  │ Đã đóng      │ │
│ │  (5)     │   (12)    │   (234)      │ │
│ └──────────┴───────────┴──────────────┘ │
│                                          │
│ ┌────────────────────────────────────┐   │
│ │ 📧 nguyenvana@gmail.com           │   │
│ │    Yêu cầu mở thẻ tín dụng       │   │
│ │    15 phút trước │ ⚡ SLA: 45/60   │   │
│ ├────────────────────────────────────┤   │
│ │ 📧 tranthib@yahoo.com             │   │
│ │    Hỏi về lãi suất vay            │   │
│ │    2 giờ trước │ 🔴 SLA breached  │   │
│ └────────────────────────────────────┘   │
└─────────────────────────────────────────┘
```

### Tab definitions

| Tab | API Filter | Mô tả | Actions |
|---|---|---|---|
| **Đã nhận** | `assignedAgentId = me AND status IN ('new','in-progress') AND channel = 'email'` | Email assigned cho agent, chưa đóng | Click → mở detail, Reply, Close |
| **Hàng chờ** | `status = 'queued' AND channel = 'email' AND alias IN (agent's group aliases)` | Email chưa assign, đang chờ | Nút "Nhận" → manual pick |
| **Đã đóng** | `assignedAgentId = me AND status IN ('resolved','closed') AND channel = 'email'` | Email đã xử lý xong | Click → xem lại thread |

### Manual pick từ Hàng chờ

Agent có thể chủ động nhận email từ queue:
1. Click nút "Nhận" trên email trong tab Hàng chờ
2. Frontend: `POST /api/v1/interactions/{id}/assign` (body: `{ agentId: me }`)
3. Backend: check email_count < email_max → assign → ClaimAgentEmail
4. Email chuyển từ tab "Hàng chờ" sang "Đã nhận"
5. Kafka: email.assigned → WS push → realtime update

### Sorting

- **Đã nhận:** SLA gần breach nhất ở trên
- **Hàng chờ:** Thời gian chờ lâu nhất ở trên (FIFO)
- **Đã đóng:** Mới đóng nhất ở trên (reverse chronological)

---

## 9. Frontend — InteractionDetail (Email Thread + Reply)

### Layout khi click email interaction

```
┌─────────────────────────────────────────────────────────┐
│ Tab: Tương tác                                           │
│                                                           │
│ Subject: [INT-ABCD1234] Yêu cầu mở thẻ tín dụng        │
│ From: nguyenvana@gmail.com → support@crm.tpbank.vn      │
│ Status: Đang xử lý  │  SLA: 45/60 phút                  │
│ Thread: 3 emails                                          │
│                                                           │
│ ┌─ Email Thread ──────────────────────────────────────┐  │
│ │                                                      │  │
│ │ ▼ Email #1 (inbound) — 14:30 20/03/2026             │  │
│ │   From: Nguyễn Văn A <nguyenvana@gmail.com>         │  │
│ │   To: support@crm.tpbank.vn                          │  │
│ │   ──────────────────────────────────────────          │  │
│ │   Kính gửi ngân hàng,                                │  │
│ │   Tôi muốn mở thẻ tín dụng Visa Platinum.           │  │
│ │   Vui lòng tư vấn thủ tục và điều kiện.             │  │
│ │   Trân trọng, Nguyễn Văn A                           │  │
│ │                                                      │  │
│ │ ▼ Email #2 (outbound) — 14:45 20/03/2026            │  │
│ │   From: Agent Nguyễn Thị B <support@crm.tpbank.vn>  │  │
│ │   To: nguyenvana@gmail.com                            │  │
│ │   ──────────────────────────────────────────          │  │
│ │   Chào anh Nguyễn Văn A,                             │  │
│ │   Để mở thẻ Visa Platinum, anh cần cung cấp:        │  │
│ │   1. CMND/CCCD (2 mặt)                               │  │
│ │   2. Sao kê lương 3 tháng gần nhất                   │  │
│ │   ▸ [Show quoted content]                             │  │
│ │                                                      │  │
│ │ ▼ Email #3 (inbound) — 15:10 20/03/2026  ★ MỚI     │  │  ← auto-focus
│ │   From: Nguyễn Văn A <nguyenvana@gmail.com>         │  │
│ │   To: support@crm.tpbank.vn                          │  │
│ │   ──────────────────────────────────────────          │  │
│ │   Đây là CMND và hồ sơ thu nhập của tôi.            │  │
│ │   📎 cmnd_truoc.jpg (1.2 MB)                        │  │
│ │   📎 cmnd_sau.jpg (1.1 MB)                          │  │
│ │   📎 sao_ke_luong.pdf (2.3 MB)                      │  │
│ │   ▸ [Show quoted content]                             │  │
│ │                                                      │  │
│ │   [↩ Reply] [↩↩ Reply All] [➡ Forward]              │  │
│ └──────────────────────────────────────────────────────┘  │
│                                                           │
│ ┌─ Reply Area (khi bấm Reply) ───────────────────────┐  │
│ │ To: nguyenvana@gmail.com                             │  │
│ │ CC: [+]   BCC: [+]                                  │  │
│ │ Subject: Re: Yêu cầu mở thẻ tín dụng [INT-ABCD1234]│  │
│ │ ┌─────────────────────────────────────────────────┐  │  │
│ │ │ [Con trỏ agent viết nội dung ở đây]             │  │  │
│ │ │                                                  │  │  │
│ │ │ ─── Quoted ───────────────────────────────────── │  │  │
│ │ │ On 15:10 20/03/2026, Nguyễn Văn A wrote:        │  │  │
│ │ │ > Đây là CMND và hồ sơ thu nhập của tôi.        │  │  │
│ │ │ >                                                │  │  │
│ │ │ On 14:45 20/03/2026, Agent Nguyễn Thị B wrote:  │  │  │
│ │ │ > Chào anh Nguyễn Văn A,                        │  │  │
│ │ │ > Để mở thẻ Visa Platinum, anh cần cung cấp:    │  │  │
│ │ │ > 1. CMND/CCCD (2 mặt)                          │  │  │
│ │ │ > 2. Sao kê lương 3 tháng gần nhất              │  │  │
│ │ │ >                                                │  │  │
│ │ │ On 14:30 20/03/2026, Nguyễn Văn A wrote:        │  │  │
│ │ │ > Kính gửi ngân hàng,                            │  │  │
│ │ │ > Tôi muốn mở thẻ tín dụng Visa Platinum.       │  │  │
│ │ │ > Vui lòng tư vấn thủ tục và điều kiện.         │  │  │
│ │ └─────────────────────────────────────────────────┘  │  │
│ │                                                      │  │
│ │ 📎 Đính kèm  │  📝 Template  │  ✉️ Gửi  │  💾 Nháp │  │
│ └──────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────┘
```

### Reply logic (giống Outlook)

Khi agent bấm "Reply" trên email N trong thread:

1. **To:** Auto-fill `fromEmail` của email đang reply
2. **Subject:** `Re: [Original Subject] [INT-XXXX1234]`
3. **Quoted content:** Copy TẤT CẢ email từ email N trở về email #1:

```
--- Quoted ---
On {email_N.date}, {email_N.fromName} wrote:
> {email_N.bodyText}
>
On {email_N-1.date}, {email_N-1.fromName} wrote:
> {email_N-1.bodyText}
>
...
On {email_1.date}, {email_1.fromName} wrote:
> {email_1.bodyText}
```

4. Agent viết nội dung mới PHÍA TRÊN quoted content
5. Bấm "Gửi" → gửi qua Gmail API

### Auto-focus email mới nhất

- Khi mở thread → scroll xuống email cuối cùng (mới nhất)
- Email mới nhất có badge "★ MỚI" (nếu chưa đọc)
- useEffect scroll ref vào email cuối: `lastEmailRef.current?.scrollIntoView({ behavior: 'smooth' })`

### Reply All vs Forward

| Mode | To | CC | Subject prefix |
|---|---|---|---|
| **Reply** | fromEmail của email đang reply | Không | `Re:` |
| **Reply All** | fromEmail | Tất cả toEmails + ccEmails (trừ agent) | `Re:` |
| **Forward** | Agent nhập | Không | `Fwd:` |

---

## 10. Customer Auto-Match

### Luồng match khi nhận email inbound

```
1. Extract fromEmail từ email inbound
2. GET /api/v1/customers?email={fromEmail}
3. Kết quả:
   a. Tìm thấy 1 customer → gắn customerId + customerName vào Interaction
   b. Tìm thấy nhiều customers (cùng email) → gắn customer đầu tiên, agent có thể đổi
   c. Không tìm thấy → tạo Customer mới:
      - name: parse từ email "From" header (vd: "Nguyễn Văn A")
      - email: fromEmail
      - status: "active"
      - customerType: "individual"
4. Interaction.customerId = customer.id
5. Interaction.customerName = customer.name
6. Panel phải (CustomerInfoScrollFixed) hiển thị thông tin customer:
   - Tên, email, phone (nếu có)
   - Lịch sử interactions
   - Sản phẩm ngân hàng (BFSI)
   - Ghi chú
```

### Mở rộng Customer Service

Thêm endpoint search by email:
```
GET /api/v1/customers?email={email}
  → Query: WHERE email = :email OR metadata->>'alternateEmails' ? :email
  → Return: Customer[] (có thể > 1)
```

---

## 11. Entities & Database Schema

### EmailMessage Entity

```typescript
@Entity('email_messages')
export class EmailMessage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  @Index()
  interactionId: string;          // FK → Interaction

  @ManyToOne(() => Interaction)
  @JoinColumn({ name: 'interactionId' })
  interaction: Interaction;

  @Column({ nullable: true })
  gmailMessageId: string;         // Gmail API message ID (dedup)

  @Column({ nullable: true })
  gmailThreadId: string;          // Gmail thread ID (backup grouping)

  @Column({ type: 'enum', enum: ['inbound', 'outbound'] })
  direction: 'inbound' | 'outbound';

  @Column()
  fromEmail: string;

  @Column()
  fromName: string;

  @Column({ type: 'simple-array' })
  toEmails: string[];

  @Column({ type: 'simple-array', default: '' })
  ccEmails: string[];

  @Column({ type: 'simple-array', default: '' })
  bccEmails: string[];

  @Column()
  subject: string;

  @Column({ type: 'text' })
  bodyHtml: string;               // HTML content (sanitized)

  @Column({ type: 'text' })
  bodyText: string;               // Plain text version

  @Column({ type: 'jsonb', default: [] })
  attachments: EmailAttachment[];

  @Column({ type: 'jsonb', default: {} })
  headers: Record<string, string>; // Message-ID, In-Reply-To, References

  @Column({ type: 'timestamptz', nullable: true })
  receivedAt: Date;

  @Column({ type: 'timestamptz', nullable: true })
  sentAt: Date;

  @Column({ type: 'timestamptz', nullable: true })
  readAt: Date;

  @CreateDateColumn()
  createdAt: Date;
}

interface EmailAttachment {
  id: string;
  filename: string;
  mimeType: string;
  size: number;                   // bytes
  storageUrl: string;             // MinIO/SeaweedFS URL
  gmailAttachmentId?: string;     // Gmail attachment ID for lazy download
}
```

### Database Schema SQL

```sql
-- email_messages (trong interaction_db)
CREATE TABLE email_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  interaction_id UUID NOT NULL REFERENCES interactions(id) ON DELETE CASCADE,
  gmail_message_id VARCHAR(255),
  gmail_thread_id VARCHAR(255),
  direction VARCHAR(10) NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  from_email VARCHAR(255) NOT NULL,
  from_name VARCHAR(255) NOT NULL,
  to_emails TEXT[] NOT NULL,
  cc_emails TEXT[] DEFAULT '{}',
  bcc_emails TEXT[] DEFAULT '{}',
  subject TEXT NOT NULL,
  body_html TEXT NOT NULL,
  body_text TEXT NOT NULL,
  attachments JSONB DEFAULT '[]',
  headers JSONB DEFAULT '{}',
  received_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_email_messages_interaction ON email_messages(interaction_id);
CREATE INDEX idx_email_messages_gmail_thread ON email_messages(gmail_thread_id);
CREATE INDEX idx_email_messages_gmail_message ON email_messages(gmail_message_id);
CREATE INDEX idx_email_messages_from ON email_messages(from_email);

-- email_aliases (trong channel_gateway_db)
CREATE TABLE email_aliases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  alias_address VARCHAR(255) NOT NULL UNIQUE,
  display_name VARCHAR(255) NOT NULL,
  agent_group_id UUID NOT NULL,
  routing_mode VARCHAR(20) NOT NULL CHECK (routing_mode IN ('skill-based', 'round-robin')),
  required_skills TEXT[] DEFAULT '{}',
  sla_threshold_minutes INT DEFAULT 60,
  max_queue_size INT DEFAULT 100,
  is_active BOOLEAN DEFAULT true,
  gmail_account_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- gmail_accounts (trong channel_gateway_db)
CREATE TABLE gmail_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  display_name VARCHAR(255) NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  token_expires_at TIMESTAMPTZ NOT NULL,
  watch_expiration TIMESTAMPTZ,
  history_id VARCHAR(50),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 12. API Endpoints

### Channel Gateway (MS-20) — Gmail Integration

| Method | Endpoint | Auth | Mô tả |
|---|---|---|---|
| `POST` | `/channel-gateway/gmail/webhook` | Pub/Sub signature | Gmail push notification (email mới) |
| `GET` | `/channel-gateway/gmail/oauth/init` | JWT (Admin) | Initiate OAuth2 flow → redirect Google |
| `GET` | `/channel-gateway/gmail/oauth/callback` | OAuth2 callback | Lưu tokens, tạo GmailAccount |
| `GET` | `/channel-gateway/gmail-accounts` | JWT (Admin) | List connected Gmail accounts |
| `DELETE` | `/channel-gateway/gmail-accounts/{id}` | JWT (Admin) | Disconnect Gmail account |
| `GET` | `/channel-gateway/email-aliases` | JWT | List email aliases |
| `POST` | `/channel-gateway/email-aliases` | JWT (Admin) | Create alias |
| `PATCH` | `/channel-gateway/email-aliases/{id}` | JWT (Admin) | Update alias |
| `DELETE` | `/channel-gateway/email-aliases/{id}` | JWT (Admin) | Delete alias |

### Interaction Service (MS-3) — Email Thread

| Method | Endpoint | Auth | Mô tả |
|---|---|---|---|
| `GET` | `/interactions/{id}/email-thread` | JWT | Lấy toàn bộ EmailMessages trong thread |
| `POST` | `/interactions/{id}/email/reply` | JWT | Agent reply (send via Gmail API) |
| `POST` | `/interactions/{id}/email/forward` | JWT | Forward email |
| `PATCH` | `/interactions/{id}/email/read` | JWT | Mark email(s) as read |
| `POST` | `/interactions/{id}/assign` | JWT | Agent manual pick từ queue |
| `POST` | `/interactions/{id}/close` | JWT | Đóng interaction → tab "Đã đóng" |

### GoACD — Email Routing

| Method | Endpoint | Internal | Mô tả |
|---|---|---|---|
| `POST` | `/rpc/RouteEmail` | Service-to-service | Route email tới agent hoặc queue |

---

## 13. Kafka Topics

| Topic | Producer | Consumer | Mô tả |
|---|---|---|---|
| `channel.email.inbound` | Channel Gateway (EmailAdapter) | Interaction Service, GoACD | Email mới nhận từ Gmail |
| `email.queued` | GoACD | CTI Adapter → WS → Frontend | Email vào hàng chờ (không có agent available) |
| `email.assigned` | GoACD | CTI Adapter → WS → Frontend, Interaction Service | Email phân bổ cho agent |
| `interaction.email.sent` | Interaction Service | Audit Service | Agent gửi reply thành công |
| `email.thread.updated` | Interaction Service | CTI Adapter → WS → Frontend | Thread có email mới (inbound reply) |

---

## 14. Luồng xử lý chi tiết

### 14.1 Inbound Email — Mới (không có thread)

```
[1] Customer gửi email → tpbank.cs@gmail.com
[2] Gmail forward → support@crm.tpbank.vn (alias)
[3] Google Pub/Sub push → Channel Gateway webhook
[4] EmailAdapter:
    a. Fetch email via Gmail API (message.get)
    b. Parse: from, to, subject, body, attachments
    c. Extract alias: to = "support@crm.tpbank.vn"
    d. Check subject for [INT-XXXXXXXX] → KHÔNG CÓ → email mới
    e. Upload attachments → MinIO
    f. Publish Kafka: channel.email.inbound
[5] Interaction Service consume channel.email.inbound:
    a. Tạo Interaction (type: email, channel: email, direction: inbound, status: new)
    b. Gắn displayId = "INT-ABCD1234"
    c. Customer lookup by fromEmail → gắn customerId/customerName
    d. Lưu EmailMessage (direction: inbound, interactionId)
[6] Channel Gateway → GoACD: POST /rpc/RouteEmail
    a. Lookup alias → Agent Group "Support Team"
    b. Get candidates: agents trong group, email_status=ready, email_count < email_max
    c. Score agents (skill-based) hoặc round-robin
    d. Agent found → ClaimAgentEmail → Kafka: email.assigned
       Agent NOT found → enqueue → Kafka: email.queued
[7] CTI Adapter consume email.assigned / email.queued:
    → WS broadcast → Frontend
[8] Frontend:
    a. email.assigned → interaction xuất hiện trong tab "Đã nhận" agent
    b. email.queued → interaction xuất hiện trong tab "Hàng chờ"
```

### 14.2 Inbound Email — Reply vào thread hiện có

```
[1] Customer reply → subject: "Re: Yêu cầu mở thẻ tín dụng [INT-ABCD1234]"
[2] Gmail forward → alias
[3] Channel Gateway:
    a. Parse email
    b. Extract [INT-ABCD1234] từ subject → threadId found!
    c. Publish Kafka: channel.email.inbound (with threadId)
[4] Interaction Service:
    a. Lookup Interaction by displayId = "INT-ABCD1234" → found
    b. Lưu EmailMessage (interactionId = existing interaction)
    c. Nếu interaction đã đóng → reopen (status: in-progress)
    d. Publish Kafka: email.thread.updated
[5] CTI Adapter → WS: email:thread_updated
[6] Frontend:
    a. Nếu agent đang xem thread → auto-append email mới + scroll
    b. Nếu không → badge count update trên interaction item
    c. Nếu interaction đã đóng được reopen → chuyển về tab "Đã nhận"
```

### 14.3 Agent Reply

```
[1] Agent mở email thread → click "Reply" trên email #3
[2] Frontend:
    a. Build quoted content: email #3, #2, #1 (Outlook format)
    b. Pre-fill To: customer email
    c. Pre-fill Subject: "Re: [INT-ABCD1234] Yêu cầu mở thẻ tín dụng"
[3] Agent viết nội dung → bấm "Gửi"
[4] Frontend: POST /api/v1/interactions/{id}/email/reply
    Body: { content, to, cc, bcc, subject, attachmentIds, replyToMessageId }
[5] Interaction Service:
    a. Build full email: agent content + quoted thread
    b. Set headers: In-Reply-To = replyToMessage.headers['Message-ID']
    c. Set headers: References = chain of all Message-IDs in thread
    d. Upload new attachments → MinIO
    e. Build MIME message (RFC 2822)
    f. Lookup GmailAccount for alias → refresh token nếu cần
    g. Gmail API: messages.send (base64url encoded)
    h. Lưu EmailMessage (direction: outbound)
    i. Publish Kafka: interaction.email.sent
[6] Frontend: Toast "Email đã gửi thành công"
[7] Agent bấm "Đóng" khi xong → POST /interactions/{id}/close
    → Interaction status = closed
    → email_release.lua (email_count - 1)
    → Chuyển sang tab "Đã đóng"
```

### 14.4 Agent Manual Pick từ Hàng chờ

```
[1] Agent xem tab "Hàng chờ" → thấy email đang chờ
[2] Click nút "Nhận" trên email
[3] Frontend: POST /api/v1/interactions/{id}/assign { agentId: me }
[4] Interaction Service:
    a. Check agent email_count < email_max → OK
    b. GoACD: ClaimAgentEmail → HINCRBY email_count +1
    c. Update interaction: assignedAgentId = agentId, status = in-progress
    d. Remove from email queue (Redis ZREM)
    e. Publish Kafka: email.assigned
[5] Frontend:
    a. Email biến mất khỏi tab "Hàng chờ"
    b. Xuất hiện trong tab "Đã nhận"
```

---

## Tài liệu tham chiếu

| File | Mô tả |
|---|---|
| [09-2-email-channel.md](../09-channel-designs/09-2-email-channel.md) | Email channel design gốc (Gmail/MS365/IMAP adapters) |
| [06-channel-adapter-architecture.md](../06-channel-adapter-architecture.md) | IChannelAdapter interface, ChannelMessage, AdapterRegistry |
| [07-routing-engine.md](../07-routing-engine.md) | 5-factor scoring, queue management, SLA |
| [08-agent-state-management.md](../08-agent-state-management.md) | Redis agent state hash, Lua scripts |
| [11-type-system.md](../11-type-system.md) | ChannelType, InteractionType, AgentSkill |
| [14-frontend-changes.md](../14-frontend-changes.md) | Agent Desktop frontend changes |
| [EMAIL-SPRINT-PLANNING.md](./EMAIL-SPRINT-PLANNING.md) | Sprint plan triển khai |
