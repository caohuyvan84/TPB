import { useEffect } from 'react';
import { io, Socket } from 'socket.io-client';

const CTI_WS_URL = import.meta.env.VITE_CTI_WS_URL || 'http://localhost:3019';

let ctiSocket: Socket | null = null;

function getCtiSocket(): Socket {
  if (!ctiSocket) {
    ctiSocket = io(`${CTI_WS_URL}/cti`, {
      transports: ['websocket'],
      autoConnect: true,
    });
  }
  return ctiSocket;
}

export interface CallEvent {
  callId?: string;
  interactionId?: string;
  callerNumber?: string;
  assignedAgent?: string;
  agentId?: string;
  durationMs?: number;
  channel?: string;
  destination?: string;
}

/**
 * Hook that subscribes to real-time call events from CTI WebSocket gateway.
 * Bridges GoACD → Kafka → CTI Adapter → Socket.IO → React state.
 */
export function useCallEvents(handlers: {
  onIncomingCall?: (event: CallEvent) => void;
  onCallAnswered?: (event: CallEvent) => void;
  onCallEnded?: (event: CallEvent) => void;
  onCallTransferred?: (event: CallEvent) => void;
  onCallAssigned?: (event: CallEvent) => void;
}) {
  useEffect(() => {
    const socket = getCtiSocket();

    if (handlers.onIncomingCall) {
      socket.on('call:incoming', handlers.onIncomingCall);
    }
    if (handlers.onCallAnswered) {
      socket.on('call:answered', handlers.onCallAnswered);
    }
    if (handlers.onCallEnded) {
      socket.on('call:ended', handlers.onCallEnded);
    }
    if (handlers.onCallTransferred) {
      socket.on('call:transferred', handlers.onCallTransferred);
    }
    if (handlers.onCallAssigned) {
      socket.on('call:assigned', handlers.onCallAssigned);
    }

    return () => {
      if (handlers.onIncomingCall) socket.off('call:incoming', handlers.onIncomingCall);
      if (handlers.onCallAnswered) socket.off('call:answered', handlers.onCallAnswered);
      if (handlers.onCallEnded) socket.off('call:ended', handlers.onCallEnded);
      if (handlers.onCallTransferred) socket.off('call:transferred', handlers.onCallTransferred);
      if (handlers.onCallAssigned) socket.off('call:assigned', handlers.onCallAssigned);
    };
  }, [handlers]);
}
