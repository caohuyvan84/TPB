import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { apiClient } from '@/lib/api-client';
import { wsClient } from '@/lib/websocket-client';
import { ctiApi } from '@/lib/cti-api';

interface User {
  id: string;
  agentId: string;
  fullName: string;
  roles: string[];
  permissions: string[];
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      fetchUser();
    } else {
      setIsLoading(false);
    }

    // Set agent offline on browser close/tab close
    const handleBeforeUnload = () => {
      const agentId = user?.agentId;
      if (agentId) {
        // Use sendBeacon for reliable delivery during page unload
        const payload = JSON.stringify({ agentId, status: 'offline' });
        navigator.sendBeacon(
          '/api/v1/cti/agent/state?tenantId=00000000-0000-0000-0000-000000000000',
          new Blob([payload], { type: 'application/json' }),
        );
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [user?.agentId]);

  const fetchUser = async () => {
    try {
      const { data } = await apiClient.get('/api/v1/users/me');
      setUser(data);
      wsClient.connect(localStorage.getItem('accessToken')!);
    } catch {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (username: string, password: string) => {
    const { data } = await apiClient.post('/api/v1/auth/login', {
      username,
      password,
      clientFingerprint: navigator.userAgent,
    });

    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    setUser(data.user);
    wsClient.connect(data.accessToken);
  };

  const logout = () => {
    // Set agent offline in GoACD Redis before clearing auth
    if (user?.agentId) {
      ctiApi.setAgentState(user.agentId, 'offline').catch(() => {});
    }
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    setUser(null);
    wsClient.disconnect();
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
