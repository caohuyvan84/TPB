#!/bin/bash
set -e

echo "🚀 Setting up Kong for all Phase 2 services..."
echo ""

cd "$(dirname "$0")"

./setup-kong-knowledge.sh
echo ""
./setup-kong-bfsi.sh
echo ""
./setup-kong-ai.sh
echo ""
./setup-kong-media.sh
echo ""
./setup-kong-audit.sh
echo ""
./setup-kong-schema.sh
echo ""
./setup-kong-layout.sh
echo ""
./setup-kong-cti.sh

echo ""
echo "✅ All Phase 2 services configured in Kong"
