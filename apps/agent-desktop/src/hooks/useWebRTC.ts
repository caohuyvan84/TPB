import { useState, useEffect, useCallback, useRef } from 'react';
import { WebRtcService, WebRtcStatus, WebRtcCredentials } from '@/lib/webrtc-service';
import { SipTabLock } from '@/lib/sip-tab-lock';
import { apiClient } from '@/lib/api-client';
import { networkMonitor } from '@/lib/network-monitor';
import { audioKeepAlive } from '@/lib/audio-keepalive';
import { pushSubscription } from '@/lib/push-subscription';

const DEFAULT_TENANT_ID = '00000000-0000-0000-0000-000000000000';
const RE_REGISTER_INTERVAL = 4 * 60 * 1000; // 4 minutes
const HEALTH_CHECK_INTERVAL = 30 * 1000; // 30 seconds
const MAX_RECONNECT_ATTEMPTS = 10;
const RECONNECT_DELAYS = [1000, 2000, 4000, 8000, 15000, 30000]; // exponential backoff

/**
 * React hook for WebRTC softphone with auto-reconnect resilience.
 * Handles: SipTabLock, network recovery, transport errors, tab visibility, health check.
 */
export function useWebRTC(agentId: string | undefined) {
  const [status, setStatus] = useState<WebRtcStatus>('disconnected');
  const [bgProtection, setBgProtection] = useState<'stopped' | 'running' | 'suspended'>('stopped');
  const [incomingCall, setIncomingCall] = useState<{
    callId: string;
    callerNumber: string;
    callerName: string;
  } | null>(null);
  const [activeCallId, setActiveCallId] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [callStartTime, setCallStartTime] = useState<Date | null>(null);
  const [isTabHolder, setIsTabHolder] = useState(false);
  const serviceRef = useRef<WebRtcService | null>(null);
  const tabLockRef = useRef<SipTabLock | null>(null);
  const reconnectAttempts = useRef(0);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const agentIdRef = useRef(agentId);
  agentIdRef.current = agentId;

  // Fetch credentials + register SIP
  const doRegister = useCallback(async () => {
    const aid = agentIdRef.current;
    if (!aid || !serviceRef.current) return;

    try {
      const resp = await apiClient.get<WebRtcCredentials>(
        `/api/v1/cti/webrtc/credentials?tenantId=${DEFAULT_TENANT_ID}&agentId=${aid}`,
      );
      await serviceRef.current.register(resp.data, aid);
      reconnectAttempts.current = 0; // reset on success
      console.log('[useWebRTC] SIP registered successfully');
    } catch (err) {
      console.error('[useWebRTC] SIP register failed:', err);
    }
  }, []);

  // Reconnect with exponential backoff
  const scheduleReconnect = useCallback((reason: string) => {
    if (reconnectTimer.current) return; // already scheduled
    if (!agentIdRef.current) return;

    const attempt = reconnectAttempts.current;
    if (attempt >= MAX_RECONNECT_ATTEMPTS) {
      console.error(`[useWebRTC] Max reconnect attempts (${MAX_RECONNECT_ATTEMPTS}) reached`);
      return;
    }

    const delay = RECONNECT_DELAYS[Math.min(attempt, RECONNECT_DELAYS.length - 1)];
    reconnectAttempts.current = attempt + 1;
    console.log(`[useWebRTC] Scheduling reconnect in ${delay}ms (attempt ${attempt + 1}, reason: ${reason})`);

    reconnectTimer.current = setTimeout(async () => {
      reconnectTimer.current = null;
      // Only reconnect if network is online and we're tab holder
      if (networkMonitor.getState() !== 'offline') {
        await doRegister();
      } else {
        // Network still offline — will retry when network:online fires
        console.log('[useWebRTC] Network offline, deferring reconnect');
      }
    }, delay);
  }, [doRegister]);

  // Initialize WebRTC service + SipTabLock
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
      onTransportDisconnected: () => {
        // SIP transport lost — schedule reconnect immediately (don't wait for 4min interval)
        scheduleReconnect('transport_disconnected');
      },
    });
    serviceRef.current = service;

    const tabLock = new SipTabLock((holder) => {
      setIsTabHolder(holder);
    });
    tabLockRef.current = tabLock;
    tabLock.tryAcquire();

    return () => {
      service.unregister();
      tabLock.destroy();
      if (reconnectTimer.current) {
        clearTimeout(reconnectTimer.current);
        reconnectTimer.current = null;
      }
    };
  }, [scheduleReconnect]);

  // Auto-register when agentId is available AND this tab holds the SIP lock
  useEffect(() => {
    if (!agentId || !serviceRef.current || !isTabHolder) return;

    const initialRegister = async () => {
      // Pre-request microphone permission
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach(t => t.stop());
      } catch (micErr) {
        console.warn('Microphone permission denied or unavailable:', micErr);
      }
      await doRegister();
    };

    initialRegister();

    // Re-register every 4 minutes (Kamailio expires=300s)
    const interval = setInterval(doRegister, RE_REGISTER_INTERVAL);
    return () => clearInterval(interval);
  }, [agentId, isTabHolder, doRegister]);

  // AudioKeepAlive + Push Subscription: start when SIP registered, stop when unregistered
  useEffect(() => {
    if (status === 'registered' && agentIdRef.current) {
      // Layer 1: silent audio keepalive (defers AudioContext creation until user gesture)
      audioKeepAlive.start();
      // Layer 2: Web Push backup
      pushSubscription.init(agentIdRef.current);
    } else if (status === 'disconnected' || status === 'error') {
      audioKeepAlive.stop();
    }
  }, [status]);

  // Track AudioKeepAlive state
  useEffect(() => {
    const unsub = audioKeepAlive.subscribe(setBgProtection);
    return unsub;
  }, []);

  // Network recovery → re-register
  useEffect(() => {
    if (!agentId || !isTabHolder) return;

    const unsub = networkMonitor.subscribe((state) => {
      if (state === 'online') {
        // Network just came back — check if SIP still registered
        if (!serviceRef.current?.isStillRegistered()) {
          console.log('[useWebRTC] Network recovered, SIP not registered — reconnecting');
          reconnectAttempts.current = 0; // reset backoff on network recovery
          doRegister();
        }
      }
    });

    return unsub;
  }, [agentId, isTabHolder, doRegister]);

  // SIP health check every 30s — detect stale registrations
  useEffect(() => {
    if (!agentId || !isTabHolder) return;

    const healthCheck = setInterval(() => {
      if (serviceRef.current && !serviceRef.current.isStillRegistered()) {
        if (networkMonitor.getState() !== 'offline') {
          console.log('[useWebRTC] Health check: SIP not registered, reconnecting');
          scheduleReconnect('health_check_failed');
        }
      }
    }, HEALTH_CHECK_INTERVAL);

    return () => clearInterval(healthCheck);
  }, [agentId, isTabHolder, scheduleReconnect]);

  // Tab visibility → re-register when tab becomes visible after being hidden
  useEffect(() => {
    if (!agentId || !isTabHolder) return;

    let hiddenSince: number | null = null;

    const handleVisibility = () => {
      if (document.hidden) {
        hiddenSince = Date.now();
      } else if (hiddenSince) {
        const hiddenMs = Date.now() - hiddenSince;
        hiddenSince = null;

        // If tab was hidden > 2 minutes, SIP may be stale — check & reconnect
        if (hiddenMs > 2 * 60 * 1000) {
          console.log(`[useWebRTC] Tab was hidden for ${Math.round(hiddenMs / 1000)}s, checking SIP`);
          if (!serviceRef.current?.isStillRegistered()) {
            reconnectAttempts.current = 0;
            doRegister();
          }
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [agentId, isTabHolder, doRegister]);

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
    try { await serviceRef.current?.hangupCall(); } catch { /* session may be gone */ }
    setActiveCallId(null);
    setIncomingCall(null);
    setCallStartTime(null);
    setIsMuted(false);
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
    isTabHolder,
    bgProtection,
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
