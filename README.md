
  # TPB CRM Platform

  Enterprise CRM Platform for TPBank with 19 microservices, 2 frontend modules, and BFSI-grade security.

  ## Quick Start

  ### Prerequisites
  - Node.js 24.x LTS
  - Docker & Docker Compose
  - Git

  ### Installation

  1. Clone the repository:
  ```bash
  git clone <repository-url>
  cd AgentdesktopTPB
  ```

  2. Install dependencies:
  ```bash
  npm install --legacy-peer-deps
  ```

  3. Copy environment variables:
  ```bash
  cp .env.example .env
  ```

  4. Start infrastructure services:
  ```bash
  cd infra
  docker compose up -d
  ```

  5. Setup Kong API Gateway:
  ```bash
  ./infra/scripts/setup-kong-identity.sh
  ```

  6. Verify Sprint 1-2 completion:
  ```bash
  ./infra/scripts/check-sprint-1-2.sh
  ```

  7. Start development server:
  ```bash
  npm run dev
  ```

  Agent Desktop will be available at http://localhost:3000

  ## Current Status

  **Phase 1 - Core MVP**: ✅ **COMPLETE** (100%)
  **Phase 2 - Advanced Features**: ✅ **COMPLETE** (100%)
  **Phase 3 - Automation & Analytics**: ✅ **COMPLETE** (100%)

  ### ✅ All 18 Backend Services Operational
  
  **Phase 1 Services:**
  - MS-1: Identity Service (63 tests passing)
  - MS-2: Agent Service (17 tests passing)
  - MS-3: Interaction Service (10 tests passing)
  - MS-4: Ticket Service (8 tests passing)
  - MS-5: Customer Service (7 tests passing)
  - MS-6: Notification Service (7 tests passing)

  **Phase 2 Services:**
  - MS-7: Knowledge Service (13 tests passing)
  - MS-8: BFSI Core Service (10 tests passing)
  - MS-9: AI Service (8 tests passing)
  - MS-10: Media Service (6 tests passing)
  - MS-11: Audit Service (8 tests passing)
  - MS-13: Object Schema Service (5 tests passing)
  - MS-14: Layout Service (5 tests passing)
  - MS-19: CTI Adapter Service (7 tests passing)

  **Phase 3 Services:**
  - MS-15: Workflow Service (8 tests passing)
  - MS-16: Data Enrichment Service (5 tests passing)
  - MS-17: Dashboard Service (6 tests passing)
  - MS-18: Report Service (5 tests passing)

  **Total: 198/198 tests passing** 🎉

  See [Phase 1 Summary](./.kiro/specs/phase-1-core-mvp/PHASE-1-COMPLETE.md), [Phase 2 Summary](./.kiro/specs/phase-2-advanced-features/PHASE-2-COMPLETE.md), and [Phase 3 Summary](./.kiro/specs/phase-3-automation-analytics/PHASE-3-COMPLETE.md) for details.

  ## Development

  ### Available Scripts

  - `npm run dev` - Start agent-desktop dev server
  - `npm run build` - Build agent-desktop
  - `npm run test` - Run all tests
  - `npm run test:agent` - Run agent-desktop tests
  - `npm run test:admin` - Run admin-module tests
  - `npm run test:e2e` - Run E2E tests
  - `npm run lint` - Lint all projects
  - `npm run affected:build` - Build affected projects
  - `npm run affected:test` - Test affected projects

  ### Project Structure

  ```
  apps/               # Frontend applications
    agent-desktop/    # React 19 Agent Desktop
    admin-module/     # React 19 Admin Module
  
  services/           # Backend microservices (18 services)
    identity-service/
    agent-service/
    ...
  
  packages/           # Shared libraries
    shared-types/
    shared-dto/
  
  libs/               # Internal libraries
    nest-common/
  
  infra/              # Infrastructure
    docker-compose.yml
  ```

  ## GitHub Actions Secrets

  Configure these secrets in your GitHub repository settings:

  ### Required Secrets

  - `POSTGRES_PASSWORD` - PostgreSQL database password
  - `JWT_SECRET` - JWT access token signing secret (RS256 private key)
  - `JWT_REFRESH_SECRET` - JWT refresh token signing secret
  - `SEAWEEDFS_ACCESS_KEY` - SeaweedFS S3 access key
  - `SEAWEEDFS_SECRET_KEY` - SeaweedFS S3 secret key

  ### Optional Secrets

  - `CODECOV_TOKEN` - Codecov upload token (for coverage reports)
  - `REDIS_PASSWORD` - Redis password (if enabled)
  - `KAFKA_SASL_PASSWORD` - Kafka SASL password (if enabled)

  ## Infrastructure Services

  All services run via Docker Compose:

  - PostgreSQL 18.3 (port 5432) - 19 databases
  - Redis 8.6 (port 6379)
  - Kafka 4.2.0 (port 9092) + Kafka UI (port 9000)
  - Elasticsearch 9.3.0 (port 9200) + Kibana (port 5601)
  - SeaweedFS (ports 8333, 9333)
  - Temporal (port 7233) + Temporal UI (port 8233)
  - Apache Superset (port 8088)
  - MailHog (ports 1025, 8025)

  ## Testing

  ### Unit Tests
  ```bash
  npm run test:agent    # Frontend tests (Vitest)
  npm run test:admin    # Admin module tests (Vitest)
  nx test <service>     # Backend tests (Jest)
  ```

  ### E2E Tests
  ```bash
  npx playwright install chromium  # First time only
  npm run test:e2e                 # Run E2E tests
  npm run test:e2e:ui              # Run with UI
  ```

  ### Coverage
  ```bash
  npm run test:agent -- --coverage
  ```

  ## Documentation

  - [Implementation Plan](./ImplementationPlan.md)
  - [Requirements V3](./FullStack-RequirementsV3.md)
  - [Architecture Decisions](./.kiro/steering/02-architecture-decisions.md)
  - [Phase Tracker](./.kiro/steering/01-phase-tracker.md)

  ## License

  Proprietary - TPBank
  