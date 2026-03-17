# Implementation Plan: Phase 3 - Automation & Analytics

## Overview

This implementation plan breaks down Phase 3 into discrete, actionable tasks for implementing the final 4 microservices that enable Temporal-based workflow automation, progressive data enrichment, real-time dashboards, and Apache Superset BI reporting integration.

**Services to Implement:**
- MS-15: Workflow Service (Temporal orchestration)
- MS-16: Data Enrichment Service (progressive loading)
- MS-17: Dashboard Service (real-time analytics)
- MS-18: Report Service (Superset integration)

**Sprint Structure:**
- Sprint 13-14: Workflow Service (MS-15)
- Sprint 15: Data Enrichment Service (MS-16)
- Sprint 16: Dashboard Service (MS-17)
- Sprint 17: Report Service (MS-18)
- Sprint 18: Security Hardening & Performance Testing

**Testing Approach:**
- Unit tests for all services (≥70% coverage)
- Property-based tests for 49 correctness properties (100 iterations each)
- Integration tests for all API endpoints
- E2E tests for key user flows
- Load testing for 500 concurrent users

---

## Tasks

### Sprint 13-14: Workflow Service (MS-15)

- [ ] 1. Set up Workflow Service project structure and core interfaces
  - Create NestJS service scaffold in services/workflow-service
  - Configure TypeORM with workflow_db connection
  - Set up Temporal client and worker configuration
  - Define core interfaces: WorkflowDefinition, WorkflowExecution, WorkflowStep
  - Configure environment variables for Temporal connection
  - _Requirements: 1.1, 1.2_


- [ ] 2. Create TypeORM migrations for Workflow Service database schema
  - [ ] 2.1 Create workflow_definitions table migration
    - Fields: id, tenant_id, name, description, is_active, version, trigger, steps, variables, error_handling
    - Indexes: tenant_id, is_active (partial index)
    - _Requirements: 1.1, 18.1_
  
  - [ ] 2.2 Create workflow_executions table migration
    - Fields: id, workflow_id, temporal_workflow_id, temporal_run_id, status, input, output, error, started_at, completed_at
    - Indexes: workflow_id, status, started_at, temporal_workflow_id (unique)
    - Foreign key: workflow_id references workflow_definitions
    - _Requirements: 1.7, 18.1_
  
  - [ ] 2.3 Create workflow_step_results table migration
    - Fields: id, execution_id, step_id, step_type, status, input, output, error, started_at, completed_at
    - Indexes: execution_id, status
    - Foreign key: execution_id references workflow_executions
    - _Requirements: 2.10, 18.1_

- [ ] 3. Implement Workflow Service entity models
  - [ ] 3.1 Implement WorkflowDefinitionEntity with TypeORM decorators
    - JSONB fields: trigger, steps, variables, errorHandling
    - Validation: trigger type, step types, cron expressions
    - _Requirements: 1.1, 1.2_
  
  - [ ] 3.2 Implement WorkflowExecutionEntity with TypeORM decorators
    - Relationship: ManyToOne with WorkflowDefinition
    - Status enum: running, completed, failed, timed_out, cancelled
    - _Requirements: 1.7_
  
  - [ ] 3.3 Implement WorkflowStepResultEntity with TypeORM decorators
    - Relationship: ManyToOne with WorkflowExecution
    - Status enum: pending, running, completed, failed, skipped
    - _Requirements: 2.10_
  
  - [ ]* 3.4 Write unit tests for Workflow Service entities
    - Test entity creation and validation
    - Test JSONB field serialization/deserialization
    - Test relationships and cascading
    - Target: 5 tests passing
    - _Requirements: 17.1_


- [ ] 4. Implement Temporal workflow and activity workers
  - [ ] 4.1 Implement SLA Breach Escalation workflow
    - Steps: notify agent, wait 5 minutes, check status, escalate to supervisor, send SMS
    - Error handling: retry with exponential backoff
    - _Requirements: 1.4, 1.5, 1.6, 2.1_
  
  - [ ] 4.2 Implement Auto-Assignment workflow
    - Steps: find available agents, assign object, notify agent
    - Fallback: create notification if no agents available
    - _Requirements: 1.4, 1.5, 2.5_
  
  - [ ] 4.3 Implement VIP Customer Routing workflow
    - Steps: find senior agents, notify manager if unavailable, assign to any agent after wait
    - Priority handling for VIP customers
    - _Requirements: 1.4, 1.5, 2.5_
  
  - [ ] 4.4 Implement Temporal activity workers for all 18 step types
    - send_notification: Call Notification Service POST /api/v1/notifications
    - send_email: Call Email Gateway with template rendering
    - send_sms: Call SMS Gateway
    - update_object: Call object service PATCH endpoint
    - assign_agent: Query Agent Service and update object
    - escalate_ticket: Update ticket priority and assign to supervisor
    - create_ticket: Call Ticket Service POST /api/v1/tickets
    - call_webhook: HTTP client with retry
    - call_api: Generic HTTP client
    - wait: Temporal timer
    - wait_for_event: Temporal signal
    - parallel: Execute branches concurrently
    - loop: Iterate over array
    - ai_classify: Call AI Service POST /api/v1/ai/classify
    - ai_generate: Call AI Service POST /api/v1/ai/generate
    - condition: Evaluate expression
    - switch: Multi-branch condition
    - custom: Execute custom code
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8_
  
  - [ ] 4.5 Implement activity timeout and retry policies
    - Default timeout: 30 seconds
    - Configurable per step up to 5 minutes
    - Exponential backoff retry policy
    - _Requirements: 2.9_
  
  - [ ]* 4.6 Write unit tests for Temporal workflows and activities
    - Test workflow execution with mock activities
    - Test activity idempotency
    - Test timeout handling
    - Test retry policies
    - Target: 12 tests passing
    - _Requirements: 17.1, 17.3_


- [ ] 5. Implement Workflow Service business logic
  - [ ] 5.1 Implement WorkflowService with CRUD operations
    - Create workflow with validation (cron expressions, step types, circular dependencies)
    - Update workflow (increment version)
    - Delete workflow (soft delete if has executions)
    - List workflows with filters (isActive, triggerType)
    - Get workflow by ID with execution history
    - _Requirements: 1.1, 1.8, 3.9_
  
  - [ ] 5.2 Implement WorkflowTriggerMatcher for event-based triggers
    - Match Kafka events to workflow triggers
    - Evaluate trigger conditions (field-operator-value expressions)
    - Support operators: equals, not_equals, contains, gt, lt, in, not_in, matches
    - Deduplicate executions using Redis (eventId + workflowId)
    - _Requirements: 1.3, 3.1, 3.2, 3.6, 3.7_
  
  - [ ] 5.3 Implement TemporalWorkflowClient for workflow execution
    - Start workflow execution with input
    - Query workflow status
    - Cancel running workflow
    - Handle Temporal connection failures
    - _Requirements: 1.3, 1.7_
  
  - [ ] 5.4 Implement workflow testing with sandbox mode
    - Execute workflow with sample data
    - Mock all activities to prevent side effects
    - Return step-by-step execution trace
    - _Requirements: 1.9_
  
  - [ ] 5.5 Implement workflow import/export as JSON
    - Export workflow definition to JSON
    - Import workflow from JSON with validation
    - _Requirements: 1.10_
  
  - [ ] 5.6 Implement HashiCorp Vault integration for workflow credentials
    - Store webhook auth and API keys in Vault
    - Vault path: secret/workflows/{workflowId}/credentials
    - Retrieve credentials during activity execution
    - _Requirements: 15.1_
  
  - [ ]* 5.7 Write unit tests for WorkflowService
    - Test CRUD operations
    - Test trigger matching logic
    - Test workflow validation
    - Test sandbox mode execution
    - Test import/export round trip
    - Target: 15 tests passing
    - _Requirements: 17.1_


- [ ] 6. Implement Workflow Service API endpoints
  - [ ] 6.1 Implement WorkflowController with all endpoints
    - GET /api/v1/admin/workflows - List workflows with pagination and filters
    - GET /api/v1/admin/workflows/{id} - Get workflow detail
    - POST /api/v1/admin/workflows - Create workflow
    - PUT /api/v1/admin/workflows/{id} - Update workflow
    - DELETE /api/v1/admin/workflows/{id} - Delete workflow
    - POST /api/v1/admin/workflows/{id}/activate - Activate workflow
    - POST /api/v1/admin/workflows/{id}/deactivate - Deactivate workflow
    - POST /api/v1/admin/workflows/{id}/test - Test workflow with sample data
    - POST /api/v1/workflows/webhook/{workflowId}/{token} - Webhook trigger
    - _Requirements: 1.8, 3.4_
  
  - [ ] 6.2 Implement RBAC guards for workflow endpoints
    - workflow:read permission for GET endpoints
    - workflow:write permission for POST/PUT/DELETE endpoints
    - Admin role required for all endpoints
    - _Requirements: 1.8_
  
  - [ ] 6.3 Implement request validation with class-validator
    - Validate workflow definition structure
    - Validate trigger configuration
    - Validate step configurations
    - Validate cron expressions
    - _Requirements: 3.9_
  
  - [ ]* 6.4 Write integration tests for Workflow Service API
    - Test all endpoints with valid/invalid inputs
    - Test RBAC enforcement
    - Test webhook trigger with authentication
    - Target: 10 tests passing
    - _Requirements: 17.2_

- [ ] 7. Implement Kafka event consumption for workflow triggers
  - [ ] 7.1 Implement Kafka consumer for all event topics
    - Subscribe to: agent-events, interaction-events, ticket-events, customer-events, sla-events
    - Parse event payload and match to workflow triggers
    - Start Temporal workflow execution for matches
    - _Requirements: 1.3, 14.5_
  
  - [ ] 7.2 Implement event deduplication using Redis
    - Redis key: workflow:execution:dedup:{eventId}:{workflowId}
    - TTL: 24 hours
    - Prevent duplicate workflow executions
    - _Requirements: 3.7_
  
  - [ ] 7.3 Implement audit logging for workflow triggers and executions
    - Log trigger matches to Audit Service (category: workflow-trigger)
    - Log workflow executions to Audit Service (category: workflow-execution, sensitivity: high)
    - Log activity executions to Audit Service (category: workflow-execution)
    - _Requirements: 2.10, 3.10, 15.5_
  
  - [ ]* 7.4 Write integration tests for Kafka event consumption
    - Test event matching and workflow triggering
    - Test deduplication logic
    - Test audit logging
    - Target: 5 tests passing
    - _Requirements: 17.2_


- [ ]* 8. Write property-based tests for Workflow Service
  - [ ]* 8.1 Property 1: Event-triggered workflow execution
    - Generate random Kafka events and workflow definitions
    - Verify matching triggers start Temporal executions
    - 100 iterations with fast-check
    - **Property 1: Event-triggered workflow execution**
    - **Validates: Requirements 1.3**
  
  - [ ]* 8.2 Property 2: Workflow step error handling
    - Generate random workflows with failing steps
    - Verify configured error handling strategy applied
    - 100 iterations with fast-check
    - **Property 2: Workflow step error handling**
    - **Validates: Requirements 1.6**
  
  - [ ]* 8.3 Property 5: Workflow import/export round trip
    - Generate random workflow definitions
    - Export to JSON, import, verify equivalence
    - 100 iterations with fast-check
    - **Property 5: Workflow import/export round trip**
    - **Validates: Requirements 1.10**
  
  - [ ]* 8.4 Property 6: Activity idempotency
    - Execute same activity twice with same input
    - Verify identical results and side effects
    - 100 iterations with fast-check
    - **Property 6: Activity idempotency**
    - **Validates: Requirements 2.1**
  
  - [ ]* 8.5 Property 11: Workflow execution deduplication
    - Generate duplicate Kafka events
    - Verify only one workflow execution per eventId + workflowId
    - 100 iterations with fast-check
    - **Property 11: Workflow execution deduplication**
    - **Validates: Requirements 3.7**

- [ ] 9. Configure Kong API Gateway for Workflow Service
  - Add routes for all Workflow Service endpoints
  - Configure rate limiting: 30 req/min for admin endpoints
  - Configure CORS for Admin Module
  - Configure JWT validation
  - _Requirements: 15.8, 15.9_

- [ ] 10. Checkpoint - Verify Workflow Service integration
  - Ensure all tests pass (entity + service + integration + property tests)
  - Verify Temporal connection and workflow execution
  - Verify Kafka event consumption and workflow triggering
  - Verify webhook trigger endpoint works
  - Verify audit logging to Audit Service
  - Verify HashiCorp Vault integration for credentials
  - Test workflow creation, testing, and execution via API
  - Ensure all tests pass, ask the user if questions arise.



### Sprint 15: Data Enrichment Service (MS-16)

- [ ] 11. Set up Data Enrichment Service project structure and core interfaces
  - Create NestJS service scaffold in services/data-enrichment-service
  - Configure TypeORM with enrichment_db connection
  - Set up Redis client for caching and locking
  - Define core interfaces: EnrichmentSource, FieldMapping, EnrichmentRequest
  - Configure environment variables for external API connections
  - _Requirements: 4.1, 4.2_

- [ ] 12. Create TypeORM migrations for Data Enrichment Service database schema
  - [ ] 12.1 Create enrichment_sources table migration
    - Fields: id, tenant_id, name, type, connection_config, auth_type, credentials (encrypted), timeout, retry_policy, cache_policy, rate_limiting, is_active
    - Indexes: tenant_id, is_active (partial index)
    - _Requirements: 4.1, 4.2, 18.2_
  
  - [ ] 12.2 Create field_mappings table migration
    - Fields: id, source_id, source_field, target_object_type, target_field_name, transform_expression, is_active
    - Indexes: source_id, target_object_type
    - Foreign key: source_id references enrichment_sources
    - _Requirements: 4.7, 18.2_
  
  - [ ] 12.3 Create enrichment_requests table migration
    - Fields: id, object_type, object_id, source_ids, status, requested_at, completed_at, result
    - Indexes: object_type + object_id, status, requested_at
    - _Requirements: 4.4, 18.2_

- [ ] 13. Implement Data Enrichment Service entity models
  - [ ] 13.1 Implement EnrichmentSourceEntity with TypeORM decorators
    - JSONB fields: connectionConfig, retryPolicy, cachePolicy, rateLimiting
    - Encrypted credentials field with AES-256-GCM
    - Type enum: rest, soap, graphql, database
    - AuthType enum: api-key, oauth2, basic, mtls
    - _Requirements: 4.1, 4.2, 4.3_
  
  - [ ] 13.2 Implement FieldMappingEntity with TypeORM decorators
    - Relationship: ManyToOne with EnrichmentSource
    - JSONPath validation for sourceField
    - JSONata validation for transformExpression
    - _Requirements: 4.7_
  
  - [ ] 13.3 Implement EnrichmentRequestEntity with TypeORM decorators
    - Status enum: pending, in_progress, completed, failed, partial
    - JSONB result field with per-source status
    - _Requirements: 4.4_
  
  - [ ]* 13.4 Write unit tests for Data Enrichment Service entities
    - Test entity creation and validation
    - Test credential encryption/decryption
    - Test JSONB field serialization
    - Target: 5 tests passing
    - _Requirements: 17.1_


- [ ] 14. Implement Data Enrichment Service business logic
  - [ ] 14.1 Implement EnrichmentOrchestrator for request processing
    - Accept enrichment requests from internal API
    - Deduplicate using Redis lock (enrich:{objectType}:{objectId}:{sourceId})
    - Query all sources in parallel with timeout (default 5 seconds)
    - Apply field mappings (JSONPath + JSONata transforms)
    - Webhook enriched data to object services
    - Cache results in Redis with configurable TTL
    - _Requirements: 4.4, 4.5, 4.6, 4.7, 4.8, 4.9_
  
  - [ ] 14.2 Implement ExternalApiClient for REST/SOAP/GraphQL/database
    - HTTP client with timeout and retry (exponential backoff)
    - Circuit breaker pattern (5 failures, 30s timeout)
    - OAuth2 token refresh for oauth2 authType
    - Support for REST, SOAP, GraphQL, database connections
    - _Requirements: 4.6, 6.9_
  
  - [ ] 14.3 Implement FieldMappingService for data transformation
    - JSONPath evaluation for extracting fields from API responses
    - JSONata transformation for complex mappings
    - Validation against Object Schema Service
    - Error handling for invalid mappings
    - _Requirements: 4.7, 6.4_
  
  - [ ] 14.4 Implement credential encryption/decryption with AES-256-GCM
    - Encrypt credentials before storing in database
    - Decrypt credentials when making API calls
    - Store encryption key in environment variable
    - Generate unique IV per encryption
    - _Requirements: 4.3, 15.2_
  
  - [ ] 14.5 Implement audit logging for enrichment requests
    - Log all enrichment requests to Audit Service (category: external-system-access)
    - Log all external API calls with response time and status
    - Log configuration changes (category: configuration-change)
    - _Requirements: 4.10, 6.10, 15.6_
  
  - [ ]* 14.6 Write unit tests for EnrichmentService
    - Test request deduplication
    - Test parallel source querying
    - Test field mapping application
    - Test caching logic
    - Test OAuth2 token refresh
    - Test credential encryption/decryption
    - Target: 15 tests passing
    - _Requirements: 17.1, 17.4_


- [ ] 15. Implement Data Enrichment Service API endpoints
  - [ ] 15.1 Implement EnrichmentController with all endpoints
    - POST /internal/enrichment/request - Trigger enrichment (internal only, not exposed via Kong)
    - GET /api/v1/admin/enrichment/sources - List sources with pagination
    - GET /api/v1/admin/enrichment/sources/{id} - Get source detail
    - POST /api/v1/admin/enrichment/sources - Create source
    - PUT /api/v1/admin/enrichment/sources/{id} - Update source
    - DELETE /api/v1/admin/enrichment/sources/{id} - Delete source
    - POST /api/v1/admin/enrichment/sources/{id}/test - Test connectivity
    - _Requirements: 4.4, 6.1, 6.2, 6.7_
  
  - [ ] 15.2 Implement RBAC guards for enrichment endpoints
    - enrichment:read permission for GET endpoints
    - enrichment:write permission for POST/PUT/DELETE endpoints
    - Admin role required for all endpoints
    - Internal endpoint accessible only from service mesh
    - _Requirements: 6.1_
  
  - [ ] 15.3 Implement request validation with class-validator
    - Validate enrichment source configuration
    - Validate field mappings against Object Schema Service
    - Validate connection parameters
    - Validate JSONPath and JSONata expressions
    - _Requirements: 6.4, 6.8_
  
  - [ ]* 15.4 Write integration tests for Data Enrichment Service API
    - Test all endpoints with valid/invalid inputs
    - Test RBAC enforcement
    - Test connectivity testing endpoint
    - Test internal enrichment request endpoint
    - Target: 8 tests passing
    - _Requirements: 17.2, 17.4_

- [ ] 16. Implement progressive loading integration with object services
  - [ ] 16.1 Update Customer Service to support progressive loading
    - Mark enrichment fields with status: loading in initial response
    - Trigger enrichment request asynchronously after returning local data
    - Implement webhook endpoint POST /api/v1/customers/{id}/enrichment
    - Push object.fields.updated event via WebSocket on enrichment completion
    - _Requirements: 5.1, 5.2, 5.3, 5.5_
  
  - [ ] 16.2 Update Ticket Service to support progressive loading
    - Same pattern as Customer Service
    - _Requirements: 5.10_
  
  - [ ] 16.3 Update Interaction Service to support progressive loading
    - Same pattern as Customer Service
    - _Requirements: 5.10_
  
  - [ ]* 16.4 Write E2E tests for progressive loading flow
    - Test customer profile load with enrichment
    - Verify local data loads < 200ms
    - Verify enrichment fields show loading status
    - Verify WebSocket push updates UI
    - Verify complete flow within 5 seconds
    - Target: 5 tests passing
    - _Requirements: 17.7_


- [ ]* 17. Write property-based tests for Data Enrichment Service
  - [ ]* 17.1 Property 14: Enrichment credential encryption
    - Generate random credentials
    - Verify encrypted storage and decrypted retrieval
    - 100 iterations with fast-check
    - **Property 14: Enrichment credential encryption**
    - **Validates: Requirements 4.3**
  
  - [ ]* 17.2 Property 15: Enrichment request deduplication
    - Generate concurrent requests for same object and source
    - Verify only one external API call made
    - 100 iterations with fast-check
    - **Property 15: Enrichment request deduplication**
    - **Validates: Requirements 4.5**
  
  - [ ]* 17.3 Property 17: Field mapping application
    - Generate random API responses and field mappings
    - Verify JSONPath + JSONata transforms applied correctly
    - 100 iterations with fast-check
    - **Property 17: Field mapping application**
    - **Validates: Requirements 4.7**
  
  - [ ]* 17.4 Property 19: Enrichment result caching
    - Generate random enrichment requests
    - Verify cached results returned without API calls
    - 100 iterations with fast-check
    - **Property 19: Enrichment result caching**
    - **Validates: Requirements 4.9**

- [ ] 18. Configure Kong API Gateway for Data Enrichment Service
  - Add routes for all admin endpoints
  - Configure rate limiting: 30 req/min for admin endpoints
  - Configure CORS for Admin Module
  - Configure JWT validation
  - Do NOT expose /internal/enrichment/request endpoint
  - _Requirements: 15.8, 15.9_

- [ ] 19. Checkpoint - Verify Data Enrichment Service integration
  - Ensure all tests pass (entity + service + integration + property tests)
  - Verify Redis connection for caching and locking
  - Verify external API client with mock APIs
  - Verify field mapping with JSONPath and JSONata
  - Verify credential encryption/decryption
  - Verify progressive loading flow with Customer Service
  - Verify WebSocket push on enrichment completion
  - Verify audit logging to Audit Service
  - Ensure all tests pass, ask the user if questions arise.



### Sprint 16: Dashboard Service (MS-17)

- [ ] 20. Set up Dashboard Service project structure and core interfaces
  - Create NestJS service scaffold in services/dashboard-service
  - Configure TypeORM with dashboard_db connection
  - Set up Redis client for widget data caching
  - Set up WebSocket gateway for real-time metric updates
  - Define core interfaces: Dashboard, DashboardWidget, MetricData
  - Configure environment variables
  - _Requirements: 7.1, 7.2_

- [ ] 21. Create TypeORM migrations for Dashboard Service database schema
  - [ ] 21.1 Create dashboards table migration
    - Fields: id, tenant_id, name, type, layout, refresh_interval, role_restrictions, is_active, created_by
    - Indexes: tenant_id, type, is_active (partial index)
    - Type enum: personal, team, department, system
    - _Requirements: 7.1, 18.3_
  
  - [ ] 21.2 Create dashboard_widgets table migration
    - Fields: id, dashboard_id, type, title, data_source, filters, group_by, time_range, thresholds, display_options, position
    - Indexes: dashboard_id, type
    - Foreign key: dashboard_id references dashboards
    - Type enum: metric_card, line_chart, bar_chart, pie_chart, donut_chart, table, queue_list, agent_status_grid, sla_gauge, heatmap, leaderboard, ticker
    - _Requirements: 7.2, 18.3_
  
  - [ ] 21.3 Create dashboard_assignments table migration
    - Fields: id, dashboard_id, user_id, team_id, department_id, assigned_at
    - Indexes: dashboard_id, user_id, team_id
    - Foreign key: dashboard_id references dashboards
    - _Requirements: 9.6, 18.3_

- [ ] 22. Implement Dashboard Service entity models
  - [ ] 22.1 Implement DashboardEntity with TypeORM decorators
    - JSONB fields: layout, roleRestrictions
    - Relationship: OneToMany with DashboardWidget
    - Type enum validation
    - _Requirements: 7.1_
  
  - [ ] 22.2 Implement DashboardWidgetEntity with TypeORM decorators
    - JSONB fields: filters, thresholds, displayOptions, position
    - Relationship: ManyToOne with Dashboard
    - Type enum validation (12 widget types)
    - DataSource enum validation
    - _Requirements: 7.2, 8.1_
  
  - [ ] 22.3 Implement DashboardAssignmentEntity with TypeORM decorators
    - Relationship: ManyToOne with Dashboard
    - _Requirements: 9.6_
  
  - [ ]* 22.4 Write unit tests for Dashboard Service entities
    - Test entity creation and validation
    - Test JSONB field serialization
    - Test relationships
    - Target: 5 tests passing
    - _Requirements: 17.1_


- [ ] 23. Implement Dashboard Service business logic
  - [ ] 23.1 Implement MetricAggregator for querying object services
    - Query Interaction Service for interaction_metrics data source
    - Query Ticket Service for ticket_metrics data source
    - Query Agent Service for agent_metrics data source
    - Query Customer Service for customer_metrics data source
    - Support aggregations: count, sum, avg, min, max, percentile
    - Apply filters (field-operator-value) and groupBy
    - Support time ranges: today, yesterday, last_7_days, last_30_days, this_month, last_month, custom
    - _Requirements: 7.10, 8.2, 8.3, 8.4_
  
  - [ ] 23.2 Implement DashboardService with CRUD operations
    - Create dashboard with widget configurations
    - Update dashboard and widgets
    - Delete dashboard (cascade to widgets)
    - List dashboards accessible to user based on role
    - Get dashboard by ID with all widget data
    - Personal dashboard customization
    - _Requirements: 7.3, 7.4, 7.9_
  
  - [ ] 23.3 Implement widget data caching in Redis
    - Cache key: dashboard:widget:data:{widgetId}
    - TTL: dashboard refreshInterval
    - Cache invalidation on widget configuration change
    - _Requirements: 7.5_
  
  - [ ] 23.4 Implement RBAC scope enforcement
    - Agents see only own metrics
    - Supervisors see team metrics
    - Admins see all metrics
    - Filter data based on user role and context
    - _Requirements: 7.8_
  
  - [ ] 23.5 Implement real-time data sources
    - queue_list: Live interaction queue from Interaction Service
    - agent_status_grid: Live agent status from Agent Service
    - WebSocket updates for real-time widgets
    - _Requirements: 8.7_
  
  - [ ]* 23.6 Write unit tests for DashboardService
    - Test CRUD operations
    - Test metric aggregation
    - Test RBAC scope enforcement
    - Test caching logic
    - Test widget data queries
    - Target: 15 tests passing
    - _Requirements: 17.1_


- [ ] 24. Implement Dashboard WebSocket Gateway for real-time updates
  - [ ] 24.1 Implement DashboardWebSocketGateway
    - WebSocket channel: /ws/dashboards/{dashboardId}/metrics
    - Subscribe clients to dashboard updates
    - Push metric updates when data changes
    - Handle connection/disconnection
    - Automatic reconnection support
    - _Requirements: 7.6, 7.7_
  
  - [ ] 24.2 Implement Kafka consumer for real-time metric updates
    - Subscribe to interaction-events, ticket-events, agent-events
    - Update affected dashboard widgets
    - Push updates via WebSocket with < 100ms latency
    - _Requirements: 7.6, 14.7_
  
  - [ ]* 24.3 Write integration tests for WebSocket gateway
    - Test client subscription
    - Test metric push
    - Test connection handling
    - Target: 5 tests passing
    - _Requirements: 17.2, 17.5_

- [ ] 25. Implement Dashboard Service API endpoints
  - [ ] 25.1 Implement DashboardController with all endpoints
    - GET /api/v1/dashboards - List accessible dashboards
    - GET /api/v1/dashboards/{id} - Get dashboard config
    - GET /api/v1/dashboards/{id}/data - Get all widget data
    - PUT /api/v1/dashboards/{id}/personal - Customize personal dashboard
    - GET /api/v1/admin/dashboards/data-sources - List available data sources
    - POST /api/v1/admin/dashboards - Create dashboard
    - PUT /api/v1/admin/dashboards/{id} - Update dashboard
    - DELETE /api/v1/admin/dashboards/{id} - Delete dashboard
    - _Requirements: 7.3, 7.4, 7.9, 8.8, 9.9_
  
  - [ ] 25.2 Implement RBAC guards for dashboard endpoints
    - dashboard:read permission for GET endpoints
    - dashboard:write permission for POST/PUT/DELETE endpoints
    - Admin role required for admin endpoints
    - _Requirements: 7.8_
  
  - [ ] 25.3 Implement request validation with class-validator
    - Validate dashboard configuration
    - Validate widget configurations (max 20 widgets per dashboard)
    - Validate data sources and filters
    - Validate time ranges
    - _Requirements: 8.9, 9.10_
  
  - [ ] 25.4 Implement audit logging for dashboard access
    - Log all dashboard views to Audit Service (category: dashboard-access)
    - Log all dashboard configuration changes
    - _Requirements: 8.10, 14.3_
  
  - [ ]* 25.5 Write integration tests for Dashboard Service API
    - Test all endpoints with valid/invalid inputs
    - Test RBAC enforcement
    - Test widget data aggregation
    - Test personal dashboard customization
    - Target: 10 tests passing
    - _Requirements: 17.2_


- [ ]* 26. Write property-based tests for Dashboard Service
  - [ ]* 26.1 Property 28: Dashboard widget data caching
    - Generate random widget data requests
    - Verify cached results returned within TTL
    - 100 iterations with fast-check
    - **Property 28: Dashboard widget data caching**
    - **Validates: Requirements 7.5**
  
  - [ ]* 26.2 Property 30: Dashboard RBAC scope enforcement
    - Generate random users with different roles
    - Verify data filtered by role scope
    - 100 iterations with fast-check
    - **Property 30: Dashboard RBAC scope enforcement**
    - **Validates: Requirements 7.8**
  
  - [ ]* 26.3 Property 32: Dashboard widget configuration validation
    - Generate random widget configurations
    - Verify invalid configurations rejected
    - 100 iterations with fast-check
    - **Property 32: Dashboard widget configuration validation**
    - **Validates: Requirements 8.9**

- [ ] 27. Configure Kong API Gateway for Dashboard Service
  - Add routes for all Dashboard Service endpoints
  - Configure rate limiting: 100 req/min default, 30 req/min for admin endpoints
  - Configure CORS for Agent Desktop and Admin Module
  - Configure JWT validation
  - _Requirements: 15.8, 15.9_

- [ ] 28. Checkpoint - Verify Dashboard Service integration
  - Ensure all tests pass (entity + service + integration + property tests)
  - Verify Redis connection for caching
  - Verify WebSocket gateway for real-time updates
  - Verify metric aggregation from object services
  - Verify RBAC scope enforcement
  - Verify Kafka event consumption for real-time updates
  - Verify audit logging to Audit Service
  - Test dashboard creation and widget data retrieval via API
  - Ensure all tests pass, ask the user if questions arise.



### Sprint 17: Report Service (MS-18)

- [ ] 29. Set up Report Service project structure and core interfaces
  - Create NestJS service scaffold in services/report-service
  - Configure TypeORM with report_db connection
  - Set up Superset API client
  - Define core interfaces: Report, ReportSchedule, GuestToken
  - Configure environment variables for Superset connection
  - _Requirements: 10.1, 10.2_

- [ ] 30. Create TypeORM migrations for Report Service database schema
  - [ ] 30.1 Create reports table migration
    - Fields: id, tenant_id, name, description, superset_chart_id, superset_dashboard_id, category, role_restrictions, is_active, created_by
    - Indexes: tenant_id, category, is_active (partial index)
    - Check constraint: either superset_chart_id or superset_dashboard_id must be set, not both
    - _Requirements: 10.1, 18.4_
  
  - [ ] 30.2 Create report_schedules table migration
    - Fields: id, report_id, cron_expression, recipients, format, is_active, last_run_at, next_run_at
    - Indexes: report_id, next_run_at (partial index for is_active)
    - Foreign key: report_id references reports
    - Format enum: pdf, excel, csv
    - _Requirements: 10.10, 18.4_
  
  - [ ] 30.3 Create report_access_log table migration
    - Fields: id, report_id, user_id, guest_token_hash, accessed_at, ip_address, user_agent
    - Indexes: report_id, user_id, accessed_at
    - Foreign key: report_id references reports
    - _Requirements: 10.9, 18.4_

- [ ] 31. Implement Report Service entity models
  - [ ] 31.1 Implement ReportEntity with TypeORM decorators
    - JSONB field: roleRestrictions
    - Check constraint for superset IDs
    - Relationship: OneToMany with ReportSchedule
    - _Requirements: 10.1_
  
  - [ ] 31.2 Implement ReportScheduleEntity with TypeORM decorators
    - Relationship: ManyToOne with Report
    - Cron expression validation
    - Recipients array validation (email format)
    - _Requirements: 10.10, 11.5_
  
  - [ ] 31.3 Implement ReportAccessLogEntity with TypeORM decorators
    - Relationship: ManyToOne with Report
    - Guest token hash for audit trail
    - _Requirements: 10.9_
  
  - [ ]* 31.4 Write unit tests for Report Service entities
    - Test entity creation and validation
    - Test check constraints
    - Test relationships
    - Target: 5 tests passing
    - _Requirements: 17.1_


- [ ] 32. Implement Superset integration and guest token generation
  - [ ] 32.1 Implement SupersetApiClient for REST API communication
    - HTTP client for Superset REST API
    - Authenticate with Superset admin credentials
    - Query charts and dashboards metadata
    - Configure RLS policies per tenant
    - Retry logic with exponential backoff
    - _Requirements: 10.2, 10.8_
  
  - [ ] 32.2 Implement GuestTokenGenerator
    - Generate Superset guest tokens with 5-minute expiration
    - Include RLS claims: tenantId, userId, roles
    - Single-use validation (token invalidated after first use)
    - Store token hash in report_access_log for audit
    - _Requirements: 10.4, 10.5, 15.3_
  
  - [ ] 32.3 Implement RLS policy configuration
    - Configure Superset RLS policies matching CRM tenant restrictions
    - Ensure RLS policies filter data by tenant_id
    - Validate RLS policy consistency with CRM role restrictions
    - _Requirements: 10.8, 15.7_
  
  - [ ]* 32.4 Write unit tests for Superset integration
    - Test guest token generation and expiration
    - Test RLS claims inclusion
    - Test Superset API client with mock responses
    - Test RLS policy configuration
    - Target: 8 tests passing
    - _Requirements: 17.1, 17.6_

- [ ] 33. Implement Report Service business logic
  - [ ] 33.1 Implement ReportService with CRUD operations
    - Create report with Superset chart/dashboard ID
    - Update report metadata and permissions
    - Delete report (soft delete if has access logs)
    - List reports accessible to user based on role
    - Get report by ID with metadata
    - Validate Superset chart/dashboard IDs exist before saving
    - _Requirements: 10.3, 11.1, 11.2, 11.3, 11.9_
  
  - [ ] 33.2 Implement scheduled report delivery
    - Cron job for scheduled report execution
    - Generate report in specified format (PDF, Excel, CSV)
    - Send email with report attachment
    - Retry with exponential backoff on failure
    - Update last_run_at and next_run_at timestamps
    - _Requirements: 10.10, 11.5, 11.8_
  
  - [ ] 33.3 Implement audit logging for report access
    - Log all report views to Audit Service (category: report-access)
    - Log all report configuration changes (category: configuration-change)
    - Store guest token hash in report_access_log
    - _Requirements: 10.9, 11.10, 14.4_
  
  - [ ]* 33.4 Write unit tests for ReportService
    - Test CRUD operations
    - Test guest token generation
    - Test scheduled report delivery
    - Test RLS policy enforcement
    - Target: 12 tests passing
    - _Requirements: 17.1_


- [ ] 34. Implement Report Service API endpoints
  - [ ] 34.1 Implement ReportController with all endpoints
    - GET /api/v1/reports - List accessible reports with category filter
    - GET /api/v1/reports/{id} - Get report metadata
    - GET /api/v1/reports/{id}/embed-token - Generate Superset guest token
    - POST /api/v1/admin/reports - Create report
    - PUT /api/v1/admin/reports/{id} - Update report
    - DELETE /api/v1/admin/reports/{id} - Delete report
    - PUT /api/v1/admin/reports/{id}/permissions - Update permissions
    - POST /api/v1/admin/reports/{id}/schedule - Configure scheduled delivery
    - _Requirements: 10.3, 10.4, 11.1, 11.2, 11.6, 11.7, 11.8_
  
  - [ ] 34.2 Implement RBAC guards for report endpoints
    - report:read permission for GET endpoints
    - report:write permission for POST/PUT/DELETE endpoints
    - Admin role required for admin endpoints
    - Filter reports by roleRestrictions
    - _Requirements: 10.3_
  
  - [ ] 34.3 Implement request validation with class-validator
    - Validate report configuration
    - Validate Superset chart/dashboard IDs
    - Validate cron expressions for schedules
    - Validate email addresses for recipients
    - _Requirements: 11.9_
  
  - [ ]* 34.4 Write integration tests for Report Service API
    - Test all endpoints with valid/invalid inputs
    - Test RBAC enforcement
    - Test guest token generation
    - Test scheduled report configuration
    - Target: 10 tests passing
    - _Requirements: 17.2, 17.6_

- [ ]* 35. Write property-based tests for Report Service
  - [ ]* 35.1 Property 34: Superset guest token expiration
    - Generate random guest tokens
    - Verify expiration exactly 5 minutes after generation
    - 100 iterations with fast-check
    - **Property 34: Superset guest token expiration**
    - **Validates: Requirements 10.5**
  
  - [ ]* 35.2 Property 43: Guest token with RLS claims
    - Generate random tokens with RLS claims
    - Verify expiration and claims included
    - 100 iterations with fast-check
    - **Property 43: Guest token expiration with RLS claims**
    - **Validates: Requirements 15.3**
  
  - [ ]* 35.3 Property 48: API rate limiting
    - Generate requests exceeding rate limit
    - Verify HTTP 429 returned after limit
    - 100 iterations with fast-check
    - **Property 48: API rate limiting**
    - **Validates: Requirements 15.8**

- [ ] 36. Configure Kong API Gateway for Report Service
  - Add routes for all Report Service endpoints
  - Configure rate limiting: 100 req/min default, 30 req/min for admin endpoints
  - Configure CORS for Agent Desktop and Admin Module
  - Configure JWT validation
  - _Requirements: 15.8, 15.9_

- [ ] 37. Checkpoint - Verify Report Service integration
  - Ensure all tests pass (entity + service + integration + property tests)
  - Verify Superset API connection and guest token generation
  - Verify RLS policy configuration
  - Verify scheduled report delivery
  - Verify audit logging to Audit Service
  - Test report viewing with guest token via API
  - Ensure all tests pass, ask the user if questions arise.



### Sprint 18: Frontend Components, Data Warehouse, and Final Integration

- [ ] 38. Implement Admin Module - Workflow Designer
  - [ ] 38.1 Create WorkflowDesignerPage component with React Flow
    - React Flow canvas for visual workflow design
    - Drag-and-drop step palette with 18 step types
    - Step configuration side panel
    - Trigger configuration modal
    - Workflow testing panel with sample data input
    - Export/import workflow JSON
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5_
  
  - [ ] 38.2 Create WorkflowListPage component
    - Table view of all workflows
    - Filters: isActive, triggerType
    - Actions: Edit, Test, Activate/Deactivate, Delete
    - Workflow execution history modal
    - _Requirements: 13.1_
  
  - [ ] 38.3 Create step configuration components
    - ConditionStepConfig: Visual condition builder
    - NotificationStepConfig: Notification template editor
    - EmailStepConfig: Email template editor with variables
    - UpdateObjectStepConfig: Field selector and value editor
    - AssignAgentStepConfig: Agent selection criteria
    - WebhookStepConfig: URL, method, headers, body editor
    - _Requirements: 13.6, 13.7_
  
  - [ ]* 38.4 Write E2E tests for Workflow Designer
    - Test workflow creation and configuration
    - Test workflow testing with sample data
    - Test workflow activation
    - Target: 5 tests passing
    - _Requirements: 17.8_

- [ ] 39. Implement Admin Module - Dashboard Designer
  - [ ] 39.1 Create DashboardDesignerPage component
    - 12-column grid canvas with drag-and-drop
    - Widget library with 12 widget types
    - Widget configuration side panel
    - Dashboard preview with live data
    - Role assignment modal
    - Refresh interval selector
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7, 9.8_
  
  - [ ] 39.2 Create DashboardListPage component
    - Card view of all dashboards
    - Filters: type (personal/team/department/system)
    - Actions: Edit, Preview, Duplicate, Delete
    - Dashboard assignment management
    - _Requirements: 9.1_
  
  - [ ] 39.3 Create widget configuration components
    - MetricCardConfig: Data source, filters, thresholds
    - ChartConfig: Chart type, data source, groupBy, timeRange
    - TableConfig: Columns, filters, sorting
    - GaugeConfig: Data source, min/max, thresholds
    - _Requirements: 9.4_
  
  - [ ]* 39.4 Write E2E tests for Dashboard Designer
    - Test dashboard creation and widget configuration
    - Test dashboard preview
    - Test role assignment
    - Target: 5 tests passing
    - _Requirements: 17.9_


- [ ] 40. Implement Admin Module - Enrichment Source Configuration
  - [ ] 40.1 Create EnrichmentSourceListPage component
    - Table view of all enrichment sources
    - Filters: type (REST/SOAP/GraphQL/database), isActive
    - Actions: Edit, Test, Activate/Deactivate, Delete
    - Test connectivity button with response time display
    - _Requirements: 6.1_
  
  - [ ] 40.2 Create EnrichmentSourceFormPage component
    - Source type selector (REST/SOAP/GraphQL/database)
    - Connection configuration form (baseUrl, headers, queryParams)
    - Authentication configuration (API key, OAuth2, Basic, mTLS)
    - Field mapping editor with JSONPath and JSONata support
    - Cache policy configuration
    - Rate limiting configuration
    - Test connectivity panel
    - _Requirements: 6.2, 6.3, 6.5, 6.6, 6.7_
  
  - [ ] 40.3 Create FieldMappingEditor component
    - Source field input with JSONPath syntax highlighting
    - Target object type selector (from Object Schema Service)
    - Target field name selector (from Object Schema Service)
    - JSONata transform editor with syntax validation
    - Preview panel showing sample transformation
    - _Requirements: 6.3_

- [ ] 41. Implement Admin Module - Report Configuration
  - [ ] 41.1 Create ReportListPage component
    - Card view of all reports
    - Filters: category
    - Actions: Edit, View, Schedule, Delete
    - Report permissions editor
    - _Requirements: 11.1_
  
  - [ ] 41.2 Create ReportFormPage component
    - Superset chart/dashboard selector (from Superset API)
    - Report metadata editor (name, description, category)
    - Role restrictions selector
    - Schedule configuration (cron expression, recipients, format)
    - Preview button to generate guest token and view report
    - _Requirements: 11.2, 11.3, 11.4, 11.5_
  
  - [ ] 41.3 Create ReportScheduleModal component
    - Cron expression builder with visual interface
    - Recipient email list editor
    - Format selector (PDF, Excel, CSV)
    - Next run time preview
    - Test delivery button
    - _Requirements: 11.5_


- [ ] 42. Implement Agent Desktop - Dashboard View
  - [ ] 42.1 Create DashboardPage component
    - Grid layout with responsive columns
    - Widget rendering based on type
    - WebSocket connection for real-time updates
    - Auto-refresh based on dashboard refreshInterval
    - Loading skeletons for widgets
    - Error indicators with retry buttons
    - _Requirements: 7.7_
  
  - [ ] 42.2 Create widget components (12 types)
    - MetricCardWidget: Large number with trend indicator and threshold colors
    - LineChartWidget: Time-series chart with multiple series
    - BarChartWidget: Horizontal/vertical bars with grouping
    - PieChartWidget: Pie chart with legend
    - DonutChartWidget: Donut chart with center metric
    - TableWidget: Sortable table with pagination
    - QueueListWidget: Live interaction queue with status indicators
    - AgentStatusGridWidget: Grid of agent avatars with status colors
    - SlaGaugeWidget: Circular gauge with warning/critical thresholds
    - HeatmapWidget: Calendar heatmap for time-based metrics
    - LeaderboardWidget: Ranked list with scores
    - TickerWidget: Scrolling ticker with latest updates
    - _Requirements: 7.2_
  
  - [ ] 42.3 Create useDashboardWebSocket hook
    - WebSocket connection to /ws/dashboards/{dashboardId}/metrics
    - Automatic reconnection with exponential backoff
    - Message parsing and widget data updates
    - Connection status indicator
    - _Requirements: 7.7_
  
  - [ ]* 42.4 Write E2E tests for Dashboard View
    - Test dashboard loading and widget rendering
    - Test real-time updates via WebSocket
    - Test auto-refresh
    - Target: 5 tests passing
    - _Requirements: 17.9_

- [ ] 43. Implement Agent Desktop - Report View
  - [ ] 43.1 Create ReportPage component
    - Report list with category filters
    - Report card with name, description, category
    - Click to open report in modal
    - _Requirements: 10.3_
  
  - [ ] 43.2 Create ReportViewerModal component
    - Full-screen modal with Superset iframe
    - Guest token generation on open
    - Automatic token refresh before expiration
    - Loading indicator while token generates
    - Error handling for token generation failures
    - Close button to exit report view
    - _Requirements: 10.6_
  
  - [ ] 43.3 Create useGuestToken hook
    - Fetch guest token from Report Service
    - Monitor token expiration (5 minutes)
    - Automatically refresh token at 4 minutes
    - Handle token refresh failures
    - _Requirements: 10.5_
  
  - [ ]* 43.4 Write E2E tests for Report View
    - Test report list and filtering
    - Test report viewing with guest token
    - Test automatic token refresh
    - Target: 5 tests passing
    - _Requirements: 17.10_


- [ ] 44. Implement Agent Desktop - Progressive Loading Enhancements
  - [ ] 44.1 Create useProgressiveLoading hook
    - Fetch local data immediately
    - Subscribe to WebSocket channel /ws/objects/{objectType}/{objectId}/fields
    - Update enrichment fields as they arrive via WebSocket
    - Handle errors and retries
    - _Requirements: 5.4, 5.5, 5.6_
  
  - [ ] 44.2 Create EnrichmentFieldDisplay component
    - Render field value or skeleton based on enrichmentStatus
    - Shimmer animation for loading state
    - Error indicator with retry button for error state
    - Smooth transition from skeleton to value
    - _Requirements: 5.6, 5.7, 5.8_
  
  - [ ] 44.3 Update CustomerProfilePage with progressive loading
    - Use useProgressiveLoading hook
    - Render EnrichmentFieldDisplay for enrichment fields
    - Display loading timeout indicator if enrichment exceeds 5 seconds
    - _Requirements: 5.1, 5.2, 5.3, 5.9_
  
  - [ ]* 44.4 Write E2E tests for progressive loading
    - Test customer profile load with enrichment
    - Verify local data loads < 200ms
    - Verify enrichment fields show loading status
    - Verify WebSocket push updates UI
    - Verify complete flow within 5 seconds
    - Target: 5 tests passing
    - _Requirements: 17.7_

- [ ] 45. Create Data Warehouse and Materialized Views
  - [ ] 45.1 Set up data warehouse database or read replica
    - Configure separate database for BI reporting
    - Set up replication from production databases
    - Configure PostgreSQL RLS policies for tenant isolation
    - _Requirements: 12.1, 12.9_
  
  - [ ] 45.2 Create materialized view: mv_interactions_daily
    - Aggregate interactions by date, channel, status
    - Include: count, avg_duration, sla_met_count, sla_breached_count, sla_compliance_rate
    - Create indexes on date and tenant_id
    - _Requirements: 12.2, 12.6_
  
  - [ ] 45.3 Create materialized view: mv_agent_performance
    - Aggregate agent metrics by date
    - Include: interactions_handled, avg_handle_time, avg_satisfaction_rating, sla_compliance_rate
    - Create indexes on date and agent_id
    - _Requirements: 12.2, 12.7_
  
  - [ ] 45.4 Create materialized view: mv_ticket_metrics
    - Aggregate tickets by date, category, priority, status
    - Include: count, avg_resolution_time
    - Create indexes on date and tenant_id
    - _Requirements: 12.2, 12.8_
  
  - [ ] 45.5 Create materialized view: mv_sla_compliance
    - Aggregate SLA compliance by date, channel, type
    - Include: total_interactions, sla_met, sla_breached, compliance_rate
    - Create indexes on date and tenant_id
    - _Requirements: 12.2_
  
  - [ ] 45.6 Implement materialized view refresh job
    - Cron job to refresh all views every 15 minutes
    - Log refresh duration and row counts
    - Alert if refresh takes > 5 minutes
    - _Requirements: 12.3_
  
  - [ ] 45.7 Configure Superset to connect to data warehouse
    - Add data warehouse as Superset data source
    - Configure connection with read-only credentials
    - Verify Superset can query materialized views
    - _Requirements: 12.4_
  
  - [ ] 45.8 Document materialized view schemas
    - Update database schema registry with view definitions
    - Document refresh schedule and dependencies
    - _Requirements: 12.10_


- [ ] 46. Security Hardening for Phase 3 Services
  - [ ] 46.1 Implement HashiCorp Vault integration for Workflow Service
    - Store workflow credentials in Vault
    - Vault path: secret/workflows/{workflowId}/credentials
    - Retrieve credentials during activity execution
    - Test credential storage and retrieval
    - _Requirements: 15.1_
  
  - [ ] 46.2 Verify AES-256-GCM encryption for enrichment credentials
    - Test credential encryption before database storage
    - Test credential decryption when making API calls
    - Verify unique IV per encryption
    - Verify authentication tag validation
    - _Requirements: 15.2_
  
  - [ ] 46.3 Verify Superset guest token security
    - Test 5-minute expiration enforcement
    - Test RLS claims inclusion (tenantId, userId, roles)
    - Test single-use validation
    - Test token hash storage in report_access_log
    - _Requirements: 15.3_
  
  - [ ] 46.4 Verify RBAC enforcement across all Phase 3 services
    - Test dashboard RBAC scope (agents see own, supervisors see team)
    - Test workflow permissions (workflow:read, workflow:write)
    - Test enrichment permissions (enrichment:read, enrichment:write)
    - Test report permissions (report:read, report:write)
    - _Requirements: 15.4_
  
  - [ ] 46.5 Verify audit logging for all Phase 3 operations
    - Test workflow execution logging (category: workflow-execution, sensitivity: high)
    - Test enrichment request logging (category: external-system-access)
    - Test dashboard access logging (category: dashboard-access)
    - Test report access logging (category: report-access)
    - Test configuration change logging (category: configuration-change)
    - _Requirements: 15.5, 15.6_
  
  - [ ] 46.6 Verify rate limiting on all Phase 3 endpoints
    - Test 100 req/min default rate limit
    - Test 30 req/min admin endpoint rate limit
    - Test HTTP 429 response when limit exceeded
    - Test rate limit headers in responses
    - _Requirements: 15.8_
  
  - [ ] 46.7 Verify JWT validation on all Phase 3 endpoints
    - Test RS256 signature verification
    - Test token expiration checking
    - Test HTTP 401 for invalid/expired tokens
    - _Requirements: 15.9_
  
  - [ ] 46.8 Verify mTLS between Phase 3 services
    - Test Istio service mesh mTLS enforcement
    - Test certificate rotation
    - Test service-to-service authentication
    - _Requirements: 14.10, 15.9_
  
  - [ ]* 46.9 Run OWASP Top 10 security scan
    - Scan all Phase 3 services for vulnerabilities
    - Verify zero critical vulnerabilities
    - Document and fix any medium/low vulnerabilities
    - _Requirements: 17.12_


- [ ] 47. Performance Testing and Optimization
  - [ ] 47.1 Test Workflow Service performance
    - Test workflow step execution: P99 < 500ms (excluding external API calls and wait steps)
    - Test 100 concurrent workflow executions without degradation
    - Test Kafka event consumption throughput
    - Optimize slow queries and bottlenecks
    - _Requirements: 16.1, 16.6_
  
  - [ ] 47.2 Test Data Enrichment Service performance
    - Test enrichment request processing: P99 < 2s (webhook to WebSocket)
    - Test 50 concurrent enrichment requests with parallel external API calls
    - Test Redis caching effectiveness
    - Test OAuth2 token refresh performance
    - Optimize slow queries and bottlenecks
    - _Requirements: 16.2, 16.7_
  
  - [ ] 47.3 Test Dashboard Service performance
    - Test cached widget data serving: P99 < 1s
    - Test WebSocket metric push latency: < 100ms
    - Test 500 concurrent dashboard viewers with real-time updates
    - Test metric aggregation performance
    - Optimize slow queries and bottlenecks
    - _Requirements: 16.3, 16.5, 16.8_
  
  - [ ] 47.4 Test Report Service performance
    - Test guest token generation: P99 < 100ms
    - Test 100 concurrent report viewers with Superset embedding
    - Test Superset API client performance
    - Optimize slow queries and bottlenecks
    - _Requirements: 16.4, 16.9_
  
  - [ ] 47.5 Test progressive loading performance
    - Test local data response time: < 200ms
    - Test complete progressive loading: within 5 seconds
    - Test WebSocket push latency
    - Optimize slow queries and bottlenecks
    - _Requirements: 16.10_
  
  - [ ] 47.6 Run load tests with 500 concurrent users
    - Simulate realistic user behavior across all Phase 3 features
    - Monitor resource usage (CPU, memory, database connections)
    - Verify all performance targets met under load
    - Document performance test results
    - _Requirements: 17.11_

- [ ] 48. Final Integration and E2E Testing
  - [ ]* 48.1 E2E test: Complete progressive loading flow
    - Agent opens customer profile
    - Verify local data loads < 200ms
    - Verify enrichment fields show loading status
    - Verify WebSocket connection established
    - Verify enriched data arrives within 5 seconds
    - Verify UI updates without page reload
    - _Requirements: 17.7_
  
  - [ ]* 48.2 E2E test: Workflow creation and execution
    - Admin creates workflow in Workflow Designer
    - Configure trigger (event-based)
    - Add steps (send_notification, update_object)
    - Test workflow with sample data
    - Activate workflow
    - Trigger workflow via Kafka event
    - Verify workflow execution in Temporal UI
    - Verify side effects (notification sent, object updated)
    - _Requirements: 17.8_
  
  - [ ]* 48.3 E2E test: Dashboard real-time updates
    - Agent opens dashboard
    - Verify widgets load with cached data
    - Create new interaction
    - Verify dashboard widget updates via WebSocket
    - Verify metric count incremented
    - Verify update latency < 100ms
    - _Requirements: 17.9_
  
  - [ ]* 48.4 E2E test: Report viewing
    - Agent clicks report in navigation
    - Verify guest token generated
    - Verify Superset iframe embedded
    - Verify report loads with RLS applied
    - Verify token expires after 5 minutes
    - Verify automatic token refresh
    - _Requirements: 17.10_


- [ ] 49. Documentation and Deployment Preparation
  - [ ] 49.1 Update API documentation
    - Generate OpenAPI specs from NestJS decorators for all Phase 3 services
    - Document all API endpoints with request/response examples
    - Document WebSocket channels and message formats
    - Document Kafka event schemas
    - _Requirements: All_
  
  - [ ] 49.2 Create admin user guides
    - Workflow Designer guide with screenshots
    - Dashboard Designer guide with widget configuration examples
    - Enrichment Source Configuration guide
    - Report Configuration guide
    - _Requirements: All_
  
  - [ ] 49.3 Create agent user guides
    - Dashboard View guide
    - Report View guide
    - Progressive Loading explanation
    - _Requirements: All_
  
  - [ ] 49.4 Create operations runbook
    - Service deployment procedures
    - Temporal workflow monitoring
    - Superset administration
    - Data warehouse maintenance
    - Materialized view refresh troubleshooting
    - Incident response procedures
    - _Requirements: All_
  
  - [ ] 49.5 Update environment configuration
    - Add Phase 3 service environment variables to .env.example
    - Document Temporal connection settings
    - Document Superset connection settings
    - Document HashiCorp Vault settings
    - _Requirements: All_
  
  - [ ] 49.6 Create database migration scripts
    - Consolidate all Phase 3 migrations
    - Create rollback scripts
    - Document migration order and dependencies
    - _Requirements: 18.1, 18.2, 18.3, 18.4_
  
  - [ ] 49.7 Update Kong API Gateway configuration
    - Consolidate all Phase 3 route configurations
    - Document rate limiting policies
    - Document CORS configurations
    - _Requirements: 15.8_

- [ ] 50. Final Checkpoint - Phase 3 Complete
  - Verify all 4 services deployed and healthy
  - Verify all 4 databases created and migrated
  - Verify Temporal server configured and connected
  - Verify Apache Superset configured with RLS policies
  - Verify HashiCorp Vault configured with workflow credentials
  - Verify Kong routes configured for all endpoints
  - Verify Istio mTLS enabled for all services
  - Verify materialized views created and refreshing
  - Verify Admin Module deployed with all designers
  - Verify Agent Desktop updated with dashboard/report views
  - Verify all tests passing (unit, property, integration, E2E)
  - Verify load testing completed with acceptable performance
  - Verify security scanning completed with zero critical vulnerabilities
  - Verify documentation updated (API docs, admin guides, user guides)
  - Verify runbook created for operations team
  - **Phase 3 is complete and ready for Go-Live 3**
  - Ensure all tests pass, ask the user if questions arise.

---

## Notes

- Tasks marked with `*` are optional testing tasks and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties with 100 iterations each
- Unit tests validate specific examples and edge cases
- Integration tests validate API endpoints and external integrations
- E2E tests validate complete user flows
- Load tests validate performance under realistic load

## Test Coverage Summary

**Unit Tests:**
- Workflow Service: 32 tests (5 entity + 15 service + 12 workflow/activity)
- Data Enrichment Service: 20 tests (5 entity + 15 service)
- Dashboard Service: 20 tests (5 entity + 15 service)
- Report Service: 25 tests (5 entity + 12 service + 8 Superset)
- **Total: 97 unit tests**

**Property Tests:**
- Workflow Service: 5 properties × 100 iterations = 500 test cases
- Data Enrichment Service: 4 properties × 100 iterations = 400 test cases
- Dashboard Service: 3 properties × 100 iterations = 300 test cases
- Report Service: 3 properties × 100 iterations = 300 test cases
- **Total: 15 properties, 1,500 test cases**

**Integration Tests:**
- Workflow Service: 15 tests (10 API + 5 Kafka)
- Data Enrichment Service: 13 tests (8 API + 5 progressive loading)
- Dashboard Service: 15 tests (10 API + 5 WebSocket)
- Report Service: 10 tests (API)
- **Total: 53 integration tests**

**E2E Tests:**
- Workflow Designer: 5 tests
- Dashboard Designer: 5 tests
- Dashboard View: 5 tests
- Report View: 5 tests
- Progressive Loading: 5 tests
- Final Integration: 4 tests
- **Total: 29 E2E tests**

**Grand Total: 97 unit + 53 integration + 29 E2E = 179 tests + 1,500 property test cases**

## Exit Criteria

- [ ] All 4 Phase 3 services operational (MS-15, MS-16, MS-17, MS-18)
- [ ] All 4 databases created and migrated (workflow_db, enrichment_db, dashboard_db, report_db)
- [ ] Temporal integration working with workflow execution
- [ ] Apache Superset integration working with guest tokens
- [ ] Progressive loading working with WebSocket updates
- [ ] Real-time dashboards working with WebSocket updates
- [ ] Data warehouse with materialized views refreshing every 15 minutes
- [ ] Admin Module deployed with all 4 designers (Workflow, Dashboard, Enrichment, Report)
- [ ] Agent Desktop updated with Dashboard View and Report View
- [ ] All tests passing: 179 tests + 1,500 property test cases
- [ ] Unit test coverage ≥ 70% for all Phase 3 services
- [ ] Load testing completed: 500 concurrent users with acceptable performance
- [ ] Security scanning completed: Zero critical vulnerabilities
- [ ] API documentation updated for all Phase 3 endpoints
- [ ] User guides created for admins and agents
- [ ] Operations runbook created
- [ ] Ready for Go-Live 3: Full CRM Platform with automation, enrichment, dashboards, and BI reporting

