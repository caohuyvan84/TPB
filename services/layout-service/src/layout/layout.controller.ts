import { Controller, Get, Post, Param, Body, Query } from '@nestjs/common';
import { LayoutService } from './layout.service';

@Controller()
export class LayoutController {
  constructor(private readonly layoutService: LayoutService) {}

  @Get('layouts/:objectType/:context')
  async getLayout(
    @Param('objectType') objectType: string,
    @Param('context') context: string,
    @Query('roles') roles: string,
  ) {
    const userRoles = roles ? roles.split(',') : [];
    return this.layoutService.getLayout(objectType, context, userRoles);
  }

  @Get('admin/layouts')
  async listLayouts(@Query('tenantId') tenantId: string, @Query('objectType') objectType?: string) {
    return this.layoutService.listLayouts(tenantId, objectType);
  }

  @Post('admin/layouts')
  async createLayout(
    @Query('tenantId') tenantId: string,
    @Query('createdBy') createdBy: string,
    @Body() data: any,
  ) {
    return this.layoutService.createLayout(tenantId, createdBy, data);
  }
}
