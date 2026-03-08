# Design Document: Foundation Setup

## Overview

This document specifies the technical design for Phase 0 (Foundation Setup) of the TPB CRM Platform. The goal is to establish a complete development environment where all developers can run `docker compose up` and work locally with a fully functional Nx monorepo containing the existing React 18 frontend and scaffolded backend microservices.

This phase focuses exclusively on infrastructure, tooling, and project structure setup. No business logic implementation is included.

### Objectives

- Initialize Git repository with proper version control structure
- Set up Nx monorepo with TypeScript strict mode and code quality tools
- Configure Docker Compose infrastructure with 11 services (PostgreSQL, Redis, Kafka, Elasticsearch, MinIO, Temporal, Superset, etc.)
- Scaffold all 19 NestJS microservices with consistent structure
- Configure testing frameworks (Vitest, Jest, Playwright)
- Set up CI/CD pipelines (GitHub Actions)
- Create API client libraries with JWT authentication and WebSocket support

### Success Criteria

- New developers can set up the environment in under 30 minutes
- All infrastructure services start successfully with `docker compose up -d`
- All 19 service stubs have working health endpoints
- Frontend builds successfully with TypeScript strict mode
- CI/CD pipelines run automatically on pull requests

## Architecture

### Repository Structure


The monorepo follows this structure (from ImplementationPlan.md):

```
/
├── apps/
│   ├── agent-desktop/          # React 18 SPA (EXISTING — preserved from /src)
│   ├── admin-module/           # React 18 SPA (NEW — skeleton only)
│   └── api-gateway/            # Kong config (placeholder)
├── services/
│   ├── identity-service/       # MS-1: Auth, RBAC, MFA
│   ├── agent-service/          # MS-2: Agent profiles, status
│   ├── interaction-service/    # MS-3: Queue, SLA tracking
│   ├── ticket-service/         # MS-4: Case management
│   ├── customer-service/       # MS-5: Customer profiles
│   ├── notification-service/   # MS-6: In-app notifications
│   ├── knowledge-service/      # MS-7: KB articles
│   ├── bfsi-core-service/      # MS-8: Core banking queries
│   ├── ai-service/             # MS-9: AI suggestions
│   ├── media-service/          # MS-10: File storage
│   ├── audit-service/          # MS-11: Audit logs
│   ├── object-schema-service/  # MS-13: Dynamic schemas
│   ├── layout-service/         # MS-14: Layout configs
│   ├── workflow-service/       # MS-15: Workflow automation
│   ├── data-enrichment-service/# MS-16: Data enrichment
│   ├── dashboard-service/      # MS-17: Dashboard data
│   ├── report-service/         # MS-18: BI reporting
│   └── cti-adapter-service/    # MS-19: CTI integration
├── packages/
│   ├── shared-types/           # Shared TypeScript interfaces
│   ├── shared-dto/             # Zod schema definitions
│   ├── shared-utils/           # Utility functions
│   ├── api-client/             # Axios instance with JWT
│   └── ws-client/              # WebSocket client (STOMP)
├── libs/
│   └── nest-common/            # Shared NestJS modules
├── infra/
│   ├── docker-compose.yml      # All infrastructure services
│   ├── docker-compose.dev.yml  # Development overrides
│   ├── scripts/
│   │   ├── init-db.sh          # Database initialization
│   │   └── seed-dev.sh         # Test data seeding
│   └── k8s/                    # Future Kubernetes manifests (placeholder)
├── .github/
│   └── workflows/
│       ├── ci.yml              # Lint, typecheck, test on PR
│       ├── build.yml           # Build all on push to main
│       └── e2e.yml             # Playwright E2E tests
├── .gitignore
├── .eslintrc.json
├── .prettierrc
├── tsconfig.base.json
├── nx.json
├── package.json
└── .env.example
```

### Technology Stack


From CLAUDE.md, the following technology stack is used (DO NOT CHANGE):

**Backend:**
- Framework: NestJS 11.x (TypeScript)
- ORM: TypeORM 0.3.20
- Validation: class-validator + class-transformer
- Auth: @nestjs/jwt + passport
- WebSocket: @nestjs/websockets + Socket.IO
- Events: @nestjs/microservices (Kafka)
- Testing: Jest + Supertest

**Frontend:**
- Framework: React 19.2.x (latest stable 2026)
- Build: Vite 6.x (stable - Vite 8 still in beta)
- Routing: React Router 6.x
- State (server): TanStack Query v5.x
- State (UI): React Context API
- Styling: Tailwind CSS 3.x (existing)
- Components: shadcn/ui (Radix UI)
- Testing: Vitest + Testing Library
- E2E: Playwright

**Infrastructure:**
- Database: PostgreSQL 18.3 (latest Feb 2026)
- Cache: Redis 8.6 (latest Feb 2026)
- Search: Elasticsearch 9.3.0 (latest Jan 2026)
- Files: SeaweedFS 3.x (MinIO alternative - open source S3-compatible)
- Events: Apache Kafka 4.2.0 (latest Feb 2026, KRaft mode - ZooKeeper removed)
- Workflow: Temporal (latest 2026)
- BI: Apache Superset 6.0 (latest Dec 2025)
- Monorepo: Nx 22.x (latest 2026)
- Container: Docker + Docker Compose
- Runtime: Node.js 24.13.x LTS (latest Feb 2026, support until April 2028)

**Deployment:**
- Local Development: Docker Compose
- Production (future): Kubernetes 1.29+

**Compatibility Notes:**
- NestJS 11 requires Node.js 20+ (Node.js 24 fully compatible)
- Kafka 4.x uses KRaft mode (ZooKeeper completely removed)
- Vite 6.x chosen over Vite 8 (still in beta as of Feb 2026)
- SeaweedFS replaces MinIO (archived Dec 2025)

## Components and Interfaces

### Component 1: Nx Monorepo Configuration

**Purpose:** Provide monorepo management with code sharing and affected-build optimization.

**Key Files:**
- `nx.json` - Nx workspace configuration
- `package.json` - Root package with workspace dependencies
- `tsconfig.base.json` - Base TypeScript configuration with path mappings

**Configuration Details:**


**nx.json:**
```json
{
  "extends": "nx/presets/npm.json",
  "affected": {
    "defaultBase": "main"
  },
  "targetDefaults": {
    "build": {
      "dependsOn": ["^build"],
      "cache": true
    },
    "lint": {
      "cache": true
    },
    "test": {
      "cache": true
    }
  },
  "namedInputs": {
    "default": ["{projectRoot}/**/*", "sharedGlobals"],
    "production": [
      "default",
      "!{projectRoot}/**/?(*.)+(spec|test).[jt]s?(x)?(.snap)",
      "!{projectRoot}/tsconfig.spec.json",
      "!{projectRoot}/.eslintrc.json"
    ],
    "sharedGlobals": []
  }
}
```

**tsconfig.base.json:**
```json
{
  "compileOnSave": false,
  "compilerOptions": {
    "rootDir": ".",
    "sourceMap": true,
    "declaration": false,
    "moduleResolution": "node",
    "emitDecoratorMetadata": true,
    "experimentalDecorators": true,
    "importHelpers": true,
    "target": "ES2022",
    "module": "ESNext",
    "lib": ["ES2022", "DOM"],
    "skipLibCheck": true,
    "skipDefaultLibCheck": true,
    "strict": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["apps/agent-desktop/src/*"],
      "@admin/*": ["apps/admin-module/src/*"],
      "@shared/types": ["packages/shared-types/src/index.ts"],
      "@shared/dto": ["packages/shared-dto/src/index.ts"],
      "@shared/utils": ["packages/shared-utils/src/index.ts"],
      "@api-client": ["packages/api-client/src/index.ts"],
      "@ws-client": ["packages/ws-client/src/index.ts"],
      "@nest-common": ["libs/nest-common/src/index.ts"]
    }
  },
  "exclude": ["node_modules", "tmp"]
}
```

**Path Alias Strategy:**
- `@/*` maps to agent-desktop source (preserves existing imports)
- `@admin/*` maps to admin-module source
- `@shared/*` maps to shared packages
- `@api-client` and `@ws-client` for client libraries
- `@nest-common` for shared NestJS modules

### Component 2: TypeScript Configuration

**Purpose:** Enforce strict type checking across the entire codebase.

**Strict Mode Settings:**
- `strict: true` - Enables all strict type-checking options
- `noImplicitAny: true` - Error on expressions with implied 'any' type
- `strictNullChecks: true` - Strict null checking
- `strictFunctionTypes: true` - Strict function type checking
- `strictBindCallApply: true` - Strict bind/call/apply methods
- `strictPropertyInitialization: true` - Strict class property initialization
- `noImplicitThis: true` - Error on 'this' with implied 'any' type
- `alwaysStrict: true` - Parse in strict mode and emit "use strict"

**Decorator Support:**
- `experimentalDecorators: true` - Required for NestJS decorators
- `emitDecoratorMetadata: true` - Required for dependency injection

**Per-App Configuration:**

Each app/service has its own `tsconfig.json` that extends the base:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "../../dist/out-tsc",
    "types": ["node"]
  },
  "files": [],
  "include": ["src/**/*.ts"],
  "exclude": ["node_modules", "**/*.spec.ts", "**/*.test.ts"]
}
```

### Component 3: Code Quality Tools

**Purpose:** Enforce consistent code style and catch common errors.

**ESLint Configuration (.eslintrc.json):**
```json
{
  "root": true,
  "ignorePatterns": ["**/*"],
  "plugins": ["@nx"],
  "overrides": [
    {
      "files": ["*.ts", "*.tsx", "*.js", "*.jsx"],
      "rules": {
        "@nx/enforce-module-boundaries": [
          "error",
          {
            "enforceBuildableLibDependency": true,
            "allow": [],
            "depConstraints": [
              {
                "sourceTag": "*",
                "onlyDependOnLibsWithTags": ["*"]
              }
            ]
          }
        ]
      }
    },
    {
      "files": ["*.ts", "*.tsx"],
      "extends": ["plugin:@nx/typescript"],
      "parser": "@typescript-eslint/parser",
      "parserOptions": {
        "project": "./tsconfig.base.json"
      },
      "rules": {}
    },
    {
      "files": ["*.js", "*.jsx"],
      "extends": ["plugin:@nx/javascript"],
      "rules": {}
    }
  ]
}
```

**Prettier Configuration (.prettierrc):**
```json
{
  "singleQuote": true,
  "trailingComma": "es5",
  "printWidth": 100,
  "tabWidth": 2,
  "semi": true,
  "arrowParens": "always"
}
```

### Component 4: Docker Compose Infrastructure

**Purpose:** Provide all required infrastructure services for local development.

**Services Defined:**


| Service | Image | Ports | Purpose |
|---------|-------|-------|---------|
| PostgreSQL | postgres:18 | 5432 | Primary database (19 databases, one per service) |
| Redis | redis:8.6 | 6379 | Cache, session store, pub/sub |
| Kafka | apache/kafka:4.2.0 | 9092 | Event streaming (KRaft mode) |
| Kafka UI | provectuslabs/kafka-ui:latest | 9000 | Kafka management UI (dev only) |
| Elasticsearch | elasticsearch:9.3.0 | 9200 | Full-text search |
| Kibana | kibana:9.3.0 | 5601 | Elasticsearch UI (dev only) |
| SeaweedFS | chrislusf/seaweedfs:latest | 8333 (S3), 9333 (master) | S3-compatible object storage (MinIO alternative) |
| Temporal | temporalio/auto-setup:latest | 7233 | Workflow engine |
| Temporal UI | temporalio/ui:latest | 8233 | Temporal Web UI (dev only) |
| Superset | apache/superset:6.0.0 | 8088 | BI reporting backend |
| MailHog | mailhog/mailhog:latest | 1025 (SMTP), 8025 (UI) | SMTP trap for dev (dev only) |

**docker-compose.yml Structure:**

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:18
    container_name: tpb-postgres
    environment:
      POSTGRES_USER: ${POSTGRES_USER:-postgres}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-postgres}
      POSTGRES_DB: postgres
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./infra/scripts/init-db.sh:/docker-entrypoint-initdb.d/init-db.sh
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:8.6
    container_name: tpb-redis
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  kafka:
    image: apache/kafka:4.2.0
    container_name: tpb-kafka
    ports:
      - "9092:9092"
    environment:
      KAFKA_NODE_ID: 1
      KAFKA_PROCESS_ROLES: broker,controller
      KAFKA_LISTENERS: PLAINTEXT://0.0.0.0:9092,CONTROLLER://0.0.0.0:9093
      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://localhost:9092
      KAFKA_CONTROLLER_LISTENER_NAMES: CONTROLLER
      KAFKA_LISTENER_SECURITY_PROTOCOL_MAP: CONTROLLER:PLAINTEXT,PLAINTEXT:PLAINTEXT
      KAFKA_CONTROLLER_QUORUM_VOTERS: 1@localhost:9093
      KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: 1
      KAFKA_TRANSACTION_STATE_LOG_REPLICATION_FACTOR: 1
      KAFKA_TRANSACTION_STATE_LOG_MIN_ISR: 1
      KAFKA_LOG_DIRS: /tmp/kraft-combined-logs
      CLUSTER_ID: MkU3OEVBNTcwNTJENDM2Qk
    volumes:
      - kafka_data:/tmp/kraft-combined-logs
    healthcheck:
      test: ["CMD-SHELL", "kafka-broker-api-versions.sh --bootstrap-server localhost:9092"]
      interval: 30s
      timeout: 10s
      retries: 5

  # Additional services follow similar pattern...

volumes:
  postgres_data:
  redis_data:
  kafka_data:
  elasticsearch_data:
  seaweedfs_data:
  temporal_data:
  superset_data:

networks:
  default:
    name: tpb-network
```

**docker-compose.dev.yml (Development Overrides):**

```yaml
version: '3.8'

services:
  postgres:
    volumes:
      - ./infra/scripts/seed-dev.sh:/docker-entrypoint-initdb.d/seed-dev.sh

  # Add development-specific configurations
  # - Volume mounts for hot reload
  # - Debug ports
  # - Development-only services (Kafka UI, Kibana, MailHog, Temporal UI)
```

**Database Initialization Script (infra/scripts/init-db.sh):**

```bash
#!/bin/bash
set -e

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    -- Create databases for all 19 microservices
    CREATE DATABASE identity_db;
    CREATE DATABASE agent_db;
    CREATE DATABASE interaction_db;
    CREATE DATABASE ticket_db;
    CREATE DATABASE customer_db;
    CREATE DATABASE notification_db;
    CREATE DATABASE knowledge_db;
    CREATE DATABASE bfsi_core_db;
    CREATE DATABASE ai_db;
    CREATE DATABASE media_db;
    CREATE DATABASE audit_db;
    CREATE DATABASE object_schema_db;
    CREATE DATABASE layout_db;
    CREATE DATABASE workflow_db;
    CREATE DATABASE data_enrichment_db;
    CREATE DATABASE dashboard_db;
    CREATE DATABASE report_db;
    CREATE DATABASE cti_adapter_db;
    CREATE DATABASE api_gateway_db;

    -- Grant privileges
    GRANT ALL PRIVILEGES ON DATABASE identity_db TO postgres;
    GRANT ALL PRIVILEGES ON DATABASE agent_db TO postgres;
    GRANT ALL PRIVILEGES ON DATABASE interaction_db TO postgres;
    GRANT ALL PRIVILEGES ON DATABASE ticket_db TO postgres;
    GRANT ALL PRIVILEGES ON DATABASE customer_db TO postgres;
    GRANT ALL PRIVILEGES ON DATABASE notification_db TO postgres;
    GRANT ALL PRIVILEGES ON DATABASE knowledge_db TO postgres;
    GRANT ALL PRIVILEGES ON DATABASE bfsi_core_db TO postgres;
    GRANT ALL PRIVILEGES ON DATABASE ai_db TO postgres;
    GRANT ALL PRIVILEGES ON DATABASE media_db TO postgres;
    GRANT ALL PRIVILEGES ON DATABASE audit_db TO postgres;
    GRANT ALL PRIVILEGES ON DATABASE object_schema_db TO postgres;
    GRANT ALL PRIVILEGES ON DATABASE layout_db TO postgres;
    GRANT ALL PRIVILEGES ON DATABASE workflow_db TO postgres;
    GRANT ALL PRIVILEGES ON DATABASE data_enrichment_db TO postgres;
    GRANT ALL PRIVILEGES ON DATABASE dashboard_db TO postgres;
    GRANT ALL PRIVILEGES ON DATABASE report_db TO postgres;
    GRANT ALL PRIVILEGES ON DATABASE cti_adapter_db TO postgres;
    GRANT ALL PRIVILEGES ON DATABASE api_gateway_db TO postgres;
EOSQL

echo "All databases created successfully"
```

### Component 5: NestJS Service Template

**Purpose:** Provide consistent structure for all 19 microservices.

**Standard Service Structure:**


```
services/[service-name]/
├── src/
│   ├── main.ts                 # Bootstrap application
│   ├── app.module.ts           # Root module
│   ├── app.controller.ts       # Root controller (optional)
│   ├── app.service.ts          # Root service (optional)
│   ├── health/
│   │   ├── health.controller.ts
│   │   └── health.module.ts
│   └── [domain]/               # Domain-specific modules
│       ├── [domain].module.ts
│       ├── [domain].controller.ts
│       ├── [domain].service.ts
│       ├── [domain].repository.ts
│       ├── entities/
│       │   └── [entity].entity.ts
│       ├── dto/
│       │   ├── create-[entity].dto.ts
│       │   └── update-[entity].dto.ts
│       └── events/
│           └── [entity]-created.event.ts
├── test/
│   ├── app.e2e-spec.ts
│   └── jest-e2e.json
├── Dockerfile
├── .env.example
├── tsconfig.json
├── tsconfig.spec.json
├── project.json                # Nx project configuration
└── README.md
```

**main.ts Template:**

```typescript
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    })
  );

  // CORS configuration
  app.enableCors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
  });

  // Port configuration
  const port = process.env.PORT || 3001;
  await app.listen(port);
  
  console.log(`[${process.env.SERVICE_NAME}] Application is running on: http://localhost:${port}`);
}

bootstrap();
```

**app.module.ts Template:**

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.POSTGRES_HOST || 'localhost',
      port: parseInt(process.env.POSTGRES_PORT || '5432'),
      username: process.env.POSTGRES_USER || 'postgres',
      password: process.env.POSTGRES_PASSWORD || 'postgres',
      database: process.env.DATABASE_NAME,
      entities: [__dirname + '/**/*.entity{.ts,.js}'],
      synchronize: process.env.NODE_ENV === 'development',
      logging: process.env.NODE_ENV === 'development',
    }),
    HealthModule,
  ],
})
export class AppModule {}
```

**health.controller.ts Template:**

```typescript
import { Controller, Get } from '@nestjs/common';
import { HealthCheck, HealthCheckService, TypeOrmHealthIndicator } from '@nestjs/terminus';

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
    ]);
  }
}
```

**Dockerfile Template:**

```dockerfile
FROM node:24-alpine AS builder

WORKDIR /app

COPY package*.json ./
COPY nx.json ./
COPY tsconfig.base.json ./

RUN npm ci

COPY . .

RUN npx nx build [service-name] --prod

FROM node:24-alpine

WORKDIR /app

COPY --from=builder /app/dist/services/[service-name] ./
COPY --from=builder /app/node_modules ./node_modules

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

CMD ["node", "main.js"]
```

**.env.example Template:**

```env
# Service Configuration
SERVICE_NAME=[service-name]
NODE_ENV=development
PORT=3001

# Database
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
DATABASE_NAME=[service]_db

# JWT (for services that need auth)
JWT_SECRET=your-secret-key-here
JWT_EXPIRES_IN=900

# Redis
REDIS_URL=redis://localhost:6379

# Kafka
KAFKA_BROKERS=localhost:9092

# Service-specific variables
# Add as needed per service
```

### Component 6: Shared NestJS Library

**Purpose:** Provide reusable NestJS modules, guards, interceptors, and filters.

**libs/nest-common Structure:**

```
libs/nest-common/
├── src/
│   ├── index.ts
│   ├── guards/
│   │   ├── jwt-auth.guard.ts
│   │   └── roles.guard.ts
│   ├── decorators/
│   │   ├── roles.decorator.ts
│   │   └── current-user.decorator.ts
│   ├── interceptors/
│   │   ├── audit.interceptor.ts
│   │   └── transform.interceptor.ts
│   ├── filters/
│   │   └── http-exception.filter.ts
│   └── interfaces/
│       └── jwt-payload.interface.ts
├── tsconfig.json
├── tsconfig.lib.json
└── project.json
```

**JWT Auth Guard (jwt-auth.guard.ts):**

```typescript
import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    return super.canActivate(context);
  }

  handleRequest(err: any, user: any, info: any) {
    if (err || !user) {
      throw err || new UnauthorizedException('Invalid token');
    }
    return user;
  }
}
```

**Roles Guard (roles.guard.ts):**

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
    return requiredRoles.some((role) => user.roles?.includes(role));
  }
}
```

**Audit Interceptor (audit.interceptor.ts):**

```typescript
import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, user } = request;
    
    // Log request (in Phase 1, this will emit Kafka events)
    console.log(`[AUDIT] ${method} ${url} by user ${user?.id || 'anonymous'}`);
    
    return next.handle().pipe(
      tap(() => {
        // Log response
        console.log(`[AUDIT] ${method} ${url} completed`);
      })
    );
  }
}
```

### Component 7: Testing Infrastructure

**Purpose:** Enable comprehensive testing across frontend and backend.

**Testing Frameworks:**


| Framework | Purpose | Target | Configuration File |
|-----------|---------|--------|-------------------|
| Vitest | Unit tests | Frontend (agent-desktop, admin-module) | vite.config.ts |
| Jest | Unit tests | Backend (all services) | jest.config.ts |
| @testing-library/react | Component tests | React components | - |
| Supertest | API integration tests | NestJS controllers | - |
| Playwright | E2E tests | Full user journeys | playwright.config.ts |

**Vitest Configuration (apps/agent-desktop/vite.config.ts):**

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/mockData',
        'dist/',
      ],
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 70,
        statements: 70,
      },
    },
  },
});
```

**Jest Configuration (services/identity-service/jest.config.ts):**

```typescript
export default {
  displayName: 'identity-service',
  preset: '../../jest.preset.js',
  testEnvironment: 'node',
  transform: {
    '^.+\\.[tj]s$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.spec.json' }],
  },
  moduleFileExtensions: ['ts', 'js', 'html'],
  coverageDirectory: '../../coverage/services/identity-service',
  coverageThresholds: {
    global: {
      lines: 70,
      functions: 70,
      branches: 70,
      statements: 70,
    },
  },
};
```

**Playwright Configuration (playwright.config.ts):**

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
```

**Sample Test File (apps/agent-desktop/src/components/useInteractionStats.test.ts):**

```typescript
import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useInteractionStats } from './useInteractionStats';

describe('useInteractionStats', () => {
  it('should return filtered interactions based on channel', () => {
    const { result } = renderHook(() => useInteractionStats());
    
    // Test will be implemented in Phase 1 when real data is available
    expect(result.current).toBeDefined();
  });

  it('should calculate correct statistics', () => {
    const { result } = renderHook(() => useInteractionStats());
    
    // Test will be implemented in Phase 1
    expect(result.current.stats).toBeDefined();
  });
});
```

### Component 8: CI/CD Pipelines

**Purpose:** Automate code quality checks, builds, and tests on every change.

**GitHub Actions Workflows:**

**.github/workflows/ci.yml (Pull Request Checks):**

```yaml
name: CI

on:
  pull_request:
    branches: [main, develop]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run ESLint
        run: npx nx affected --target=lint --base=origin/main
      
      - name: Run Prettier check
        run: npx prettier --check .

  typecheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Type check
        run: npx nx affected --target=typecheck --base=origin/main

  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run tests
        run: npx nx affected --target=test --base=origin/main --coverage
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/**/coverage-final.json
```

**.github/workflows/build.yml (Build on Main):**

```yaml
name: Build

on:
  push:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        target:
          - agent-desktop
          - admin-module
          - identity-service
          - agent-service
          - interaction-service
          - ticket-service
          - customer-service
          - notification-service
          - knowledge-service
          - bfsi-core-service
          - ai-service
          - media-service
          - audit-service
          - object-schema-service
          - layout-service
          - workflow-service
          - data-enrichment-service
          - dashboard-service
          - report-service
          - cti-adapter-service
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build ${{ matrix.target }}
        run: npx nx build ${{ matrix.target }} --prod
      
      - name: Upload build artifacts
        uses: actions/upload-artifact@v3
        with:
          name: ${{ matrix.target }}-build
          path: dist/
```

**.github/workflows/e2e.yml (E2E Tests):**

```yaml
name: E2E Tests

on:
  push:
    branches: [main]

jobs:
  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Install Playwright browsers
        run: npx playwright install --with-deps
      
      - name: Run Playwright tests
        run: npx playwright test
      
      - name: Upload test results
        uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
```

**Nx Affected Strategy:**

All CI workflows use `nx affected` to only run checks on changed code:
- `--base=origin/main` compares against main branch
- Only affected projects are linted, tested, and built
- Significantly reduces CI time for large monorepos

### Component 9: API Client Library

**Purpose:** Provide centralized HTTP client with JWT authentication and error handling.

**packages/api-client Structure:**

```
packages/api-client/
├── src/
│   ├── index.ts
│   ├── client.ts
│   ├── interceptors/
│   │   ├── auth.interceptor.ts
│   │   └── error.interceptor.ts
│   └── types/
│       └── api-response.ts
├── tsconfig.json
└── project.json
```

**client.ts:**

```typescript
import axios, { AxiosInstance } from 'axios';
import { authInterceptor } from './interceptors/auth.interceptor';
import { errorInterceptor } from './interceptors/error.interceptor';

const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api/v1';

export const apiClient: AxiosInstance = axios.create({
  baseURL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor: attach JWT token
apiClient.interceptors.request.use(
  authInterceptor.onFulfilled,
  authInterceptor.onRejected
);

// Response interceptor: handle errors and token refresh
apiClient.interceptors.response.use(
  (response) => response,
  errorInterceptor
);

export default apiClient;
```

**auth.interceptor.ts:**

```typescript
import { InternalAxiosRequestConfig } from 'axios';

export const authInterceptor = {
  onFulfilled: (config: InternalAxiosRequestConfig) => {
    // Get token from localStorage or memory
    const token = localStorage.getItem('access_token');
    
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    return config;
  },
  
  onRejected: (error: any) => {
    return Promise.reject(error);
  },
};
```

**error.interceptor.ts:**

```typescript
import { AxiosError } from 'axios';
import { apiClient } from '../client';

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: any) => void;
  reject: (reason?: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  
  failedQueue = [];
};

export const errorInterceptor = async (error: AxiosError) => {
  const originalRequest = error.config as any;
  
  // Handle 401 Unauthorized
  if (error.response?.status === 401 && !originalRequest._retry) {
    if (isRefreshing) {
      // Queue the request
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      })
        .then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return apiClient(originalRequest);
        })
        .catch((err) => {
          return Promise.reject(err);
        });
    }
    
    originalRequest._retry = true;
    isRefreshing = true;
    
    try {
      // Attempt token refresh
      const refreshToken = localStorage.getItem('refresh_token');
      
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }
      
      const response = await apiClient.post('/auth/refresh', {
        refreshToken,
      });
      
      const { accessToken } = response.data;
      
      localStorage.setItem('access_token', accessToken);
      
      processQueue(null, accessToken);
      
      originalRequest.headers.Authorization = `Bearer ${accessToken}`;
      return apiClient(originalRequest);
    } catch (refreshError) {
      processQueue(refreshError, null);
      
      // Clear tokens and redirect to login
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      window.location.href = '/login';
      
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
  
  return Promise.reject(error);
};
```

### Component 10: WebSocket Client Library

**Purpose:** Provide WebSocket client with STOMP protocol support for real-time features.

**packages/ws-client Structure:**

```
packages/ws-client/
├── src/
│   ├── index.ts
│   ├── client.ts
│   └── types/
│       └── message.ts
├── tsconfig.json
└── project.json
```

**client.ts:**

```typescript
import { Client, IMessage, StompConfig } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

export class WebSocketClient {
  private client: Client;
  private subscriptions: Map<string, any> = new Map();

  constructor(url: string) {
    const config: StompConfig = {
      webSocketFactory: () => new SockJS(url),
      connectHeaders: {
        Authorization: `Bearer ${localStorage.getItem('access_token')}`,
      },
      debug: (str) => {
        if (import.meta.env.DEV) {
          console.log('[STOMP]', str);
        }
      },
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
    };

    this.client = new Client(config);
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.client.onConnect = () => {
        console.log('[WS] Connected');
        resolve();
      };

      this.client.onStompError = (frame) => {
        console.error('[WS] Error:', frame.headers['message']);
        reject(new Error(frame.headers['message']));
      };

      this.client.activate();
    });
  }

  disconnect(): void {
    this.subscriptions.forEach((sub) => sub.unsubscribe());
    this.subscriptions.clear();
    this.client.deactivate();
  }

  subscribe(
    destination: string,
    callback: (message: IMessage) => void
  ): () => void {
    const subscription = this.client.subscribe(destination, callback);
    this.subscriptions.set(destination, subscription);

    return () => {
      subscription.unsubscribe();
      this.subscriptions.delete(destination);
    };
  }

  send(destination: string, body: any): void {
    this.client.publish({
      destination,
      body: JSON.stringify(body),
    });
  }
}

export default WebSocketClient;
```

### Component 11: TanStack Query Setup

**Purpose:** Provide server state management with caching and background synchronization.

**apps/agent-desktop/src/lib/query-client.ts:**

```typescript
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 30, // 30 minutes (formerly cacheTime)
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: 1,
    },
  },
});
```

**apps/agent-desktop/src/App.tsx (Integration):**

```typescript
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { queryClient } from './lib/query-client';

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      {/* Existing provider tree */}
      <NotificationProvider>
        <EnhancedAgentStatusProvider>
          <CallProvider>
            <AppContent />
          </CallProvider>
        </EnhancedAgentStatusProvider>
      </NotificationProvider>
      
      {/* Dev tools (only in development) */}
      {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  );
}
```

## Data Models

### Environment Variables

All environment variables are documented in `.env.example`:

```env
# ============================================
# TPB CRM Platform - Environment Variables
# ============================================

# PostgreSQL Configuration
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres

# Database Names (one per service)
IDENTITY_DB_NAME=identity_db
AGENT_DB_NAME=agent_db
INTERACTION_DB_NAME=interaction_db
TICKET_DB_NAME=ticket_db
CUSTOMER_DB_NAME=customer_db
NOTIFICATION_DB_NAME=notification_db
KNOWLEDGE_DB_NAME=knowledge_db
BFSI_CORE_DB_NAME=bfsi_core_db
AI_DB_NAME=ai_db
MEDIA_DB_NAME=media_db
AUDIT_DB_NAME=audit_db
OBJECT_SCHEMA_DB_NAME=object_schema_db
LAYOUT_DB_NAME=layout_db
WORKFLOW_DB_NAME=workflow_db
DATA_ENRICHMENT_DB_NAME=data_enrichment_db
DASHBOARD_DB_NAME=dashboard_db
REPORT_DB_NAME=report_db
CTI_ADAPTER_DB_NAME=cti_adapter_db
API_GATEWAY_DB_NAME=api_gateway_db

# Redis Configuration
REDIS_URL=redis://localhost:6379

# Kafka Configuration
KAFKA_BROKERS=localhost:9092

# Elasticsearch Configuration
ELASTICSEARCH_URL=http://localhost:9200

# SeaweedFS Configuration (S3-compatible object storage)
SEAWEEDFS_S3_ENDPOINT=localhost:8333
SEAWEEDFS_ACCESS_KEY=admin
SEAWEEDFS_SECRET_KEY=admin
SEAWEEDFS_USE_SSL=false

# Temporal Configuration
TEMPORAL_ADDRESS=localhost:7233

# JWT Configuration
JWT_SECRET=your-secret-key-change-in-production
JWT_REFRESH_SECRET=your-refresh-secret-change-in-production
JWT_EXPIRES_IN=900
JWT_REFRESH_EXPIRES_IN=604800

# Apache Superset Configuration
SUPERSET_URL=http://localhost:8088
SUPERSET_ADMIN_USER=admin
SUPERSET_ADMIN_PASSWORD=admin

# Frontend Configuration
VITE_API_BASE_URL=http://localhost:3001/api/v1
VITE_WS_URL=http://localhost:3001

# Service Ports (for reference)
# Identity Service: 3001
# Agent Service: 3002
# Interaction Service: 3003
# Ticket Service: 3004
# Customer Service: 3005
# Notification Service: 3006
# Knowledge Service: 3007
# BFSI Core Service: 3008
# AI Service: 3009
# Media Service: 3010
# Audit Service: 3011
# Object Schema Service: 3013
# Layout Service: 3014
# Workflow Service: 3015
# Data Enrichment Service: 3016
# Dashboard Service: 3017
# Report Service: 3018
# CTI Adapter Service: 3019
```

### Port Assignments

| Service | Port | Purpose |
|---------|------|---------|
| Agent Desktop | 3000 | Frontend SPA |
| Admin Module | 3100 | Admin frontend SPA |
| Identity Service | 3001 | Authentication & authorization |
| Agent Service | 3002 | Agent management |
| Interaction Service | 3003 | Interaction queue |
| Ticket Service | 3004 | Ticket management |
| Customer Service | 3005 | Customer profiles |
| Notification Service | 3006 | Notifications |
| Knowledge Service | 3007 | Knowledge base |
| BFSI Core Service | 3008 | Banking queries |
| AI Service | 3009 | AI features |
| Media Service | 3010 | File storage |
| Audit Service | 3011 | Audit logs |
| Object Schema Service | 3013 | Dynamic schemas |
| Layout Service | 3014 | Layout configs |
| Workflow Service | 3015 | Workflow automation |
| Data Enrichment Service | 3016 | Data enrichment |
| Dashboard Service | 3017 | Dashboard data |
| Report Service | 3018 | BI reporting |
| CTI Adapter Service | 3019 | CTI integration |

## API Design

### Health Endpoint Specification

All services must implement a standard health check endpoint:

**Endpoint:** `GET /health`

**Response (Success):**
```json
{
  "status": "ok",
  "info": {
    "database": {
      "status": "up"
    }
  },
  "error": {},
  "details": {
    "database": {
      "status": "up"
    }
  }
}
```

**Response (Failure):**
```json
{
  "status": "error",
  "info": {
    "database": {
      "status": "up"
    }
  },
  "error": {
    "redis": {
      "status": "down",
      "message": "Connection refused"
    }
  },
  "details": {
    "database": {
      "status": "up"
    },
    "redis": {
      "status": "down",
      "message": "Connection refused"
    }
  }
}
```

**HTTP Status Codes:**
- `200 OK` - All health indicators are up
- `503 Service Unavailable` - One or more health indicators are down

## Error Handling

### Error Response Format

All API errors follow a consistent format:

```typescript
interface ErrorResponse {
  statusCode: number;
  message: string | string[];
  error: string;
  timestamp: string;
  path: string;
  requestId?: string;
}
```

**Example:**
```json
{
  "statusCode": 400,
  "message": ["email must be an email", "password must be longer than 8 characters"],
  "error": "Bad Request",
  "timestamp": "2026-03-07T10:30:00.000Z",
  "path": "/api/v1/auth/login",
  "requestId": "req-123-456-789"
}
```

### HTTP Exception Filter

All services use a global exception filter:

```typescript
import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? exception.getResponse()
        : 'Internal server error';

    response.status(status).json({
      statusCode: status,
      message: typeof message === 'object' ? (message as any).message : message,
      error: exception instanceof HttpException ? exception.message : 'Internal Server Error',
      timestamp: new Date().toISOString(),
      path: request.url,
      requestId: request.headers['x-request-id'],
    });
  }
}
```

## Testing Strategy

### Testing Approach

Phase 0 establishes the testing infrastructure but does not require comprehensive test coverage. The focus is on:

1. **Configuration Validation** - Verify all configuration files are correct
2. **Build Verification** - Ensure all apps and services build successfully
3. **Health Check Tests** - Verify all service health endpoints work
4. **Sample Tests** - Create example tests to validate the testing framework

### Unit Testing

**Frontend (Vitest):**
- Test React hooks (e.g., `useInteractionStats`)
- Test utility functions
- Test context providers
- Minimum coverage: 70% (enforced in Phase 1+)

**Backend (Jest):**
- Test NestJS services
- Test controllers
- Test repositories
- Test DTOs and validation
- Minimum coverage: 70% (enforced in Phase 1+)

### Integration Testing

**API Tests (Supertest):**
- Test health endpoints
- Test request/response formats
- Test error handling
- Test authentication (Phase 1+)

### E2E Testing

**Playwright:**
- Test critical user journeys (Phase 1+)
- Test cross-browser compatibility
- Test responsive design

### Test Execution

```bash
# Run all tests
npm run test

# Run tests for specific project
npx nx test agent-desktop
npx nx test identity-service

# Run tests with coverage
npx nx test agent-desktop --coverage

# Run E2E tests
npx playwright test

# Run only affected tests
npx nx affected --target=test
```

## Correctness Properties


*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

Based on the prework analysis, most acceptance criteria in Phase 0 are specific configuration and setup tasks that are best validated as examples rather than universal properties. However, there are a few properties that apply across multiple instances:

### Property 1: Service TypeScript Configuration Inheritance

*For any* app or service directory in the monorepo, the tsconfig.json file should extend from tsconfig.base.json.

**Validates: Requirements 2.2**

### Property 2: Service Structure Consistency

*For any* scaffolded NestJS service, the directory should contain main.ts, app.module.ts, health/ directory, Dockerfile, .env.example, and README.md files.

**Validates: Requirements 4.21, 4.22, 4.23, 4.25, 4.26, 4.27**

### Property 3: Health Endpoint Availability

*For any* scaffolded service, calling GET /health should return a response with status "ok" when the service is running.

**Validates: Requirements 4.28**

### Property 4: JWT Token Attachment

*For any* API request made through the api-client, if an access token exists in localStorage, the request should automatically include an Authorization header with the Bearer token.

**Validates: Requirements 7.8**

### Property 5: Token Refresh on 401

*For any* API request that receives a 401 response, if a refresh token exists, the api-client should attempt to refresh the access token before retrying the original request.

**Validates: Requirements 7.9**

### Property 6: WebSocket STOMP Protocol

*For any* WebSocket connection established through the ws-client, the connection should use the STOMP protocol for message framing.

**Validates: Requirements 7.10**

## Implementation Notes

### Technology Compatibility (2026)

**Verified Compatible Combinations:**

1. **Backend Stack:**
   - Node.js 24.13.x LTS + NestJS 11.x ✅
   - NestJS 11 requires Node.js 20+, fully compatible with 24.x
   - TypeORM 0.3.20 + PostgreSQL 18.3 ✅
   - KafkaJS library supports Kafka 4.2.0 ✅

2. **Frontend Stack:**
   - React 19.2.x + TypeScript 5.7 ✅ (requires @types/react compatible version)
   - Vite 6.x + React 19 ✅ (Vite 8 still in beta, not recommended for production)
   - TanStack Query v5 + React 19 ✅

3. **Infrastructure:**
   - Elasticsearch 9.3.0 + Kibana 9.3.0 ✅ (must use matching versions)
   - Kafka 4.2.0 uses KRaft mode (ZooKeeper removed) ✅
   - SeaweedFS S3 API compatible with AWS SDK ✅

**Important Compatibility Notes:**

- **Kafka 4.x Breaking Change**: ZooKeeper support completely removed. All deployments must use KRaft mode.
- **Vite Version**: Using Vite 6.x instead of 8.x because Vite 8 is still in beta (8.0.0-beta.16 as of Feb 2026).
- **MinIO Replacement**: MinIO open source project archived in Dec 2025. Using SeaweedFS as S3-compatible alternative.
- **Node.js 24 LTS**: Supported until April 2028, provides enhanced security and Web API support.
- **PostgreSQL 18**: Introduces Async I/O subsystem (up to 3x performance improvement).

### Existing Code Preservation

**Critical:** The existing frontend code in `/src` (5,048 lines of index.css, all React components, contexts, and hooks) must be preserved during the migration to the monorepo structure.

**Migration Strategy:**
1. Move entire `/src` directory to `apps/agent-desktop/src`
2. Update import paths to use `@/` alias
3. Preserve `src/index.css` as-is (no Tailwind compilation yet)
4. Verify all existing functionality works after migration

**Files to Preserve:**
- `src/index.css` (5,048 lines) - Pre-compiled Tailwind CSS
- `src/App.tsx` (1,428 lines) - Main application component
- `src/components/` - All 48+ components
- `src/contexts/` - All context providers
- `src/styles/globals.css` - CSS custom properties and theming

### Tailwind CSS Strategy

**Phase 0 Approach:**
- Keep existing `src/index.css` as-is
- Add `tailwind.config.ts` for future use
- Do NOT compile Tailwind in Phase 0 (prevents breaking UI)

**Future Phases:**
- Gradually replace pre-compiled CSS with Tailwind build pipeline
- Test each component after migration
- Remove `index.css` only when all components use Tailwind classes

### Service Scaffolding Order

Services should be scaffolded in dependency order:

1. **Core Services** (no dependencies):
   - identity-service
   - audit-service

2. **Domain Services** (depend on core):
   - agent-service
   - customer-service
   - notification-service

3. **Business Logic Services** (depend on domain):
   - interaction-service
   - ticket-service
   - knowledge-service
   - bfsi-core-service

4. **Advanced Services** (depend on business logic):
   - ai-service
   - media-service
   - object-schema-service
   - layout-service
   - workflow-service
   - data-enrichment-service
   - dashboard-service
   - report-service
   - cti-adapter-service

### Docker Compose Startup Order

Services should start in this order (using `depends_on` with health checks):

1. **Infrastructure Layer:**
   - postgres
   - redis
   - kafka

2. **Search & Storage Layer:**
   - elasticsearch
   - minio

3. **Workflow & BI Layer:**
   - temporal
   - superset

4. **Development Tools:**
   - kafka-ui
   - kibana
   - temporal-ui
   - mailhog

### Development Workflow

**Initial Setup (New Developer):**
```bash
# 1. Clone repository
git clone <repository-url>
cd tpb-crm-platform

# 2. Copy environment file
cp .env.example .env

# 3. Install dependencies
npm install

# 4. Start infrastructure
docker compose up -d

# 5. Wait for services to be healthy
docker compose ps

# 6. Start frontend
npx nx serve agent-desktop

# 7. (Optional) Start a backend service
npx nx serve identity-service
```

**Daily Development:**
```bash
# Start infrastructure (if not running)
docker compose up -d

# Start frontend with hot reload
npx nx serve agent-desktop

# Run tests
npx nx test agent-desktop

# Lint code
npx nx lint agent-desktop

# Build for production
npx nx build agent-desktop --prod
```

### Nx Commands Reference

```bash
# Generate new NestJS app
npx nx g @nx/nest:app <service-name>

# Generate new React app
npx nx g @nx/react:app <app-name>

# Generate new library
npx nx g @nx/js:lib <lib-name>

# Serve application
npx nx serve <app-name>

# Build application
npx nx build <app-name>

# Test application
npx nx test <app-name>

# Lint application
npx nx lint <app-name>

# Run affected commands
npx nx affected --target=build
npx nx affected --target=test
npx nx affected --target=lint

# View dependency graph
npx nx graph
```

### Troubleshooting

**Common Issues:**

1. **Docker services not starting:**
   ```bash
   # Check logs
   docker compose logs <service-name>
   
   # Restart specific service
   docker compose restart <service-name>
   
   # Rebuild and restart
   docker compose up -d --build <service-name>
   ```

2. **Port conflicts:**
   - Check if ports are already in use: `lsof -i :<port>`
   - Update port in `.env` file
   - Restart affected services

3. **TypeScript errors after migration:**
   - Clear Nx cache: `npx nx reset`
   - Reinstall dependencies: `rm -rf node_modules && npm install`
   - Check path aliases in `tsconfig.base.json`

4. **Build failures:**
   - Check for circular dependencies: `npx nx graph`
   - Verify all imports use path aliases
   - Check for missing dependencies in `package.json`

### Security Considerations

**Phase 0 Security:**
- `.env` files are gitignored (never commit secrets)
- `.env.example` contains placeholder values only
- JWT secrets use placeholder values (change in production)
- Database passwords use default values (change in production)

**Future Phases:**
- Implement HashiCorp Vault for secret management (Phase 3)
- Use environment-specific secrets in CI/CD
- Rotate secrets regularly
- Implement secret scanning in CI pipeline

### Performance Considerations

**Build Performance:**
- Nx caching reduces build times by 50-70%
- `nx affected` only builds changed code
- Parallel execution of independent tasks

**Development Performance:**
- Hot module replacement (HMR) for frontend
- NestJS watch mode for backend
- Docker Compose volumes for fast file sync

**CI Performance:**
- Nx affected in CI pipelines
- Distributed task execution (future)
- Build artifact caching

## Deployment

### Local Development Deployment

Phase 0 focuses exclusively on local development. All services run via Docker Compose.

**Start All Services:**
```bash
docker compose up -d
```

**Stop All Services:**
```bash
docker compose down
```

**Stop and Remove Volumes:**
```bash
docker compose down -v
```

### Production Deployment (Future)

Production deployment is planned for Phase 1+ using Kubernetes:

- Container orchestration: Kubernetes 1.29+
- Service mesh: Istio
- API Gateway: Kong
- Secret management: HashiCorp Vault
- Monitoring: Prometheus + Grafana
- Logging: ELK Stack
- Tracing: Jaeger

## Appendices

### Appendix A: Complete Service List

| # | Service Name | Port | Database | Purpose |
|---|--------------|------|----------|---------|
| MS-1 | identity-service | 3001 | identity_db | Authentication, RBAC, MFA |
| MS-2 | agent-service | 3002 | agent_db | Agent profiles, status, presence |
| MS-3 | interaction-service | 3003 | interaction_db | Interaction queue, SLA tracking |
| MS-4 | ticket-service | 3004 | ticket_db | Ticket management, workflows |
| MS-5 | customer-service | 3005 | customer_db | Customer profiles, notes |
| MS-6 | notification-service | 3006 | notification_db | In-app notifications |
| MS-7 | knowledge-service | 3007 | knowledge_db | Knowledge base articles |
| MS-8 | bfsi-core-service | 3008 | bfsi_core_db | Core banking queries |
| MS-9 | ai-service | 3009 | ai_db | AI suggestions, summarization |
| MS-10 | media-service | 3010 | media_db | File storage, recordings |
| MS-11 | audit-service | 3011 | audit_db | Audit logs, compliance |
| MS-13 | object-schema-service | 3013 | object_schema_db | Dynamic object schemas |
| MS-14 | layout-service | 3014 | layout_db | Layout configurations |
| MS-15 | workflow-service | 3015 | workflow_db | Workflow automation |
| MS-16 | data-enrichment-service | 3016 | data_enrichment_db | Data enrichment pipeline |
| MS-17 | dashboard-service | 3017 | dashboard_db | Dashboard data aggregation |
| MS-18 | report-service | 3018 | report_db | BI reporting proxy |
| MS-19 | cti-adapter-service | 3019 | cti_adapter_db | CTI integration |

### Appendix B: Package Dependencies

**Root package.json (key dependencies):**

```json
{
  "name": "tpb-crm-platform",
  "version": "1.0.0",
  "private": true,
  "workspaces": [
    "apps/*",
    "services/*",
    "packages/*",
    "libs/*"
  ],
  "scripts": {
    "dev": "nx serve agent-desktop",
    "build": "nx build",
    "test": "nx test",
    "lint": "nx lint",
    "format": "prettier --write ."
  },
  "devDependencies": {
    "@nx/eslint": "^22.0.0",
    "@nx/jest": "^22.0.0",
    "@nx/js": "^22.0.0",
    "@nx/nest": "^22.0.0",
    "@nx/react": "^22.0.0",
    "@nx/vite": "^22.0.0",
    "@nx/workspace": "^22.0.0",
    "@typescript-eslint/eslint-plugin": "^7.0.0",
    "@typescript-eslint/parser": "^7.0.0",
    "@vitejs/plugin-react-swc": "^3.7.0",
    "eslint": "^9.0.0",
    "eslint-config-prettier": "^9.1.0",
    "nx": "^22.0.0",
    "prettier": "^3.3.0",
    "typescript": "^5.7.0",
    "vite": "^6.0.0",
    "vitest": "^2.1.0"
  },
  "dependencies": {
    "@nestjs/common": "^11.0.0",
    "@nestjs/core": "^11.0.0",
    "@nestjs/jwt": "^10.2.0",
    "@nestjs/microservices": "^11.0.0",
    "@nestjs/platform-express": "^11.0.0",
    "@nestjs/terminus": "^10.2.0",
    "@nestjs/typeorm": "^10.0.0",
    "@nestjs/websockets": "^11.0.0",
    "@stomp/stompjs": "^7.0.0",
    "@tanstack/react-query": "^5.0.0",
    "axios": "^1.7.0",
    "class-transformer": "^0.5.1",
    "class-validator": "^0.14.1",
    "react": "^19.2.0",
    "react-dom": "^19.2.0",
    "react-router-dom": "^6.28.0",
    "sockjs-client": "^1.6.1",
    "typeorm": "^0.3.20",
    "zod": "^3.23.0"
  }
}
```

### Appendix C: Git Workflow

**Branch Strategy:**
- `main` - Production-ready code
- `develop` - Integration branch
- `feature/*` - Feature branches
- `bugfix/*` - Bug fix branches
- `hotfix/*` - Production hotfixes

**Commit Message Format:**
```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**
- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation changes
- `style` - Code style changes (formatting)
- `refactor` - Code refactoring
- `test` - Test changes
- `chore` - Build/tooling changes

**Example:**
```
feat(identity-service): add JWT authentication

Implement JWT token generation and validation using @nestjs/jwt.
Add refresh token rotation for enhanced security.

Closes #123
```

### Appendix D: Code Review Checklist

**Before Creating PR:**
- [ ] Code builds successfully (`npx nx build <app>`)
- [ ] All tests pass (`npx nx test <app>`)
- [ ] Linting passes (`npx nx lint <app>`)
- [ ] TypeScript strict mode has no errors
- [ ] No console.log statements (use proper logging)
- [ ] Environment variables documented in `.env.example`
- [ ] README updated if needed
- [ ] Commit messages follow convention

**During Code Review:**
- [ ] Code follows project conventions
- [ ] No security vulnerabilities
- [ ] No performance issues
- [ ] Error handling is appropriate
- [ ] Tests cover new functionality
- [ ] Documentation is clear
- [ ] No breaking changes (or documented)

### Appendix E: Useful Resources

**Documentation:**
- Nx: https://nx.dev/
- NestJS: https://nestjs.com/
- React: https://react.dev/
- TanStack Query: https://tanstack.com/query/
- TypeORM: https://typeorm.io/
- Docker Compose: https://docs.docker.com/compose/

**Tools:**
- Nx Console (VS Code extension)
- Postman (API testing)
- pgAdmin (PostgreSQL GUI)
- Redis Commander (Redis GUI)
- Kafka UI (included in docker-compose)

**Community:**
- Nx Discord: https://go.nx.dev/community
- NestJS Discord: https://discord.gg/nestjs
- React Discord: https://discord.gg/react

---

**Document Version:** 1.0
**Last Updated:** 2026-03-07
**Status:** Ready for Implementation
**Phase:** Phase 0 - Foundation Setup
**Estimated Duration:** 2 weeks
**Team Size:** 1-3 developers

