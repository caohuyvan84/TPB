import React, { createContext, useContext, useState, useCallback, useEffect, useRef, ReactNode } from 'react';

export type ChannelType = 'voice' | 'email' | 'chat';
export type AgentStatus = 'ready' | 'not-ready' | 'disconnected';
export type NotReadyReason = 
  | 'break' 
  | 'lunch'
  | 'training' 
  | 'meeting' 
  | 'technical-issue' 
  | 'system-maintenance'
  | 'toilet'
  | 'other';

export type ConnectionStatus = 'connected' | 'disconnected' | 'reconnecting';

export interface ChannelStatus {
  status: AgentStatus;
  reason?: NotReadyReason;
  customReason?: string;
  lastChanged: Date;
  duration: number; // in seconds
  isTimerActive: boolean;
}

export interface AgentChannelStatuses {
  voice: ChannelStatus;
  email: ChannelStatus;
  chat: ChannelStatus;
}

export interface AgentState {
  agentId: string;
  agentName: string;
  connectionStatus: ConnectionStatus;
  lastActivity: Date;
  sessionStart: Date;
  totalReadyTime: number;
  totalNotReadyTime: number;
}

interface EnhancedAgentStatusContextType {
  // Channel Status Management
  channelStatuses: AgentChannelStatuses;
  setChannelStatus: (channel: ChannelType, status: AgentStatus, reason?: NotReadyReason, customReason?: string) => void;
  getChannelStatus: (channel: ChannelType) => ChannelStatus;
  isChannelReady: (channel: ChannelType) => boolean;
  getReadyChannelsCount: () => number;
  getTotalChannelsCount: () => number;
  setAllChannelsStatus: (status: AgentStatus, reason?: NotReadyReason, customReason?: string) => void;
  
  // Agent State Management
  agentState: AgentState;
  updateAgentActivity: () => void;
  
  // Connection Management
  connectionStatus: ConnectionStatus;
  setConnectionStatus: (status: ConnectionStatus) => void;
  
  // Timer Management
  formatDuration: (seconds: number) => string;
  getCurrentStatusDuration: (channel: ChannelType) => string;
  
  // Quick Actions
  goReadyAll: () => void;
  goNotReadyAll: (reason?: NotReadyReason, customReason?: string) => void;
  
  // Keyboard Shortcuts
  toggleQuickStatus: () => void;
  
  // Statistics
  getTotalReadyTime: () => number;
  getTotalNotReadyTime: () => number;
  getChannelStats: () => { [key in ChannelType]: { readyTime: number; notReadyTime: number } };
}

const EnhancedAgentStatusContext = createContext<EnhancedAgentStatusContextType | undefined>(undefined);

export function useEnhancedAgentStatus() {
  const context = useContext(EnhancedAgentStatusContext);
  if (context === undefined) {
    throw new Error('useEnhancedAgentStatus must be used within an EnhancedAgentStatusProvider');
  }
  return context;
}

interface EnhancedAgentStatusProviderProps {
  children: ReactNode;
  agentId?: string;
  agentName?: string;
}

export function EnhancedAgentStatusProvider({ 
  children, 
  agentId = 'AGT001',
  agentName = 'Agent Tung'
}: EnhancedAgentStatusProviderProps) {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connected');
  const timersRef = useRef<{ [key in ChannelType]: ReturnType<typeof setInterval> | null }>({ // Fix: use ReturnType instead of NodeJS.Timeout
    voice: null,
    email: null,
    chat: null
  });

  // Initialize channel statuses
  const [channelStatuses, setChannelStatuses] = useState<AgentChannelStatuses>({
    voice: {
      status: 'ready',
      lastChanged: new Date(),
      duration: 0,
      isTimerActive: true,
    },
    email: {
      status: 'ready', 
      lastChanged: new Date(),
      duration: 0,
      isTimerActive: true,
    },
    chat: {
      status: 'ready',
      lastChanged: new Date(),
      duration: 0,
      isTimerActive: true,
    }
  });

  // Initialize agent state
  const [agentState, setAgentState] = useState<AgentState>({
    agentId,
    agentName,
    connectionStatus: 'connected',
    lastActivity: new Date(),
    sessionStart: new Date(),
    totalReadyTime: 0,
    totalNotReadyTime: 0,
  });

  // Update timers every second
  useEffect(() => {
    const updateTimers = () => {
      setChannelStatuses(prev => {
        const updated = { ...prev };
        Object.keys(updated).forEach(channelKey => {
          const channel = channelKey as ChannelType;
          if (updated[channel].isTimerActive) {
            updated[channel] = {
              ...updated[channel],
              duration: updated[channel].duration + 1
            };
          }
        });
        return updated;
      });
    };

    const interval = setInterval(updateTimers, 1000);
    return () => clearInterval(interval);
  }, []);

  // Connection monitoring
  useEffect(() => {
    const handleOnline = () => {
      console.log('Connection restored');
      setConnectionStatus('connected');
    };

    const handleOffline = () => {
      console.log('Connection lost');
      setConnectionStatus('disconnected');
      // Auto set all channels to disconnected
      setAllChannelsStatusInternal('disconnected');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Heartbeat monitoring (simulate)
    const heartbeat = setInterval(() => {
      updateAgentActivity();
    }, 30000); // Every 30 seconds

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(heartbeat);
    };
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyboard = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 'r':
            e.preventDefault();
            goReadyAll();
            break;
          case 'n':
            e.preventDefault();
            // Show not ready dialog
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyboard);
    return () => window.removeEventListener('keydown', handleKeyboard);
  }, []);

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
        duration: 0, // Reset timer
        isTimerActive: status !== 'disconnected',
      }
    }));

    // Log status change
    console.log(`Channel ${channel} status changed to ${status}`, { reason, customReason });
    
    // Update agent activity
    updateAgentActivity();
  }, []);

  const setAllChannelsStatusInternal = useCallback((
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
        duration: 0,
        isTimerActive: status !== 'disconnected',
      };
    });

    setChannelStatuses(newStatuses);
    updateAgentActivity();
  }, [channelStatuses]);

  const setAllChannelsStatus = useCallback((
    status: AgentStatus, 
    reason?: NotReadyReason, 
    customReason?: string
  ) => {
    setAllChannelsStatusInternal(status, reason, customReason);
    console.log(`All channels status changed to ${status}`, { reason, customReason });
  }, [setAllChannelsStatusInternal]);

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

  const updateAgentActivity = useCallback(() => {
    setAgentState(prev => ({
      ...prev,
      lastActivity: new Date(),
      connectionStatus
    }));
  }, [connectionStatus]);

  const formatDuration = useCallback((seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }, []);

  const getCurrentStatusDuration = useCallback((channel: ChannelType): string => {
    return formatDuration(channelStatuses[channel].duration);
  }, [channelStatuses, formatDuration]);

  const goReadyAll = useCallback(() => {
    setAllChannelsStatus('ready');
  }, [setAllChannelsStatus]);

  const goNotReadyAll = useCallback((reason?: NotReadyReason, customReason?: string) => {
    setAllChannelsStatus('not-ready', reason || 'break', customReason);
  }, [setAllChannelsStatus]);

  const toggleQuickStatus = useCallback(() => {
    const readyCount = getReadyChannelsCount();
    if (readyCount === getTotalChannelsCount()) {
      // All ready -> go not ready
      goNotReadyAll('break');
    } else {
      // Some/none ready -> go all ready
      goReadyAll();
    }
  }, [getReadyChannelsCount, getTotalChannelsCount, goReadyAll, goNotReadyAll]);

  const getTotalReadyTime = useCallback((): number => {
    return Object.values(channelStatuses)
      .filter(status => status.status === 'ready')
      .reduce((total, status) => total + status.duration, 0);
  }, [channelStatuses]);

  const getTotalNotReadyTime = useCallback((): number => {
    return Object.values(channelStatuses)
      .filter(status => status.status === 'not-ready')
      .reduce((total, status) => total + status.duration, 0);
  }, [channelStatuses]);

  const getChannelStats = useCallback(() => {
    const stats = {} as { [key in ChannelType]: { readyTime: number; notReadyTime: number } };
    
    Object.keys(channelStatuses).forEach(channelKey => {
      const channel = channelKey as ChannelType;
      const status = channelStatuses[channel];
      
      stats[channel] = {
        readyTime: status.status === 'ready' ? status.duration : 0,
        notReadyTime: status.status === 'not-ready' ? status.duration : 0,
      };
    });

    return stats;
  }, [channelStatuses]);

  const value: EnhancedAgentStatusContextType = {
    channelStatuses,
    setChannelStatus,
    getChannelStatus,
    isChannelReady,
    getReadyChannelsCount,
    getTotalChannelsCount,
    setAllChannelsStatus,
    agentState,
    updateAgentActivity,
    connectionStatus,
    setConnectionStatus,
    formatDuration,
    getCurrentStatusDuration,
    goReadyAll,
    goNotReadyAll,
    toggleQuickStatus,
    getTotalReadyTime,
    getTotalNotReadyTime,
    getChannelStats,
  };

  return (
    <EnhancedAgentStatusContext.Provider value={value}>
      {children}
    </EnhancedAgentStatusContext.Provider>
  );
}