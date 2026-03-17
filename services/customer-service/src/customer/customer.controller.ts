import { Controller, Get, Post, Body, Param, Query, Req } from '@nestjs/common';
import { Request } from 'express';
import { CustomerService } from './customer.service';

@Controller('customers')
export class CustomerController {
  constructor(private customerService: CustomerService) {}

  @Get()
  async search(@Query('q') query?: string) {
    return this.customerService.searchCustomers(query);
  }

  @Get(':id')
  async getOne(@Param('id') id: string) {
    return this.customerService.getCustomer(id);
  }

  @Get(':id/interactions')
  async getInteractions(@Param('id') id: string) {
    return this.customerService.getCustomerInteractions(id);
  }

  @Get(':id/notes')
  async getNotes(@Param('id') id: string) {
    return this.customerService.getNotes(id);
  }

  @Post(':id/notes')
  async addNote(
    @Param('id') id: string,
    @Body() body: { content: string },
    @Req() req: Request,
  ) {
    const user = (req as any).user;
    const agentId = user?.sub || user?.id || '00000000-0000-0000-0000-000000000001';
    const agentName = user?.fullName || user?.username || 'System Administrator';

    return this.customerService.addNote(id, agentId, agentName, body.content);
  }
}
