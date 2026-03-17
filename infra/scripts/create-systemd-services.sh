#!/bin/bash

SERVICES=(
  "identity:3001"
  "agent:3002"
  "interaction:3003"
  "ticket:3004"
  "customer:3005"
  "notification:3006"
  "knowledge:3007"
  "bfsi-core:3008"
  "ai:3009"
  "media:3010"
  "audit:3011"
  "object-schema:3013"
  "layout:3014"
  "workflow:3015"
  "data-enrichment:3016"
  "dashboard:3017"
  "report:3018"
  "cti-adapter:3019"
)

PROJECT_DIR="/opt/project/AgentdesktopTPB"
SYSTEMD_DIR="$PROJECT_DIR/infra/systemd"

mkdir -p $SYSTEMD_DIR
mkdir -p $PROJECT_DIR/logs

for service_info in "${SERVICES[@]}"; do
  IFS=':' read -r service port <<< "$service_info"
  
  cat > "$SYSTEMD_DIR/tpb-${service}.service" << SERVICEEOF
[Unit]
Description=TPB ${service^} Service
After=network.target postgresql.service redis.service

[Service]
Type=simple
User=root
WorkingDirectory=$PROJECT_DIR
Environment="NODE_ENV=production"
Environment="PORT=$port"
ExecStart=/usr/bin/npx nx run ${service}-service:serve
Restart=always
RestartSec=10
StandardOutput=append:$PROJECT_DIR/logs/${service}-service.log
StandardError=append:$PROJECT_DIR/logs/${service}-service.log

[Install]
WantedBy=multi-user.target
SERVICEEOF

  echo "✅ Created tpb-${service}.service"
done

echo ""
echo "📋 Installing services..."
for service_info in "${SERVICES[@]}"; do
  IFS=':' read -r service port <<< "$service_info"
  cp "$SYSTEMD_DIR/tpb-${service}.service" /etc/systemd/system/
done

systemctl daemon-reload
echo "✅ Systemd daemon reloaded"

echo ""
echo "🚀 To enable and start all services:"
echo "   sudo systemctl enable tpb-{identity,agent,interaction,ticket,customer,notification}.service"
echo "   sudo systemctl start tpb-{identity,agent,interaction,ticket,customer,notification}.service"
echo ""
echo "📊 To check status:"
echo "   sudo systemctl status tpb-identity"
echo ""
echo "📋 To view logs:"
echo "   journalctl -u tpb-identity -f"
