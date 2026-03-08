# Requirements Document: Foundation Setup

## Introduction

This document specifies the requirements for Phase 0 (Foundation Setup) of the TPB CRM Platform project. The goal is to establish a complete development environment where all developers can run `docker compose up` and work locally with a fully functional Nx monorepo containing the existing React 18 frontend and scaffolded backend microservices.

This is a 2-week sprint focused on infrastructure, tooling, and project structure setup. No business logic implementation is included in this phase.

## Glossary

- **Nx_Monorepo**: A monorepo management tool that enables code sharing and affected-build optimization across multiple applications and libraries
- **Agent_Desktop**: The existing React SPA for multi-channel customer service interactions (upgraded to React 19.2.x from current /src)
- **Admin_Module**: A new React 19.2.x SPA for system configuration, schema management, and administrative functions
- **NestJS_Service**: A backend microservice built with the NestJS framework using TypeScript
- **Docker_Compose**: A tool for defining and running multi-container Docker applications for local development
- **Infrastructure_Services**: Supporting services including PostgreSQL, Redis, Kafka, Elasticsearch, MinIO, Temporal, and Superset
- **Health_Endpoint**: A REST endpoint that returns service health status, typically at /health
- **CI_Pipeline**: Continuous Integration pipeline that runs automated checks on code changes
- **Shared_Packages**: TypeScript packages containing types, DTOs, and utilities shared between frontend and backend
- **Tailwind_Build_Pipeline**: A build process that compiles Tailwind CSS utility classes into optimized CSS output
- **Service_Scaffold**: A minimal service structure with basic files and folders but no business logic implementation

## Requirements

### Requirement 1: Git Repository and Nx Monorepo Initialization

**User Story:** As a developer, I want Git and Nx monorepo initialized so I can start development with proper version control and monorepo tooling.

#### Acceptance Criteria

1. THE System SHALL initialize a Git repository at the project root
2. THE System SHALL create a .gitignore file that excludes node_modules, .env, build, and dist directories
3. THE System SHALL initialize an Nx monorepo using create-nx-workspace
4. THE System SHALL move the existing frontend code from /src to apps/agent-desktop/ and upgrade to React 19.2.x
5. THE System SHALL create an apps/admin-module/ skeleton using Vite 6.x, React 19.2.x, and TypeScript 5.7
6. THE System SHALL create packages/shared-types/ with initial TypeScript interfaces from existing contexts
7. THE System SHALL create packages/shared-dto/ with Zod schema definitions
8. WHEN the monorepo is initialized, THE System SHALL successfully build agent-desktop using nx build agent-desktop

### Requirement 2: TypeScript Configuration and Code Quality Tools

**User Story:** As a developer, I want TypeScript strict mode and code quality tools configured so code quality is enforced across the entire codebase.

#### Acceptance Criteria

1. THE System SHALL create tsconfig.base.json with strict mode enabled, path mappings, and decorator support
2. THE System SHALL create individual tsconfig.json files for each app and service that extend tsconfig.base.json
3. THE System SHALL install ESLint with @typescript-eslint/parser and Prettier
4. THE System SHALL create .eslintrc.json and .prettierrc configuration files at the repository root
5. THE System SHALL configure Tailwind CSS build pipeline for agent-desktop with tailwind.config.ts
6. THE System SHALL configure Tailwind CSS build pipeline for admin-module
7. WHEN nx lint is executed, THE System SHALL complete without errors
8. WHEN nx build is executed, THE System SHALL complete successfully with TypeScript strict mode enabled
9. THE System SHALL preserve the existing src/index.css file (5,048 lines pre-compiled) to avoid breaking the UI during Phase 0

### Requirement 3: Docker Compose Infrastructure Services

**User Story:** As a developer, I want Docker Compose infrastructure configured so I can run all required services locally with a single command.

#### Acceptance Criteria

1. THE System SHALL create infra/docker-compose.yml defining PostgreSQL 18.3 on port 5432
2. THE System SHALL define Redis 8.6 service on port 6379 in docker-compose.yml
3. THE System SHALL define Apache Kafka 4.2.0 service in KRaft mode (ZooKeeper removed) on port 9092
4. THE System SHALL define Kafka UI service on port 9000 for development
5. THE System SHALL define Elasticsearch 9.3.0 service on port 9200
6. THE System SHALL define Kibana 9.3.0 service on port 5601 for development
7. THE System SHALL define SeaweedFS service on port 8333 (S3 API) and port 9333 (master) as S3-compatible object storage
8. THE System SHALL define Temporal server on port 7233
9. THE System SHALL define Temporal Web UI on port 8233 for development
10. THE System SHALL define Apache Superset service on port 8088
11. THE System SHALL define MailHog SMTP service on ports 1025 and 8025 for development
12. THE System SHALL create docker-compose.dev.yml with development overrides for volumes and hot reload
13. THE System SHALL create infra/scripts/init-db.sh that creates 19 separate databases (one per microservice)
14. THE System SHALL create infra/scripts/seed-dev.sh for seeding test data
15. THE System SHALL create .env.example with all required environment variables including POSTGRES_HOST, POSTGRES_PORT, POSTGRES_USER, POSTGRES_PASSWORD, database names for all 19 services, REDIS_URL, KAFKA_BROKERS, ELASTICSEARCH_URL, SEAWEEDFS_S3_ENDPOINT, SEAWEEDFS_ACCESS_KEY, SEAWEEDFS_SECRET_KEY, TEMPORAL_ADDRESS, JWT_SECRET, JWT_REFRESH_SECRET, JWT_EXPIRES_IN, JWT_REFRESH_EXPIRES_IN, SUPERSET_URL, SUPERSET_ADMIN_USER, and SUPERSET_ADMIN_PASSWORD
16. WHEN docker compose up -d is executed, THE System SHALL start all infrastructure services successfully
17. WHEN docker compose ps is executed, THE System SHALL show all services in healthy status

### Requirement 4: NestJS Microservices Scaffold

**User Story:** As a developer, I want NestJS service scaffolds created so I can start implementing microservices with a consistent structure.

#### Acceptance Criteria

1. THE System SHALL scaffold identity-service (MS-1) using nx g @nx/nest:app
2. THE System SHALL scaffold agent-service (MS-2) using nx g @nx/nest:app
3. THE System SHALL scaffold interaction-service (MS-3) using nx g @nx/nest:app
4. THE System SHALL scaffold ticket-service (MS-4) using nx g @nx/nest:app
5. THE System SHALL scaffold customer-service (MS-5) using nx g @nx/nest:app
6. THE System SHALL scaffold notification-service (MS-6) using nx g @nx/nest:app
7. THE System SHALL scaffold knowledge-service (MS-7) using nx g @nx/nest:app
8. THE System SHALL scaffold bfsi-core-service (MS-8) using nx g @nx/nest:app
9. THE System SHALL scaffold ai-service (MS-9) using nx g @nx/nest:app
10. THE System SHALL scaffold media-service (MS-10) using nx g @nx/nest:app
11. THE System SHALL scaffold audit-service (MS-11) using nx g @nx/nest:app
12. THE System SHALL scaffold object-schema-service (MS-13) using nx g @nx/nest:app
13. THE System SHALL scaffold layout-service (MS-14) using nx g @nx/nest:app
14. THE System SHALL scaffold workflow-service (MS-15) using nx g @nx/nest:app
15. THE System SHALL scaffold data-enrichment-service (MS-16) using nx g @nx/nest:app
16. THE System SHALL scaffold dashboard-service (MS-17) using nx g @nx/nest:app
17. THE System SHALL scaffold report-service (MS-18) using nx g @nx/nest:app
18. THE System SHALL scaffold cti-adapter-service (MS-19) using nx g @nx/nest:app
19. THE System SHALL install @nestjs/typeorm, @nestjs/jwt, @nestjs/websockets, and @nestjs/microservices dependencies
20. THE System SHALL create libs/nest-common/ containing shared NestJS modules including auth guard, audit interceptor, and exception filters
21. FOR ALL scaffolded services, THE System SHALL create a main.ts file with bootstrap and port configuration
22. FOR ALL scaffolded services, THE System SHALL create an app.module.ts root module
23. FOR ALL scaffolded services, THE System SHALL create a health/ directory with health check endpoint implementation
24. FOR ALL scaffolded services, THE System SHALL create a domain folder structure with module, controller, service, repository, entities, dto, and events subdirectories
25. FOR ALL scaffolded services, THE System SHALL create a Dockerfile
26. FOR ALL scaffolded services, THE System SHALL create a .env.example file
27. FOR ALL scaffolded services, THE System SHALL create a README.md file
28. WHEN any service health endpoint is called, THE System SHALL return a response with status "ok"

### Requirement 5: Testing Framework Configuration

**User Story:** As a developer, I want testing frameworks configured so I can write and run tests for frontend and backend code.

#### Acceptance Criteria

1. THE System SHALL install Vitest for frontend testing in agent-desktop
2. THE System SHALL install Vitest for frontend testing in admin-module
3. THE System SHALL install Jest for backend service testing with NestJS testing module
4. THE System SHALL install Playwright for end-to-end testing
5. THE System SHALL install @testing-library/react for component testing
6. THE System SHALL install supertest for API integration testing
7. THE System SHALL create a sample test file useInteractionStats.test.ts for the existing hook
8. THE System SHALL configure code coverage thresholds with a minimum of 70% coverage
9. WHEN nx test is executed, THE System SHALL run all tests successfully
10. WHEN coverage reports are generated, THE System SHALL enforce the 70% minimum threshold

### Requirement 6: CI/CD Pipeline Configuration

**User Story:** As a developer, I want CI/CD pipelines configured so code is automatically validated on every change.

#### Acceptance Criteria

1. THE System SHALL create .github/workflows/ci.yml that runs on pull requests
2. WHEN a pull request is created, THE CI_Pipeline SHALL execute linting checks
3. WHEN a pull request is created, THE CI_Pipeline SHALL execute type checking
4. WHEN a pull request is created, THE CI_Pipeline SHALL execute unit tests
5. THE System SHALL create .github/workflows/build.yml that runs on push to main branch
6. WHEN code is pushed to main, THE Build_Pipeline SHALL build all applications
7. WHEN code is pushed to main, THE Build_Pipeline SHALL build all services
8. THE System SHALL create .github/workflows/e2e.yml that runs on push to main branch for Playwright tests
9. THE System SHALL configure nx affected to build and test only changed code
10. THE System SHALL configure GitHub secrets for database credentials, JWT secrets, and MinIO credentials

### Requirement 7: API Client and WebSocket Libraries

**User Story:** As a developer, I want API client libraries configured so the frontend can connect to backend services with proper authentication and real-time capabilities.

#### Acceptance Criteria

1. THE System SHALL create packages/api-client/ with an Axios instance
2. THE System SHALL configure api-client with base URL from environment variables
3. THE System SHALL implement JWT token attachment in api-client request interceptors
4. THE System SHALL implement automatic token refresh on 401 responses in api-client
5. THE System SHALL create packages/ws-client/ with a WebSocket client wrapper using STOMP protocol
6. THE System SHALL install TanStack Query (React Query) in agent-desktop
7. THE System SHALL create QueryClientProvider wrapper in agent-desktop App.tsx
8. WHEN an API request is made, THE api-client SHALL automatically attach the JWT token
9. WHEN a 401 response is received, THE api-client SHALL attempt to refresh the token before retrying
10. WHEN WebSocket connection is established, THE ws-client SHALL use STOMP protocol for messaging

## Exit Criteria

The following conditions must be met before Phase 0 is considered complete:

1. WHEN docker compose up -d is executed, THE System SHALL start all infrastructure services in healthy status
2. WHEN nx build agent-desktop is executed, THE System SHALL complete successfully and the UI SHALL run at localhost:3000
3. WHEN nx lint is executed, THE System SHALL complete with no errors
4. WHEN nx test is executed, THE System SHALL execute sample tests successfully
5. FOR ALL 19 service stubs, THE Health_Endpoint at /health SHALL return a response with status "ok"
6. THE .env.example file SHALL contain all required environment variables
7. WHEN a new developer follows the setup instructions, THE System SHALL be fully operational within 30 minutes
