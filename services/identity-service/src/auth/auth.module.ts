import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';
import { User, Role, RefreshToken, LoginAttempt } from '../entities';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { PasswordService } from './password.service';
import { TokenService } from './token.service';
import { MfaService } from './mfa.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Role, RefreshToken, LoginAttempt]),
    JwtModule.register({}),
    ConfigModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, PasswordService, TokenService, MfaService],
  exports: [AuthService, TokenService],
})
export class AuthModule {}
