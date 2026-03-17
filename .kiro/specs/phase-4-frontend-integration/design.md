# Phase 4: Frontend-Backend Integration — Design

**Version:** 1.0
**Date:** 2026-03-09
**Status:** Draft

---

## 1. Architecture Overview

### 1.1 Current State

```
┌─────────────────────────────────────────────────────────────┐
│                    Agent Desktop (React 18)                  │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ App.tsx      │  │ Contexts     │  │ Components   │      │
│  │ (Mock Data)  │  │ (Local State)│  │ (UI Only)    │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 Target State

```
┌─────────────────────────────────────────────────────────────┐
│              Agent Desktop (React 19.2.4)                    │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ AuthContext  │  │ React Query  │  │ Components   │      │
│  │ (JWT)        │  │ v5.90.21     │  │ (Data-driven)│      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
│         │                 │                 │              │
│         └─────────────────┼─────────────────┘              │
│                           │                                │
│  ┌────────────────────────┴────────────────────────┐       │
│  │         API Client (Axios 1.13.6)               │       │
│  │  - JWT interceptor                              │       │
│  │  - Token refresh                                │       │
│  │  - Error handling                               │       │
│  └────────────────────────┬────────────────────────┘       │
│                           │                                │
│  ┌────────────────────────┴────────────────────────┐       │
│  │      WebSocket Client (Socket.IO or STOMP)      │       │
│  │  - Auto-reconnect                               │       │
│  │  - Event handlers                               │       │
│  └────────────────────────┬────────────────────────┘       │
└───────────────────────────┼────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                  Kong API Gateway (Port 8000)                │
│  - JWT validation                                           │
│  - Rate limiting                                            │
│  - WebSocket proxy                                          │
└────────────────────────┬────────────────────────────────────┘
                         │
        ┌────────────────┼────────────────┐
        │                │                │
        ▼                ▼                ▼
   ┌─────────┐      ┌─────────┐     ┌─────────┐
   │  MS-1   │      │  MS-2   │     │  MS-3   │
   │Identity │      │ Agent   │     │Interact.│
   └─────────┘      └─────────┘     └─────────┘
        │                │                │
        └────────────────┼────────────────┘
                         │
                         ▼
              PostgreSQL 18.3 + Redis 8.6
```

---

## 2. API Client Design

### 2.1 Directory Structure

```
src/
├── lib/
│   ├── api/
│   │   ├── client.ts              # Axios instance
│   │   ├── auth.ts                # Auth endpoints
│   │   ├── agents.ts              # Agent endpoints
│   │   ├── interactions.ts        # Interaction endpoints
│   │   ├── tickets.ts             # Ticket endpoints
│   │   ├── customers.ts           # Customer endpoints
│   │   ├── notifications.ts       # Notification endpoints
│   │   ├── knowledge.ts           # KB endpoints
│   │   ├── bfsi.ts                # BFSI endpoints
│   │   ├── ai.ts                  # AI endpoints
│   │   ├── media.ts               # Media endpoints
│   │   └── types.ts               # API types
│   └── ws/
│       ├── client.ts              # Socket.IO client
│       ├── agent-status.ts        # Agent status channel
│       ├── interaction-queue.ts   # Queue channel
│       ├── notifications.ts       # Notification channel
│       └── cti.ts                 # CTI channel
└── contexts/
    └── AuthContext.tsx            # Auth state + JWT management
```

### 2.2 API Client Implementation

**File:** `src/lib/api/client.ts`

```typescript
import axios, { AxiosInstance, AxiosError } from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

// Create axios instance
export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // For httpOnly cookies (refresh token)
});

// Request interceptor: attach access token
apiClient.interceptors.request.use(
  (config) => {
    const token = getAccessToken(); // From AuthContext
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: handle 401 → refresh token
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: unknown) => void;
  reject: (reason?: unknown) => void;
}> = [];

const processQueue = (error: Error | null, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as any;

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // Queue this request
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return apiClient(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const { data } = await axios.post(
          `${API_BASE_URL}/api/v1/auth/refresh`,
          {},
          { withCredentials: true }
        );
        const newToken = data.accessToken;
        setAccessToken(newToken); // Update AuthContext
        processQueue(null, newToken);
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError as Error, null);
        // Refresh failed → logout
        logout();
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

// Helper functions (implemented in AuthContext)
function getAccessToken(): string | null {
  // Get from React state
  return null;
}

function setAccessToken(token: string): void {
  // Update React state
}

function logout(): void {
  // Clear state, redirect to login
}
```

### 2.3 Auth API

**File:** `src/lib/api/auth.ts`

```typescript
import { apiClient } from './client';

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: {
    id: string;
    agentId: string;
    fullName: string;
    roles: string[];
    permissions: string[];
  };
  requiresMfa: boolean;
}

export interface MfaVerifyRequest {
  code: string;
}

export const authApi = {
  login: (data: LoginRequest) =>
    apiClient.post<LoginResponse>('/api/v1/auth/login', data),

  verifyMfa: (data: MfaVerifyRequest) =>
    apiClient.post<LoginResponse>('/api/v1/auth/mfa/verify', data),

  refresh: () =>
    apiClient.post<{ accessToken: string }>('/api/v1/auth/refresh'),

  logout: () =>
    apiClient.post('/api/v1/auth/logout'),

  getMe: () =>
    apiClient.get<LoginResponse['user']>('/api/v1/users/me'),
};
```

### 2.4 Interaction API

**File:** `src/lib/api/interactions.ts`

```typescript
import { apiClient } from './client';
import type { Interaction } from '@/components/useInteractionStats';

export interface GetInteractionsParams {
  statusTab?: 'all' | 'queue' | 'closed' | 'assigned';
  channel?: 'voice' | 'email' | 'chat';
  search?: string;
  priority?: 'urgent' | 'high' | 'medium' | 'low';
  direction?: 'inbound' | 'outbound';
  slaStatus?: 'within-sla' | 'near-breach' | 'breached';
  source?: string;
  page?: number;
  pageSize?: number;
}

export interface GetInteractionsResponse {
  interactions: Interaction[];
  total: number;
  page: number;
  pageSize: number;
  stats: {
    totalAll: number;
    totalQueue: number;
    totalClosed: number;
    totalAssigned: number;
    byChannel: Record<string, number>;
    byPriority: Record<string, number>;
  };
}

export interface InteractionNote {
  id: string;
  interactionId: string;
  agentId: string;
  agentName: string;
  content: string;
  tag?: string;
  isPinned: boolean;
  createdAt: string;
  updatedAt: string;
}

export const interactionApi = {
  getAll: (params: GetInteractionsParams) =>
    apiClient.get<GetInteractionsResponse>('/api/v1/interactions', { params }),

  getById: (id: string) =>
    apiClient.get<Interaction>(`/api/v1/interactions/${id}`),

  updateStatus: (id: string, status: string) =>
    apiClient.put(`/api/v1/interactions/${id}/status`, { status }),

  assign: (id: string, agentId: string) =>
    apiClient.put(`/api/v1/interactions/${id}/assign`, { agentId }),

  transfer: (id: string, targetAgentId: string, transferType: 'warm' | 'cold', note?: string) =>
    apiClient.post(`/api/v1/interactions/${id}/transfer`, {
      targetAgentId,
      transferType,
      note,
    }),

  getTimeline: (id: string) =>
    apiClient.get(`/api/v1/interactions/${id}/timeline`),

  getNotes: (id: string) =>
    apiClient.get<InteractionNote[]>(`/api/v1/interactions/${id}/notes`),

  addNote: (id: string, content: string, tag?: string) =>
    apiClient.post<InteractionNote>(`/api/v1/interactions/${id}/notes`, {
      content,
      tag,
    }),

  updateNote: (id: string, noteId: string, data: Partial<InteractionNote>) =>
    apiClient.put(`/api/v1/interactions/${id}/notes/${noteId}`, data),

  // Email
  getEmailThread: (id: string) =>
    apiClient.get(`/api/v1/interactions/${id}/email/thread`),

  sendEmailReply: (id: string, data: {
    to: string[];
    cc?: string[];
    subject: string;
    body: string;
    bodyHtml?: string;
  }) =>
    apiClient.post(`/api/v1/interactions/${id}/email/reply`, data),

  // Chat
  getChatMessages: (id: string) =>
    apiClient.get(`/api/v1/interactions/${id}/chat/messages`),

  sendChatMessage: (id: string, content: string) =>
    apiClient.post(`/api/v1/interactions/${id}/chat/messages`, { content }),

  closeChat: (id: string) =>
    apiClient.post(`/api/v1/interactions/${id}/chat/close`),
};
```

---

## 3. WebSocket Client Design

### 3.1 WebSocket Client Implementation

**File:** `src/lib/ws/client.ts`

```typescript
import { io, Socket } from 'socket.io-client';

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8000';

class WebSocketClient {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectDelay = 1000; // Start with 1s

  connect(token: string) {
    if (this.socket?.connected) {
      return;
    }

    this.socket = io(WS_URL, {
      auth: { token },
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: this.reconnectDelay,
      reconnectionDelayMax: 30000, // Max 30s
    });

    this.socket.on('connect', () => {
      console.log('[WS] Connected');
      this.reconnectAttempts = 0;
      this.reconnectDelay = 1000;
    });

    this.socket.on('disconnect', (reason) => {
      console.log('[WS] Disconnected:', reason);
    });

    this.socket.on('connect_error', (error) => {
      console.error('[WS] Connection error:', error);
      this.reconnectAttempts++;
      this.reconnectDelay = Math.min(this.reconnectDelay * 2, 30000);
    });

    this.socket.on('reconnect', (attemptNumber) => {
      console.log('[WS] Reconnected after', attemptNumber, 'attempts');
    });

    this.socket.on('reconnect_failed', () => {
      console.error('[WS] Reconnection failed after', this.maxReconnectAttempts, 'attempts');
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  subscribe(channel: string, handler: (data: any) => void) {
    if (!this.socket) {
      console.error('[WS] Not connected');
      return;
    }
    this.socket.on(channel, handler);
  }

  unsubscribe(channel: string, handler?: (data: any) => void) {
    if (!this.socket) return;
    if (handler) {
      this.socket.off(channel, handler);
    } else {
      this.socket.off(channel);
    }
  }

  emit(event: string, data: any) {
    if (!this.socket) {
      console.error('[WS] Not connected');
      return;
    }
    this.socket.emit(event, data);
  }

  get connected(): boolean {
    return this.socket?.connected ?? false;
  }
}

export const wsClient = new WebSocketClient();
```

### 3.2 Agent Status Channel

**File:** `src/lib/ws/agent-status.ts`

```typescript
import { wsClient } from './client';

export interface AgentStatusEvent {
  agentId: string;
  channel: 'voice' | 'email' | 'chat';
  status: 'ready' | 'not-ready' | 'disconnected';
  reason?: string;
  duration: number;
  changedAt: string;
}

export const agentStatusChannel = {
  subscribe: (agentId: string, handler: (event: AgentStatusEvent) => void) => {
    wsClient.subscribe(`agent.${agentId}.status`, handler);
  },

  unsubscribe: (agentId: string, handler?: (event: AgentStatusEvent) => void) => {
    wsClient.unsubscribe(`agent.${agentId}.status`, handler);
  },

  updateStatus: (agentId: string, channel: string, status: string, reason?: string) => {
    wsClient.emit('agent.status.update', { agentId, channel, status, reason });
  },
};
```

### 3.3 Interaction Queue Channel

**File:** `src/lib/ws/interaction-queue.ts`

```typescript
import { wsClient } from './client';
import type { Interaction } from '@/components/useInteractionStats';

export interface QueueUpdateEvent {
  type: 'new' | 'updated' | 'removed';
  interaction: Interaction;
}

export const interactionQueueChannel = {
  subscribe: (agentId: string, handler: (event: QueueUpdateEvent) => void) => {
    wsClient.subscribe(`interactions.${agentId}.queue`, handler);
  },

  unsubscribe: (agentId: string, handler?: (event: QueueUpdateEvent) => void) => {
    wsClient.unsubscribe(`interactions.${agentId}.queue`, handler);
  },
};
```

### 3.4 Notification Channel

**File:** `src/lib/ws/notifications.ts`

```typescript
import { wsClient } from './client';

export interface NotificationEvent {
  id: string;
  type: 'call' | 'chat' | 'ticket' | 'sla' | 'system';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  state: 'new' | 'viewed' | 'actioned' | 'dismissed';
  title: string;
  message: string;
  actionUrl?: string;
  actionLabel?: string;
  metadata?: Record<string, any>;
  createdAt: string;
}

export const notificationChannel = {
  subscribe: (agentId: string, handler: (event: NotificationEvent) => void) => {
    wsClient.subscribe(`notifications.${agentId}`, handler);
  },

  unsubscribe: (agentId: string, handler?: (event: NotificationEvent) => void) => {
    wsClient.unsubscribe(`notifications.${agentId}`, handler);
  },
};
```

---

## 4. Authentication Context

### 4.1 AuthContext Implementation

**File:** `src/contexts/AuthContext.tsx`

```typescript
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authApi, LoginRequest, LoginResponse } from '@/lib/api/auth';
import { wsClient } from '@/lib/ws/client';

interface User {
  id: string;
  agentId: string;
  fullName: string;
  roles: string[];
  permissions: string[];
}

interface AuthContextType {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginRequest) => Promise<void>;
  verifyMfa: (code: string) => Promise<void>;
  logout: () => Promise<void>;
  requiresMfa: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [requiresMfa, setRequiresMfa] = useState(false);

  // Initialize: check if user is already logged in
  useEffect(() => {
    const initAuth = async () => {
      try {
        // Try to refresh token (httpOnly cookie should be present)
        const { data } = await authApi.refresh();
        setAccessToken(data.accessToken);

        // Fetch user profile
        const { data: userData } = await authApi.getMe();
        setUser(userData);

        // Connect WebSocket
        wsClient.connect(data.accessToken);
      } catch (error) {
        console.error('Auth init failed:', error);
        // Not logged in or session expired
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  const login = async (credentials: LoginRequest) => {
    try {
      const { data } = await authApi.login(credentials);

      if (data.requiresMfa) {
        setRequiresMfa(true);
        return;
      }

      setAccessToken(data.accessToken);
      setUser(data.user);
      setRequiresMfa(false);

      // Connect WebSocket
      wsClient.connect(data.accessToken);
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  };

  const verifyMfa = async (code: string) => {
    try {
      const { data } = await authApi.verifyMfa({ code });
      setAccessToken(data.accessToken);
      setUser(data.user);
      setRequiresMfa(false);

      // Connect WebSocket
      wsClient.connect(data.accessToken);
    } catch (error) {
      console.error('MFA verification failed:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      setAccessToken(null);
      setUser(null);
      setRequiresMfa(false);
      wsClient.disconnect();
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        accessToken,
        isAuthenticated: !!user,
        isLoading,
        login,
        verifyMfa,
        logout,
        requiresMfa,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

// Export for API client
export const getAccessToken = () => {
  // This will be called from api/client.ts
  // We need to access the token from outside React
  // Solution: store in a module-level variable
  return globalAccessToken;
};

export const setGlobalAccessToken = (token: string | null) => {
  globalAccessToken = token;
};

let globalAccessToken: string | null = null;
```

---

## 5. React Query Setup

### 5.1 Query Client Configuration

**File:** `src/lib/query-client.ts`

```typescript
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      refetchOnWindowFocus: false,
      retry: 1,
    },
    mutations: {
      retry: 0,
    },
  },
});
```

### 5.2 Query Hooks

**File:** `src/hooks/useInteractions.ts`

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { interactionApi, GetInteractionsParams } from '@/lib/api/interactions';

export const useInteractions = (params: GetInteractionsParams) => {
  return useQuery({
    queryKey: ['interactions', params],
    queryFn: () => interactionApi.getAll(params).then((res) => res.data),
  });
};

export const useInteraction = (id: string) => {
  return useQuery({
    queryKey: ['interactions', id],
    queryFn: () => interactionApi.getById(id).then((res) => res.data),
    enabled: !!id,
  });
};

export const useUpdateInteractionStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      interactionApi.updateStatus(id, status),
    onSuccess: (_, variables) => {
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['interactions'] });
      queryClient.invalidateQueries({ queryKey: ['interactions', variables.id] });
    },
  });
};

export const useAddInteractionNote = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, content, tag }: { id: string; content: string; tag?: string }) =>
      interactionApi.addNote(id, content, tag),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['interactions', variables.id, 'notes'] });
    },
  });
};
```

---

*Continued in next section...*


## 6. Component Integration Patterns

### 6.1 InteractionList Integration

**Current:** Mock data from `App.tsx`
**Target:** API + WebSocket

**Changes:**

```typescript
// Before (useInteractionStats.tsx)
const interactions = mockInteractions; // from App.tsx

// After
import { useInteractions } from '@/hooks/useInteractions';
import { interactionQueueChannel } from '@/lib/ws/interaction-queue';

const { data, isLoading, error } = useInteractions({
  statusTab: currentTab,
  channel: selectedChannel,
  search: searchQuery,
});

// WebSocket subscription
useEffect(() => {
  const handler = (event: QueueUpdateEvent) => {
    queryClient.setQueryData(['interactions'], (old) => {
      // Update cache with new/updated interaction
    });
  };

  interactionQueueChannel.subscribe(agentId, handler);
  return () => interactionQueueChannel.unsubscribe(agentId, handler);
}, [agentId]);
```

### 6.2 CustomerInfoScrollFixed Integration

**Current:** Mock customer data from `App.tsx`
**Target:** API

**Changes:**

```typescript
// Before
const customer = mockCustomers.find(c => c.id === customerId);

// After
import { useCustomer, useCustomerInteractions, useCustomerTickets } from '@/hooks/useCustomers';

const { data: customer, isLoading } = useCustomer(customerId);
const { data: interactions } = useCustomerInteractions(customerId);
const { data: tickets } = useCustomerTickets(customerId);

// Show loading skeleton while fetching
if (isLoading) {
  return <CustomerSkeleton />;
}
```

### 6.3 CreateTicketDialog Integration

**Current:** Local state only
**Target:** API mutation

**Changes:**

```typescript
// Before
const handleSubmit = () => {
  const newTicket = { ...formData, id: generateId() };
  setTickets([...tickets, newTicket]);
  onClose();
};

// After
import { useCreateTicket } from '@/hooks/useTickets';

const createTicket = useCreateTicket();

const handleSubmit = async () => {
  try {
    await createTicket.mutateAsync(formData);
    toast.success('Ticket đã được tạo thành công');
    onClose();
  } catch (error) {
    toast.error('Không thể tạo ticket');
  }
};
```

### 6.4 NotificationContext Integration

**Current:** Mock notifications in context
**Target:** API + WebSocket

**Changes:**

```typescript
// Before
const [notifications, setNotifications] = useState(mockNotifications);

// After
import { useNotifications } from '@/hooks/useNotifications';
import { notificationChannel } from '@/lib/ws/notifications';

const { data: notifications } = useNotifications();

// WebSocket subscription
useEffect(() => {
  const handler = (event: NotificationEvent) => {
    // Add new notification to cache
    queryClient.setQueryData(['notifications'], (old) => [event, ...old]);
    
    // Show toast
    toast({
      title: event.title,
      description: event.message,
      variant: event.priority === 'urgent' ? 'destructive' : 'default',
    });
    
    // Play sound
    if (settings.enableSound) {
      playNotificationSound();
    }
  };

  notificationChannel.subscribe(agentId, handler);
  return () => notificationChannel.unsubscribe(agentId, handler);
}, [agentId]);
```

### 6.5 EnhancedAgentStatusContext Integration

**Current:** Local state only
**Target:** API + WebSocket

**Changes:**

```typescript
// Before
const [channelStatuses, setChannelStatuses] = useState(mockStatuses);

// After
import { useAgentStatus, useUpdateAgentStatus } from '@/hooks/useAgents';
import { agentStatusChannel } from '@/lib/ws/agent-status';

const { data: statuses } = useAgentStatus(agentId);
const updateStatus = useUpdateAgentStatus();

const setChannelStatus = async (channel: string, status: string, reason?: string) => {
  try {
    await updateStatus.mutateAsync({ channel, status, reason });
  } catch (error) {
    toast.error('Không thể cập nhật trạng thái');
  }
};

// WebSocket subscription for supervisor updates
useEffect(() => {
  const handler = (event: AgentStatusEvent) => {
    queryClient.setQueryData(['agent', agentId, 'status'], (old) => {
      // Update status in cache
    });
  };

  agentStatusChannel.subscribe(agentId, handler);
  return () => agentStatusChannel.unsubscribe(agentId, handler);
}, [agentId]);
```

---

## 7. Error Handling Strategy

### 7.1 API Error Types

```typescript
// src/lib/api/errors.ts

export class ApiError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public details?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export const handleApiError = (error: any): ApiError => {
  if (error.response) {
    const { status, data } = error.response;
    return new ApiError(
      status,
      data.error || 'UNKNOWN_ERROR',
      data.message || 'Đã xảy ra lỗi',
      data.details
    );
  }

  if (error.request) {
    return new ApiError(0, 'NETWORK_ERROR', 'Không thể kết nối đến máy chủ');
  }

  return new ApiError(0, 'UNKNOWN_ERROR', error.message || 'Đã xảy ra lỗi không xác định');
};
```

### 7.2 Error Boundary

```typescript
// src/components/ErrorBoundary.tsx

import React, { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="flex items-center justify-center h-screen">
            <div className="text-center">
              <h1 className="text-2xl font-bold mb-4">Đã xảy ra lỗi</h1>
              <p className="text-gray-600 mb-4">Vui lòng tải lại trang</p>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-blue-600 text-white rounded"
              >
                Tải lại
              </button>
            </div>
          </div>
        )
      );
    }

    return this.props.children;
  }
}
```

### 7.3 Toast Notifications

```typescript
// src/lib/toast.ts

import { toast as sonnerToast } from 'sonner';

export const toast = {
  success: (message: string) => {
    sonnerToast.success(message);
  },

  error: (message: string) => {
    sonnerToast.error(message);
  },

  info: (message: string) => {
    sonnerToast.info(message);
  },

  warning: (message: string) => {
    sonnerToast.warning(message);
  },

  apiError: (error: any) => {
    const apiError = handleApiError(error);
    
    const messages: Record<string, string> = {
      NETWORK_ERROR: 'Không thể kết nối đến máy chủ',
      UNAUTHORIZED: 'Phiên đăng nhập đã hết hạn',
      FORBIDDEN: 'Bạn không có quyền thực hiện thao tác này',
      NOT_FOUND: 'Không tìm thấy dữ liệu',
      VALIDATION_ERROR: 'Dữ liệu không hợp lệ',
      SERVER_ERROR: 'Lỗi hệ thống, vui lòng thử lại sau',
    };

    const message = messages[apiError.code] || apiError.message;
    sonnerToast.error(message);
  },
};
```

---

## 8. Loading States

### 8.1 Skeleton Components

```typescript
// src/components/skeletons/InteractionListSkeleton.tsx

export const InteractionListSkeleton = () => {
  return (
    <div className="space-y-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="p-4 border rounded animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
          <div className="h-3 bg-gray-200 rounded w-1/2"></div>
        </div>
      ))}
    </div>
  );
};

// src/components/skeletons/CustomerSkeleton.tsx

export const CustomerSkeleton = () => {
  return (
    <div className="p-4 space-y-4 animate-pulse">
      <div className="flex items-center space-x-4">
        <div className="w-16 h-16 bg-gray-200 rounded-full"></div>
        <div className="flex-1">
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
          <div className="h-3 bg-gray-200 rounded w-1/3"></div>
        </div>
      </div>
      <div className="space-y-2">
        <div className="h-3 bg-gray-200 rounded"></div>
        <div className="h-3 bg-gray-200 rounded"></div>
        <div className="h-3 bg-gray-200 rounded w-2/3"></div>
      </div>
    </div>
  );
};
```

### 8.2 Loading Indicators

```typescript
// src/components/LoadingSpinner.tsx

export const LoadingSpinner = ({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  };

  return (
    <div className="flex items-center justify-center">
      <div
        className={`${sizeClasses[size]} border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin`}
      ></div>
    </div>
  );
};
```

---

## 9. Connection Status Indicator

### 9.1 Connection Status Component

```typescript
// src/components/ConnectionStatus.tsx

import { useEffect, useState } from 'react';
import { wsClient } from '@/lib/ws/client';
import { Wifi, WifiOff } from 'lucide-react';

export const ConnectionStatus = () => {
  const [isConnected, setIsConnected] = useState(wsClient.connected);
  const [isReconnecting, setIsReconnecting] = useState(false);

  useEffect(() => {
    const checkConnection = () => {
      setIsConnected(wsClient.connected);
    };

    const interval = setInterval(checkConnection, 1000);
    return () => clearInterval(interval);
  }, []);

  if (isConnected) {
    return null; // Don't show anything when connected
  }

  return (
    <div className="fixed top-16 left-1/2 transform -translate-x-1/2 z-50">
      <div className="bg-yellow-100 border border-yellow-400 text-yellow-800 px-4 py-2 rounded-lg shadow-lg flex items-center space-x-2">
        <WifiOff className="w-4 h-4" />
        <span>
          {isReconnecting ? 'Đang kết nối lại...' : 'Mất kết nối, đang thử lại...'}
        </span>
      </div>
    </div>
  );
};
```

---

## 10. Performance Optimization

### 10.1 Code Splitting

```typescript
// src/App.tsx

import { lazy, Suspense } from 'react';
import { LoadingSpinner } from '@/components/LoadingSpinner';

// Lazy load heavy components
const InteractionDetail = lazy(() => import('@/components/InteractionDetail'));
const CustomerInfoScrollFixed = lazy(() => import('@/components/CustomerInfoScrollFixed'));
const KnowledgeBaseSearch = lazy(() => import('@/components/KnowledgeBaseSearch'));

// Wrap with Suspense
<Suspense fallback={<LoadingSpinner size="lg" />}>
  <InteractionDetail />
</Suspense>
```

### 10.2 React Query Optimizations

```typescript
// Prefetch on hover
const prefetchInteraction = (id: string) => {
  queryClient.prefetchQuery({
    queryKey: ['interactions', id],
    queryFn: () => interactionApi.getById(id).then((res) => res.data),
  });
};

// Use in InteractionList
<div
  onMouseEnter={() => prefetchInteraction(interaction.id)}
  onClick={() => selectInteraction(interaction.id)}
>
  {/* Interaction item */}
</div>
```

### 10.3 Debounced Search

```typescript
// src/hooks/useDebounce.ts

import { useEffect, useState } from 'react';

export const useDebounce = <T,>(value: T, delay: number): T => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

// Usage in search
const [searchQuery, setSearchQuery] = useState('');
const debouncedSearch = useDebounce(searchQuery, 300);

const { data } = useInteractions({
  search: debouncedSearch,
});
```

---

## 11. Testing Strategy

### 11.1 API Client Tests

```typescript
// src/lib/api/__tests__/client.test.ts

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiClient } from '../client';
import axios from 'axios';

vi.mock('axios');

describe('API Client', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should attach access token to requests', async () => {
    const mockGet = vi.spyOn(axios, 'get');
    // Test implementation
  });

  it('should refresh token on 401', async () => {
    // Test implementation
  });

  it('should logout on refresh failure', async () => {
    // Test implementation
  });
});
```

### 11.2 Component Integration Tests

```typescript
// src/components/__tests__/InteractionList.test.tsx

import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { InteractionList } from '../InteractionList';
import * as api from '@/lib/api/interactions';

describe('InteractionList', () => {
  it('should load interactions from API', async () => {
    const mockData = {
      interactions: [
        { id: '1', subject: 'Test Interaction', channel: 'voice' },
      ],
      total: 1,
    };

    vi.spyOn(api.interactionApi, 'getAll').mockResolvedValue({ data: mockData });

    const queryClient = new QueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <InteractionList />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Test Interaction')).toBeInTheDocument();
    });
  });

  it('should show loading skeleton', () => {
    // Test implementation
  });

  it('should handle API errors', async () => {
    // Test implementation
  });
});
```

### 11.3 E2E Tests

```typescript
// e2e/login-flow.spec.ts

import { test, expect } from '@playwright/test';

test('agent can log in and see queue', async ({ page }) => {
  await page.goto('http://localhost:3000');

  // Login
  await page.fill('input[name="username"]', 'agent1');
  await page.fill('input[name="password"]', 'password123');
  await page.click('button:has-text("Đăng nhập")');

  // Wait for redirect
  await page.waitForURL('**/agent');

  // Check queue loaded
  await expect(page.locator('.interaction-list')).toBeVisible();
  await expect(page.locator('.interaction-item')).toHaveCount(5);
});

test('agent can create ticket', async ({ page }) => {
  // Login first
  await page.goto('http://localhost:3000/agent');
  // ... login steps

  // Open create ticket dialog
  await page.click('button:has-text("Tạo Ticket")');

  // Fill form
  await page.fill('input[name="title"]', 'Test Ticket');
  await page.fill('textarea[name="description"]', 'Test Description');
  await page.selectOption('select[name="priority"]', 'high');

  // Submit
  await page.click('button:has-text("Tạo")');

  // Check success
  await expect(page.locator('text=Ticket đã được tạo thành công')).toBeVisible();
});
```

---

## 12. Deployment Configuration

### 12.1 Environment Variables

**Development (.env.development):**
```
VITE_API_BASE_URL=http://localhost:8000
VITE_WS_URL=ws://localhost:8000
VITE_ENV=development
```

**Staging (.env.staging):**
```
VITE_API_BASE_URL=https://api-staging.tpb.vn
VITE_WS_URL=wss://api-staging.tpb.vn
VITE_ENV=staging
```

**Production (.env.production):**
```
VITE_API_BASE_URL=https://api.tpb.vn
VITE_WS_URL=wss://api.tpb.vn
VITE_ENV=production
```

### 12.2 Vite Build Configuration

```typescript
// vite.config.ts

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'query-vendor': ['@tanstack/react-query'],
          'ui-vendor': ['lucide-react', 'sonner'],
          'chart-vendor': ['recharts'],
        },
      },
    },
    chunkSizeWarningLimit: 1000,
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/ws': {
        target: 'ws://localhost:8000',
        ws: true,
      },
    },
  },
});
```

---

## 13. Migration Checklist

### 13.1 Phase 1: Setup (Week 1)

- [ ] Install dependencies: axios, @tanstack/react-query, socket.io-client
- [ ] Create API client structure
- [ ] Create WebSocket client
- [ ] Implement AuthContext
- [ ] Create login page
- [ ] Test authentication flow

### 13.2 Phase 2: Core Integration (Week 2-3)

- [ ] Integrate InteractionList with API
- [ ] Integrate CustomerInfoScrollFixed with API
- [ ] Integrate CreateTicketDialog with API
- [ ] Integrate NotificationContext with API + WebSocket
- [ ] Integrate EnhancedAgentStatusContext with API + WebSocket
- [ ] Remove mock data from App.tsx

### 13.3 Phase 3: Advanced Features (Week 4)

- [ ] Integrate KnowledgeBaseSearch with API
- [ ] Integrate InformationQuery (BFSI) with API
- [ ] Integrate AI Assistant with API
- [ ] Integrate CallRecordingPlayer with API
- [ ] Integrate CTI (if available)

### 13.4 Phase 4: Testing & Optimization (Week 5-6)

- [ ] Write unit tests for API client
- [ ] Write integration tests for components
- [ ] Write E2E tests for critical paths
- [ ] Performance optimization (code splitting, lazy loading)
- [ ] Error handling improvements
- [ ] Connection status indicator
- [ ] Final testing and bug fixes

---

*End of design.md*
