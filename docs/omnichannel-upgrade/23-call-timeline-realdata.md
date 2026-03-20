# 23. Call Timeline Real Data — Thiết kế chi tiết

> **Mục tiêu:** Thay thế mock data trong CallTimeline bằng dữ liệu thực từ GoACD, hiển thị chi tiết toàn bộ flow cuộc gọi: IVR → DTMF → Queue → Scoring → Routing → Ringing → Answer → Hold/Mute/Transfer → End.
> **Ngày tạo:** 2026-03-20
> **Sprint:** 18 (link: [VOICE-IMPLEMENTATION-PLAN.md](./VOICE-IMPLEMENTATION-PLAN.md))
> **Tham chiếu:** [18-5-call-flows.md](./18-voice-platform/18-5-call-flows.md) | [18-11-event-pipeline.md](./18-voice-platform/18-11-event-pipeline.md)

---

## 1. Phân tích hiện trạng

### 1.1 Frontend — CallTimeline.tsx (424 dòng)

**Hiện tại:** 15 mock events hardcoded, component nhận duy nhất prop `totalDuration`.

```
Mock events: queue → ivr → queue → agent_assigned → ring → answer → recording →
hold → resume → dtmf → mute → unmute → conference → transfer → end
```

**UI đã có:** Timeline vertical, icon per type, expandable details, status colors (success/warning/error/info), summary stats. → **UI tốt, chỉ cần thay data source.**

### 1.2 Backend — GoACD Kafka Events

**Hiện tại publish 7 events:**

| Event | Topic | Data fields | Thiếu |
|---|---|---|---|
| call.routing | `call.routing` | callId, agentId, callerNumber, queue, ivrSelection, waitTimeMs, score | Không có chi tiết IVR flow |
| call.answered | `call.answered` | callId, agentId, callerNumber, waitTimeMs, direction | OK |
| call.agent_missed | `call.agent_missed` | callId, agentId, reason | OK |
| call.ended | `call.ended` | callId, agentId, direction | Thiếu hangupCause, talkTime, who hung up |
| agent.status_changed | `agent.status_changed` | agentId, oldStatus, newStatus, channel | OK nhưng không lưu vào timeline |
| cdr.created | `cdr.created` | Full CDR record | Không expose cho timeline |
| call.outbound.* | 4 topics | callId, agentId, destination, reason | OK |

**Thiếu hoàn toàn:** IVR start, IVR digit press, IVR menu selection, queue enter, queue position, agent scoring detail, ringing start/end.

### 1.3 Interaction Service — Event Storage

**Hiện tại `interaction_events` table lưu 3 loại:**

| Type | Data | Ghi chú |
|---|---|---|
| `created` | `{channel, direction}` | Khi call.routing tạo interaction |
| `status_changed` | `{status: "in-progress"}` | Khi call.answered |
| `status_changed` | `{status: "completed"}` | Khi call.ended |

**Thiếu:** Chi tiết IVR, queue, scoring, ringing, hold, mute, transfer.

### 1.4 Gap Summary

```
GoACD call lifecycle:    CALL_START → IVR → DTMF → QUEUE → SCORE → ROUTE → RING → BRIDGE → CONNECTED → END
                              ↓         ↓      ↓       ↓       ↓       ↓       ↓       ↓         ↓        ↓
Hiện tại publish:            ✗         ✗      ✗       ✗       ✗    routing    ✗    answered       ✗     ended
                                                                 (gộp hết)
Cần bổ sung:                 ✓         ✓      ✓       ✓       ✓    (tách)     ✓      (OK)        ✓    (bổ sung)
```

---

## 2. Event Schema — 15 Call Timeline Event Types

### 2.1 Kafka Topic mới: `call.timeline`

Tất cả timeline events publish vào **một topic duy nhất** `call.timeline` để đơn giản. Mỗi event có cấu trúc:

```json
{
  "callId": "uuid",
  "eventType": "ivr_started | ivr_digit | ivr_completed | queued | agent_scoring | routing | ringing | agent_missed | answered | hold | resume | mute | unmute | transfer_initiated | ended | call_started",
  "timestamp": "2026-03-20T07:15:49.804Z",
  "data": { /* type-specific fields */ }
}
```

### 2.2 Chi tiết từng Event Type

#### Inbound Call Flow Events (GoACD publish)

| # | eventType | Trigger Point | data fields | Ví dụ description (Vietnamese) |
|---|---|---|---|---|
| 1 | `call_started` | ESL outbound conn received | `{callerNumber, destNumber, direction}` | "Cuộc gọi đến từ 0914897989" |
| 2 | `ivr_started` | IVR.Run() called, after Answer | `{welcomeMessage: "tone_stream://..."}` | "Bắt đầu IVR — phát lời chào" |
| 3 | `ivr_digit` | IVR digit collected | `{digit: "1", menuLabel: "Sales", attempts: 1}` | "Khách bấm phím 1 → Sales" |
| 4 | `ivr_completed` | IVR.Run() returns | `{selectedQueue: "sales", durationMs: 4500}` | "IVR hoàn tất (4.5s) — chuyển hàng đợi Sales" |
| 5 | `queued` | queueMgr.Enqueue() | `{queue: "sales", position: 1}` | "Vào hàng đợi Sales — vị trí #1" |
| 6 | `agent_scoring` | scorer.ScoreAgents() returns | `{candidateCount: 3, topAgent: "AGT001", topScore: 85, scoringTimeMs: 12}` | "Tìm agent phù hợp — 3 ứng viên" |
| 7 | `routing` | ClaimAgent() success | `{agentId: "AGT001", agentName: "Agent Tùng", score: 85}` | "Phân phối đến Agent Tùng (AGT001)" |
| 8 | `ringing` | Bridge command sent | `{agentId: "AGT001"}` | "Đang đổ chuông AGT001..." |
| 9 | `agent_missed` | Bridge timeout/fail | `{agentId: "AGT001", reason: "no_answer", retryNext: true}` | "AGT001 không trả lời — thử agent tiếp theo" |
| 10 | `answered` | CHANNEL_BRIDGE event | `{agentId: "AGT001", waitTimeMs: 12340, ringDurationMs: 3200}` | "AGT001 trả lời — chờ 12s, đổ chuông 3s" |
| 11 | `ended` | CHANNEL_HANGUP event | `{hangupCause: "NORMAL_CLEARING", hangupBy: "customer", talkTimeMs: 22000, totalDurationMs: 38000}` | "Kết thúc — khách hàng cúp máy (nói chuyện 22s)" |

#### Agent Action Events (Frontend publish via CTI API → Kafka)

| # | eventType | Trigger | data fields | Ví dụ |
|---|---|---|---|---|
| 12 | `hold` | Agent click Hold | `{agentId: "AGT001"}` | "Agent đặt giữ cuộc gọi" |
| 13 | `resume` | Agent click Resume | `{agentId: "AGT001", holdDurationMs: 15000}` | "Agent tiếp tục cuộc gọi (giữ 15s)" |
| 14 | `mute` | Agent click Mute | `{agentId: "AGT001"}` | "Agent tắt mic" |
| 15 | `unmute` | Agent click Unmute | `{agentId: "AGT001", muteDurationMs: 8000}` | "Agent bật mic (tắt 8s)" |
| 16 | `transfer_initiated` | Agent transfer call | `{agentId: "AGT001", targetAgent: "SUP001", transferType: "blind"}` | "Chuyển cuộc gọi đến Supervisor Minh (blind)" |

---

## 3. Database Schema

### 3.1 Bảng `call_timeline_events` (mới, trong interaction_db)

```sql
CREATE TABLE call_timeline_events (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id       VARCHAR(255) NOT NULL,           -- GoACD call UUID
  interaction_id UUID REFERENCES interactions(id), -- link sau khi interaction tạo
  event_type    VARCHAR(50) NOT NULL,             -- ivr_started, queued, answered...
  timestamp     TIMESTAMPTZ NOT NULL,             -- thời điểm event xảy ra
  data          JSONB DEFAULT '{}',               -- type-specific payload
  created_at    TIMESTAMPTZ DEFAULT NOW(),

  -- Index cho query nhanh
  CONSTRAINT idx_call_timeline_callid_ts UNIQUE (call_id, event_type, timestamp)
);

CREATE INDEX idx_call_timeline_call_id ON call_timeline_events(call_id);
CREATE INDEX idx_call_timeline_interaction_id ON call_timeline_events(interaction_id);
```

**Tại sao bảng riêng (không dùng `interaction_events`)?**
- `interaction_events` dùng cho lifecycle chung (status changes, notes, assignments)
- `call_timeline_events` chuyên cho voice call flow chi tiết — có thể có 10-15 events/cuộc gọi
- Tách riêng để query hiệu quả + không ảnh hưởng interaction logic hiện tại

### 3.2 Link call_id ↔ interaction_id

- GoACD publish events với `callId` (FS UUID)
- Interaction Service tạo interaction với `metadata.callId`
- Khi nhận `call.timeline` event: lookup `interaction_id` từ `callId` trong metadata
- Nếu interaction chưa tạo (IVR events xảy ra trước routing): lưu với `interaction_id = NULL`, update sau

---

## 4. API Endpoint

### 4.1 GET `/api/v1/interactions/:id/call-timeline`

**Response:**
```json
{
  "interactionId": "2df0f5c4-...",
  "callId": "a78a8ac6-...",
  "events": [
    {
      "id": "uuid",
      "eventType": "call_started",
      "timestamp": "2026-03-20T00:26:30.000Z",
      "data": {"callerNumber": "0914897989", "destNumber": "19001234", "direction": "inbound"}
    },
    {
      "id": "uuid",
      "eventType": "ivr_started",
      "timestamp": "2026-03-20T00:26:30.500Z",
      "data": {"welcomeMessage": "tone_stream://..."}
    },
    {
      "id": "uuid",
      "eventType": "ivr_digit",
      "timestamp": "2026-03-20T00:26:34.200Z",
      "data": {"digit": "1", "menuLabel": "Sales", "attempts": 1}
    },
    ...
  ],
  "summary": {
    "totalDurationMs": 38000,
    "talkTimeMs": 22000,
    "waitTimeMs": 12340,
    "ivrTimeMs": 4500,
    "holdCount": 1,
    "holdTotalMs": 15000,
    "transferCount": 0,
    "missedAgentCount": 0
  }
}
```

### 4.2 WebSocket Event: `call:timeline_event`

Realtime push khi có event mới (cho active calls):

```json
{
  "callId": "a78a8ac6-...",
  "interactionId": "2df0f5c4-...",
  "event": {
    "eventType": "answered",
    "timestamp": "2026-03-20T00:26:42.000Z",
    "data": {"agentId": "AGT001", "waitTimeMs": 12340}
  }
}
```

---

## 5. Sequence Diagram — Inbound Call Timeline

```
Customer          FreeSWITCH       GoACD              Kafka           InteractionSvc      Frontend
   │                  │               │                  │                  │                │
   │──INVITE─────────→│               │                  │                  │                │
   │                  │──ESL conn────→│                  │                  │                │
   │                  │               │──call_started───→│                  │                │
   │                  │               │                  │                  │                │
   │                  │←──Answer──────│                  │                  │                │
   │                  │               │──ivr_started────→│                  │                │
   │                  │               │                  │                  │                │
   │──DTMF "1"──────→│               │                  │                  │                │
   │                  │──digit───────→│                  │                  │                │
   │                  │               │──ivr_digit──────→│                  │                │
   │                  │               │──ivr_completed──→│                  │                │
   │                  │               │                  │                  │                │
   │                  │               │──queued─────────→│                  │                │
   │                  │←──MOH────────│                  │                  │                │
   │                  │               │                  │                  │                │
   │                  │               │──agent_scoring──→│                  │                │
   │                  │               │──routing────────→│──────consume────→│                │
   │                  │               │                  │                  │──create intx──→│
   │                  │               │                  │                  │                │
   │                  │               │──ringing────────→│──────consume────→│──WS push──────→│
   │                  │←──Bridge─────│                  │                  │                │
   │                  │               │                  │                  │                │
   │                  │──BRIDGE_OK───→│                  │                  │                │
   │                  │               │──answered───────→│──────consume────→│──WS push──────→│
   │                  │               │                  │                  │                │
   │──BYE────────────→│               │                  │                  │                │
   │                  │──HANGUP──────→│                  │                  │                │
   │                  │               │──ended──────────→│──────consume────→│──WS push──────→│
```

---

## 6. GoACD Code Changes

### 6.1 File: `cmd/goacd/main.go` — handleInboundCall()

Thêm publish `call.timeline` events tại mỗi mốc:

```go
// Helper publish timeline event
pubTimeline := func(eventType string, data map[string]interface{}) {
    publisher.Publish(context.Background(), cfg.KafkaBrokers, "call.timeline", map[string]interface{}{
        "callId":    sess.UUID,
        "eventType": eventType,
        "timestamp": time.Now().UTC().Format(time.RFC3339Nano),
        "data":      data,
    }, sess.UUID)
}

// Phase 1: CALL_START
pubTimeline("call_started", map[string]interface{}{
    "callerNumber": sess.CallerNumber, "destNumber": sess.DestNumber, "direction": "inbound",
})

// Phase 2: IVR (trước và sau IVR.Run)
pubTimeline("ivr_started", map[string]interface{}{"welcomeMessage": ivrCfg.WelcomeFile})
// ... IVR.Run() ...
pubTimeline("ivr_completed", map[string]interface{}{
    "selectedQueue": selectedQueue, "durationMs": time.Since(ivrStart).Milliseconds(),
})

// Phase 3: Queue
pubTimeline("queued", map[string]interface{}{"queue": selectedQueue, "position": 1})

// Phase 4: Scoring
pubTimeline("agent_scoring", map[string]interface{}{
    "candidateCount": len(candidates), "topAgent": candidates[0].AgentID, "topScore": candidates[0].Score,
})

// Phase 5: Routing + Ringing
pubTimeline("routing", map[string]interface{}{"agentId": agentID, "score": candidate.Score})
pubTimeline("ringing", map[string]interface{}{"agentId": agentID})

// Phase 6: Answered
pubTimeline("answered", map[string]interface{}{
    "agentId": assignedAgent, "waitTimeMs": waitTimeMs, "ringDurationMs": ringDuration,
})

// Phase 7: Ended (in defer)
pubTimeline("ended", map[string]interface{}{
    "hangupCause": hangupCause, "talkTimeMs": talkTimeMs, "totalDurationMs": totalMs,
})
```

### 6.2 File: `internal/ivr/engine.go` — IVR digit event

Thêm callback để publish digit event:

```go
type SimpleIVR struct {
    // ... existing fields ...
    OnDigit func(digit string, menuLabel string, attempts int) // NEW: callback khi collect digit
}
```

### 6.3 File: `internal/call/outbound.go` — Outbound timeline

Tương tự, publish timeline events cho outbound flow:
- `call_started` (direction: outbound)
- `ringing` (customer ringing)
- `answered` (customer answer)
- `ended`

---

## 7. Interaction Service Changes

### 7.1 New Entity: `CallTimelineEvent`

```typescript
@Entity('call_timeline_events')
export class CallTimelineEvent {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() callId: string;
  @Column({ nullable: true }) interactionId: string;
  @Column() eventType: string;
  @Column({ type: 'timestamptz' }) timestamp: Date;
  @Column({ type: 'jsonb', default: {} }) data: Record<string, unknown>;
  @CreateDateColumn() createdAt: Date;
}
```

### 7.2 New Consumer: `CallTimelineConsumerService`

```typescript
// Subscribe to 'call.timeline' topic
// On each event:
//   1. Lookup interactionId from callId (interactions.metadata->>'callId')
//   2. Save CallTimelineEvent
//   3. Forward to frontend via WS: 'call:timeline_event'
```

### 7.3 New Controller Endpoint

```typescript
@Get('interactions/:id/call-timeline')
async getCallTimeline(@Param('id') interactionId: string) {
  // 1. Get interaction → extract callId from metadata
  // 2. Query call_timeline_events by callId ORDER BY timestamp
  // 3. Compute summary (totalDuration, talkTime, holdCount, etc.)
  // 4. Return {events, summary}
}
```

---

## 8. Frontend Changes

### 8.1 CallTimeline.tsx — Props thay đổi

```typescript
// TRƯỚC (mock data)
interface CallTimelineProps {
  totalDuration?: string;
}

// SAU (real data)
interface CallTimelineProps {
  interactionId: string;
  callId?: string;
  isLive?: boolean;  // true = active call, listen WS for new events
}
```

### 8.2 Data Fetching

```typescript
// Fetch historical events
const { data } = useQuery({
  queryKey: ['call-timeline', interactionId],
  queryFn: () => apiClient.get(`/api/v1/interactions/${interactionId}/call-timeline`),
  enabled: !!interactionId,
});

// Live events via WebSocket (for active calls)
useCallEvents({
  onTimelineEvent: (event) => {
    if (event.callId === callId) {
      queryClient.invalidateQueries(['call-timeline', interactionId]);
    }
  },
}, agentId);
```

### 8.3 Event Type → UI Mapping

```typescript
const EVENT_CONFIG: Record<string, {icon: ReactNode, label: string, status: string}> = {
  call_started:    { icon: <PhoneIncoming/>,  label: 'Cuộc gọi đến',           status: 'info' },
  ivr_started:     { icon: <Menu/>,           label: 'Bắt đầu IVR',            status: 'info' },
  ivr_digit:       { icon: <Hash/>,           label: 'Khách bấm phím',         status: 'info' },
  ivr_completed:   { icon: <CheckCircle/>,    label: 'IVR hoàn tất',           status: 'success' },
  queued:          { icon: <Clock/>,          label: 'Vào hàng đợi',           status: 'info' },
  agent_scoring:   { icon: <Users/>,          label: 'Tìm agent phù hợp',     status: 'info' },
  routing:         { icon: <ArrowRight/>,     label: 'Phân phối đến agent',    status: 'info' },
  ringing:         { icon: <Bell/>,           label: 'Đang đổ chuông',         status: 'warning' },
  agent_missed:    { icon: <PhoneMissed/>,    label: 'Agent không trả lời',    status: 'error' },
  answered:        { icon: <PhoneForwarded/>, label: 'Agent trả lời',          status: 'success' },
  hold:            { icon: <Pause/>,          label: 'Đặt giữ cuộc gọi',      status: 'warning' },
  resume:          { icon: <Play/>,           label: 'Tiếp tục cuộc gọi',     status: 'success' },
  mute:            { icon: <MicOff/>,         label: 'Tắt mic',               status: 'warning' },
  unmute:          { icon: <Mic/>,            label: 'Bật mic',               status: 'info' },
  transfer_initiated: { icon: <PhoneForwarded/>, label: 'Chuyển cuộc gọi',   status: 'info' },
  ended:           { icon: <PhoneOff/>,       label: 'Kết thúc cuộc gọi',     status: 'error' },
};
```

---

## 9. Sprint 18 Breakdown

Xem chi tiết trong [VOICE-IMPLEMENTATION-PLAN.md](./VOICE-IMPLEMENTATION-PLAN.md) Sprint 18.
