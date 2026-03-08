import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface CallData {
  id: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  startTime: Date;
  status: 'ringing' | 'connected' | 'on-hold' | 'transferring' | 'ended';
  source: string;
  avatar?: string;
  interactionId?: string;
}

interface CallContextType {
  currentCall: CallData | null;
  isCallWidgetVisible: boolean;
  isCallWidgetExpanded: boolean;
  
  // Call actions
  startCall: (callData: Omit<CallData, 'id' | 'startTime'>) => void;
  endCall: () => void;
  updateCallStatus: (status: CallData['status']) => void;
  
  // Widget actions  
  showCallWidget: () => void;
  hideCallWidget: () => void;
  expandCallWidget: () => void;
  collapseCallWidget: () => void;
  toggleCallWidget: () => void;
}

const CallContext = createContext<CallContextType | undefined>(undefined);

export function useCall() {
  const context = useContext(CallContext);
  if (context === undefined) {
    throw new Error('useCall must be used within a CallProvider');
  }
  return context;
}

interface CallProviderProps {
  children: ReactNode;
}

export function CallProvider({ children }: CallProviderProps) {
  const [currentCall, setCurrentCall] = useState<CallData | null>(null);
  const [isCallWidgetVisible, setIsCallWidgetVisible] = useState(false);
  const [isCallWidgetExpanded, setIsCallWidgetExpanded] = useState(false);

  const startCall = useCallback((callData: Omit<CallData, 'id' | 'startTime'>) => {
    const newCall: CallData = {
      ...callData,
      id: `call-${Date.now()}`,
      startTime: new Date(),
    };
    
    setCurrentCall(newCall);
    setIsCallWidgetVisible(true);
    setIsCallWidgetExpanded(callData.status === 'ringing'); // Auto-expand for incoming calls
    
    console.log('Call started:', newCall);
  }, []);

  const endCall = useCallback(() => {
    if (currentCall) {
      console.log('Call ended:', currentCall);
      setCurrentCall(null);
      setIsCallWidgetVisible(false);
      setIsCallWidgetExpanded(false);
    }
  }, [currentCall]);

  const updateCallStatus = useCallback((status: CallData['status']) => {
    if (currentCall) {
      setCurrentCall(prev => prev ? { ...prev, status } : null);
      
      // Auto-expand for certain status changes
      if (status === 'ringing' || status === 'transferring') {
        setIsCallWidgetExpanded(true);
      }
    }
  }, [currentCall]);

  const showCallWidget = useCallback(() => {
    setIsCallWidgetVisible(true);
  }, []);

  const hideCallWidget = useCallback(() => {
    setIsCallWidgetVisible(false);
  }, []);

  const expandCallWidget = useCallback(() => {
    setIsCallWidgetExpanded(true);
  }, []);

  const collapseCallWidget = useCallback(() => {
    setIsCallWidgetExpanded(false);
  }, []);

  const toggleCallWidget = useCallback(() => {
    setIsCallWidgetExpanded(prev => !prev);
  }, []);

  const value: CallContextType = {
    currentCall,
    isCallWidgetVisible,
    isCallWidgetExpanded,
    
    startCall,
    endCall,
    updateCallStatus,
    
    showCallWidget,
    hideCallWidget,
    expandCallWidget,
    collapseCallWidget,
    toggleCallWidget,
  };

  return (
    <CallContext.Provider value={value}>
      {children}
    </CallContext.Provider>
  );
}