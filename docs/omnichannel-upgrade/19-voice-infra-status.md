# 19. Hiện trạng hạ tầng Voice & Kế hoạch triển khai Softphone

> **Ngày kiểm tra:** 2026-03-19
> **Server chính:** 157.66.80.51 (nextgen.omicx.vn)
> **FreeSWITCH servers:** nextgenvoice01.omicx.vn (103.149.28.55), nextgenvoice02.omicx.vn (103.149.28.56)
> **Tham chiếu:** [VOICE-IMPLEMENTATION-PLAN.md](./VOICE-IMPLEMENTATION-PLAN.md) | [18-10-webrtc.md](./18-voice-platform/18-10-webrtc.md) | [INDEX.md](./INDEX.md)

---

## Mục lục

1. [Tổng quan hạ tầng Voice — Đã triển khai](#1-tổng-quan-hạ-tầng-voice--đã-triển-khai)
2. [Chi tiết từng component](#2-chi-tiết-từng-component)
3. [Kết quả kiểm tra kết nối](#3-kết-quả-kiểm-tra-kết-nối)
4. [Hiện trạng Softphone Frontend (SIP.js)](#4-hiện-trạng-softphone-frontend-sipjs)
5. [Phân tích luồng SIP Auth: Client → Kamailio → GoACD](#5-phân-tích-luồng-sip-auth-client--kamailio--goacd)
6. [Kế hoạch triển khai Softphone — Task list](#6-kế-hoạch-triển-khai-softphone--task-list)
7. [Tiêu chí Done — Softphone MVP](#7-tiêu-chí-done--softphone-mvp)

---

## 1. Tổng quan hạ tầng Voice — Đã triển khai

### 1.1 Server 157.66.80.51 (nextgen.omicx.vn) — Native services

| Component | Version | Status | Ports | Ghi chú |
|---|---|---|---|---|
| **Kamailio** | 5.6.3 | ✅ **RUNNING** (systemd) | UDP/TCP :5060, WS :5066 (127.0.0.1) | 16 worker processes, modules: websocket, rtpengine, dispatcher, nathelper, registrar |
| **rtpengine** | drachtio image | ✅ **RUNNING** | NG 127.0.0.1:22222, HTTP :8080, RTP 20000-30000 | Userspace mode (VPS không hỗ trợ kernel module), SRTP↔RTP bridging |
| **coturn** | coturn/coturn | ✅ **RUNNING** | STUN/TURN :3478 (UDP+TCP), TURNS :5349 | Shared-secret auth, realm=turn.nextgen.omicx.vn, relay 49152-65000 |
| **Nginx** | 1.22.1 | ✅ **RUNNING** | :80 (→ 301 HTTPS), :443 (SSL) | Let's Encrypt cert, reverse proxy cho frontend + API + WSS |

### 1.2 FreeSWITCH Servers (External)

| Server | IP | Docker Image | SIP Port | ESL Port | Status |
|---|---|---|---|---|---|
| **nextgenvoice01.omicx.vn** | 103.149.28.55 | safarov/freeswitch:1.10.12 | 5080/TCP | 8021/TCP | ✅ **ACTIVE** — SIP 200 OK, Kamailio dispatcher FLAGS: AP |
| **nextgenvoice02.omicx.vn** | 103.149.28.56 | safarov/freeswitch:1.10.12 | 5080/TCP | 8021/TCP | ✅ **ACTIVE** — SIP 200 OK, Kamailio dispatcher FLAGS: AP |

> **Lưu ý:** UDP bị block giữa 2 network (103.149.28.x ↔ 157.66.80.x) → Kamailio dispatcher dùng `sip:IP:5080;transport=tcp`

### 1.3 Nginx Reverse Proxy — Routing Map

```
https://nextgen.omicx.vn (443, SSL termination)
├── /              → Frontend Vite dev :3004
├── /api/          → Kong API Gateway :8000
├── /socket.io/    → CTI Adapter Service :3019 (Socket.IO)
├── /ws/agent/     → Agent Service :3002 (WebSocket)
├── /ws/notifications/ → Notification Service :3006 (WebSocket)
├── /wss-sip/      → Kamailio :5066 (SIP over WebSocket) ← SIP.js kết nối đây
└── /__vite_hmr    → Frontend Vite HMR :3004
```

---

## 2. Chi tiết từng component

### 2.1 Kamailio — Config tóm tắt

**Config file:** `/etc/kamailio/kamailio.cfg`

```
# Listeners
listen = udp:157.66.80.51:5060          # SIP UDP (FreeSWITCH ↔ Kamailio)
listen = tcp:157.66.80.51:5060          # SIP TCP (FreeSWITCH ↔ Kamailio)
listen = tcp:127.0.0.1:5066 advertise nextgen.omicx.vn:443  # WS (Nginx → Kamailio)

# Key modules
websocket.so        — SIP over WebSocket (cho SIP.js)
rtpengine.so        — RTP relay integration (SRTP↔RTP)
dispatcher.so       — Load balance FreeSWITCH pool
registrar.so        — SIP REGISTER handling (usrloc)
nathelper.so        — NAT fix cho WebRTC clients

# rtpengine integration
rtpengine_sock = "udp:127.0.0.1:22222"

# FreeSWITCH dispatcher pool
SET 1:
  sip:103.149.28.55:5080;transport=tcp  (weight=10, FLAGS: AP = Active+Probing)
  sip:103.149.28.56:5080;transport=tcp  (weight=10, FLAGS: AP = Active+Probing)
```

**Authentication hiện tại: OPEN REGISTRATION**
- Kamailio **KHÔNG load auth module** (`auth.so`, `auth_db.so`)
- Bất kỳ SIP REGISTER nào cũng được accept → trả 200 OK
- Phù hợp cho internal network, nhưng cần bổ sung auth cho production

### 2.2 rtpengine — Config

**Config file:** `/etc/rtpengine.conf` (hoặc CLI args)

```
--interface=157.66.80.51
--listen-ng=127.0.0.1:22222
--port-min=20000
--port-max=30000
--log-level=5
--delete-delay=30
--no-fallback
```

**Media transcoding flow:**
```
Browser (Opus/DTLS-SRTP) ↔ rtpengine ↔ FreeSWITCH (PCMA/RTP)
```

- Kamailio gọi `rtpengine_manage()` khi xử lý SDP trong INVITE/200OK
- Từ WebRTC (flag 5): `ICE=remove RTP/AVP` (strip ICE, convert SRTP→RTP)
- Reply về WebRTC: `ICE=force DTLS=passive` (add ICE, convert RTP→SRTP)

### 2.3 coturn — Config

```
--external-ip=157.66.80.51
--listening-port=3478
--tls-listening-port=5349
--relay-ip=157.66.80.51
--min-port=49152
--max-port=65000
--realm=turn.nextgen.omicx.vn
--use-auth-secret
--static-auth-secret=466f03791a44b531c5129724e50af31a4043e69bdccc741d
```

**TURN credential generation (ephemeral):**
```
username = "<timestamp>:<agentId>"
credential = HMAC-SHA1(secret, username)  // base64 encoded
```
> Client cần generate TURN credentials theo chuẩn RFC 5389 time-limited. GoACD `GetSIPCredentials` hiện chưa trả TURN credentials → cần bổ sung.

---

## 3. Kết quả kiểm tra kết nối (2026-03-19)

### 3.1 WebSocket SIP

| Test | Phương thức | Kết quả |
|---|---|---|
| WS → Kamailio direct (127.0.0.1:5066) | Node.js `ws` module, subprotocol `sip` | ✅ **CONNECTED** |
| WSS → Nginx → Kamailio (nextgen.omicx.vn/wss-sip/) | Node.js `ws` module, subprotocol `sip` | ✅ **CONNECTED** |
| SIP REGISTER `agent-test@nextgen.omicx.vn` qua WSS | Raw SIP message over WSS | ✅ **200 OK** — Contact lưu trong usrloc, expires=60s |

### 3.2 FreeSWITCH Connectivity

| Test | Kết quả |
|---|---|
| SIP OPTIONS → 103.149.28.55:5080 (TCP) | ✅ **200 OK** |
| SIP OPTIONS → 103.149.28.56:5080 (TCP) | ✅ **200 OK** |
| Kamailio dispatcher health (cả 2 node) | ✅ **FLAGS: AP** (Active + Probing) |

### 3.3 Kamailio usrloc (Registered Users)

```
Domain: location
AoRs: 0 (trước test) → 1 (sau test REGISTER agent-test)
```

> **Kết luận:** Hạ tầng SIP hoạt động end-to-end. SIP REGISTER qua WSS → Kamailio → lưu usrloc → thành công.

---

## 4. Hiện trạng Softphone Frontend (SIP.js)

### 4.1 Code đã viết

| File | Dòng | Mô tả | Status |
|---|---|---|---|
| `apps/agent-desktop/src/lib/webrtc-service.ts` | 280 | `WebRtcService`: SIP.js UserAgent + Registerer + Inviter/Invitation, audio attach, mute, hold, device mgmt | ✅ Code xong |
| `apps/agent-desktop/src/lib/sip-tab-lock.ts` | 113 | `SipTabLock`: BroadcastChannel + localStorage — chỉ 1 tab giữ SIP registration | ✅ Code xong |
| `apps/agent-desktop/src/hooks/useWebRTC.ts` | 130 | React hook: auto-register, credential refresh mỗi 4 phút, call state | ✅ Code xong |
| `apps/agent-desktop/src/hooks/useCallControl.ts` | 88 | Unified hook: WebRTC + CTI API + call events (dial/answer/hangup/transfer/mute/hold) | ✅ Code xong |
| `apps/agent-desktop/src/hooks/useCallEvents.ts` | — | Socket.IO listener cho call events từ CTI Adapter | ✅ Code xong |
| `apps/agent-desktop/src/hooks/useVoiceInteractions.ts` | — | Track live calls from WS events cho InteractionList | ✅ Code xong |
| `sip.js@0.21.2` | — | npm dependency | ✅ Installed |

### 4.2 Code Backend liên quan

| File | Mô tả | Status |
|---|---|---|
| `services/cti-adapter-service/src/cti/cti.controller.ts` | REST: answer/hangup/hold/transfer/makeCall/getWebRTCCredentials | ✅ Code xong |
| `services/cti-adapter-service/src/cti/cti.service.ts` | Delegates to FreeSwitchAdapter, broadcast events | ✅ Code xong |
| `services/cti-adapter-service/src/adapters/freeswitch-adapter.ts` | HTTP RPC → GoACD :9091 | ✅ Code xong |
| `services/cti-adapter-service/src/cti/cti-events.gateway.ts` | Socket.IO /cti namespace | ✅ Code xong |
| `services/goacd/internal/api/grpc_server.go` | `/rpc/GetSIPCredentials` → trả wsUri, sipUri, domain, iceServers | ✅ Code xong |

### 4.3 GAP NGHIÊM TRỌNG — Hooks chưa wire vào UI

**`useCallControl` / `useWebRTC` KHÔNG ĐƯỢC IMPORT trong bất kỳ `.tsx` component nào.**

- `FloatingCallWidget.tsx` vẫn nhận `callData` từ props (mock data từ App.tsx)
- `SipTabLock` chưa được sử dụng
- `useVoiceInteractions` chưa được import
- Tất cả call control buttons (mute, hold, transfer, hangup) trong FloatingCallWidget dùng local state, không gọi SIP.js

**→ Agent Desktop hiện tại KHÔNG có softphone thực. Tất cả là mock UI.**

---

## 5. Phân tích luồng SIP Auth: Client → Kamailio → GoACD

### 5.1 Luồng hiện tại (Simplified — No Auth)

```
┌─────────────┐    WSS REGISTER     ┌──────────────┐
│  SIP.js     │ ──────────────────→  │  Kamailio    │
│  (Browser)  │ ←────────────────── │  (no auth)   │
│             │    200 OK            │              │
└─────────────┘                      └──────────────┘

Kamailio KHÔNG load auth module → accept mọi REGISTER → 200 OK ngay
```

### 5.2 Luồng credential provisioning hiện tại

```
┌──────────────┐  GET /cti/webrtc/credentials  ┌─────────────────┐  /rpc/GetSIPCredentials  ┌──────────┐
│  Frontend    │ ─────────────────────────────→ │ CTI Adapter     │ ──────────────────────→  │  GoACD   │
│  useWebRTC   │ ←───────────────────────────── │ (NestJS :3019)  │ ←────────────────────── │  (:9091) │
│              │  {wsUri, sipUri, domain,        │                 │  {wsUri, sipUri, domain, │          │
│              │   iceServers}                   │                 │   iceServers}            │          │
└──────────────┘                                └─────────────────┘                          └──────────┘
```

**GoACD `GetSIPCredentials` response hiện tại:**
```json
{
  "wsUri": "wss://<sipDomain>/wss-sip/",
  "sipUri": "sip:<agentId>@<sipDomain>",
  "domain": "<sipDomain>",
  "iceServers": [
    {"urls": "stun:<sipDomain>:3478"},
    {"urls": "turn:<sipDomain>:3478"}
  ]
}
```

### 5.3 Các vấn đề cần giải quyết

| # | Vấn đề | Mức độ | Giải pháp |
|---|---|---|---|
| **A1** | ~~GoACD `sipDomain` chưa config~~ | ~~Critical~~ | ✅ **FIXED** — `GOACD_SIP_DOMAIN=nextgen.omicx.vn` (default in config.go), verified trả đúng |
| **A2** | ~~TURN credentials thiếu `username` + `credential`~~ | ~~Critical~~ | ✅ **FIXED 2026-03-19** — GoACD `generateTURNCredentials()` tạo ephemeral HMAC-SHA1 credentials (RFC 5389), TTL 86400s |
| **A3** | Kamailio open registration (no auth) | Medium (MVP OK) | Phase 1: chấp nhận no-auth (internal network). Phase 2: thêm `auth.so` + ephemeral token (xem §18.9, §18.10) |
| **A4** | `WebRtcService` dùng `authorizationPassword: ''` (hardcoded empty) | Medium (MVP OK) | Match Kamailio no-auth. Khi bật auth, cần truyền password từ credentials |
| **A5** | `useWebRTC` auto-register dùng `apiClient.get()` nhưng chưa có JWT header | High | Cần đảm bảo `apiClient` gửi JWT Bearer token (user đã login) |
| **A6** | `useWebRTC` refresh mỗi 4 phút, nhưng Kamailio registrar expires=300s (5 min) | Low | OK — refresh trước khi expire. Có thể giảm xuống 3 phút cho an toàn |

### 5.4 Luồng target (Production — Ephemeral Token Auth)

> Tham chiếu: [18-10-webrtc.md](./18-voice-platform/18-10-webrtc.md) §Credential Provisioning V2.2

```
1. Agent login → Frontend get JWT
2. Frontend GET /cti/webrtc/credentials (JWT header)
3. CTI Adapter → GoACD GetSIPCredentials
4. GoACD generate:
   - SIP username: "<expiry>:<extension>" (e.g. "1710500300:1007")
   - SIP password: HMAC-SHA1(kamailio_auth_secret, username)
   - TURN username: "<expiry>:<agentId>"
   - TURN credential: HMAC-SHA1(coturn_secret, TURN username)
5. Return to frontend
6. SIP.js REGISTER → Kamailio validates HMAC → 200 OK
7. Every 25s: GoACD pushes new token via WebSocket → SIP.js re-REGISTER

MVP Phase: Skip step 6 validation (Kamailio no-auth), chỉ cần step 2-5 hoạt động
```

---

## 6. Kế hoạch triển khai Softphone — Task list

> **Mục tiêu:** SIP.js softphone trên Agent Desktop registered thành công với Kamailio, có khả năng thực hiện cuộc gọi inbound và outbound.

### Phase S1: GoACD Credentials & Config Fix (Backend)

| # | Task | Chi tiết | Effort | Verify |
|---|---|---|---|---|
| **SF-1** | **Verify/fix GoACD `sipDomain` config** | Kiểm tra `grpc_server.go` → `s.sipDomain` đọc từ env/config nào. Đảm bảo trả `nextgen.omicx.vn`. Nếu chưa có, thêm env `SIP_DOMAIN=nextgen.omicx.vn` | 0.5d | `curl http://localhost:9091/rpc/GetSIPCredentials?agentId=test` trả đúng domain |
| **SF-2** | **Bổ sung TURN credentials vào `GetSIPCredentials`** | GoACD cần generate ephemeral TURN credentials: `username = "<unix_timestamp+ttl>:<agentId>"`, `credential = base64(HMAC-SHA1(coturn_static_secret, username))`. Thêm env `TURN_SECRET=466f03791a44b531c5129724e50af31a4043e69bdccc741d`, `TURN_TTL=86400` | 1d | Response có `iceServers[1].username` và `iceServers[1].credential` |
| **SF-3** | **Verify CTI Adapter Service → GoACD connectivity** | CTI Adapter đang chạy :3019, cần verify gọi được `http://goacd:9091` (hoặc `localhost:9091` nếu cùng host). Kiểm tra env `GOACD_URL` | 0.5d | `GET /api/v1/cti/webrtc/credentials?tenantId=...&agentId=...` trả JSON hợp lệ |
| **SF-4** | **Verify GoACD đang chạy trên server** | GoACD binary cần chạy (Docker hoặc native). Kiểm tra `ps aux | grep goacd`, verify `:9091` listening. Nếu chưa chạy → build và start | 0.5d | `curl http://localhost:9091/healthz` → 200 |

### Phase S2: Frontend Wire SIP.js vào UI Components

| # | Task | Chi tiết | Effort | Verify |
|---|---|---|---|---|
| **SF-5** | **Wire `useCallControl` vào `FloatingCallWidget`** | Thay thế mock callData props bằng real SIP.js state. Import `useCallControl(agentId)` → map `sipStatus`, `activeCallId`, `incomingCall`, `isMuted`, `callStartTime` vào widget UI. Wire buttons: Answer → `answer()`, Hangup → `hangup()`, Mute → `toggleMute()`, Hold → `toggleHold()` | 2d | FloatingCallWidget hiển thị SIP status, buttons gọi SIP.js methods |
| **SF-6** | **Wire `SipTabLock` vào useWebRTC** | Trong `useWebRTC`, trước khi register: `sipTabLock.tryAcquire()`. Nếu không phải holder → skip register, show "SIP active in another tab". On unmount → `sipTabLock.release()` | 0.5d | Mở 2 tab → chỉ 1 tab register SIP |
| **SF-7** | **Thêm SIP status indicator vào `EnhancedAgentHeader`** | Hiển thị icon + text cho SIP status: 🔴 disconnected, 🟡 connecting, 🟢 registered, 🔴 error. Khi click → show audio device selection | 0.5d | Header hiển thị "SIP: Registered" khi connected |
| **SF-8** | **Wire `useCallEvents` vào App.tsx hoặc CallProvider** | Ensure Socket.IO /cti events (call:incoming, call:ended, call:assigned) được listen ở top-level, cập nhật call state cho toàn app | 0.5d | Console log call events khi có cuộc gọi đến |
| **SF-9** | **Wire incoming call notification** | Khi `incomingCall` !== null → hiển thị ring notification (sound + visual) trên FloatingCallWidget. Buttons: Answer / Reject | 1d | Cuộc gọi đến → ring notification hiển thị → click Answer → SIP.js accept |
| **SF-10** | **Wire outbound click-to-call** | Trong `CustomerInfoScrollFixed` và `InteractionDetail` — khi click số điện thoại → gọi `dial(phoneNumber)`. Thêm click handler cho tất cả phone number displays | 1d | Click số → FloatingCallWidget mở → đang gọi → customer nhấc máy → connected |
| **SF-11** | **Wire `TransferCallDialog` với real transfer** | Hiện tại dialog có UI nhưng onTransfer là mock. Wire `transfer(destination, type)` từ `useCallControl` | 0.5d | Transfer dialog → nhập số → click Transfer → call được chuyển |

### Phase S3: Testing & Verification

| # | Task | Chi tiết | Effort | Verify |
|---|---|---|---|---|
| **SF-12** | **Manual test: SIP.js register qua WSS** | Mở `https://nextgen.omicx.vn`, login agent, verify browser console: (1) `GET /cti/webrtc/credentials` → 200 (2) WSS connect to Kamailio (3) SIP REGISTER → 200 OK (4) `sipStatus = 'registered'` | 0.5d | Agent header hiển thị "SIP: Registered" |
| **SF-13** | **Manual test: Inbound call** | Từ softphone khác (Opal, Ophone, Oactive01, hoặc SIP trunk) gọi đến agent extension qua Kamailio. Verify: (1) Kamailio route INVITE tới agent's WSS contact (2) SIP.js nhận Invitation (3) Ring notification hiển thị (4) Click Answer → Established (5) Audio 2 chiều (6) Hangup → Terminated | 1d | Cuộc gọi inbound hoàn chỉnh |
| **SF-14** | **Manual test: Outbound call** | Agent click số → SIP.js gửi INVITE → Kamailio → FreeSWITCH → PSTN/destination. Verify: (1) INVITE sent qua WSS (2) Kamailio route to FS pool (3) FS originate call (4) Destination ring → answer (5) Audio 2 chiều (6) Hangup | 1d | Cuộc gọi outbound hoàn chỉnh |
| **SF-15** | **Test call features** | (1) Mute/unmute — audio tắt/bật đúng (2) Hold — audio pause (3) Transfer (blind) — call chuyển đến destination (4) Audio device switch — đổi mic/speaker | 1d | Tất cả features hoạt động |
| **SF-16** | **Test edge cases** | (1) Agent refresh page → re-register (2) 2 tabs → chỉ 1 register (3) Network drop → reconnect + re-register (4) Call timeout (no answer) (5) Concurrent calls blocked (1 call at a time) | 0.5d | Tất cả edge cases xử lý đúng |

---

## 7. Tiêu chí Done — Softphone MVP

### Registration

- [ ] `GET /api/v1/cti/webrtc/credentials` trả đúng: wsUri=`wss://nextgen.omicx.vn/wss-sip/`, sipUri=`sip:<agentId>@nextgen.omicx.vn`, domain=`nextgen.omicx.vn`, iceServers có TURN credentials
- [ ] SIP.js `UserAgent.start()` → WSS connected tới Kamailio
- [ ] SIP.js `Registerer.register()` → 200 OK, usrloc có contact
- [ ] `kamcmd ul.dump` hiển thị agent registered với transport=ws
- [ ] Agent Header hiển thị SIP status indicator (🟢 registered)
- [ ] Multi-tab: chỉ 1 tab register, tab khác hiển thị "SIP active elsewhere"

### Inbound Call

- [ ] SIP INVITE tới agent → SIP.js nhận `onInvite` callback
- [ ] Ring notification hiển thị trên FloatingCallWidget (caller number + name)
- [ ] Click Answer → SIP.js `accept()` → call Established
- [ ] rtpengine bridge media: browser SRTP ↔ FreeSWITCH RTP
- [ ] Audio 2 chiều (agent nghe + nói)
- [ ] Click Hangup → SIP.js `bye()` → call Terminated → UI cleanup

### Outbound Call

- [ ] Click số điện thoại → SIP.js `Inviter.invite()` → INVITE qua WSS
- [ ] Kamailio route INVITE → FreeSWITCH dispatcher pool
- [ ] FreeSWITCH/GoACD originate call ra destination
- [ ] Destination trả lời → call Established → audio 2 chiều
- [ ] Hangup → BYE → CDR generated

### Call Features

- [ ] Mute/Unmute — audio track enabled/disabled
- [ ] Hold — re-INVITE sendonly (hoặc mute fallback cho MVP)
- [ ] Blind Transfer — SIP REFER hoặc CTI API transfer
- [ ] Audio device selection — mic + speaker

### Tổng effort ước tính

| Phase | Effort |
|---|---|
| Phase S1: Backend fix | 2.5 ngày |
| Phase S2: Frontend wire | 6 ngày |
| Phase S3: Testing | 4 ngày |
| **Tổng** | **~12.5 ngày** |

---

## Related Files

- [VOICE-IMPLEMENTATION-PLAN.md](./VOICE-IMPLEMENTATION-PLAN.md) — Master plan Voice Channel (Sprint 1-9)
- [18-10-webrtc.md](./18-voice-platform/18-10-webrtc.md) — WebRTC integration spec (SIP.js config, DTLS, ICE, codec)
- [18-9-sync-architecture.md](./18-voice-platform/18-9-sync-architecture.md) — SIP credential generation, ephemeral token flow
- [18-2a-kamailio-config.md](./18-voice-platform/18-2a-kamailio-config.md) — Kamailio config reference
- [14-frontend-changes.md](./14-frontend-changes.md) — Agent Desktop frontend changes spec
