# 21. GoACD Gap Analysis — Design vs Implementation

> **Ngày phân tích:** 2026-03-19
> **So sánh:** Tài liệu thiết kế (§18.4–18.10) vs Code thực tế (`services/goacd/`, `apps/agent-desktop/src/`, `services/cti-adapter-service/`)
> **Tham chiếu:** [INDEX.md](./INDEX.md) | [18-voice-platform/README.md](./18-voice-platform/README.md) | [VOICE-IMPLEMENTATION-PLAN.md](./VOICE-IMPLEMENTATION-PLAN.md)

---

## Tổng quan

| Khu vực | Design | Code | Gap Level |
|---|---|---|---|
| A. SIP Registration & Auth | Ephemeral HMAC tokens | Open registration (no auth) | **OK cho MVP** |
| B. Inbound Call Flow | 10-step flow with scoring + re-route | Basic flow, no scoring, no re-route | **HIGH** |
| C. Outbound Call Flow | Atomic claim → originate → bridge | Claim + originate, **thiếu bridge về agent** | **CRITICAL** |
| D. Transfer Flow | Blind + Attended + Queue + Cross-FS | Blind + Attended (basic), thiếu state mgmt | **HIGH** |
| E. Agent State Machine | 6 states, Lua scripts, stale reaper | 2 scripts (claim/release), no originating state | **MEDIUM** |
| F. Event Pipeline | call.routing + metadata push trước INVITE | Chỉ CDR publish sau khi call kết thúc | **HIGH** |
| G. Credential Provisioning | 8 fields + token refresh | 4 fields, no token refresh | **OK cho MVP** |

---

## A. SIP Registration & Auth

### Design (§18.10 V2.2)

```json
{
  "authorizationUser": "1710500300:1007",  // <expiry>:<extension>
  "password": "a3F5dWJhbmsrY...",          // HMAC-SHA1 token
  "tokenExpiresAt": 1710500300
}
```
- Kamailio validate HMAC digest trên mỗi REGISTER
- Token refresh mỗi 25s qua WebSocket
- SIP re-REGISTER mỗi 30s

### Code thực tế

- Kamailio **KHÔNG load `auth.so`** → accept tất cả REGISTER → 200 OK
- `WebRtcService` dùng `authorizationPassword: ''` (empty)
- `GetSIPCredentials` trả `sipUri`, `wsUri`, `domain`, `iceServers` — không có `password`/`authorizationUser`
- Re-REGISTER mỗi 300s (5 phút), refresh credentials mỗi 4 phút

### Đánh giá: OK CHO MVP

Kamailio open registration hoạt động trên internal network. Khi chuyển production:
- Bật `auth.so` + `auth_db.so` trong Kamailio
- GoACD generate HMAC-SHA1 SIP password
- Frontend truyền `authorizationUsername` + `authorizationPassword`
- Giảm re-REGISTER xuống 30s

### Gap cần fix cho production (không blocking MVP)

| # | Gap | Effort |
|---|---|---|
| A1 | GoACD: thêm `authorizationUser`, `password`, `tokenExpiresAt`, `displayName`, `extension` vào GetSIPCredentials response | 1d |
| A2 | Kamailio: load `auth.so`, validate HMAC digest | 0.5d |
| A3 | Frontend: truyền `authorizationUsername`/`authorizationPassword` từ credentials | 0.5d |
| A4 | GoACD: push token refresh mỗi 25s qua Kafka → CTI Adapter → WebSocket → Frontend | 2d |
| A5 | Frontend: giảm re-REGISTER 300s → 30s, handle token refresh event | 0.5d |
| A6 | Frontend: ICE restart on network change (`navigator.connection` API) | 0.5d |

---

## B. Inbound Call Flow

### Design (§18.5.1) — 10 bước

```
[1] PSTN → Kamailio → FreeSWITCH → ESL outbound → GoACD
[2] Lookup DID → IVR flow
[3] IVR: answer → welcome → DTMF menu
[4] IVR result → routing hints (queue, skills, priority)
[5] Queue entry: ZADD sorted set
[6] Agent scoring: skill(40) × capacity(20) × idle(20) × group(10) × random(10)
[7] Atomic claim: validateAndClaim(agent, voice)
[8] *** PUBLISH call.routing event + push metadata to Agent Desktop BEFORE bridge ***
[9] Bridge to agent extension
[10a] Answer → recording, on-call state
[10b] No-answer (20s) → re-route next candidate (top-3)
[11] Call end → CDR, release agent
```

### Code thực tế (`main.go:handleInboundCall`)

```
[1] ✅ ESL outbound server nhận call
[2] ✅ IVR: answer → welcome → DTMF → map to queue
[3] ✅ Queue enqueue: ZADD
[4] ❌ NO SCORING — poll loop GetAvailableAgents → try first available
[5] ✅ Atomic claim (ClaimAgent Lua script)
[6] ❌ NO call.routing event, NO metadata push trước bridge
[7] ✅ Bridge to agent extension (sofia/internal/{ext}@{domain})
[8] ❌ NO re-route on no-answer — nếu bridge fail → hangup caller
[9] ✅ CDR publish khi call kết thúc
```

### Gaps

| # | Gap | Mức độ | Ảnh hưởng | Fix |
|---|---|---|---|---|
| **B1** | **Không có agent scoring** — lấy random agent đầu tiên trong available set | HIGH | Routing không intelligent, agent có skill match thấp vẫn nhận call | Implement 5-factor scoring (§7.2) |
| **B2** | **Không re-route khi agent no-answer** — bridge fail → caller bị hangup | HIGH | Caller mất cuộc gọi nếu agent đầu tiên không trả lời | Implement retry loop: try top-3 candidates, 20s timeout mỗi agent |
| **B3** | **Không push call metadata trước SIP INVITE** — Agent Desktop nhận INVITE nhưng không biết ai gọi | HIGH | Agent thấy "Unknown" khi có cuộc gọi đến | Publish Kafka `call.routing` + push metadata qua CTI WS trước bridge |
| **B4** | **Không publish call.answered event** | MEDIUM | Dashboard không có real-time metrics | Thêm Kafka publish khi bridge thành công |

---

## C. Outbound Call Flow — **CRITICAL GAP**

### Design (§18.5.3)

```
[1] Agent click → GoACD MakeCall(agentId, destination)
[2] Atomic claim: outbound_claim.lua → set originating
[3] Originate call TO CUSTOMER qua FreeSWITCH
[4] Customer answers → BRIDGE agent extension ↔ customer
[5] Call connected → recording, on-call state
[6] Customer/agent no-answer → outbound_release.lua → ready
```

### Code thực tế (`outbound.go:MakeCall`)

```go
// Step 1: Claim agent ✅
claimed := agentState.ClaimAgent(ctx, agentID, interactionID, "voice")

// Step 2: Originate — ⚠️ WRONG TARGET
originateStr := fmt.Sprintf(
    "{...}sofia/internal/%s@%s",  // originate TO DESTINATION via FS
    destination, m.sipDomain,      // nhưng caller_id_number = agentID
)
client.Originate(originateStr, agentID, "default", destination)

// Step 3: Mark connected — ❌ NO BRIDGE BACK TO AGENT
sess.State = "connected"  // chỉ set state, không bridge
```

### CRITICAL: Originate gọi tới destination nhưng KHÔNG bridge về agent

Luồng hiện tại:
```
Agent click → GoACD → FS originate → PSTN ring destination
                                       → Customer nhấc máy
                                       → ??? Audio đi đâu? KHÔNG bridge về agent
```

Luồng đúng (theo design):
```
Agent click → GoACD → FS originate → PSTN ring destination
                                       → Customer nhấc máy
                                       → FS bridge(customer_leg, agent_extension)
                                       → Agent nghe customer qua WebRTC
```

### TẠCH THÊM: SIP.js outbound flow khác GoACD flow

Frontend hiện tại (`useCallControl.dial()` → `WebRtcService.makeCall()`):
```
Agent click → SIP.js INVITE → Kamailio → FreeSWITCH
                                            → ??? Đây là INVITE tới destination
                                            → Không qua GoACD chút nào!
```

**Có 2 con đường outbound đang conflict:**
1. **Frontend SIP.js trực tiếp** → Kamailio → FS (KHÔNG qua GoACD, KHÔNG có CDR, KHÔNG có state management)
2. **GoACD MakeCall** → FS originate (KHÔNG bridge về agent)

### Gaps

| # | Gap | Mức độ | Fix |
|---|---|---|---|
| **C1** | **Outbound call KHÔNG bridge về agent** — customer nhấc máy nhưng agent không nghe gì | CRITICAL | Thêm bridge logic: originate with `{origination_uuid}`, bridge agent ext ↔ customer leg |
| **C2** | **2 outbound paths conflict** — SIP.js direct vs GoACD MakeCall | CRITICAL | Quyết định 1 path: (a) SIP.js direct (simple, no GoACD) hoặc (b) GoACD MakeCall (full tracking) |
| **C3** | **Thiếu outbound_release khi customer no-answer** | HIGH | Thêm timeout handler: release agent nếu originate timeout |
| **C4** | **Thiếu originating state** — claim set `ringing` thay vì `originating` | MEDIUM | Thêm state variant trong Lua script |

### Quyết định: Outbound PHẢI đi qua GoACD (Option B)

> **Đã quyết định (2026-03-19):** Outbound call PHẢI đi qua GoACD MakeCall, KHÔNG dùng SIP.js direct.

**Lý do:**
1. **Agent state sync:** GoACD claim `originating` → SREM khỏi available:voice → agent KHÔNG nhận inbound khi đang gọi ra
2. **CDR tracking:** Mọi cuộc gọi đều có CDR trong GoACD → audit trail đầy đủ
3. **Single source of truth:** GoACD quản lý tất cả call state, tránh desync giữa SIP.js state và server state
4. **Blocking inbound:** Nếu dùng SIP.js direct, GoACD không biết agent đang on-call → vẫn route inbound cho agent đó

**Luồng đúng:** Frontend `POST /cti/calls/make` → GoACD claim → originate agent ext → agent answer → originate customer → bridge → connected

**Sprint 11 Phase G1** sẽ implement đầy đủ luồng này. Chi tiết: [VOICE-IMPLEMENTATION-PLAN.md Sprint 11](../VOICE-IMPLEMENTATION-PLAN.md)

---

## D. Transfer Flow

### Design (§18.5.4)

| Loại | Design | Code |
|---|---|---|
| **Blind** | Claim target agent → uuid_transfer → 20s no-answer timer → reconnect original agent nếu fail | ✅ uuid_transfer, ❌ no claim, ❌ no timer, ❌ no reconnect |
| **Attended** | Hold caller → originate consult → 300s timeout → complete/cancel/conference | ✅ hold + consult + complete/cancel, ❌ no timeout, ❌ no conference |
| **To Queue** | Park caller → elevate priority → enqueue target queue | ❌ Hoàn toàn thiếu |
| **Cross-FS** | Detect FS instance → bridge qua Kamailio | ❌ Hoàn toàn thiếu |

### Gaps

| # | Gap | Mức độ | Fix |
|---|---|---|---|
| **D1** | Blind transfer không claim target agent — target không chuyển sang ringing | HIGH | Thêm ClaimAgent cho target trước uuid_transfer |
| **D2** | Blind transfer không có fallback khi target no-answer | HIGH | Thêm 20s timer, reconnect caller ↔ original agent |
| **D3** | Attended transfer không có timeout | MEDIUM | Thêm 300s goroutine timer |
| **D4** | Transfer to queue thiếu hoàn toàn | LOW (MVP) | Implement sau |
| **D5** | Không publish Kafka `call.transferred` event | MEDIUM | Thêm publish sau mỗi transfer operation |

---

## E. Agent State Machine

### Design (§18.7.4) — 6 trạng thái

```
offline → ready → ringing → on-call → acw → ready
                → originating → on-call (outbound)
```

### Code — 2 trạng thái trong Lua script

```
claim: available → ringing (cả inbound lẫn outbound)
release: ringing/on-call → ready/acw
```

### Gaps

| # | Gap | Mức độ |
|---|---|---|
| E1 | Thiếu `originating` state cho outbound | MEDIUM |
| E2 | Stale claim reaper chạy 2 phút thay vì 15s | MEDIUM |
| E3 | Không validate SIP registration trước khi set Ready | MEDIUM |
| E4 | Reconciler không scan stuck `ringing` claims | MEDIUM |

---

## F. Event Pipeline

### Design (§18.11)

```
Trước bridge: publish call.routing {callId, agentId, caller, waitTime, queue}
               → CTI Adapter → WebSocket → Agent Desktop hiển thị caller info
Sau answer:    publish call.answered {callId, agentId, waitTime}
Sau transfer:  publish call.transferred {callId, fromAgent, toAgent}
Sau end:       publish cdr.created {full CDR}
```

### Code

```
Trước bridge: ❌ KHÔNG có event
Sau answer:    ❌ KHÔNG có event
Sau transfer:  ❌ KHÔNG có event
Sau end:       ✅ publish cdr.created
```

### Ảnh hưởng

- Agent Desktop nhận SIP INVITE mà **không biết ai gọi** (no caller context)
- Không có real-time call answered/transferred metrics
- Dashboard không có live call data

### Gaps

| # | Gap | Mức độ | Fix |
|---|---|---|---|
| **F1** | Không push caller metadata trước INVITE | HIGH | Publish Kafka `call.routing` trước bridge trong `handleInboundCall` |
| **F2** | Không publish call.answered | MEDIUM | Thêm publish sau bridge thành công |
| **F3** | Không publish call.transferred | MEDIUM | Thêm publish trong transfer.go |
| **F4** | CTI Adapter CdrConsumer chỉ broadcast, không persist CDR vào DB | LOW | Thêm TypeORM save |

---

## G. Credential Provisioning

### Design vs Code

| Field | Design (§18.10) | Code | Status |
|---|---|---|---|
| `wsUri` | `wss://nextgen.omicx.vn:5066` | `wss://nextgen.omicx.vn/wss-sip/` | ✅ (via Nginx proxy) |
| `sipUri` | `sip:1007@nextgen.omicx.vn` | `sip:AGT001@nextgen.omicx.vn` | ✅ (agentId thay vì extension) |
| `domain` | — | `nextgen.omicx.vn` | ✅ |
| `authorizationUser` | `<expiry>:<extension>` | **THIẾU** | ❌ (không cần cho MVP — Kamailio no-auth) |
| `password` | HMAC-SHA1 token | **THIẾU** | ❌ (không cần cho MVP) |
| `displayName` | Agent name | **THIẾU** | ❌ LOW |
| `extension` | Bare extension number | **THIẾU** | ❌ LOW |
| `tokenExpiresAt` | Unix timestamp | **THIẾU** | ❌ (không cần cho MVP) |
| `iceServers` STUN | stun:domain:3478 | ✅ | ✅ |
| `iceServers` TURN | turn:domain:3478 + creds | ✅ (HMAC-SHA1) | ✅ |
| `iceServers` TURNS | turns:domain:5349 + creds | ✅ | ✅ |

---

## Tổng hợp — Priority Matrix

### CRITICAL (Blocking real calls)

| # | Gap | Module | Effort |
|---|---|---|---|
| **C1** | Outbound call không bridge về agent | GoACD outbound.go | 2d |
| **C2** | 2 outbound paths conflict (SIP.js direct vs GoACD) | Architecture decision | 0.5d |

### HIGH (Ảnh hưởng UX nghiêm trọng)

| # | Gap | Module | Effort |
|---|---|---|---|
| **B1** | Không có agent scoring (random routing) | GoACD handleInboundCall | 2d |
| **B2** | Không re-route khi agent no-answer | GoACD handleInboundCall | 1d |
| **B3** | Không push caller metadata trước INVITE | GoACD + CTI Adapter | 1d |
| **D1** | Blind transfer không claim target | GoACD transfer.go | 0.5d |
| **D2** | Blind transfer không fallback khi no-answer | GoACD transfer.go | 1d |

### MEDIUM (Cải thiện chất lượng)

| # | Gap | Module | Effort |
|---|---|---|---|
| B4 | Không publish call.answered event | GoACD main.go | 0.5d |
| D3 | Attended transfer không timeout | GoACD transfer.go | 0.5d |
| D5 | Không publish call.transferred event | GoACD transfer.go | 0.5d |
| E1 | Thiếu originating state | GoACD agent/state.go | 0.5d |
| E2 | Stale reaper 2min → 15s | GoACD reconciler.go | 0.5d |
| F1 | Publish call.routing event | GoACD main.go | 0.5d |

### LOW (Production hardening — sau MVP)

| # | Gap | Module |
|---|---|---|
| A1-A6 | SIP ephemeral token auth | GoACD + Kamailio + Frontend |
| D4 | Transfer to queue | GoACD |
| E3 | Validate SIP registration trước Ready | GoACD + Kamailio |
| F4 | CDR persist vào DB | CTI Adapter |
| Cross-FS transfer | GoACD + Kamailio |
| Queue overflow + voicemail | GoACD |
| Recording segments per transfer | GoACD |

---

## Khuyến nghị cho Sprint tiếp theo

### Sprint 10.5 (Hotfix — 3 ngày)

1. **Quyết định outbound path**: Dùng SIP.js direct cho MVP (bỏ GoACD MakeCall). Frontend `dial()` → SIP.js INVITE → Kamailio → FS → PSTN. Đơn giản, đã hoạt động.
2. **Fix inbound no-answer**: Thêm retry loop — try top-3 agents, 20s timeout mỗi agent.
3. **Push caller metadata**: Publish Kafka `call.routing` trước bridge, CTI Adapter broadcast qua Socket.IO.

### Sprint 11 (Routing + Transfer — 5 ngày)

4. Agent scoring algorithm (5 factors)
5. Blind transfer + target agent claim
6. Blind transfer no-answer fallback
7. Attended transfer timeout (300s)
8. Publish call.answered + call.transferred events

### Sprint 12 (Production Auth — 3 ngày)

9. GoACD: full credential response (authorizationUser, password, tokenExpiresAt)
10. Kamailio: enable auth.so + HMAC digest validation
11. Frontend: pass SIP auth credentials, 30s re-REGISTER
12. Token refresh via WebSocket

---

## Related Files

- [18-5-call-flows.md](./18-voice-platform/18-5-call-flows.md) — Call flow designs (inbound, outbound, transfer)
- [18-9-sync-architecture.md](./18-voice-platform/18-9-sync-architecture.md) — SIP credential generation
- [18-10-webrtc.md](./18-voice-platform/18-10-webrtc.md) — WebRTC/SIP.js config
- [18-4-goacd-architecture.md](./18-voice-platform/18-4-goacd-architecture.md) — GoACD architecture
- [18-7-agent-state-antisync.md](./18-voice-platform/18-7-agent-state-antisync.md) — Agent state management
- [18-8-routing-failure.md](./18-voice-platform/18-8-routing-failure.md) — Routing failure handling
- [VOICE-IMPLEMENTATION-PLAN.md](./VOICE-IMPLEMENTATION-PLAN.md) — Sprint plan
