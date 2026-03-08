# Task 5 Checkpoint: Infrastructure Verification

**Date:** March 8, 2026  
**Status:** ⚠️ MANUAL VERIFICATION REQUIRED

## Prerequisites

Before running verification:
1. Install Docker 24+ and Docker Compose v2+
2. Copy `.env.example` to `infra/.env`
3. Ensure ports are available (5432, 6379, 9092, etc.)

## Verification Steps

### Step 1: Start Infrastructure

```bash
cd infra
docker compose up -d
```

Expected output:
```
✔ Network tpb-network          Created
✔ Volume "infra_postgres_data" Created
✔ Volume "infra_redis_data"    Created
... (all volumes created)
✔ Container tpb-postgres       Started
✔ Container tpb-redis          Started
... (all containers started)
```

### Step 2: Check Service Health

```bash
docker compose ps
```

Expected output - ALL services should show "healthy":
```
NAME                STATUS              PORTS
tpb-postgres        Up (healthy)        0.0.0.0:5432->5432/tcp
tpb-redis           Up (healthy)        0.0.0.0:6379->6379/tcp
tpb-kafka           Up (healthy)        0.0.0.0:9092->9092/tcp
tpb-kafka-ui        Up                  0.0.0.0:9000->8080/tcp
tpb-elasticsearch   Up (healthy)        0.0.0.0:9200->9200/tcp
tpb-kibana          Up                  0.0.0.0:5601->5601/tcp
tpb-seaweedfs       Up                  0.0.0.0:8333->8333/tcp, 0.0.0.0:9333->9333/tcp
tpb-temporal        Up                  0.0.0.0:7233->7233/tcp
tpb-temporal-ui     Up                  0.0.0.0:8233->8080/tcp
tpb-superset        Up                  0.0.0.0:8088->8088/tcp
tpb-mailhog         Up                  0.0.0.0:1025->1025/tcp, 0.0.0.0:8025->8025/tcp
```

### Step 3: Verify PostgreSQL Databases

```bash
docker exec -it tpb-postgres psql -U postgres -c "\l"
```

Expected: Should list all 19 databases:
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

### Step 4: Test Service Connectivity

#### PostgreSQL
```bash
docker exec -it tpb-postgres psql -U postgres -c "SELECT version();"
```
Expected: PostgreSQL 18.x version info

#### Redis
```bash
docker exec -it tpb-redis redis-cli ping
```
Expected: `PONG`

#### Kafka
```bash
docker exec -it tpb-kafka kafka-broker-api-versions.sh --bootstrap-server localhost:9092
```
Expected: List of API versions

#### Elasticsearch
```bash
curl http://localhost:9200/_cluster/health
```
Expected: JSON with `"status":"green"` or `"status":"yellow"`

### Step 5: Access Web UIs

Open in browser and verify:

- ✅ Kafka UI: http://localhost:9000
- ✅ Kibana: http://localhost:5601
- ✅ Temporal UI: http://localhost:8233
- ✅ Superset: http://localhost:8088
- ✅ MailHog: http://localhost:8025

### Step 6: Check Logs

```bash
# Check for errors in logs
docker compose logs | grep -i error

# View specific service logs
docker compose logs postgres
docker compose logs kafka
```

Expected: No critical errors

## Verification Checklist

- [ ] All 11 containers started successfully
- [ ] All services show "healthy" status (where applicable)
- [ ] PostgreSQL has all 19 databases created
- [ ] PostgreSQL connection works
- [ ] Redis responds to PING
- [ ] Kafka broker is accessible
- [ ] Elasticsearch cluster is healthy
- [ ] All web UIs are accessible
- [ ] No critical errors in logs
- [ ] Data volumes are created

## Troubleshooting

### Port Conflicts
If ports are in use:
```bash
# Check what's using a port
lsof -i :5432
# or
netstat -tulpn | grep 5432
```

Solution: Update ports in `.env` file

### Service Not Healthy
Check logs:
```bash
docker compose logs <service-name>
```

Common issues:
- Insufficient memory (increase Docker memory limit)
- Port conflicts
- Volume permission issues

### Reset Everything
```bash
docker compose down -v
docker compose up -d
```

## Exit Criteria

✅ All services started  
✅ All health checks passing  
✅ 19 databases created  
✅ All connectivity tests passed  
✅ All web UIs accessible  
✅ No critical errors  

## Status

⚠️ **MANUAL VERIFICATION REQUIRED**

Docker is not available in the current environment. User must:
1. Install Docker and Docker Compose
2. Run verification steps above
3. Confirm all checks pass
4. Proceed to Task 6

## Next Steps

After verification passes:
- **Task 6:** NestJS Microservices Scaffold (19 services)

## Notes

- First startup may take 2-5 minutes for all services to be healthy
- Elasticsearch requires at least 2GB RAM
- Kafka may take 30-60 seconds to be fully ready
- Temporal needs PostgreSQL to be healthy first

---

**Checkpoint Status:** ⚠️ Awaiting manual verification by user
