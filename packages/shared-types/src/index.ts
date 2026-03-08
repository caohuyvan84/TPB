// Agent Status Types
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

// Interaction Types
export type InteractionChannel = 'voice' | 'email' | 'chat';
export type InteractionStatus = 'waiting' | 'active' | 'wrap-up' | 'completed';
export type InteractionPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface Interaction {
  id: string;
  channel: InteractionChannel;
  status: InteractionStatus;
  priority: InteractionPriority;
  customerId: string;
  customerName: string;
  subject?: string;
  startTime: Date;
  waitingTime?: number;
  assignedAgent?: string;
}

// Customer Types
export interface Customer {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  accountNumber?: string;
  segment?: string;
  status?: string;
}

// Notification Types
export type NotificationType = 'info' | 'warning' | 'error' | 'success';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  actionUrl?: string;
}

// Ticket Types
export type TicketStatus = 'open' | 'in-progress' | 'pending' | 'resolved' | 'closed';
export type TicketPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface Ticket {
  id: string;
  subject: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  customerId: string;
  assignedAgent?: string;
  createdAt: Date;
  updatedAt: Date;
  resolvedAt?: Date;
}

// Common Types
export interface PaginationParams {
  page: number;
  pageSize: number;
  total?: number;
}

export interface SortParams {
  field: string;
  order: 'asc' | 'desc';
}

export interface FilterParams {
  [key: string]: any;
}

export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
  errors?: string[];
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: PaginationParams;
}
