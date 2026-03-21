import { apiClient } from './api-client';

// Types
export interface Interaction {
  id: string;
  displayId: string;
  type: 'call' | 'missed-call' | 'email' | 'chat';
  channel: 'voice' | 'email' | 'chat';
  status: 'new' | 'in-progress' | 'resolved' | 'completed' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  customerId: string;
  customerName: string;
  assignedAgentId?: string;
  assignedAgentName?: string;
  subject?: string;
  tags: string[];
  isVIP: boolean;
  direction: 'inbound' | 'outbound';
  source?: string;
  metadata: Record<string, any>;
  slaDueAt?: string;
  slaBreached: boolean;
  createdAt: string;
  updatedAt: string;
  closedAt?: string;
}

export interface InteractionFilters {
  status?: string[];
  channel?: string[];
  priority?: string[];
  assignedAgentId?: string;
  isVIP?: boolean;
  page?: number;
  limit?: number;
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

export interface InteractionEvent {
  id: string;
  interactionId: string;
  type: string;
  timestamp: string;
  duration?: number;
  description?: string;
  agentId?: string;
  data: Record<string, any>;
}

// Map API response to frontend Interaction shape
function mapInteraction(raw: any): Interaction {
  const channelToType: Record<string, Interaction['type']> = {
    voice: 'call',
    email: 'email',
    chat: 'chat',
  };
  return {
    ...raw,
    isVIP: raw.isVIP ?? raw.isVip ?? false,
    type: channelToType[raw.channel] || raw.type || 'call',
    // Map API timestamp fields → frontend fields
    timestamp: raw.timestamp || raw.createdAt || raw.created_at || undefined,
    time: raw.time || raw.createdAt || raw.created_at || undefined,
    // Map agent fields
    assignedAgent: raw.assignedAgent || raw.assignedAgentName || raw.assignedAgentId || raw.assigned_agent_name || raw.assigned_agent_id || null,
  };
}

// API Methods
export const interactionApi = {
  // Get all interactions with filters
  getAll: async (filters?: InteractionFilters) => {
    const { data } = await apiClient.get<any>('/api/v1/interactions', {
      params: filters,
    });
    // Backend returns { data: [], nextCursor, hasMore } (cursor-based pagination)
    const items = Array.isArray(data) ? data : (data?.data ?? []);
    return items.map(mapInteraction);
  },

  // Get single interaction by ID
  getById: async (id: string) => {
    const { data } = await apiClient.get<any>(`/api/v1/interactions/${id}`);
    return mapInteraction(data);
  },

  // Update interaction status
  updateStatus: async (id: string, status: Interaction['status']) => {
    const { data } = await apiClient.put<Interaction>(
      `/api/v1/interactions/${id}/status`,
      { status }
    );
    return data;
  },

  // Assign interaction to agent
  assign: async (id: string, agentId: string) => {
    const { data } = await apiClient.put<Interaction>(
      `/api/v1/interactions/${id}/assign`,
      { agentId }
    );
    return data;
  },

  // Transfer interaction
  transfer: async (id: string, targetAgentId: string, reason?: string) => {
    const { data } = await apiClient.post<Interaction>(
      `/api/v1/interactions/${id}/transfer`,
      { targetAgentId, reason }
    );
    return data;
  },

  // Get interaction timeline
  getTimeline: async (id: string) => {
    const { data } = await apiClient.get<InteractionEvent[]>(
      `/api/v1/interactions/${id}/timeline`
    );
    return data;
  },

  // Get interaction notes
  getNotes: async (id: string) => {
    const { data } = await apiClient.get<InteractionNote[]>(
      `/api/v1/interactions/${id}/notes`
    );
    return data;
  },

  // Add interaction note
  addNote: async (id: string, content: string, tag?: string) => {
    const { data } = await apiClient.post<InteractionNote>(
      `/api/v1/interactions/${id}/notes`,
      { content, tag }
    );
    return data;
  },
};
