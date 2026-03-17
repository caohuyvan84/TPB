#!/bin/bash

# Infrastructure Management Script
# Switch between full and minimal docker-compose setups

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INFRA_DIR="$SCRIPT_DIR/../infra"

case "$1" in
  optimized)
    echo "🔧 Starting optimized infrastructure (resource limited)..."
    
    # Stop all stacks
    cd "$INFRA_DIR"
    docker compose down 2>/dev/null || true
    docker compose -f docker-compose.minimal.yml down 2>/dev/null || true
    docker compose -f docker-compose.basic.yml down 2>/dev/null || true
    
    # Start optimized stack
    docker compose -f docker-compose.optimized.yml up -d
    
    echo "✅ Optimized infrastructure started!"
    echo ""
    echo "📦 All services with resource limits:"
    echo "  - PostgreSQL (256M RAM, 0.5 CPU)"
    echo "  - Redis (128M RAM, 0.25 CPU)"
    echo "  - Kafka (512M RAM, 0.5 CPU)"
    echo "  - Elasticsearch (512M RAM, 0.5 CPU)"
    echo "  - Kong (256M RAM, 0.5 CPU)"
    echo "  - Other services (64-256M RAM each)"
    echo ""
    echo "💾 Total memory usage: ~2.5GB (vs ~8GB unoptimized)"
    ;;
    
  basic)
    echo "🔧 Starting basic infrastructure (PostgreSQL + Redis)..."
    
    # Stop all stacks
    cd "$INFRA_DIR"
    docker compose down 2>/dev/null || true
    docker compose -f docker-compose.minimal.yml down 2>/dev/null || true
    
    # Start basic stack
    docker compose -f docker-compose.basic.yml up -d
    
    echo "✅ Basic infrastructure started!"
    echo ""
    echo "📦 Running services:"
    echo "  - PostgreSQL (port 5432)"
    echo "  - Redis (port 6379)"
    echo ""
    echo "💾 Memory usage: ~100MB"
    echo "⚠️  Note: No API Gateway - services must be accessed directly"
    ;;
    
  minimal)
    echo "🔧 Switching to minimal infrastructure..."
    
    # Stop full stack if running
    cd "$INFRA_DIR"
    docker compose down
    
    # Start minimal stack
    docker compose -f docker-compose.minimal.yml up -d
    
    echo "✅ Minimal infrastructure started!"
    echo ""
    echo "📦 Running services:"
    echo "  - PostgreSQL (port 5432)"
    echo "  - Redis (port 6379)" 
    echo "  - Kong API Gateway (port 8000)"
    echo ""
    echo "💾 Memory usage: ~200MB (vs ~2GB full stack)"
    ;;
    
  full)
    echo "🔧 Switching to full infrastructure..."
    
    # Stop minimal stack if running
    cd "$INFRA_DIR"
    docker compose -f docker-compose.minimal.yml down
    
    # Start full stack
    docker compose up -d
    
    echo "✅ Full infrastructure started!"
    echo ""
    echo "📦 All services running (Kafka, Elasticsearch, etc.)"
    ;;
    
  stop)
    echo "🛑 Stopping all infrastructure..."
    cd "$INFRA_DIR"
    docker compose down 2>/dev/null || true
    docker compose -f docker-compose.minimal.yml down 2>/dev/null || true
    docker compose -f docker-compose.basic.yml down 2>/dev/null || true
    docker compose -f docker-compose.optimized.yml down 2>/dev/null || true
    echo "✅ All infrastructure stopped!"
    ;;
    
  status)
    echo "📊 Infrastructure Status"
    echo "======================="
    cd "$INFRA_DIR"
    
    echo ""
    echo "🔍 Optimized stack:"
    docker compose -f docker-compose.optimized.yml ps
    
    echo ""
    echo "🔍 Basic stack:"
    docker compose -f docker-compose.basic.yml ps
    
    echo ""
    echo "🔍 Minimal stack:"
    docker compose -f docker-compose.minimal.yml ps
    
    echo ""
    echo "🔍 Full stack:"
    docker compose ps
    ;;
    
  *)
    echo "Usage: $0 {optimized|basic|minimal|full|stop|status}"
    echo ""
    echo "Commands:"
    echo "  optimized - Start all services with resource limits (2.5GB RAM)"
    echo "  basic     - Start basic infrastructure (PostgreSQL, Redis only)"
    echo "  minimal   - Start minimal infrastructure (PostgreSQL, Redis, Kong)"
    echo "  full      - Start full infrastructure (all services, no limits)"
    echo "  stop      - Stop all infrastructure"
    echo "  status    - Show current status"
    echo ""
    echo "💡 Use 'optimized' for full features with limited resources"
    exit 1
    ;;
esac
