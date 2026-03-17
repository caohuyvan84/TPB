import { useQuery, useMutation } from '@tanstack/react-query';
import { useEffect } from 'react';
import { ctiApi, CallControlRequest } from '../lib/cti-api';
import { ctiChannel } from '../lib/cti-channel';
import { useAuth } from '../contexts/AuthContext';

export const useAnswerCall = () => {
  return useMutation({
    mutationFn: (request: CallControlRequest) => ctiApi.answerCall(request),
  });
};

export const useHangupCall = () => {
  return useMutation({
    mutationFn: (request: CallControlRequest) => ctiApi.hangupCall(request),
  });
};

export const useTransferCall = () => {
  return useMutation({
    mutationFn: (request: CallControlRequest) => ctiApi.transferCall(request),
  });
};

export const useHoldCall = () => {
  return useMutation({
    mutationFn: (request: CallControlRequest) => ctiApi.holdCall(request),
  });
};

export const useCtiConfig = () => {
  return useQuery({
    queryKey: ['cti', 'config'],
    queryFn: () => ctiApi.getConfig(),
  });
};

export const useUpdateCtiConfig = () => {
  return useMutation({
    mutationFn: (config: Parameters<typeof ctiApi.updateConfig>[0]) => ctiApi.updateConfig(config),
  });
};

// Real-time CTI events
export const useRealtimeCti = (onCallEvent?: (event: any) => void) => {
  const { user } = useAuth();

  useEffect(() => {
    if (!user?.agentId) return;

    const token = localStorage.getItem('accessToken');
    if (!token) return;

    ctiChannel.connect(user.agentId, token);

    if (onCallEvent) {
      ctiChannel.onCallEvent(onCallEvent);
    }

    return () => {
      ctiChannel.offCallEvent();
      ctiChannel.disconnect();
    };
  }, [user?.agentId, onCallEvent]);

  return {
    answerCall: (callId: string) => ctiChannel.answerCall(callId),
    hangupCall: (callId: string) => ctiChannel.hangupCall(callId),
    holdCall: (callId: string) => ctiChannel.holdCall(callId),
    resumeCall: (callId: string) => ctiChannel.resumeCall(callId),
    transferCall: (callId: string, targetNumber: string, type?: 'blind' | 'attended') => 
      ctiChannel.transferCall(callId, targetNumber, type),
  };
};
