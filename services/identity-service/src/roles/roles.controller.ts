import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Req,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { Permissions } from '../decorators/auth.decorators';
import { RolesService } from './roles.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';

@Controller('roles')
@UseGuards(JwtAuthGuard)
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get()
  @Permissions('roles:read')
  async getRoles(@Req() req: any) {
    return this.rolesService.findAll(req.user.tenantId);
  }

  @Get(':id')
  @Permissions('roles:read')
  async getRoleById(@Param('id', ParseUUIDPipe) id: string) {
    return this.rolesService.findById(id);
  }

  @Post()
  @Permissions('roles:create')
  async createRole(@Body() dto: CreateRoleDto, @Req() req: any) {
    return this.rolesService.create(dto, req.user.tenantId);
  }

  @Patch(':id')
  @Permissions('roles:update')
  async updateRole(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateRoleDto,
  ) {
    return this.rolesService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @Permissions('roles:delete')
  async deleteRole(@Param('id', ParseUUIDPipe) id: string) {
    return this.rolesService.delete(id);
  }
}
