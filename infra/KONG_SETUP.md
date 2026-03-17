# Kong API Gateway Setup

Kong API Gateway is configured as the entry point for all microservices in the TPB CRM Platform.

## Quick Start

### 1. Start Kong Services

```bash
cd infra
docker compose up -d kong-database kong-migration kong
```

### 2. Verify Kong is Running

```bash
curl http://localhost:8001
```

You should see Kong version information.

### 3. Configure Identity Service

```bash
./scripts/setup-kong-identity.sh
```

This script will:
- Register Identity Service with Kong
- Create routes for authentication endpoints
- Enable rate limiting (100 req/min)
- Enable CORS for frontend

## Kong Endpoints

- **Proxy**: http://localhost:8000 (public-facing)
- **Admin API**: http://localhost:8001 (internal only)

## Configured Routes

### Identity Service Routes

All routes are proxied through Kong at port 8000:

| Method | Kong URL | Backend URL |
|---|---|---|
| POST | http://localhost:8000/api/v1/auth/login | http://localhost:3001/api/v1/auth/login |
| POST | http://localhost:8000/api/v1/auth/refresh | http://localhost:3001/api/v1/auth/refresh |
| POST | http://localhost:8000/api/v1/auth/logout | http://localhost:3001/api/v1/auth/logout |
| POST | http://localhost:8000/api/v1/auth/mfa/verify | http://localhost:3001/api/v1/auth/mfa/verify |
| GET | http://localhost:8000/api/v1/users/me | http://localhost:3001/api/v1/users/me |

## Enabled Plugins

### Rate Limiting
- **Limit**: 100 requests per minute per consumer
- **Policy**: Local (in-memory)

### CORS
- **Allowed Origins**: http://localhost:3000
- **Allowed Methods**: GET, POST, PUT, DELETE, OPTIONS
- **Allowed Headers**: Accept, Authorization, Content-Type
- **Credentials**: Enabled
- **Max Age**: 3600 seconds

## Managing Kong

### View All Services

```bash
curl http://localhost:8001/services
```

### View All Routes

```bash
curl http://localhost:8001/routes
```

### View Service Routes

```bash
curl http://localhost:8001/services/identity-service/routes
```

### View Plugins

```bash
curl http://localhost:8001/plugins
```

### Delete a Service

```bash
curl -X DELETE http://localhost:8001/services/identity-service
```

## Adding New Services

To add a new microservice to Kong:

1. Create the service:
```bash
curl -X POST http://localhost:8001/services/ \
  --data "name=my-service" \
  --data "url=http://host.docker.internal:3002"
```

2. Create routes:
```bash
curl -X POST http://localhost:8001/services/my-service/routes \
  --data "name=my-route" \
  --data "paths[]=/api/v1/my-service" \
  --data "strip_path=false"
```

3. Enable plugins (optional):
```bash
curl -X POST http://localhost:8001/services/my-service/plugins \
  --data "name=rate-limiting" \
  --data "config.minute=100"
```

## Troubleshooting

### Kong not starting

Check Kong database is healthy:
```bash
docker ps --filter name=tpb-kong-db
```

Check Kong logs:
```bash
docker logs tpb-kong
```

### Routes not working

Verify service is registered:
```bash
curl http://localhost:8001/services/identity-service
```

Verify routes exist:
```bash
curl http://localhost:8001/services/identity-service/routes
```

### Backend service unreachable

From inside Kong container, test backend:
```bash
docker exec tpb-kong curl http://host.docker.internal:3001/health
```

## Architecture

```
┌─────────────┐
│   Frontend  │
│ localhost:  │
│    3000     │
└──────┬──────┘
       │
       │ HTTP
       ▼
┌─────────────┐
│    Kong     │
│  Proxy      │
│ localhost:  │
│    8000     │
└──────┬──────┘
       │
       │ Load Balance
       │ Rate Limit
       │ CORS
       │
       ▼
┌─────────────┐
│  Identity   │
│  Service    │
│ localhost:  │
│    3001     │
└─────────────┘
```

## Security Notes

- Kong Admin API (port 8001) should NOT be exposed in production
- Use Kong's authentication plugins (JWT, OAuth2) in production
- Enable mTLS between Kong and backend services in production
- Use Kong's ACL plugin for fine-grained access control

## References

- [Kong Documentation](https://docs.konghq.com/)
- [Kong Admin API Reference](https://docs.konghq.com/gateway/latest/admin-api/)
- [Kong Plugins](https://docs.konghq.com/hub/)
