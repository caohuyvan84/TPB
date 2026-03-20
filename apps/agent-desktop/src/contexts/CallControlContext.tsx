import { createContext, useContext, ReactNode } from 'react';
import { useCallControl } from '@/hooks/useCallControl';
import { useAuth } from './AuthContext';

// Single instance of call control shared across all components
type CallControlReturn = ReturnType<typeof useCallControl>;

const CallControlContext = createContext<CallControlReturn | undefined>(undefined);

export function CallControlProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const callControl = useCallControl(user?.agentId);

  return (
    <CallControlContext.Provider value={callControl}>
      {children}
    </CallControlContext.Provider>
  );
}

export function useSharedCallControl(): CallControlReturn {
  const ctx = useContext(CallControlContext);
  if (!ctx) throw new Error('useSharedCallControl must be used within CallControlProvider');
  return ctx;
}
