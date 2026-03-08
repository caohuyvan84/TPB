# Infrastructure Setup

## Prerequisites

- Docker 24+ installed
- Docker Compose v2+ installed

## Quick Start

```bash
# Start all infrastructure services
cd infra
docker compose up -d

# Check service health
docker compose ps

# View logs
docker compose logs -f

# Stop all services
docker compose down

# Stop and remove volumes (clean slate)
docker compose down -v
```

## Services

| Service | Port | UI/Access | Purpose |
|---------|------|-----------|---------|
| PostgreSQL | 5432 | - | Primary database (19 databases) |
| Redis | 6379 | - | Cache, session store |
| Kafka | 9092 | - | Event streaming (KRaft mode) |
| Kafka UI | 9000 | http://localhost:9000 | Kafka management |
| Elasticsearch | 9200 | - | Full-text search |
| Kibana | 5601 | http://localhost:5601 | Elasticsearch UI |
| SeaweedFS | 8333, 9333 | - | S3-compatible storage |
| Temporal | 7233 | - | Workflow engine |
| Temporal UI | 8233 | http://localhost:8233 | Temporal Web UI |
| Superset | 8088 | http://localhost:8088 | BI reporting |
| MailHog | 1025, 8025 | http://localhost:8025 | SMTP testing |

## Database Initialization

The `init-db.sh` script automatically creates 19 databases on first startup:

- identity_db
- agent_db
- interaction_db
- ticket_db
- customer_db
- notification_db
- knowledge_db
- bfsi_core_db
- ai_db
- media_db
- audit_db
- object_schema_db
- layout_db
- workflow_db
- data_enrichment_db
- dashboard_db
- report_db
- cti_adapter_db
- api_gateway_db

## Health Checks

All services have health checks configured. Wait for all services to be healthy:

```bash
# Check health status
docker compose ps

# All services should show "healthy" status
```

## Troubleshooting

### Port conflicts
If ports are already in use, update `.env` file with different ports.

### Service not starting
Check logs:
```bash
docker compose logs <service-name>
```

### Reset everything
```bash
docker compose down -v
docker compose up -d
```

## Development Mode

Use `docker-compose.dev.yml` for development overrides:

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d
```

## Environment Variables

Copy `.env.example` to `.env` and update values:

```bash
cp ../.env.example .env
```

## Next Steps

After infrastructure is running:
1. Verify all services are healthy
2. Proceed to Task 6: NestJS Microservices Scaffold
