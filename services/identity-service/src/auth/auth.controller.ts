import { Controller, Post, Body, Req, HttpCode, HttpStatus, Get, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto, RefreshTokenDto, MfaVerifyDto } from './dto/auth.dto';
import { Public } from '../decorators/auth.decorators';
import { Request } from 'express';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: LoginDto, @Req() req: Request) {
    const ip = req.ip;
    const userAgent = req.headers['user-agent'];
    return this.authService.login(loginDto, ip, userAgent);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Body() refreshDto: RefreshTokenDto, @Req() req: Request) {
    const ip = req.ip;
    const userAgent = req.headers['user-agent'];
    return this.authService.refreshTokens(refreshDto.refreshToken, ip, userAgent);
  }

  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(@Body() refreshDto: RefreshTokenDto) {
    await this.authService.logout(refreshDto.refreshToken);
  }

  @Post('mfa/setup')
  @HttpCode(HttpStatus.OK)
  async setupMfa(@Req() req: any) {
    const userId = req.user?.userId;
    return this.authService.setupMfa(userId);
  }

  @Public()
  @Post('mfa/verify')
  @HttpCode(HttpStatus.OK)
  async verifyMfa(@Body() mfaDto: MfaVerifyDto, @Req() req: Request) {
    const ip = req.ip;
    const userAgent = req.headers['user-agent'];
    return this.authService.verifyMfa(mfaDto.token, mfaDto.code, ip, userAgent);
  }

  @Get('sessions')
  @HttpCode(HttpStatus.OK)
  async getSessions(@Req() req: any) {
    const userId = req.user?.userId;
    return this.authService.getUserSessions(userId);
  }
}
