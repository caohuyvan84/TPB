import { useState, useEffect, useCallback, useRef } from 'react';
import { WebRtcService, WebRtcStatus, WebRtcCredentials } from '@/lib/webrtc-service';
import { apiClient } from '@/lib/api-client';

const DEFAULT_TENANT_ID = '00000000-0000-0000-0000-000000000000';

/**
 * React hook for WebRTC softphone functionality.
 * Manages SIP.js registration, call control, and credential refresh.
 */
export function useWebRTC(agentId: string | undefined) {
  const [status, setStatus] = useState<WebRtcStatus>('disconnected');
  const [incomingCall, setIncomingCall] = useState<{
    callId: string;
    callerNumber: string;
    callerName: string;
  } | null>(null);
  const [activeCallId, setActiveCallId] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [callStartTime, setCallStartTime] = useState<Date | null>(null);
  const serviceRef = useRef<WebRtcService | null>(null);

  // Initialize WebRTC service
  useEffect(() => {
    const service = new WebRtcService({
      onStatusChange: (s) => setStatus(s),
      onIncomingCall: (callId, callerNumber, callerName) => {
        setIncomingCall({ callId, callerNumber, callerName });
      },
      onCallAnswered: (callId) => {
        setActiveCallId(callId);
        setIncomingCall(null);
        setCallStartTime(new Date());
      },
      onCallEnded: () => {
        setActiveCallId(null);
        setIncomingCall(null);
        setCallStartTime(null);
        setIsMuted(false);
      },
      onCallFailed: () => {
        setActiveCallId(null);
        setIncomingCall(null);
      },
    });
    serviceRef.current = service;

    return () => {
      service.unregister();
    };
  }, []);

  // Auto-register when agentId is available
  useEffect(() => {
    if (!agentId || !serviceRef.current) return;

    const register = async () => {
      try {
        const resp = await apiClient.get<WebRtcCredentials>(
          `/api/v1/cti/webrtc/credentials?tenantId=${DEFAULT_TENANT_ID}&agentId=${agentId}`,
        );
        await serviceRef.current!.register(resp.data, agentId);
      } catch (err) {
        console.error('WebRTC auto-register failed:', err);
      }
    };

    register();

    // Re-register every 4 minutes (token expires at 5 min)
    const interval = setInterval(register, 4 * 60 * 1000);
    return () => clearInterval(interval);
  }, [agentId]);

  const makeCall = useCallback(async (destination: string) => {
    if (!serviceRef.current?.isRegistered) throw new Error('Not registered');
    const credentials = await apiClient.get<WebRtcCredentials>(
      `/api/v1/cti/webrtc/credentials?tenantId=${DEFAULT_TENANT_ID}&agentId=${agentId}`,
    );
    return serviceRef.current.makeCall(destination, credentials.data.domain);
  }, [agentId]);

  const answerCall = useCallback(async () => {
    await serviceRef.current?.answerCall();
  }, []);

  const hangupCall = useCallback(async () => {
    await serviceRef.current?.hangupCall();
  }, []);

  const toggleMute = useCallback(() => {
    const muted = serviceRef.current?.toggleMute() ?? false;
    setIsMuted(muted);
    return muted;
  }, []);

  const toggleHold = useCallback(async () => {
    return serviceRef.current?.toggleHold() ?? false;
  }, []);

  const getAudioDevices = useCallback(async () => {
    return serviceRef.current?.getAudioDevices() ?? { microphones: [], speakers: [] };
  }, []);

  const setMicrophone = useCallback((deviceId: string) => {
    serviceRef.current?.setMicrophone(deviceId);
  }, []);

  const setSpeaker = useCallback((deviceId: string) => {
    serviceRef.current?.setSpeaker(deviceId);
  }, []);

  return {
    status,
    isRegistered: status === 'registered',
    incomingCall,
    activeCallId,
    isMuted,
    callStartTime,
    hasActiveCall: activeCallId !== null,
    makeCall,
    answerCall,
    hangupCall,
    toggleMute,
    toggleHold,
    getAudioDevices,
    setMicrophone,
    setSpeaker,
  };
}
