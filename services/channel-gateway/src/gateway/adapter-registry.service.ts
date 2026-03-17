import { Injectable, Logger } from '@nestjs/common';
import { IChannelAdapter } from './channel-adapter.interface';

@Injectable()
export class AdapterRegistryService {
  private readonly logger = new Logger(AdapterRegistryService.name);
  private adapters = new Map<string, IChannelAdapter>();

  register(adapter: IChannelAdapter): void {
    this.adapters.set(adapter.channelType, adapter);
    this.logger.log(`Adapter registered: ${adapter.channelType}`);
  }

  unregister(channelType: string): void {
    this.adapters.delete(channelType);
    this.logger.log(`Adapter unregistered: ${channelType}`);
  }

  get(channelType: string): IChannelAdapter | undefined {
    return this.adapters.get(channelType);
  }

  getAll(): IChannelAdapter[] {
    return Array.from(this.adapters.values());
  }

  has(channelType: string): boolean {
    return this.adapters.has(channelType);
  }
}
