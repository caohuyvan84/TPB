import { Controller, Get } from '@nestjs/common';
import { AdapterRegistryService } from './adapter-registry.service';

@Controller('gateway')
export class GatewayController {
  constructor(private registry: AdapterRegistryService) {}

  @Get('adapters')
  listAdapters() {
    return this.registry.getAll().map((a) => ({
      channelType: a.channelType,
    }));
  }

  @Get('health')
  health() {
    return { status: 'ok', service: 'channel-gateway' };
  }
}
