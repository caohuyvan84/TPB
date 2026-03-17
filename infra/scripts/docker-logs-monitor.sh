#!/bin/bash
# Docker container logs monitor

echo "=== Docker Container Logs Monitor ==="
echo "Monitoring for suspicious activity..."
echo ""

# Monitor PostgreSQL logs
echo "1. PostgreSQL - Last 10 lines:"
docker logs tpb-postgres 2>&1 | tail -10
echo ""

# Monitor Redis logs
echo "2. Redis - Last 5 lines:"
docker logs tpb-redis 2>&1 | tail -5
echo ""

# Monitor Kafka logs
echo "3. Kafka - Last 5 lines:"
docker logs tpb-kafka 2>&1 | tail -5
echo ""

# Check for suspicious patterns
echo "4. Checking for suspicious patterns in logs..."
docker logs tpb-postgres 2>&1 | grep -iE "curl|wget|download|/tmp/mysql|/tmp/init|unauthorized" | tail -5
if [ $? -eq 0 ]; then
    echo "⚠️  WARNING: Suspicious activity detected in PostgreSQL logs!"
else
    echo "✅ No suspicious patterns found"
fi
echo ""

echo "=== End of Log Monitor ==="
