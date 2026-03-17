<!-- Part of: docs/omnichannel-upgrade/18-voice-platform/ — See README.md for navigation -->

# 18.15 Docker Infrastructure

## docker-compose.yml Configuration

```yaml
# Add to infra/docker-compose.yml

services:
  # ── Kamailio / dSIPRouter ─────────────────────────────
  dsiprouter:
    image: dsiprouter/dsiprouter:latest
    container_name: dsiprouter
    restart: unless-stopped
    ports:
      - "5060:5060/udp"     # SIP UDP
      - "5060:5060/tcp"     # SIP TCP
      - "5061:5061/tcp"     # SIP TLS
      - "5066:5066/tcp"     # WebSocket Secure (WSS) for WebRTC
      - "8443:443"          # dSIPRouter management GUI
    environment:
      - DSIP_DOMAIN=${SIP_DOMAIN:-pbx.tpb.vn}
      - DSIP_SERVERNAT=0
      - DSIP_EXTERNAL_IP=${PUBLIC_IP}
    volumes:
      - dsiprouter-data:/etc/dsiprouter
      - kamailio-config:/etc/kamailio
    depends_on:
      - mariadb-kam
    networks:
      - tpb-network

  # ── MariaDB for Kamailio ────────────────────────────────
  # Shared by all Kamailio instances + GoACD
  # Dev: single instance. Production: Galera Cluster (see §18.9.1.6)
  mariadb-kam:
    image: mariadb:10.11
    container_name: mariadb-kamailio
    restart: unless-stopped
    environment:
      - MYSQL_ROOT_PASSWORD=${KAM_DB_ROOT_PASSWORD}
      - MYSQL_DATABASE=kamailio
      - MYSQL_USER=kamailio
      - MYSQL_PASSWORD=${KAM_DB_PASSWORD}
    volumes:
      - kamailio-db:/var/lib/mysql
    healthcheck:
      test: ["CMD", "healthcheck.sh", "--su-mysql", "--connect", "--innodb_initialized"]
      interval: 10s
      timeout: 5s
      retries: 3
    networks:
      - tpb-network

  # ── rtpengine ──────────────────────────────────────────
  rtpengine:
    image: drachtio/rtpengine:latest
    container_name: rtpengine
    restart: unless-stopped
    network_mode: host          # Cần host networking cho RTP ports
    command: >
      rtpengine
        --interface=${PUBLIC_IP}
        --listen-ng=22222
        --port-min=40000
        --port-max=60000
        --log-level=5
        --delete-delay=30

  # ── FreeSWITCH ─────────────────────────────────────────
  freeswitch:
    image: signalwire/freeswitch:1.10
    container_name: freeswitch
    restart: unless-stopped
    ports:
      - "5080:5080/udp"     # SIP (internal profile, from Kamailio)
      - "5080:5080/tcp"
      - "8021:8021/tcp"     # ESL (Event Socket) — GoACD connects here
      - "16384:32768:16384-32768/udp"  # RTP media range
    environment:
      - FREESWITCH_DEFAULT_PASSWORD=${FS_ESL_PASSWORD}
      - FREESWITCH_DOMAIN=${SIP_DOMAIN:-pbx.tpb.vn}
    volumes:
      - freeswitch-config:/etc/freeswitch
      - freeswitch-recordings:/recordings
      - freeswitch-audio:/audio   # IVR prompts, MOH
    networks:
      - tpb-network

  # ── GoACD Cluster (Leader-Standby) ─────────────────────
  # Both instances run the same binary with leader election via Redis.
  # Only the elected leader binds ESL/gRPC ports. Standby stays warm.
  # FreeSWITCH dialplan connects to goacd-vip:9090 (Docker DNS round-robin).
  # In production (K8s), use a Service with leader-election sidecar.

  goacd-1:
    build:
      context: ./services/goacd
      dockerfile: Dockerfile
    hostname: goacd-1
    restart: unless-stopped
    ports:
      - "9090:9090/tcp"     # Outbound ESL listener (FS connects here) — only active on leader
      - "9091:9091/tcp"     # gRPC server (Omnichannel connects here)
      - "9092:9092/tcp"     # REST API (admin/monitoring)
      - "9093:9093/tcp"     # Prometheus metrics
    environment:
      - GOACD_INSTANCE_ID=goacd-1
      - GOACD_FS_ESL_HOSTS=freeswitch:8021          # comma-separated for multi-FS pool
      - GOACD_FS_ESL_PASSWORD=${FS_ESL_PASSWORD}
      - GOACD_REDIS_URL=redis://redis:6379
      - GOACD_KAFKA_BROKERS=kafka:9092
      - GOACD_PG_URL=postgres://goacd:${GOACD_DB_PASSWORD}@postgres:5432/goacd
      - GOACD_GRPC_PORT=9091
      - GOACD_ESL_LISTEN_PORT=9090
      - GOACD_EXT_RANGE_START=1000
      - GOACD_EXT_RANGE_END=9999
      - GOACD_SIP_DOMAIN=${SIP_DOMAIN:-pbx.tpb.vn}
      - GOACD_KAMAILIO_DB_HOST=mariadb-kam
      - GOACD_KAMAILIO_DB_NAME=kamailio
      - GOACD_LEADER_TTL_MS=10000
      - GOACD_LEADER_RENEW_MS=3000
      - GOACD_CALL_SNAPSHOT_INTERVAL_MS=2000
    depends_on:
      - freeswitch
      - redis
      - kafka
      - postgres
    networks:
      tpb-network:
        aliases:
          - goacd-vip    # Both instances share this alias for FS outbound ESL

  goacd-2:
    build:
      context: ./services/goacd
      dockerfile: Dockerfile
    hostname: goacd-2
    restart: unless-stopped
    ports:
      - "19090:9090/tcp"    # Different host port (standby, usually unused)
      - "19091:9091/tcp"
      - "19092:9092/tcp"
      - "19093:9093/tcp"
    environment:
      - GOACD_INSTANCE_ID=goacd-2
      - GOACD_FS_ESL_HOSTS=freeswitch:8021
      - GOACD_FS_ESL_PASSWORD=${FS_ESL_PASSWORD}
      - GOACD_REDIS_URL=redis://redis:6379
      - GOACD_KAFKA_BROKERS=kafka:9092
      - GOACD_PG_URL=postgres://goacd:${GOACD_DB_PASSWORD}@postgres:5432/goacd
      - GOACD_GRPC_PORT=9091
      - GOACD_ESL_LISTEN_PORT=9090
      - GOACD_EXT_RANGE_START=1000
      - GOACD_EXT_RANGE_END=9999
      - GOACD_SIP_DOMAIN=${SIP_DOMAIN:-pbx.tpb.vn}
      - GOACD_KAMAILIO_DB_HOST=mariadb-kam
      - GOACD_KAMAILIO_DB_NAME=kamailio
      - GOACD_LEADER_TTL_MS=10000
      - GOACD_LEADER_RENEW_MS=3000
      - GOACD_CALL_SNAPSHOT_INTERVAL_MS=2000
    depends_on:
      - freeswitch
      - redis
      - kafka
      - postgres
    networks:
      tpb-network:
        aliases:
          - goacd-vip    # Same alias — FS outbound ESL round-robins to whichever is leader

  # ── coturn (TURN server) ───────────────────────────────
  coturn:
    image: coturn/coturn:latest
    container_name: coturn
    restart: unless-stopped
    ports:
      - "3478:3478/udp"    # STUN/TURN UDP
      - "3478:3478/tcp"    # STUN/TURN TCP
      - "5349:5349/tcp"    # TURN TLS
      - "49152-65535:49152-65535/udp"  # TURN relay ports
    environment:
      - TURN_REALM=turn.tpb.vn
      - TURN_SECRET=${TURN_SECRET}
    networks:
      - tpb-network

volumes:
  dsiprouter-data:
  kamailio-config:
  kamailio-db:
  freeswitch-config:
  freeswitch-recordings:
  freeswitch-audio:
```

## Environment Variables

```env
# dSIPRouter / Kamailio
SIP_DOMAIN=pbx.tpb.vn
PUBLIC_IP=<server-public-ip>
KAM_DB_ROOT_PASSWORD=<encrypted>

# FreeSWITCH
FS_ESL_PASSWORD=<encrypted>

# GoACD
GOACD_DB_PASSWORD=<encrypted>
GOACD_EXT_RANGE_START=1000
GOACD_EXT_RANGE_END=9999

# coturn
TURN_SECRET=<encrypted>
```

## Service Definitions Summary

| Service | Image | Ports (Host:Container) | Purpose |
|---|---|---|---|
| `dsiprouter` | `dsiprouter/dsiprouter:latest` | 5060 (SIP UDP/TCP), 5061 (SIP TLS), 5066 (WSS), 8443 (GUI) | SIP proxy, WebRTC gateway, SIP trunk management |
| `mariadb-kam` | `mariadb:10.11` | (internal only) | Kamailio database (SIP registrations, routing) |
| `rtpengine` | `drachtio/rtpengine:latest` | host networking, ng=22222, RTP 40000-60000 | Media relay (SRTP↔RTP, ICE, codec transcoding) |
| `freeswitch` | `signalwire/freeswitch:1.10` | 5080 (SIP), 8021 (ESL), 16384-32768 (RTP) | Media server (IVR, recording, MOH, conference) |
| `goacd-1` | build: `./services/goacd` | 9090 (ESL), 9091 (gRPC), 9092 (REST), 9093 (metrics) | ACD leader instance |
| `goacd-2` | build: `./services/goacd` | 19090 (ESL), 19091 (gRPC), 19092 (REST), 19093 (metrics) | ACD standby instance |
| `coturn` | `coturn/coturn:latest` | 3478 (STUN/TURN), 5349 (TLS), 49152-65535 (relay) | TURN server for NAT traversal |

## Volume Mounts

| Volume | Mount Path | Purpose |
|---|---|---|
| `dsiprouter-data` | `/etc/dsiprouter` | dSIPRouter configuration persistence |
| `kamailio-config` | `/etc/kamailio` | Kamailio routing scripts and TLS certs |
| `kamailio-db` | `/var/lib/mysql` | MariaDB data for Kamailio |
| `freeswitch-config` | `/etc/freeswitch` | FreeSWITCH configuration (dialplan, profiles, modules) |
| `freeswitch-recordings` | `/recordings` | Call recordings (synced to SeaweedFS by GoACD) |
| `freeswitch-audio` | `/audio` | IVR prompts, music-on-hold files |

## Network Configuration

All voice platform services join the `tpb-network` Docker bridge network, except:

- **rtpengine** uses `network_mode: host` because it needs direct access to RTP ports (40000-60000 UDP) for media relay without Docker NAT overhead.
- Both `goacd-1` and `goacd-2` share the network alias `goacd-vip`, enabling FreeSWITCH to connect via Docker DNS round-robin. Only the elected leader actively accepts ESL connections.

## Health Checks

| Service | Health Check | Interval | Timeout | Retries |
|---|---|---|---|---|
| `mariadb-kam` | `healthcheck.sh --su-mysql --connect --innodb_initialized` | 10s | 5s | 3 |

## Startup Ordering

Services declare `depends_on` to enforce startup order:

1. **mariadb-kam** — starts first (no dependencies)
2. **dsiprouter** — depends on `mariadb-kam`
3. **freeswitch** — starts independently
4. **rtpengine** — starts independently (host networking)
5. **coturn** — starts independently
6. **goacd-1**, **goacd-2** — depend on `freeswitch`, `redis`, `kafka`, `postgres`

Note: `redis`, `kafka`, and `postgres` are defined in the main `infra/docker-compose.yml` and are shared platform infrastructure services.

---

## Related Files

- [18-13-error-resilience.md](./18-13-error-resilience.md) — Error Handling & Resilience
- [18-14-performance-ops.md](./18-14-performance-ops.md) — Performance, Resource Management & Operational Hardening
