# Requirements: Agent Desktop TPB — Multi-Channel Customer Service Workspace

> **Kiro Spec** · Version 2.0 · 2026-03-04
> Product: Agent Desktop TPB (Tiên Phong Bank)
> Stack: React 18 · TypeScript · Vite + SWC · Tailwind CSS · shadcn/ui
> Analysis: 26 interactive Playwright screenshots + full source-code inspection of all 6 core context/component files

---

## Feature Overview

**Purpose:** A unified, single-page browser workspace that replaces per-channel siloed tools for bank call-centre agents. Agents at Tiên Phong Bank handle voice calls, emails, and chat sessions simultaneously from a single screen without switching applications.

**Problem solved:** Agents previously juggled 3–5 separate systems (telephony softphone, email client, chat dashboard, CRM, ticketing tool) during a single customer interaction, causing context loss, handling-time inflation, and SLA breaches.

**Value:** One workspace manages the full interaction lifecycle — routing queue, channel-specific detail views, live CRM lookup, ticket creation and follow-up, AI-assisted response, and knowledge retrieval — while surfacing real-time notifications and enforcing SLA visibility.

---

### Observed Layout (1920 × 1080 — confirmed via screenshots)

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│  AD Agent Desktop  │ Dashboard / Tương tác │ Calls:7 Emails:6 Chats:8 │ Sẵn sàng 3/3 kênh │ Ready │ Break │ 🔔 │ Agent Tung ▾ │
├──────────────────┬──────────────────────────────────┬───────────────────────────┤
│ Danh sách        │                                  │  Customer Info /          │
│ tương tác 12/21  │   Interaction Detail             │  Ticket Detail            │
│                  │                                  │                           │
│ [Hàng chờ 4]     │  [Tương tác][AI Hỗ trợ]         │  [Hồ sơ][Lịch sử]        │
│ [Đã nhận 12]     │  [Kiến thức][Tạo Ticket]         │  [Ticket][Truy vấn core]  │
│ [Đã đóng 5]      │  [Truy vấn TT]                   │  [Ghi chú]                │
│                  │                                  │                           │
│ 🔍 Search        │  Voice: recording + timeline     │  Tạo ticket từ            │
│ Bộ lọc nâng cao  │  Email: thread + reply           │  tương tác này ▸          │
│                  │  Chat: messages + SLA badge      │                           │
│ [Interaction     │                                  │  Ticket list with         │
│  cards with      │                                  │  status/priority chips    │
│  status badges]  │                                  │                           │
│                  │                                  │                           │
│ Demo Controls ▾  │                                  │                           │
└──────────────────┴──────────────────────────────────┴───────────────────────────┘
                                                           ↗ FloatingCallWidget (fixed bottom-right)
```

---

## User Stories

---

### US-1: Multi-Channel Interaction Queue

**As an agent**, I want to see all my interactions across voice, email, and chat in a single prioritised list, so that I can select the next interaction without switching tools.

**Acceptance Criteria**

| # | Observed behaviour (screenshots + DOM logs) |
|---|---------------------------------------------|
| AC-1.1 | List header shows **"Danh sách tương tác"** with a **N/total** count badge (observed: 12/21). |
| AC-1.2 | Three assignment tabs rendered as buttons: **Hàng chờ (4)**, **Đã nhận (12)**, **Đã đóng (5)**. Active tab is blue-filled; switching tab filters the list immediately. |
| AC-1.3 | Each interaction card displays: coloured left-border (channel colour), channel icon, status badge (e.g. "Đang đến ra", "Đã giải quyết", "Chuyển cấp trên"), customer name + email, subject snippet, relative timestamp, assigned agent tag, keyword tags. |
| AC-1.4 | Header channel-stat chips — **Calls: 7**, **Emails: 6**, **Chats: 8** — act as single-channel filter shortcuts; clicking one sets the channel filter and updates the list. |
| AC-1.5 | **"Bộ lọc nâng cao"** toggle button expands an advanced-filter row. Observed filter dropdowns for call direction ("Cuộc gọi (7)"), date range, and SLA status. Closing the toggle collapses the row. |
| AC-1.6 | Search input placeholder: **"Tìm kiếm tương tác…"**. Typing "xyznotfound123" produces an empty-state with an icon and "Không tìm thấy tương tác" message. Typing "Trần" narrows results to matching items in real time. |
| AC-1.7 | VIP customer cards display a crown icon. Escalated interactions show an orange left-border with the "Chuyển cấp trên" status badge. |
| AC-1.8 | The "Demo Controls" accordion is collapsed by default at the bottom of the list; clicking it exposes trigger buttons: **Start Call**, **Missed Call**, **VIP Call**, **3 Missed Calls**, **Ticket**, **Schedule**, **Due Soon**, **System**, **Shortcuts**, **View BFSI**, **TKT-001**, **TKT-002**, **Focus Tickets Tab**. |

---

### US-2: Interaction Detail — Voice Call

**As an agent**, I want to view the complete call record — recording, timeline, call history — and take actions (create ticket, transfer) without leaving the screen.

**Acceptance Criteria**

| # | Observed behaviour |
|---|-------------------|
| AC-2.1 | Selecting a call interaction sets the centre-panel header to **"Cuộc gọi"** with the customer sub-header. |
| AC-2.2 | If `recording.url` is present, **"Âm phát âm cuộc gọi"** section renders a blue waveform visualisation with play/pause, seek bar, and elapsed/total time. |
| AC-2.3 | **"Cuộc gọi đã hoàn thành"** section shows call-event timeline with a green "Đã kết thúc" badge, call duration, and per-event timestamps. A "1×" speed toggle and "Xem thêm (7 events)" expansion link are visible. |
| AC-2.4 | **"Lịch sử cuộc gọi"** section lists related past calls with direction badge ("Cuộc gọi đến"), callback badge ("Cần gọi lại"), duration, and source phone number. |
| AC-2.5 | **"Thêm ghi chú bổ sung"** button opens an inline notes input; notes persist within the session. |
| AC-2.6 | Top-level action tabs in the centre panel: **Tương tác** · **AI Hỗ Trợ** · **Kiến thức** · **Tạo Ticket** · **Truy vấn TT**. |

---

### US-3: Interaction Detail — Email Thread

**As an agent**, I want to read the full email thread and compose an inline reply, so that I can respond without opening an external email client.

**Acceptance Criteria**

| # | Observed behaviour |
|---|-------------------|
| AC-3.1 | Centre panel header shows **"Email · [Customer Name]"**. An **"Email Nhận"** section (blue envelope icon) shows the inbound message with from/to fields. Three icon buttons top-right: reply, forward, overflow menu. |
| AC-3.2 | Email thread renders each message with sender, timestamp, body, and attachment list. |
| AC-3.3 | Spam-flagged sender ("fake@suspicious-domain.xyz") triggers a warning prefix **"CẢNH BÁO: Email này có dấu hiệu spam…"** on the interaction card with an orange escalated border. |
| AC-3.4 | VIP customers display a **VIP** gold badge on both the list card and the right-panel profile. |
| AC-3.5 | Clicking **Reply** reveals the `EmailReplyInline` composer below the thread; `Shift+Enter` inserts newlines; `Enter` alone does not submit. |
| AC-3.6 | Sending a reply transitions interaction status from `new` → `in-progress` and appends the message to the thread. |

---

### US-4: Interaction Detail — Chat Session

**As an agent**, I want to see the full chat history with a live SLA countdown, so that I respond before the SLA threshold is breached.

**Acceptance Criteria**

| # | Observed behaviour |
|---|-------------------|
| AC-4.1 | Centre panel displays the `ChatSessionHeader` with session metadata, channel source (Zalo / Facebook / LiveChat), and the `ChatSLABadge`. |
| AC-4.2 | SLA badge renders in five states based on `slaRemainingSeconds`: **within-sla** (green, ≥ 90 s), **near-breach** (orange, 1–89 s), **breached** (red, ≤ 0 s), **not-responded** (pulsing yellow), **waiting** (gray). |
| AC-4.3 | `ChatTimeline` groups messages by date; agent bubbles right-aligned blue, customer bubbles left-aligned gray. |
| AC-4.4 | Chat composer pinned at bottom; `Enter` sends, `Shift+Enter` inserts newline. |
| AC-4.5 | When `chatSLA.waitingSeconds > 0`, a "Waiting: MM:SS" counter appears above the composer. |

---

### US-5: Interaction Detail — AI Assistant (Observed: screenshots 07, 12)

**As an agent**, I want to query an AI assistant in context of the current interaction, so that I get suggested responses without leaving the interaction view.

**Acceptance Criteria**

| # | Observed behaviour |
|---|-------------------|
| AC-5.1 | Clicking the **"AI Hỗ Trợ"** tab renders the `AIAssistantChat` panel in the centre column. Header: **"AI Assistant"** · sub-header: **"Trợ lý AI sẽ giúp bạn xử lý tương tác hiệu quả hơn"**. |
| AC-5.2 | Six quick-action suggestion chips are pre-populated: **"Tóm tắt nội dung tương tác này"**, **"Phân tích vấn đề"**, **"Tóm tắt lịch sử làm việc"**, **"Gợi ý câu trả lời"**, **"Tạo email template"**, **"Tạo tin nhắn"**. |
| AC-5.3 | Free-text input area at the bottom accepts queries; sending triggers a pulsing typing indicator with a simulated 1.5–2.5 s response delay. |
| AC-5.4 | Each AI response includes an **"Insert into response"** button that copies the text into the active email/chat composer. |
| AC-5.5 | The AI panel retains conversation history within the session; switching to another tab and back preserves the message thread. |

---

### US-6: Knowledge Base Search (Observed: screenshot 09)

**As an agent**, I want to browse and search the knowledge base while handling a call or chat, so that I can find accurate answers without switching screens.

**Acceptance Criteria**

| # | Observed behaviour |
|---|-------------------|
| AC-6.1 | Clicking **"Kiến thức"** tab renders `KnowledgeBaseSearch` with a folder tree. Observed folder names: **Chính sách bán hàng**, **Tài liệu Laptop**, **Dịch vụ Macbook**. |
| AC-6.2 | Top filter bar shows four view tabs: **Tất cả** · **Mới nhất** · **Đã lưu** · **Đầy đủ**. |
| AC-6.3 | Full-text search filters the folder tree in real time. |
| AC-6.4 | Article view shows: title, author, star rating (1–5), view count, last-updated date, and full content. |
| AC-6.5 | Agent can bookmark articles ("Đã lưu"), copy content to clipboard, or **Insert** content into the active composer. |

---

### US-7: Create Ticket (Observed: screenshots 10, 15, 16)

**As an agent**, I want to create a support ticket linked to the current interaction, so that customer issues are tracked through to resolution.

**Acceptance Criteria**

| # | Observed behaviour |
|---|-------------------|
| AC-7.1 | Clicking the **"Tạo Ticket"** tab or the **"Tạo ticket từ tương tác này"** CTA opens `CreateTicketDialog` in `edit` mode. Title: **"Tạo Ticket mới"**. |
| AC-7.2 | **Section 1 — Đối tượng liên quan** shows collapsible cards: **Tương tác gốc** (blue border, channel icon + type badge), **Liên hệ** (purple border, CIF, name, phone, email, segment), **Thông tin truy vấn** (amber border, product type: loan/card/account/savings with financial details). Each section toggles with a ChevronUp/Down. |
| AC-7.3 | **Section 2 — Thông tin ticket**: Required fields: **Tiêu đề ticket *** (Input, placeholder: "Mô tả ngắn gọn vấn đề…") and **Mô tả chi tiết *** (Textarea, 4 rows, placeholder: "Mô tả chi tiết vấn đề…"). Optional: **Danh mục** (Select, 6 options: Khiếu nại dịch vụ · Yêu cầu kỹ thuật · Thay đổi thông tin · Bảo hành sản phẩm · Tài chính - Thanh toán · Khác), **Độ ưu tiên** (Select: Thấp · Trung bình · Cao · Khẩn cấp, default: Trung bình), **Bộ phận xử lý** (Select: Customer Service · Technical Support · Billing · Sales · Product Team), **Hạn xử lý** (date input). |
| AC-7.4 | **"Tạo Ticket"** submit button is disabled (`disabled` attribute) until both required fields are non-empty. |
| AC-7.5 | Submitting with empty required fields fires a `toast.error` — "Vui lòng nhập tiêu đề ticket" or "Vui lòng nhập mô tả chi tiết" respectively. |
| AC-7.6 | On successful creation: `toast.success("Ticket đã được tạo thành công")` fires; dialog switches to **view mode** showing the created ticket with ID `TKT-${Date.now()}`, status "Đang xử lý", creator "Agent Tung", and creation timestamp. |
| AC-7.7 | View mode has two footer buttons: **"Đóng"** (resets all state, closes dialog) and **"Chỉnh sửa"** (returns to edit mode). |
| AC-7.8 | Closing the dialog in either mode resets all form state to defaults (title="", description="", priority="medium", category="", department="", dueDate=""). |

---

### US-8: Information Query — Truy vấn TT (Observed: screenshot 11)

**As an agent**, I want to look up a customer's banking products (accounts, loans, cards, savings) in context of the current interaction, so that I can answer product-specific questions without opening the core banking system separately.

**Acceptance Criteria**

| # | Observed behaviour |
|---|-------------------|
| AC-8.1 | Clicking **"Truy vấn TT"** tab opens the `InformationQuery` panel in the centre column. |
| AC-8.2 | Customer identification shows: name (**Nguyễn Văn A**), CIF number in monospace, and a "Đã xác nhận" (verified) indicator. |
| AC-8.3 | **Tài khoản thanh toán VND** section shows account summary with status chip **"Đang dùng"** (active) and a **"Tiền tệ"** (currency) action button. Current Balance is displayed. |
| AC-8.4 | **Tài khoản tiết kiệm VND** section shows savings product with status chip **"Sẽ tất toán"** (approaching maturity) and a **"Savings Account"** label. |
| AC-8.5 | Each product row has a "Xem thêm" (see more) expand link that reveals full product details. |
| AC-8.6 | A **"Tạo Ticket từ TT"** button pre-populates `CreateTicketDialog` with the queried product details in the "Thông tin truy vấn" card. |

---

### US-9: Floating Call Widget (Observed: screenshots 25, 26; source: `FloatingCallWidget.tsx`)

**As an agent**, I want a persistent call-control panel at the corner of the screen, so that I can manage an active call while browsing the knowledge base or customer info.

**Acceptance Criteria**

| # | Observed behaviour |
|---|-------------------|
| AC-9.1 | Widget renders at `fixed bottom-6 right-6 z-50` as a 320 px wide Card with a blue border (`border-blue-200`) and a status indicator dot at top-right corner. |
| AC-9.2 | **Compact header** (always visible, clickable to expand/collapse): customer avatar circle, customer name, status badge, duration timer (MM:SS, only shown when `status === 'connected'`), quick-hangup PhoneOff button, ChevronUp/Down toggle. |
| AC-9.3 | Auto-expands when `callData.status === 'ringing'` (observed via source: `useEffect` hook). |
| AC-9.4 | **Status indicator dot** colours: `ringing` → yellow + `animate-pulse`, `connected` → green, `on-hold` → orange, `transferring` → blue. |
| AC-9.5 | **Expanded view** — 3-column primary controls grid: **Hold/Resume** (toggles isOnHold, shows destructive variant when on hold), **Mute/Unmute** (toggles isMuted), **Speaker** (toggles isSpeakerOn, default variant when on). |
| AC-9.6 | **Expanded view** — 2-column secondary row: **Transfer** (blue border, opens `TransferCallDialog`) · **Survey** (purple border). Second row: **Conference** · **Chi tiết** (Maximize, navigates to interaction detail). |
| AC-9.7 | **End call** is a full-width destructive button ("Kết thúc cuộc gọi") + a minimal **X** hide button beside it. Clicking end calls `onHangup()` → `CallContext.endCall()` → widget disappears. |
| AC-9.8 | Duration timer uses `setInterval(1000)` computed from `callData.startTime` vs `Date.now()`; only active when `status === 'connected'`. |

---

### US-10: Transfer Call Dialog (Observed: screenshot 26; source: `TransferCallDialog.tsx`)

**As an agent**, I want to transfer an active call to an available agent with a warm or cold handover, so that the customer is seamlessly connected to the right person.

**Acceptance Criteria**

| # | Observed behaviour |
|---|-------------------|
| AC-10.1 | Dialog title: **"Transfer cuộc gọi"**. Description: **"Chuyển cuộc gọi của khách hàng [customerName] cho agent khác"**. |
| AC-10.2 | **Transfer type** Select defaults to `warm` (displayed as "Warm Transfer (Giới thiệu trước)"). Cold option: "Cold Transfer (Chuyển trực tiếp)". |
| AC-10.3 | **Agent search** Input with Search icon (placeholder: "Tìm theo tên, bộ phận, kỹ năng…") filters the agent list by name, department, or skill tags. |
| AC-10.4 | Agent list (scrollable, max-h-48) shows: User icon, name, department, availability badge (**"Rảnh"** green / **"Bận"** red), skill chips (secondary badge). Observed agents: Agent Mai (Technical Support · Rảnh), Agent Linh (Customer Service · Bận), Agent Duc (Sales · Rảnh), Agent Nga (Technical Support · Rảnh). |
| AC-10.5 | Busy agents have `opacity-50` and `onClick` is no-op (`agent.status === 'available' && setSelectedAgent(id)`); selecting them is visually prevented. |
| AC-10.6 | Selected agent card gets `border-blue-500 bg-blue-50` highlight. |
| AC-10.7 | **Transfer note** Textarea (3 rows, placeholder: "Thông tin cần truyền đạt cho agent nhận…"). |
| AC-10.8 | **"Chuyển cuộc gọi"** confirm button is `disabled` until an agent is selected. On confirm, resets all form state and calls `onOpenChange(false)`. |

---

### US-11: Agent Status Management (Observed: screenshot 18; source: `EnhancedAgentStatusContext.tsx`)

**As an agent**, I want to set my readiness per channel and see how long I've been in each state, so that the system routes interactions correctly and my breaks are tracked.

**Acceptance Criteria**

| # | Observed behaviour |
|---|-------------------|
| AC-11.1 | Header status pill shows **"Sẵn sàng N/3 kênh"** (green when all 3 ready). Clicking opens the Agent Status dropdown/popover. |
| AC-11.2 | The popover displays 3 channel rows (Voice/Thoại, Email, Chat), each with a toggle switch and a per-channel duration counter (MM:SS, increments every second). |
| AC-11.3 | Each channel timer resets to 0:00 when its status changes (duration resets in `setChannelStatus`). |
| AC-11.4 | Toggling a channel to **not-ready** opens a reason picker. Eight predefined reasons: `break` · `lunch` · `training` · `meeting` · `technical-issue` · `system-maintenance` · `toilet` · `other`. Selecting `other` reveals a free-text custom-reason input. |
| AC-11.5 | **"Sẵn sàng tất cả"** bulk button calls `goReadyAll()`. **"Không sẵn sàng tất cả"** calls `goNotReadyAll('break')`. |
| AC-11.6 | Keyboard: `Ctrl+R` (or `Meta+R`) calls `goReadyAll()` globally. `Ctrl+N` is wired but triggers the not-ready flow (partially implemented in source). |
| AC-11.7 | When `window` fires an `offline` event, `connectionStatus` → `disconnected`, all channel statuses → `disconnected`, `isTimerActive = false` for all channels. On `online` event, `connectionStatus` → `connected`. |
| AC-11.8 | `connectionStatus === 'disconnected'` disables all channel toggle controls. |
| AC-11.9 | Heartbeat interval runs every 30 000 ms, calling `updateAgentActivity()` to refresh `agentState.lastActivity`. |

---

### US-12: Notification Centre (Observed: screenshots 19–24; source: `NotificationContext.tsx`)

**As an agent**, I want real-time notifications for missed calls, ticket events, and system alerts, so that I can act on time-sensitive events immediately.

**Acceptance Criteria**

| # | Observed behaviour |
|---|-------------------|
| AC-12.1 | Bell icon in header shows a numeric unread badge. Clicking opens a right-side Sheet (slide-over). Header: **"Thông báo · N"** with ✕ close, **"Ẩn tất cả"** and **"Xóa cả"** action buttons. |
| AC-12.2 | Tab bar with badge counts: **Tất cả** · **Calls** · **Tickets** · **System** · **Schedule**. Clicking each filters the notification list. |
| AC-12.3 | Five notification types: `missed-call` → title "Cuộc gọi nhỡ", `ticket-assignment` → "Ticket được phân công", `ticket-due` → "Ticket sắp đến hạn", `system-alert` → "Cảnh báo hệ thống", `schedule-reminder` → "Nhắc nhở lịch trình". |
| AC-12.4 | Missed-call notification card shows: phone number · status chip (e.g. "Không sẵn sàng" = agent was not-ready, "Không trả lời" = no answer) · customer name · hotline source · time · priority badge · "Xem chi tiết" + "Gọi lại" buttons. |
| AC-12.5 | VIP missed calls have `priority` force-upgraded to `urgent` (source: `addMissedCall` sets `priority: data.isVIP ? 'urgent' : data.priority`). The card displays a gold **VIP** chip alongside a red "Khẩn cấp" badge. |
| AC-12.6 | Maximum 3 active toast notifications simultaneously (`maxActiveNotifications: 3`). When a 4th arrives, the oldest is sliced off (`updated.slice(0, settings.maxActiveNotifications)`). |
| AC-12.7 | Default auto-hide: 8 seconds (configurable to 5 / 8 / 10 / 15 s via `settings.autoHideAfter`). Auto-hide is implemented via `setTimeout` in a `useEffect`; timers are cleared on component update/unmount. |
| AC-12.8 | Audio alert: Web Audio API — three-frequency beep (800 Hz → 600 Hz → 800 Hz), 0.3 s duration, gain 0.3 → 0.01 exponential ramp. Failure is caught and logged as a warning (silent graceful fallback). |
| AC-12.9 | `getNotReadyMissedCallsWarning()` counts missed calls with `reason === 'not-ready'` within the last 15 minutes. `shouldShowWarning: count >= 3` triggers a warning banner in the header. |
| AC-12.10 | Notification status lifecycle: `new` (initial) → `viewed` (on bell open / item view) → `actioned` (on "Gọi lại" / "Xem chi tiết") or `dismissed` (on ✕ or auto-hide). `getUnreadCount()` always equals `notifications.filter(n => n.status === 'new').length`. |

---

### US-13: Customer Information Panel (Observed: screenshots 02, right panel; source: `CustomerInfoScrollFixed.tsx`)

**As an agent**, I want to see the customer's profile, contact details, ticket history, and notes without leaving the interaction, so that I can personalise every interaction.

**Acceptance Criteria**

| # | Observed behaviour |
|---|-------------------|
| AC-13.1 | Right panel header: customer name, **VIP** badge if applicable, star rating (e.g. ★ 4.5), primary email, primary phone. |
| AC-13.2 | Five tabs: **Hồ sơ** (profile) · **Lịch sử** (interaction history) · **Ticket** (related tickets) · **Truy vấn core** · **Ghi chú** (notes). |
| AC-13.3 | **Ticket tab** shows a search input ("Tìm kiếm ticket…"), filter chips (Tất cả · Chờ · Đang xử lý · Chuyển lên · Hoàn thành), and a scrollable ticket list. Empty state: "Không tìm thấy ticket nào" (confirmed via screenshot when filter yields no results). |
| AC-13.4 | Each ticket row shows: ticket number, two status badges (workflow status + category type), ticket title, assigned agent, priority chip (Cao/Thấp), and relative timestamp. Overdue tickets show a red "Quá hạn: DD/MM/YYYY" label. Source interaction is linked ("Từ tương tác: INT-001"). |
| AC-13.5 | Blue CTA **"Tạo ticket từ tương tác này"** opens `CreateTicketDialog` pre-filled with the current customer context. |
| AC-13.6 | Clicking a ticket row opens `TicketDetail` in the right panel (replacing the customer info view). |

---

### US-14: Agent Header & Session Stats (Observed: all screenshots; source: `EnhancedAgentHeader.tsx`)

**As an agent**, I want a persistent header that shows channel load, my ready/break time, and quick-access controls, so that I always know my queue status at a glance.

**Acceptance Criteria**

| # | Observed behaviour |
|---|-------------------|
| AC-14.1 | Header always visible. Left: "AD" logo circle + **"Agent Desktop"** name + **"Dashboard / Tương tác"** breadcrumb. |
| AC-14.2 | Channel stat chips with icons and counts: 📞 **Calls: 7** · 📧 **Emails: 6** · 💬 **Chats: 8**. Clicking a chip applies the corresponding channel filter on the interaction list. |
| AC-14.3 | Agent status pill shows **"Sẵn sàng N/3 kênh"** in green when all ready. Displays the ready-channel count dynamically (`getReadyChannelsCount() / getTotalChannelsCount()`). |
| AC-14.4 | **Ready** and **Break** timers display elapsed time in the current status (MM:SS, via `getCurrentStatusDuration`). |
| AC-14.5 | Notification bell badge shows count of `status === 'new'` notifications. |
| AC-14.6 | Agent avatar area shows name (**Agent Tung**) + status label (**"Sẵn sàng"**). |

---

## Correctness Properties

---

### Property 1: Call State Machine Validity

**Type:** Invariant / State Transition

**Description:** The `CallData.status` field must only hold values from the union `'ringing' | 'connected' | 'on-hold' | 'transferring' | 'ended'`. Valid forward transitions (observed from source + UI):

```
null  ──startCall()──▶  ringing
ringing  ──accept──▶  connected
connected  ──hold──▶  on-hold
on-hold  ──resume──▶  connected
connected  ──transfer──▶  transferring
transferring  ──complete──▶  ended
[any]  ──endCall()──▶  null (widget hidden)
```

`updateCallStatus()` does not guard against invalid transitions — this is a known gap. Setting `status = 'on-hold'` from `ringing` is not prevented by the current implementation.

Widget auto-expands when `status` becomes `ringing` (in `startCall`) or `'ringing' | 'transferring'` (in `updateCallStatus`).

**Test Strategy:** State-machine property test over `(currentStatus, newStatus)` pairs. Assert that only the transitions listed above are valid. Run 1 000 random transition sequences and verify `status` never reaches an undefined state. Verify `isCallWidgetVisible === false` after `endCall()`.

---

### Property 2: SLA Timer Monotonicity

**Type:** Invariant

**Description:** For any chat interaction with `status === 'active' | 'in-progress'`, `chatSLA.slaRemainingSeconds` at time `t+1` must be ≤ `slaRemainingSeconds` at time `t`. The SLA badge state transitions must follow: `within-sla` → `near-breach` (at 89 s) → `breached` (at 0 s). State cannot regress (e.g. `breached` → `within-sla`) unless the interaction is re-opened by a supervisor.

**Test Strategy:** Simulation property test — seed `slaRemainingSeconds = N`, advance 1-second ticks, assert `slaRemaining(t+1) === slaRemaining(t) - 1` for active chats and that badge state changes occur at the exact thresholds (90 s and 0 s). Run with N ∈ {10, 90, 300, 3600}.

---

### Property 3: Notification Count Accuracy

**Type:** Functional invariant

**Description:** `getUnreadCount()` must equal `notifications.filter(n => n.status === 'new').length` at all times. Observed source implementation confirms this: `getUnreadCount` is a pure filter over the `notifications` array.

Additionally: `activeNotifications.length ≤ settings.maxActiveNotifications` (= 3) at all times. Enforced via `updated.slice(0, settings.maxActiveNotifications)` on every `addNotification` call.

**Test Strategy:** Property test — perform 200 random sequences of: add/markViewed/markActioned/markDismissed/clearAll. After each operation assert both equalities. Test the cap with rapid sequential `addNotification` calls (add 10 in 10 ms) and assert `activeNotifications.length === 3`.

---

### Property 4: Agent Status Duration Monotonicity

**Type:** Functional invariant

**Description:** Per the source (`setInterval(updateTimers, 1000)`), each channel's `duration` increments by 1 every second when `isTimerActive === true`. `isTimerActive` is `false` only when `status === 'disconnected'`. Duration resets to 0 on every `setChannelStatus` call (new status change).

Formally: for any channel `c` at tick `t`, if `channelStatuses[c].isTimerActive === true`, then `duration(t+1) = duration(t) + 1`. If `isTimerActive === false`, `duration(t+1) = duration(t)`.

**Test Strategy:** Fake-timer unit test (`vi.useFakeTimers`) — advance 60 ticks, assert `duration === 60`. Set disconnected, advance 10 more ticks, assert `duration === 60`. Set ready again (resets to 0), advance 5 ticks, assert `duration === 5`.

---

### Property 5: Ticket Form Submission Guard

**Type:** Pre-condition

**Description:** `handleCreate()` in `CreateTicketDialog` must never produce a ticket if either required field is empty. Observed source guards:

```
if (!ticketData.title.trim()) → toast.error('Vui lòng nhập tiêu đề ticket'); return;
if (!ticketData.description.trim()) → toast.error('Vui lòng nhập mô tả chi tiết'); return;
```

The submit button also has `disabled={!ticketData.title || !ticketData.description}`.

**Pre-condition:** `ticketData.title === ''` OR `ticketData.description === ''`.
**Post-condition:** No ticket object is created, `mode` remains `'edit'`, `savedTicket` remains `null`.

**Test Strategy:** Unit test — render `CreateTicketDialog`, leave title empty, click submit button; assert `toast.error` is called and `savedTicket` is still `null`. Repeat for empty description. Confirm button's `disabled` attribute is set when either field is empty.

---

### Property 6: Transfer Agent Selection Guard

**Type:** Pre-condition

**Description:** In `TransferCallDialog`, the "Chuyển cuộc gọi" button is `disabled={!selectedAgent}`. Clicking a busy agent row (`agent.status !== 'available'`) is a no-op (`agent.status === 'available' && setSelectedAgent(id)`). A busy agent can never be set as `selectedAgent`.

**Pre-condition:** `selectedAgent === ''` (no agent chosen) OR only busy agents exist.
**Post-condition:** `handleTransfer()` is never called; `onOpenChange(false)` is not triggered.

**Test Strategy:** Unit test — render dialog, assert button disabled initially. Click a busy agent row, assert `selectedAgent` remains `''`. Click an available agent, assert button enabled. Click confirm, assert `onOpenChange` was called.

---

### Property 7: Notification Auto-Hide Timing

**Type:** Post Condition

**Description:** Every notification added to `activeNotifications` has a `setTimeout` created for it with delay `settings.autoHideAfter * 1000` ms (default 8 000 ms). When the timer fires, `removeFromActiveNotifications(id)` is called, removing the notification from `activeNotifications`. The `notifications` (full history) array is unaffected — only the active/toast array is cleared.

Observed: timers are created inside a `useEffect([activeNotifications, settings.autoHideAfter])`, which also returns a cleanup function that clears all previous timers when dependencies change.

**Test Strategy:** Fake-timer unit test — add a notification, advance time by `8001 ms`, assert the notification is absent from `activeNotifications` but still present in `notifications`. Test cleanup: add notification, change `autoHideAfter`, assert previous timer is cancelled (notification not removed at old timeout).

---

### Property 8: VIP Missed Call Priority Escalation

**Type:** Functional transformation

**Description:** `addMissedCall(data)` forces `priority = 'urgent'` when `data.isVIP === true`, regardless of whatever `data.priority` was passed. Observed source: `priority: data.isVIP ? 'urgent' : data.priority`.

Formally: `∀ notification n where n.isVIP === true: n.priority === 'urgent'`.

**Test Strategy:** Unit test — call `addMissedCall({ isVIP: true, priority: 'low', ... })`, assert resulting notification has `priority === 'urgent'`. Call with `isVIP: false, priority: 'low'`, assert `priority === 'low'`.

---

## Non-Functional Requirements

---

### Performance

| Target | Rationale |
|--------|-----------|
| Client-side filter/search response < 100 ms for up to 500 interactions | `useInteractionStats` uses `useMemo` but the full filter runs on every state change; profiling needed at 500 items |
| Call/SLA timer tick (`setInterval 1000 ms`) must not cause layout reflow | Use `content` CSS property or transform-only updates; no DOM layout properties in tick callback |
| `activeNotifications.length ≤ 3` enforced before render | Prevents notification stack overflow; enforced in source via `.slice(0, maxActiveNotifications)` |
| Initial JS bundle < 500 KB gzipped | Current ~940 KB; `InteractionDetail`, `CustomerInfoScrollFixed`, `KnowledgeBaseSearch`, `InformationQuery` must be lazy-loaded via `React.lazy()` + `Suspense` |
| LCP < 2.5 s (10 Mbps connection, production build) | Critical path: reduce initial chunk; defer non-critical panels |

---

### Security

| Requirement | Detail |
|-------------|--------|
| No PII in persistent storage | No `localStorage` / `sessionStorage` writes of phone numbers, CIF, emails, or customer names. All state in React context (in-memory only). |
| Call recording URL scope | Recording URLs must be signed (TTL ≤ 1 h) when backend is integrated; client must not cache raw URLs past the active session. |
| Internal ticket comments | Comments with `isInternal: true` must be filtered server-side; client-side CSS visibility alone is not sufficient. |
| CSRF tokens | All mutating API calls (when backend integrated) must include CSRF tokens and run over HTTPS. |
| No secrets in logs | Current source uses `console.log('Call started:', newCall)` and `console.log('Creating ticket:', newTicket)` — these must be removed or sanitised in production builds to avoid PII in browser DevTools. |

---

### Scalability, Usability & Accessibility

| Requirement | Detail |
|-------------|--------|
| **500-item queue** | Filter and stats computations are memoized; the data model supports up to 500 interactions per agent without UX degradation |
| **Keyboard navigation** | All interactive controls reachable via Tab; focus order follows visual order left→right, top→bottom |
| **Keyboard shortcuts** | `Ctrl+R` = ready all (implemented), `Ctrl+N` = not-ready flow (partially implemented), `Ctrl+0–3` = channel filter, `Ctrl+?` = help modal |
| **Colour-blind accessibility** | SLA badges include both a colour fill AND a text label (e.g. "BREACHED -00:23"). Status badges include icon + text, never colour alone |
| **Minimum viewport** | 1280 × 800 px. Current design targets 1920 × 1080 |
| **Language** | Primary UI language: Vietnamese (vi-VN). All toast messages, button labels, badges, and placeholders confirmed as Vietnamese throughout (verified via DOM log and screenshots) |
| **ARIA** | All `Dialog`/`Sheet` components from Radix UI include `role="dialog"` and `aria-labelledby` by default. Icon-only buttons (bell, hangup quick-action) must have `aria-label` in Vietnamese |
| **Dark mode** | Implemented via `.dark` class on `<html>` (next-themes). Must not break layout or colour tokens in either mode |

---

## Constraints & Assumptions

### Technical Constraints

| Constraint | Detail |
|------------|--------|
| Frontend SPA only | No backend API is integrated; all data mocked in `App.tsx` |
| State management | React Context API only — `CallContext`, `EnhancedAgentStatusContext`, `NotificationContext`. No Redux, Zustand, or Jotai |
| React 18 + TypeScript + Vite | No framework migration in scope |
| Radix UI v1.x pinned | All Radix packages aliased in `vite.config.ts` to prevent dual-version conflicts; do not upgrade to v2.x without full alias audit |
| Tailwind CSS only | No CSS Modules or styled-components; custom CSS properties in `src/styles/globals.css` only |
| shadcn/ui components | `src/components/ui/` files must not be modified; compose via props and `cn()` |
| Bundle size | ~940 KB gzipped today; every new import must justify its size contribution |
| Audio | Web Audio API with silent fallback (catch block in `playNotificationSound`) |
| Transfer agent list | Hardcoded to 4 mock agents (`TransferCallDialog.tsx` line 30–35); must be API-driven when backend is available |

### Assumptions

| # | Assumption |
|---|-----------|
| A-1 | Dev server at `http://localhost:3000/`; production URL TBD |
| A-2 | Mock data in `App.tsx` defines the API response contract |
| A-3 | Agent is pre-authenticated; no login UI is in scope |
| A-4 | Multi-agent routing and queue logic are server-side concerns |
| A-5 | `CoreBFSI` (`src/components/CoreBFSI.tsx`) is a separate BFSI loan-query demo, excluded from this spec |
| A-6 | Vietnamese (vi-VN) is the only required locale; no i18n library required at this stage |
| A-7 | Dark mode is implemented but is not a primary launch requirement |
| A-8 | The `AgentStatusContext` file still exists but its Provider is **not** mounted in `App.tsx`; only `EnhancedAgentStatusProvider` is in the tree |

---

## Out of Scope

| Area | Excluded |
|------|---------|
| Supervisor tooling | Dashboards, wallboards, agent monitoring, reporting |
| Admin tooling | Queue rules, routing configuration, agent provisioning |
| Real-time transport | WebSocket / SSE integration; separate spec required |
| AI/ML backend | Transcription, sentiment analysis, intent classification |
| Authentication | Login UI, SSO, MFA, session refresh |
| Responsive layout | Mobile/tablet breakpoints; desktop-only (min 1280 px) |
| CoreBFSI module | Loan-query BFSI demo — separate spec |
| Rich-text email editor | WYSIWYG beyond plain textarea |
| Outbound campaigns | Predictive dialler, campaign management |
| Full i18n | Multi-language beyond Vietnamese |
| Analytics | Event tracking, A/B testing, funnel dashboards |

---

*Document generated: 2026-03-04 · Based on 26 interactive Playwright screenshots + source analysis of `CallContext.tsx`, `EnhancedAgentStatusContext.tsx`, `NotificationContext.tsx`, `CreateTicketDialog.tsx`, `TransferCallDialog.tsx`, `FloatingCallWidget.tsx`.*
