# Email Channel Sprint Planning — Kế hoạch triển khai

> **Ngày tạo:** 2026-03-20
> **Tham chiếu:** [EMAIL-CHANNEL-DESIGN.md](./EMAIL-CHANNEL-DESIGN.md) | [INDEX.md](../INDEX.md)
> **Thiết kế chi tiết:** [EMAIL-CHANNEL-DESIGN.md](./EMAIL-CHANNEL-DESIGN.md)

---

## Mục lục

1. [Tổng quan Sprint](#1-tổng-quan-sprint)
2. [Dependencies](#2-dependencies)
3. [Phase E1: Gmail Integration + Email Adapter](#3-phase-e1-gmail-integration--email-adapter)
4. [Phase E2: GoACD Email Routing + Queue](#4-phase-e2-goacd-email-routing--queue)
5. [Phase E3: Interaction Service — Email + Threading](#5-phase-e3-interaction-service--email--threading)
6. [Phase E4: Frontend — Email Tabs + Thread + Reply](#6-phase-e4-frontend--email-tabs--thread--reply)
7. [Phase E5: Customer Match + Admin Config + Testing](#7-phase-e5-customer-match--admin-config--testing)
8. [Tiêu chí Done](#8-tiêu-chí-done)
9. [Rủi ro & Giảm thiểu](#9-rủi-ro--giảm-thiểu)
10. [Tài liệu tham chiếu theo Phase](#10-tài-liệu-tham-chiếu-theo-phase)

---

## 1. Tổng quan Sprint

### Sprint 20: EMAIL CHANNEL MVP (6 tuần, ~30 ngày)

```
Phase E1 (Tuần 1-2):  GMAIL INTEGRATION + EMAIL ADAPTER
Phase E2 (Tuần 2-3):  GOACD EMAIL ROUTING + QUEUE
Phase E3 (Tuần 3-4):  INTERACTION SERVICE — EMAIL + THREADING
Phase E4 (Tuần 4-5):  FRONTEND — EMAIL TABS + THREAD + REPLY
Phase E5 (Tuần 5-6):  CUSTOMER MATCH + ADMIN CONFIG + TESTING
```

**Tổng effort: ~30 ngày (6 tuần)**

**Pre-requisites:**
- ✅ Channel Gateway (MS-20) running với AdapterRegistry
- ✅ GoACD running với scoring + queue management
- ✅ Interaction Service running với CRUD + Kafka events
- ✅ Agent Service running với skills + groups + Redis state
- ✅ Customer Service running với lookup endpoints
- ✅ Frontend InteractionList + InteractionDetail components
- ✅ Kafka + Redis + PostgreSQL infrastructure
- ⚠️ Cần: Google Cloud Project với Gmail API enabled + Pub/Sub topic
- ⚠️ Cần: MinIO/SeaweedFS running cho attachment storage

---

## 2. Dependencies

```
Phase E1 (Gmail Adapter) ───────┐
                                 ├──→ Phase E3 (Threading + DB) ──→ Phase E4 (Frontend)
Phase E2 (GoACD Email Routing) ─┘                                     │
                                                                       ▼
                                                                 Phase E5 (Test)
```

**Parallel work:**
- E1 và E2 có thể chạy **song song** (independent)
- E3 cần E1 (EmailAdapter normalize) + E2 (routing result)
- E4 cần E3 (API endpoints)
- E5 cần E4 (frontend done)

---

## 3. Phase E1: GMAIL INTEGRATION + EMAIL ADAPTER (Tuần 1-2 — 8 ngày)

**Mục tiêu:** Kết nối Gmail qua OAuth2, nhận email push notification, parse email, gửi email qua Gmail API.

| # | Task | Module | Chi tiết | Effort | Output |
|---|---|---|---|---|---|
| **S20.1** | **GmailAccount entity + OAuth2 flow** | Channel Gateway | (1) GmailAccount entity (email, accessToken encrypted, refreshToken encrypted, tokenExpiresAt, watchExpiration, historyId). (2) `GET /gmail/oauth/init` → redirect Google consent screen (scopes: gmail.readonly, gmail.send, gmail.modify, pubsub). (3) `GET /gmail/oauth/callback` → exchange code → lưu tokens (AES-256-GCM). (4) Token refresh helper: check expiry, auto-refresh before API calls. (5) `GET /gmail-accounts` list. (6) `DELETE /gmail-accounts/{id}` disconnect | 2d | OAuth2 flow hoạt động, tokens encrypted |
| **S20.2** | **Gmail Pub/Sub watch + webhook** | Channel Gateway | (1) Tạo Google Cloud Pub/Sub topic `gmail-push`. (2) Sau OAuth connect → `POST gmail/users/me/watch` (topicName, labelIds: INBOX). (3) Webhook endpoint `POST /gmail/webhook`: verify Pub/Sub signature, extract emailAddress + historyId. (4) BullMQ cron job mỗi 6 ngày: renew watch cho tất cả GmailAccounts. (5) Fallback polling job mỗi 60s: `GET /users/me/history` cho dedup | 1.5d | Push notification hoạt động |
| **S20.3** | **EmailAdapter implements IChannelAdapter** | Channel Gateway | (1) `initialize()`: setup Gmail client, verify tokens. (2) Webhook handler: nhận push → `GET /users/me/history?startHistoryId` → lấy new message IDs. (3) Fetch full message: `GET /users/me/messages/{id}?format=full`. (4) Parse MIME: extract from, to, cc, subject, body (HTML + text), inline images. (5) `normalize()` → ChannelMessage { from, to, content, metadata: { gmailMessageId, gmailThreadId, headers } }. (6) Register vào AdapterRegistry. (7) HTML sanitization (DOMPurify server-side hoặc sanitize-html). (8) Publish Kafka: `channel.email.inbound` | 2d | Email inbound normalized |
| **S20.4** | **Email send via Gmail API** | Channel Gateway | (1) `send(message: ChannelMessage)`: build MIME message (RFC 2822). (2) Set headers: From, To, CC, BCC, Subject, In-Reply-To, References, Content-Type (multipart/mixed). (3) Inline images: Content-Disposition inline, CID references. (4) Attachments: multipart/mixed, base64 encoded. (5) `POST /users/me/messages/send` (base64url encoded raw). (6) Return sent message ID. (7) Handle errors: 429 rate limit (retry), 401 token expired (refresh), 403 insufficient permissions | 1.5d | Email outbound qua Gmail API |
| **S20.5** | **Attachment handling + storage** | Channel Gateway | (1) Parse MIME attachments: filename, mimeType, size, content. (2) Upload to MinIO/SeaweedFS: `PUT /email-attachments/{uuid}/{filename}`. (3) Generate presigned download URL (1h expiry). (4) Inline images: upload + replace CID references với MinIO URLs. (5) Size validation: max 25MB per attachment (Gmail limit), max 50MB total. (6) Virus scan placeholder (log warning if > 10MB) | 1d | Attachments stored + accessible |

**Deliverable Phase E1:**
- Gmail OAuth2 connect/disconnect hoạt động
- Email inbound: Gmail → Pub/Sub → webhook → parse → ChannelMessage → Kafka
- Email outbound: ChannelMessage → MIME → Gmail API → sent
- Attachments: parse → MinIO → presigned URLs
- Token auto-refresh, watch auto-renew

**Tham chiếu:**
- [09-2-email-channel.md §Gmail](../09-channel-designs/09-2-email-channel.md)
- [06-channel-adapter-architecture.md](../06-channel-adapter-architecture.md)

---

## 4. Phase E2: GOACD EMAIL ROUTING + QUEUE (Tuần 2-3 — 6 ngày)

**Mục tiêu:** GoACD routing email theo Agent Group + Skill. Agent capacity limit. Email queue polling.

| # | Task | Module | Chi tiết | Effort | Output |
|---|---|---|---|---|---|
| **S20.6** | **EmailAlias entity + CRUD API** | Channel Gateway | (1) EmailAlias entity (aliasAddress unique, agentGroupId, routingMode, requiredSkills, slaThresholdMinutes, maxQueueSize, gmailAccountId). (2) `GET /email-aliases` list (filter by tenantId, isActive). (3) `POST /email-aliases` create (validate unique address, validate agentGroupId exists). (4) `PATCH /email-aliases/{id}` update. (5) `DELETE /email-aliases/{id}` soft delete (isActive=false). (6) Validation: aliasAddress format, routingMode enum | 1d | Alias CRUD hoạt động |
| **S20.7** | **GoACD: POST /rpc/RouteEmail endpoint** | GoACD (Go) | (1) HTTP handler `handleRouteEmail(req)`. (2) Lookup alias by aliasId/aliasAddress → get agentGroupId, routingMode, requiredSkills. (3) Get candidates: Redis SMEMBERS `available:email` → filter by group membership. (4) **Skill-based mode:** reuse `ScoreAgents()` with channel=email, capacity fields=email_count/email_max. (5) **Round-robin mode:** select agent with lowest email_count (tiebreak: longest idle). (6) Agent found → `ClaimAgentEmail()` → return {assigned:true, agentId}. (7) No agent → `enqueueEmail()` → Redis ZADD `queue:email:{aliasId}:entries` → return {assigned:false, queuePosition}. (8) HTTP response trả ngay | 2d | Email routing hoạt động |
| **S20.8** | **GoACD: email_claim.lua + email_release.lua** | GoACD (Go) | (1) `email_claim.lua`: check email_status=ready + email_count < email_max → HINCRBY email_count +1, SREM from available:email nếu at capacity. (2) `email_release.lua`: HINCRBY email_count -1, SADD to available:email nếu under capacity. (3) Methods: `ClaimAgentEmail(agentId, interactionId)`, `ReleaseAgentEmail(agentId)`. (4) Unit test Lua scripts | 0.5d | Atomic email claim/release |
| **S20.9** | **GoACD: emailQueuePoller goroutine** | GoACD (Go) | (1) Goroutine chạy mỗi 10s. (2) For each active alias: peek queue entries (Redis ZRANGE). (3) For each entry: get candidates, score, claim, assign. (4) Successful assign → ZREM from queue, publish Kafka `email.assigned`. (5) Config: poll interval (default 10s), max assignments per poll cycle (default 5). (6) Graceful shutdown: stop ticker on SIGTERM | 1d | Auto-assign từ queue |
| **S20.10** | **Agent email capacity fields** | Agent Service + GoACD | (1) Agent Service: thêm `maxConcurrentEmail` column vào AgentProfile (default 10). (2) Admin API: `PATCH /agents/{id}` update maxConcurrentEmail. (3) Agent login → sync email_max vào Redis hash. (4) GoACD: đọc email_count + email_max từ Redis khi scoring. (5) Redis: thêm `email_status`, `email_count`, `email_max` vào agent:state:{id} hash. (6) Agent set email_status = ready khi login (nếu có email skill) | 0.5d | Capacity enforcement |
| **S20.11** | **Kafka events + CTI Adapter broadcast** | GoACD + CTI Adapter | (1) GoACD publish: `email.queued` {interactionId, aliasId, queuePosition, aliasAddress}, `email.assigned` {interactionId, agentId, agentName, aliasAddress}. (2) CTI Adapter: subscribe `email.queued`, `email.assigned`. (3) Broadcast via Socket.IO: `email:queued` (to all agents in alias group), `email:assigned` (to specific agent room). (4) Frontend: listen events → update InteractionList | 1d | Real-time email events |

**Deliverable Phase E2:**
- GoACD route email: skill-based (5-factor) hoặc round-robin
- Agent email_count enforced (Lua scripts)
- Queue polling auto-assign mỗi 10s
- Kafka events → WS → Frontend real-time

**Tham chiếu:**
- [07-routing-engine.md](../07-routing-engine.md) — Scoring algorithm
- [08-agent-state-management.md](../08-agent-state-management.md) — Redis state
- [18-4-goacd-architecture.md](../18-voice-platform/18-4-goacd-architecture.md) — GoACD module structure

---

## 5. Phase E3: INTERACTION SERVICE — EMAIL + THREADING (Tuần 3-4 — 6 ngày)

**Mục tiêu:** EmailMessage entity, thread logic, reply endpoint, email thread API.

| # | Task | Module | Chi tiết | Effort | Output |
|---|---|---|---|---|---|
| **S20.12** | **EmailMessage entity + migration** | Interaction Service | (1) TypeORM entity EmailMessage (id, interactionId, gmailMessageId, gmailThreadId, direction, fromEmail, fromName, toEmails, ccEmails, bccEmails, subject, bodyHtml, bodyText, attachments JSONB, headers JSONB, receivedAt, sentAt, readAt, createdAt). (2) Migration SQL: CREATE TABLE email_messages + indexes (interaction_id, gmail_thread_id, gmail_message_id, from_email). (3) Repository: EmailMessageRepository (findByInteractionId, findByGmailThreadId, findByGmailMessageId) | 1d | DB schema ready |
| **S20.13** | **Thread ID extraction + auto-create interaction** | Interaction Service | (1) Helper: `extractThreadId(subject)` → regex `\[INT-([A-Z0-9]{8})\]`. (2) Kafka consumer `channel.email.inbound`: parse event, extract threadId. (3) ThreadId found → lookup Interaction by displayId. (4) ThreadId NOT found → fallback: lookup by gmailThreadId, then In-Reply-To header. (5) Still not found → create new Interaction (type:email, channel:email, direction:inbound, status:new, displayId generated). (6) Gắn `[INT-XXXX]` vào interaction metadata cho reply subject | 1.5d | Threading logic hoạt động |
| **S20.14** | **Email thread append + reopen** | Interaction Service | (1) Khi email inbound match existing interaction → save new EmailMessage. (2) Nếu interaction status = closed/resolved → reopen: set status = in-progress. (3) Publish Kafka: `email.thread.updated` {interactionId, emailMessageId, direction}. (4) Update interaction.updatedAt. (5) Dedup: check gmailMessageId không trùng (Gmail webhook có thể gửi duplicate) | 1d | Thread append + reopen |
| **S20.15** | **GET /interactions/{id}/email-thread API** | Interaction Service | (1) Endpoint: `GET /interactions/{id}/email-thread`. (2) Query: `SELECT * FROM email_messages WHERE interaction_id = :id ORDER BY COALESCE(received_at, sent_at, created_at) ASC`. (3) Response: `{ interactionId, subject, emailCount, messages: EmailMessage[] }`. (4) Mỗi message include: direction, from, to, cc, subject, bodyHtml, bodyText, attachments (with presigned URLs), receivedAt/sentAt. (5) Presigned URL refresh: nếu attachment URL expired → regenerate | 0.5d | Thread API hoạt động |
| **S20.16** | **POST /interactions/{id}/email/reply** | Interaction Service | (1) Request body: `{ content, to, cc?, bcc?, replyToMessageId, attachmentIds? }`. (2) Build subject: `Re: {originalSubject} [INT-XXXX]`. (3) Build quoted content: lấy tất cả EmailMessages trong thread từ replyTo message trở về trước, format Outlook-style (`On {date}, {name} wrote:\n> {content}`). (4) Build full body: agent content + `\n\n--- Quoted ---\n` + quoted. (5) Set headers: In-Reply-To = replyToMessage.headers.messageId, References = chain. (6) Gọi Channel Gateway EmailAdapter.send() (hoặc trực tiếp Gmail API). (7) Lưu EmailMessage (direction: outbound, sentAt: now). (8) Publish Kafka: `interaction.email.sent`. (9) Error handling: Gmail API 429/401/403 | 1.5d | Reply hoạt động |
| **S20.17** | **Mark read + thread Kafka events** | Interaction Service | (1) `PATCH /interactions/{id}/email/read` body: `{ messageIds: string[] }`. (2) Update EmailMessage.readAt = now WHERE id IN messageIds. (3) Publish Kafka: `email.thread.updated` khi có email mới. (4) Socket.IO forward: CTI Adapter consume → broadcast `email:thread_updated` {interactionId} → frontend refresh | 0.5d | Read tracking + WS events |

**Deliverable Phase E3:**
- EmailMessage entity + DB migration
- Thread ID extraction (regex + Gmail threadId + In-Reply-To fallback)
- Auto-create interaction cho email mới
- Thread append cho reply vào interaction hiện có
- Reply with full quoted thread (Outlook format)
- Real-time thread update events

**Tham chiếu:**
- [EMAIL-CHANNEL-DESIGN.md §5](./EMAIL-CHANNEL-DESIGN.md#5-email-threading--interaction-id) — Threading logic
- [EMAIL-CHANNEL-DESIGN.md §9](./EMAIL-CHANNEL-DESIGN.md#9-frontend--interactiondetail-email-thread--reply) — Reply format

---

## 6. Phase E4: FRONTEND — EMAIL TABS + THREAD + REPLY (Tuần 4-5 — 7 ngày)

**Mục tiêu:** InteractionList 3 tabs cho email, EmailThread real data, Reply with quoted content.

| # | Task | Module | Chi tiết | Effort | Output |
|---|---|---|---|---|---|
| **S20.18** | **InteractionList: 3 sub-tabs cho email** | InteractionList.tsx / App.tsx | (1) Khi channelFilter = 'email' → hiện 3 sub-tabs: "Đã nhận", "Hàng chờ", "Đã đóng". (2) "Đã nhận": `GET /interactions?channel=email&assignedAgentId=me&status=new,in-progress`. (3) "Hàng chờ": `GET /interactions?channel=email&status=queued&aliasGroupId=myGroups` (filter by agent's groups). (4) "Đã đóng": `GET /interactions?channel=email&assignedAgentId=me&status=resolved,closed`. (5) Badge count trên mỗi tab. (6) Sorting: Đã nhận (SLA gần breach), Hàng chờ (FIFO chờ lâu nhất), Đã đóng (mới nhất). (7) TanStack Query hooks cho mỗi tab | 1.5d | 3 tabs hoạt động |
| **S20.19** | **Tab "Hàng chờ": nút "Nhận"** | InteractionListItem.tsx | (1) Khi interaction ở tab Hàng chờ → hiện nút "Nhận" (UserPlus icon). (2) Click → `POST /interactions/{id}/assign` {agentId: me}. (3) Backend check capacity → assign → WS event. (4) Optimistic update: move interaction từ Hàng chờ → Đã nhận ngay lập tức. (5) Error: "Đã vượt giới hạn email" → toast error. (6) WS listen `email:assigned` → invalidate queries | 0.5d | Manual pick hoạt động |
| **S20.20** | **InteractionDetail: wire EmailThread với real API** | InteractionDetail.tsx + useEmailThread.ts (mới) | (1) Tạo hook `useEmailThread(interactionId)`: `useQuery` fetch `GET /interactions/{id}/email-thread`. (2) Cache 30s, refetch on focus. (3) Map API response → EmailMessage[] (existing EmailThread component interface). (4) Wire vào InteractionDetail email tab: thay mock data bằng real API data. (5) Loading state, error state, empty state ("Không có email") | 1.5d | Email thread từ API |
| **S20.21** | **Auto-focus email mới nhất** | EmailThread.tsx | (1) Sau render → scroll xuống email cuối cùng: `useEffect(() => lastRef.current?.scrollIntoView({ behavior: 'smooth' }), [messages])`. (2) Email mới nhất: badge "★ MỚI" (nếu readAt = null). (3) Khi agent mở thread → auto mark read: `PATCH /interactions/{id}/email/read`. (4) Unread count badge trên InteractionListItem | 0.5d | Auto-scroll + unread badge |
| **S20.22** | **Reply area: quoted content Outlook-style** | EmailReplyInline.tsx | (1) Khi Reply → build quoted content từ thread messages: tất cả emails từ selected email trở về email #1. (2) Format mỗi email: `On {date}, {fromName} <{fromEmail}> wrote:\n> {bodyText với > prefix mỗi dòng}`. (3) Separator: `\n\n--- Quoted ---\n\n`. (4) Pre-fill trong textarea/editor dưới agent input area. (5) Agent viết PHÍA TRÊN quoted content. (6) Rich text: quoted content read-only (grey background, indented). (7) Reply All: pre-fill CC với tất cả recipients (trừ agent). (8) Forward: clear To, giữ quoted content | 1.5d | Quoted reply hoạt động |
| **S20.23** | **Wire EmailReplyInline với real send API** | EmailReplyInline.tsx | (1) Bấm "Gửi" → `POST /interactions/{id}/email/reply` { content, to, cc, bcc, replyToMessageId }. (2) Attachment upload: `POST /media/upload` → get attachmentIds → include trong reply. (3) Loading state: disable Send button, show spinner. (4) Success: toast "Email đã gửi", close reply area, refetch thread. (5) Error: toast error message, keep reply area open. (6) Draft save: `localStorage` key `email-draft-{interactionId}` → auto-restore khi reopen | 1d | Send email hoạt động |
| **S20.24** | **WS real-time: email events** | useCallEvents.ts / App.tsx | (1) Listen Socket.IO `email:assigned` → invalidate Đã nhận query, toast "Email mới được phân bổ". (2) Listen `email:queued` → invalidate Hàng chờ query. (3) Listen `email:thread_updated` → nếu đang xem thread đó → refetch email thread (auto-append). (4) Listen `email:thread_updated` → nếu không đang xem → badge update trên interaction item. (5) Audio notification cho email mới assign (nhẹ hơn call ring) | 0.5d | Real-time updates |

**Deliverable Phase E4:**
- InteractionList: 3 tabs (Đã nhận / Hàng chờ / Đã đóng) hoạt động
- Manual pick từ Hàng chờ
- EmailThread hiện real data từ API
- Auto-focus email mới nhất + unread badges
- Reply with full Outlook-style quoted content
- Send email qua Gmail API từ frontend
- Real-time WS updates

**Tham chiếu:**
- [EMAIL-CHANNEL-DESIGN.md §8](./EMAIL-CHANNEL-DESIGN.md#8-frontend--interactionlist-tabs) — InteractionList tabs
- [EMAIL-CHANNEL-DESIGN.md §9](./EMAIL-CHANNEL-DESIGN.md#9-frontend--interactiondetail-email-thread--reply) — InteractionDetail layout
- [14-frontend-changes.md](../14-frontend-changes.md)

---

## 7. Phase E5: CUSTOMER MATCH + ADMIN CONFIG + TESTING (Tuần 5-6 — 3 ngày)

**Mục tiêu:** Auto-match email → customer, Admin config UI, E2E testing.

| # | Task | Module | Chi tiết | Effort | Output |
|---|---|---|---|---|---|
| **S20.25** | **Customer auto-match by email** | Interaction Service + Customer Service | (1) Khi create interaction từ email inbound → `GET /customers?email={fromEmail}`. (2) Customer found → set interaction.customerId + customerName. (3) Multiple customers → chọn first match (agent có thể đổi). (4) Not found → `POST /customers` tạo mới: name=fromName (parse từ email From header), email=fromEmail, customerType=individual, status=active. (5) Frontend: CustomerInfoScrollFixed panel load theo customerId → hiện tên, email, lịch sử, sản phẩm. (6) Agent có thể "Đổi khách hàng" nếu match sai | 1d | Customer auto-match |
| **S20.26** | **Admin UI: Email Alias + Gmail Account** | Admin pages | (1) Page "Email Integration" trong Admin settings. (2) Section "Gmail Accounts": list connected accounts, nút "Kết nối Gmail" → OAuth2 flow, nút "Ngắt kết nối". (3) Section "Email Aliases": table list aliases, nút "Tạo alias". (4) Alias form: aliasAddress, displayName, agentGroup (dropdown), routingMode (radio: skill-based/round-robin), requiredSkills (multi-select), SLA (input minutes). (5) Edit/Delete alias. (6) Cơ bản functional — UI polish trong sprint sau | 1d | Admin config hoạt động |
| **S20.27** | **E2E test: email flow** | E2E | (1) Test inbound: mock Gmail webhook → Channel Gateway → Interaction created → GoACD route → agent assigned. (2) Test threading: 2nd email same thread → appended to interaction. (3) Test reply: agent reply → Gmail API called → EmailMessage saved → quoted content correct. (4) Test queue: no agent available → email queued → agent becomes available → auto-assign. (5) Test capacity: agent at email_max → not assigned more. (6) Test manual pick: agent picks from queue → assigned. (7) Test close: agent closes → tab Đã đóng | 1d | E2E pass |

**Deliverable Phase E5:**
- Customer auto-match bằng email address
- Admin UI: manage Gmail accounts + email aliases
- E2E tests pass cho toàn bộ email flow

---

## 8. Tiêu chí Done

### Phase E1 Done ✓
- [ ] Gmail OAuth2: connect → tokens stored (encrypted) → disconnect works
- [ ] Gmail watch: Pub/Sub push received within 30s of new email
- [ ] Watch auto-renew cron (6 ngày) configured
- [ ] EmailAdapter.normalize(): email → ChannelMessage (from, to, subject, body, attachments)
- [ ] HTML sanitized (no XSS vectors)
- [ ] Attachments uploaded to MinIO, presigned URLs accessible
- [ ] Gmail API send: MIME message with headers (In-Reply-To, References)
- [ ] Token auto-refresh on 401
- [ ] Kafka `channel.email.inbound` published for each new email

### Phase E2 Done ✓
- [ ] EmailAlias CRUD API (create, list, update, delete)
- [ ] `POST /rpc/RouteEmail` returns assigned or queued
- [ ] Skill-based routing: 5-factor scoring with email capacity
- [ ] Round-robin routing: lowest email_count wins
- [ ] `email_claim.lua`: atomic claim, capacity enforcement
- [ ] `email_release.lua`: atomic release, re-add to available set
- [ ] Queue poller: mỗi 10s, auto-assign from queue
- [ ] Agent `maxConcurrentEmail` configurable (default 10)
- [ ] Redis: email_status, email_count, email_max in agent hash
- [ ] Kafka: `email.queued`, `email.assigned` published
- [ ] CTI Adapter: consume → Socket.IO broadcast

### Phase E3 Done ✓
- [ ] EmailMessage entity + email_messages table created
- [ ] Thread ID extraction: regex `[INT-XXXXXXXX]` from subject
- [ ] Fallback threading: Gmail threadId → In-Reply-To header
- [ ] New email (no thread) → create Interaction + EmailMessage
- [ ] Reply email (thread found) → append EmailMessage to interaction
- [ ] Closed interaction reopen on new inbound email
- [ ] `GET /interactions/{id}/email-thread` returns all messages sorted
- [ ] `POST /interactions/{id}/email/reply`: quoted content Outlook-style
- [ ] Gmail API send called with correct headers
- [ ] Dedup: duplicate gmailMessageId ignored
- [ ] Kafka: `interaction.email.sent`, `email.thread.updated`

### Phase E4 Done ✓
- [ ] InteractionList: 3 sub-tabs khi channel=email (Đã nhận, Hàng chờ, Đã đóng)
- [ ] Badge counts trên mỗi tab
- [ ] Tab "Hàng chờ": nút "Nhận" → manual pick → move to Đã nhận
- [ ] EmailThread hiện real API data (không mock)
- [ ] Auto-focus email mới nhất trong thread
- [ ] Unread badge trên InteractionListItem
- [ ] Reply: quoted content includes ALL previous emails (Outlook format)
- [ ] Reply All: CC auto-filled
- [ ] Send button → Gmail API → success toast → thread refreshed
- [ ] Attachment upload → MinIO → attached to reply
- [ ] WS events: email:assigned, email:queued, email:thread_updated → real-time UI update
- [ ] Draft auto-save localStorage

### Phase E5 Done ✓
- [ ] Customer auto-match by email → customerId set trên interaction
- [ ] New customer auto-created nếu email chưa có trong hệ thống
- [ ] CustomerInfoScrollFixed hiện thông tin customer cho email interactions
- [ ] Admin page: Gmail Account connect/disconnect
- [ ] Admin page: Email Alias CRUD (alias, group, routing mode, skills, SLA)
- [ ] E2E tests pass (inbound, threading, reply, queue, capacity, manual pick, close)

---

## 9. Rủi ro & Giảm thiểu

| # | Rủi ro | Xác suất | Ảnh hưởng | Giảm thiểu |
|---|---|---|---|---|
| 1 | **Gmail API quota limits** (250 quota units/sec per user) | Medium | High | Rate limiting trong EmailAdapter, exponential backoff, batch fetch (`messages.list` thay vì từng message) |
| 2 | **Gmail Pub/Sub push delay > 30s** | Low | Medium | Fallback polling mỗi 60s via BullMQ job |
| 3 | **Email threading mismatch** (customer xoá [INT-...] khỏi subject) | Medium | Medium | 3-layer fallback: (1) Regex [INT-XXX] → (2) Gmail threadId → (3) In-Reply-To header |
| 4 | **Large attachments > 25MB** | Low | Medium | Validate size trước upload, error message "Tệp đính kèm vượt 25MB", suggest split |
| 5 | **OAuth2 token expired giữa chừng** | Medium | High | Auto-refresh 5 phút trước expiry, retry on 401 (max 3 lần) |
| 6 | **GoACD email routing latency** | Low | Low | Email không real-time (khác voice), 10s poll delay acceptable |
| 7 | **Email bomb / spam flood** | Medium | High | Max queue size per alias (default 100), rate limit per sender (max 10/hour), spam flag |
| 8 | **HTML email rendering XSS** | Low | Critical | Server-side sanitize (sanitize-html), CSP headers, iframe sandbox cho preview |
| 9 | **Google Cloud Pub/Sub setup phức tạp** | Medium | Medium | Document step-by-step setup guide, fallback polling nếu Pub/Sub fail |
| 10 | **MinIO/SeaweedFS down → attachment inaccessible** | Low | Medium | Presigned URL retry, show "Tải lại" button, cache attachment metadata |

---

## 10. Tài liệu tham chiếu theo Phase

| Phase | Files cần đọc trước khi code |
|---|---|
| **Phase E1** | [09-2-email-channel.md](../09-channel-designs/09-2-email-channel.md) (Gmail adapter design), [06-channel-adapter-architecture.md](../06-channel-adapter-architecture.md) (IChannelAdapter interface), `services/channel-gateway/src/gateway/channel-adapter.interface.ts`, `services/channel-gateway/src/gateway/adapter-registry.service.ts` |
| **Phase E2** | [07-routing-engine.md](../07-routing-engine.md) (scoring algorithm), [08-agent-state-management.md](../08-agent-state-management.md) (Redis state), `services/goacd/internal/routing/scorer.go`, `services/goacd/internal/agent/state.go` (Lua scripts), `services/goacd/internal/queue/manager.go` |
| **Phase E3** | [EMAIL-CHANNEL-DESIGN.md §5](./EMAIL-CHANNEL-DESIGN.md#5-email-threading--interaction-id) (threading logic), `services/interaction-service/src/entities/interaction.entity.ts`, `services/interaction-service/src/interaction/interaction.service.ts`, `services/interaction-service/src/interaction/call-event-consumer.service.ts` (pattern for Kafka consumer) |
| **Phase E4** | [EMAIL-CHANNEL-DESIGN.md §8-9](./EMAIL-CHANNEL-DESIGN.md#8-frontend--interactionlist-tabs) (UI design), `apps/agent-desktop/src/components/InteractionList.tsx` (hiện có), `apps/agent-desktop/src/components/InteractionDetail.tsx` (hiện có), `apps/agent-desktop/src/components/EmailThread.tsx` (hiện có, dùng mock), `apps/agent-desktop/src/components/EmailReplyInline.tsx` (hiện có, dùng mock) |
| **Phase E5** | `apps/agent-desktop/src/components/CustomerInfoScrollFixed.tsx`, `apps/agent-desktop/src/components/CustomerSelection.tsx`, `services/customer-service/` |
