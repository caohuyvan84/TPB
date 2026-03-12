import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule } from '@nestjs/config';
import { User, Role, RefreshToken, LoginAttempt } from '../entities';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { PasswordService } from './password.service';
import { TokenService } from './token.service';
import { MfaService } from './mfa.service';
import { JwtStrategy } from './jwt.strategy';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { PermissionsGuard } from '../guards/permissions.guard';
import { RedisService } from '../common/redis.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Role, RefreshToken, LoginAttempt]),
    PassportModule,
    JwtModule.register({}),
    ConfigModule,
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    PasswordService,
    TokenService,
    MfaService,
    JwtStrategy,
    JwtAuthGuard,
    PermissionsGuard,
    RedisService,
  ],
  exports: [AuthService, TokenService, JwtAuthGuard, PermissionsGuard, PasswordService],
})
export class AuthModule {}
