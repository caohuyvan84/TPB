#!/bin/bash
# GoACD startup script
cd /opt/project/AgentdesktopTPB/services/goacd

# Kill existing process
pkill -f './goacd' 2>/dev/null
sleep 1
fuser -k 9090/tcp 9091/tcp 9093/tcp 2>/dev/null
sleep 1

# Load env
set -a
source .env
set +a

# Build if needed
if [ "$1" = "--build" ]; then
  echo "Building GoACD..."
  go build -o goacd ./cmd/goacd/ || exit 1
fi

# Start
echo "Starting GoACD..."
nohup ./goacd > /tmp/goacd.log 2>&1 &
echo "GoACD PID: $!"

sleep 2
tail -5 /tmp/goacd.log
echo ""
curl -s http://localhost:9091/healthz | python3 -m json.tool
