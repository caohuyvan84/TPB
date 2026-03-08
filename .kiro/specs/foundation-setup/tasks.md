# Implementation Plan: Foundation Setup

## Overview

This implementation plan breaks down Phase 0 (Foundation Setup) into executable coding tasks. The goal is to establish a complete development environment where all developers can run `docker compose up` and work locally with a fully functional Nx monorepo containing the existing React 18 frontend and scaffolded backend microservices.

This is a 2-week sprint focused on infrastructure, tooling, and project structure setup. No business logic implementation is included in this phase.

## Tasks

- [-] 1. Git Repository and Nx Monorepo Initialization
  - [x] 1.1 Initialize Git repository and create .gitignore
    - Run `git init` at project root
    - Create .gitignore excluding node_modules, .env, build, dist directories
    - Create initial commit
    - _Requirements: 1.1, 1.2_

  - [x] 1.2 Initialize Nx monorepo workspace
    - Run `npx create-nx-workspace@latest` with integrated preset
    - Configure workspace name as "tpb-crm-platform"
    - Set up package manager (npm)
    - _Requirements: 1.3_

  - [x] 1.3 Migrate existing frontend to apps/agent-desktop and upgrade to React 19.2.x
    - **Step 1: Backup and Move**
      - Create backup of existing /src directory
      - Move existing /src directory to apps/agent-desktop/src
      - Preserve existing index.css (5,048 lines) - DO NOT MODIFY
      - Verify all files copied successfully
    
    - **Step 2: Update Dependencies**
      - Upgrade React 18 to React 19.2.x: `npm install react@19.2.x react-dom@19.2.x`
      - Update @types/react and @types/react-dom to compatible versions (^19.0.0)
      - Update react-router-dom to v6.28+ (React 19 compatible)
      - Update @testing-library/react to v16+ (React 19 compatible)
      - Update @tanstack/react-query to v5+ (already compatible)
      - Check and update any other React-dependent packages
    
    - **Step 3: Update Import Paths**
      - Update all relative imports to use @/ alias
      - Search and replace: `from './` → `from '@/`
      - Search and replace: `from '../` → update to use @/ alias
      - Verify no broken imports remain
    
    - **Step 4: React 19 Breaking Changes Checklist**
      - [ ] **ref as prop**: Check all components using forwardRef
        - React 19 supports ref as a regular prop
        - Remove unnecessary forwardRef wrappers where possible
        - Test ref forwarding still works in shadcn/ui components
      
      - [ ] **useEffect timing**: Verify useEffect cleanup behavior
        - React 19 may have different cleanup timing
        - Check components with complex useEffect dependencies
        - Test components that use useEffect for subscriptions
      
      - [ ] **Context API changes**: Verify all context providers work
        - Test AgentStatusContext, NotificationContext, CallContext
        - Ensure context values update correctly
        - Check for any context-related warnings in console
      
      - [ ] **Event handling**: Check synthetic event behavior
        - Verify form submissions work correctly
        - Test click handlers, keyboard events
        - Check event.preventDefault() and event.stopPropagation()
      
      - [ ] **Suspense boundaries**: Check if any components use Suspense
        - React 19 has improved Suspense behavior
        - Test loading states and error boundaries
      
      - [ ] **Automatic batching**: Verify state updates batch correctly
        - React 19 has enhanced automatic batching
        - Test components with multiple setState calls
        - Check for any unexpected re-renders
      
      - [ ] **New hooks compatibility**: Check if code uses new React 19 hooks
        - use() hook for reading promises/context
        - useOptimistic() for optimistic updates
        - useFormStatus() for form state
        - Note: These are optional, existing code should work without them
    
    - **Step 5: Component-by-Component Testing**
      - [ ] Test critical components first:
        - [ ] App.tsx - Main application entry point
        - [ ] EnhancedAgentStatusContext.tsx - Agent status management
        - [ ] NotificationContext.tsx - Notification system
        - [ ] CallContext.tsx - Call management
        - [ ] InteractionList.tsx - Interaction queue
        - [ ] CustomerInfoScrollFixed.tsx - Customer information panel
      
      - [ ] Test UI components (shadcn/ui):
        - [ ] Dialog components (CreateTicketDialog, EmailReplyDialog, TransferCallDialog)
        - [ ] Form components (Input, Select, Textarea, Checkbox)
        - [ ] Navigation components (Tabs, Accordion, Dropdown)
        - [ ] Feedback components (Alert, Toast/Sonner, Badge)
      
      - [ ] Test complex interactions:
        - [ ] AIAssistantChat - AI chat interface
        - [ ] CallTimeline - Call timeline visualization
        - [ ] EmailThread - Email thread display
        - [ ] KnowledgeBaseSearch - Knowledge base search
        - [ ] FloatingCallWidget - Floating call widget
      
      - [ ] Test hooks:
        - [ ] useInteractionStats - Interaction statistics
        - [ ] Custom hooks in components
    
    - **Step 6: Build and Runtime Verification**
      - Run `npx nx build agent-desktop` and verify no errors
      - Check for TypeScript errors related to React types
      - Fix any type errors (especially ref types)
      - Run `npx nx serve agent-desktop` and verify app starts
      - Check browser console for warnings or errors
      - Verify no "React 18" deprecation warnings
    
    - **Step 7: Visual and Functional Testing**
      - [ ] **Layout verification**:
        - Verify main layout renders correctly
        - Check responsive design still works
        - Test sidebar, header, and main content areas
      
      - [ ] **Navigation testing**:
        - Test all navigation links work
        - Verify routing works correctly
        - Check browser back/forward buttons
      
      - [ ] **Form testing**:
        - Test all forms submit correctly
        - Verify validation works
        - Check error messages display
      
      - [ ] **Real-time features**:
        - Test notification system
        - Verify agent status updates
        - Check call widget functionality
      
      - [ ] **Performance check**:
        - Verify app loads in reasonable time
        - Check for any performance regressions
        - Monitor React DevTools for unnecessary re-renders
    
    - **Step 8: Create React 19 Migration Report**
      - Document all breaking changes encountered
      - List all components that required modifications
      - Note any performance improvements or regressions
      - Create list of follow-up tasks if needed
      - Save report as `apps/agent-desktop/REACT_19_MIGRATION.md`
    
    - **Step 9: Final Verification**
      - Run full test suite (if tests exist)
      - Verify all existing functionality works
      - Get approval from team/stakeholder before proceeding
      - Commit changes with detailed commit message
    
    - _Requirements: 1.4_
    - _Estimated Time: 4-6 hours_
    - _Risk Level: HIGH - This is a major version upgrade_
    - _Rollback Plan: Restore from backup if critical issues found_

  - [-] 1.4 Create admin-module skeleton application with React 19
    - Generate new React app: `nx g @nx/react:app admin-module`
    - Configure Vite 6.x build tool
    - Set up React 19.2.x and TypeScript 5.7
    - Create basic App.tsx structure
    - _Requirements: 1.5_

  - [ ] 1.5 Create shared-types package
    - Generate library: `nx g @nx/js:lib shared-types`
    - Extract TypeScript interfaces from existing contexts
    - Create index.ts with exports
    - _Requirements: 1.6_

  - [ ] 1.6 Create shared-dto package with Zod schemas
    - Generate library: `nx g @nx/js:lib shared-dto`
    - Install Zod dependency
    - Create initial DTO schemas
    - _Requirements: 1.7_

  - [ ] 1.7 Verify monorepo build
    - Run `nx build agent-desktop`
    - Verify build completes successfully
    - Test that UI renders correctly
    - _Requirements: 1.8_

- [ ] 2. TypeScript Configuration and Code Quality Tools
  - [ ] 2.1 Create base TypeScript configuration
    - Create tsconfig.base.json with strict mode enabled
    - Configure path mappings for @/, @admin/, @shared/, @api-client, @ws-client, @nest-common
    - Enable decorator support (experimentalDecorators, emitDecoratorMetadata)
    - Set target to ES2022, module to ESNext
    - _Requirements: 2.1_

  - [ ] 2.2 Create per-app TypeScript configurations
    - Create tsconfig.json for agent-desktop extending base
    - Create tsconfig.json for admin-module extending base
    - Create tsconfig.json template for services
    - _Requirements: 2.2_

  - [ ] 2.3 Install and configure ESLint
    - Install @typescript-eslint/parser and @typescript-eslint/eslint-plugin
    - Install ESLint Nx plugin
    - Install Prettier and eslint-config-prettier
    - _Requirements: 2.3_

  - [ ] 2.4 Create ESLint and Prettier configuration files
    - Create .eslintrc.json at repository root with Nx module boundaries
    - Create .prettierrc with project code style settings
    - Configure ESLint to work with TypeScript and Nx
    - _Requirements: 2.4_

  - [ ] 2.5 Configure Tailwind CSS for agent-desktop
    - Install Tailwind CSS dependencies
    - Create tailwind.config.ts for agent-desktop
    - Configure PostCSS
    - Keep existing index.css for Phase 0 (no breaking changes)
    - _Requirements: 2.5, 2.9_

  - [ ] 2.6 Configure Tailwind CSS for admin-module
    - Create tailwind.config.ts for admin-module
    - Set up Tailwind directives in CSS
    - _Requirements: 2.6_

  - [ ] 2.7 Verify linting and type checking
    - Run `nx lint` and verify no errors
    - Run `nx build` with TypeScript strict mode
    - Fix any type errors in existing code
    - _Requirements: 2.7, 2.8_

- [ ] 3. Checkpoint - Verify monorepo setup
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 4. Docker Compose Infrastructure Services
  - [ ] 4.1 Create docker-compose.yml with PostgreSQL and Redis
    - Define PostgreSQL 18.3 service on port 5432
    - Define Redis 8.6 service on port 6379
    - Configure volumes for data persistence
    - Add health checks for both services
    - _Requirements: 3.1, 3.2_

  - [ ] 4.2 Add Kafka and Kafka UI services
    - Define Apache Kafka 4.2.0 in KRaft mode (ZooKeeper removed) on port 9092
    - Define Kafka UI service on port 9000 for development
    - Configure Kafka environment variables for KRaft mode
    - _Requirements: 3.3, 3.4_

  - [ ] 4.3 Add Elasticsearch and Kibana services
    - Define Elasticsearch 9.3.0 service on port 9200
    - Define Kibana 9.3.0 service on port 5601 for development
    - Configure Elasticsearch memory settings
    - _Requirements: 3.5, 3.6_

  - [ ] 4.4 Add SeaweedFS object storage service (S3-compatible)
    - Define SeaweedFS service on ports 8333 (S3 API) and 9333 (master)
    - Configure SeaweedFS access keys and buckets
    - Set up volume for data persistence
    - Configure S3-compatible API endpoint
    - _Requirements: 3.7_

  - [ ] 4.5 Add Temporal workflow engine services
    - Define Temporal server on port 7233
    - Define Temporal Web UI on port 8233 for development
    - Configure Temporal database connection
    - _Requirements: 3.8, 3.9_

  - [ ] 4.6 Add Apache Superset and MailHog services
    - Define Apache Superset service on port 8088
    - Define MailHog SMTP service on ports 1025 and 8025
    - Configure Superset admin credentials
    - _Requirements: 3.10, 3.11_

  - [ ] 4.7 Create docker-compose.dev.yml with development overrides
    - Add volume mounts for hot reload
    - Configure development-specific settings
    - Add debug ports where needed
    - _Requirements: 3.12_

  - [ ] 4.8 Create database initialization script
    - Create infra/scripts/init-db.sh
    - Add SQL commands to create 19 databases (one per microservice)
    - Grant privileges to postgres user
    - _Requirements: 3.13_

  - [ ] 4.9 Create development data seeding script
    - Create infra/scripts/seed-dev.sh
    - Add placeholder for test data seeding
    - Make script executable
    - _Requirements: 3.14_

  - [ ] 4.10 Create comprehensive .env.example file
    - Document all PostgreSQL connection variables
    - Document all 19 database names
    - Document Redis, Kafka, Elasticsearch, SeaweedFS URLs
    - Document SeaweedFS S3 endpoint, access key, and secret key
    - Document JWT secrets and expiration times
    - Document Superset credentials
    - Document frontend environment variables
    - _Requirements: 3.15_

  - [ ] 4.11 Verify Docker Compose infrastructure
    - Run `docker compose up -d`
    - Verify all services start successfully
    - Run `docker compose ps` and check all services are healthy
    - Test connectivity to PostgreSQL 18.3, Redis 8.6, Kafka 4.2.0, Elasticsearch 9.3.0, SeaweedFS, Temporal, Superset
    - _Requirements: 3.16, 3.17_

- [ ] 5. Checkpoint - Verify infrastructure setup
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 6. NestJS Microservices Scaffold
  - [ ] 6.1 Scaffold core identity and audit services
    - Generate identity-service: `nx g @nx/nest:app identity-service`
    - Generate audit-service: `nx g @nx/nest:app audit-service`
    - Configure ports (3001, 3011)
    - _Requirements: 4.1, 4.11_

  - [ ] 6.2 Scaffold domain services (agent, customer, notification)
    - Generate agent-service: `nx g @nx/nest:app agent-service`
    - Generate customer-service: `nx g @nx/nest:app customer-service`
    - Generate notification-service: `nx g @nx/nest:app notification-service`
    - Configure ports (3002, 3005, 3006)
    - _Requirements: 4.2, 4.5, 4.6_

  - [ ] 6.3 Scaffold business logic services (interaction, ticket, knowledge, bfsi-core)
    - Generate interaction-service: `nx g @nx/nest:app interaction-service`
    - Generate ticket-service: `nx g @nx/nest:app ticket-service`
    - Generate knowledge-service: `nx g @nx/nest:app knowledge-service`
    - Generate bfsi-core-service: `nx g @nx/nest:app bfsi-core-service`
    - Configure ports (3003, 3004, 3007, 3008)
    - _Requirements: 4.3, 4.4, 4.7, 4.8_

  - [ ] 6.4 Scaffold advanced services (ai, media)
    - Generate ai-service: `nx g @nx/nest:app ai-service`
    - Generate media-service: `nx g @nx/nest:app media-service`
    - Configure ports (3009, 3010)
    - _Requirements: 4.9, 4.10_

  - [ ] 6.5 Scaffold platform services (object-schema, layout, workflow)
    - Generate object-schema-service: `nx g @nx/nest:app object-schema-service`
    - Generate layout-service: `nx g @nx/nest:app layout-service`
    - Generate workflow-service: `nx g @nx/nest:app workflow-service`
    - Configure ports (3013, 3014, 3015)
    - _Requirements: 4.12, 4.13, 4.14_

  - [ ] 6.6 Scaffold analytics services (data-enrichment, dashboard, report)
    - Generate data-enrichment-service: `nx g @nx/nest:app data-enrichment-service`
    - Generate dashboard-service: `nx g @nx/nest:app dashboard-service`
    - Generate report-service: `nx g @nx/nest:app report-service`
    - Configure ports (3016, 3017, 3018)
    - _Requirements: 4.15, 4.16, 4.17_

  - [ ] 6.7 Scaffold CTI adapter service
    - Generate cti-adapter-service: `nx g @nx/nest:app cti-adapter-service`
    - Configure port (3019)
    - _Requirements: 4.18_

  - [ ] 6.8 Install NestJS shared dependencies
    - Install @nestjs/typeorm, typeorm, pg
    - Install @nestjs/jwt, @nestjs/passport, passport-jwt
    - Install @nestjs/websockets, @nestjs/platform-socket.io
    - Install @nestjs/microservices, kafkajs
    - Install @nestjs/terminus for health checks
    - Install class-validator, class-transformer
    - _Requirements: 4.19_

  - [ ] 6.9 Create nest-common shared library
    - Generate library: `nx g @nx/js:lib nest-common`
    - Create guards/ directory with jwt-auth.guard.ts and roles.guard.ts
    - Create decorators/ directory with roles.decorator.ts and current-user.decorator.ts
    - Create interceptors/ directory with audit.interceptor.ts and transform.interceptor.ts
    - Create filters/ directory with http-exception.filter.ts
    - Create interfaces/ directory with jwt-payload.interface.ts
    - _Requirements: 4.20_

  - [ ] 6.10 Create main.ts template for all services
    - Implement bootstrap function with ValidationPipe
    - Configure CORS with environment-based origin
    - Set up port configuration from environment
    - Add startup logging
    - Apply template to all 19 services
    - _Requirements: 4.21_

  - [ ] 6.11 Create app.module.ts template for all services
    - Import ConfigModule with global configuration
    - Import TypeOrmModule with PostgreSQL connection
    - Import HealthModule
    - Configure database synchronize based on NODE_ENV
    - Apply template to all 19 services
    - _Requirements: 4.22_

  - [ ] 6.12 Create health check module for all services
    - Create health/ directory in each service
    - Implement health.controller.ts with @nestjs/terminus
    - Implement health.module.ts
    - Add database ping check
    - Test health endpoint returns {status: "ok"}
    - _Requirements: 4.23, 4.28_

  - [ ] 6.13 Create domain folder structure for all services
    - Create domain/ directory with module, controller, service, repository subdirectories
    - Create entities/, dto/, and events/ subdirectories
    - Add placeholder files to maintain structure
    - _Requirements: 4.24_

  - [ ] 6.14 Create Dockerfile for all services
    - Create multi-stage Dockerfile with builder and runtime stages
    - Configure Node.js 24 Alpine base image
    - Set up Nx build command
    - Configure production environment
    - Apply to all 19 services
    - _Requirements: 4.25_

  - [ ] 6.15 Create .env.example for all services
    - Document SERVICE_NAME, NODE_ENV, PORT
    - Document database connection variables
    - Document JWT configuration (for services that need auth)
    - Document Redis and Kafka URLs
    - Apply to all 19 services
    - _Requirements: 4.26_

  - [ ] 6.16 Create README.md for all services
    - Document service purpose and responsibilities
    - Document environment variables
    - Document API endpoints (placeholder)
    - Document development commands
    - Apply to all 19 services
    - _Requirements: 4.27_

- [ ] 7. Checkpoint - Verify service scaffolding
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 8. Testing Framework Configuration
  - [ ] 8.1 Configure Vitest for agent-desktop
    - Install vitest, @vitejs/plugin-react-swc, jsdom
    - Create vite.config.ts with test configuration
    - Configure globals, environment, and setupFiles
    - _Requirements: 5.1_

  - [ ] 8.2 Configure Vitest for admin-module
    - Install vitest dependencies
    - Create vite.config.ts with test configuration
    - Set up test environment
    - _Requirements: 5.2_

  - [ ] 8.3 Configure Jest for backend services
    - Install jest, ts-jest, @nestjs/testing
    - Create jest.config.ts for each service
    - Configure test environment as node
    - Set up TypeScript transformation
    - _Requirements: 5.3_

  - [ ] 8.4 Install Playwright for E2E testing
    - Install @playwright/test
    - Create playwright.config.ts
    - Configure test directory and browsers
    - Set up webServer configuration
    - _Requirements: 5.4_

  - [ ] 8.5 Install testing utilities
    - Install @testing-library/react for component testing
    - Install @testing-library/jest-dom for DOM matchers
    - Install supertest for API integration testing
    - _Requirements: 5.5, 5.6_

  - [ ]* 8.6 Create sample test for useInteractionStats hook
    - Create useInteractionStats.test.ts
    - Write basic test structure with renderHook
    - Add placeholder tests for Phase 1 implementation
    - _Requirements: 5.7_

  - [ ] 8.7 Configure code coverage thresholds
    - Set minimum coverage to 70% in vite.config.ts
    - Set minimum coverage to 70% in jest.config.ts
    - Configure coverage reporters (text, json, html)
    - _Requirements: 5.8, 5.9, 5.10_

- [ ] 9. CI/CD Pipeline Configuration
  - [ ] 9.1 Create CI workflow for pull requests
    - Create .github/workflows/ci.yml
    - Configure workflow to run on pull_request events
    - Add job for linting with nx affected
    - Add job for type checking
    - Add job for running tests with coverage
    - Configure Node.js 24 and npm caching
    - _Requirements: 6.1, 6.2, 6.3, 6.4_

  - [ ] 9.2 Create build workflow for main branch
    - Create .github/workflows/build.yml
    - Configure workflow to run on push to main
    - Create matrix strategy for all 21 apps/services
    - Add build steps for each target
    - Upload build artifacts
    - _Requirements: 6.5, 6.6, 6.7_

  - [ ] 9.3 Create E2E test workflow
    - Create .github/workflows/e2e.yml
    - Configure workflow to run on push to main
    - Install Playwright browsers
    - Run Playwright tests
    - Upload test results and reports
    - _Requirements: 6.8_

  - [ ] 9.4 Configure Nx affected for CI optimization
    - Configure nx affected with --base=origin/main
    - Set up affected commands in all workflows
    - Test that only changed projects are built/tested
    - _Requirements: 6.9_

  - [ ] 9.5 Configure GitHub secrets
    - Document required secrets in README
    - Add placeholders for POSTGRES_PASSWORD
    - Add placeholders for JWT_SECRET and JWT_REFRESH_SECRET
    - Add placeholders for SEAWEEDFS_ACCESS_KEY and SEAWEEDFS_SECRET_KEY
    - _Requirements: 6.10_

- [ ] 10. API Client and WebSocket Libraries
  - [ ] 10.1 Create api-client package
    - Generate library: `nx g @nx/js:lib api-client`
    - Install axios dependency
    - Create client.ts with Axios instance
    - Configure base URL from environment variables
    - _Requirements: 7.1, 7.2_

  - [ ] 10.2 Implement JWT authentication interceptors
    - Create interceptors/auth.interceptor.ts
    - Implement request interceptor to attach JWT token from localStorage
    - Create interceptors/error.interceptor.ts
    - Implement response interceptor for 401 handling
    - _Requirements: 7.3, 7.4_

  - [ ] 10.3 Implement automatic token refresh logic
    - Add token refresh queue to prevent multiple refresh requests
    - Implement refresh token API call on 401 response
    - Update access token in localStorage
    - Retry original request with new token
    - Redirect to login if refresh fails
    - _Requirements: 7.9_

  - [ ] 10.4 Create ws-client package with STOMP support
    - Generate library: `nx g @nx/js:lib ws-client`
    - Install @stomp/stompjs and sockjs-client
    - Create WebSocketClient class
    - Implement connect, disconnect, subscribe, and send methods
    - Configure STOMP protocol with JWT authentication
    - _Requirements: 7.5, 7.10_

  - [ ] 10.5 Install and configure TanStack Query in agent-desktop
    - Install @tanstack/react-query
    - Install @tanstack/react-query-devtools
    - Create lib/query-client.ts with QueryClient configuration
    - Configure staleTime, gcTime, retry, and refetch options
    - _Requirements: 7.6_

  - [ ] 10.6 Integrate TanStack Query into agent-desktop App.tsx
    - Import QueryClientProvider
    - Wrap application with QueryClientProvider
    - Add ReactQueryDevtools for development
    - Verify query client is accessible in components
    - _Requirements: 7.7_

  - [ ] 10.7 Verify API client functionality
    - Test that JWT token is attached to requests
    - Test that 401 responses trigger token refresh
    - Test that refresh failures redirect to login
    - _Requirements: 7.8, 7.9_

- [ ] 11. Final Checkpoint and Exit Criteria Verification
  - [ ] 11.1 Verify Docker Compose infrastructure
    - Run `docker compose up -d`
    - Verify all infrastructure services are in healthy status
    - Test connectivity to PostgreSQL, Redis, Kafka, Elasticsearch, MinIO, Temporal, Superset
    - _Exit Criteria: 1_

  - [ ] 11.2 Verify agent-desktop build and runtime
    - Run `nx build agent-desktop`
    - Verify build completes successfully
    - Start development server and verify UI runs at localhost:3000
    - Test that existing functionality works
    - _Exit Criteria: 2_

  - [ ] 11.3 Verify linting passes
    - Run `nx lint` for all projects
    - Verify no linting errors
    - Fix any remaining issues
    - _Exit Criteria: 3_

  - [ ] 11.4 Verify tests execute successfully
    - Run `nx test` for all projects
    - Verify sample tests pass
    - Check that test infrastructure is working
    - _Exit Criteria: 4_

  - [ ] 11.5 Verify all service health endpoints
    - Start each of the 19 services
    - Call GET /health on each service
    - Verify all return {status: "ok"}
    - _Exit Criteria: 5_

  - [ ] 11.6 Verify .env.example completeness
    - Review .env.example file
    - Verify all required environment variables are documented
    - Verify all 19 database names are included
    - Verify all service URLs and credentials are documented
    - _Exit Criteria: 6_

  - [ ] 11.7 Verify new developer setup time
    - Document setup instructions in root README.md
    - Test that a new developer can follow instructions
    - Verify setup completes within 30 minutes
    - _Exit Criteria: 7_

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation at key milestones
- All services are scaffolded with consistent structure but no business logic
- Phase 0 focuses on infrastructure and tooling, not feature implementation
- Existing frontend code upgraded from React 18 to React 19.2.x during migration to monorepo
- React 19 breaking changes must be tested and fixed during Task 1.3
- TypeScript strict mode is enforced across the entire codebase
- All 19 microservices follow the same template structure
- Docker Compose provides complete local development environment with latest 2026 versions:
  - PostgreSQL 18.3 (Async I/O performance improvements)
  - Redis 8.6 (latest stable)
  - Kafka 4.2.0 (KRaft mode, ZooKeeper removed)
  - Elasticsearch 9.3.0 + Kibana 9.3.0
  - SeaweedFS (replaces MinIO which was archived Dec 2025)
  - Node.js 24.13.x LTS (support until April 2028)
- CI/CD pipelines use Nx affected to optimize build and test times
