// API Response Types

export interface User {
  id: string;
  username: string;
  email: string;
  fullName: string;
  agentId?: string;
  roles: string[];
  permissions: string[];
  tenantId: string;
}

export interface AgentProfile {
  id: string;
  userId: string;
  agentId: string;
  displayName: string;
  department: string;
  team: string;
  skills: string[];
  maxConcurrentChats: number;
  maxConcurrentEmails: number;
}

export interface AgentChannelStatus {
  id: string;
  agentId: string;
  channel: 'voice' | 'email' | 'chat';
  status: 'ready' | 'not-ready' | 'disconnected';
  reason?: string;
  customReason?: string;
  changedAt: string;
}

export interface Interaction {
  id: string;
  displayId: string;
  tenantId: string;
  type: 'call' | 'missed-call' | 'email' | 'chat';
  channel: 'voice' | 'email' | 'chat';
  status: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  customerId: string;
  customerName?: string;
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

export interface Customer {
  id: string;
  tenantId: string;
  cif: string;
  fullName: string;
  email?: string;
  phone?: string;
  segment: string;
  isVIP: boolean;
  avatarUrl?: string;
  satisfactionRating?: number;
  dynamicFields: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface Ticket {
  id: string;
  displayId: string;
  tenantId: string;
  title: string;
  description?: string;
  status: string;
  priority: string;
  category?: string;
  department?: string;
  assignedAgentId?: string;
  customerId: string;
  interactionId?: string;
  dueAt?: string;
  resolvedAt?: string;
  dynamicFields: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface Notification {
  id: string;
  tenantId: string;
  agentId: string;
  type: 'call' | 'chat' | 'ticket' | 'sla' | 'system';
  priority: string;
  state: 'new' | 'viewed' | 'actioned' | 'dismissed';
  title: string;
  message: string;
  actionUrl?: string;
  actionLabel?: string;
  metadata: Record<string, any>;
  autoHideSeconds?: number;
  expiresAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface KnowledgeArticle {
  id: string;
  tenantId: string;
  title: string;
  summary?: string;
  content: string;
  tags: string[];
  category?: string;
  folderId?: string;
  viewCount: number;
  rating?: number;
  dynamicFields: Record<string, any>;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface BankAccount {
  id: string;
  accountNumber: string;
  type: string;
  balance: number;
  currency: string;
  status: string;
}

export interface AIResponse {
  suggestions: string[];
  confidence: number;
  context?: string;
}
