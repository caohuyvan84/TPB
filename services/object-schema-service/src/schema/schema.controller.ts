import { Controller, Get, Post, Put, Delete, Param, Body, Query } from '@nestjs/common';
import { SchemaService } from './schema.service';

@Controller()
export class SchemaController {
  constructor(private readonly schemaService: SchemaService) {}

  @Get('schemas/:objectType')
  async getSchema(@Param('objectType') objectType: string) {
    return this.schemaService.getSchema(objectType);
  }

  @Get('admin/object-types')
  async listObjectTypes(@Query('tenantId') tenantId: string) {
    return this.schemaService.listObjectTypes(tenantId);
  }

  @Post('admin/object-types')
  async createObjectType(@Body() data: any) {
    const tenantId = '00000000-0000-0000-0000-000000000000'; // Default tenant
    return this.schemaService.createObjectType(tenantId, data);
  }

  @Post('admin/object-types/:id/fields')
  async addField(@Param('id') objectTypeId: string, @Body() data: any) {
    return this.schemaService.addField(objectTypeId, data);
  }
}
