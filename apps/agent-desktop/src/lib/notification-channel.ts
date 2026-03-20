import { io, Socket } from 'socket.io-client';

interface NotificationEvent {
  type: 'new' | 'updated' | 'deleted';
  notification: any;
}

type StatusCallback = (status: 'connected' | 'connecting' | 'disconnected') => void;

class NotificationChannel {
  private socket: Socket | null = null;
  private agentId: string | null = null;
  private statusCallback: StatusCallback | null = null;

  setStatusCallback(cb: StatusCallback) {
    this.statusCallback = cb;
  }

  connect(agentId: string, token: string) {
    if (this.socket?.connected && this.agentId === agentId) {
      return;
    }

    this.disconnect();
    this.agentId = agentId;

    this.socket = io(`${import.meta.env.VITE_WS_URL || window.location.origin}`, {
      auth: { token },
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 15000,
      reconnectionAttempts: Infinity,
      timeout: 10000,
    });

    this.socket.on('connect', () => {
      console.log('[NotificationChannel] Connected');
      this.socket?.emit('notification:subscribe', { agentId });
      this.statusCallback?.('connected');
    });

    this.socket.on('disconnect', (reason) => {
      console.log('[NotificationChannel] Disconnected:', reason);
      this.statusCallback?.('disconnected');
    });

    this.socket.io.on('reconnect_attempt', () => {
      this.statusCallback?.('connecting');
    });

    this.socket.io.on('reconnect', () => {
      console.log('[NotificationChannel] Reconnected, re-subscribing');
      // Re-subscribe after reconnect
      this.socket?.emit('notification:subscribe', { agentId });
      this.statusCallback?.('connected');
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.agentId = null;
    }
  }

  /** Force reconnect (called by network recovery) */
  forceReconnect() {
    if (this.socket && !this.socket.connected) {
      console.log('[NotificationChannel] Force reconnect');
      this.socket.connect();
    }
  }

  onNotification(callback: (event: NotificationEvent) => void) {
    this.socket?.on('notification:new', (notification) => {
      callback({ type: 'new', notification });
    });

    this.socket?.on('notification:updated', (notification) => {
      callback({ type: 'updated', notification });
    });

    this.socket?.on('notification:deleted', (notificationId) => {
      callback({ type: 'deleted', notification: { id: notificationId } });
    });
  }

  offNotification() {
    this.socket?.off('notification:new');
    this.socket?.off('notification:updated');
    this.socket?.off('notification:deleted');
  }
}

export const notificationChannel = new NotificationChannel();
