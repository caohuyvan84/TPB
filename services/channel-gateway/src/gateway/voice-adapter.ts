import { Logger } from '@nestjs/common';
import { IChannelAdapter, ChannelMessage } from './channel-adapter.interface';

/**
 * VoiceChannelAdapter — normalizes voice events from GoACD/Kafka
 * into ChannelMessage format for the routing pipeline.
 */
export class VoiceChannelAdapter implements IChannelAdapter {
  readonly channelType = 'voice';
  private readonly logger = new Logger(VoiceChannelAdapter.name);

  async initialize(): Promise<void> {
    this.logger.log('VoiceChannelAdapter initialized');
  }

  normalize(rawEvent: unknown): ChannelMessage {
    const evt = rawEvent as Record<string, any>;
    return {
      messageId: evt.callId || evt.uuid || `voice-${Date.now()}`,
      channelType: 'voice',
      direction: evt.direction || 'inbound',
      from: evt.callerNumber || evt.from || '',
      to: evt.destNumber || evt.to || '',
      content: undefined,
      metadata: {
        callId: evt.callId,
        callerName: evt.callerName,
        ivrSelection: evt.ivrSelection,
        queue: evt.queue,
      },
      timestamp: new Date(),
    };
  }

  async send(message: ChannelMessage): Promise<void> {
    this.logger.log(`VoiceAdapter send (outbound not implemented): ${message.messageId}`);
  }

  async destroy(): Promise<void> {
    this.logger.log('VoiceChannelAdapter destroyed');
  }
}
