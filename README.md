
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

  5. Start development server:
  ```bash
  npm run dev
  ```

  Agent Desktop will be available at http://localhost:3000

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
  