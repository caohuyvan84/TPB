# 20. Deployed Infrastructure — Full Inventory

> **Ngày kiểm tra:** 2026-03-19
> **Server chính:** 157.66.80.51 (nextgen.omicx.vn)
> **FreeSWITCH servers:** nextgenvoice01.omicx.vn (103.149.28.55), nextgenvoice02.omicx.vn (103.149.28.56)
> **Tham chiếu:** [INDEX.md](./INDEX.md) | [19-voice-infra-status.md](./19-voice-infra-status.md)

---

## 1. Server Overview

| Server | IP | Role | OS |
|---|---|---|---|
| **nextgen.omicx.vn** | 157.66.80.51 | Main server: frontend, backend, infra, Kamailio, rtpengine, coturn | Debian 12 (Linux 6.1.0) |
| **nextgenvoice01.omicx.vn** | 103.149.28.55 | FreeSWITCH media server #1 | Docker: safarov/freeswitch:1.10.12 |
| **nextgenvoice02.omicx.vn** | 103.149.28.56 | FreeSWITCH media server #2 | Docker: safarov/freeswitch:1.10.12 |

---

## 2. User Accounts (Identity Service)

| Username | Password | Full Name | Agent ID | Role | Login Status |
|---|---|---|---|---|---|
| **admin** | `Admin@123` | System Administrator | ADM001 | admin | ✅ OK |
| **agent001** | `Agent@123` | Agent Tung | AGT001 | agent | ✅ OK |
| **agent002** | `Agent@123` | Pham Van Duc | AGT002 | agent | ✅ OK |
| **agent003** | `Agent@123` | Hoang Thi Mai | AGT003 | agent | ✅ OK |
| **agent004** | `Agent@123` | Tran Minh Tuan | AGT004 | agent | ✅ OK |
| **agent005** | `Agent@123` | Nguyen Thanh Ha | AGT005 | agent | ✅ OK |
| **sup001** | `Sup@1234` | Le Van Hung | SUP001 | supervisor | ✅ OK (fixed 2026-03-19, was "Sup@123" 7 chars) |

> **Login endpoint:** `POST https://nextgen.omicx.vn/api/v1/auth/login` → returns JWT `accessToken` + `refreshToken`

---

## 3. Docker Containers

| Container | Image | Status | Ports (Host) | Bind |
|---|---|---|---|---|
| **tpb-postgres** | PostgreSQL 16 | ✅ Healthy | 127.0.0.1:5432 | Internal only |
| **tpb-redis** | Redis 8.6 | ✅ Healthy | 127.0.0.1:6379 | Internal only |
| **tpb-kafka** | Kafka 4.2.0 (KRaft) | ✅ Healthy | 127.0.0.1:9092 | Internal only |
| **tpb-kong** | Kong 3.9 | ✅ Healthy | 0.0.0.0:8000-8001 | API Gateway proxy + admin |
| **tpb-kong-db** | PostgreSQL (Kong) | ✅ Healthy | — (internal) | Kong metadata |
| **tpb-elasticsearch** | ES 8.x | ✅ Healthy | 127.0.0.1:9200 | Internal only |
| **tpb-seaweedfs** | SeaweedFS | ✅ Running | 0.0.0.0:8333, 9333 | S3-compatible storage |
| **rtpengine** | drachtio/rtpengine | ✅ Healthy | 157.66.80.51:8080 (HTTP), 127.0.0.1:22222 (NG), 20000-30000 (RTP) | Media relay |
| **coturn** | coturn/coturn | ✅ Healthy | 157.66.80.51:3478 (STUN/TURN), 5349 (TURNS), 49152-65000 (relay) | NAT traversal |
| tpb-temporal | Temporal | ❌ Exited | 7233 | Workflow engine (not needed for Voice MVP) |
| tpb-temporal-ui | Temporal UI | ❌ Exited | 8233 | — |
| tpb-kibana | Kibana | ❌ Exited | 127.0.0.1:5601 | — |
| tpb-superset | Apache Superset | ❌ Exited | 8088 | BI (not needed for Voice MVP) |
| tpb-kafka-ui | Kafka UI | ❌ Exited | 9000 | Debug tool |
| tpb-mailhog | MailHog | ❌ Exited | 1025, 8025 | Email test (not needed) |

---

## 4. Native Services (Host — systemd/process)

| Service | Version | Status | Ports | Config |
|---|---|---|---|---|
| **Kamailio** | 5.6.3 | ✅ Running (systemd) | UDP/TCP 5060, WS 127.0.0.1:5066 | `/etc/kamailio/kamailio.cfg` |
| **Nginx** | 1.22.1 | ✅ Running | 80 (→ 301 HTTPS), 443 (SSL) | `/etc/nginx/sites-available/nextgen.omicx.vn` |
| **GoACD** | Custom Go binary | ✅ Running | ESL :9090, HTTP API :9091 (+/healthz), REST :9093 | `/opt/project/AgentdesktopTPB/services/goacd/goacd` |
| **MariaDB** | — | ✅ Running | 127.0.0.1:3306 | Kamailio metadata DB |

---

## 5. NestJS Backend Services (All Running)

| # | Service | Port | DB | Kong Route | Status |
|---|---|---|---|---|---|
| MS-1 | **Identity Service** | 3001 | identity_db | `/api/v1/auth`, `/api/v1/users` | ✅ Running |
| MS-2 | **Agent Service** | 3002 | agent_db | `/api/v1/agents` | ✅ Running |
| MS-3 | **Interaction Service** | 3003 | interaction_db | `/api/v1/interactions` | ✅ Running |
| MS-4 | **Ticket Service** | 3022 | ticket_db | `/api/v1/tickets` | ✅ Running |
| MS-5 | **Customer Service** | 3005 | customer_db | `/api/v1/customers` | ✅ Running |
| MS-6 | **Notification Service** | 3006 | notification_db | `/api/v1/notifications` | ✅ Running |
| MS-7 | **Knowledge Service** | 3007 | knowledge_db | `/api/v1/kb` | ✅ Running |
| MS-8 | **BFSI Core Service** | 3008 | bfsi_db | `/api/v1/bfsi` | ✅ Running |
| MS-9 | **AI Service** | 3009 | ai_db | `/api/v1/ai` | ✅ Running |
| MS-10 | **Media Service** | 3010 | media_db | `/api/v1/media` | ✅ Running |
| MS-11 | **Audit Service** | 3011 | audit_db | `/api/v1/audit` | ✅ Running |
| MS-13 | **Object Schema Service** | 3013 | object_schema_db | `/api/v1/schemas` | ✅ Running |
| MS-14 | **Layout Service** | 3014 | layout_db | `/api/v1/layouts` | ✅ Running |
| MS-15 | **Workflow Service** | 3015 | workflow_db | `/api/v1/workflows` | ✅ Running |
| MS-16 | **Data Enrichment Service** | 3016 | enrichment_db | `/api/v1/enrichment` | ✅ Running |
| MS-17 | **Dashboard Service** | 3017 | dashboard_db | `/api/v1/dashboards` | ✅ Running |
| MS-18 | **Report Service** | 3018 | report_db | `/api/v1/reports` | ✅ Running |
| MS-19 | **CTI Adapter Service** | 3019 | cti_db | `/api/v1/cti` | ✅ Running |
| MS-20 | **Channel Gateway** | 3020 | channel_gateway_db | — | ✅ Running |
| MS-21 | **Routing Engine** | 3021 | routing_engine_db | — | ✅ Running |

> **Tổng: 20/20 NestJS services running.** Ticket service chạy trên port 3022 (tránh conflict với Vite dev server 3004).

---

## 6. Frontend

| App | Port | URL | Status |
|---|---|---|---|
| **Agent Desktop** (Vite dev) | 3004 | `https://nextgen.omicx.vn/` (via Nginx proxy) | ✅ Running |
| Agent Desktop (duplicate dev) | 3000 | `http://localhost:3000` (not proxied) | ✅ Running (có thể stop) |

> **Nginx proxies** `https://nextgen.omicx.vn/` → `http://127.0.0.1:3004` (Vite dev server)

---

## 7. Nginx Reverse Proxy — Route Map

```
https://nextgen.omicx.vn (443, SSL termination — Let's Encrypt)
├── /                  → http://127.0.0.1:3000    (Frontend Vite dev)
├── /api/              → http://127.0.0.1:8000    (Kong API Gateway → NestJS services)
├── /socket.io/        → http://127.0.0.1:3019    (CTI Adapter Socket.IO — call events)
├── /ws/agent/         → http://127.0.0.1:3002    (Agent Service WebSocket)
├── /ws/notifications/ → http://127.0.0.1:3006    (Notification Service WebSocket)
├── /wss-sip/          → http://127.0.0.1:5066    (Kamailio SIP over WebSocket)
└── /__vite_hmr        → http://127.0.0.1:3004    (Vite Hot Module Reload)
```

**SSL Certificate:** Let's Encrypt, valid until 2026-06-15

---

## 8. Kong API Gateway — Service Routes

| Kong Service | Target | Kong Route(s) |
|---|---|---|
| identity-service | http://host.docker.internal:3001 | `/api/v1/auth`, `/api/v1/users`, `/api/auth`, `/api/users` |
| agent-service | http://host.docker.internal:3002 | `/api/v1/agents` |
| interaction-service | http://host.docker.internal:3003 | `/api/v1/interactions` |
| ticket-service | http://host.docker.internal:3022 | `/api/v1/tickets` |
| customer-service | http://host.docker.internal:3005 | `/api/v1/customers` |
| notification-service | http://host.docker.internal:3006 | `/api/v1/notifications` |
| knowledge-service | http://host.docker.internal:3007 | `/api/v1/kb` |
| bfsi-core-service | http://host.docker.internal:3008 | `/api/v1/bfsi` |
| ai-service | http://host.docker.internal:3009 | `/api/v1/ai` |
| media-service | http://host.docker.internal:3010 | `/api/v1/media` |
| audit-service | http://host.docker.internal:3011 | `/api/v1/audit` |
| object-schema-service | http://host.docker.internal:3013 | `/api/v1/schemas`, `/api/v1/admin/object-types` |
| layout-service | http://host.docker.internal:3014 | `/api/v1/layouts`, `/api/v1/admin/layouts` |
| workflow-service | http://host.docker.internal:3015 | `/api/v1/workflows` |
| enrichment-service | http://host.docker.internal:3016 | `/api/v1/enrichment` |
| dashboard-service | http://host.docker.internal:3017 | `/api/v1/dashboards` |
| report-service | http://host.docker.internal:3018 | `/api/v1/reports` |
| cti-adapter-service | http://host.docker.internal:3019 | `/api/v1/cti`, `/api/v1/admin/cti` |

> **Kong CORS plugin** configured for origin `https://nextgen.omicx.vn`

---

## 9. PostgreSQL Databases (26 total)

| Database | Service | Tables | Key Records |
|---|---|---|---|
| identity_db | Identity (MS-1) | 5 | 7 users, 4 roles |
| agent_db | Agent (MS-2) | 5 | 6 agent profiles, 8 skills, 3 groups |
| interaction_db | Interaction (MS-3) | 3 | 8 interactions |
| ticket_db | Ticket (MS-4) | — | — |
| customer_db | Customer (MS-5) | — | 10 customers |
| notification_db | Notification (MS-6) | — | — |
| knowledge_db | Knowledge (MS-7) | — | 5 KB articles |
| bfsi_db | BFSI Core (MS-8) | — | — |
| bfsi_core_db | (alias, legacy) | — | — |
| ai_db | AI (MS-9) | — | — |
| media_db | Media (MS-10) | — | — |
| audit_db | Audit (MS-11) | — | — |
| object_schema_db | Object Schema (MS-13) | — | — |
| layout_db | Layout (MS-14) | — | — |
| workflow_db | Workflow (MS-15) | — | — |
| enrichment_db | Data Enrichment (MS-16) | — | — |
| data_enrichment_db | (alias, legacy) | — | — |
| dashboard_db | Dashboard (MS-17) | — | — |
| report_db | Report (MS-18) | — | — |
| cti_db | CTI Adapter (MS-19) | 1 | 1 CTI config |
| cti_adapter_db | (alias, legacy) | — | — |
| channel_gateway_db | Channel Gateway (MS-20) | 1 | 1 voice channel config |
| routing_engine_db | Routing Engine (MS-21) | 2 | 4 routing queues |
| goacd | GoACD | — | — |
| api_gateway_db | Kong (internal) | — | — |
| postgres | System default | — | — |

> **PostgreSQL credentials:** `postgres` / (no password, trust auth from localhost)
> **Connection:** `127.0.0.1:5432`

---

## 10. Kafka Topics (15 total)

| Topic | Producer | Consumer |
|---|---|---|
| agent.created | Agent Service | GoACD (deferred) |
| agent.login | Agent Service | — |
| agent.logout | Agent Service | — |
| agent.status_changed | Agent Service | — |
| cdr.created | GoACD | CTI Adapter (CdrConsumer) |
| cdr.updated | — | — |
| channel.inbound | GoACD | Channel Gateway (InboundConsumer) |
| channel.outbound | — | — |
| interaction.assigned | Routing Engine | Agent Service (InteractionConsumer) |
| interaction.closed | — | Agent Service (InteractionConsumer) |
| interaction.created | Routing Engine | — |
| interaction.transferred | — | — |
| notification.created | — | — |
| routing.inbound | Channel Gateway | Routing Engine (InboundConsumer) |

> **Kafka broker:** `127.0.0.1:9092` (KRaft mode, no ZooKeeper)

---

## 11. Voice Infrastructure

### 11.1 Kamailio (SIP Proxy)

- **Version:** 5.6.3
- **Config:** `/etc/kamailio/kamailio.cfg`
- **Modules:** websocket, rtpengine, dispatcher, nathelper, registrar, rr, tm, sl, xhttp, sdpops
- **Auth:** OPEN (no auth module loaded) — accept all REGISTER
- **Dispatcher:** 2 FreeSWITCH nodes, round-robin (weight=10 each), FLAGS: AP (Active+Probing)
- **MariaDB:** `kamailio` DB on localhost:3306 (user: kamailio, pass: KamDB_Pass2026!)

### 11.2 GoACD (ACD Engine)

- **Binary:** `/opt/project/AgentdesktopTPB/services/goacd/goacd` (12MB static Go binary)
- **ESL Outbound Server:** :9090 (FreeSWITCH connects here)
- **HTTP API:** :9091 (NestJS CTI Adapter calls this)
  - `GET /healthz` → `{status, service, uptime, activeCalls}`
  - `GET /rpc/GetSIPCredentials?agentId=AGT001` → `{wsUri, sipUri, domain, iceServers}` (includes TURN credentials)
  - `POST /rpc/MakeCall` → originate outbound call
  - `POST /rpc/HangupCall` → hangup by UUID
  - `POST /rpc/SetAgentState` → change agent state
  - `GET /rpc/GetAgentState` → query agent state
- **REST Server:** :9093 (monitoring — `/healthz`, `/api/calls`, `/api/stats`)
- **sipDomain:** `nextgen.omicx.vn` ✅ (verified — credentials return correct domain)
- **TURN credentials:** ✅ Ephemeral HMAC-SHA1 (RFC 5389), TTL 86400s, secret from coturn config

### 11.3 coturn (TURN/STUN)

- **STUN/TURN:** 157.66.80.51:3478 (UDP+TCP)
- **TURNS:** 157.66.80.51:5349 (TLS)
- **Relay range:** 49152-65000 UDP
- **Auth:** Shared-secret (`466f03791a44b531c5129724e50af31a4043e69bdccc741d`)
- **Realm:** turn.nextgen.omicx.vn

### 11.4 FreeSWITCH (External)

- **FS01:** 103.149.28.55:5080/TCP (SIP), :8021/TCP (ESL)
- **FS02:** 103.149.28.56:5080/TCP (SIP), :8021/TCP (ESL)
- **SSH:** root / QMFlqyr@n6t3
- **Docker image:** safarov/freeswitch:1.10.12

---

## 12. Firewall (UFW)

| Port | Protocol | Direction | Purpose |
|---|---|---|---|
| 22/tcp | TCP | Inbound | SSH |
| 80/tcp | TCP | Inbound | HTTP → HTTPS redirect |
| 443/tcp | TCP | Inbound | HTTPS (Nginx → Frontend/API/WSS) |
| 3478/udp+tcp | UDP+TCP | Inbound | STUN/TURN |
| 5060/udp+tcp | UDP+TCP | Inbound | SIP (Kamailio) |
| 5061/tcp | TCP | Inbound | SIP TLS |
| 5066/tcp | TCP | Inbound | SIP WSS |
| 5349/tcp | TCP | Inbound | TURNS |
| 9090/tcp | TCP | From FS01/FS02 only | GoACD ESL outbound |
| 20000-30000/udp | UDP | Inbound | RTP media (rtpengine) |
| 49152-65000/udp | UDP | Inbound | TURN relay |
| ALL | ALL | From 103.149.28.55 | FS01 full access |
| ALL | ALL | From 103.149.28.56 | FS02 full access |

---

## 13. Known Issues

| # | Issue | Severity | Status |
|---|---|---|---|
| 1 | ~~sup001 password "Sup@123" is 7 chars~~ | ~~Medium~~ | ✅ **FIXED 2026-03-19** — password updated to "Sup@1234", seed.sql updated |
| 2 | ~~TURN credentials missing in GoACD GetSIPCredentials~~ | ~~High~~ | ✅ **FIXED 2026-03-19** — GoACD now generates ephemeral HMAC-SHA1 TURN credentials (RFC 5389) |
| 3 | **Softphone hooks not wired** — `useCallControl`/`useWebRTC` not imported in any .tsx component | Critical | Sprint 10 tasks |
| 4 | ~~GoACD healthz on :9092 conflicts with Kafka~~ | ~~Low~~ | ✅ **FIXED 2026-03-19** — REST port changed to 9093, /healthz also added on :9091 (API port) |
| 5 | **Duplicate Vite dev server** — port 3000 and 3004 both running agent-desktop | Low | Stop port 3000 instance |
| 6 | **Temporal/Superset/Kibana containers stopped** — not needed for Voice MVP but needed for later phases | Low | Start when needed |

---

## Related Files

- [INDEX.md](./INDEX.md) — Master documentation index
- [19-voice-infra-status.md](./19-voice-infra-status.md) — Voice infra verification + softphone deployment plan
- [VOICE-IMPLEMENTATION-PLAN.md](./VOICE-IMPLEMENTATION-PLAN.md) — Voice channel sprint plan
- [appendix/appendix-d-docker-ports.md](./appendix/appendix-d-docker-ports.md) — Docker port mapping reference
