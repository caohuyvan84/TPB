import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

export type ChannelType = 'voice' | 'email' | 'chat';
export type AgentStatus = 'ready' | 'not-ready';
export type NotReadyReason = 
  | 'break' 
  | 'training' 
  | 'meeting' 
  | 'technical-issue' 
  | 'system-maintenance'
  | 'other';

export interface ChannelStatus {
  status: AgentStatus;
  reason?: NotReadyReason;
  lastChanged: Date;
  customReason?: string;
}

export interface AgentChannelStatuses {
  voice: ChannelStatus;
  email: ChannelStatus;
  chat: ChannelStatus;
}

interface AgentStatusContextType {
  channelStatuses: AgentChannelStatuses;
  setChannelStatus: (channel: ChannelType, status: AgentStatus, reason?: NotReadyReason, customReason?: string) => void;
  getChannelStatus: (channel: ChannelType) => ChannelStatus;
  isChannelReady: (channel: ChannelType) => boolean;
  getReadyChannelsCount: () => number;
  getTotalChannelsCount: () => number;
  setAllChannelsStatus: (status: AgentStatus, reason?: NotReadyReason, customReason?: string) => void;
}

const AgentStatusContext = createContext<AgentStatusContextType | undefined>(undefined);

export function useAgentStatus() {
  const context = useContext(AgentStatusContext);
  if (context === undefined) {
    throw new Error('useAgentStatus must be used within an AgentStatusProvider');
  }
  return context;
}

interface AgentStatusProviderProps {
  children: ReactNode;
}

export function AgentStatusProvider({ children }: AgentStatusProviderProps) {
  const [channelStatuses, setChannelStatuses] = useState<AgentChannelStatuses>({
    voice: {
      status: 'ready',
      lastChanged: new Date(),
    },
    email: {
      status: 'ready', 
      lastChanged: new Date(),
    },
    chat: {
      status: 'ready',
      lastChanged: new Date(),
    }
  });

  const setChannelStatus = useCallback((
    channel: ChannelType, 
    status: AgentStatus, 
    reason?: NotReadyReason, 
    customReason?: string
  ) => {
    setChannelStatuses(prev => ({
      ...prev,
      [channel]: {
        status,
        reason: status === 'not-ready' ? reason : undefined,
        customReason: status === 'not-ready' && reason === 'other' ? customReason : undefined,
        lastChanged: new Date(),
      }
    }));

    console.log(`Channel ${channel} status changed to ${status}`, { reason, customReason });
  }, []);

  const getChannelStatus = useCallback((channel: ChannelType): ChannelStatus => {
    return channelStatuses[channel];
  }, [channelStatuses]);

  const isChannelReady = useCallback((channel: ChannelType): boolean => {
    return channelStatuses[channel].status === 'ready';
  }, [channelStatuses]);

  const getReadyChannelsCount = useCallback((): number => {
    return Object.values(channelStatuses).filter(status => status.status === 'ready').length;
  }, [channelStatuses]);

  const getTotalChannelsCount = useCallback((): number => {
    return Object.keys(channelStatuses).length;
  }, [channelStatuses]);

  const setAllChannelsStatus = useCallback((
    status: AgentStatus, 
    reason?: NotReadyReason, 
    customReason?: string
  ) => {
    const newStatuses = {} as AgentChannelStatuses;
    
    Object.keys(channelStatuses).forEach((channel) => {
      newStatuses[channel as ChannelType] = {
        status,
        reason: status === 'not-ready' ? reason : undefined,
        customReason: status === 'not-ready' && reason === 'other' ? customReason : undefined,
        lastChanged: new Date(),
      };
    });

    setChannelStatuses(newStatuses);
    console.log(`All channels status changed to ${status}`, { reason, customReason });
  }, [channelStatuses]);

  const value: AgentStatusContextType = {
    channelStatuses,
    setChannelStatus,
    getChannelStatus,
    isChannelReady,
    getReadyChannelsCount,
    getTotalChannelsCount,
    setAllChannelsStatus,
  };

  return (
    <AgentStatusContext.Provider value={value}>
      {children}
    </AgentStatusContext.Provider>
  );
}