import { io, Socket } from 'socket.io-client';

interface CallEvent {
  type: 'incoming' | 'answered' | 'ended' | 'transferred' | 'held' | 'resumed';
  callId: string;
  agentId: string;
  customerNumber?: string;
  timestamp: string;
  data?: Record<string, any>;
}

class CtiChannel {
  private socket: Socket | null = null;
  private agentId: string | null = null;

  connect(agentId: string, token: string) {
    if (this.socket?.connected && this.agentId === agentId) {
      return;
    }

    this.disconnect();
    this.agentId = agentId;

    this.socket = io(`${import.meta.env.VITE_WS_URL || 'ws://localhost:3019'}`, {
      auth: { token },
      transports: ['websocket'],
    });

    this.socket.on('connect', () => {
      console.log('[CtiChannel] Connected');
      this.socket?.emit('cti:subscribe', { agentId });
    });

    this.socket.on('disconnect', () => {
      console.log('[CtiChannel] Disconnected');
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.agentId = null;
    }
  }

  onCallEvent(callback: (event: CallEvent) => void) {
    this.socket?.on('call:incoming', (data) => {
      callback({ type: 'incoming', ...data });
    });

    this.socket?.on('call:answered', (data) => {
      callback({ type: 'answered', ...data });
    });

    this.socket?.on('call:ended', (data) => {
      callback({ type: 'ended', ...data });
    });

    this.socket?.on('call:transferred', (data) => {
      callback({ type: 'transferred', ...data });
    });

    this.socket?.on('call:held', (data) => {
      callback({ type: 'held', ...data });
    });

    this.socket?.on('call:resumed', (data) => {
      callback({ type: 'resumed', ...data });
    });
  }

  offCallEvent() {
    this.socket?.off('call:incoming');
    this.socket?.off('call:answered');
    this.socket?.off('call:ended');
    this.socket?.off('call:transferred');
    this.socket?.off('call:held');
    this.socket?.off('call:resumed');
  }

  // Send call control commands
  answerCall(callId: string) {
    this.socket?.emit('call:answer', { callId });
  }

  hangupCall(callId: string) {
    this.socket?.emit('call:hangup', { callId });
  }

  holdCall(callId: string) {
    this.socket?.emit('call:hold', { callId });
  }

  resumeCall(callId: string) {
    this.socket?.emit('call:resume', { callId });
  }

  transferCall(callId: string, targetNumber: string, type: 'blind' | 'attended' = 'blind') {
    this.socket?.emit('call:transfer', { callId, targetNumber, type });
  }
}

export const ctiChannel = new CtiChannel();
