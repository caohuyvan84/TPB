import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  @Get('me')
  async getCurrentUser(@Req() req: any) {
    return {
      id: req.user.userId,
      username: req.user.username,
      agentId: req.user.agentId,
      tenantId: req.user.tenantId,
      roles: req.user.roles,
      permissions: req.user.permissions,
    };
  }
}
