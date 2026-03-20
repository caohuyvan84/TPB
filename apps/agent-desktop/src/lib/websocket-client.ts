import { io, Socket } from 'socket.io-client';

// General agent WebSocket client.
// Currently disabled: no backend service serves the root Socket.IO namespace.
// Agent real-time events (queue, heartbeat) will be wired when Agent Service WS gateway is ready.
// CTI call events use a separate socket in useCallEvents.ts (/cti namespace).

class WebSocketClient {
  private socket: Socket | null = null;
  private _enabled = false; // Disabled until Agent Service WS gateway is implemented

  connect(token: string) {
    if (!this._enabled) return; // No-op until backend is ready
    if (this.socket?.connected) return;

    const wsUrl = import.meta.env.VITE_WS_URL || '';
    this.socket = io(wsUrl, {
      auth: { token },
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 2000,
      reconnectionDelayMax: 10000,
      reconnectionAttempts: 3,
    });

    this.socket.on('connect', () => {
      console.log('[wsClient] Connected');
    });

    this.socket.on('disconnect', () => {
      console.log('[wsClient] Disconnected');
    });

    this.socket.on('connect_error', (error) => {
      console.warn('[wsClient] Connection error (non-critical):', error.message);
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  emit(event: string, data: unknown) {
    if (this.socket?.connected) {
      this.socket.emit(event, data);
    }
  }

  on(event: string, callback: (data: unknown) => void) {
    if (this.socket) {
      this.socket.on(event, callback);
    }
  }

  off(event: string, callback?: (data: unknown) => void) {
    if (this.socket) {
      this.socket.off(event, callback);
    }
  }

  get isConnected() {
    return this.socket?.connected ?? false;
  }
}

export const wsClient = new WebSocketClient();
