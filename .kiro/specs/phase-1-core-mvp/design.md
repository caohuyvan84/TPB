# Design Document: Phase 1 - Core MVP

## Introduction

This design document provides comprehensive technical specifications for implementing Phase 1: Core MVP of the TPB CRM Platform. Phase 1 replaces all mock data in the existing React Agent Desktop with live backend integration across 6 core microservices (MS-1 through MS-6), enabling real authentication, interaction management, ticket handling, customer information access, and real-time notifications.

**Design Goal:** Provide detailed technical architecture, component design, API specifications, database schemas, and integration patterns to enable implementation of all 30 requirements.

**Technology Context:** All designs use 2026 best practices and latest stable versions as documented in the requirements.

**Baseline:** Phase 0 (Foundation Setup) completed - Nx monorepo, Docker Compose infrastructure, and NestJS service scaffolds operational.

---

## 1. High-Level Architecture

### 1.1 System Architecture Overview

```mermaid
graph TB
    subgraph "Client Layer"
        AD[Agent Desktop<br/>React 19.2]
    end
    
    subgraph "API Gateway Layer"
        Kong[Kong API Gateway<br/>JWT Validation<br/>Rate Limiting<br/>mTLS Termination]
    end
    
    subgraph "Service Mesh"
        Istio[Istio Service Mesh<br/>mTLS between services]
    end
    
    subgraph "Microservices Layer"
        MS1[MS-1: Identity Service<br/>Port 3001]
        MS2[MS-2: Agent Service<br/>Port 3002]
        MS3[MS-3: Interaction Service<br/>Port 3003]
        MS4[MS-4: Ticket Service<br/>Port 3004]
        MS5[MS-5: Customer Service<br/>Port 3005]
        MS6[MS-6: Notification Service<br/>Port 3006]
    end
    
    subgraph "Data Layer"
        PG1[(PostgreSQL<br/>identity_db)]
        PG2[(PostgreSQL<br/>agent_db)]
        PG3[(PostgreSQL<br/>interaction_db)]
        PG4[(PostgreSQL<br/>ticket_db)]
        PG5[(PostgreSQL<br/>customer_db)]
        PG6[(PostgreSQL<br/>notification_db)]
        Redis[(Redis<br/>Cache & Sessions)]
        Kafka[Apache Kafka<br/>Event Streaming]
        ES[(Elasticsearch<br/>Full-text Search)]
    end
    
    AD -->|HTTPS/WSS| Kong
    Kong -->|HTTP| Istio
    Istio --> MS1
    Istio --> MS2
    Istio --> MS3
    Istio --> MS4
    Istio --> MS5
    Istio --> MS6
    
    MS1 --> PG1
    MS2 --> PG2
    MS3 --> PG3
    MS4 --> PG4
    MS5 --> PG5
    MS6 --> PG6
    
    MS1 --> Redis
    MS2 --> Redis
    MS3 --> Redis
    MS5 --> Redis
    
    MS2 --> Kafka
    MS3 --> Kafka
    MS4 --> Kafka
    MS6 --> Kafka
```


### 1.2 Technology Stack (2026 Versions)

| Layer | Technology | Version | Purpose |
|-------|------------|---------|---------|
| **Backend Runtime** | Node.js | 24.13.x LTS | Runtime environment with support until April 2028 |
| **Backend Framework** | NestJS | 10.x | TypeScript framework with DI and modular architecture |
| **Language** | TypeScript | 5.7.x | Latest with improved type inference |
| **ORM** | TypeORM | 0.3.x | Database access with migrations |
| **Validation** | class-validator | 0.14.x | DTO validation with decorators |
| **Authentication** | @nestjs/jwt | 10.x | JWT handling |
| **Password Hashing** | bcrypt | 5.x | Password security with cost factor 12 |
| **WebSocket** | @nestjs/websockets | 10.x | Real-time communication |
| **Event Streaming** | kafkajs | 2.x | Kafka client for Node.js |
| **Cache Client** | ioredis | 5.x | Redis client with cluster support |
| **Testing** | Jest | 29.x | Unit and integration testing |
| **API Testing** | Supertest | 7.x | HTTP assertions |
| **Frontend Framework** | React | 19.2.x | UI with concurrent features |
| **Build Tool** | Vite | 6.3.x | Fast HMR and optimized builds |
| **Server State** | TanStack Query | 5.x | Data fetching and caching |
| **Routing** | React Router | 7.x | Client-side routing |
| **Styling** | Tailwind CSS | 4.x | Utility-first CSS |
| **UI Components** | shadcn/ui + Radix UI | Latest | Accessible component primitives |
| **Frontend Testing** | Vitest | 3.x | Fast unit testing |
| **E2E Testing** | Playwright | 1.50.x | End-to-end testing |
| **Database** | PostgreSQL | 18.3 | Primary data store with async I/O improvements |
| **Cache** | Redis | 8.x | Cache and session store |
| **Event Bus** | Apache Kafka | 4.2.0 | Event streaming (KRaft mode) |
| **Search** | Elasticsearch | 9.x | Full-text search |
| **Object Storage** | SeaweedFS | Latest | S3-compatible storage |
| **API Gateway** | Kong | 3.x | Gateway with plugin ecosystem |
| **Containerization** | Docker | 27.x | Container runtime |
| **Orchestration** | Docker Compose | 2.x | Local multi-container management |

### 1.3 Service Communication Patterns

**Synchronous Communication:**
- Client → API Gateway: HTTPS with JWT bearer token
- API Gateway → Services: HTTP with JWT forwarding
- Service → Service: HTTP over mTLS (via Istio)

**Asynchronous Communication:**
- Event Publishing: Services publish domain events to Kafka topics
- Event Consumption: Services subscribe to relevant topics with consumer groups
- Idempotency: All consumers use eventId for deduplication

**Real-Time Communication:**
- WebSocket Protocol: STOMP over WSS
- Authentication: JWT in connection headers
- Channels: Per-agent subscriptions for status, queue, notifications, SLA updates

---

## 2. Component Design by Service

### 2.1 MS-1: Identity Service (Port 3001)

**Responsibility:** Authentication, authorization, RBAC/ABAC, session management, MFA

#### 2.1.1 Module Structure

```typescript
// apps/identity-service/src/
identity-service/
├── main.ts                          // Bootstrap application
├── app.module.ts                    // Root module
├── auth/
│   ├── auth.module.ts
│   ├── auth.controller.ts           // Login, logout, refresh, MFA endpoints
│   ├── auth.service.ts              // Authentication logic
│   ├── strategies/
│   │   ├── jwt.strategy.ts          // JWT validation strategy
│   │   └── refresh-token.strategy.ts
│   ├── guards/
│   │   ├── jwt-auth.guard.ts        // JWT authentication guard
│   │   └── roles.guard.ts           // RBAC authorization guard
│   └── dto/
│       ├── login.dto.ts
│       ├── refresh-token.dto.ts
│       └── mfa-verify.dto.ts
├── users/
│   ├── users.module.ts
│   ├── users.controller.ts          // User profile endpoints
│   ├── users.service.ts             // User management logic
│   ├── users.repository.ts          // Database access
│   └── entities/
│       ├── user.entity.ts
│       ├── role.entity.ts
│       ├── permission.entity.ts
│       └── refresh-token.entity.ts
├── sessions/
│   ├── sessions.module.ts
│   ├── sessions.controller.ts       // Session management endpoints
│   ├── sessions.service.ts
│   └── sessions.repository.ts
└── common/
    ├── decorators/
    │   ├── roles.decorator.ts       // @Roles() decorator
    │   └── public.decorator.ts      // @Public() decorator
    └── filters/
        └── http-exception.filter.ts
```

#### 2.1.2 Entity Models

**User Entity:**
```typescript
import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToMany, JoinTable, OneToMany } from 'typeorm';
import { Role } from './role.entity';
import { RefreshToken } from './refresh-token.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  username: string;

  @Column({ unique: true })
  email: string;

  @Column({ name: 'password_hash' })
  passwordHash: string;

  @Column({ name: 'full_name' })
  fullName: string;

  @Column({ name: 'agent_id' })
  agentId: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({ default: 'active' })
  status: string;

  @Column({ name: 'mfa_enabled', default: false })
  mfaEnabled: boolean;

  @Column({ name: 'mfa_secret', nullable: true })
  mfaSecret: string;

  @Column({ name: 'last_login_at', type: 'timestamptz', nullable: true })
  lastLoginAt: Date;

  @Column({ name: 'failed_login_attempts', default: 0 })
  failedLoginAttempts: number;

  @Column({ name: 'locked_until', type: 'timestamptz', nullable: true })
  lockedUntil: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToMany(() => Role, role => role.users)
  @JoinTable({
    name: 'user_roles',
    joinColumn: { name: 'user_id' },
    inverseJoinColumn: { name: 'role_id' }
  })
  roles: Role[];

  @OneToMany(() => RefreshToken, token => token.user)
  refreshTokens: RefreshToken[];
}
```

**Role Entity:**
```typescript
@Entity('roles')
export class Role {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  name: string;

  @Column({ nullable: true })
  description: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToMany(() => User, user => user.roles)
  users: User[];

  @OneToMany(() => Permission, permission => permission.role)
  permissions: Permission[];
}
```

**Permission Entity:**
```typescript
@Entity('permissions')
export class Permission {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'role_id', type: 'uuid' })
  roleId: string;

  @Column()
  resource: string;

  @Column()
  action: string;

  @Column()
  scope: string;

  @Column({ type: 'jsonb', nullable: true })
  conditions: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => Role, role => role.permissions)
  role: Role;
}
```


**RefreshToken Entity:**
```typescript
@Entity('refresh_tokens')
export class RefreshToken {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ name: 'token_fingerprint' })
  tokenFingerprint: string;

  @Column({ name: 'ip_address', type: 'inet', nullable: true })
  ipAddress: string;

  @Column({ name: 'user_agent', nullable: true })
  userAgent: string;

  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt: Date;

  @Column({ name: 'is_revoked', default: false })
  isRevoked: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => User, user => user.refreshTokens)
  user: User;
}
```

#### 2.1.3 DTO Classes

**LoginDto:**
```typescript
import { IsString, IsNotEmpty, MinLength } from 'class-validator';

export class LoginDto {
  @IsString()
  @IsNotEmpty()
  username: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(12)
  password: string;
}
```

**MfaVerifyDto:**
```typescript
export class MfaVerifyDto {
  @IsString()
  @IsNotEmpty()
  partialToken: string;

  @IsString()
  @IsNotEmpty()
  @Length(6, 6)
  code: string;
}
```

**RefreshTokenDto:**
```typescript
export class RefreshTokenDto {
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}
```

#### 2.1.4 Service Layer Logic

**AuthService:**
```typescript
import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import * as bcrypt from 'bcrypt';
import * as speakeasy from 'speakeasy';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private redis: Redis,
  ) {}

  async login(loginDto: LoginDto, ipAddress: string, userAgent: string) {
    const user = await this.usersService.findByUsername(loginDto.username);
    
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check account lock
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const remainingMinutes = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000);
      throw new UnauthorizedException(`Account locked. Try again in ${remainingMinutes} minutes`);
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(loginDto.password, user.passwordHash);
    
    if (!isPasswordValid) {
      await this.handleFailedLogin(user);
      throw new UnauthorizedException('Invalid credentials');
    }

    // Reset failed attempts on successful password verification
    await this.usersService.resetFailedAttempts(user.id);

    // Check MFA
    if (user.mfaEnabled) {
      const partialToken = this.generatePartialToken(user);
      return {
        requiresMfa: true,
        partialToken,
      };
    }

    // Generate tokens
    return this.generateTokens(user, ipAddress, userAgent);
  }

  async verifyMfa(mfaVerifyDto: MfaVerifyDto, ipAddress: string, userAgent: string) {
    const payload = this.jwtService.verify(mfaVerifyDto.partialToken);
    const user = await this.usersService.findById(payload.sub);

    const isValid = speakeasy.totp.verify({
      secret: user.mfaSecret,
      encoding: 'base32',
      token: mfaVerifyDto.code,
      window: 1,
    });

    if (!isValid) {
      throw new UnauthorizedException('Invalid MFA code');
    }

    return this.generateTokens(user, ipAddress, userAgent);
  }

  async refreshToken(refreshTokenDto: RefreshTokenDto) {
    const tokenFingerprint = this.hashToken(refreshTokenDto.refreshToken);
    
    // Check if token is blacklisted
    const isBlacklisted = await this.redis.get(`blacklist:${tokenFingerprint}`);
    if (isBlacklisted) {
      throw new UnauthorizedException('Token has been revoked');
    }

    // Verify token
    const payload = this.jwtService.verify(refreshTokenDto.refreshToken);
    const user = await this.usersService.findById(payload.sub);

    // Revoke old refresh token
    await this.revokeRefreshToken(tokenFingerprint);

    // Generate new tokens
    return this.generateTokens(user, payload.ipAddress, payload.userAgent);
  }

  async logout(userId: string, refreshToken: string) {
    const tokenFingerprint = this.hashToken(refreshToken);
    await this.revokeRefreshToken(tokenFingerprint);
  }

  private async generateTokens(user: User, ipAddress: string, userAgent: string) {
    const roles = user.roles.map(r => r.name);
    const permissions = this.flattenPermissions(user.roles);

    const accessTokenPayload = {
      sub: user.id,
      username: user.username,
      agentId: user.agentId,
      tenantId: user.tenantId,
      roles,
      permissions,
    };

    const refreshTokenPayload = {
      sub: user.id,
      type: 'refresh',
      ipAddress,
      userAgent,
    };

    const accessToken = this.jwtService.sign(accessTokenPayload, { expiresIn: '15m' });
    const refreshToken = this.jwtService.sign(refreshTokenPayload, { expiresIn: '7d' });

    // Store refresh token in database
    await this.usersService.createRefreshToken({
      userId: user.id,
      tokenFingerprint: this.hashToken(refreshToken),
      ipAddress,
      userAgent,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: 900, // 15 minutes in seconds
    };
  }

  private async handleFailedLogin(user: User) {
    const attempts = user.failedLoginAttempts + 1;
    
    if (attempts >= 5) {
      const lockedUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
      await this.usersService.lockAccount(user.id, lockedUntil);
    } else {
      await this.usersService.incrementFailedAttempts(user.id);
    }
  }

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  private async revokeRefreshToken(tokenFingerprint: string) {
    await this.redis.setex(`blacklist:${tokenFingerprint}`, 7 * 24 * 60 * 60, '1');
  }

  private flattenPermissions(roles: Role[]): string[] {
    const permissions = new Set<string>();
    roles.forEach(role => {
      role.permissions.forEach(perm => {
        permissions.add(`${perm.resource}:${perm.action}:${perm.scope}`);
      });
    });
    return Array.from(permissions);
  }

  private generatePartialToken(user: User): string {
    return this.jwtService.sign(
      { sub: user.id, type: 'partial' },
      { expiresIn: '5m' }
    );
  }
}
```


#### 2.1.5 Guards and Decorators

**JwtAuthGuard:**
```typescript
import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    
    if (isPublic) {
      return true;
    }
    
    return super.canActivate(context);
  }
}
```

**RolesGuard:**
```typescript
import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    
    if (!requiredRoles) {
      return true;
    }
    
    const { user } = context.switchToHttp().getRequest();
    return requiredRoles.some(role => user.roles?.includes(role));
  }
}
```

**Roles Decorator:**
```typescript
import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
```

---

### 2.2 MS-2: Agent Service (Port 3002)

**Responsibility:** Agent profiles, per-channel status management, presence tracking, heartbeat

#### 2.2.1 Module Structure

```typescript
agent-service/
├── main.ts
├── app.module.ts
├── agents/
│   ├── agents.module.ts
│   ├── agents.controller.ts
│   ├── agents.service.ts
│   ├── agents.repository.ts
│   ├── agents.gateway.ts          // WebSocket gateway
│   └── entities/
│       ├── agent-profile.entity.ts
│       ├── agent-channel-status.entity.ts
│       ├── agent-session.entity.ts
│       └── agent-status-history.entity.ts
├── status/
│   ├── status.service.ts          // Status management logic
│   └── dto/
│       ├── update-channel-status.dto.ts
│       └── update-all-status.dto.ts
├── presence/
│   ├── presence.service.ts        // Heartbeat and presence logic
│   └── presence.scheduler.ts      // Check for disconnected agents
└── events/
    └── agent-events.producer.ts   // Kafka event publisher
```

#### 2.2.2 Entity Models

**AgentProfile Entity:**
```typescript
@Entity('agent_profiles')
export class AgentProfile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ name: 'agent_id', unique: true })
  agentId: string;

  @Column({ name: 'display_name' })
  displayName: string;

  @Column()
  department: string;

  @Column({ nullable: true })
  team: string;

  @Column({ type: 'jsonb', default: '[]' })
  skills: string[];

  @Column({ name: 'max_concurrent_chats', default: 3 })
  maxConcurrentChats: number;

  @Column({ name: 'max_concurrent_emails', default: 5 })
  maxConcurrentEmails: number;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => AgentChannelStatus, status => status.agent)
  channelStatuses: AgentChannelStatus[];

  @OneToMany(() => AgentSession, session => session.agent)
  sessions: AgentSession[];
}
```

**AgentChannelStatus Entity:**
```typescript
@Entity('agent_channel_status')
@Unique(['agentId', 'channel'])
export class AgentChannelStatus {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'agent_id', type: 'uuid' })
  agentId: string;

  @Column()
  channel: string; // 'voice' | 'email' | 'chat'

  @Column()
  status: string; // 'ready' | 'not-ready' | 'disconnected'

  @Column({ nullable: true })
  reason: string;

  @Column({ name: 'custom_reason', nullable: true })
  customReason: string;

  @Column({ default: 0 })
  duration: number;

  @Column({ name: 'is_timer_active', default: false })
  isTimerActive: boolean;

  @Column({ name: 'changed_at', type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  changedAt: Date;

  @ManyToOne(() => AgentProfile, profile => profile.channelStatuses)
  agent: AgentProfile;
}
```

**AgentSession Entity:**
```typescript
@Entity('agent_sessions')
export class AgentSession {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'agent_id', type: 'uuid' })
  agentId: string;

  @Column({ name: 'login_at', type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  loginAt: Date;

  @Column({ name: 'logout_at', type: 'timestamptz', nullable: true })
  logoutAt: Date;

  @Column({ name: 'connection_status', default: 'connected' })
  connectionStatus: string;

  @Column({ name: 'last_heartbeat_at', type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  lastHeartbeatAt: Date;

  @Column({ name: 'ip_address', type: 'inet', nullable: true })
  ipAddress: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => AgentProfile, profile => profile.sessions)
  agent: AgentProfile;
}
```


#### 2.2.3 Service Layer Logic

**StatusService:**
```typescript
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AgentChannelStatus } from './entities/agent-channel-status.entity';
import { AgentEventsProducer } from '../events/agent-events.producer';

@Injectable()
export class StatusService {
  constructor(
    @InjectRepository(AgentChannelStatus)
    private statusRepository: Repository<AgentChannelStatus>,
    private eventsProducer: AgentEventsProducer,
  ) {}

  async updateChannelStatus(
    agentId: string,
    channel: string,
    status: string,
    reason?: string,
    customReason?: string,
  ) {
    const existingStatus = await this.statusRepository.findOne({
      where: { agentId, channel },
    });

    const oldStatus = existingStatus?.status;

    if (existingStatus) {
      existingStatus.status = status;
      existingStatus.reason = reason;
      existingStatus.customReason = customReason;
      existingStatus.duration = 0;
      existingStatus.isTimerActive = true;
      existingStatus.changedAt = new Date();
      await this.statusRepository.save(existingStatus);
    } else {
      await this.statusRepository.save({
        agentId,
        channel,
        status,
        reason,
        customReason,
        duration: 0,
        isTimerActive: true,
        changedAt: new Date(),
      });
    }

    // Publish event to Kafka
    await this.eventsProducer.publishStatusChanged({
      agentId,
      channel,
      fromStatus: oldStatus || 'unknown',
      toStatus: status,
      reason,
      customReason,
      timestamp: new Date(),
    });

    return this.getChannelStatus(agentId, channel);
  }

  async updateAllChannelsStatus(
    agentId: string,
    status: string,
    reason?: string,
    customReason?: string,
  ) {
    const channels = ['voice', 'email', 'chat'];
    
    await Promise.all(
      channels.map(channel =>
        this.updateChannelStatus(agentId, channel, status, reason, customReason)
      )
    );

    return this.getAllChannelStatuses(agentId);
  }

  async getChannelStatus(agentId: string, channel: string) {
    const status = await this.statusRepository.findOne({
      where: { agentId, channel },
    });

    if (!status) {
      return {
        channel,
        status: 'disconnected',
        reason: null,
        customReason: null,
        duration: 0,
        isTimerActive: false,
      };
    }

    // Calculate duration
    const duration = Math.floor((Date.now() - status.changedAt.getTime()) / 1000);

    return {
      ...status,
      duration,
    };
  }

  async getAllChannelStatuses(agentId: string) {
    const channels = ['voice', 'email', 'chat'];
    const statuses = await Promise.all(
      channels.map(channel => this.getChannelStatus(agentId, channel))
    );

    return statuses;
  }
}
```

**PresenceService:**
```typescript
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AgentSession } from './entities/agent-session.entity';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AgentEventsProducer } from '../events/agent-events.producer';

@Injectable()
export class PresenceService {
  constructor(
    @InjectRepository(AgentSession)
    private sessionRepository: Repository<AgentSession>,
    private eventsProducer: AgentEventsProducer,
  ) {}

  async createSession(agentId: string, ipAddress: string) {
    const session = this.sessionRepository.create({
      agentId,
      ipAddress,
      connectionStatus: 'connected',
      loginAt: new Date(),
      lastHeartbeatAt: new Date(),
    });

    return this.sessionRepository.save(session);
  }

  async updateHeartbeat(agentId: string) {
    const session = await this.sessionRepository.findOne({
      where: { agentId, connectionStatus: 'connected' },
      order: { loginAt: 'DESC' },
    });

    if (session) {
      session.lastHeartbeatAt = new Date();
      await this.sessionRepository.save(session);
    }

    return { success: true, timestamp: new Date() };
  }

  async endSession(agentId: string) {
    const session = await this.sessionRepository.findOne({
      where: { agentId, connectionStatus: 'connected' },
      order: { loginAt: 'DESC' },
    });

    if (session) {
      session.connectionStatus = 'disconnected';
      session.logoutAt = new Date();
      await this.sessionRepository.save(session);

      await this.eventsProducer.publishSessionEnded({
        agentId,
        sessionId: session.id,
        duration: Math.floor((session.logoutAt.getTime() - session.loginAt.getTime()) / 1000),
        timestamp: new Date(),
      });
    }
  }

  @Cron(CronExpression.EVERY_30_SECONDS)
  async checkDisconnectedAgents() {
    const threshold = new Date(Date.now() - 60 * 1000); // 60 seconds ago

    const staleSessions = await this.sessionRepository.find({
      where: {
        connectionStatus: 'connected',
      },
    });

    for (const session of staleSessions) {
      if (session.lastHeartbeatAt < threshold) {
        session.connectionStatus = 'disconnected';
        await this.sessionRepository.save(session);

        await this.eventsProducer.publishSessionEnded({
          agentId: session.agentId,
          sessionId: session.id,
          duration: Math.floor((Date.now() - session.loginAt.getTime()) / 1000),
          timestamp: new Date(),
        });
      }
    }
  }

  async getAvailableAgents(department?: string, skills?: string[]) {
    const query = this.sessionRepository
      .createQueryBuilder('session')
      .innerJoinAndSelect('session.agent', 'agent')
      .leftJoinAndSelect('agent.channelStatuses', 'status')
      .where('session.connectionStatus = :status', { status: 'connected' });

    if (department) {
      query.andWhere('agent.department = :department', { department });
    }

    if (skills && skills.length > 0) {
      query.andWhere('agent.skills @> :skills', { skills: JSON.stringify(skills) });
    }

    const sessions = await query.getMany();

    return sessions.map(session => ({
      agentId: session.agent.agentId,
      displayName: session.agent.displayName,
      department: session.agent.department,
      team: session.agent.team,
      skills: session.agent.skills,
      channelStatuses: session.agent.channelStatuses,
      lastHeartbeat: session.lastHeartbeatAt,
    }));
  }
}
```

#### 2.2.4 WebSocket Gateway

**AgentsGateway:**
```typescript
import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';

@WebSocketGateway({
  namespace: '/ws/agent',
  cors: { origin: '*' },
})
export class AgentsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(
    private jwtService: JwtService,
    private statusService: StatusService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.headers.authorization?.replace('Bearer ', '');
      const payload = this.jwtService.verify(token);
      client.data.agentId = payload.agentId;
      client.join(`agent:${payload.agentId}`);
    } catch (error) {
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    // Cleanup if needed
  }

  @SubscribeMessage('status:subscribe')
  async handleStatusSubscribe(client: Socket) {
    const agentId = client.data.agentId;
    const statuses = await this.statusService.getAllChannelStatuses(agentId);
    client.emit('status:update', statuses);
  }

  // Method to push status updates to subscribed clients
  async pushStatusUpdate(agentId: string, statuses: any[]) {
    this.server.to(`agent:${agentId}`).emit('status:update', statuses);
  }
}
```


---

### 2.3 MS-3: Interaction Service (Port 3003)

**Responsibility:** Interaction lifecycle, queue management, SLA tracking, email threads, chat sessions

#### 2.3.1 Key Entities

**Interaction Entity:**
- Main interaction record with status, priority, channel, customer info
- Includes `dynamic_fields JSONB DEFAULT '{}'` for Phase 2+ Object Schema Service (MS-13) compatibility
- Includes `metadata JSONB` for channel-specific data (call recordings, email headers, chat session IDs)
- All PII fields (customer_name) are denormalized for performance

**InteractionNote Entity:**
- Notes added by agents with tags and pin capability
- Supports categorization (customer-info, callback, complaint, technical, payment, general)

**InteractionEvent Entity:**
- Timeline events (queue, ring, answer, hold, transfer, end)
- Tracks duration and agent actions

**EmailMessage Entity:**
- Email thread messages with from/to/cc/bcc
- Supports attachments metadata

**ChatMessage Entity:**
- Chat session messages with sender and content
- Real-time delivery via WebSocket

#### 2.3.2 Core Services

**InteractionService:**
- `findAll(filters)`: Query interactions with pagination, filtering by channel/status/priority/search
- `findOne(id)`: Get interaction detail with all related data
- `updateStatus(id, status)`: Update interaction status with state machine validation
- `assignAgent(id, agentId)`: Assign interaction to agent
- `addNote(id, note)`: Add note to interaction
- `calculateSLA(interaction)`: Calculate SLA status and remaining time

**EmailService:**
- `getThread(interactionId)`: Get all email messages in thread
- `sendReply(interactionId, emailDto)`: Send email reply
- `sendForward(interactionId, emailDto)`: Forward email

**ChatService:**
- `getMessages(interactionId, pagination)`: Get chat messages with pagination
- `sendMessage(interactionId, message)`: Send chat message via WebSocket
- `closeSession(interactionId)`: Close chat session

**SLAService:**
- `trackSLA(interactionId)`: Start SLA tracking for chat
- `checkBreaches()`: Scheduled job to check for SLA breaches
- `publishSLAUpdate(interactionId)`: Push SLA countdown via WebSocket

#### 2.3.3 State Machine

```typescript
const INTERACTION_STATE_MACHINE = {
  new: ['assigned', 'closed'],
  assigned: ['in-progress', 'closed'],
  'in-progress': ['resolved', 'closed'],
  resolved: ['closed', 'in-progress'],
  closed: [], // Terminal state
};

function validateTransition(from: string, to: string): boolean {
  return INTERACTION_STATE_MACHINE[from]?.includes(to) || false;
}
```

#### 2.3.4 WebSocket Channels

- `/ws/interactions/{agentId}/queue`: Real-time queue updates
- `/ws/interactions/{interactionId}/chat`: Bidirectional chat messaging
- `/ws/interactions/{interactionId}/sla`: SLA countdown ticks

---

### 2.4 MS-4: Ticket Service (Port 3004)

**Responsibility:** Ticket CRUD, workflow states, comments, history tracking

#### 2.4.1 Key Entities

**Ticket Entity:**
- Main ticket record with display ID (TKT-YYYY-NNNNNN), status, priority, category
- Includes `dynamic_fields JSONB DEFAULT '{}'` for Phase 2+ Object Schema Service (MS-13) compatibility
- Display ID format: TKT-2026-000001 (year-based sequential numbering)

**TicketComment Entity:**
- Comments with public/internal flag
- Edit capability within 15 minutes of creation

**TicketHistory Entity:**
- Change history tracking field changes
- Immutable audit trail of all modifications

#### 2.4.2 Core Services

**TicketService:**
- `create(createTicketDto)`: Create ticket with unique display ID generation
- `findOne(id)`: Get ticket detail with comments and history
- `update(id, updateTicketDto)`: Update ticket fields
- `updateStatus(id, status)`: Update status with state machine validation
- `assignAgent(id, agentId)`: Assign ticket to agent

**CommentService:**
- `addComment(ticketId, commentDto)`: Add comment to ticket
- `updateComment(commentId, content)`: Edit comment within 15 minutes
- `getComments(ticketId)`: Get all comments for ticket

**HistoryService:**
- `trackChange(ticketId, field, oldValue, newValue)`: Record field change
- `getHistory(ticketId)`: Get change history

#### 2.4.3 State Machine

```typescript
const TICKET_STATE_MACHINE = {
  new: ['in-progress', 'resolved'],
  'in-progress': ['waiting-response', 'resolved'],
  'waiting-response': ['in-progress', 'resolved'],
  resolved: ['closed', 'in-progress'],
  closed: [], // Terminal state
};
```

#### 2.4.4 Display ID Generation

```typescript
async generateDisplayId(): Promise<string> {
  const year = new Date().getFullYear();
  const count = await this.ticketRepository.count({
    where: { displayId: Like(`TKT-${year}-%`) },
  });
  const sequence = (count + 1).toString().padStart(6, '0');
  return `TKT-${year}-${sequence}`;
}
```

---

### 2.5 MS-5: Customer Service (Port 3005)

**Responsibility:** Customer profiles, PII encryption/decryption, notes, interaction history

#### 2.5.1 Key Entities

**Customer Entity:**
```typescript
@Entity('customers')
export class Customer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({ unique: true })
  cif: string; // ⚠️ ENCRYPTED AT REST using AES-256-GCM (see Section 2.5.3)

  @Column({ name: 'full_name' })
  fullName: string;

  @Column({ nullable: true })
  email: string; // ⚠️ ENCRYPTED AT REST using AES-256-GCM

  @Column({ nullable: true })
  phone: string; // ⚠️ ENCRYPTED AT REST using AES-256-GCM

  @Column({ nullable: true })
  segment: string; // individual, sme, corporate

  @Column({ name: 'is_vip', default: false })
  isVIP: boolean;

  @Column({ name: 'avatar_url', nullable: true })
  avatarUrl: string;

  @Column({ name: 'satisfaction_rating', nullable: true })
  satisfactionRating: number;

  @Column({ type: 'jsonb', default: '{}', name: 'dynamic_fields' })
  dynamicFields: Record<string, any>; // For Phase 2+ Object Schema Service (MS-13)

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
```

**PII Encryption Note:**
The CIF (Customer Information File) field contains sensitive customer identification data and MUST be encrypted at rest using AES-256-GCM. The TypeORM subscriber (Section 2.5.4) automatically encrypts CIF, email, and phone fields before database insertion and decrypts them after loading.

**Dynamic Fields Note:**
The `dynamicFields` JSONB column is included in Phase 1 for forward compatibility with Phase 2+ Object Schema Service (MS-13), which enables custom field definitions without schema migrations (per ADR-014).

**CustomerNote Entity:**
- Notes with tags and pin capability
- Linked to customer profile

#### 2.5.2 Core Services

**CustomerService:**
- `findOne(id)`: Get customer profile with decrypted PII
- `getInteractionHistory(id)`: Query Interaction Service for customer interactions
- `getTickets(id)`: Query Ticket Service for customer tickets
- `addNote(id, noteDto)`: Add note to customer profile
- `search(query)`: Search customers by CIF, name, or phone

**EncryptionService:**
- `encrypt(plaintext)`: Encrypt PII using AES-256-GCM
- `decrypt(ciphertext)`: Decrypt PII
- `encryptFields(entity, fields)`: Encrypt specified fields before save
- `decryptFields(entity, fields)`: Decrypt specified fields after load

#### 2.5.3 Encryption Implementation

```typescript
import * as crypto from 'crypto';

@Injectable()
export class EncryptionService {
  private readonly algorithm = 'aes-256-gcm';
  private readonly key: Buffer;

  constructor(private configService: ConfigService) {
    const keyHex = this.configService.get<string>('ENCRYPTION_KEY');
    this.key = Buffer.from(keyHex, 'hex');
  }

  encrypt(plaintext: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);
    
    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    // Format: iv:authTag:encrypted
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  }

  decrypt(ciphertext: string): string {
    const [ivHex, authTagHex, encrypted] = ciphertext.split(':');
    
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    
    const decipher = crypto.createDecipheriv(this.algorithm, this.key, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }
}
```

#### 2.5.4 TypeORM Subscribers for Auto Encryption

```typescript
@EventSubscriber()
export class CustomerSubscriber implements EntitySubscriberInterface<Customer> {
  constructor(
    dataSource: DataSource,
    private encryptionService: EncryptionService,
  ) {
    dataSource.subscribers.push(this);
  }

  listenTo() {
    return Customer;
  }

  beforeInsert(event: InsertEvent<Customer>) {
    if (event.entity.email) {
      event.entity.email = this.encryptionService.encrypt(event.entity.email);
    }
    if (event.entity.phone) {
      event.entity.phone = this.encryptionService.encrypt(event.entity.phone);
    }
    if (event.entity.cif) {
      event.entity.cif = this.encryptionService.encrypt(event.entity.cif);
    }
  }

  afterLoad(entity: Customer) {
    if (entity.email) {
      entity.email = this.encryptionService.decrypt(entity.email);
    }
    if (entity.phone) {
      entity.phone = this.encryptionService.decrypt(entity.phone);
    }
    if (entity.cif) {
      entity.cif = this.encryptionService.decrypt(entity.cif);
    }
  }
}
```

---

### 2.6 MS-6: Notification Service (Port 3006)

**Responsibility:** Multi-channel notifications, state management, preferences, WebSocket push

#### 2.6.1 Key Entities

**Notification Entity:**
- Notification record with type, status, priority, metadata
- Includes `metadata JSONB DEFAULT '{}'` for notification-specific data (interaction IDs, ticket IDs, SLA details)
- Supports auto-hide and expiration for transient notifications

**NotificationSettings Entity:**
- Agent notification preferences
- Per-channel and per-type configuration

#### 2.6.2 Core Services

**NotificationService:**
- `create(notificationDto)`: Create notification and push via WebSocket
- `findAll(agentId, filters)`: Get notifications with tab filtering
- `getUnreadCount(agentId)`: Get unread notification count
- `updateStatus(id, status)`: Update notification status (viewed/actioned/dismissed)
- `markAllRead(agentId)`: Mark all notifications as viewed
- `clearOld(agentId)`: Clear notifications older than 24 hours

**SettingsService:**
- `getSettings(agentId)`: Get notification preferences
- `updateSettings(agentId, settingsDto)`: Update preferences

**WarningService:**
- `trackMissedCall(agentId, callData)`: Track missed calls in not-ready status
- `checkWarningThreshold(agentId)`: Check if warning should be activated
- `getWarningStatus(agentId)`: Get current warning status

#### 2.6.3 Event Consumers

**NotificationEventConsumer:**
```typescript
@Injectable()
export class NotificationEventConsumer {
  constructor(
    private notificationService: NotificationService,
    private kafkaService: KafkaService,
  ) {}

  @OnModuleInit()
  async onModuleInit() {
    await this.kafkaService.subscribe('interactions', async (message) => {
      const event = JSON.parse(message.value.toString());
      
      if (event.eventType === 'interaction.assigned') {
        await this.notificationService.create({
          recipientAgentId: event.payload.assignedAgentId,
          type: 'interaction-assigned',
          priority: event.payload.priority === 'urgent' ? 'urgent' : 'medium',
          title: 'New Interaction Assigned',
          message: `You have been assigned a ${event.payload.channel} interaction`,
          metadata: event.payload,
        });
      }
    });

    await this.kafkaService.subscribe('tickets', async (message) => {
      const event = JSON.parse(message.value.toString());
      
      if (event.eventType === 'ticket.assigned') {
        await this.notificationService.create({
          recipientAgentId: event.payload.assignedAgentId,
          type: 'ticket-assignment',
          priority: 'medium',
          title: 'Ticket Assigned',
          message: `Ticket ${event.payload.displayId} has been assigned to you`,
          metadata: event.payload,
        });
      }
    });

    await this.kafkaService.subscribe('sla-events', async (message) => {
      const event = JSON.parse(message.value.toString());
      
      if (event.eventType === 'sla.breached') {
        await this.notificationService.create({
          recipientAgentId: event.payload.assignedAgentId,
          type: 'sla-breach',
          priority: 'urgent',
          title: 'SLA Breached',
          message: `Chat interaction has exceeded SLA threshold`,
          metadata: event.payload,
        });
      }
    });
  }
}
```

#### 2.6.4 WebSocket Gateway

**NotificationsGateway:**
```typescript
@WebSocketGateway({
  namespace: '/ws/notifications',
  cors: { origin: '*' },
})
export class NotificationsGateway {
  @WebSocketServer()
  server: Server;

  async pushNotification(agentId: string, notification: any) {
    this.server.to(`agent:${agentId}`).emit('notification:new', notification);
  }
}
```

---

## 3. Database Design

### 3.1 Database Schema Overview

Each microservice has its own PostgreSQL database for data isolation and independent scalability:

- **identity_db**: Users, roles, permissions, refresh tokens, login attempts
- **agent_db**: Agent profiles, channel status, sessions, status history
- **interaction_db**: Interactions, notes, events, email messages, chat messages
- **ticket_db**: Tickets, comments, history
- **customer_db**: Customers, customer notes
- **notification_db**: Notifications, notification settings

### 3.2 Index Strategy

**Performance Indexes:**
- Primary keys: UUID with `gen_random_uuid()`
- Foreign keys: Indexed for join performance
- Query filters: Indexes on frequently filtered columns (status, channel, priority, created_at)
- Search fields: Indexes on searchable text columns (customer name, subject)
- Timestamps: Descending indexes on created_at for recent-first queries

**Example Indexes:**
```sql
-- Interaction Service
CREATE INDEX idx_interactions_customer_id ON interactions(customer_id);
CREATE INDEX idx_interactions_assigned_agent_id ON interactions(assigned_agent_id);
CREATE INDEX idx_interactions_status ON interactions(status);
CREATE INDEX idx_interactions_channel ON interactions(channel);
CREATE INDEX idx_interactions_created_at ON interactions(created_at DESC);
CREATE INDEX idx_interactions_tenant_id ON interactions(tenant_id);

-- Composite indexes for common filter combinations
CREATE INDEX idx_interactions_status_channel ON interactions(status, channel);
CREATE INDEX idx_interactions_agent_status ON interactions(assigned_agent_id, status);
```

### 3.3 Data Integrity Constraints

**Foreign Key Constraints:**
- Within service boundaries only (no cross-service FKs)
- CASCADE delete for dependent records
- RESTRICT delete for referenced records

**Check Constraints:**
```sql
-- Agent channel status
ALTER TABLE agent_channel_status 
  ADD CONSTRAINT check_channel 
  CHECK (channel IN ('voice', 'email', 'chat'));

ALTER TABLE agent_channel_status 
  ADD CONSTRAINT check_status 
  CHECK (status IN ('ready', 'not-ready', 'disconnected'));

-- Interaction priority
ALTER TABLE interactions 
  ADD CONSTRAINT check_priority 
  CHECK (priority IN ('low', 'medium', 'high', 'urgent'));

-- Ticket status
ALTER TABLE tickets 
  ADD CONSTRAINT check_status 
  CHECK (status IN ('new', 'in-progress', 'waiting-response', 'resolved', 'closed'));
```

**Unique Constraints:**
```sql
-- Prevent duplicate channel status per agent
ALTER TABLE agent_channel_status 
  ADD CONSTRAINT unique_agent_channel 
  UNIQUE (agent_id, channel);

-- Unique display IDs
ALTER TABLE tickets 
  ADD CONSTRAINT unique_display_id 
  UNIQUE (display_id);
```

### 3.4 Timestamp Automation

All entity tables include automatic timestamp management:

```sql
-- Trigger function for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply to all tables
CREATE TRIGGER update_users_updated_at 
  BEFORE UPDATE ON users 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_interactions_updated_at 
  BEFORE UPDATE ON interactions 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Repeat for all tables with updated_at column
```

### 3.5 Connection Pooling Configuration

**TypeORM Configuration:**
```typescript
{
  type: 'postgres',
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  entities: [__dirname + '/**/*.entity{.ts,.js}'],
  synchronize: false, // Use migrations in production
  migrations: [__dirname + '/migrations/**/*{.ts,.js}'],
  migrationsRun: true, // Auto-run migrations on startup
  logging: process.env.NODE_ENV === 'development',
  
  // Connection pool settings
  extra: {
    max: 20, // Maximum pool size
    min: 5, // Minimum pool size
    idleTimeoutMillis: 10000, // Close idle connections after 10s
    connectionTimeoutMillis: 5000, // Connection timeout 5s
    maxUses: 7500, // Recycle connection after 7500 uses
  },
}
```

---

## 4. API Design

### 4.1 RESTful Endpoint Patterns

**Resource Naming:**
- Plural nouns for collections: `/api/v1/interactions`
- Singular for specific resource: `/api/v1/interactions/{id}`
- Nested resources: `/api/v1/interactions/{id}/notes`
- Actions as sub-resources: `/api/v1/interactions/{id}/assign`

**HTTP Methods:**
- GET: Retrieve resource(s)
- POST: Create new resource
- PUT: Update entire resource
- PATCH: Partial update
- DELETE: Remove resource

**Status Codes:**
- 200 OK: Successful GET, PUT, PATCH
- 201 Created: Successful POST
- 204 No Content: Successful DELETE
- 400 Bad Request: Validation error
- 401 Unauthorized: Missing or invalid JWT
- 403 Forbidden: Insufficient permissions
- 404 Not Found: Resource doesn't exist
- 429 Too Many Requests: Rate limit exceeded
- 500 Internal Server Error: Server error

### 4.2 Request/Response DTO Patterns

**List Response Pattern:**
```typescript
export class PaginatedResponseDto<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
  stats?: Record<string, any>; // Optional aggregated statistics
}
```

**Error Response Pattern:**
```typescript
export class ErrorResponseDto {
  statusCode: number;
  message: string | string[];
  error: string;
  timestamp: string;
  path: string;
  requestId: string;
}
```

**Example: Interaction List Request/Response:**
```typescript
// Query DTO
export class GetInteractionsQueryDto {
  @IsOptional()
  @IsIn(['voice', 'email', 'chat'])
  channel?: string;

  @IsOptional()
  @IsIn(['all', 'queue', 'closed', 'assigned'])
  tab?: string;

  @IsOptional()
  @IsIn(['low', 'medium', 'high', 'urgent'])
  priority?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number = 50;
}

// Response DTO
export class InteractionListResponseDto {
  data: InteractionDto[];
  meta: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
  stats: {
    byChannel: { voice: number; email: number; chat: number };
    byStatus: { new: number; assigned: number; inProgress: number; resolved: number };
    byPriority: { low: number; medium: number; high: number; urgent: number };
  };
}
```

### 4.3 Pagination Strategy

**Default Pagination:**
- Default page size: 20 (lists), 50 (interaction queue)
- Maximum page size: 100
- Page numbering: 1-indexed
- Cursor-based pagination for real-time feeds (future enhancement)

**Implementation:**
```typescript
async findAll(query: GetInteractionsQueryDto) {
  const page = query.page || 1;
  const pageSize = Math.min(query.pageSize || 50, 100);
  const skip = (page - 1) * pageSize;

  const [data, total] = await this.interactionRepository.findAndCount({
    where: this.buildWhereClause(query),
    order: { updatedAt: 'DESC' },
    skip,
    take: pageSize,
  });

  return {
    data,
    meta: {
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    },
  };
}
```

### 4.4 Filter and Search Patterns

**Filter Implementation:**
```typescript
private buildWhereClause(query: GetInteractionsQueryDto) {
  const where: any = {};

  if (query.channel) {
    where.channel = query.channel;
  }

  if (query.priority) {
    where.priority = query.priority;
  }

  if (query.tab) {
    switch (query.tab) {
      case 'queue':
        where.status = In(['new', 'assigned']);
        break;
      case 'assigned':
        where.assignedAgentId = this.currentUser.agentId;
        break;
      case 'closed':
        where.status = 'closed';
        break;
    }
  }

  if (query.search) {
    where.customerName = ILike(`%${query.search}%`);
    // Or use OR condition for multiple fields
  }

  return where;
}
```

**Full-Text Search (Future):**
```typescript
// Using PostgreSQL full-text search
const results = await this.interactionRepository
  .createQueryBuilder('interaction')
  .where(
    "to_tsvector('english', interaction.subject || ' ' || interaction.customer_name) @@ plainto_tsquery('english', :search)",
    { search: query.search }
  )
  .getMany();
```

---

## 5. Authentication & Authorization Design

### 5.1 JWT Token Structure

**Access Token (15-minute expiration):**
```typescript
interface AccessTokenPayload {
  sub: string;              // User ID
  username: string;
  agentId: string;
  tenantId: string;
  roles: string[];          // ['agent', 'supervisor']
  permissions: string[];    // ['interaction:read:own', 'ticket:write:team']
  iat: number;              // Issued at
  exp: number;              // Expires at
  jti: string;              // JWT ID for revocation
}
```

**Refresh Token (7-day expiration):**
```typescript
interface RefreshTokenPayload {
  sub: string;              // User ID
  type: 'refresh';
  ipAddress: string;
  userAgent: string;
  iat: number;
  exp: number;
  jti: string;
}
```

### 5.2 Token Generation and Validation

**RS256 Algorithm:**
- Asymmetric signing using RSA key pair
- Private key for signing (Identity Service only)
- Public key for verification (all services)
- Key rotation strategy: Manual in Phase 1, automated in Phase 3

**Key Management:**
```typescript
// Identity Service - Token signing
const privateKey = fs.readFileSync(process.env.JWT_PRIVATE_KEY_PATH);
const accessToken = jwt.sign(payload, privateKey, {
  algorithm: 'RS256',
  expiresIn: '15m',
  issuer: 'tpb-crm-identity',
  audience: 'tpb-crm-services',
});

// Other Services - Token verification
const publicKey = fs.readFileSync(process.env.JWT_PUBLIC_KEY_PATH);
const decoded = jwt.verify(token, publicKey, {
  algorithms: ['RS256'],
  issuer: 'tpb-crm-identity',
  audience: 'tpb-crm-services',
});
```

### 5.3 Refresh Token Rotation Flow

```mermaid
sequenceDiagram
    participant Client
    participant API Gateway
    participant Identity Service
    participant Redis

    Client->>API Gateway: POST /auth/refresh (refreshToken)
    API Gateway->>Identity Service: Forward request
    Identity Service->>Redis: Check blacklist
    Redis-->>Identity Service: Not blacklisted
    Identity Service->>Identity Service: Verify refresh token
    Identity Service->>Redis: Add old token to blacklist
    Identity Service->>Identity Service: Generate new tokens
    Identity Service->>Database: Store new refresh token
    Identity Service-->>Client: New access + refresh tokens
```

### 5.4 MFA TOTP Flow

**Setup Phase:**
1. Generate secret using `speakeasy.generateSecret()`
2. Store encrypted secret in user record
3. Generate QR code for authenticator app
4. Verify initial code before enabling MFA

**Login Phase:**
1. Verify username/password
2. If MFA enabled, return partial token (5-minute expiration)
3. Client submits partial token + TOTP code
4. Verify TOTP code with 30-second window
5. Return full access + refresh tokens

**TOTP Configuration:**
```typescript
const secret = speakeasy.generateSecret({
  name: 'TPB CRM',
  issuer: 'TPBank',
  length: 32,
});

// Verification with time window
const isValid = speakeasy.totp.verify({
  secret: user.mfaSecret,
  encoding: 'base32',
  token: code,
  window: 1, // Allow 1 step before/after (30s tolerance)
});
```

### 5.5 RBAC Guard Implementation

**Permission Format:** `resource:action:scope`
- Resource: interaction, ticket, customer, agent, user
- Action: read, write, delete, assign, escalate
- Scope: own, team, department, all

**Examples:**
- `interaction:read:own` - Read own interactions
- `ticket:write:team` - Write tickets in same team
- `customer:read:all` - Read all customers
- `agent:assign:department` - Assign agents in department

**Guard Implementation:**
```typescript
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      'permissions',
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    return requiredPermissions.every(permission =>
      this.hasPermission(user, permission, request),
    );
  }

  private hasPermission(user: any, permission: string, request: any): boolean {
    const [resource, action, scope] = permission.split(':');

    // Check if user has exact permission
    if (user.permissions.includes(permission)) {
      return true;
    }

    // Check if user has broader scope
    if (scope === 'own' && user.permissions.includes(`${resource}:${action}:team`)) {
      return true;
    }

    // Scope-based filtering
    if (scope === 'own') {
      // Ensure resource belongs to user
      return this.checkOwnership(user, request);
    }

    return false;
  }

  private checkOwnership(user: any, request: any): boolean {
    // Check if resource belongs to user based on request params
    const resourceId = request.params.id;
    // Additional logic to verify ownership
    return true;
  }
}
```

**Usage in Controllers:**
```typescript
@Controller('interactions')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class InteractionsController {
  @Get()
  @Permissions('interaction:read:own')
  async findAll(@CurrentUser() user: User) {
    // Only returns interactions assigned to user
  }

  @Put(':id/assign')
  @Permissions('interaction:assign:team')
  async assignInteraction(@Param('id') id: string, @Body() dto: AssignDto) {
    // Can assign interactions within team
  }
}
```

---

## 6. Real-Time Communication Design

### 6.1 WebSocket Connection Management

**STOMP Protocol over WebSocket:**
```typescript
// Client-side connection
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

const client = new Client({
  webSocketFactory: () => new SockJS('https://api.tpb.vn/ws'),
  connectHeaders: {
    Authorization: `Bearer ${accessToken}`,
  },
  reconnectDelay: 5000,
  heartbeatIncoming: 30000,
  heartbeatOutgoing: 30000,
});

client.onConnect = () => {
  // Subscribe to channels
  client.subscribe(`/topic/agent/${agentId}/status`, (message) => {
    const statusUpdate = JSON.parse(message.body);
    handleStatusUpdate(statusUpdate);
  });

  client.subscribe(`/topic/notifications/${agentId}`, (message) => {
    const notification = JSON.parse(message.body);
    handleNotification(notification);
  });
};

client.activate();
```

**Server-side Gateway:**
```typescript
import { WebSocketGateway, WebSocketServer, OnGatewayConnection } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  namespace: '/ws',
  cors: { origin: process.env.FRONTEND_URL },
  transports: ['websocket', 'polling'],
})
export class RealtimeGateway implements OnGatewayConnection {
  @WebSocketServer()
  server: Server;

  constructor(private jwtService: JwtService) {}

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth.token || 
                    client.handshake.headers.authorization?.replace('Bearer ', '');
      
      const payload = this.jwtService.verify(token);
      
      client.data.userId = payload.sub;
      client.data.agentId = payload.agentId;
      
      // Join agent-specific room
      client.join(`agent:${payload.agentId}`);
      
      console.log(`Agent ${payload.agentId} connected`);
    } catch (error) {
      console.error('WebSocket authentication failed:', error);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    console.log(`Agent ${client.data.agentId} disconnected`);
  }

  // Broadcast to specific agent
  sendToAgent(agentId: string, event: string, data: any) {
    this.server.to(`agent:${agentId}`).emit(event, data);
  }

  // Broadcast to all connected agents
  broadcast(event: string, data: any) {
    this.server.emit(event, data);
  }
}
```

### 6.2 Subscription Management

**Channel Subscriptions:**
```typescript
interface ChannelSubscription {
  channel: string;
  agentId: string;
  subscriptionId: string;
  subscribedAt: Date;
}

class SubscriptionManager {
  private subscriptions = new Map<string, ChannelSubscription[]>();

  subscribe(agentId: string, channel: string): string {
    const subscriptionId = uuidv4();
    const subscription: ChannelSubscription = {
      channel,
      agentId,
      subscriptionId,
      subscribedAt: new Date(),
    };

    if (!this.subscriptions.has(agentId)) {
      this.subscriptions.set(agentId, []);
    }

    this.subscriptions.get(agentId).push(subscription);
    return subscriptionId;
  }

  unsubscribe(agentId: string, subscriptionId: string) {
    const subs = this.subscriptions.get(agentId);
    if (subs) {
      const filtered = subs.filter(s => s.subscriptionId !== subscriptionId);
      this.subscriptions.set(agentId, filtered);
    }
  }

  getSubscriptions(agentId: string): ChannelSubscription[] {
    return this.subscriptions.get(agentId) || [];
  }

  clearAll(agentId: string) {
    this.subscriptions.delete(agentId);
  }
}
```

### 6.3 Reconnection Strategy

**Exponential Backoff:**
```typescript
class WebSocketReconnection {
  private reconnectAttempts = 0;
  private maxAttempts = 10;
  private baseDelay = 1000; // 1 second
  private maxDelay = 30000; // 30 seconds

  calculateDelay(): number {
    const delay = Math.min(
      this.baseDelay * Math.pow(2, this.reconnectAttempts),
      this.maxDelay
    );
    return delay + Math.random() * 1000; // Add jitter
  }

  async reconnect(connectFn: () => Promise<void>) {
    while (this.reconnectAttempts < this.maxAttempts) {
      try {
        const delay = this.calculateDelay();
        console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts + 1}/${this.maxAttempts})`);
        
        await new Promise(resolve => setTimeout(resolve, delay));
        await connectFn();
        
        console.log('Reconnection successful');
        this.reconnectAttempts = 0;
        return;
      } catch (error) {
        this.reconnectAttempts++;
        console.error(`Reconnection attempt ${this.reconnectAttempts} failed:`, error);
      }
    }

    console.error('Max reconnection attempts reached');
    throw new Error('Failed to reconnect after maximum attempts');
  }

  reset() {
    this.reconnectAttempts = 0;
  }
}
```

### 6.4 Message Buffering

**Outgoing Message Buffer:**
```typescript
class MessageBuffer {
  private buffer: Array<{ event: string; data: any; timestamp: Date }> = [];
  private maxAge = 5 * 60 * 1000; // 5 minutes
  private maxSize = 100;

  add(event: string, data: any) {
    this.buffer.push({
      event,
      data,
      timestamp: new Date(),
    });

    // Limit buffer size
    if (this.buffer.length > this.maxSize) {
      this.buffer.shift();
    }
  }

  flush(sendFn: (event: string, data: any) => void) {
    const now = Date.now();
    
    // Remove expired messages
    this.buffer = this.buffer.filter(msg => 
      now - msg.timestamp.getTime() < this.maxAge
    );

    // Send all buffered messages
    this.buffer.forEach(msg => {
      sendFn(msg.event, msg.data);
    });

    this.buffer = [];
  }

  clear() {
    this.buffer = [];
  }

  size(): number {
    return this.buffer.length;
  }
}
```

---

## 7. Event-Driven Architecture Design

### 7.1 Kafka Topic Design

**Topic Naming Convention:** `{domain}-{entity}-{version}`

**Topics:**
- `agent-status-v1`: Agent status change events
- `interactions-v1`: Interaction lifecycle events
- `sla-events-v1`: SLA warning and breach events
- `tickets-v1`: Ticket lifecycle events
- `notifications-v1`: Notification events (internal)

### 7.2 Event Schema Definitions

**Base Event Structure:**
```typescript
interface BaseEvent {
  eventId: string;          // UUID for idempotency
  eventType: string;        // Specific event type
  timestamp: string;        // ISO 8601 timestamp
  tenantId: string;         // Multi-tenancy support
  version: string;          // Schema version
  payload: Record<string, any>;
}
```

**Agent Status Changed Event:**
```typescript
interface AgentStatusChangedEvent extends BaseEvent {
  eventType: 'agent.status.changed';
  payload: {
    agentId: string;
    channel: 'voice' | 'email' | 'chat';
    fromStatus: string;
    toStatus: string;
    reason?: string;
    customReason?: string;
    timestamp: string;
  };
}
```

**Interaction Events:**
```typescript
interface InteractionCreatedEvent extends BaseEvent {
  eventType: 'interaction.created';
  payload: {
    interactionId: string;
    type: string;
    channel: string;
    status: string;
    priority: string;
    customerId: string;
    customerName: string;
    isVIP: boolean;
  };
}

interface InteractionAssignedEvent extends BaseEvent {
  eventType: 'interaction.assigned';
  payload: {
    interactionId: string;
    assignedAgentId: string;
    assignedAgentName: string;
    assignedBy: string;
    timestamp: string;
  };
}
```

**SLA Events:**
```typescript
interface SLABreachedEvent extends BaseEvent {
  eventType: 'sla.breached';
  payload: {
    interactionId: string;
    chatSessionId: string;
    thresholdMinutes: number;
    actualSeconds: number;
    slaStatus: 'breached';
    assignedAgentId: string;
    customerId: string;
  };
}
```

### 7.3 Producer Patterns

**Event Publisher Service:**
```typescript
import { Injectable } from '@nestjs/common';
import { Kafka, Producer } from 'kafkajs';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class EventPublisher {
  private producer: Producer;

  constructor() {
    const kafka = new Kafka({
      clientId: 'interaction-service',
      brokers: [process.env.KAFKA_BROKER],
    });

    this.producer = kafka.producer({
      idempotent: true, // Ensure exactly-once delivery
      maxInFlightRequests: 5,
      transactionalId: 'interaction-service-producer',
    });
  }

  async onModuleInit() {
    await this.producer.connect();
  }

  async onModuleDestroy() {
    await this.producer.disconnect();
  }

  async publish(topic: string, eventType: string, payload: any) {
    const event: BaseEvent = {
      eventId: uuidv4(),
      eventType,
      timestamp: new Date().toISOString(),
      tenantId: payload.tenantId || 'default',
      version: '1.0',
      payload,
    };

    await this.producer.send({
      topic,
      messages: [
        {
          key: payload.id || payload.agentId || payload.customerId, // Partition key
          value: JSON.stringify(event),
          headers: {
            'event-type': eventType,
            'event-id': event.eventId,
          },
        },
      ],
      acks: -1, // Wait for all replicas
    });

    console.log(`Published event ${eventType} to ${topic}`);
  }
}
```

### 7.4 Consumer Patterns with Idempotency

**Idempotent Event Consumer:**
```typescript
import { Injectable, OnModuleInit } from '@nestjs/common';
import { Kafka, Consumer, EachMessagePayload } from 'kafkajs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Injectable()
export class NotificationEventConsumer implements OnModuleInit {
  private consumer: Consumer;
  private processedEvents = new Set<string>();

  constructor(
    @InjectRepository(ProcessedEvent)
    private processedEventRepo: Repository<ProcessedEvent>,
    private notificationService: NotificationService,
  ) {
    const kafka = new Kafka({
      clientId: 'notification-service',
      brokers: [process.env.KAFKA_BROKER],
    });

    this.consumer = kafka.consumer({
      groupId: 'notification-service-group',
      sessionTimeout: 30000,
      heartbeatInterval: 3000,
    });
  }

  async onModuleInit() {
    await this.consumer.connect();
    await this.consumer.subscribe({
      topics: ['interactions-v1', 'tickets-v1', 'sla-events-v1'],
      fromBeginning: false,
    });

    await this.consumer.run({
      eachMessage: async (payload: EachMessagePayload) => {
        await this.handleMessage(payload);
      },
    });
  }

  private async handleMessage(payload: EachMessagePayload) {
    const { topic, partition, message } = payload;
    const event = JSON.parse(message.value.toString());

    // Check if event already processed (idempotency)
    const isProcessed = await this.isEventProcessed(event.eventId);
    if (isProcessed) {
      console.log(`Event ${event.eventId} already processed, skipping`);
      return;
    }

    try {
      // Process event based on type
      await this.processEvent(event);

      // Mark event as processed
      await this.markEventProcessed(event.eventId);

      console.log(`Successfully processed event ${event.eventId}`);
    } catch (error) {
      console.error(`Error processing event ${event.eventId}:`, error);
      throw error; // Will trigger retry
    }
  }

  private async isEventProcessed(eventId: string): boolean {
    // Check in-memory cache first
    if (this.processedEvents.has(eventId)) {
      return true;
    }

    // Check database
    const exists = await this.processedEventRepo.findOne({
      where: { eventId },
    });

    if (exists) {
      this.processedEvents.add(eventId);
      return true;
    }

    return false;
  }

  private async markEventProcessed(eventId: string) {
    await this.processedEventRepo.save({
      eventId,
      processedAt: new Date(),
    });

    this.processedEvents.add(eventId);

    // Limit in-memory cache size
    if (this.processedEvents.size > 10000) {
      const firstItem = this.processedEvents.values().next().value;
      this.processedEvents.delete(firstItem);
    }
  }

  private async processEvent(event: BaseEvent) {
    switch (event.eventType) {
      case 'interaction.assigned':
        await this.notificationService.create({
          recipientAgentId: event.payload.assignedAgentId,
          type: 'interaction-assigned',
          priority: 'medium',
          title: 'New Interaction Assigned',
          message: `You have been assigned a ${event.payload.channel} interaction`,
          metadata: event.payload,
        });
        break;

      case 'sla.breached':
        await this.notificationService.create({
          recipientAgentId: event.payload.assignedAgentId,
          type: 'sla-breach',
          priority: 'urgent',
          title: 'SLA Breached',
          message: 'Chat interaction has exceeded SLA threshold',
          metadata: event.payload,
        });
        break;

      case 'ticket.assigned':
        await this.notificationService.create({
          recipientAgentId: event.payload.assignedAgentId,
          type: 'ticket-assignment',
          priority: 'medium',
          title: 'Ticket Assigned',
          message: `Ticket ${event.payload.displayId} has been assigned to you`,
          metadata: event.payload,
        });
        break;
    }
  }
}
```

### 7.5 Dead Letter Queue Handling

**DLQ Configuration:**
```typescript
@Injectable()
export class EventConsumerWithDLQ {
  private maxRetries = 3;
  private retryDelays = [1000, 2000, 4000]; // Exponential backoff

  async handleMessage(payload: EachMessagePayload) {
    const { message } = payload;
    const event = JSON.parse(message.value.toString());
    
    let attempt = 0;
    
    while (attempt < this.maxRetries) {
      try {
        await this.processEvent(event);
        return; // Success
      } catch (error) {
        attempt++;
        console.error(`Processing attempt ${attempt} failed:`, error);
        
        if (attempt < this.maxRetries) {
          await this.delay(this.retryDelays[attempt - 1]);
        }
      }
    }

    // Max retries exceeded, send to DLQ
    await this.sendToDLQ(event, 'Max retries exceeded');
  }

  private async sendToDLQ(event: BaseEvent, reason: string) {
    await this.producer.send({
      topic: 'dead-letter-queue',
      messages: [
        {
          key: event.eventId,
          value: JSON.stringify({
            originalEvent: event,
            failureReason: reason,
            failedAt: new Date().toISOString(),
          }),
        },
      ],
    });

    console.error(`Event ${event.eventId} sent to DLQ: ${reason}`);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

### 7.6 Kafka Topics Registry (Phase 1)

**Topic Configuration:**

| Topic | Producers | Consumers | Partitions | Retention | Phase |
|-------|-----------|-----------|------------|-----------|-------|
| `agent-events` | MS-2 | MS-3, MS-6 | 3 | 7 days | Phase 1 |
| `interaction-events` | MS-3 | MS-6, MS-11 | 5 | 30 days | Phase 1 |
| `ticket-events` | MS-4 | MS-6, MS-11 | 3 | 30 days | Phase 1 |
| `customer-events` | MS-5 | MS-16, MS-11 | 3 | 30 days | Phase 1 |
| `notification-events` | MS-6 | MS-11 | 3 | 7 days | Phase 1 |
| `sla-events` | MS-3 | MS-6, MS-15, MS-11 | 3 | 30 days | Phase 1 |
| `audit-events` | All Services | MS-11 | 5 | 7 years | Phase 1 |

**Topic Naming Convention:** `{domain}-events`

**Configuration Details:**
- Replication factor: 1 (development), 3 (production)
- Compression: snappy
- Cleanup policy: delete (time-based retention)
- Min in-sync replicas: 1 (development), 2 (production)

**Event Schema:**
All events follow the BaseEvent structure defined in Section 7.2.

---

## 8. Caching Strategy Design

### 8.1 Redis Key Naming Conventions

**Pattern:** `{service}:{entity}:{id}:{field?}`

**Examples:**
- `identity:jwt:abc123` - JWT validation result
- `identity:blacklist:token456` - Blacklisted refresh token
- `agent:status:agent-001` - Agent status cache
- `customer:profile:cust-123` - Customer profile cache
- `interaction:list:agent-001:page-1` - Interaction list cache

### 8.2 Cache-Aside Pattern Implementation

```typescript
@Injectable()
export class CustomerService {
  constructor(
    @InjectRepository(Customer)
    private customerRepo: Repository<Customer>,
    private redis: Redis,
    private encryptionService: EncryptionService,
  ) {}

  async findOne(id: string): Promise<Customer> {
    const cacheKey = `customer:profile:${id}`;

    // 1. Check cache
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      console.log(`Cache hit for ${cacheKey}`);
      return JSON.parse(cached);
    }

    // 2. Query database
    console.log(`Cache miss for ${cacheKey}, querying database`);
    const customer = await this.customerRepo.findOne({ where: { id } });

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    // 3. Decrypt PII fields
    customer.email = this.encryptionService.decrypt(customer.email);
    customer.phone = this.encryptionService.decrypt(customer.phone);
    customer.cif = this.encryptionService.decrypt(customer.cif);

    // 4. Store in cache
    await this.redis.setex(
      cacheKey,
      300, // 5 minutes TTL
      JSON.stringify(customer),
    );

    return customer;
  }

  async update(id: string, updateDto: UpdateCustomerDto): Promise<Customer> {
    // Update database
    await this.customerRepo.update(id, updateDto);

    // Invalidate cache immediately
    const cacheKey = `customer:profile:${id}`;
    await this.redis.del(cacheKey);

    // Return updated customer (will repopulate cache)
    return this.findOne(id);
  }
}
```

### 8.3 TTL Strategy per Data Type

| Data Type | TTL | Rationale |
|-----------|-----|-----------|
| JWT validation | Token expiration | Match token lifetime |
| Refresh token blacklist | 7 days | Match refresh token lifetime |
| Agent status | 60 seconds | Frequent changes, near real-time |
| Customer profiles | 5 minutes | Moderate change frequency |
| Interaction lists | 30 seconds | High change frequency |
| Static data (roles, permissions) | 1 hour | Infrequent changes |
| Session data | 8 hours | Match session timeout |

### 8.4 Cache Invalidation Patterns

**Immediate Invalidation on Mutation:**
```typescript
async updateInteractionStatus(id: string, status: string) {
  // Update database
  await this.interactionRepo.update(id, { status });

  // Invalidate related caches
  await Promise.all([
    this.redis.del(`interaction:detail:${id}`),
    this.redis.del(`interaction:list:*`), // Wildcard delete for all list caches
  ]);

  // Publish cache invalidation event
  await this.redis.publish('cache:invalidate', JSON.stringify({
    pattern: 'interaction:list:*',
    reason: 'status_update',
  }));
}
```

**Broadcast Invalidation via Kafka:**
```typescript
// When schema changes (roles, permissions)
async updateRole(roleId: string, updateDto: UpdateRoleDto) {
  await this.roleRepo.update(roleId, updateDto);

  // Publish schema update event
  await this.eventPublisher.publish('schema-updates-v1', 'role.updated', {
    roleId,
    timestamp: new Date().toISOString(),
  });
}

// Consumer in all services
@Injectable()
export class CacheInvalidationConsumer {
  async handleRoleUpdate(event: any) {
    // Invalidate all JWT caches (they contain role info)
    await this.redis.del('identity:jwt:*');
    console.log('Invalidated JWT caches due to role update');
  }
}
```

### 8.5 Cache Warming Strategy

**On Service Startup:**
```typescript
@Injectable()
export class CacheWarmingService implements OnModuleInit {
  async onModuleInit() {
    console.log('Starting cache warming...');

    // Warm frequently accessed data
    await Promise.all([
      this.warmRolesAndPermissions(),
      this.warmAgentProfiles(),
      this.warmNotificationSettings(),
    ]);

    console.log('Cache warming completed');
  }

  private async warmRolesAndPermissions() {
    const roles = await this.roleRepo.find({ relations: ['permissions'] });
    
    for (const role of roles) {
      const cacheKey = `identity:role:${role.id}`;
      await this.redis.setex(cacheKey, 3600, JSON.stringify(role));
    }
  }

  private async warmAgentProfiles() {
    const agents = await this.agentRepo.find({ take: 100 }); // Top 100 agents
    
    for (const agent of agents) {
      const cacheKey = `agent:profile:${agent.id}`;
      await this.redis.setex(cacheKey, 300, JSON.stringify(agent));
    }
  }
}
```

---

## 9. Frontend Integration Design

### 9.1 React Query Integration Patterns

**QueryClient Configuration:**
```typescript
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000, // 30 seconds for list queries
      cacheTime: 5 * 60 * 1000, // 5 minutes cache retention
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      retry: 1,
    },
    mutations: {
      retry: 0,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppContent />
    </QueryClientProvider>
  );
}
```

**Query Hooks:**
```typescript
// hooks/useInteractions.ts
import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

export function useInteractions(filters: InteractionFilters) {
  return useQuery({
    queryKey: ['interactions', filters],
    queryFn: () => apiClient.getInteractions(filters),
    staleTime: 30 * 1000,
  });
}

export function useInteractionDetail(id: string) {
  return useQuery({
    queryKey: ['interactions', id],
    queryFn: () => apiClient.getInteraction(id),
    staleTime: 5 * 60 * 1000, // 5 minutes for detail views
    enabled: !!id,
  });
}

export function useInfiniteInteractions(filters: InteractionFilters) {
  return useInfiniteQuery({
    queryKey: ['interactions', 'infinite', filters],
    queryFn: ({ pageParam = 1 }) => 
      apiClient.getInteractions({ ...filters, page: pageParam }),
    getNextPageParam: (lastPage) => 
      lastPage.meta.page < lastPage.meta.totalPages 
        ? lastPage.meta.page + 1 
        : undefined,
  });
}
```

**Mutation Hooks with Optimistic Updates:**
```typescript
// hooks/useUpdateInteractionStatus.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';

export function useUpdateInteractionStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      apiClient.updateInteractionStatus(id, status),
    
    onMutate: async ({ id, status }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['interactions', id] });

      // Snapshot previous value
      const previousInteraction = queryClient.getQueryData(['interactions', id]);

      // Optimistically update
      queryClient.setQueryData(['interactions', id], (old: any) => ({
        ...old,
        status,
        updatedAt: new Date().toISOString(),
      }));

      return { previousInteraction };
    },

    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousInteraction) {
        queryClient.setQueryData(
          ['interactions', variables.id],
          context.previousInteraction
        );
      }
    },

    onSettled: (data, error, variables) => {
      // Refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: ['interactions', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['interactions'] });
    },
  });
}
```

### 9.2 API Client with Interceptors

**Axios Client Setup:**
```typescript
// lib/api-client.ts
import axios, { AxiosError, AxiosRequestConfig } from 'axios';
import { getAccessToken, refreshAccessToken, logout } from './auth';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - Add JWT token
apiClient.interceptors.request.use(
  (config) => {
    const token = getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - Handle token refresh
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };

    // Handle 401 Unauthorized
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // Attempt token refresh
        const newToken = await refreshAccessToken();
        
        // Retry original request with new token
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
        }
        
        return apiClient(originalRequest);
      } catch (refreshError) {
        // Refresh failed, logout user
        logout();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    // Handle other errors
    return Promise.reject(error);
  }
);

export default apiClient;
```

**API Methods:**
```typescript
// lib/api/interactions.ts
import apiClient from '../api-client';

export const interactionsApi = {
  getAll: (filters: InteractionFilters) =>
    apiClient.get('/api/v1/interactions', { params: filters }).then(res => res.data),

  getOne: (id: string) =>
    apiClient.get(`/api/v1/interactions/${id}`).then(res => res.data),

  updateStatus: (id: string, status: string) =>
    apiClient.put(`/api/v1/interactions/${id}/status`, { status }).then(res => res.data),

  addNote: (id: string, note: CreateNoteDto) =>
    apiClient.post(`/api/v1/interactions/${id}/notes`, note).then(res => res.data),

  assignAgent: (id: string, agentId: string) =>
    apiClient.put(`/api/v1/interactions/${id}/assign`, { agentId }).then(res => res.data),
};
```

### 9.3 WebSocket Client Wrapper

**WebSocket Hook:**
```typescript
// hooks/useWebSocket.ts
import { useEffect, useRef, useState } from 'react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { getAccessToken } from '@/lib/auth';

export function useWebSocket() {
  const clientRef = useRef<Client | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'reconnecting' | 'disconnected'>('disconnected');

  useEffect(() => {
    const client = new Client({
      webSocketFactory: () => new SockJS(`${import.meta.env.VITE_API_BASE_URL}/ws`),
      connectHeaders: {
        Authorization: `Bearer ${getAccessToken()}`,
      },
      reconnectDelay: 5000,
      heartbeatIncoming: 30000,
      heartbeatOutgoing: 30000,
      
      onConnect: () => {
        console.log('WebSocket connected');
        setIsConnected(true);
        setConnectionStatus('connected');
      },

      onDisconnect: () => {
        console.log('WebSocket disconnected');
        setIsConnected(false);
        setConnectionStatus('disconnected');
      },

      onStompError: (frame) => {
        console.error('STOMP error:', frame);
        setConnectionStatus('disconnected');
      },

      onWebSocketClose: () => {
        console.log('WebSocket closed, will attempt reconnection');
        setConnectionStatus('reconnecting');
      },
    });

    client.activate();
    clientRef.current = client;

    return () => {
      client.deactivate();
    };
  }, []);

  const subscribe = (destination: string, callback: (message: any) => void) => {
    if (!clientRef.current || !isConnected) {
      console.warn('Cannot subscribe: WebSocket not connected');
      return null;
    }

    return clientRef.current.subscribe(destination, (message) => {
      const data = JSON.parse(message.body);
      callback(data);
    });
  };

  const send = (destination: string, body: any) => {
    if (!clientRef.current || !isConnected) {
      console.warn('Cannot send: WebSocket not connected');
      return;
    }

    clientRef.current.publish({
      destination,
      body: JSON.stringify(body),
    });
  };

  return {
    isConnected,
    connectionStatus,
    subscribe,
    send,
  };
}
```

**Usage in Components:**
```typescript
// components/NotificationCenter.tsx
import { useWebSocket } from '@/hooks/useWebSocket';
import { useQueryClient } from '@tanstack/react-query';

export function NotificationCenter() {
  const { subscribe, connectionStatus } = useWebSocket();
  const queryClient = useQueryClient();
  const { data: user } = useCurrentUser();

  useEffect(() => {
    if (!user) return;

    const subscription = subscribe(`/topic/notifications/${user.agentId}`, (notification) => {
      // Update React Query cache
      queryClient.setQueryData(['notifications'], (old: any) => ({
        ...old,
        data: [notification, ...(old?.data || [])],
      }));

      // Show toast notification
      toast({
        title: notification.title,
        description: notification.message,
        variant: notification.priority === 'urgent' ? 'destructive' : 'default',
      });
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, [user, subscribe, queryClient]);

  return (
    <div>
      <ConnectionIndicator status={connectionStatus} />
      {/* Notification list */}
    </div>
  );
}
```

### 9.4 Context Providers for UI State

**Agent Status Context (Enhanced):**
```typescript
// contexts/AgentStatusContext.tsx
import { createContext, useContext, useState, useEffect } from 'react';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useUpdateAgentStatus } from '@/hooks/useUpdateAgentStatus';

interface AgentStatusContextValue {
  channelStatuses: ChannelStatus[];
  setChannelStatus: (channel: string, status: string, reason?: string) => Promise<void>;
  setAllChannelsStatus: (status: string, reason?: string) => Promise<void>;
  isChannelReady: (channel: string) => boolean;
}

const AgentStatusContext = createContext<AgentStatusContextValue | null>(null);

export function AgentStatusProvider({ children }: { children: React.ReactNode }) {
  const [channelStatuses, setChannelStatuses] = useState<ChannelStatus[]>([]);
  const { subscribe } = useWebSocket();
  const updateStatusMutation = useUpdateAgentStatus();
  const { data: user } = useCurrentUser();

  // Subscribe to status updates via WebSocket
  useEffect(() => {
    if (!user) return;

    const subscription = subscribe(`/topic/agent/${user.agentId}/status`, (update) => {
      setChannelStatuses(update);
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, [user, subscribe]);

  const setChannelStatus = async (channel: string, status: string, reason?: string) => {
    await updateStatusMutation.mutateAsync({ channel, status, reason });
  };

  const setAllChannelsStatus = async (status: string, reason?: string) => {
    await updateStatusMutation.mutateAsync({ channel: 'all', status, reason });
  };

  const isChannelReady = (channel: string) => {
    const channelStatus = channelStatuses.find(s => s.channel === channel);
    return channelStatus?.status === 'ready';
  };

  return (
    <AgentStatusContext.Provider value={{
      channelStatuses,
      setChannelStatus,
      setAllChannelsStatus,
      isChannelReady,
    }}>
      {children}
    </AgentStatusContext.Provider>
  );
}

export const useAgentStatus = () => {
  const context = useContext(AgentStatusContext);
  if (!context) {
    throw new Error('useAgentStatus must be used within AgentStatusProvider');
  }
  return context;
};
```

---

## 10. Security Design

### 10.1 Encryption at Rest

**AES-256-GCM Implementation:**
- Algorithm: AES-256-GCM (Galois/Counter Mode)
- Key size: 256 bits
- IV: 16 bytes random per encryption
- Authentication tag: 16 bytes
- Storage format: `{iv}:{authTag}:{ciphertext}` (hex-encoded)

**PII Fields Requiring Encryption:**
- Customer email
- Customer phone
- Customer CIF (Customer Information File)
- Account numbers (future)
- Credit card numbers (future)

**Key Management:**
- Phase 1: Environment variable (`ENCRYPTION_KEY`)
- Phase 3: HashiCorp Vault with automatic rotation

### 10.2 Encryption in Transit

**TLS Configuration:**
- Minimum version: TLS 1.3
- Cipher suites: Modern, forward-secret ciphers only
- Certificate: Valid SSL/TLS certificate from trusted CA
- HSTS: Enabled with max-age=31536000

**mTLS Between Services:**
- Istio service mesh handles mTLS automatically
- Certificate rotation: Automatic via Istio
- Mutual authentication: All service-to-service calls

**WebSocket Security:**
- Protocol: WSS (WebSocket Secure)
- Authentication: JWT in connection headers
- Same TLS configuration as HTTPS

### 10.3 Password Security

**Hashing Strategy:**
```typescript
import * as bcrypt from 'bcrypt';

const SALT_ROUNDS = 12;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
```

**Password Requirements:**
- Minimum length: 12 characters
- Must include: uppercase, lowercase, number, special character
- Password history: Prevent reuse of last 5 passwords
- Expiration: 90 days (Phase 3)

**Validation:**
```typescript
import { IsString, MinLength, Matches } from 'class-validator';

export class ChangePasswordDto {
  @IsString()
  currentPassword: string;

  @IsString()
  @MinLength(12, { message: 'Password must be at least 12 characters' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, {
    message: 'Password must contain uppercase, lowercase, number, and special character',
  })
  newPassword: string;
}
```

### 10.4 Input Validation and Sanitization

**DTO Validation:**
```typescript
import { IsString, IsEmail, IsPhoneNumber, IsUUID, IsIn, IsOptional, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateInteractionNoteDto {
  @IsUUID()
  interactionId: string;

  @IsString()
  @MaxLength(5000, { message: 'Note content cannot exceed 5000 characters' })
  @Transform(({ value }) => value.trim()) // Trim whitespace
  content: string;

  @IsOptional()
  @IsIn(['customer-info', 'callback', 'complaint', 'technical', 'payment', 'general'])
  tag?: string;

  @IsOptional()
  @IsBoolean()
  isPinned?: boolean;
}
```

**SQL Injection Prevention:**
- Use TypeORM parameterized queries exclusively
- Never concatenate user input into SQL strings
- Use query builder or repository methods

**XSS Prevention:**
```typescript
import DOMPurify from 'isomorphic-dompurify';

export function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br'],
    ALLOWED_ATTR: ['href'],
  });
}

// Usage in service
async addNote(interactionId: string, noteDto: CreateInteractionNoteDto) {
  const sanitizedContent = sanitizeHtml(noteDto.content);
  
  return this.noteRepository.save({
    interactionId,
    content: sanitizedContent,
    tag: noteDto.tag,
    isPinned: noteDto.isPinned,
  });
}
```

### 10.5 Rate Limiting Implementation

**Kong Gateway Configuration:**
```yaml
plugins:
  - name: rate-limiting
    config:
      minute: 100
      policy: redis
      redis_host: redis
      redis_port: 6379
      fault_tolerant: true
      hide_client_headers: false
```

**Custom Rate Limiting for Sensitive Endpoints:**
```typescript
import { Injectable, CanActivate, ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Redis } from 'ioredis';

@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private redis: Redis,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const limit = this.reflector.get<number>('rateLimit', context.getHandler());
    
    if (!limit) {
      return true; // No rate limit configured
    }

    const request = context.switchToHttp().getRequest();
    const userId = request.user?.id || request.ip;
    const key = `rate-limit:${request.path}:${userId}`;

    const current = await this.redis.incr(key);
    
    if (current === 1) {
      await this.redis.expire(key, 60); // 1 minute window
    }

    if (current > limit) {
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: 'Rate limit exceeded',
          retryAfter: await this.redis.ttl(key),
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return true;
  }
}

// Usage
@Post('login')
@RateLimit(5) // 5 requests per minute
async login(@Body() loginDto: LoginDto) {
  return this.authService.login(loginDto);
}
```

### 10.6 CORS Policy

**Configuration:**
```typescript
// main.ts
app.enableCors({
  origin: [
    'https://agent.tpb.vn',
    'https://admin.tpb.vn',
    process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : '',
  ].filter(Boolean),
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Authorization', 'Content-Type', 'X-Request-Id'],
  credentials: true,
  maxAge: 3600,
});
```

### 10.7 Audit Logging

**Audit Log Entity:**
```typescript
@Entity('audit_logs')
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column()
  action: string; // 'create', 'update', 'delete', 'read'

  @Column()
  resource: string; // 'interaction', 'ticket', 'customer'

  @Column({ name: 'resource_id', type: 'uuid' })
  resourceId: string;

  @Column({ type: 'jsonb', nullable: true })
  changes: Record<string, any>;

  @Column({ name: 'ip_address', type: 'inet' })
  ipAddress: string;

  @Column({ name: 'user_agent', nullable: true })
  userAgent: string;

  @Column({ default: 'success' })
  result: string; // 'success', 'failure'

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
```

**Audit Interceptor:**
```typescript
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private auditService: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { user, method, url, ip, headers } = request;

    return next.handle().pipe(
      tap(async (response) => {
        // Log successful operations
        if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
          await this.auditService.log({
            userId: user?.id,
            action: this.mapMethodToAction(method),
            resource: this.extractResource(url),
            resourceId: response?.id || request.params.id,
            changes: request.body,
            ipAddress: ip,
            userAgent: headers['user-agent'],
            result: 'success',
          });
        }
      }),
      catchError(async (error) => {
        // Log failed operations
        await this.auditService.log({
          userId: user?.id,
          action: this.mapMethodToAction(method),
          resource: this.extractResource(url),
          resourceId: request.params.id,
          changes: request.body,
          ipAddress: ip,
          userAgent: headers['user-agent'],
          result: 'failure',
        });
        throw error;
      }),
    );
  }

  private mapMethodToAction(method: string): string {
    const map = { POST: 'create', PUT: 'update', PATCH: 'update', DELETE: 'delete', GET: 'read' };
    return map[method] || 'unknown';
  }

  private extractResource(url: string): string {
    const match = url.match(/\/api\/v1\/([^\/]+)/);
    return match ? match[1] : 'unknown';
  }
}
```

### 10.8 Audit Log Hash Chaining

**Implementation for Tamper Detection:**

The audit logging system implements hash chaining to detect unauthorized modifications to audit records.

**Hash Chain Algorithm:**
```typescript
@Entity('audit_logs')
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'bigint', generated: 'increment' })
  sequence: number;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({ name: 'event_type' })
  eventType: string;

  @Column({ name: 'actor_id', type: 'uuid', nullable: true })
  actorId: string;

  @Column({ name: 'actor_role', nullable: true })
  actorRole: string;

  @Column({ name: 'resource_type' })
  resourceType: string;

  @Column({ name: 'resource_id', type: 'uuid', nullable: true })
  resourceId: string;

  @Column()
  action: string;

  @Column({ type: 'jsonb', nullable: true })
  oldValues: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  newValues: Record<string, any>;

  @Column({ name: 'ip_address', type: 'inet', nullable: true })
  ipAddress: string;

  @Column({ name: 'user_agent', nullable: true })
  userAgent: string;

  @Column({ name: 'prev_hash', nullable: true })
  prevHash: string;

  @Column({ name: 'event_hash' })
  eventHash: string;

  @Column({ name: 'occurred_at', type: 'timestamptz' })
  occurredAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
```

**Hash Calculation:**
```typescript
import * as crypto from 'crypto';

@Injectable()
export class AuditService {
  async createAuditLog(logData: CreateAuditLogDto): Promise<AuditLog> {
    // Get previous hash
    const lastLog = await this.auditLogRepo.findOne({
      where: { tenantId: logData.tenantId },
      order: { sequence: 'DESC' },
    });

    const prevHash = lastLog?.eventHash || '0'.repeat(64);

    // Calculate event hash
    const eventData = JSON.stringify({
      eventType: logData.eventType,
      actorId: logData.actorId,
      resourceType: logData.resourceType,
      resourceId: logData.resourceId,
      action: logData.action,
      oldValues: logData.oldValues,
      newValues: logData.newValues,
      occurredAt: logData.occurredAt,
      prevHash,
    });

    const eventHash = crypto
      .createHash('sha256')
      .update(eventData)
      .digest('hex');

    // Save audit log
    return this.auditLogRepo.save({
      ...logData,
      prevHash,
      eventHash,
    });
  }

  async verifyChainIntegrity(tenantId: string): Promise<boolean> {
    const logs = await this.auditLogRepo.find({
      where: { tenantId },
      order: { sequence: 'ASC' },
    });

    for (let i = 0; i < logs.length; i++) {
      const log = logs[i];
      const prevHash = i === 0 ? '0'.repeat(64) : logs[i - 1].eventHash;

      // Recalculate hash
      const eventData = JSON.stringify({
        eventType: log.eventType,
        actorId: log.actorId,
        resourceType: log.resourceType,
        resourceId: log.resourceId,
        action: log.action,
        oldValues: log.oldValues,
        newValues: log.newValues,
        occurredAt: log.occurredAt,
        prevHash,
      });

      const calculatedHash = crypto
        .createHash('sha256')
        .update(eventData)
        .digest('hex');

      if (calculatedHash !== log.eventHash) {
        console.error(`Hash mismatch at sequence ${log.sequence}`);
        return false;
      }

      if (log.prevHash !== prevHash) {
        console.error(`Chain broken at sequence ${log.sequence}`);
        return false;
      }
    }

    return true;
  }
}
```

**Row-Level Security:**
```sql
-- Prevent updates and deletes
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY audit_insert_only ON audit_logs 
  FOR INSERT 
  TO audit_writer 
  WITH CHECK (true);

CREATE POLICY audit_read_admin ON audit_logs 
  FOR SELECT 
  TO audit_reader 
  USING (true);

-- No UPDATE or DELETE policies = operations blocked
```

**Verification Schedule:**
- Hourly: Verify last 1000 records
- Daily: Full chain verification
- On-demand: Admin-triggered verification

**Retention:**
- 7 years minimum (BFSI compliance)
- Archive to cold storage after 2 years
- Hash chain maintained across archives

### 10.9 Security Monitoring

**Failed Login Tracking:**
```typescript
async trackFailedLogin(username: string, ipAddress: string) {
  await this.loginAttemptRepo.save({
    username,
    ipAddress,
    success: false,
    attemptedAt: new Date(),
  });

  // Check for suspicious activity
  const recentFailures = await this.loginAttemptRepo.count({
    where: {
      ipAddress,
      success: false,
      attemptedAt: MoreThan(new Date(Date.now() - 15 * 60 * 1000)),
    },
  });

  if (recentFailures >= 10) {
    await this.alertService.sendSecurityAlert({
      type: 'suspicious-login-activity',
      ipAddress,
      failureCount: recentFailures,
    });
  }
}
```

---

## 11. Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### 11.1 Acceptance Criteria Testing Prework

Before defining correctness properties, we analyze each acceptance criterion from the requirements to determine testability:

#### Requirement 1: Agent Authentication and Session Management

**1.1** WHEN an agent submits valid username and password, THE Identity_Service SHALL return a JWT access token with 15-minute expiration and a refresh token with 7-day expiration
  - Thoughts: This is testable as a property. For any valid credentials, the system should return tokens with correct expiration times. We can generate random valid credentials and verify token structure and expiration.
  - Testable: yes - property

**1.2** WHEN an agent has MFA enabled, THE Identity_Service SHALL require TOTP verification before issuing tokens
  - Thoughts: This is testable as a property. For any user with MFA enabled, login should require TOTP verification. We can test this by attempting login with MFA-enabled users and verifying TOTP is required.
  - Testable: yes - property

**1.3** IF an agent submits invalid credentials, THEN THE Identity_Service SHALL increment failed login attempts and return error with remaining attempts count
  - Thoughts: This is testable as a property. For any invalid credentials, the system should increment the counter and return the correct remaining count.
  - Testable: yes - property

**1.4** WHEN an agent exceeds 5 failed login attempts within 15 minutes, THE Identity_Service SHALL lock the account for 15 minutes
  - Thoughts: This is an edge case that's important to test. We need to verify the lockout mechanism works correctly.
  - Testable: edge-case

**1.5** WHEN an agent's access token expires, THE Agent_Desktop SHALL automatically request a new access token using the refresh token
  - Thoughts: This is a round-trip property - token refresh should work seamlessly. We can test by simulating expired tokens and verifying automatic refresh.
  - Testable: yes - property

**1.6** WHEN a refresh token is used, THE Identity_Service SHALL rotate the refresh token and invalidate the previous one
  - Thoughts: This is testable as a property. For any refresh token use, the old token should be invalidated and a new one issued.
  - Testable: yes - property

**1.7** WHEN an agent logs out, THE Identity_Service SHALL revoke the refresh token and add it to Redis blacklist
  - Thoughts: This is testable as a property. For any logout, the token should be blacklisted and unusable.
  - Testable: yes - property

**1.8** THE Identity_Service SHALL store session metadata including IP address, user agent, and login timestamp
  - Thoughts: This is testable as a property. For any login, session metadata should be stored correctly.
  - Testable: yes - property

**1.9** WHEN an agent requests their profile, THE Identity_Service SHALL return user details including roles, permissions, and agent ID
  - Thoughts: This is testable as a property. For any authenticated user, profile should contain required fields.
  - Testable: yes - property

**1.10** THE Identity_Service SHALL hash passwords using bcrypt with cost factor 12
  - Thoughts: This is testable as a property. For any password, it should be hashed with bcrypt cost 12.
  - Testable: yes - property

#### Requirement 2: Role-Based Access Control

**2.1-2.10** All RBAC criteria are testable as properties - they define rules that should hold for all users and permissions.
  - Testable: yes - property (for all)

#### Requirement 3: Agent Status Management

**3.1** THE Agent_Service SHALL maintain per-channel status for each agent with values ready, not-ready, or disconnected
  - Thoughts: This is an invariant - status values must always be one of the allowed values.
  - Testable: yes - property

**3.2-3.10** All status management criteria are testable as properties - they define state transitions and persistence rules.
  - Testable: yes - property (for all)

#### Requirement 4: Agent Presence and Heartbeat

**4.1-4.10** All presence criteria are testable as properties - they define heartbeat behavior and connection status rules.
  - Testable: yes - property (for all)

#### Requirement 5-30: Similar Analysis

For brevity, the remaining requirements follow similar patterns:
- State machine transitions: testable as properties
- Data persistence: testable as properties (round-trip)
- Validation rules: testable as properties
- Real-time updates: testable as properties (timing constraints)
- UI-specific aesthetics: not testable
- Vague requirements ("maintain data integrity"): not testable

### 11.2 Property Reflection

After analyzing all acceptance criteria, we identify potential redundancies:

**Redundancy Analysis:**
1. Properties about token expiration (1.1) and token refresh (1.5) are related but test different aspects - both needed
2. Properties about status persistence (3.10) and status retrieval (3.7) can be combined into a round-trip property
3. Properties about notification creation and notification push can be combined into a single comprehensive property
4. Multiple properties about database persistence can use a common round-trip pattern

**Consolidated Approach:**
- Use round-trip properties for all persistence operations
- Use state machine properties for all workflow transitions
- Use invariant properties for data constraints
- Use metamorphic properties for related operations


### 11.3 Correctness Properties

#### Property 1: Token Generation and Validation Round-Trip

*For any* valid user credentials, when tokens are generated and then validated, the decoded payload should match the original user information and expiration times should be within expected ranges.

**Validates: Requirements 1.1, 1.9**

**Implementation Approach:**
- Generate random valid user data
- Call login endpoint to get tokens
- Decode and verify JWT structure
- Verify access token expires in 15 minutes (±5 seconds tolerance)
- Verify refresh token expires in 7 days (±1 minute tolerance)
- Verify payload contains userId, agentId, roles, permissions

#### Property 2: Refresh Token Rotation Idempotency

*For any* valid refresh token, when used to obtain new tokens, the old refresh token should be invalidated and attempting to reuse it should fail with 401 Unauthorized.

**Validates: Requirements 1.6, 1.7**

**Implementation Approach:**
- Generate tokens via login
- Use refresh token to get new tokens
- Attempt to reuse old refresh token
- Verify second attempt fails with 401
- Verify old token is in Redis blacklist

#### Property 3: Failed Login Attempt Counter Accuracy

*For any* user account, the number of failed login attempts should equal the number of invalid login requests made within the 15-minute window, and should reset to zero after a successful login.

**Validates: Requirements 1.3, 1.4**

**Implementation Approach:**
- Generate random number of failed attempts (1-10)
- Make that many failed login requests
- Verify counter matches expected value
- Make successful login
- Verify counter resets to zero

#### Property 4: MFA Requirement Enforcement

*For any* user with MFA enabled, login with valid password should return a partial token requiring TOTP verification, and full tokens should only be issued after valid TOTP code submission.

**Validates: Requirement 1.2**

**Implementation Approach:**
- Create users with MFA enabled/disabled
- Attempt login with valid password
- For MFA users: verify partial token returned
- For non-MFA users: verify full tokens returned
- For MFA users: submit valid TOTP and verify full tokens issued

#### Property 5: Password Hashing Irreversibility

*For any* password, the bcrypt hash should be different from the plaintext, should verify correctly with bcrypt.compare, and two hashes of the same password should be different (due to random salt).

**Validates: Requirement 1.10**

**Implementation Approach:**
- Generate random passwords
- Hash each password
- Verify hash ≠ plaintext
- Verify bcrypt.compare returns true for correct password
- Hash same password twice, verify hashes are different

#### Property 6: RBAC Permission Enforcement

*For any* API endpoint with permission requirements, requests with valid JWT containing required permissions should succeed (200/201), and requests without required permissions should fail with 403 Forbidden.

**Validates: Requirements 2.1-2.10**

**Implementation Approach:**
- Generate users with various permission sets
- Make requests to protected endpoints
- Verify users with permissions get 200/201
- Verify users without permissions get 403
- Verify permission scope is enforced (own/team/all)

#### Property 7: Agent Status State Machine Validity

*For any* agent channel status, the status value should always be one of {ready, not-ready, disconnected}, and status transitions should follow the allowed state machine rules.

**Validates: Requirements 3.1, 3.2**

**Implementation Approach:**
- Generate random status update requests
- Verify stored status is always valid enum value
- Attempt invalid status values, verify rejection
- Verify state transitions are logged correctly

#### Property 8: Agent Status Persistence Round-Trip

*For any* agent status update, storing the status and then retrieving it should return the same status, reason, and timestamp (within reasonable time tolerance).

**Validates: Requirements 3.10, 3.7**

**Implementation Approach:**
- Generate random status updates (channel, status, reason)
- Update agent status via API
- Retrieve agent status via API
- Verify all fields match (status, reason, customReason)
- Verify timestamp is recent (within 1 second)

#### Property 9: Heartbeat Connection Status Correlation

*For any* agent session, if heartbeats are sent regularly (every 30 seconds), connection status should remain 'connected', and if heartbeats stop for 60+ seconds, connection status should change to 'disconnected'.

**Validates: Requirements 4.2, 4.3, 4.4**

**Implementation Approach:**
- Create agent session
- Send heartbeats every 30 seconds for 2 minutes
- Verify connection status remains 'connected'
- Stop sending heartbeats
- Wait 60 seconds
- Verify connection status changes to 'disconnected'

#### Property 10: Interaction State Machine Transitions

*For any* interaction, status transitions should follow the state machine: new → assigned → in-progress → resolved → closed, and invalid transitions should be rejected with 400 Bad Request.

**Validates: Requirement 6.1, 6.3, 6.4**

**Implementation Approach:**
- Create interaction in 'new' status
- Attempt valid transitions, verify success
- Attempt invalid transitions (e.g., new → resolved), verify 400 error
- Verify closed is terminal state (no transitions allowed)

#### Property 11: Interaction Note Persistence Round-Trip

*For any* interaction note, adding a note and then retrieving the interaction's notes should include the added note with correct content, author, and timestamp.

**Validates: Requirements 6.5, 6.6, 6.7**

**Implementation Approach:**
- Generate random note content and tags
- Add note to interaction
- Retrieve interaction notes
- Verify note exists in list
- Verify content, agentId, agentName, tag match
- Verify timestamp is recent

#### Property 12: SLA Countdown Accuracy

*For any* chat interaction with 5-minute SLA, the remaining time should decrease by approximately 1 second per second, and when remaining time reaches 0, SLA status should change to 'breached'.

**Validates: Requirements 7.1, 7.2, 7.3, 7.4**

**Implementation Approach:**
- Create chat interaction with 5-minute SLA
- Query SLA status at t=0, t=60s, t=120s
- Verify remaining time decreases correctly
- Wait until SLA expires
- Verify status changes to 'breached'
- Verify sla.breached event published to Kafka

#### Property 13: Email Thread Message Ordering

*For any* email thread, messages should be returned in chronological order (oldest first), and all messages with the same threadId should be included.

**Validates: Requirement 8.2**

**Implementation Approach:**
- Create email thread with multiple messages
- Add messages with different timestamps
- Retrieve thread
- Verify messages ordered by timestamp ascending
- Verify all messages with threadId are included

#### Property 14: Ticket Display ID Uniqueness

*For any* two tickets created in the same year, their display IDs should be unique and follow the format TKT-YYYY-NNNNNN with sequential numbering.

**Validates: Requirement 10.1**

**Implementation Approach:**
- Create multiple tickets
- Verify each has unique display ID
- Verify format matches TKT-YYYY-NNNNNN
- Verify sequence numbers are sequential
- Attempt to create ticket with duplicate ID, verify rejection

#### Property 15: Ticket State Machine Transitions

*For any* ticket, status transitions should follow the state machine: new → in-progress → waiting-response → resolved → closed, with direct transitions to resolved allowed from any state.

**Validates: Requirements 11.1, 11.2, 11.6**

**Implementation Approach:**
- Create ticket in 'new' status
- Test valid transitions
- Test direct transition to 'resolved' from any state
- Verify closed is terminal state
- Verify invalid transitions rejected

#### Property 16: Ticket Comment Persistence Round-Trip

*For any* ticket comment, adding a comment and then retrieving the ticket's comments should include the added comment with correct content, author, type (public/internal), and timestamp.

**Validates: Requirements 12.1, 12.2, 12.3, 12.4**

**Implementation Approach:**
- Generate random comments (public and internal)
- Add comments to ticket
- Retrieve ticket comments
- Verify all comments present
- Verify content, authorId, isInternal flag match
- Verify chronological ordering

#### Property 17: Customer PII Encryption Round-Trip

*For any* customer record with PII fields (email, phone, CIF), storing the record should encrypt these fields in the database, and retrieving the record should decrypt them back to the original values.

**Validates: Requirements 13.2, 13.5**

**Implementation Approach:**
- Generate random customer data with PII
- Save customer to database
- Query database directly, verify PII fields are encrypted (not plaintext)
- Retrieve customer via service, verify PII fields are decrypted
- Verify decrypted values match original values

#### Property 18: Customer Interaction History Completeness

*For any* customer, retrieving their interaction history should return all interactions where customerId matches, sorted by creation date descending.

**Validates: Requirements 14.1, 14.2**

**Implementation Approach:**
- Create customer
- Create multiple interactions for customer
- Create interactions for other customers
- Retrieve customer interaction history
- Verify only customer's interactions returned
- Verify sorted by createdAt descending
- Verify count matches expected

#### Property 19: Notification Creation and WebSocket Push

*For any* notification created for an agent, the notification should be stored in the database with status 'new' and pushed to the agent's WebSocket connection within 1 second.

**Validates: Requirements 16.3, 16.4, 16.5**

**Implementation Approach:**
- Establish WebSocket connection for agent
- Subscribe to notification channel
- Create notification for agent
- Measure time until WebSocket message received
- Verify latency < 1 second
- Verify notification in database with status 'new'

#### Property 20: Notification State Machine Transitions

*For any* notification, status transitions should follow the state machine: new → viewed → actioned OR new → viewed → dismissed, and invalid transitions should be rejected.

**Validates: Requirements 17.1, 17.2, 17.3, 17.4**

**Implementation Approach:**
- Create notification in 'new' status
- Test valid transitions (new → viewed → actioned)
- Test valid transitions (new → viewed → dismissed)
- Attempt invalid transitions (new → actioned without viewed)
- Verify timestamps recorded correctly

#### Property 21: Rate Limiting Enforcement

*For any* API endpoint with rate limit N requests per minute, making N requests should succeed, and the (N+1)th request should fail with 429 Too Many Requests including Retry-After header.

**Validates: Requirements 20.1, 20.2, 20.3**

**Implementation Approach:**
- Identify endpoint with rate limit (e.g., 100/min)
- Make exactly 100 requests rapidly
- Verify all succeed (200/201)
- Make 101st request
- Verify 429 response
- Verify Retry-After header present
- Wait for window to reset, verify requests succeed again

#### Property 22: Database Transaction Atomicity

*For any* operation that modifies multiple tables (e.g., creating ticket + adding comment), if any part fails, all changes should be rolled back and database should remain in consistent state.

**Validates: Requirement 21.10**

**Implementation Approach:**
- Start transaction
- Perform multiple database operations
- Force error on last operation
- Verify transaction rolled back
- Verify no partial data in database
- Verify database constraints maintained

#### Property 23: Event Publishing Idempotency

*For any* domain event, publishing the same event multiple times (same eventId) should result in consumers processing it only once due to idempotency checks.

**Validates: Requirements 22.6, 22.7**

**Implementation Approach:**
- Generate event with specific eventId
- Publish event to Kafka
- Publish same event again (duplicate)
- Verify consumer processes event only once
- Verify processed_events table contains eventId
- Verify duplicate is skipped

#### Property 24: Cache Invalidation on Mutation

*For any* cached entity, when the entity is updated via API, the cache should be invalidated immediately, and subsequent reads should return the updated value.

**Validates: Requirements 23.5, 23.6**

**Implementation Approach:**
- Read entity to populate cache
- Verify cache hit on second read
- Update entity via API
- Verify cache invalidated (cache miss)
- Read entity again
- Verify updated value returned

#### Property 25: WebSocket Reconnection After Disconnect

*For any* WebSocket connection, if the connection is lost, the client should attempt reconnection with exponential backoff, and upon successful reconnection, should resubscribe to all previous channels.

**Validates: Requirements 26.3, 26.4, 26.5**

**Implementation Approach:**
- Establish WebSocket connection
- Subscribe to multiple channels
- Simulate network disconnect
- Verify reconnection attempts with increasing delays
- Verify successful reconnection
- Verify all subscriptions restored
- Verify no message loss for buffered messages

---

## 12. Error Handling

### 12.1 Error Response Format

**Standard Error Response:**
```typescript
interface ErrorResponse {
  statusCode: number;
  message: string | string[];
  error: string;
  timestamp: string;
  path: string;
  requestId: string;
}
```

**Example:**
```json
{
  "statusCode": 400,
  "message": ["email must be a valid email", "password must be at least 12 characters"],
  "error": "Bad Request",
  "timestamp": "2026-03-08T10:30:00.000Z",
  "path": "/api/v1/auth/login",
  "requestId": "abc-123-def-456"
}
```

### 12.2 Global Exception Filter

```typescript
import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      message = typeof exceptionResponse === 'string' 
        ? exceptionResponse 
        : (exceptionResponse as any).message;
    } else if (exception instanceof Error) {
      message = exception.message;
    }

    // Sanitize error message (don't expose sensitive info)
    const sanitizedMessage = this.sanitizeErrorMessage(message, status);

    // Log error
    console.error('Exception caught:', {
      status,
      message: sanitizedMessage,
      path: request.url,
      method: request.method,
      requestId: request.id,
      stack: exception instanceof Error ? exception.stack : undefined,
    });

    response.status(status).json({
      statusCode: status,
      message: sanitizedMessage,
      error: HttpStatus[status],
      timestamp: new Date().toISOString(),
      path: request.url,
      requestId: request.id,
    });
  }

  private sanitizeErrorMessage(message: any, status: number): string | string[] {
    // Don't expose internal errors to client
    if (status === 500) {
      return 'An unexpected error occurred. Please try again later.';
    }

    // Don't reveal whether username exists
    if (status === 401 && typeof message === 'string') {
      return 'Invalid credentials';
    }

    return message;
  }
}
```

### 12.3 Validation Error Handling

**DTO Validation Pipe:**
```typescript
app.useGlobalPipes(
  new ValidationPipe({
    whitelist: true, // Strip properties not in DTO
    forbidNonWhitelisted: true, // Throw error for extra properties
    transform: true, // Auto-transform to DTO types
    transformOptions: {
      enableImplicitConversion: true,
    },
    exceptionFactory: (errors) => {
      const messages = errors.map(error => ({
        field: error.property,
        constraints: Object.values(error.constraints || {}),
      }));
      return new BadRequestException({
        message: 'Validation failed',
        errors: messages,
      });
    },
  }),
);
```

### 12.4 Database Error Handling

```typescript
try {
  await this.userRepository.save(user);
} catch (error) {
  if (error.code === '23505') { // PostgreSQL unique violation
    throw new ConflictException('User with this email already exists');
  }
  if (error.code === '23503') { // Foreign key violation
    throw new BadRequestException('Referenced resource does not exist');
  }
  throw new InternalServerErrorException('Database operation failed');
}
```

### 12.5 Timeout Handling

```typescript
import { timeout, catchError } from 'rxjs/operators';
import { TimeoutError } from 'rxjs';

@Injectable()
export class TimeoutInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      timeout(30000), // 30 second timeout
      catchError(err => {
        if (err instanceof TimeoutError) {
          throw new RequestTimeoutException('Request took too long to process');
        }
        throw err;
      }),
    );
  }
}
```

---

## 13. Testing Strategy

### 13.1 Testing Pyramid

```
        /\
       /  \
      / E2E \          10% - Critical user journeys
     /______\
    /        \
   / Integration \     30% - API endpoints, database, events
  /______________\
 /                \
/   Unit Tests     \   60% - Business logic, utilities
/____________________\
```

### 13.2 Unit Testing Approach

**Backend Unit Tests (Jest + NestJS Testing):**

```typescript
// Example: AuthService unit test
describe('AuthService', () => {
  let service: AuthService;
  let usersService: jest.Mocked<UsersService>;
  let jwtService: jest.Mocked<JwtService>;
  let redis: jest.Mocked<Redis>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: {
            findByUsername: jest.fn(),
            resetFailedAttempts: jest.fn(),
            createRefreshToken: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn(),
            verify: jest.fn(),
          },
        },
        {
          provide: 'REDIS',
          useValue: {
            get: jest.fn(),
            setex: jest.fn(),
            del: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    usersService = module.get(UsersService);
    jwtService = module.get(JwtService);
    redis = module.get('REDIS');
  });

  describe('login', () => {
    it('should return tokens for valid credentials without MFA', async () => {
      const mockUser = {
        id: 'user-1',
        username: 'agent001',
        passwordHash: await bcrypt.hash('password123', 12),
        mfaEnabled: false,
        roles: [{ name: 'agent', permissions: [] }],
      };

      usersService.findByUsername.mockResolvedValue(mockUser);
      jwtService.sign.mockReturnValueOnce('access-token').mockReturnValueOnce('refresh-token');

      const result = await service.login(
        { username: 'agent001', password: 'password123' },
        '192.168.1.1',
        'Mozilla/5.0'
    
      );

      expect(result).toHaveProperty('accessToken', 'access-token');
      expect(result).toHaveProperty('refreshToken', 'refresh-token');
      expect(result).toHaveProperty('expiresIn', 900);
      expect(usersService.resetFailedAttempts).toHaveBeenCalledWith('user-1');
    });

    it('should require MFA for users with MFA enabled', async () => {
      const mockUser = {
        id: 'user-1',
        username: 'agent001',
        passwordHash: await bcrypt.hash('password123', 12),
        mfaEnabled: true,
        mfaSecret: 'secret',
        roles: [],
      };

      usersService.findByUsername.mockResolvedValue(mockUser);
      jwtService.sign.mockReturnValue('partial-token');

      const result = await service.login(
        { username: 'agent001', password: 'password123' },
        '192.168.1.1',
        'Mozilla/5.0'
      );

      expect(result).toHaveProperty('requiresMfa', true);
      expect(result).toHaveProperty('partialToken', 'partial-token');
    });

    it('should throw UnauthorizedException for invalid password', async () => {
      const mockUser = {
        id: 'user-1',
        username: 'agent001',
        passwordHash: await bcrypt.hash('correctpassword', 12),
        mfaEnabled: false,
      };

      usersService.findByUsername.mockResolvedValue(mockUser);

      await expect(
        service.login(
          { username: 'agent001', password: 'wrongpassword' },
          '192.168.1.1',
          'Mozilla/5.0'
        )
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});
```

**Frontend Unit Tests (Vitest + Testing Library):**

```typescript
// Example: AgentStatusWidget component test
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AgentStatusWidget } from './AgentStatusWidget';
import { AgentStatusProvider } from '@/contexts/AgentStatusContext';

describe('AgentStatusWidget', () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  const wrapper = ({ children }) => (
    <QueryClientProvider client={queryClient}>
      <AgentStatusProvider>
        {children}
      </AgentStatusProvider>
    </QueryClientProvider>
  );

  it('should display current channel statuses', () => {
    render(<AgentStatusWidget />, { wrapper });

    expect(screen.getByText('Voice')).toBeInTheDocument();
    expect(screen.getByText('Email')).toBeInTheDocument();
    expect(screen.getByText('Chat')).toBeInTheDocument();
  });

  it('should update status when dropdown option selected', async () => {
    const { container } = render(<AgentStatusWidget />, { wrapper });

    const voiceDropdown = screen.getByLabelText('Voice channel status');
    fireEvent.click(voiceDropdown);

    const notReadyOption = screen.getByText('Not Ready');
    fireEvent.click(notReadyOption);

    await waitFor(() => {
      expect(screen.getByText('Lunch')).toBeInTheDocument();
    });
  });
});
```

### 13.3 Integration Testing Approach

**API Integration Tests (Supertest + Test Containers):**

```typescript
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PostgreSqlContainer } from '@testcontainers/postgresql';
import { RedisContainer } from '@testcontainers/redis';

describe('InteractionsController (e2e)', () => {
  let app: INestApplication;
  let postgresContainer: PostgreSqlContainer;
  let redisContainer: RedisContainer;
  let accessToken: string;

  beforeAll(async () => {
    // Start test containers
    postgresContainer = await new PostgreSqlContainer().start();
    redisContainer = await new RedisContainer().start();

    // Create test module with test database
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider('DATABASE_CONFIG')
      .useValue({
        host: postgresContainer.getHost(),
        port: postgresContainer.getPort(),
        username: postgresContainer.getUsername(),
        password: postgresContainer.getPassword(),
        database: postgresContainer.getDatabase(),
      })
      .compile();

    app = moduleRef.createNestApplication();
    await app.init();

    // Login to get access token
    const loginResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ username: 'testuser', password: 'testpass123' });

    accessToken = loginResponse.body.accessToken;
  });

  afterAll(async () => {
    await app.close();
    await postgresContainer.stop();
    await redisContainer.stop();
  });

  describe('GET /api/v1/interactions', () => {
    it('should return paginated interactions', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/interactions')
        .set('Authorization', `Bearer ${accessToken}`)
        .query({ page: 1, pageSize: 20 })
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('meta');
      expect(response.body.meta).toHaveProperty('total');
      expect(response.body.meta).toHaveProperty('page', 1);
      expect(response.body.meta).toHaveProperty('pageSize', 20);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should filter by channel', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/interactions')
        .set('Authorization', `Bearer ${accessToken}`)
        .query({ channel: 'voice' })
        .expect(200);

      response.body.data.forEach(interaction => {
        expect(interaction.channel).toBe('voice');
      });
    });

    it('should return 401 without valid token', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/interactions')
        .expect(401);
    });
  });

  describe('PUT /api/v1/interactions/:id/status', () => {
    it('should update interaction status', async () => {
      // Create test interaction
      const createResponse = await request(app.getHttpServer())
        .post('/api/v1/interactions')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          type: 'call',
          channel: 'voice',
          customerId: 'cust-123',
          customerName: 'Test Customer',
        });

      const interactionId = createResponse.body.id;

      // Update status
      const updateResponse = await request(app.getHttpServer())
        .put(`/api/v1/interactions/${interactionId}/status`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ status: 'in-progress' })
        .expect(200);

      expect(updateResponse.body.status).toBe('in-progress');
    });

    it('should reject invalid status transition', async () => {
      const response = await request(app.getHttpServer())
        .put('/api/v1/interactions/some-id/status')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ status: 'invalid-status' })
        .expect(400);

      expect(response.body.message).toContain('Invalid status transition');
    });
  });
});
```

### 13.4 Property-Based Testing

**Property Test Configuration:**
- Library: fast-check (for TypeScript/JavaScript)
- Minimum iterations: 100 per property
- Seed: Random (logged for reproducibility)
- Shrinking: Enabled (find minimal failing case)

**Example Property Test:**
```typescript
import * as fc from 'fast-check';

describe('Property: Token Generation Round-Trip', () => {
  it('should generate and validate tokens correctly for any valid user', async () => {
    // Feature: phase-1-core-mvp, Property 1: Token Generation and Validation Round-Trip
    
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          id: fc.uuid(),
          username: fc.string({ minLength: 3, maxLength: 20 }),
          agentId: fc.string({ minLength: 5, maxLength: 10 }),
          tenantId: fc.uuid(),
          roles: fc.array(fc.constantFrom('agent', 'supervisor', 'admin'), { minLength: 1 }),
        }),
        async (user) => {
          // Generate tokens
          const tokens = await authService.generateTokens(user, '192.168.1.1', 'test-agent');

          // Decode access token
          const decoded = jwtService.verify(tokens.accessToken);

          // Verify payload
          expect(decoded.sub).toBe(user.id);
          expect(decoded.agentId).toBe(user.agentId);
          expect(decoded.tenantId).toBe(user.tenantId);
          expect(decoded.roles).toEqual(user.roles);

          // Verify expiration (15 minutes ± 5 seconds)
          const expiresIn = decoded.exp - decoded.iat;
          expect(expiresIn).toBeGreaterThanOrEqual(895);
          expect(expiresIn).toBeLessThanOrEqual(905);
        }
      ),
      { numRuns: 100 }
    );
  });
});
```

### 13.5 End-to-End Testing

**Critical User Journeys (Playwright):**

```typescript
import { test, expect } from '@playwright/test';

test.describe('Agent Login Flow', () => {
  test('should login successfully with valid credentials', async ({ page }) => {
    await page.goto('http://localhost:3000/login');

    // Enter credentials
    await page.fill('input[name="username"]', 'agent001');
    await page.fill('input[name="password"]', 'SecurePass123!');

    // Click login button
    await page.click('button[type="submit"]');

    // Wait for redirect to dashboard
    await page.waitForURL('http://localhost:3000/dashboard');

    // Verify agent header displays name
    await expect(page.locator('[data-testid="agent-name"]')).toContainText('Agent 001');

    // Verify interaction list is visible
    await expect(page.locator('[data-testid="interaction-list"]')).toBeVisible();
  });

  test('should require MFA for users with MFA enabled', async ({ page }) => {
    await page.goto('http://localhost:3000/login');

    await page.fill('input[name="username"]', 'agent-mfa');
    await page.fill('input[name="password"]', 'SecurePass123!');
    await page.click('button[type="submit"]');

    // Should show MFA input
    await expect(page.locator('input[name="mfaCode"]')).toBeVisible();

    // Enter valid TOTP code
    await page.fill('input[name="mfaCode"]', '123456');
    await page.click('button[type="submit"]');

    // Should redirect to dashboard
    await page.waitForURL('http://localhost:3000/dashboard');
  });
});

test.describe('Interaction Management Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('http://localhost:3000/login');
    await page.fill('input[name="username"]', 'agent001');
    await page.fill('input[name="password"]', 'SecurePass123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('http://localhost:3000/dashboard');
  });

  test('should filter interactions by channel', async ({ page }) => {
    // Click voice filter
    await page.click('[data-testid="filter-voice"]');

    // Wait for list to update
    await page.waitForTimeout(500);

    // Verify all visible interactions are voice
    const interactions = await page.locator('[data-testid="interaction-item"]').all();
    for (const interaction of interactions) {
      await expect(interaction.locator('[data-testid="channel-badge"]')).toContainText('Voice');
    }
  });

  test('should create ticket from interaction', async ({ page }) => {
    // Click first interaction
    await page.click('[data-testid="interaction-item"]:first-child');

    // Wait for detail panel
    await expect(page.locator('[data-testid="interaction-detail"]')).toBeVisible();

    // Click create ticket button
    await page.click('[data-testid="create-ticket-btn"]');

    // Fill ticket form
    await page.fill('input[name="title"]', 'Test Ticket');
    await page.fill('textarea[name="description"]', 'This is a test ticket description');
    await page.selectOption('select[name="priority"]', 'high');
    await page.selectOption('select[name="category"]', 'technical-request');

    // Submit form
    await page.click('button[type="submit"]');

    // Verify success notification
    await expect(page.locator('[data-testid="toast-success"]')).toContainText('Ticket created');

    // Verify ticket appears in customer panel
    await expect(page.locator('[data-testid="ticket-list"]')).toContainText('Test Ticket');
  });
});
```

### 13.6 Test Coverage Requirements

**Minimum Coverage Targets:**
- Backend services: 70% line coverage
- Frontend components: 70% line coverage
- Critical paths: 90% coverage
- Property tests: All correctness properties implemented

**Coverage Enforcement:**
```json
// jest.config.js
{
  "coverageThreshold": {
    "global": {
      "branches": 70,
      "functions": 70,
      "lines": 70,
      "statements": 70
    },
    "./src/auth/": {
      "branches": 90,
      "functions": 90,
      "lines": 90,
      "statements": 90
    }
  }
}
```

---

## 14. Deployment Architecture

### 14.1 Docker Compose Configuration

**docker-compose.yml Structure:**
```yaml
version: '3.8'

services:
  # Databases
  postgres:
    image: postgres:18.3
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    volumes:
      - postgres-data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:8
    command: redis-server --appendonly yes
    volumes:
      - redis-data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 3s
      retries: 5

  kafka:
    image: apache/kafka:4.2.0
    environment:
      KAFKA_NODE_ID: 1
      KAFKA_PROCESS_ROLES: broker,controller
      KAFKA_LISTENERS: PLAINTEXT://0.0.0.0:9092,CONTROLLER://0.0.0.0:9093
      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://kafka:9092
      KAFKA_CONTROLLER_QUORUM_VOTERS: 1@kafka:9093
    volumes:
      - kafka-data:/var/lib/kafka/data
    healthcheck:
      test: ["CMD-SHELL", "kafka-broker-api-versions.sh --bootstrap-server localhost:9092"]
      interval: 30s
      timeout: 10s
      retries: 5

  # Microservices
  identity-service:
    build:
      context: .
      dockerfile: apps/identity-service/Dockerfile
    ports:
      - "3001:3001"
    environment:
      DATABASE_URL: postgresql://postgres:postgres@postgres:5432/identity_db
      REDIS_URL: redis://redis:6379
      JWT_PRIVATE_KEY_PATH: /secrets/jwt-private.pem
      JWT_PUBLIC_KEY_PATH: /secrets/jwt-public.pem
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3001/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  agent-service:
    build:
      context: .
      dockerfile: apps/agent-service/Dockerfile
    ports:
      - "3002:3002"
    environment:
      DATABASE_URL: postgresql://postgres:postgres@postgres:5432/agent_db
      REDIS_URL: redis://redis:6379
      KAFKA_BROKER: kafka:9092
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
      kafka:
        condition: service_healthy

  # Additional services...

volumes:
  postgres-data:
  redis-data:
  kafka-data:
```

### 14.2 Health Check Implementation

```typescript
// health.controller.ts
import { Controller, Get } from '@nestjs/common';
import { HealthCheck, HealthCheckService, TypeOrmHealthIndicator, MicroserviceHealthIndicator } from '@nestjs/terminus';

@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private db: TypeOrmHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  check() {
    return this.health.check([
      () => this.db.pingCheck('database'),
      () => this.checkRedis(),
      () => this.checkKafka(),
    ]);
  }

  private async checkRedis() {
    try {
      await this.redis.ping();
      return { redis: { status: 'up' } };
    } catch (error) {
      return { redis: { status: 'down' } };
    }
  }

  private async checkKafka() {
    // Kafka health check logic
    return { kafka: { status: 'up' } };
  }
}
```

---

## 15. Summary

This design document provides comprehensive technical specifications for implementing Phase 1: Core MVP of the TPB CRM Platform. The design covers:

1. **High-level architecture** with 6 microservices, API gateway, service mesh, and data layer
2. **Detailed component design** for each service including entities, DTOs, services, and controllers
3. **Database design** with schemas, indexes, constraints, and connection pooling
4. **API design** with RESTful patterns, pagination, filtering, and error responses
5. **Authentication & authorization** with JWT, MFA, RBAC, and token rotation
6. **Real-time communication** with WebSocket, STOMP protocol, and reconnection strategies
7. **Event-driven architecture** with Kafka topics, event schemas, and idempotent consumers
8. **Caching strategy** with Redis, cache-aside pattern, and TTL configurations
9. **Frontend integration** with React Query, API client, WebSocket hooks, and context providers
10. **Security design** with encryption, password hashing, input validation, rate limiting, and audit logging
11. **Correctness properties** with 25 testable properties derived from requirements
12. **Error handling** with global exception filters and standardized error responses
13. **Testing strategy** with unit, integration, property-based, and E2E tests
14. **Deployment architecture** with Docker Compose and health checks

**Next Steps:**
1. Review and approve design document
2. Begin implementation following task breakdown in ImplementationPlan.md
3. Implement correctness properties as property-based tests
4. Maintain 70%+ test coverage throughout development
5. Conduct security reviews and performance testing

---

**Document Version**: 1.0  
**Created**: 2026-03-08  
**Status**: Complete - Ready for Review  
**Author**: AI Design Agent  
**Reviewed By**: [Pending]

