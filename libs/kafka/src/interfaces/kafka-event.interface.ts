/** Base envelope for all Kafka events. */
export interface KafkaEvent<T = unknown> {
  /** Unique event ID (UUID v4). */
  eventId: string;
  /** ISO-8601 timestamp. */
  timestamp: string;
  /** Dot-separated topic (e.g. 'agent.status_changed'). */
  type: string;
  /** Service that produced the event. */
  source: string;
  /** Payload. */
  data: T;
}

/** Well-known Kafka topics for the voice channel. */
export const KafkaTopics = {
  // Agent events
  AGENT_LOGIN: 'agent.login',
  AGENT_LOGOUT: 'agent.logout',
  AGENT_STATUS_CHANGED: 'agent.status_changed',
  AGENT_CREATED: 'agent.created',

  // Interaction events
  INTERACTION_CREATED: 'interaction.created',
  INTERACTION_ASSIGNED: 'interaction.assigned',
  INTERACTION_TRANSFERRED: 'interaction.transferred',
  INTERACTION_CLOSED: 'interaction.closed',

  // Channel events
  CHANNEL_INBOUND: 'channel.inbound',
  CHANNEL_OUTBOUND: 'channel.outbound',

  // CDR events
  CDR_CREATED: 'cdr.created',

  // Notification events
  NOTIFICATION_CREATED: 'notification.created',
} as const;

export type KafkaTopic = (typeof KafkaTopics)[keyof typeof KafkaTopics];
