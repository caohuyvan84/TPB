# 22. Outbound Call — Chi tiết thiết kế & triển khai

> **Ngày tạo:** 2026-03-19
> **Tham chiếu:** [VOICE-IMPLEMENTATION-PLAN.md](./VOICE-IMPLEMENTATION-PLAN.md) Sprint 13 | [18-5-call-flows.md](./18-voice-platform/18-5-call-flows.md) §18.5.3 | [21-goacd-gap-analysis.md](./21-goacd-gap-analysis.md) §C

---

## 1. Vấn đề hiện tại

### 1.1 Luồng outbound hiện tại (2-leg originate + bridge)

```
Agent bấm gọi → GoACD MakeCall
  → Step 1: Claim agent (originating, SREM from available:voice)
  → Step 2: Originate AGENT extension (sofia/internal/AGT001@domain) → &park()
             Agent nhận SIP INVITE → auto-accept → ngồi chờ (im lặng, không ringback)
  → Step 3: Đợi agent answer (30s)
  → Step 4: Originate CUSTOMER (sofia/gateway/pstn/0914897989) → &park()
  → Step 5: Đợi customer answer (60s)
  → Step 6: uuid_bridge(agent_leg, customer_leg) → connected
```

### 1.2 Các vấn đề chưa giải quyết

| # | Vấn đề | Mô tả |
|---|---|---|
| **O1** | **Agent không nghe ringback tone** | Sau auto-accept (step 2), agent ngồi im lặng trong khi chờ customer nhấc máy. Không biết customer có đang ringing không |
| **O2** | **Agent không biết customer busy/no-answer** | Khi customer reject hoặc busy, GoACD chỉ biết "uuid không tồn tại" → error chung, không phân biệt busy/no-answer/wrong-number |
| **O3** | **FreeSWITCH chưa có PSTN gateway** | `sofia/gateway/pstn/` chưa config → originate customer sẽ fail |
| **O4** | **Kamailio chưa route outbound PSTN** | Kamailio chỉ dispatch tới FS pool, chưa có route riêng cho số bắt đầu bằng `0` |
| **O5** | **CDR duration tính sai** | `AnsweredAt` được set khi bridge thành công, nhưng `StartedAt` là lúc agent click gọi → CDR ghi thời gian chờ + nói chuyện gộp lại |
| **O6** | **Call history ghi sai direction** | GoACD originate agent extension (inbound INVITE tới agent) nhưng thực tế là outbound call → interaction cần ghi `direction: outbound` |
| **O7** | **Frontend không hiển thị call status chi tiết** | Softphone chỉ hiện "Đang kết nối..." → không cho agent biết đang ring customer, customer busy, hay network error |

---

## 2. Thiết kế mới — Single Originate + HTTP-First

### 2.1 Nguyên tắc thiết kế

| Nguyên tắc | Giải pháp |
|---|---|
| **Frontend update nhanh** | HTTP response trả status ngay (0ms), KHÔNG đợi Kafka chain (~500ms) |
| **Ít originate** | Single originate với `&bridge()` inline — FS tự quản lý cả 2 leg |
| **Ringback thật** | Agent nghe early media từ telco (ringback tone thật, không synthetic) |
| **Status chính xác** | GoACD đọc `hangup_cause` + `sip_term_status` từ FS → map → trả qua HTTP + Kafka |
| **Agent-scoped events** | Kafka events chỉ gửi đúng agent qua Socket.IO room (§4) |

### 2.2 Luồng outbound mới (single originate + inline bridge)

```
Agent bấm gọi 0914897989 trên Softphone
  │
  │ ══════════════ PHASE 1: Initiate (HTTP synchronous) ══════════════
  │
  ├→ [1] Frontend: POST /api/v1/cti/calls/make {agentId, destination}
  │      → Softphone cập nhật UI ngay: "Đang kết nối..." (từ HTTP call, không đợi event)
  │
  ├→ [2] CTI Adapter → GoACD HTTP /rpc/MakeCall
  │
  ├→ [3] GoACD:
  │      a. ClaimAgentOutbound → originating, SREM available:voice
  │      b. Tạo Session {direction: outbound, startedAt: NOW()}
  │      c. HTTP Response ngay: {status: "initiating", callId, agentId}
  │         → Frontend nhận response ~200ms sau click
  │         → Softphone: "Đang gọi 0914897989..."
  │
  │ ══════════════ PHASE 2: Originate (async, background goroutine) ══════════════
  │
  │  [4] GoACD goroutine: Single originate agent → bridge customer inline
  │
  │      bgapi originate {
  │        origination_uuid=<agentLegUUID>,
  │        origination_caller_id_number=<agent_cli>,
  │        sip_h_X-Call-Direction=outbound,
  │        sip_h_X-GoACD-CallId=<callId>,
  │        sip_h_X-Destination=0914897989,
  │        ignore_early_media=false
  │      }sofia/internal/AGT001@nextgen.omicx.vn
  │        &bridge(sofia/gateway/pstn_trunk/0914897989)
  │
  │      → FreeSWITCH:
  │        Step A: SIP INVITE → Kamailio → SIP.js (agent nhận call)
  │        Step B: SIP.js auto-accept (X-Call-Direction=outbound)
  │        Step C: FS nhận 200 OK từ agent → bắt đầu bridge tới customer
  │        Step D: FS gửi INVITE → gateway/pstn_trunk → Telco
  │        Step E: Telco trả 180/183 Ringing + early media (ringback tone)
  │        Step F: FS forward early media → agent (agent NGHE ringback tone thật)
  │        Step G: Customer nhấc máy → 200 OK → full media bridge
  │
  │  [5] GoACD monitor goroutine:
  │      → Poll uuid_exists(agentLegUUID) mỗi 500ms
  │      → Khi agent_leg biến mất = call ended hoặc failed
  │      → Đọc channel variables:
  │        - hangup_cause (NORMAL_CLEARING, USER_BUSY, NO_ANSWER, ...)
  │        - sip_term_status (200, 486, 408, 404, ...)
  │        - bridge_hangup_cause (nếu bridge failed)
  │        - billsec (thời gian nói thực)
  │        - duration (tổng thời gian)
  │        - progress_media_time (khi nhận early media = customer ringing)
  │
  │ ══════════════ PHASE 3: State updates (Kafka → Socket.IO) ══════════════
  │
  │  [6] GoACD publish events khi phát hiện state change:
  │
  │      a. Agent connected (uuid exists + answer_state=answered):
  │         → Kafka: call.outbound.agent_ready {callId, agentId}
  │
  │      b. Customer ringing (detect via progress_media_time > 0):
  │         → Kafka: call.outbound.ringing {callId, agentId, destination}
  │         → Frontend: "Đang đổ chuông 0914897989..." (150-650ms sau actual ringing)
  │
  │      c. Customer answered (detect via billsec > 0 HOẶC bridge complete):
  │         → connectedAt = NOW()
  │         → Kafka: call.answered {callId, agentId, destination, direction: outbound}
  │         → Frontend: "Đang kết nối 00:00" → timer start
  │
  │      d. Call failed (uuid biến mất + hangup_cause != NORMAL_CLEARING):
  │         → Map hangup_cause → reason (xem §2.3)
  │         → Kafka: call.outbound.failed {callId, agentId, reason, hangupCause, sipCode}
  │         → Frontend: hiện reason ("Máy bận" / "Không nghe máy" / ...) → auto-close 5s
  │         → Release agent → ready
  │
  │      e. Call ended normally:
  │         → CDR: talkTime = billsec (từ FS), waitTime = startedAt→connectedAt
  │         → Kafka: cdr.created + call.ended
  │         → Release agent → acw
```

### 2.3 So sánh thiết kế cũ vs mới

| Khía cạnh | Cũ (2-leg originate) | Mới (single originate + bridge) |
|---|---|---|
| **Số lần originate** | 2 (agent + customer riêng) | 1 (agent + bridge inline) |
| **Delay click → customer ring** | ~1.5-3s (originate agent → poll → originate customer) | ~200-500ms (1 originate, FS bridge ngay) |
| **Ringback tone** | Synthetic tone (giả) | Early media từ telco (thật) |
| **Frontend update đầu tiên** | Đợi Kafka event (~500ms) | HTTP response ngay (~200ms) |
| **Agent nghe gì khi chờ** | Im lặng (park) → synthetic tone | Ringback tone thật từ telco |
| **Hangup cause detection** | Poll uuid_exists (biết/không biết) | Đọc channel vars (chi tiết: busy/no-answer/...) |
| **CDR talkTime** | Tính từ bridge thành công | Lấy `billsec` từ FS (chính xác) |
| **Complexity** | Cao (2 originate, poll 2 UUID) | Thấp hơn (1 originate, poll 1 UUID) |

### 2.4 Ưu điểm single originate

1. **Agent nghe ringback thật:** FS forward early media (183) từ telco → agent nghe ringback tone thật qua WebRTC, không cần synthetic tone
2. **Nhanh hơn ~1-2s:** Chỉ 1 originate, FS tự bridge → customer bắt đầu ringing nhanh hơn
3. **Hangup cause chính xác:** Khi originate fail hoặc bridge fail, FS lưu `hangup_cause` + `sip_term_status` trong channel vars → GoACD đọc được
4. **CDR chính xác:** `billsec` từ FS = thời gian nói thực. `duration` = tổng thời gian call
5. **Ít code hơn:** Không cần poll 2 UUID, không cần 2 originate commands
6. **MakeCall HTTP trả ngay:** GoACD claim + start goroutine → HTTP 200 ngay → Frontend update instant

### 2.5 Phương án ringback (đã giải quyết)

**Không cần synthetic ringback nữa.** Single originate với `&bridge()` → FS forward early media → agent nghe ringback thật.

Cơ chế: `ignore_early_media=false` (mặc định) → khi telco trả 183 + SDP → FS thiết lập early media path → audio (ringback tone) forward tới agent leg → agent nghe ringback qua WebRTC.

### 2.3 Mapping SIP response → User-facing status

| SIP Code | FS Hangup Cause | Kafka Event | Frontend hiển thị (Tiếng Việt) |
|---|---|---|---|
| 100 Trying | — | `call.outbound.trying` | "Đang kết nối..." |
| 180/183 Ringing | — | `call.outbound.ringing` | "Đang đổ chuông..." + ringback tone |
| 200 OK | — | `call.answered` | "Đang kết nối 00:00" |
| 408 Timeout | `NO_ANSWER` | `call.outbound.failed` | "Không nghe máy" |
| 480 Unavailable | `NO_USER_RESPONSE` | `call.outbound.failed` | "Không liên lạc được" |
| 486 Busy | `USER_BUSY` | `call.outbound.failed` | "Máy bận" |
| 487 Cancelled | `ORIGINATOR_CANCEL` | `call.outbound.cancelled` | "Đã huỷ" |
| 404 Not Found | `UNALLOCATED_NUMBER` | `call.outbound.failed` | "Số không tồn tại" |
| 603 Decline | `CALL_REJECTED` | `call.outbound.failed` | "Từ chối cuộc gọi" |
| 503 Unavailable | `NETWORK_OUT_OF_ORDER` | `call.outbound.failed` | "Lỗi mạng" |

### 2.4 CDR cho outbound call

```json
{
  "callId": "out-AGT001-1773928511497",
  "direction": "outbound",
  "callerNumber": "AGT001",          // Agent extension
  "destNumber": "0914897989",         // Customer PSTN number
  "assignedAgent": "AGT001",
  "startedAt": "2026-03-19T14:00:00Z",    // Khi agent click gọi
  "ringStartedAt": "2026-03-19T14:00:05Z", // Khi customer bắt đầu ringing
  "connectedAt": "2026-03-19T14:00:15Z",   // Khi customer nhấc máy
  "endedAt": "2026-03-19T14:05:15Z",       // Khi cuộc gọi kết thúc
  "durationMs": 315000,                     // Tổng thời gian (5 phút 15 giây)
  "talkTimeMs": 300000,                     // Thời gian nói (5 phút, từ connected đến ended)
  "waitTimeMs": 15000,                      // Thời gian chờ (15 giây, từ start đến connected)
  "ringTimeMs": 10000,                      // Thời gian đổ chuông (10 giây)
  "hangupCause": "NORMAL_CLEARING",
  "hangupParty": "agent",                   // Ai hangup: "agent" hoặc "customer"
  "sipResponseCode": 200
}
```

### 2.5 Kamailio outbound routing cho số Vietnam

```cfg
# Thêm vào request_route trong kamailio.cfg

# Outbound PSTN: số bắt đầu bằng 0 (Vietnam mobile/landline)
if (is_method("INVITE") && $rU =~ "^0[0-9]{8,10}$") {
    # Route qua FreeSWITCH dispatcher (FS sẽ dùng gateway/trunk)
    xlog("L_INFO", "Outbound PSTN call: $rU from $fU\n");

    # rtpengine for media transcoding
    if (isflagset(5)) {
        rtpengine_manage("replace-origin replace-session-connection ICE=remove RTP/AVP");
    }

    if (!ds_select_dst(FS_POOL_SETID, 4)) {
        send_reply("503", "No FreeSWITCH available");
        exit;
    }
    route(RELAY);
}
```

### 2.6 FreeSWITCH PSTN gateway config

```xml
<!-- /etc/freeswitch/sip_profiles/external/kamailio_trunk.xml -->
<!-- Route outbound calls via Kamailio (Kamailio handles trunk selection) -->
<gateway name="kamailio_trunk">
  <param name="realm" value="nextgen.omicx.vn"/>
  <param name="proxy" value="157.66.80.51:5060"/>
  <param name="register" value="false"/>
  <param name="caller-id-in-from" value="true"/>
</gateway>
```

**Hoặc** nếu có SIP trunk trực tiếp:
```xml
<!-- /etc/freeswitch/sip_profiles/external/pstn_trunk.xml -->
<gateway name="pstn_direct">
  <param name="realm" value="sip-trunk.telco.vn"/>
  <param name="username" value="tpbank_trunk"/>
  <param name="password" value="TRUNK_SECRET"/>
  <param name="proxy" value="sip-trunk.telco.vn:5060"/>
  <param name="register" value="true"/>
  <param name="caller-id-in-from" value="true"/>
</gateway>
```

### 2.7 GoACD outbound.go — Thiết kế mới (single originate)

```go
func MakeCall(ctx, agentID, destination) (*Session, error):
  // SYNCHRONOUS (trong HTTP handler):
  [1] ClaimAgentOutbound → originating
  [2] Create Session {direction: outbound, startedAt: NOW()}
  [3] Return HTTP 200 {status: "initiating", callId}  ← Frontend update ngay

  // ASYNC (goroutine):
  [4] bgapi originate sofia/internal/{agent}@{domain}
        &bridge(sofia/gateway/{pstn}/{destination})
      → FS handle cả agent invite + customer bridge
  [5] Start monitor goroutine: poll agent_leg UUID mỗi 500ms
      → Detect state changes via channel variables:
        - answer_state: "answered" → agent accepted
        - progress_media_time > 0 → customer ringing (early media)
        - billsec > 0 → customer answered
        - uuid biến mất → call ended/failed
  [6] Đọc FS channel variables khi call kết thúc:
        hangup_cause, sip_term_status, billsec, duration
      → Map → CDR + Kafka events
```

**Key FS channel variables để đọc:**
```
uuid_getvar <uuid> hangup_cause     → NORMAL_CLEARING, USER_BUSY, NO_ANSWER, ...
uuid_getvar <uuid> sip_term_status  → 200, 486, 408, 404, 503, ...
uuid_getvar <uuid> billsec          → seconds of actual talk time
uuid_getvar <uuid> duration         → total seconds including ring
uuid_getvar <uuid> progress_media_time → epoch khi nhận early media (ringing)
uuid_getvar <uuid> bridge_hangup_cause → cause from bridged leg
```

**Originate dial string mới:**
```
bgapi originate {
  origination_uuid=<uuid>,
  origination_caller_id_number=<agent_cli>,
  origination_caller_id_name=<agent_name>,
  sip_h_X-Call-Direction=outbound,
  sip_h_X-GoACD-CallId=<callId>,
  sip_h_X-Destination=<destination>,
  ignore_early_media=false,
  call_timeout=60
}sofia/internal/<agentId>@<domain> &bridge(sofia/gateway/<pstn>/<destination>)
```

### 2.8 Frontend — 2 kênh cập nhật trạng thái

| Kênh | Delay | Dùng cho |
|---|---|---|
| **HTTP Response** | ~200ms | Trạng thái đầu tiên: "Đang kết nối..." (ngay khi agent click) |
| **Kafka → Socket.IO** | ~150-650ms | Trạng thái tiếp theo: ringing, connected, failed (sau HTTP) |

```
Frontend flow:

[Click gọi]
  → POST /cti/calls/make → HTTP 200 {callId, status: "initiating"}
  → Softphone UI: "Đang gọi 0914897989..." (ngay, từ HTTP response)

[~1s sau] WS event call.outbound.agent_ready
  → (internal, không đổi UI — agent đã connected to FS)

[~2s sau] WS event call.outbound.ringing
  → Softphone UI: "Đang đổ chuông..." + ringing animation
  → Agent NGHE ringback tone thật qua WebRTC (early media từ telco)

[Customer nhấc] WS event call.answered
  → Softphone UI: "Đang kết nối 00:00" → timer start
  → Agent nghe customer nói

[Call failed] WS event call.outbound.failed {reason: "busy"}
  → Softphone UI: "Máy bận" → auto-close 5s
  → Agent đã nghe busy tone từ telco trước khi event đến
```

**Lưu ý quan trọng:** Với single originate + early media, agent nghe trạng thái cuộc gọi qua AUDIO (ringback/busy tone) TRƯỚC khi Kafka event đến Frontend. Kafka events chỉ cập nhật UI text, không phải audio.

---

## 3. Interaction & Call History

### 3.1 Tạo Interaction cho outbound call

GoACD tạo interaction qua Kafka khi outbound call initiated:

```json
// Kafka: interaction.created
{
  "type": "call",
  "channel": "voice",
  "direction": "outbound",
  "status": "in-progress",
  "customerName": "", // lookup từ customer DB nếu có
  "assignedAgentId": "AGT001",
  "assignedAgentName": "Agent Tung",
  "subject": "Cuộc gọi ra - 0914897989",
  "source": "click-to-call",
  "metadata": {
    "callerNumber": "AGT001",
    "destNumber": "0914897989",
    "callId": "out-AGT001-1773928511497",
    "direction": "outbound"
  }
}
```

### 3.2 Update interaction khi call kết thúc

```json
// Kafka: interaction.closed
{
  "interactionId": "...",
  "status": "completed",
  "metadata": {
    "callDuration": 315,
    "talkTime": 300,
    "hangupCause": "NORMAL_CLEARING",
    "recordingUrl": "/recordings/out-AGT001-xxx.wav"
  }
}
```

---

## 4. Event Delivery — Agent-Scoped Routing (FIX CRITICAL)

### 4.1 Vấn đề hiện tại

**TẤT CẢ call events đang BROADCAST tới MỌI agent** — không phân biệt agent nào đang thực hiện cuộc gọi.

```
Hiện tại (BROKEN):
  GoACD publish call.outbound.ringing {agentId: AGT001, dest: 0914897989}
    → Kafka → CTI Adapter → server.emit() → TẤT CẢ agents nhận event
    → Agent002, Agent003... đều thấy thông tin cuộc gọi của Agent001
```

**Rủi ro:**
- Lộ số điện thoại khách hàng (PII) cho agent khác
- Agent khác thấy trạng thái cuộc gọi không phải của mình
- Softphone agent khác có thể hiển thị sai thông tin

### 4.2 Giải pháp — Socket.IO Room-Based Routing

```
Fix:
  [1] Frontend connect /cti namespace → join room "agent:{agentId}"
  [2] CTI Adapter: extract agentId từ event data
  [3] CTI Adapter: dùng sendToAgent(agentId, event, data) thay vì broadcastCallEvent()
  [4] Chỉ agent đúng nhận event

Luồng mới:
  GoACD publish {agentId: AGT001, ...}
    → Kafka → CTI Adapter
      → server.to("agent:AGT001").emit(event, data)  ← CHỈ gửi cho AGT001
      → Agent002/003 KHÔNG nhận event
```

### 4.3 Implementation

**CtiEventsGateway (Socket.IO server):**
```typescript
handleConnection(client: Socket) {
  const token = client.handshake.auth?.token;
  // Extract agentId from JWT hoặc từ client query
  const agentId = client.handshake.query?.agentId;
  if (agentId) {
    client.join(`agent:${agentId}`);
    this.logger.log(`Agent ${agentId} joined room`);
  }
}
```

**CdrConsumerService (event routing):**
```typescript
// THAY: this.ctiEvents.broadcastCallEvent(wsEvent, data);
// BẰNG:
const agentId = data['agentId'] as string;
if (agentId) {
  this.ctiEvents.sendToAgent(agentId, wsEvent, data);
} else {
  this.ctiEvents.broadcastCallEvent(wsEvent, data); // fallback cho events không có agentId
}
```

**Frontend useCallEvents (join room):**
```typescript
const socket = io(`${wsUrl}/cti`, {
  transports: ['websocket'],
  query: { agentId: user.agentId }, // pass agentId khi connect
});
```

### 4.4 Events cần agent-scoped routing

| Event | Có agentId? | Routing |
|---|---|---|
| `call.outbound.initiated` | ✅ agentId | `sendToAgent` |
| `call.outbound.ringing` | ✅ agentId | `sendToAgent` |
| `call.outbound.agent_answer` | ✅ agentId | `sendToAgent` |
| `call.answered` | ✅ agentId | `sendToAgent` |
| `call.outbound.failed` | ✅ agentId | `sendToAgent` |
| `call.ended` | ✅ agentId | `sendToAgent` |
| `call.routing` (inbound) | ✅ agentId | `sendToAgent` |
| `agent.status_changed` | ✅ agentId | `sendToAgent` |
| `cdr.created` | ✅ assignedAgent | `sendToAgent` |
| `call.agent_missed` | ✅ agentId | `sendToAgent` |

## 5. Tasks Sprint 13

Xem [VOICE-IMPLEMENTATION-PLAN.md](./VOICE-IMPLEMENTATION-PLAN.md) Sprint 13.

---

## Related Files

- [18-5-call-flows.md](./18-voice-platform/18-5-call-flows.md) — Call flow designs (§18.5.3 outbound)
- [18-2a-kamailio-config.md](./18-voice-platform/18-2a-kamailio-config.md) — Kamailio routing config
- [18-2c-freeswitch-config.md](./18-voice-platform/18-2c-freeswitch-config.md) — FreeSWITCH gateway config
- [21-goacd-gap-analysis.md](./21-goacd-gap-analysis.md) — Gap analysis §C (outbound)
- [VOICE-IMPLEMENTATION-PLAN.md](./VOICE-IMPLEMENTATION-PLAN.md) — Sprint 13 tasks
