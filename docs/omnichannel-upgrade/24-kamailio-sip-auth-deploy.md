# 24. Kamailio SIP Agent Auth — Deployment Guide

> **Mục tiêu:** Bật authentication layer 1 cho agent SIP registration trên Kamailio.
> **Module:** `auth_ephemeral` — HMAC-SHA1 time-limited tokens, zero DB lookup.
> **Ngày tạo:** 2026-03-20
> **Server:** 157.66.80.51 (`/etc/kamailio/kamailio.cfg`)

---

## Tổng quan

```
GoACD (generate token)              Kamailio (validate token)
─────────────────────               ─────────────────────────
shared_secret = ENV                 shared_secret = config

expiry = now() + 300                REGISTER arrives:
username = "<expiry>:<agentId>"       1. Parse username → extract expiry
password = Base64(HMAC-SHA1(          2. Check expiry > now (not expired)
  shared_secret, username))           3. Compute HMAC-SHA1(secret, username)
                                      4. Compare with digest → 200 OK or 401
Return to frontend:
  authorizationUser = username      No DB query. Pure CPU.
  authorizationPassword = password
```

**Shared secret phải giống nhau** giữa GoACD env var `GOACD_SIP_AUTH_SECRET` và Kamailio config.

---

## Step 1: Cài module auth_ephemeral trên Kamailio

```bash
# Kiểm tra module đã có chưa
ls /usr/lib/x86_64-linux-gnu/kamailio/modules/auth_ephemeral.so

# Nếu chưa có — cài package
apt-get install kamailio-auth-ephemeral-modules
```

**Lưu ý:** Kamailio 5.6.3 trên Debian/Ubuntu có module `auth_ephemeral` trong package riêng. Nếu Kamailio build from source, cần enable module khi compile.

---

## Step 2: Cập nhật kamailio.cfg

### 2a. Load modules

Thêm vào section `loadmodule` (sau các module hiện có):

```cfg
# ── Agent SIP Auth (ephemeral HMAC tokens) ──
loadmodule "auth.so"
loadmodule "auth_ephemeral.so"
```

### 2b. Module parameters

Thêm sau section `modparam` hiện có:

```cfg
# ── auth_ephemeral: HMAC-SHA1 ephemeral tokens for agent WebRTC ──
# Shared secret MUST match GOACD_SIP_AUTH_SECRET env var in GoACD
modparam("auth_ephemeral", "secret", "tpb_sip_ephemeral_secret_2026")

# Username format: "<expiry_unix_timestamp>:<extension>"
# Separator character between expiry and extension
modparam("auth_ephemeral", "username_format", 1)
# 1 = "<expiry>:<username>" (default separator ':')
```

### 2c. REGISTER route — thêm auth check

Tìm route xử lý REGISTER trong `kamailio.cfg`. Thêm auth check **TRƯỚC** save location:

```cfg
route[REGISTRAR] {
    # ── Ephemeral HMAC auth for agent registration ──
    if (!autheph_check("nextgen.omicx.vn")) {
        auth_challenge("nextgen.omicx.vn", "1");
        exit;
    }
    # Auth passed — extract real username from ephemeral format
    # Username format: "<expiry>:<agentId>" → we want agentId as AOR
    # auth_ephemeral already strips expiry prefix for usrloc

    if (!save("location")) {
        sl_reply_error();
    }
    exit;
}
```

### 2d. Bypass auth cho inter-server traffic

FreeSWITCH INVITE từ dispatcher pool **không cần auth** (IP-based trust):

```cfg
route[AUTH] {
    # Skip auth for FreeSWITCH servers (trusted IPs)
    if (src_ip == 103.149.28.55 || src_ip == 103.149.28.56 || src_ip == 127.0.0.1) {
        return;
    }

    # All other REGISTER must authenticate
    if (is_method("REGISTER")) {
        route(REGISTRAR);
        exit;
    }
}
```

---

## Step 3: Cập nhật GoACD env var

Trên server chạy GoACD, set env var:

```bash
export GOACD_SIP_AUTH_SECRET="tpb_sip_ephemeral_secret_2026"
export GOACD_SIP_AUTH_TTL=300    # 5 minutes (default)
```

**Secret phải CHÍNH XÁC giống** giá trị trong `kamailio.cfg` modparam `auth_ephemeral.secret`.

---

## Step 4: Test

### 4a. Restart Kamailio

```bash
# Verify config syntax
kamailio -c /etc/kamailio/kamailio.cfg

# Restart
systemctl restart kamailio

# Check logs
journalctl -u kamailio -f
```

### 4b. Restart GoACD

```bash
# Rebuild + restart
cd /opt/project/AgentdesktopTPB/services/goacd
go build -o goacd ./cmd/goacd/
# restart process/service
```

### 4c. Test từ browser

1. Mở `https://nextgen.omicx.vn`, login agent
2. Mở DevTools → Network tab
3. Kiểm tra `GET /api/v1/cti/webrtc/credentials`:
   ```json
   {
     "wsUri": "wss://nextgen.omicx.vn/wss-sip/",
     "sipUri": "sip:AGT001@nextgen.omicx.vn",
     "domain": "nextgen.omicx.vn",
     "authorizationUser": "1710500300:AGT001",
     "authorizationPassword": "abc123base64hmac==",
     "tokenExpiresAt": 1710500300,
     "iceServers": [...]
   }
   ```
4. Kiểm tra WebSocket frames → SIP REGISTER có Authorization header
5. Kamailio trả 200 OK (không 401)

### 4d. Test auth rejection

```bash
# Register với password sai → phải bị 401
# Dùng tool SIP test:
kamcmd ul.dump   # check registered contacts
```

### 4e. Test token expiry

Đợi 5+ phút sau lần register cuối (không re-register):
- Token hết hạn → Kamailio reject 401
- Frontend auto re-register (mỗi 4 phút) → lấy token mới → 200 OK

---

## Rollback

Nếu có vấn đề, comment out auth trong `kamailio.cfg`:

```cfg
route[REGISTRAR] {
    # ── TEMPORARILY DISABLED: auth_ephemeral ──
    # if (!autheph_check("nextgen.omicx.vn")) {
    #     auth_challenge("nextgen.omicx.vn", "1");
    #     exit;
    # }

    if (!save("location")) {
        sl_reply_error();
    }
    exit;
}
```

Restart Kamailio → quay về open registration.

---

## Lưu ý bảo mật

| Item | Trạng thái |
|---|---|
| Shared secret trong env var (không hardcode production) | ⚠️ Default value cho dev, production phải đổi |
| Token TTL 300s (5 phút) | ✅ Đủ ngắn, frontend re-register mỗi 4 phút |
| auth_ephemeral không cần DB | ✅ Zero latency, zero DB dependency |
| FS/internal traffic bypass auth | ✅ IP whitelist |
| Stolen token hết hạn sau 5 phút | ✅ Minimal attack window |

---

## Tham chiếu

| File | Mô tả |
|---|---|
| `services/goacd/internal/config/config.go` | `GOACD_SIP_AUTH_SECRET`, `GOACD_SIP_AUTH_TTL` |
| `services/goacd/internal/api/grpc_server.go` | `generateSIPAuthToken()`, updated `handleGetSIPCredentials` |
| `apps/agent-desktop/src/lib/webrtc-service.ts` | `WebRtcCredentials` interface, auth fields used in SIP.js |
| [18-9-sync-architecture.md](./18-voice-platform/18-9-sync-architecture.md) | Ephemeral token design (V2.2) |
| [18-2a-kamailio-config.md](./18-voice-platform/18-2a-kamailio-config.md) | Full Kamailio config reference |
