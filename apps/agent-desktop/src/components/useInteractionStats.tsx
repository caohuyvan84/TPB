import { useMemo } from 'react';

export interface InteractionStats {
  total: number;
  voice: number;
  email: number; 
  chat: number;
  missed: number;
  byStatus: {
    new: number;
    'in-progress': number;
    waiting: number;
    resolved: number;
    escalated: number;
    completed: number;
    active: number;
    missed: number;
  };
  byPriority: {
    low: number;
    medium: number;
    high: number;
    urgent: number;
  };
}

export type ChannelFilter = 'all' | 'voice' | 'email' | 'chat' | 'missed';
export type StatusFilter = 'all' | 'new' | 'in-progress' | 'waiting' | 'resolved' | 'escalated' | 'completed' | 'active' | 'missed';
export type PriorityFilter = 'all' | 'low' | 'medium' | 'high' | 'urgent';

export interface Interaction {
  id: string;
  type: string;
  channel: 'voice' | 'email' | 'chat';
  status: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  subject?: string;
  time?: string;
  timestamp?: string;
  agent?: string | null;
  assignedAgent?: string | null;
  tags?: string[];
  source?: string;
  duration?: string | null;
  isVIP?: boolean;
  chatSLA?: {
    status?: string;
    sessionStatus?: string;
    slaRemainingSeconds?: number;
    waitingSeconds?: number;
  };
  [key: string]: unknown;
}

export interface InteractionFilters {
  channel: ChannelFilter;
  channelSource: string; // Filter by phone number, chat page, or email address
  status: StatusFilter;
  priority: PriorityFilter;
  search: string;
}

export function useInteractionStats(interactions: Interaction[]) {
  const stats = useMemo((): InteractionStats => {
    const initial: InteractionStats = {
      total: interactions.length,
      voice: 0,
      email: 0,
      chat: 0,
      missed: 0,
      byStatus: {
        new: 0,
        'in-progress': 0,
        waiting: 0,
        resolved: 0,
        escalated: 0,
        completed: 0,
        active: 0,
        missed: 0,
      },
      byPriority: {
        low: 0,
        medium: 0,
        high: 0,
        urgent: 0,
      }
    };

    return interactions.reduce((acc, interaction) => {
      // Channel stats — only count active interactions (not closed/completed/resolved)
      const isTerminal = interaction.status === 'closed' || interaction.status === 'completed' || interaction.status === 'resolved';
      if (interaction.type === 'missed-call') {
        acc.missed++;
        if (!isTerminal) acc.voice++;
      } else if (interaction.channel === 'voice' || interaction.type === 'call') {
        if (!isTerminal) acc.voice++;
      } else if (interaction.channel === 'email' || interaction.type === 'email') {
        if (!isTerminal) acc.email++;
      } else if (interaction.channel === 'chat' || interaction.type === 'chat') {
        if (!isTerminal) acc.chat++;
      }

      // Status stats
      if (interaction.status && Object.prototype.hasOwnProperty.call(acc.byStatus, interaction.status)) {
        acc.byStatus[interaction.status as keyof typeof acc.byStatus]++;
      }

      // Priority stats
      if (interaction.priority && Object.prototype.hasOwnProperty.call(acc.byPriority, interaction.priority)) {
        acc.byPriority[interaction.priority as keyof typeof acc.byPriority]++;
      }

      return acc;
    }, initial);
  }, [interactions]);

  const filterInteractions = useMemo(() => {
    return (filters: InteractionFilters) => {
      return interactions.filter(interaction => {
        // Channel filter
        if (filters.channel !== 'all') {
          const interactionChannel = interaction.channel || interaction.type;
          if (filters.channel === 'voice' && interactionChannel !== 'voice' && interaction.type !== 'call' && interaction.type !== 'missed-call') {
            return false;
          }
          if (filters.channel === 'missed' && interaction.type !== 'missed-call') {
            return false;
          }
          if (filters.channel === 'email' && interactionChannel !== 'email' && interaction.type !== 'email') {
            return false;
          }
          if (filters.channel === 'chat' && interactionChannel !== 'chat' && interaction.type !== 'chat') {
            return false;
          }
        }

        // Channel Source filter (phone number, chat page, email address)
        if (filters.channelSource && filters.channelSource !== 'all') {
          if (interaction.source !== filters.channelSource) {
            return false;
          }
        }

        // Status filter
        if (filters.status !== 'all' && interaction.status !== filters.status) {
          return false;
        }

        // Priority filter
        if (filters.priority !== 'all' && interaction.priority !== filters.priority) {
          return false;
        }

        // Search filter
        if (filters.search.trim()) {
          const searchTerm = filters.search.toLowerCase();
          const searchableText = [
            interaction.customerName,
            interaction.subject,
            interaction.customerEmail,
            interaction.source,
            ...(interaction.tags || [])
          ].join(' ').toLowerCase();
          
          if (!searchableText.includes(searchTerm)) {
            return false;
          }
        }

        return true;
      });
    };
  }, [interactions]);

  // Get available channel sources based on current channel filter
  const getChannelSources = useMemo(() => {
    return (channelFilter: ChannelFilter) => {
      if (channelFilter === 'all') return [];
      
      const sources = new Set<string>();
      interactions.forEach(interaction => {
        const interactionChannel = interaction.channel || interaction.type;
        
        // Match interactions by channel type
        let matchesChannel = false;
        if (channelFilter === 'voice' && (interactionChannel === 'voice' || interaction.type === 'call' || interaction.type === 'missed-call')) {
          matchesChannel = true;
        } else if (channelFilter === 'missed' && interaction.type === 'missed-call') {
          matchesChannel = true;
        } else if (channelFilter === 'email' && (interactionChannel === 'email' || interaction.type === 'email')) {
          matchesChannel = true;
        } else if (channelFilter === 'chat' && (interactionChannel === 'chat' || interaction.type === 'chat')) {
          matchesChannel = true;
        }
        
        if (matchesChannel && interaction.source) {
          sources.add(interaction.source);
        }
      });
      
      return Array.from(sources).sort();
    };
  }, [interactions]);

  return {
    stats,
    filterInteractions,
    getChannelSources
  };
}