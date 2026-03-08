# RequirementsV1.md — Agent Desktop TPB
## Kiro Specification: Multi-Channel Customer Service Workspace

**Version:** 1.0
**Date:** 2026-03-04
**Method:** Exhaustive QA automation (136 Playwright screenshots A01–F15) + static code analysis (15 source files)
**Evidence base:** `/tmp/deep_screenshots/` + `/tmp/pw-screenshots/` (prior 26 screenshots)
**Traceability:** Every AC cites at least one screenshot `[XNN]` or source file `(file.tsx:line)`

---

## Feature Name

**Agent Desktop TPB — Exhaustive Multi-Channel Customer Service Workspace**

A React 18 + TypeScript single-page application providing TPB bank customer service agents with a unified desktop for managing voice calls, emails, chat sessions, tickets, knowledge base, and customer information across a 3-panel layout.

---

## Architecture Summary

**Provider tree:** `NotificationProvider > EnhancedAgentStatusProvider > CallProvider > AppContent`
**Layout:** 3-panel (Left 320px collapsible · Center flex · Right 400px collapsible) + fixed header + 2 floating overlays
**State management:** React Context API (no external state library)
**Channels:** Voice (CTI), Email, Chat
**Locale:** Vietnamese (vi-VN) primary; English labels on technical fields

---

## Mock Data Contract (V1 Scope)

All V1 acceptance criteria operate against the following hardcoded mock dataset. A backend integration phase would replace these with live API calls.

### Interactions (16 total)

| ID | Type | Customer | Status | Priority | SLA/Note |
|---|---|---|---|---|---|
| INT-DEFAULT | call | Nguyễn Văn A | completed | medium | Recording 12:45, Agent Duc |
| INT-MISSED-001 | missed-call | Nguyễn Văn A | missed | medium | reason: timeout, 10 min ago |
| INT-MISSED-002 | missed-call | Trần Thị B (VIP) | missed | urgent | reason: not-ready, 25 min ago |
| INT-MISSED-003 | missed-call | Lê Văn C | missed | high | reason: disconnected, 40 min ago |
| INT-001 | email | Trần Thị B | resolved | high | outbound, Agent Mai |
| INT-002 | email | Trần Thị B | in-progress | medium | thread (3 replies), Agent Mai |
| INT-003 | call | Lê Văn C | completed | high | Recording 08:22, Agent Linh |
| INT-004 | email | Suspicious Sender | escalated | urgent | spam flagged, Agent Nga |
| INT-005 | email | Nguyễn Văn C | new | medium | unassigned |
| INT-006 | email | Lê Thị D | completed | low | positive feedback |
| INT-007 | call | Phạm Thị E (VIP) | in-progress | urgent | Agent Tung |
| INT-008 | chat | Hoàng Văn F | in-progress | medium | SLA: within-sla (45s first response) |
| INT-009 | chat | Võ Thị G | completed | low | SLA: within-sla |
| INT-CHAT-001 | chat | Nguyễn Minh Tú | in-progress | high | SLA: not-responded (55s remaining) |
| INT-CHAT-002 | chat | Trần Văn Phúc | in-progress | urgent | SLA: breached (6m 30s late) |
| INT-CHAT-003 | chat | Lê Thị Hương | in-progress | high | SLA: near-breach (90s remaining) |
| INT-CHAT-004 | chat | Phạm Quốc Anh | in-progress | medium | SLA: within-sla (25s first response) |
| INT-CHAT-005 | chat | Võ Minh Khoa | in-progress | urgent | SLA: waiting (already -20s over) |
| INT-CHAT-006 | chat | Đỗ Thị Lan Anh | completed | medium | SLA: within-sla (18s first response) |
| INT-010 | call | Đặng Văn H | resolved | high | Recording 35:20, Agent Nga |
| INT-011 | email | Nguyễn Thị Lan | in-progress | high | thread (exchange request) |

### Tickets (2 total)

| ID | Title | Status | Priority | VIP | Due | Attachments |
|---|---|---|---|---|---|---|
| TKT-001 | Lỗi đăng nhập | in-progress | high | No | +2h | None |
| TKT-002 | Lỗi hiển thị | in-progress | urgent | Yes | +30m | screenshot-error.png, error-log.txt |

### Agents (4 in Transfer Dialog)

| Name | Department | Status |
|---|---|---|
| Agent Mai | Technical Support | Available |
| Agent Linh | Customer Service | Busy |
| Agent Duc | Sales | Available |
| Agent Nga | Technical Support | Available |

---

## User Stories

---

### US-1 — Interaction Queue & Filters

**As** a customer service agent,
**I want** to see all incoming and historical interactions in a filterable left panel,
**so that** I can quickly find and prioritize the interactions I need to handle.

#### Acceptance Criteria

**AC-1.1 — Default Load**
Given the app loads at `http://localhost:3000/`,
When the page finishes loading,
Then the left panel displays "Danh sách tương tác" with a count badge showing all interactions, the center panel shows the default voice call detail (INT-DEFAULT "Tư vấn nâng cấp gói dịch vụ"), and the right panel shows the customer info panel for "Nguyễn Văn A".
`[A01]` `(App.tsx:675 — defaultInteraction)`

**AC-1.2 — Status Filter Tabs**
Given the interaction list is visible,
When the agent clicks the "Hàng chờ" tab,
Then only interactions with status 'new' or 'in-progress' are shown and the tab is visually active (border-b, highlighted).
`[A02]` `(useInteractionStats.tsx — StatusFilter)`

**AC-1.3 — Đã đóng Tab**
Given the interaction list is visible,
When the agent clicks the "Đã đóng" tab,
Then only interactions with status 'resolved', 'completed', or 'closed' are shown.
`[A03]`

**AC-1.4 — Đã nhận Tab**
Given the interaction list is visible,
When the agent clicks the "Đã nhận" tab,
Then interactions assigned to the current agent are shown.
`[A04]`

**AC-1.5 — Voice Channel Filter**
Given the interaction list is visible,
When the agent clicks the "Cuộc gọi" chip,
Then only interactions where `channel='voice'` or `type='call'` or `type='missed-call'` are shown.
`[A05]` `(useInteractionStats.tsx — channel matching: 'voice': channel='voice' OR type='call' OR type='missed-call')`

**AC-1.6 — Advanced Filter Popover**
Given a channel filter is active,
When the agent clicks the "Bộ lọc nâng cao" button,
Then a popover appears with additional filter options specific to the selected channel (e.g., direction dropdown for voice).
`[A06]`

**AC-1.7 — Email Channel Filter**
When the agent clicks the "Email" chip,
Then only interactions where `channel='email'` or `type='email'` are shown.
`[A07]` `(useInteractionStats.tsx:filterInteractions)`

**AC-1.8 — Chat Channel Filter**
When the agent clicks the "Chat" chip,
Then only interactions where `channel='chat'` or `type='chat'` are shown.
`[A08]`

**AC-1.9 — Chat Advanced Filters**
Given the Chat channel filter is active,
When the agent opens the advanced filter popover,
Then dropdowns for SLA status, session source, and agent are shown.
`[A09]`

**AC-1.10 — Search: Matching Results**
Given the interaction list is visible,
When the agent types "Trần" in the search input,
Then only interactions where customerName, subject, customerEmail, source, or tags contains "Trần" (case-insensitive) are shown.
`[A10]` `(useInteractionStats.tsx — search logic: joined fields, case-insensitive substring)`

**AC-1.11 — Search: Empty State**
When the agent types a string matching no interactions (e.g., "xyznotfound999"),
Then the list area shows an empty-state message (no items rendered).
`[A11]`

**AC-1.12 — VIP Indicator**
Given the interaction list shows interactions,
When an interaction has `isVIP: true`,
Then a crown (👑) icon is visible on that interaction card.
`[A12]` `(App.tsx:211 — INT-MISSED-002 isVIP: true)`

**AC-1.13 — Left Panel Collapse**
Given the 3-panel layout is visible,
When the agent clicks the left panel collapse toggle,
Then the left panel hides (width → 0 or icon-only) and the center panel expands to fill the freed space.
`[A13]` `(App.tsx:678 — leftPanelCollapsed state)`

**AC-1.14 — Left Panel Expand**
Given the left panel is collapsed,
When the agent clicks the expand toggle,
Then the left panel returns to 320px width.
`[A14]`

**AC-1.15 — Right Panel Collapse**
Given the 3-panel layout is visible,
When the agent clicks the right panel collapse toggle,
Then the right panel hides and the center panel expands.
`[A15]` `(App.tsx:679 — rightPanelCollapsed state)`

**AC-1.16 — Filter Intersection**
Given multiple filters are active simultaneously (e.g., channel + status tab + search),
Then the displayed results satisfy ALL active filter criteria simultaneously (logical AND).
`(useInteractionStats.tsx — filterInteractions: sequential filter chain)`

---

### US-2 — Voice Call Detail

**As** a customer service agent,
**I want** to review call recordings, timeline events, and attach notes,
**so that** I have a full audit trail of each voice interaction.

#### Acceptance Criteria

**AC-2.1 — Call Recording Player**
Given a voice interaction with a recording is selected (e.g., INT-DEFAULT),
Then the center panel shows a waveform player with: play/pause button, speed control, download button, file size ("15.2 MB"), and duration ("12:45").
`[B01]` `(App.tsx:161 — recording: {url, duration: 765, quality: 'high', fileSize: '15.2 MB'})`

**AC-2.2 — Recording Player Play State**
When the agent clicks the play button,
Then the button icon changes to pause and the waveform position indicator moves.
`[B02]`

**AC-2.3 — Call Timeline — Default View**
Given a voice interaction is selected,
Then the timeline section shows the first 8 events by default with a vertical connector line between events.
`(CallTimeline.tsx — showAllEvents: false; threshold: 8 events)`

**AC-2.4 — Call Timeline — Expand**
When the agent clicks "Xem thêm",
Then all remaining timeline events are shown (up to 15 events in the mock dataset) and the button label changes to "Ẩn bớt".
`[B03]` `(CallTimeline.tsx — 15 mock events: queue→IVR→wait→assign→ring→answer→record→hold→resume→DTMF→mute→unmute→conference→transfer→end)`

**AC-2.5 — Timeline Event Types**
Each timeline event displays an icon, type label, timestamp (HH:MM:SS), duration, and description. Supported event types with colors:
- queue (purple), ring (blue), answer/resume/unmute (green), hold (yellow), transfer (orange), dtmf (muted), mute (red), end/recording (muted/pink), agent_assigned (indigo), ivr (cyan), conference (teal).
`(CallTimeline.tsx:1-50 — eventTypeConfig)`

**AC-2.6 — Timeline Summary Stats**
Below the timeline, a stats row shows: Total Duration (HH:MM:SS), Hold Count, Transfer Count.
`(CallTimeline.tsx — summaryStats section)`

**AC-2.7 — Call Notes — Add Note**
Given a voice interaction is selected,
When the agent clicks "Thêm ghi chú",
Then a textarea opens with a tag selector dropdown showing 6 predefined tags: "Thông tin khách", "Hẹn gọi lại", "Khiếu nại", "Kỹ thuật", "Thanh toán", "Chung".
`[B04]` `(CallNotes.tsx — 6 tags with colors)`

**AC-2.8 — Call Notes — Fill and Save**
Given the note textarea is open,
When the agent fills in content, optionally selects a tag, and clicks "Lưu",
Then the new note appears at the top of the timeline with a blue-50 highlight and the agent name, timestamp, and tag badge.
`[B05]` `[B06]`

**AC-2.9 — Call Notes — Sort Order**
The notes list renders in this order: pinned notes first (by `isPinned: true`), then by timestamp descending (newest first).
`(CallNotes.tsx — sortedNotes logic)`

**AC-2.10 — Call Notes — Pin**
When the agent clicks the pin icon on a note,
Then that note moves to the top of the list and displays a yellow ring border (ring-yellow).
`[F11]` `(CallNotes.tsx — isPinned toggle)`

**AC-2.11 — Call Notes — Expand Long Content**
When a note's content exceeds 120 characters,
Then only the first 120 characters are shown with a "Xem thêm" link; clicking it reveals the full content with a "Thu gọn" link.
`(CallNotes.tsx — expandedNotes state, 120-char threshold)`

---

### US-3 — Email Thread & Reply

**As** a customer service agent,
**I want** to view email threads and compose replies with templates and attachments,
**so that** I can handle email interactions professionally and consistently.

#### Acceptance Criteria

**AC-3.1 — Email Thread View**
Given an email interaction is selected (e.g., INT-002),
Then the center panel shows the email subject, customer email address, thread messages in chronological order, and action buttons (Reply, Forward).
`[B11]` `(InteractionDetail.tsx — EmailThread rendering)`

**AC-3.2 — Email Message Expand**
Given a thread message is visible,
When the agent clicks the message header,
Then the full message body expands showing From, To, CC (if any), and full text content.
`[B12]`

**AC-3.3 — Reply Inline Open**
When the agent clicks "Trả lời" (Reply),
Then an inline compose area opens below the thread showing To (pre-filled), Subject (pre-filled with "Re:" prefix), body textarea, and action buttons.
`[B13]`

**AC-3.4 — CC / BCC Toggle**
Given the reply compose area is open,
When the agent clicks "CC" or "BCC",
Then a CC or BCC input field appears below the To field.
`[B14]`

**AC-3.5 — Template Selection**
Given the reply compose area is open,
When the agent clicks "Mẫu" (Template) and selects a template,
Then the body textarea is pre-filled with the template content.
`[B14]`

**AC-3.6 — Reply Preview**
When the agent clicks "Xem trước" (Preview),
Then a dialog opens showing the email as it will appear to the recipient (read-only rendering).
`[B15]`

**AC-3.7 — Spam Email Warning**
Given the email interaction INT-004 (Suspicious Sender, emailType: 'spam') is selected,
Then a prominent warning banner is shown in the thread view indicating "CẢNH BÁO: Email này có dấu hiệu spam."
`[B17]` `(App.tsx:308 — snippet: 'CẢNH BÁO: Email này có dấu hiệu spam...')`

**AC-3.8 — Attachments Display**
Given an email with attachments (e.g., TKT-002: screenshot-error.png, error-log.txt),
Then the attachments section is visible with file names and download links.
`[B18]` `(App.tsx:113 — attachments: ['screenshot-error.png', 'error-log.txt'])`

---

### US-4 — Chat Session & SLA

**As** a customer service agent,
**I want** to see real-time SLA indicators on chat sessions and manage session lifecycle,
**so that** I can prioritize response to at-risk chats and meet service targets.

#### Acceptance Criteria

**AC-4.1 — Within-SLA Badge (Green)**
Given a chat interaction with `chatSLA.status: 'within-sla'` is selected (e.g., INT-008),
Then the SLA badge displays in green with the first response time (e.g., "45s").
`[C01]` `(App.tsx:388 — chatSLA.status: 'within-sla')`

**AC-4.2 — Near-Breach Badge (Orange, Pulsing)**
Given a chat interaction with `chatSLA.status: 'near-breach'` is selected (e.g., INT-CHAT-003, 90s remaining),
Then the SLA badge displays in orange with the remaining time (e.g., "1m 30s") and a pulsing animation.
`[C02]` `(App.tsx:480 — near-breach, slaRemainingSeconds: 90)`

**AC-4.3 — Breached Badge (Red)**
Given a chat interaction with `chatSLA.status: 'breached'` is selected (e.g., INT-CHAT-002),
Then the SLA badge displays in red showing that the SLA threshold (5 minutes) has been exceeded.
`[C03]` `(App.tsx:457 — breached, firstResponseTime: '6m 30s')`

**AC-4.4 — Not-Responded Badge**
Given a chat interaction with `chatSLA.status: 'not-responded'` (e.g., INT-CHAT-001, 55s remaining),
Then the badge indicates the agent has not yet responded to the customer, with countdown shown.
`(App.tsx:434 — not-responded, slaRemainingSeconds: 55)`

**AC-4.5 — SLA Threshold**
The SLA threshold for all chat interactions is 5 minutes (`slaThresholdMinutes: 5`).
`(App.tsx:392 — all chatSLA objects)`

**AC-4.6 — Chat Composer**
Given a chat interaction is selected,
Then the center panel shows a text input area for composing messages, a send button, and any quick-reply or emoji options.
`[C04]`

**AC-4.7 — Session Close Dialog**
When the agent clicks "Kết thúc phiên" (or equivalent),
Then a confirmation dialog opens asking the agent to confirm closing the session before proceeding.
`[C06]`

**AC-4.8 — Session Sources**
Chat sessions can originate from: "Zalo Official Account", "Website Livechat", "Facebook Messenger".
`(App.tsx — chatSLA source values across INT-008, INT-009, INT-CHAT-001 through INT-CHAT-006)`

---

### US-5 — AI Assistant

**As** a customer service agent,
**I want** to access AI-generated suggestions and summaries within the interaction detail,
**so that** I can respond faster and more accurately.

#### Acceptance Criteria

**AC-5.1 — AI Tab Initial State (6 Chips)**
Given any interaction is selected and the "AI Hỗ trợ" tab is clicked,
Then 6 suggestion chips are displayed in the panel.
`[C07]` `(InteractionDetail.tsx — AI tab, 6 initial chips)`

**AC-5.2 — Chip Click → Loading**
When the agent clicks a suggestion chip,
Then the AI response area shows a typing indicator (animated dots or spinner) while the response is generated.
`[C08]`

**AC-5.3 — Response with Insert Button**
After the AI response is generated,
Then the response text is displayed with an "Chèn" (Insert) button that pastes the response into the active compose area (email reply or chat composer).
`[C09]`

**AC-5.4 — AI Tab Location**
The AI tab is accessible from the InteractionDetail center panel tab strip, alongside "Tương tác", "Kiến thức", "Tạo Ticket", "Truy vấn TT".
`[A01]` `(InteractionDetail.tsx — tab configuration)`

---

### US-6 — Knowledge Base Search

**As** a customer service agent,
**I want** to browse and search a knowledge base of articles while handling interactions,
**so that** I can find accurate answers quickly and insert them into my responses.

#### Acceptance Criteria

**AC-6.1 — Browse Tab: Folder Tree**
Given the "Kiến thức" tab is open,
Then the Browse sub-tab shows a hierarchical folder tree with expand/collapse toggles.
`[C10]` `(KnowledgeBaseSearch.tsx — folder tree structure)`

**AC-6.2 — Folder Expand/Collapse**
When the agent clicks a folder,
Then its child folders and articles expand in-line. Clicking again collapses them.
Folders show Folder/FolderOpen icons; articles show FileText icon.
`[C11]` `(KnowledgeBaseSearch.tsx — toggleFolder logic)`

**AC-6.3 — Article Open**
When the agent clicks an article in the folder tree,
Then an article detail panel opens on the right side of the KB component showing: title, summary, tabs (Overview, Content, Related, Comments), views count, rating, and action buttons.
`[C12]` `[C13]`

**AC-6.4 — Article Actions**
The article detail panel provides these buttons: "Chèn" (Insert into compose), "Sao chép" (Copy to clipboard), "Đánh dấu" (Bookmark toggle), "Toàn màn hình" (Fullscreen).
`[C13]`

**AC-6.5 — Bookmark Toggle**
When the agent clicks the Bookmark button,
Then the article's `isBookmarked` state toggles and the icon fills (bookmarked) or unfills (unbookmarked).
`[C14]` `(KnowledgeBaseSearch.tsx — isBookmarked toggle)`

**AC-6.6 — Search Results**
When the agent types in the search input (e.g., "đăng nhập"),
Then a results tab appears with matching article cards showing title, summary snippet, category, views, and rating.
`[C15]` `(KnowledgeBaseSearch.tsx — search: case-insensitive match on title/content/tags)`

**AC-6.7 — Filter Popover**
When the agent clicks the filter icon,
Then a popover opens with category checkboxes and tag filter options.
`[C16]`

**AC-6.8 — Fullscreen Article**
When the agent clicks "Toàn màn hình",
Then the article opens in a full-screen dialog for easier reading.
`[C17]`

**AC-6.9 — Saved (Bookmarked) Tab**
When the agent clicks the "Đã lưu" sub-tab,
Then only bookmarked articles are displayed.
`[C18]` `(KnowledgeBaseSearch.tsx — savedTab filter: isBookmarked === true)`

**AC-6.10 — Mock Folder Structure**
The mock knowledge base contains:
- "Chính sách bảo hành" > "Bảo hành Laptop" > 2 articles
- "Dịch vụ khách hàng" > "Đổi trả sản phẩm" > 1 article
`(KnowledgeBaseSearch.tsx — mock folder data)`

---

### US-7 — Create & Manage Tickets

**As** a customer service agent,
**I want** to create and view support tickets linked to interactions,
**so that** issues requiring follow-up are tracked and assigned properly.

#### Acceptance Criteria

**AC-7.1 — Create Ticket Form (Empty State)**
Given an interaction is selected and the "Tạo Ticket" tab is clicked,
Then an empty ticket creation form is shown with fields: Tiêu đề (title), Mô tả (description), Ưu tiên (priority), Danh mục (category), Phòng ban (department), Ngày hết hạn (due date).
`[D01]` `(CreateTicketDialog.tsx — ticketData state)`

**AC-7.2 — Validation: Title Required**
When the agent clicks "Tạo Ticket" with an empty title,
Then a validation error (toast or inline) is shown indicating the title is required and the ticket is NOT created.
`[D02]` `(CreateTicketDialog.tsx — validation: title non-empty trim)`

**AC-7.3 — Validation: Description Required**
When the agent provides a title but leaves description empty and clicks "Tạo Ticket",
Then a validation error is shown indicating the description is required and the ticket is NOT created.
`[D03]` `(CreateTicketDialog.tsx — validation: description non-empty trim)`

**AC-7.4 — Context Section (Pre-filled)**
When the create ticket form is open from within an interaction,
Then a collapsible "Đối tượng liên quan" section shows: Interaction card (type, subject), Contact card (customer name, CIF, phone, email, segment), and Query Object card (if applicable).
`[D04]` `(CreateTicketDialog.tsx — relatedObjects section)`

**AC-7.5 — Category Dropdown (6 options)**
When the agent opens the Danh mục dropdown,
Then 6 options are shown: "Khiếu nại dịch vụ", "Yêu cầu kỹ thuật", "Thay đổi thông tin", "Bảo hành sản phẩm", "Tài chính - Thanh toán", "Khác".
`[D05]` `(CreateTicketDialog.tsx — categories array)`

**AC-7.6 — Priority Dropdown (4 options)**
When the agent opens the Ưu tiên dropdown,
Then 4 options are shown: "Thấp", "Trung bình", "Cao", "Khẩn cấp". Default is "Trung bình".
`[D06]`

**AC-7.7 — Department Dropdown (5 options)**
When the agent opens the Phòng ban dropdown,
Then 5 options are shown: "Customer Service", "Technical Support", "Billing", "Sales", "Product Team".
`[D07]` `(CreateTicketDialog.tsx — departments array)`

**AC-7.8 — Successful Creation → View Mode**
Given all required fields are filled (title + description),
When the agent clicks "Tạo Ticket",
Then the form switches to view mode showing: auto-generated ticket ID (format: `TKT-{timestamp}`), a "Đã tạo thành công" badge (blue-100 text-blue-800), and all filled-in fields in read-only display. An edit button is also shown.
`[D08]` `[D09]` `(CreateTicketDialog.tsx — mode: 'view', id: TKT-${Date.now()})`

**AC-7.9 — Ticket Detail View: TKT-001**
Given the TKT-001 demo button is triggered,
Then the right panel switches to TicketDetail view showing: title "Lỗi đăng nhập", status "Đang xử lý" (yellow), priority "Cao" (orange), assigned to "Agent Tung", 3 comments (1 internal with yellow-50 bg and "Nội bộ" badge).
`[D10]` `[D11]` `(App.tsx:40-88 — TKT-001 data)`

**AC-7.10 — Ticket Edit Mode**
When the agent clicks "Chỉnh sửa",
Then the ticket fields become editable: title input, description textarea, priority dropdown, status dropdown, classification dropdown, assigned agent dropdown, due date input.
`[D12]`

**AC-7.11 — Ticket Status Options**
The status dropdown in edit mode offers: "Mới", "Đang xử lý", "Chờ phản hồi", "Đã giải quyết", "Đã đóng".
`(TicketDetail.tsx — status values)`

**AC-7.12 — Ticket Detail View: TKT-002 (VIP)**
Given TKT-002 is opened,
Then the view shows: VIP badge on customer name, priority "Khẩn cấp" (red), 2 attachments (screenshot-error.png, error-log.txt), due date as "30 phút tới" (30 minutes from now).
`[D14]` `(App.tsx:90-140 — TKT-002 data)`

**AC-7.13 — Internal Comment**
When the agent checks the "Nội bộ" checkbox and submits a comment,
Then the comment renders with a yellow-50 background and a "Nội bộ" badge, distinguishing it from customer-visible comments.
`[D15]` `(TicketDetail.tsx — isInternal flag)`

**AC-7.14 — Comment Add Button State**
The "Gửi" (Send) button for adding a comment is disabled when the comment textarea is empty.
`(TicketDetail.tsx — disabled if textarea empty)`

**AC-7.15 — Ticket Priority Colors**
Priority is displayed with color-coded badges:
- urgent: bg-red-100 text-red-800 "Khẩn cấp"
- high: bg-orange-100 text-orange-800 "Cao"
- medium: bg-blue-100 text-blue-800 "Trung bình"
- low: bg-muted text-foreground "Thấp"
`(TicketDetail.tsx — priorityConfig)`

---

### US-8 — Information Query (BFSI)

**As** a customer service agent,
**I want** to look up customer financial product information across 8 categories,
**so that** I can answer inquiries accurately without switching systems.

#### Acceptance Criteria

**AC-8.1 — 8 Product Categories**
Given the "Truy vấn TT" tab is open,
Then 8 category buttons are shown: Tài khoản (accounts), Tiết kiệm (savings), Vay (loans), Thẻ (cards), Ngân hàng điện tử (digital-banking), Thanh toán (payments), Merchant, Giao dịch (transactions).
`[D16]` `(InformationQuery.tsx — 8 categories)`

**AC-8.2 — Accounts Category**
When "Tài khoản" is selected,
Then the panel shows account balance (green-600), account type, and account status for each product.
`[D16]` `(InformationQuery.tsx — account type rendering)`

**AC-8.3 — Savings Category**
When "Tiết kiệm" is selected,
Then the panel shows principal (blue-600), interest rate (green-600), and maturity date for each savings product.
`[D17]` `(InformationQuery.tsx — savings type rendering)`

**AC-8.4 — Loans Category**
When "Vay" is selected,
Then the panel shows current balance (red-600), monthly payment, interest rate, and term.
`[D18]` `(InformationQuery.tsx — loan type rendering)`

**AC-8.5 — Cards Category**
When "Thẻ" is selected,
Then the panel shows credit limit, available balance (green-600), and card status.
`[D19]` `(InformationQuery.tsx — card type rendering)`

**AC-8.6 — Transactions with Date Filter**
When "Giao dịch" is selected,
Then a transaction table is shown with a date-range filter applied.
`[D20]`

**AC-8.7 — Sensitive Data Toggle — Masked**
Given sensitive data is displayed,
When the agent clicks the Eye icon to hide sensitive data,
Then sensitive fields (account numbers, balances, card numbers) are masked (e.g., "****1234") and the icon changes to EyeOff.
`[D21]` `(InformationQuery.tsx — sensitiveDataVisible toggle)`

**AC-8.8 — Sensitive Data Toggle — Visible**
When the agent clicks the EyeOff icon to reveal data,
Then masked fields show their full values again.
`(InformationQuery.tsx — sensitiveDataVisible: true)`

**AC-8.9 — Create Ticket from Query**
When the agent clicks "Tạo ticket" from within an information query result,
Then the create ticket form opens with the product context pre-filled in the "Đối tượng liên quan" section.
`[D22]` `(CreateTicketDialog.tsx — queryObject prop)`

**AC-8.10 — Currency Formatting**
All monetary values are formatted using `Intl.NumberFormat('vi-VN', {style: 'currency', currency: 'VND'})`.
`(CreateTicketDialog.tsx — formatCurrency)`

---

### US-9 — Floating Call Widget (FCW)

**As** a customer service agent,
**I want** a persistent floating widget that shows active call controls over any view,
**so that** I can manage calls without leaving my current workflow.

#### Acceptance Criteria

**AC-9.1 — Ringing State: Auto-Expand + Yellow Pulse**
When a call starts with status 'ringing',
Then the FCW appears at bottom-right (fixed, z-50, w-80), is automatically expanded, and shows a yellow pulsing dot (`bg-yellow-500 animate-pulse`) and badge "Cuộc gọi đến".
`[E08]` `(CallContext.tsx:61 — auto-expand on ringing; FloatingCallWidget.tsx — yellow pulse)`

**AC-9.2 — Connected State: Timer**
When the call status changes to 'connected',
Then the FCW badge turns green ("Đang kết nối"), the pulse dot changes to bg-green-500 (no animation), and a call duration timer starts counting up every second (format: HH:MM:SS).
`[E09]` `(FloatingCallWidget.tsx — callDuration setInterval 1000ms, status='connected')`

**AC-9.3 — Hold State**
When the agent clicks "Giữ máy" (Hold),
Then `isOnHold` toggles to true, the badge changes to "Đang giữ máy" (orange), and the button label changes to "Tiếp tục".
`[E10]` `(FloatingCallWidget.tsx — isOnHold state)`

**AC-9.4 — Mute State**
When the agent clicks "Tắt tiếng" (Mute),
Then `isMuted` toggles to true, the button icon changes to indicate muted state, and the microphone icon shows an "off" state.
`[E10]` `(FloatingCallWidget.tsx — isMuted state)`

**AC-9.5 — Speaker Toggle**
When the agent clicks the speaker button,
Then `isSpeakerOn` toggles between on and off states.
`(FloatingCallWidget.tsx — isSpeakerOn state)`

**AC-9.6 — Transfer from FCW**
When the agent clicks "Chuyển cuộc gọi" (Transfer) from within the FCW,
Then the TransferCallDialog opens.
`[E11]` `(FloatingCallWidget.tsx → App.tsx:setTransferDialogOpen(true))`

**AC-9.7 — End Call**
When the agent clicks "Kết thúc cuộc gọi",
Then `endCall()` is called: currentCall → null, isCallWidgetVisible → false, isCallWidgetExpanded → false, and the FCW disappears from the screen.
`[E12]` `(CallContext.tsx:66-73 — endCall)`

**AC-9.8 — Compact Header (Always Visible When Active)**
When the FCW is active but collapsed,
Then a compact header shows: customer avatar, customer name (truncated), status badge, call duration, and a quick hangup button (red, text-red-600).
`(FloatingCallWidget.tsx — compact header section)`

**AC-9.9 — Expanded Secondary Controls**
When the FCW is expanded,
Then the secondary action grid shows 4 buttons: Transfer (blue-700), Survey (purple-700), Conference (foreground/80), Chi tiết (foreground/80).
`(FloatingCallWidget.tsx — secondaryActions grid)`

**AC-9.10 — Auto-Expand on Transferring**
When `updateCallStatus('transferring')` is called,
Then the FCW auto-expands (same as ringing).
`(CallContext.tsx:80-83 — auto-expand for 'ringing' | 'transferring')`

---

### US-10 — Call Transfer

**As** a customer service agent,
**I want** to transfer active calls to available agents with warm or cold transfer options,
**so that** customers are connected to the right person with minimal disruption.

#### Acceptance Criteria

**AC-10.1 — Transfer Dialog Open**
When the agent clicks "Chuyển" (Transfer) from either the voice detail panel or the FCW,
Then a dialog titled "Transfer cuộc gọi" opens.
`[B07]` `(TransferCallDialog.tsx — Dialog component)`

**AC-10.2 — Transfer Type Selection**
The dialog provides a transfer type dropdown with 2 options:
- "Warm Transfer (Giới thiệu trước)" - introduces agent to customer before handoff
- "Cold Transfer (Chuyển trực tiếp)" - immediate handoff without introduction
`[B09]` `(TransferCallDialog.tsx — transferType state)`

**AC-10.3 — Agent List (4 agents)**
The dialog shows 4 agents with: name, department, availability badge ("Rảnh" green / "Bận" red), and skill badges.
1. Agent Mai — Technical Support — Rảnh — [Technical, Hardware]
2. Agent Linh — Customer Service — Bận — [Billing, Account]
3. Agent Duc — Sales — Rảnh — [Sales, Product]
4. Agent Nga — Technical Support — Rảnh — [Software, Integration]
`[B07]` `(TransferCallDialog.tsx — hardcoded agents array)`

**AC-10.4 — Busy Agent Not Selectable**
Agent Linh (status: Busy) is displayed with opacity-50 styling and cannot be selected.
`(TransferCallDialog.tsx — disabled if status !== 'available')`

**AC-10.5 — Agent Search Filter**
When the agent types in the search box,
Then the agent list filters by name, department, or skills (case-insensitive substring match).
`[B08]` `(TransferCallDialog.tsx — search filter logic)`

**AC-10.6 — Agent Selection Highlight**
When an available agent is clicked,
Then that row is highlighted with border-blue-500 bg-blue-50 styling.
`[B10]` `(TransferCallDialog.tsx — selectedAgent state)`

**AC-10.7 — Transfer Note**
The dialog includes a "Ghi chú chuyển cuộc gọi" textarea (3 rows) for optional context.
`[B10]`

**AC-10.8 — Submit Requires Agent Selection**
The "Chuyển cuộc gọi" button is disabled until an available agent is selected.
`(TransferCallDialog.tsx — disabled: !selectedAgent)`

---

### US-11 — Agent Status Management

**As** a customer service agent,
**I want** to set my availability status per channel with specific reasons,
**so that** the system accurately routes interactions to me when I am ready.

#### Acceptance Criteria

**AC-11.1 — Status Pill: 3/3 Ready**
When all 3 channels (voice, email, chat) have status 'ready',
Then the header status pill shows: green CheckCircle icon, "Sẵn sàng" label, "3/3 kênh" counter.
`[A01]` `(AgentStatusWidget.tsx — getReadyChannelsCount === getTotalChannelsCount)`

**AC-11.2 — Status Pill: Partial**
When 1 or 2 channels are ready,
Then the pill shows: yellow Power icon, "Một phần sẵn sàng" label, "X/3 kênh" counter.
`[E02]` `(AgentStatusWidget.tsx — mixed state)`

**AC-11.3 — Status Pill: All Not-Ready**
When all channels are not-ready,
Then the pill shows: red XCircle icon, "Không sẵn sàng" label, "0/3 kênh".
`[E06]`

**AC-11.4 — HoverCard on Hover**
When the agent hovers over the status pill (with 200ms openDelay, 300ms closeDelay),
Then a HoverCard popover appears with per-channel status, timers, and quick action buttons.
`[E01]` `(AgentStatusWidget.tsx — HoverCard openDelay=200 closeDelay=300)`

**AC-11.5 — Per-Channel Toggle**
Given the HoverCard is open,
When the agent clicks the toggle switch for a channel (e.g., Voice),
Then a reason picker appears specific to that channel (orange card: border-red-200 bg-red-50).
`[E02]` `(AgentStatusWidget.tsx — showReasonPicker per channel)`

**AC-11.6 — 8 Not-Ready Reasons**
The not-ready reason picker offers 8 options with icons:
1. "Nghỉ giải lao" (break) — Coffee icon — amber-600
2. "Nghỉ trưa" (lunch) — Utensils icon — orange-600
3. "Đào tạo" (training) — GraduationCap icon — blue-600
4. "Họp" (meeting) — Users icon — purple-600
5. "Sự cố kỹ thuật" (technical-issue) — Wrench icon — red-600
6. "Bảo trì hệ thống" (system-maintenance) — Settings icon — muted
7. "WC" (toilet) — AlertTriangle icon — yellow-600
8. "Khác" (other) — AlertTriangle icon — muted (shows custom text textarea)
`[E03]` `[E04]` `(AgentStatusWidget.tsx — NOT_READY_REASONS array; EnhancedAgentStatusContext.tsx:5-13)`

**AC-11.7 — Custom Reason ("Khác")**
When "Khác" (other) is selected,
Then a textarea appears for the agent to type a custom reason. The `customReason` field is only stored if `reason === 'other'`.
`[E04]` `(EnhancedAgentStatusContext.tsx:221 — customReason: status === 'not-ready' && reason === 'other' ? customReason : undefined)`

**AC-11.8 — Status Change Applies**
When the agent selects a reason and clicks Confirm/Apply,
Then that channel's status changes to 'not-ready' with the selected reason, the channel duration timer resets to 0, and the overall pill updates to reflect the new ready count.
`[E05]` `(EnhancedAgentStatusContext.tsx:216-229 — setChannelStatus: reset duration to 0)`

**AC-11.9 — Ready All**
When the agent clicks "Ready All",
Then all 3 channels set to 'ready', all reason fields cleared, all timers reset to 0.
`[E07]` `(EnhancedAgentStatusContext.tsx:305-307 — goReadyAll)`

**AC-11.10 — Not Ready All**
When the agent clicks "Not Ready All" and selects a reason,
Then all 3 channels set to 'not-ready' with the same reason.
`[E06]` `(EnhancedAgentStatusContext.tsx:309-311 — goNotReadyAll, default reason: 'break')`

**AC-11.11 — Duration Timer**
Each channel displays a timer (MM:SS or HH:MM:SS) counting up every second while `isTimerActive === true`. The timer resets to 0 on any status change.
`(EnhancedAgentStatusContext.tsx:139-158 — setInterval 1000ms)`

**AC-11.12 — Disconnection**
When the browser `offline` event fires,
Then `connectionStatus` → 'disconnected', all channels set to 'disconnected' state, and `isTimerActive` → false for all channels.
`(EnhancedAgentStatusContext.tsx:162-187 — window offline listener)`

**AC-11.13 — Keyboard Shortcuts**
`Ctrl+R` (or `Cmd+R`): immediately calls `goReadyAll()`.
`Ctrl+N` (or `Cmd+N`): opens the not-ready reason picker.
`(EnhancedAgentStatusContext.tsx:189-208 — keydown listener)`

**AC-11.14 — Session Stats in HoverCard**
The HoverCard footer shows "Phiên làm việc:" duration and "Agent ID:" (default: 'AGT001').
`(AgentStatusWidget.tsx — session stats section)`

---

### US-12 — Notification Centre

**As** a customer service agent,
**I want** a notification centre that alerts me to missed calls, ticket assignments, due dates, system events, and schedule reminders,
**so that** I can take action on time-sensitive items.

#### Acceptance Criteria

**AC-12.1 — 5 Notification Types**
The system supports exactly 5 notification types:
- `missed-call`: "Cuộc gọi nhỡ" (orange-600)
- `ticket-assignment`: "Ticket mới" (blue-600)
- `ticket-due`: "Ticket hết hạn" (amber-600)
- `system-alert`: "Cảnh báo hệ thống" (muted)
- `schedule-reminder`: "Nhắc lịch" (purple-600)
`(NotificationContext.tsx — NotificationType union)`

**AC-12.2 — 4 Notification States**
Each notification transitions through: 'new' → 'viewed' → 'actioned' | 'dismissed'.
`(NotificationContext.tsx — NotificationStatus union)`

**AC-12.3 — Notification Centre Tabs (5)**
When the bell icon is clicked,
Then the notification centre opens with 5 tabs: "Tất cả", "Cuộc gọi" (missed-call), "Ticket" (assignment + due), "Hệ thống" (system-alert), "Lịch" (schedule).
`[E13]` `[E17]` `[E18]` `[E19]` `(NotificationCenter.tsx — 5 tab definitions)`

**AC-12.4 — Unread Count Badge**
The bell icon and each tab show a red count badge displaying the number of 'new' notifications.
`(NotificationContext.tsx — getUnreadCount: filter status === 'new')`

**AC-12.5 — Auto-Hide**
Active (toast) notifications auto-hide after `settings.autoHideAfter` seconds (default: 8 seconds). Maximum 3 active notifications at once (`maxActiveNotifications: 3`).
`(NotificationContext.tsx — autoHideAfter: 8, maxActiveNotifications: 3)`

**AC-12.6 — Sound on New Notification**
When a new notification arrives and `settings.enableSound === true`,
Then a chime plays using Web Audio API (800Hz→600Hz→800Hz, 0.3s, gain 0.3).
`(NotificationContext.tsx — playNotificationSound with fallback silent)`

**AC-12.7 — VIP Missed Call → Urgent Priority**
When a missed call notification is added with `isVIP: true`,
Then the notification priority is automatically set to 'urgent' regardless of the input priority.
`(NotificationContext.tsx — priority override: isVIP → 'urgent')`

**AC-12.8 — Not-Ready Warning Banner**
When ≥3 missed call notifications have reason='not-ready' within the last 15 minutes,
Then a warning banner appears in the notification centre: "{count} cuộc gọi nhỡ do Not Ready" with orange-50 background.
`(NotificationContext.tsx:getNotReadyMissedCallsWarning — count ≥ 3 in 15-min window)`

**AC-12.9 — Notification Priority Border**
Each notification card has a left border (4px) colored by priority:
- urgent: red
- high: orange
- medium: blue
- low: gray
`(NotificationCenter.tsx — priority border colors)`

**AC-12.10 — Missed Call Action: Gọi lại**
Missed call notifications show a "Gọi lại" (green) button to initiate a callback.
`(NotificationCenter.tsx — missed-call specific action)`

**AC-12.11 — Notification Settings Panel**
When the settings icon is clicked within the notification centre,
Then a settings panel appears with: Global enable toggle, Sound toggle, Auto-hide duration options (5s, 8s, 10s, 15s buttons).
`[E20]` `(NotificationCenter.tsx — showSettings panel)`

**AC-12.12 — Phone Number Formatting**
Missed call notifications display phone numbers reformatted from `+84XXXXXXXXX` to `0XXX XXX XXX`.
`(NotificationCenter.tsx — formatPhoneNumber)`

**AC-12.13 — Clear Old Notifications**
Clicking "Xóa cũ" deletes all notifications older than 24 hours.
`(NotificationContext.tsx — clearOldNotifications(24))`

**AC-12.14 — Missed Call Demo → Toast**
When the "Missed Call" demo button is triggered,
Then a toast notification with orange styling appears in the active notification area.
`[E14]`

**AC-12.15 — 3 Missed Calls Demo → Max 3 Toasts**
When the "3 Missed Calls" demo is triggered,
Then up to 3 stacked toast notifications appear (oldest is removed if maxActiveNotifications=3 is already reached).
`[E16]` `(NotificationContext.tsx — maxActiveNotifications: 3)`

---

### US-13 — Customer Information Panel

**As** a customer service agent,
**I want** to view and annotate comprehensive customer information in the right panel,
**so that** I have full context when handling any interaction.

#### Acceptance Criteria

**AC-13.1 — 5 Customer Info Tabs**
The right panel customer info area shows 5 tabs: "Hồ sơ" (Profile), "Lịch sử" (History), "Ticket", "Truy vấn core" (Core Query), "Ghi chú" (Notes).
`[F01]` `(CustomerInfoScrollFixed.tsx — 5 tabs)`

**AC-13.2 — Profile Tab Content**
The Hồ sơ tab shows: customer avatar, name, VIP badge (if applicable), satisfaction rating stars, contact section (email, phone), and business section (CIF, segment, relationship length).
`[F01]` `[F02]`

**AC-13.3 — Profile Sections Expandable**
Each profile section (contact, business, preferences) has a collapse/expand toggle via ChevronDown/ChevronRight icon.
`[F02]`

**AC-13.4 — History Tab with Channel Filters**
The Lịch sử tab shows a chronological list of past interactions with sub-filter chips: "Tất cả", "Cuộc gọi", "Email", "Chat".
`[F03]` `[F04]`

**AC-13.5 — Ticket Tab with Status Chips**
The Ticket tab shows a list of customer tickets with filter chips: "Tất cả", "Chờ", "Đang xử lý", "Chuyển tiếp", "Hoàn thành".
`[F05]` `[F06]`

**AC-13.6 — Ticket Empty State**
When a filter chip is selected that matches no tickets,
Then an empty state is shown with icon and "Không tìm thấy ticket nào" message.
`[26 (original)]` `[F07]`

**AC-13.7 — Core Query Tab**
The "Truy vấn core" tab renders the same InformationQuery component (8 product categories) contextual to the current customer.
`[F08]`

**AC-13.8 — Notes Tab: Empty State**
When no notes exist for the customer,
Then the notes tab shows an empty state with an "Thêm ghi chú" button.
`[F09]`

**AC-13.9 — Notes: Add Note**
When the agent clicks "Thêm ghi chú",
Then an editor opens with a textarea, tag dropdown, and save button.
`[F10]`

**AC-13.10 — Notes: Save and Pin**
After saving a note, the agent can click the pin icon to pin it.
Pinned notes appear at the top of the notes list with a yellow ring border.
`[F11]` `(CallNotes.tsx — pinned notes sort first)`

**AC-13.11 — Right Panel: Ticket Detail Mode**
When a ticket is opened (e.g., via demo TKT-001 button),
Then the right panel switches from customer info to ticket detail view, showing a "← Quay lại" back button at the top.
`[F12]` `(App.tsx:677 — rightPanelView: 'customer' | 'ticket')`

**AC-13.12 — Right Panel: Back to Customer**
When the agent clicks "Quay lại" (Back),
Then `rightPanelView` switches back to 'customer' and the customer info panel is restored.
`(App.tsx — handleCloseTicketView)`

**AC-13.13 — Tạo Ticket Link**
In the right panel's Ticket tab, a "Tạo ticket từ tương tác này" (blue) button opens the create ticket form in the center panel's Tạo Ticket tab.
`[25-original]`

---

### US-14 — Agent Header & Session Stats

**As** a customer service agent,
**I want** a persistent header showing my session metrics, channel stats, and quick access controls,
**so that** I can monitor my performance and access key actions without navigating away.

#### Acceptance Criteria

**AC-14.1 — Header Layout**
The fixed header displays: left section (app logo + breadcrumb), center section (channel stats), right section (status pill, bell icon, agent profile).
`[A01]` `(EnhancedAgentHeader.tsx — layout)`

**AC-14.2 — Channel Stats in Header**
The center section shows 3 real-time counters: "Calls: N", "Emails: N", "Chats: N" reflecting current interaction counts by channel.
`[25-original]` `(EnhancedAgentHeader.tsx — channel counters)`

**AC-14.3 — Agent Profile Widget**
The top-right shows the agent's name (default: "Agent Tung") and current status label.
`[A01]`

**AC-14.4 — Demo Controls Panel**
A floating "Demo Controls" panel is accessible (collapsed by default, `demoControlsCollapsed: true`) with 13 demo trigger buttons:
Start Call, Missed Call, VIP Call, 3 Missed Calls, Ticket, Schedule, Due Soon, System, Shortcuts, View BFSI, TKT-001, TKT-002, Focus Tickets Tab.
`(App.tsx:683 — demoControlsCollapsed state; demo button list)`

**AC-14.5 — Keyboard Shortcuts Modal**
When the "Shortcuts" demo button is clicked (or `Ctrl+K`),
Then a modal dialog opens showing all keyboard shortcuts in a formatted table.
`[F15]` `(App.tsx:682 — showKeyboardShortcuts state)`

**AC-14.6 — Agent Settings Sidebar**
When the agent clicks the Settings icon in the status widget,
Then a side panel (AgentSettingsSidebar) slides in from the right with tabs: "Trạng thái" (channels + resources), "Thông báo" (placeholder), "Tùy chỉnh" (preferences placeholder).
`[F13]` `[F14]`

---

## Correctness Properties

The following invariants must hold at all times in a correctly functioning system.

### CP-1 — Call State Machine Valid Transitions

**Invariant:** `currentCall.status` must only transition through the valid state machine:
```
null → ringing → connected → on-hold ↔ connected → transferring → ended → null
```
**Gap identified:** `updateCallStatus(status)` in `CallContext.tsx:75` accepts any `CallData['status']` value without guarding against invalid transitions (e.g., directly to 'ended' from 'ringing'). A production system must add a transition guard.
`(CallContext.tsx:75-84 — no transition validation)`

**Auto-expand rule:** `isCallWidgetExpanded` automatically becomes `true` when status is `'ringing'` or `'transferring'`; all other transitions do not modify `isCallWidgetExpanded`.
`(CallContext.tsx:61, 80-83)`

### CP-2 — SLA Timer Monotonicity

**Invariant:** `chatSLA.waitingSeconds` only increments while the session is active; it never decrements. A `slaRemainingSeconds` value of negative indicates breach.
`(App.tsx:528 — INT-CHAT-005: slaRemainingSeconds: -20 is already in breach state)`

### CP-3 — Notification Unread Count Formula

**Invariant:** The unread count badge on the bell icon equals `notifications.filter(n => n.status === 'new').length`. It does not count 'viewed', 'actioned', or 'dismissed' notifications.
`(NotificationContext.tsx — getUnreadCount implementation)`

### CP-4 — Active Notification Cap

**Invariant:** At most `maxActiveNotifications = 3` toast notifications can be visible simultaneously. When a 4th notification arrives, the oldest active notification is removed before the new one is shown.
`(NotificationContext.tsx — maxActiveNotifications: 3)`

### CP-5 — Ticket Form Submit Guard

**Invariant:** The "Tạo Ticket" submit action is blocked unless BOTH `title.trim().length > 0` AND `description.trim().length > 0`. Neither can be empty or whitespace-only.
`(CreateTicketDialog.tsx — validation before creation)`

### CP-6 — Transfer Dialog Submit Guard

**Invariant:** The "Chuyển cuộc gọi" button in TransferCallDialog is disabled (`disabled: !selectedAgent`) until the user has selected an available agent. Busy agents (Agent Linh) cannot be selected.
`(TransferCallDialog.tsx — submitButton disabled condition)`

### CP-7 — Agent Status Duration Timer Guard

**Invariant:** A channel's `duration` counter increments by 1 per second if and only if `isTimerActive === true`. Setting `status = 'disconnected'` sets `isTimerActive = false`. Any status change resets `duration = 0`.
`(EnhancedAgentStatusContext.tsx:139-158 — timer loop; :224 — isTimerActive: status !== 'disconnected'; :222 — duration: 0 reset)`

### CP-8 — VIP Missed Call Auto-Escalation

**Invariant:** When `addMissedCall(data)` is called with `isVIP: true`, the resulting notification's `priority` is always set to `'urgent'`, overriding any lower priority value supplied by the caller.
`(NotificationContext.tsx — VIP priority override logic)`

### CP-9 — Filter Intersection (AND semantics)

**Invariant:** When multiple filters are active (channel filter + status tab + search query), the resulting interaction list satisfies ALL active criteria simultaneously (logical AND, not OR). Deactivating any single filter expands the result set.
`(useInteractionStats.tsx:filterInteractions — sequential filter application)`

### CP-10 — Notes Sort Order

**Invariant:** The notes list always renders pinned notes first (`isPinned === true`), then remaining notes sorted by `timestamp` descending (newest first). This order is stable and does not depend on insertion order.
`(CallNotes.tsx — sortedNotes: pinned first + timestamp desc)`

---

## Non-Functional Requirements

### NFR-1 — Performance

- **Initial load:** App must reach interactive state within 3 seconds on a standard development machine (observed: Playwright `waitUntil: 'networkidle'` completes in <1.5s on localhost).
- **Interaction selection:** Clicking an interaction item must update the center panel within 100ms (no async data fetching in mock mode).
- **Status timer:** The per-channel duration timer updates every 1000ms with no observable drift over a 5-minute session (`setInterval(updateTimers, 1000)` in EnhancedAgentStatusContext).
- **FCW timer:** Call duration counter updates every 1000ms using `setInterval` in FloatingCallWidget; starts only when status='connected'.

### NFR-2 — Accessibility

- All interactive elements use native `button`, `input`, `select`, or Radix UI primitives (which include ARIA attributes by default).
- Tab navigation follows logical DOM order across all 3 panels.
- Status badges use color + icon (not color alone) to convey state, supporting color-blind users.
- Dialog components (`[role="dialog"]`) trap focus when open and restore focus on close (Radix DialogContent behavior).

### NFR-3 — Internationalisation

- Primary locale: Vietnamese (vi-VN).
- Currency formatting: `Intl.NumberFormat('vi-VN', {style: 'currency', currency: 'VND'})`.
- All date/time formatting uses Vietnamese locale conventions (DD/MM/YYYY).
- Phone numbers displayed in Vietnamese domestic format: `+84XXXXXXXXX` → `0XXX XXX XXX`.

### NFR-4 — Browser Compatibility

- Target: Chromium-based browsers (Chrome 120+, Edge 120+). Playwright tests confirm correct rendering in Chromium 1920×1080.
- No IE or Safari-specific testing in scope for V1.

### NFR-5 — State Persistence

- All state is in-memory (React Context). There is NO localStorage, sessionStorage, or IndexedDB persistence in V1. A browser refresh resets all state to defaults.

---

## Constraints & Assumptions

### Constraints

| # | Constraint | Source |
|---|---|---|
| C-1 | No backend API in V1. All data is hardcoded mock data defined in `App.tsx`. | Static analysis |
| C-2 | Radix UI packages are pinned to specific versions via Vite alias overrides to prevent duplicate resolution. Do not remove these aliases from `vite.config.ts`. | CLAUDE.md |
| C-3 | There are exactly 4 agents in the transfer dialog (hardcoded). Adding agents requires modifying `TransferCallDialog.tsx`. | TransferCallDialog.tsx |
| C-4 | SLA threshold for all chat interactions is hardcoded to 5 minutes (`slaThresholdMinutes: 5`). | App.tsx mock data |
| C-5 | The agent identity is hardcoded as "Agent Tung" / "AGT001" in `EnhancedAgentStatusProvider` defaults. | EnhancedAgentStatusContext.tsx:96 |
| C-6 | Created tickets receive IDs in format `TKT-${Date.now()}`, guaranteed unique within a session but not across sessions. | CreateTicketDialog.tsx |
| C-7 | Audio notifications use Web Audio API; environments without audio hardware will silently skip (no error thrown). | NotificationContext.tsx — try/catch |
| C-8 | `AgentStatusContext.tsx` exists as a file but its Provider is NOT in the App.tsx provider tree. Only `EnhancedAgentStatusProvider` is used. | MEMORY.md |

### Assumptions

| # | Assumption |
|---|---|
| A-1 | Future backend integration will replace mock data with REST/WebSocket APIs while preserving the same component prop interfaces. |
| A-2 | The 3-channel model (voice, email, chat) is fixed for V1. Adding new channels (e.g., social media) is a V2 concern. |
| A-3 | The logged-in agent always has access to all interactions and tickets shown (no row-level permission model in V1). |
| A-4 | The knowledge base folder structure shown is a representative sample; a real KB would be backed by a CMS API. |
| A-5 | Chat SLA tracking does not include a server-side countdown in V1; the `slaRemainingSeconds` values in mock data are static snapshots. |
| A-6 | All Vietnamese text labels are final for V1 and do not require an i18n framework (no multi-language support planned). |
| A-7 | The heartbeat interval of 30 seconds (`EnhancedAgentStatusContext.tsx:179`) is adequate for connection monitoring in V1; production may require WebSocket-based heartbeat. |

---

## Screenshot Reference Index

| Code | File | Description |
|---|---|---|
| A01 | A01-initial-load.png | 3-panel default layout with INT-DEFAULT voice call selected |
| A02 | A02-tab-hang-cho.png | "Hàng chờ" status tab active |
| A03 | A03-tab-da-dong.png | "Đã đóng" status tab active |
| A04 | A04-tab-da-nhan.png | "Đã nhận" status tab active |
| A05 | A05-filter-calls.png | Voice channel filter chip active |
| A06 | A06-advanced-filter-voice.png | Advanced filter popover open (voice context) |
| A07 | A07-filter-emails.png | Email channel filter active |
| A08 | A08-filter-chats.png | Chat channel filter active |
| A09 | A09-advanced-filter-chat.png | Advanced filter popover open (chat context) |
| A10 | A10-search-tran.png | Search "Trần" with filtered results |
| A11 | A11-search-empty-state.png | Search empty state ("xyznotfound999") |
| A12 | A12-search-cleared-all-interactions.png | All interactions visible, VIP crown indicator |
| A13 | A13-left-panel-collapsed.png | Left panel collapsed |
| A14 | A14-left-panel-expanded.png | Left panel restored |
| A15 | A15-right-panel-collapsed.png | Right panel collapsed |
| B01 | B01-voice-call-selected.png | Voice call detail with recording player |
| B02 | B02-recording-player-playing.png | Recording player in play state |
| B03 | B03-timeline-expanded.png | Call timeline expanded (all events) |
| B04 | B04-call-notes-textarea-open.png | Call notes textarea open |
| B05 | B05-call-notes-filled.png | Note filled with content and tag |
| B06 | B06-call-notes-saved.png | Note saved in timeline |
| B07 | B07-transfer-dialog-open.png | Transfer call dialog |
| B08 | B08-transfer-search-filtered.png | Transfer dialog with search filter |
| B09 | B09-transfer-warm-selected.png | Warm transfer type selected |
| B10 | B10-transfer-agent-selected-note-filled.png | Agent selected + transfer note |
| B11 | B11-email-thread-view.png | Email thread view |
| B12 | B12-email-expanded-message.png | Email message expanded |
| B13 | B13-email-reply-inline-open.png | Email reply compose area |
| B14 | B14-email-cc-bcc-template.png | CC/BCC + template selected |
| B15 | B15-email-preview-dialog.png | Email preview dialog |
| B16 | B16-email-all-fields-filled.png | Reply compose all fields filled |
| B17 | B17-spam-email-warning.png | Spam email warning banner |
| B18 | B18-email-attachments-visible.png | Attachments section |
| B19 | B19-interaction-timeline-tab.png | Interaction timeline tab |
| B20 | B20-create-ticket-from-interaction.png | Create ticket from interaction tab |
| C01 | C01-chat-within-sla.png | Chat within-SLA green badge |
| C02 | C02-chat-near-breach-sla.png | Chat near-breach orange badge |
| C03 | C03-chat-breached-sla.png | Chat breached red badge |
| C04 | C04-chat-composer-filled.png | Chat composer with message |
| C05 | C05-chat-session-header-sla.png | Chat session header with SLA info |
| C06 | C06-chat-close-session-dialog.png | Close session confirmation dialog |
| C07 | C07-ai-assistant-chips.png | AI assistant tab with 6 chips |
| C08 | C08-ai-chip-clicked-loading.png | AI response loading state |
| C09 | C09-ai-response-insert-button.png | AI response with Insert button |
| C10 | C10-kb-folder-tree-browse.png | KB browse tab with folder tree |
| C11 | C11-kb-folder-expanded.png | KB folder expanded |
| C12 | C12-kb-article-opened.png | KB article detail panel |
| C13 | C13-kb-article-action-buttons.png | KB article action buttons |
| C14 | C14-kb-bookmark-toggled.png | KB bookmark toggled |
| C15 | C15-kb-search-results.png | KB search results |
| C16 | C16-kb-filter-popover-open.png | KB filter popover |
| C17 | C17-kb-fullscreen-article.png | KB fullscreen article dialog |
| C18 | C18-kb-saved-tab.png | KB saved/bookmarked tab |
| D01 | D01-create-ticket-form-empty.png | Create ticket empty form |
| D02 | D02-create-ticket-validation-title-missing.png | Validation: title required |
| D03 | D03-create-ticket-validation-desc-missing.png | Validation: description required |
| D04 | D04-create-ticket-context-section.png | Context section expanded |
| D05 | D05-create-ticket-category-dropdown.png | Category dropdown (6 options) |
| D06 | D06-create-ticket-priority-dropdown.png | Priority dropdown (4 options) |
| D07 | D07-create-ticket-department-dropdown.png | Department dropdown (5 options) |
| D08 | D08-create-ticket-all-fields-filled.png | All fields filled |
| D09 | D09-create-ticket-success-view-mode.png | Success view mode |
| D10 | D10-ticket-detail-tkt001-view.png | TKT-001 view mode |
| D11 | D11-ticket-detail-comments.png | TKT-001 comments (3 total, 1 internal) |
| D12 | D12-ticket-detail-edit-mode.png | TKT-001 edit mode |
| D13 | D13-ticket-priority-status-changed.png | Priority/status changed |
| D14 | D14-ticket-tkt002-vip-attachments.png | TKT-002 VIP + attachments |
| D15 | D15-ticket-internal-comment.png | Internal comment toggle |
| D16 | D16-info-query-accounts-category.png | Info query: accounts category |
| D17 | D17-info-query-savings-expanded.png | Info query: savings expanded |
| D18 | D18-info-query-loans.png | Info query: loans |
| D19 | D19-info-query-cards.png | Info query: cards |
| D20 | D20-info-query-transactions.png | Info query: transactions |
| D21 | D21-info-query-sensitive-masked.png | Sensitive data masked |
| D22 | D22-info-query-create-ticket.png | Create ticket from query |
| E01 | E01-agent-status-hovercard.png | Agent status HoverCard |
| E02 | E02-status-voice-toggle-off-reason-picker.png | Voice channel toggle + reason picker |
| E03 | E03-status-reason-lunch-selected.png | "Nghỉ trưa" reason selected |
| E04 | E04-status-reason-other-custom-text.png | "Khác" reason with custom textarea |
| E05 | E05-status-voice-not-ready-2of3.png | Voice not-ready: 2/3 kênh |
| E06 | E06-status-not-ready-all.png | Not Ready All: 0/3 kênh |
| E07 | E07-status-ready-all-green.png | Ready All: 3/3 kênh green |
| E08 | E08-fcw-ringing-state.png | FCW ringing state (auto-expanded, yellow pulse) |
| E09 | E09-fcw-connected-timer.png | FCW connected with timer |
| E10 | E10-fcw-muted-hold.png | FCW muted + on-hold |
| E11 | E11-fcw-transfer-dialog.png | FCW transfer button → dialog |
| E12 | E12-fcw-ended-widget-hidden.png | FCW hidden after end call |
| E13 | E13-notification-centre-open.png | Notification centre open |
| E14 | E14-demo-missed-call-toast.png | Missed call toast notification |
| E15 | E15-demo-vip-call-toast.png | VIP call toast (urgent) |
| E16 | E16-demo-3-missed-calls-stacked.png | 3 stacked toasts (max cap) |
| E17 | E17-notif-calls-tab.png | Notification: Calls tab |
| E18 | E18-notif-tickets-tab.png | Notification: Tickets tab |
| E19 | E19-notif-system-tab.png | Notification: System tab |
| E20 | E20-notif-settings-panel.png | Notification settings panel |
| F01 | F01-customer-info-profile-tab.png | Customer info: Profile tab |
| F02 | F02-customer-profile-vip-sections-expanded.png | Profile sections expanded |
| F03 | F03-customer-history-tab.png | Customer history tab |
| F04 | F04-customer-history-chat-filter.png | History: Chat sub-filter |
| F05 | F05-customer-ticket-tab.png | Customer ticket tab |
| F06 | F06-customer-ticket-pending-filter.png | Tickets: "Chờ" filter |
| F07 | F07-customer-ticket-empty-state.png | Tickets: empty state |
| F08 | F08-customer-core-bfsi-query-tab.png | Core BFSI query tab |
| F09 | F09-customer-notes-tab-empty.png | Notes tab: empty state |
| F10 | F10-customer-notes-editor-filled.png | Notes editor with content |
| F11 | F11-customer-note-saved-pinned.png | Note saved and pinned |
| F12 | F12-right-panel-ticket-detail-back-button.png | Right panel: ticket detail with back button |
| F13 | F13-agent-settings-sidebar-open.png | Agent settings sidebar |
| F14 | F14-agent-settings-status-tab.png | Settings: Trạng thái tab |
| F15 | F15-keyboard-shortcuts-modal.png | Keyboard shortcuts modal |

---

*End of RequirementsV1.md — Agent Desktop TPB Kiro Specification*
*Generated: 2026-03-04 | Evidence: 136 screenshots + 15 source files*
