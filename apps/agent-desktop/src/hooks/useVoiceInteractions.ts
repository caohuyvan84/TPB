import { useState, useEffect } from 'react';
import { useCallEvents, CallEvent } from './useCallEvents';

export interface VoiceInteraction {
  interactionId: string;
  callId?: string;
  callerNumber?: string;
  customerName?: string;
  agentId?: string;
  state: 'ringing' | 'connected' | 'ended';
  startedAt: Date;
  channel: 'voice';
}

/**
 * Tracks active voice interactions from real-time WebSocket events.
 * Used by InteractionList to show live call state badges.
 */
export function useVoiceInteractions() {
  const [interactions, setInteractions] = useState<Map<string, VoiceInteraction>>(new Map());

  useCallEvents({
    onIncomingCall: (event: CallEvent) => {
      if (!event.interactionId) return;
      setInteractions((prev) => {
        const next = new Map(prev);
        next.set(event.interactionId!, {
          interactionId: event.interactionId!,
          callId: event.callId,
          callerNumber: event.callerNumber,
          customerName: undefined,
          agentId: event.agentId,
          state: 'ringing',
          startedAt: new Date(),
          channel: 'voice',
        });
        return next;
      });
    },

    onCallAssigned: (event: CallEvent) => {
      if (!event.interactionId) return;
      setInteractions((prev) => {
        const next = new Map(prev);
        const existing = next.get(event.interactionId!);
        if (existing) {
          next.set(event.interactionId!, { ...existing, agentId: event.agentId, state: 'ringing' });
        }
        return next;
      });
    },

    onCallAnswered: (event: CallEvent) => {
      const id = event.interactionId || event.callId;
      if (!id) return;
      setInteractions((prev) => {
        const next = new Map(prev);
        const existing = next.get(id);
        if (existing) {
          next.set(id, { ...existing, state: 'connected' });
        }
        return next;
      });
    },

    onCallEnded: (event: CallEvent) => {
      const id = event.interactionId || event.callId;
      if (!id) return;
      setInteractions((prev) => {
        const next = new Map(prev);
        next.delete(id);
        return next;
      });
    },
  });

  return {
    voiceInteractions: Array.from(interactions.values()),
    activeCallCount: interactions.size,
  };
}
