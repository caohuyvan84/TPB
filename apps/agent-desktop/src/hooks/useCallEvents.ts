import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

let ctiSocket: Socket | null = null;
let ctiSocketAgentId: string | null = null;

/** Status change callback for ConnectionHub integration */
type SocketStatusCallback = (status: 'connected' | 'connecting' | 'disconnected') => void;
let statusCallback: SocketStatusCallback | null = null;

export function setCtiSocketStatusCallback(cb: SocketStatusCallback) {
  statusCallback = cb;
}

function getCtiSocket(agentId?: string): Socket {
  // Reconnect if agentId changed (room-based targeting)
  if (ctiSocket && agentId && agentId !== ctiSocketAgentId) {
    ctiSocket.disconnect();
    ctiSocket = null;
  }
  if (!ctiSocket) {
    const wsUrl = import.meta.env.VITE_CTI_WS_URL || window.location.origin;
    ctiSocket = io(`${wsUrl}/cti`, {
      transports: ['websocket'],
      autoConnect: true,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 15000,
      reconnectionAttempts: Infinity,
      timeout: 10000,
      query: agentId ? { agentId } : {},
    });
    ctiSocketAgentId = agentId || null;

    // Connection lifecycle logging + status updates
    ctiSocket.on('connect', () => {
      console.log('[CTI Socket] Connected, id:', ctiSocket?.id);
      statusCallback?.('connected');
    });

    ctiSocket.on('disconnect', (reason) => {
      console.warn('[CTI Socket] Disconnected:', reason);
      statusCallback?.('disconnected');
    });

    ctiSocket.io.on('reconnect_attempt', (attempt) => {
      console.log(`[CTI Socket] Reconnect attempt ${attempt}`);
      statusCallback?.('connecting');
    });

    ctiSocket.io.on('reconnect', (attempt) => {
      console.log(`[CTI Socket] Reconnected after ${attempt} attempts`);
      statusCallback?.('connected');
      // Re-join agent room after reconnect
      if (ctiSocketAgentId) {
        ctiSocket?.emit('join', { agentId: ctiSocketAgentId });
      }
    });

    ctiSocket.io.on('reconnect_failed', () => {
      console.error('[CTI Socket] Reconnect failed (max attempts)');
      statusCallback?.('disconnected');
    });
  }
  return ctiSocket;
}

/** Force reconnect CTI socket (called by network recovery) */
export function forceCtiSocketReconnect() {
  if (ctiSocket) {
    if (!ctiSocket.connected) {
      console.log('[CTI Socket] Force reconnect');
      ctiSocket.connect();
    }
  }
}

export interface CallEvent {
  callId?: string;
  interactionId?: string;
  callerNumber?: string;
  callerName?: string;
  assignedAgent?: string;
  agentId?: string;
  durationMs?: number;
  waitTimeMs?: number;
  channel?: string;
  destination?: string;
  queue?: string;
  ivrSelection?: string;
  score?: number;
  direction?: string;
  reason?: string;
  hangupCause?: string;
  sipCode?: string;
  agentStatus?: string;
}

/**
 * Hook that subscribes to real-time call events from CTI WebSocket gateway.
 * Enhanced with reconnection, room re-join, and heartbeat monitoring.
 */
export function useCallEvents(handlers: {
  onIncomingCall?: (event: CallEvent) => void;
  onCallAnswered?: (event: CallEvent) => void;
  onCallEnded?: (event: CallEvent) => void;
  onCallTransferred?: (event: CallEvent) => void;
  onCallAssigned?: (event: CallEvent) => void;
  onAgentMissed?: (event: CallEvent) => void;
  onOutboundInitiated?: (event: CallEvent) => void;
  onOutboundRinging?: (event: CallEvent) => void;
  onOutboundAgentAnswer?: (event: CallEvent) => void;
  onOutboundFailed?: (event: CallEvent) => void;
}, agentId?: string) {
  // Track last event time for zombie socket detection
  const lastEventTime = useRef(Date.now());

  useEffect(() => {
    const socket = getCtiSocket(agentId);

    const bindings: [string, ((e: CallEvent) => void) | undefined][] = [
      ['call:incoming', handlers.onIncomingCall],
      ['call:answered', handlers.onCallAnswered],
      ['call:ended', handlers.onCallEnded],
      ['call:transferred', handlers.onCallTransferred],
      ['call:assigned', handlers.onCallAssigned],
      ['call:agent_missed', handlers.onAgentMissed],
      ['call:outbound_initiated', handlers.onOutboundInitiated],
      ['call:outbound_ringing', handlers.onOutboundRinging],
      ['call:outbound_agent_answer', handlers.onOutboundAgentAnswer],
      ['call:outbound_failed', handlers.onOutboundFailed],
    ];

    // Wrap handlers to track last event time
    const wrappedBindings: [string, (e: CallEvent) => void][] = [];
    for (const [event, handler] of bindings) {
      if (handler) {
        const wrapped = (e: CallEvent) => {
          lastEventTime.current = Date.now();
          handler(e);
        };
        socket.on(event, wrapped);
        wrappedBindings.push([event, wrapped]);
      }
    }

    // Zombie socket detection: only check if socket says connected but
    // Socket.IO's built-in ping/pong has failed (transport-level).
    // We do NOT force reconnect just because no app-level events arrived —
    // idle periods with no calls are normal.
    // Instead, rely on Socket.IO's own pingTimeout (default 20s) for detection.

    return () => {
      for (const [event, handler] of wrappedBindings) {
        socket.off(event, handler);
      }
    };
  }, [handlers, agentId]);
}
