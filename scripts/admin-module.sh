#!/bin/bash

# Admin Module Development Script
# Chạy admin module ở background với public IP access

ADMIN_PORT=3020
PID_FILE="/tmp/admin-module.pid"
LOG_FILE="logs/admin-module.log"

# Tạo logs directory nếu chưa có
mkdir -p logs

case "$1" in
  start)
    if [ -f "$PID_FILE" ] && kill -0 $(cat "$PID_FILE") 2>/dev/null; then
      echo "❌ Admin module đã chạy (PID: $(cat $PID_FILE))"
      echo "🌐 URL: http://0.0.0.0:$ADMIN_PORT"
      exit 1
    fi
    
    echo "🚀 Starting admin module on port $ADMIN_PORT..."
    
    # Chạy admin module với public IP (từ thư mục gốc)
    (cd apps/admin-module && npx vite --host 0.0.0.0 --port $ADMIN_PORT) > "$LOG_FILE" 2>&1 &
    VITE_PID=$!
    
    # Lưu PID
    echo $VITE_PID > "$PID_FILE"
    
    echo "✅ Admin module started!"
    echo "🌐 Local: http://localhost:$ADMIN_PORT"
    echo "🌐 Network: http://0.0.0.0:$ADMIN_PORT"
    echo "📝 Logs: tail -f $LOG_FILE"
    echo "🔧 PID: $VITE_PID"
    ;;
    
  stop)
    if [ -f "$PID_FILE" ]; then
      PID=$(cat "$PID_FILE")
      if kill -0 "$PID" 2>/dev/null; then
        kill "$PID"
        rm -f "$PID_FILE"
        echo "✅ Admin module stopped (PID: $PID)"
      else
        echo "❌ Admin module not running"
        rm -f "$PID_FILE"
      fi
    else
      echo "❌ Admin module not running (no PID file)"
    fi
    ;;
    
  restart)
    $0 stop
    sleep 2
    $0 start
    ;;
    
  status)
    if [ -f "$PID_FILE" ] && kill -0 $(cat "$PID_FILE") 2>/dev/null; then
      echo "✅ Admin module running (PID: $(cat $PID_FILE))"
      echo "🌐 URL: http://0.0.0.0:$ADMIN_PORT"
      echo "📝 Logs: tail -f $LOG_FILE"
    else
      echo "❌ Admin module not running"
    fi
    ;;
    
  logs)
    if [ -f "$LOG_FILE" ]; then
      tail -f "$LOG_FILE"
    else
      echo "❌ No log file found"
    fi
    ;;
    
  *)
    echo "Usage: $0 {start|stop|restart|status|logs}"
    echo ""
    echo "Commands:"
    echo "  start   - Start admin module on port $ADMIN_PORT"
    echo "  stop    - Stop admin module"
    echo "  restart - Restart admin module"
    echo "  status  - Check admin module status"
    echo "  logs    - Show admin module logs"
    echo ""
    echo "URLs:"
    echo "  Local:   http://localhost:$ADMIN_PORT"
    echo "  Network: http://0.0.0.0:$ADMIN_PORT"
    exit 1
    ;;
esac
