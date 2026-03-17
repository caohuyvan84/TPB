/** Normalized message format from any channel. */
export interface ChannelMessage {
  messageId: string;
  channelType: string;
  direction: 'inbound' | 'outbound';
  from: string;
  to: string;
  content?: string;
  metadata: Record<string, unknown>;
  timestamp: Date;
}

/** Interface all channel adapters must implement. */
export interface IChannelAdapter {
  readonly channelType: string;

  /** Initialize the adapter (connect to external systems, etc.). */
  initialize(): Promise<void>;

  /** Normalize an incoming raw event into a ChannelMessage. */
  normalize(rawEvent: unknown): ChannelMessage;

  /** Send an outbound message through this channel. */
  send(message: ChannelMessage): Promise<void>;

  /** Cleanup on shutdown. */
  destroy(): Promise<void>;
}
