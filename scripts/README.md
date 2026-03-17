# Development Scripts

Scripts để quản lý services trong background mà không làm stuck Kiro CLI.

## 🚀 Quick Start

```bash
# Start tất cả (infrastructure + backend + frontend)
./scripts/dev.sh start

# Check status
./scripts/dev.sh status

# Stop tất cả
./scripts/dev.sh stop

# Restart tất cả
./scripts/dev.sh restart
```

## 📋 Individual Scripts

### Backend Services

```bash
# Start all backend services
./scripts/start-services.sh

# Stop all backend services
./scripts/stop-services.sh

# Check backend service status
./scripts/check-services.sh
```

### Frontend

```bash
# Start frontend dev server
./scripts/start-frontend.sh

# Stop frontend dev server
./scripts/stop-frontend.sh
```

## 📁 File Locations

- **Logs:** `/opt/project/AgentdesktopTPB/logs/`
- **PIDs:** `/tmp/tpb-services/`

## 🔍 View Logs

```bash
# Frontend logs
tail -f logs/frontend.log

# Backend service logs
tail -f logs/identity-service.log
tail -f logs/customer-service.log
tail -f logs/ticket-service.log

# All logs
tail -f logs/*.log
```

## 🛑 Stop Individual Service

```bash
# Find PID
cat /tmp/tpb-services/identity-service.pid

# Kill process
kill $(cat /tmp/tpb-services/identity-service.pid)
```

## ⚠️ Important Notes

1. **All services run in background** - Kiro CLI won't be blocked
2. **Logs are saved** - Check `logs/` directory for output
3. **PIDs are tracked** - Easy to stop services later
4. **Auto-restart** - Services don't auto-restart on crash (use PM2 for production)

## 🔧 Troubleshooting

### Service won't start

```bash
# Check logs
tail -f logs/<service-name>.log

# Check if port is in use
lsof -i :3001  # Replace with service port

# Kill stuck process
kill -9 $(lsof -t -i :3001)
```

### Clean up everything

```bash
# Stop all services
./scripts/dev.sh stop

# Remove PID files
rm -rf /tmp/tpb-services

# Remove logs
rm -rf logs/*.log
```

## 📊 Service Ports

| Service | Port |
|---------|------|
| Frontend | 3000 |
| Identity | 3001 |
| Agent | 3002 |
| Interaction | 3003 |
| Ticket | 3004 |
| Customer | 3005 |
| Notification | 3006 |
| Knowledge | 3007 |
| BFSI | 3008 |
| AI | 3009 |
| Media | 3010 |
| Audit | 3011 |
| Object Schema | 3013 |
| Layout | 3014 |
| Workflow | 3015 |
| Data Enrichment | 3016 |
| Dashboard | 3017 |
| Report | 3018 |
| CTI Adapter | 3019 |

## 🐳 Docker Infrastructure

```bash
# Start infrastructure only
cd infra
docker compose up -d

# Check status
docker compose ps

# Stop infrastructure
docker compose down
```
