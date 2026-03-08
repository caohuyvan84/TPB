import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { User, RefreshToken, LoginAttempt } from '../entities';
import { PasswordService } from './password.service';
import { TokenService, JwtPayload } from './token.service';
import { LoginDto } from './dto/auth.dto';
import * as crypto from 'crypto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(RefreshToken)
    private refreshTokenRepository: Repository<RefreshToken>,
    @InjectRepository(LoginAttempt)
    private loginAttemptRepository: Repository<LoginAttempt>,
    private passwordService: PasswordService,
    private tokenService: TokenService,
  ) {}

  async login(loginDto: LoginDto, ip: string, userAgent: string) {
    const user = await this.userRepository.findOne({
      where: { username: loginDto.username },
      relations: ['roles'],
    });

    // Log attempt
    await this.logLoginAttempt(user?.id, loginDto.username, ip, userAgent, false, 'Invalid credentials');

    if (!user) {
      throw new Error('Invalid credentials');
    }

    // Check account lock
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw new Error('Account is locked');
    }

    // Verify password
    const isValid = await this.passwordService.compare(loginDto.password, user.passwordHash);
    
    if (!isValid) {
      // Increment failed attempts
      user.failedLoginAttempts += 1;
      
      // Lock account after 5 failed attempts
      if (user.failedLoginAttempts >= 5) {
        user.lockedUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
      }
      
      await this.userRepository.save(user);
      throw new Error('Invalid credentials');
    }

    // Reset failed attempts
    user.failedLoginAttempts = 0;
    user.lockedUntil = null;
    user.lastLoginAt = new Date();
    await this.userRepository.save(user);

    // Log successful attempt
    await this.logLoginAttempt(user.id, user.username, ip, userAgent, true, null);

    // Check MFA
    if (user.mfaEnabled) {
      // Return partial token for MFA flow
      return {
        requiresMfa: true,
        mfaToken: this.generateMfaToken(user.id),
      };
    }

    // Generate tokens
    return this.generateTokens(user, ip, userAgent);
  }

  async refreshTokens(refreshToken: string, ip: string, userAgent: string) {
    const tokenHash = this.hashToken(refreshToken);
    
    const storedToken = await this.refreshTokenRepository.findOne({
      where: { tokenHash, revoked: false },
      relations: ['user', 'user.roles'],
    });

    if (!storedToken || storedToken.expiresAt < new Date()) {
      throw new Error('Invalid refresh token');
    }

    // Revoke old token
    storedToken.revoked = true;
    await this.refreshTokenRepository.save(storedToken);

    // Generate new tokens
    return this.generateTokens(storedToken.user, ip, userAgent);
  }

  async logout(refreshToken: string) {
    const tokenHash = this.hashToken(refreshToken);
    await this.refreshTokenRepository.update({ tokenHash }, { revoked: true });
  }

  private async generateTokens(user: User, ip: string, userAgent: string) {
    const payload: JwtPayload = {
      sub: user.id,
      username: user.username,
      agentId: user.agentId,
      tenantId: user.tenantId,
      roles: user.roles.map(r => r.name),
      permissions: user.roles.flatMap(r => r.permissions),
    };

    const accessToken = this.tokenService.generateAccessToken(payload);
    const refreshToken = this.tokenService.generateRefreshToken(payload);

    // Store refresh token
    const tokenHash = this.hashToken(refreshToken);
    await this.refreshTokenRepository.save({
      userId: user.id,
      tokenHash,
      ipAddress: ip,
      userAgent,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: 900, // 15 minutes
      tokenType: 'Bearer',
      user: {
        id: user.id,
        agentId: user.agentId,
        fullName: user.fullName,
        roles: payload.roles,
        permissions: payload.permissions,
      },
    };
  }

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  private generateMfaToken(userId: string): string {
    return this.tokenService.generateAccessToken({
      sub: userId,
      username: '',
      agentId: '',
      tenantId: '',
      roles: [],
      permissions: ['mfa:verify'],
    });
  }

  private async logLoginAttempt(
    userId: string,
    username: string,
    ip: string,
    userAgent: string,
    success: boolean,
    failureReason: string,
  ) {
    await this.loginAttemptRepository.save({
      userId,
      username,
      ipAddress: ip,
      userAgent,
      success,
      failureReason,
    });
  }

  async cleanupExpiredTokens() {
    await this.refreshTokenRepository.delete({
      expiresAt: LessThan(new Date()),
    });
  }
}
