import { io, Socket } from 'socket.io-client';

interface NotificationEvent {
  type: 'new' | 'updated' | 'deleted';
  notification: any;
}

class NotificationChannel {
  private socket: Socket | null = null;
  private agentId: string | null = null;

  connect(agentId: string, token: string) {
    if (this.socket?.connected && this.agentId === agentId) {
      return;
    }

    this.disconnect();
    this.agentId = agentId;

    this.socket = io(`${import.meta.env.VITE_WS_URL || 'ws://localhost:3006'}`, {
      auth: { token },
      transports: ['websocket'],
    });

    this.socket.on('connect', () => {
      console.log('[NotificationChannel] Connected');
      this.socket?.emit('notification:subscribe', { agentId });
    });

    this.socket.on('disconnect', () => {
      console.log('[NotificationChannel] Disconnected');
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.agentId = null;
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
