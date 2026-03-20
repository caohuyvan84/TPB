import { useCallback, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useWebRTC } from './useWebRTC';
import { useCallEvents, setCtiSocketStatusCallback } from './useCallEvents';
import { ctiApi } from '@/lib/cti-api';
import { interactionKeys } from './useInteractionsApi';
import { useConnectionStatus } from '@/contexts/ConnectionHubContext';
import type { WebRtcStatus } from '@/lib/webrtc-service';

/**
 * Unified call control hook combining WebRTC (SIP.js) + CTI API + real-time events.
 * Integrates with ConnectionHub for unified connection status tracking.
 */
export function useCallControl(agentId: string | undefined) {
  const webrtc = useWebRTC(agentId);
  const queryClient = useQueryClient();

  // Wire connection status to ConnectionHub
  let connHub: ReturnType<typeof useConnectionStatus> | null = null;
  try { connHub = useConnectionStatus(); } catch { /* not in provider yet */ }

  // Update SIP status in ConnectionHub
  useEffect(() => {
    if (!connHub) return;
    const sipMap: Record<WebRtcStatus, 'connected' | 'connecting' | 'disconnected' | 'error'> = {
      registered: 'connected',
      connecting: 'connecting',
      disconnected: 'disconnected',
      error: 'error',
    };
    connHub.updateConnection('sip', sipMap[webrtc.status] || 'disconnected');
  }, [webrtc.status]);

  // Wire CTI Socket status to ConnectionHub
  useEffect(() => {
    if (!connHub) return;
    setCtiSocketStatusCallback((status) => {
      connHub!.updateConnection('ctiSocket', status === 'connected' ? 'connected' : status === 'connecting' ? 'connecting' : 'disconnected');
    });
  }, [connHub]);

  // Invalidate interaction list to show new/updated interactions immediately
  const refreshInteractions = () => {
    queryClient.invalidateQueries({ queryKey: interactionKeys.lists() });
  };

  // Wire real-time events from CTI WebSocket (GoACD → Kafka → CTI Adapter → Socket.IO)
  useCallEvents({
    onIncomingCall: (event) => {
      console.log('[CallControl] incoming (call.routing):', event);
      setTimeout(refreshInteractions, 500);
    },
    onCallAnswered: (event) => {
      console.log('[CallControl] answered:', event);
      refreshInteractions();
    },
    onCallEnded: (event) => {
      console.log('[CallControl] ended:', event);
      // Force-terminate local SIP session immediately (SIP BYE only, no CTI API call to avoid loop)
      try { webrtc.hangupCall(); } catch { /* session may already be gone */ }
      refreshInteractions();
    },
    onCallAssigned: (event) => {
      console.log('[CallControl] assigned:', event);
    },
    onOutboundInitiated: (event) => {
      console.log('[CallControl] outbound initiated:', event);
    },
    onOutboundRinging: (event) => {
      console.log('[CallControl] outbound ringing:', event);
    },
    onOutboundAgentAnswer: (event) => {
      console.log('[CallControl] outbound agent answer:', event);
    },
    onAgentMissed: (event) => {
      console.log('[CallControl] agent missed:', event);
    },
    onOutboundFailed: (event) => {
      console.log('[CallControl] outbound failed:', event);
    },
  }, agentId);

  /** Make outbound call via GoACD. */
  const dial = useCallback(async (destination: string) => {
    if (!agentId) throw new Error('No agent ID');
    const resp = await ctiApi.makeCall({ agentId, destination });
    return resp.callId || '';
  }, [agentId]);

  /** Answer incoming call. */
  const answer = useCallback(async () => {
    await webrtc.answerCall();
  }, [webrtc.answerCall]);

  /** Hang up current call — SIP BYE + CTI API hangup by agentId. */
  const hangup = useCallback(async () => {
    try { await webrtc.hangupCall(); } catch { /* SIP session may already be gone */ }
    if (agentId) {
      try { await ctiApi.hangupCall({ agentId }); } catch {}
    }
  }, [webrtc.hangupCall, agentId]);

  /** Transfer call via CTI API. */
  const transfer = useCallback(async (destination: string, type: 'blind' | 'attended' = 'blind') => {
    if (!webrtc.activeCallId) return;
    await ctiApi.transferCall({ callId: webrtc.activeCallId, targetNumber: destination, transferType: type });
  }, [webrtc.activeCallId]);

  /** Hold/resume via WebRTC. */
  const toggleHold = useCallback(async () => {
    return webrtc.toggleHold();
  }, [webrtc.toggleHold]);

  /** Mute/unmute via WebRTC. */
  const toggleMute = useCallback(() => {
    return webrtc.toggleMute();
  }, [webrtc.toggleMute]);

  return {
    // WebRTC state
    sipStatus: webrtc.status,
    isRegistered: webrtc.isRegistered,
    bgProtection: webrtc.bgProtection,
    incomingCall: webrtc.incomingCall,
    activeCallId: webrtc.activeCallId,
    hasActiveCall: webrtc.hasActiveCall,
    isMuted: webrtc.isMuted,
    callStartTime: webrtc.callStartTime,

    // Actions
    dial,
    answer,
    hangup,
    transfer,
    toggleHold,
    toggleMute,

    // Audio devices
    getAudioDevices: webrtc.getAudioDevices,
    setMicrophone: webrtc.setMicrophone,
    setSpeaker: webrtc.setSpeaker,
  };
}
