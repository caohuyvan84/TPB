import { z } from 'zod';

// Agent Status DTOs
export const ChannelTypeSchema = z.enum(['voice', 'email', 'chat']);
export const AgentStatusSchema = z.enum(['ready', 'not-ready']);
export const NotReadyReasonSchema = z.enum([
  'break',
  'training',
  'meeting',
  'technical-issue',
  'system-maintenance',
  'other',
]);

export const ChannelStatusSchema = z.object({
  status: AgentStatusSchema,
  reason: NotReadyReasonSchema.optional(),
  lastChanged: z.date(),
  customReason: z.string().optional(),
});

export const SetChannelStatusDtoSchema = z.object({
  channel: ChannelTypeSchema,
  status: AgentStatusSchema,
  reason: NotReadyReasonSchema.optional(),
  customReason: z.string().optional(),
});

// Interaction DTOs
export const InteractionChannelSchema = z.enum(['voice', 'email', 'chat']);
export const InteractionStatusSchema = z.enum(['waiting', 'active', 'wrap-up', 'completed']);
export const InteractionPrioritySchema = z.enum(['low', 'normal', 'high', 'urgent']);

export const CreateInteractionDtoSchema = z.object({
  channel: InteractionChannelSchema,
  customerId: z.string().uuid(),
  priority: InteractionPrioritySchema.default('normal'),
  subject: z.string().optional(),
});

export const UpdateInteractionDtoSchema = z.object({
  status: InteractionStatusSchema.optional(),
  priority: InteractionPrioritySchema.optional(),
  assignedAgent: z.string().uuid().optional(),
});

// Customer DTOs
export const CreateCustomerDtoSchema = z.object({
  name: z.string().min(1).max(255),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  accountNumber: z.string().optional(),
  segment: z.string().optional(),
});

export const UpdateCustomerDtoSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  accountNumber: z.string().optional(),
  segment: z.string().optional(),
  status: z.string().optional(),
});

// Ticket DTOs
export const TicketStatusSchema = z.enum(['open', 'in-progress', 'pending', 'resolved', 'closed']);
export const TicketPrioritySchema = z.enum(['low', 'normal', 'high', 'urgent']);

export const CreateTicketDtoSchema = z.object({
  subject: z.string().min(1).max(255),
  description: z.string().min(1),
  priority: TicketPrioritySchema.default('normal'),
  customerId: z.string().uuid(),
});

export const UpdateTicketDtoSchema = z.object({
  subject: z.string().min(1).max(255).optional(),
  description: z.string().min(1).optional(),
  status: TicketStatusSchema.optional(),
  priority: TicketPrioritySchema.optional(),
  assignedAgent: z.string().uuid().optional(),
});

// Notification DTOs
export const NotificationTypeSchema = z.enum(['info', 'warning', 'error', 'success']);

export const CreateNotificationDtoSchema = z.object({
  type: NotificationTypeSchema,
  title: z.string().min(1).max(255),
  message: z.string().min(1),
  actionUrl: z.string().url().optional(),
});

// Common DTOs
export const PaginationParamsSchema = z.object({
  page: z.number().int().positive().default(1),
  pageSize: z.number().int().positive().max(100).default(20),
});

export const SortParamsSchema = z.object({
  field: z.string(),
  order: z.enum(['asc', 'desc']).default('asc'),
});

// Login/Auth DTOs
export const LoginDtoSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export const RegisterDtoSchema = z.object({
  username: z.string().min(3).max(50),
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
});

// Type exports (inferred from schemas)
export type ChannelType = z.infer<typeof ChannelTypeSchema>;
export type AgentStatus = z.infer<typeof AgentStatusSchema>;
export type NotReadyReason = z.infer<typeof NotReadyReasonSchema>;
export type ChannelStatus = z.infer<typeof ChannelStatusSchema>;
export type SetChannelStatusDto = z.infer<typeof SetChannelStatusDtoSchema>;

export type InteractionChannel = z.infer<typeof InteractionChannelSchema>;
export type InteractionStatus = z.infer<typeof InteractionStatusSchema>;
export type InteractionPriority = z.infer<typeof InteractionPrioritySchema>;
export type CreateInteractionDto = z.infer<typeof CreateInteractionDtoSchema>;
export type UpdateInteractionDto = z.infer<typeof UpdateInteractionDtoSchema>;

export type CreateCustomerDto = z.infer<typeof CreateCustomerDtoSchema>;
export type UpdateCustomerDto = z.infer<typeof UpdateCustomerDtoSchema>;

export type TicketStatus = z.infer<typeof TicketStatusSchema>;
export type TicketPriority = z.infer<typeof TicketPrioritySchema>;
export type CreateTicketDto = z.infer<typeof CreateTicketDtoSchema>;
export type UpdateTicketDto = z.infer<typeof UpdateTicketDtoSchema>;

export type NotificationType = z.infer<typeof NotificationTypeSchema>;
export type CreateNotificationDto = z.infer<typeof CreateNotificationDtoSchema>;

export type PaginationParams = z.infer<typeof PaginationParamsSchema>;
export type SortParams = z.infer<typeof SortParamsSchema>;

export type LoginDto = z.infer<typeof LoginDtoSchema>;
export type RegisterDto = z.infer<typeof RegisterDtoSchema>;
