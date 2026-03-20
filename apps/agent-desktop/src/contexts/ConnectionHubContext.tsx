import { createContext, useContext, useEffect, useState, useCallback, useRef, ReactNode } from 'react';
import { networkMonitor, NetworkState } from '@/lib/network-monitor';

export type ConnState = 'connected' | 'connecting' | 'disconnected' | 'error';

export interface ConnectionStatus {
  network: NetworkState;
  sip: ConnState;
  ctiSocket: ConnState;
  notifSocket: ConnState;
  /** True when ALL connections are healthy */
  allHealthy: boolean;
  /** True when any connection is lost */
  hasIssue: boolean;
  /** Human-readable summary for banner */
  summary: string;
  /** Register/update a connection's state */
  updateConnection: (name: 'sip' | 'ctiSocket' | 'notifSocket', state: ConnState) => void;
}

const ConnectionHubContext = createContext<ConnectionStatus | undefined>(undefined);

export function ConnectionHubProvider({ children }: { children: ReactNode }) {
  const [network, setNetwork] = useState<NetworkState>(networkMonitor.getState());
  const [sip, setSip] = useState<ConnState>('disconnected');
  const [ctiSocket, setCtiSocket] = useState<ConnState>('disconnected');
  const [notifSocket, setNotifSocket] = useState<ConnState>('disconnected');

  // Track reconnect callbacks — connections register here when network recovers
  const reconnectCallbacks = useRef<Set<() => void>>(new Set());

  // Start network monitor
  useEffect(() => {
    networkMonitor.start();

    const unsub = networkMonitor.subscribe((state) => {
      setNetwork(state);

      // Trigger reconnect on recovery from offline/degraded → online
      if (state === 'online') {
        console.log('[ConnectionHub] Network recovered — triggering reconnects');
        for (const cb of reconnectCallbacks.current) {
          try { cb(); } catch { /* ignore */ }
        }
      }
    });

    return () => {
      unsub();
      networkMonitor.stop();
    };
  }, []);

  const updateConnection = useCallback((name: 'sip' | 'ctiSocket' | 'notifSocket', state: ConnState) => {
    switch (name) {
      case 'sip': setSip(state); break;
      case 'ctiSocket': setCtiSocket(state); break;
      case 'notifSocket': setNotifSocket(state); break;
    }
  }, []);

  const allHealthy = network === 'online' && sip === 'connected' && ctiSocket === 'connected';
  const hasIssue = network !== 'online' || sip !== 'connected' || ctiSocket !== 'connected';

  let summary = '';
  if (network === 'offline') {
    summary = 'Mất kết nối mạng — đang chờ phục hồi...';
  } else if (network === 'degraded') {
    summary = 'Kết nối mạng không ổn định';
  } else if (sip === 'disconnected' || sip === 'error') {
    summary = 'Mất kết nối SIP — không thể nhận cuộc gọi';
  } else if (sip === 'connecting') {
    summary = 'Đang kết nối lại SIP...';
  } else if (ctiSocket === 'disconnected' || ctiSocket === 'error') {
    summary = 'Mất kết nối sự kiện cuộc gọi';
  } else if (ctiSocket === 'connecting') {
    summary = 'Đang kết nối lại...';
  }

  return (
    <ConnectionHubContext.Provider value={{
      network, sip, ctiSocket, notifSocket,
      allHealthy, hasIssue, summary,
      updateConnection,
    }}>
      {children}
    </ConnectionHubContext.Provider>
  );
}

export function useConnectionStatus(): ConnectionStatus {
  const ctx = useContext(ConnectionHubContext);
  if (!ctx) throw new Error('useConnectionStatus must be used within ConnectionHubProvider');
  return ctx;
}

/**
 * Hook to register a reconnect callback that fires when network recovers.
 */
export function useNetworkRecovery(callback: () => void) {
  const prevNetwork = useRef<NetworkState>('online');

  useEffect(() => {
    const unsub = networkMonitor.subscribe((state) => {
      // Fire callback when transitioning TO online from offline/degraded
      if (state === 'online' && prevNetwork.current !== 'online') {
        console.log('[NetworkRecovery] Network recovered, calling reconnect');
        callback();
      }
      prevNetwork.current = state;
    });
    return unsub;
  }, [callback]);
}
