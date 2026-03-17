import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { User, RefreshToken, LoginAttempt } from '../entities';
import { PasswordService } from './password.service';
import { TokenService, JwtPayload } from './token.service';
import { MfaService } from './mfa.service';
import { RedisService } from '../common/redis.service';
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
    private mfaService: MfaService,
    private redisService: RedisService,
  ) {}

  async login(loginDto: LoginDto, ip: string, userAgent: string) {
    const user = await this.userRepository.findOne({
      where: { username: loginDto.username },
      relations: ['roles'],
    });

    // Log attempt
    await this.logLoginAttempt(user?.id || null, loginDto.username, ip, userAgent, false, 'Invalid credentials');

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
    user.lockedUntil = undefined;
    user.lastLoginAt = new Date();
    await this.userRepository.save(user);

    // Log successful attempt
    await this.logLoginAttempt(user.id, user.username, ip, userAgent, true, undefined);

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
    
    // Check Redis blacklist
    const isBlacklisted = await this.redisService.exists(`blacklist:${tokenHash}`);
    if (isBlacklisted) {
      throw new Error('Token has been revoked');
    }
    
    const storedToken = await this.refreshTokenRepository.findOne({
      where: { tokenHash, revoked: false },
      relations: ['user', 'user.roles'],
    });

    if (!storedToken || storedToken.expiresAt < new Date()) {
      throw new Error('Invalid refresh token');
    }

    // Revoke old token and add to blacklist
    storedToken.revoked = true;
    await this.refreshTokenRepository.save(storedToken);
    await this.redisService.setex(`blacklist:${tokenHash}`, 7 * 24 * 60 * 60, '1');

    // Generate new tokens
    return this.generateTokens(storedToken.user, ip, userAgent);
  }

  async logout(refreshToken: string) {
    const tokenHash = this.hashToken(refreshToken);
    await this.refreshTokenRepository.update({ tokenHash }, { revoked: true });
    await this.redisService.setex(`blacklist:${tokenHash}`, 7 * 24 * 60 * 60, '1');
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
    const refreshTokenEntity = await this.refreshTokenRepository.save({
      userId: user.id,
      tokenHash,
      ipAddress: ip,
      userAgent,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    // Store session in Redis (15 min TTL)
    await this.redisService.setex(
      `session:${user.id}`,
      900,
      JSON.stringify({
        userId: user.id,
        username: user.username,
        agentId: user.agentId,
        ip,
        userAgent,
        loginAt: new Date().toISOString(),
      })
    );

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
    userId: string | null,
    username: string,
    ip: string,
    userAgent: string,
    success: boolean,
    failureReason?: string,
  ) {
    await this.loginAttemptRepository.save({
      userId: userId || undefined,
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

  async setupMfa(userId: string) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new Error('User not found');
    }

    const { secret, qrCode } = this.mfaService.generateSecret(user.username);
    const qrCodeDataUrl = await this.mfaService.generateQRCode(qrCode);

    // Store secret temporarily (will be confirmed after verification)
    user.mfaSecret = secret;
    await this.userRepository.save(user);

    return {
      secret,
      qrCode: qrCodeDataUrl,
    };
  }

  async verifyMfa(mfaToken: string, code: string, ip: string, userAgent: string) {
    const payload = this.tokenService.verifyAccessToken(mfaToken);
    const user = await this.userRepository.findOne({
      where: { id: payload.sub },
      relations: ['roles'],
    });

    if (!user || !user.mfaSecret) {
      throw new Error('Invalid MFA setup');
    }

    const isValid = this.mfaService.verifyToken(user.mfaSecret, code);
    if (!isValid) {
      throw new Error('Invalid MFA code');
    }

    // Enable MFA if not already enabled
    if (!user.mfaEnabled) {
      user.mfaEnabled = true;
      await this.userRepository.save(user);
    }

    // Generate full tokens
    return this.generateTokens(user, ip, userAgent);
  }

  async disableMfa(userId: string) {
    await this.userRepository.update(userId, {
      mfaEnabled: false,
      mfaSecret: undefined,
    });
  }

  async getUserSessions(userId: string) {
    const tokens = await this.refreshTokenRepository.find({
      where: { userId, revoked: false },
      order: { createdAt: 'DESC' },
    });

    return tokens.map(token => ({
      id: token.id,
      ipAddress: token.ipAddress,
      userAgent: token.userAgent,
      createdAt: token.createdAt,
      expiresAt: token.expiresAt,
    }));
  }
}
