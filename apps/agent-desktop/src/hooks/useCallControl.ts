import { useCallback } from 'react';
import { useWebRTC } from './useWebRTC';
import { useCallEvents } from './useCallEvents';
import { ctiApi } from '@/lib/cti-api';

/**
 * Unified call control hook combining WebRTC (SIP.js) + CTI API + real-time events.
 * Used by FloatingCallWidget and TransferCallDialog.
 */
export function useCallControl(agentId: string | undefined) {
  const webrtc = useWebRTC(agentId);

  // Wire real-time events from CTI WebSocket
  useCallEvents({
    onIncomingCall: (event) => {
      console.log('[CallControl] incoming:', event);
      // Handled by SIP.js onInvite → webrtc.incomingCall
    },
    onCallEnded: (event) => {
      console.log('[CallControl] ended:', event);
    },
    onCallAssigned: (event) => {
      console.log('[CallControl] assigned:', event);
    },
  });

  /** Make outbound call via WebRTC. */
  const dial = useCallback(async (destination: string) => {
    return webrtc.makeCall(destination);
  }, [webrtc.makeCall]);

  /** Answer incoming call. */
  const answer = useCallback(async () => {
    await webrtc.answerCall();
  }, [webrtc.answerCall]);

  /** Hang up current call. */
  const hangup = useCallback(async () => {
    await webrtc.hangupCall();
    if (webrtc.activeCallId) {
      try {
        await ctiApi.hangupCall({ callId: webrtc.activeCallId });
      } catch {
        // Best effort
      }
    }
  }, [webrtc.hangupCall, webrtc.activeCallId]);

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

