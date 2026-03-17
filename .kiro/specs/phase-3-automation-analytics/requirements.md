# Requirements Document

## Introduction

Phase 3: Automation & Analytics completes the TPB CRM Platform by implementing the final 4 microservices that enable workflow automation, external data enrichment, real-time dashboards, and embedded BI reporting. This phase transforms the platform from a feature-rich CRM system into a fully automated, data-driven enterprise platform.

**Phase 1 Foundation (Complete):**
- 6 operational services: Identity (MS-1), Agent (MS-2), Interaction (MS-3), Customer (MS-5), Ticket (MS-4), Notification (MS-6)
- 112/112 tests passing, all database schemas implemented
- Kong API Gateway configured with rate limiting and CORS
- Agent Desktop working with real backend APIs

**Phase 2 Advanced Features (Complete):**
- 8 operational services: Knowledge (MS-7), BFSI Core (MS-8), AI (MS-9), Media (MS-10), Audit (MS-11), Object Schema (MS-13), Layout (MS-14), CTI Adapter (MS-19)
- 62/62 tests passing, dynamic object support implemented
- Progressive loading infrastructure ready
- CTI adapter pattern established

**Phase 3 Goal:**
Implement 4 final services to enable Temporal-based workflow automation, progressive data enrichment from external sources, real-time analytics dashboards, and Apache Superset BI reporting integration.

**Go-Live 3 Milestone:**
Full CRM Platform with automation, enrichment, dashboards, and BI reporting capabilities.

## Glossary

- **System**: The TPB CRM Platform comprising 19 microservices and 2 frontend modules
- **Agent**: Customer service representative using the Agent Desktop
- **Admin**: System administrator using the Admin Module
- **Supervisor**: Team supervisor with access to team dashboards and reports
- **Workflow**: Automated business process executed by Temporal with event-driven or scheduled triggers
- **Workflow_Step**: Individual action or decision point within a workflow (18 types supported)
- **Temporal**: Durable workflow orchestration engine (self-hosted) for executing multi-step automations
- **Enrichment**: Process of fetching additional data from external sources (CBS, Credit Bureau) asynchronously
- **Enrichment_Source**: External system configuration for data fetching with field mappings and credentials
- **Progressive_Loading**: UI pattern showing local data immediately (<200ms) while fetching enrichment data asynchronously (<5s)
- **Dashboard**: Real-time metrics display with 12 widget types and WebSocket updates
- **Widget**: Dashboard component displaying metrics or data visualization (metric card, chart, table, gauge)
- **Report**: BI report created in Apache Superset and embedded in CRM with guest token authentication
- **Guest_Token**: Short-lived Superset authentication token (5-min expiration) for embedded reports
- **RLS**: Row-Level Security enforced in Superset to restrict data visibility per tenant and role
- **Data_Warehouse**: Read replica or separate database with materialized views for BI reporting
- **Workflow_Trigger**: Event, schedule, manual action, or webhook that starts a workflow execution
- **Activity**: Temporal activity worker that executes individual workflow steps (notify, email, update object)
- **Field_Mapping**: Configuration mapping external API response fields to CRM object schema fields


## Requirements

### Requirement 1: Temporal-Based Workflow Automation

**User Story:** As a system administrator, I want to create and manage automated workflows using a visual designer with Temporal backend execution, so that business processes run reliably without manual intervention.

#### Acceptance Criteria

1. THE Workflow_Service SHALL store workflow definitions in PostgreSQL with fields: id, name, description, isActive, version, trigger, steps, variables, errorHandling
2. THE Workflow_Service SHALL support 4 trigger types: event (Kafka), schedule (cron), manual, webhook
3. WHEN a Kafka event matches an active workflow trigger, THE Workflow_Service SHALL start a Temporal workflow execution with the event payload
4. THE Workflow_Service SHALL support 18 workflow step types: condition, switch, send_notification, send_email, send_sms, update_object, assign_agent, escalate_ticket, create_ticket, call_webhook, call_api, wait, wait_for_event, parallel, loop, ai_classify, ai_generate, and custom
5. THE Workflow_Service SHALL execute workflow steps as Temporal activities with timeout and retry policies
6. WHEN a workflow step fails, THE Workflow_Service SHALL apply the configured error handling strategy: retry, skip, fail_workflow, or compensate
7. THE Workflow_Service SHALL log all workflow executions with status: running, completed, failed, timed_out, cancelled
8. THE Workflow_Service SHALL provide admin endpoints for workflow CRUD operations with permissions: workflow:read, workflow:write
9. THE Workflow_Service SHALL support workflow testing with sample event data in sandbox mode without triggering real side effects
10. THE Workflow_Service SHALL support workflow import/export as JSON for migration between environments


### Requirement 2: Workflow Step Execution and Activities

**User Story:** As a workflow designer, I want workflow steps to execute reliably with proper error handling and logging, so that automated processes complete successfully or fail gracefully.

#### Acceptance Criteria

1. THE Workflow_Service SHALL implement Temporal activity workers for each step type with idempotent execution
2. WHEN a send_notification step executes, THE Activity SHALL call Notification Service POST /api/v1/notifications endpoint
3. WHEN a send_email step executes, THE Activity SHALL call Email Gateway with template rendering and attachment support
4. WHEN an update_object step executes, THE Activity SHALL call the appropriate object service PATCH endpoint with field updates
5. WHEN an assign_agent step executes, THE Activity SHALL query Agent Service for available agents matching criteria (skill, load, round-robin) and update the object
6. WHEN a wait step executes, THE Activity SHALL use Temporal timer for the specified duration without blocking workflow execution
7. WHEN a parallel step executes, THE Workflow SHALL execute all branches concurrently and wait for all to complete before proceeding
8. WHEN an ai_classify step executes, THE Activity SHALL call AI Service POST /api/v1/ai/classify endpoint and store the result in workflow variables
9. THE Workflow_Service SHALL enforce step timeout limits: default 30 seconds, configurable per step up to 5 minutes
10. THE Workflow_Service SHALL log all activity executions to Audit Service with category workflow-execution


### Requirement 3: Workflow Trigger Configuration

**User Story:** As a system administrator, I want to configure workflow triggers with conditions and filters, so that workflows execute only when specific criteria are met.

#### Acceptance Criteria

1. THE Workflow_Service SHALL support event-based triggers matching Kafka event types: ticket.created, sla.breached, interaction.assigned, customer.vip.detected, agent.status.changed
2. WHEN configuring an event trigger, THE Admin SHALL specify trigger conditions using field-operator-value expressions with operators: equals, not_equals, contains, gt, lt, in, not_in, matches
3. THE Workflow_Service SHALL support schedule-based triggers using cron expressions with validation
4. THE Workflow_Service SHALL support manual triggers accessible via POST /api/v1/admin/workflows/{id}/execute endpoint
5. THE Workflow_Service SHALL support webhook triggers with unique webhook paths: /api/v1/workflows/webhook/{workflowId}/{token}
6. WHEN multiple workflows match the same event, THE Workflow_Service SHALL execute all matching workflows independently
7. THE Workflow_Service SHALL deduplicate workflow executions using event ID + workflow ID to prevent double execution
8. THE Workflow_Service SHALL provide a pre-built SLA Breach Escalation workflow template that admins can activate and customize
9. THE Workflow_Service SHALL validate trigger configurations before saving and reject invalid cron expressions or event types
10. THE Workflow_Service SHALL log all workflow trigger matches to Audit Service with category workflow-trigger


### Requirement 4: Data Enrichment Service Architecture

**User Story:** As a system architect, I want a data enrichment service that fetches data from external sources asynchronously and delivers results via WebSocket, so that agents see local data immediately while enrichment completes in the background.

#### Acceptance Criteria

1. THE Data_Enrichment_Service SHALL store enrichment source configurations in PostgreSQL with fields: id, name, type, connectionConfig, fieldMappings, cachePolicy, rateLimiting, isActive
2. THE Data_Enrichment_Service SHALL support 4 source types: rest, soap, graphql, database
3. THE Data_Enrichment_Service SHALL encrypt enrichment source credentials using AES-256-GCM and store encrypted values in the database
4. THE Data_Enrichment_Service SHALL provide internal endpoint POST /internal/enrichment/request accepting objectType, objectId, sourceIds
5. WHEN an enrichment request is received, THE Service SHALL deduplicate requests using Redis lock with key enrich:{objectType}:{objectId}:{sourceId}
6. THE Data_Enrichment_Service SHALL query all specified enrichment sources in parallel with configured timeout (default 5 seconds)
7. THE Data_Enrichment_Service SHALL map external API response fields to CRM object fields using JSONPath expressions and JSONata transforms
8. WHEN enrichment completes, THE Service SHALL call webhook POST /api/v1/{objectType}/{id}/enrichment on the object service with enriched data
9. THE Data_Enrichment_Service SHALL cache enrichment results in Redis with configurable TTL (default 5 minutes) and support stale-while-revalidate
10. THE Data_Enrichment_Service SHALL log all enrichment requests and results to Audit Service with category external-system-access


### Requirement 5: Progressive Loading Implementation

**User Story:** As an agent, I want to see customer information load progressively with local data appearing immediately and enrichment data updating seamlessly, so that I can start working without waiting.

#### Acceptance Criteria

1. WHEN an agent opens a customer profile, THE Customer_Service SHALL return local fields with response time less than 200ms
2. THE Customer_Service SHALL mark enrichment fields with status: loading in the initial response
3. THE Customer_Service SHALL trigger enrichment request to Data_Enrichment_Service asynchronously after returning local data
4. THE Frontend SHALL subscribe to WebSocket channel /ws/objects/customer/{customerId}/fields upon loading the profile
5. WHEN enrichment data arrives via webhook, THE Customer_Service SHALL push object.fields.updated event via WebSocket
6. THE Frontend SHALL display skeleton placeholders with shimmer animation for fields with status: loading
7. THE Frontend SHALL replace skeleton placeholders with actual values without page reload or layout shift when WebSocket event arrives
8. WHEN an enrichment source fails, THE System SHALL display an error indicator with a Thử lại (retry) button
9. THE System SHALL complete progressive loading within 5 seconds for all enrichment sources
10. THE System SHALL support progressive loading for Customer, Ticket, Interaction, KBArticle, and BankProduct objects


### Requirement 6: Enrichment Source Configuration

**User Story:** As a system administrator, I want to configure external enrichment sources with field mappings and connection parameters, so that the CRM can fetch data from Core Banking System, Credit Bureau, and other external systems.

#### Acceptance Criteria

1. THE Data_Enrichment_Service SHALL provide admin endpoint GET /api/v1/admin/enrichment/sources listing all configured sources
2. THE Admin SHALL configure enrichment sources with fields: name, type, baseUrl, authType (api-key, oauth2, basic, mtls), credentials, timeout, retryPolicy
3. THE Admin SHALL configure field mappings with sourceField (JSONPath), targetObjectType, targetFieldName, transformExpression (JSONata)
4. THE Data_Enrichment_Service SHALL validate field mappings against object schemas from Object_Schema_Service
5. THE Admin SHALL configure cache policy with enabled flag, ttlSeconds, and staleWhileRevalidate option
6. THE Admin SHALL configure rate limiting with maxRequestsPerMinute and maxConcurrent settings
7. THE Data_Enrichment_Service SHALL provide endpoint POST /api/v1/admin/enrichment/sources/{id}/test for testing connectivity
8. WHEN testing an enrichment source, THE Service SHALL execute a sample query and return success/failure with response time
9. THE Data_Enrichment_Service SHALL support OAuth2 token refresh for enrichment sources with oauth2 authType
10. THE Data_Enrichment_Service SHALL log all enrichment source configuration changes to Audit Service with category configuration-change


### Requirement 7: Real-Time Dashboard Service

**User Story:** As an agent or supervisor, I want to view real-time dashboards with key performance metrics that update automatically, so that I can monitor performance without manual refresh.

#### Acceptance Criteria

1. THE Dashboard_Service SHALL store dashboard configurations in PostgreSQL with fields: id, name, type (personal, team, department, system), layout, refreshInterval, roleRestrictions
2. THE Dashboard_Service SHALL support 12 widget types: metric_card, line_chart, bar_chart, pie_chart, donut_chart, table, queue_list, agent_status_grid, sla_gauge, heatmap, leaderboard, ticker
3. THE Dashboard_Service SHALL provide endpoint GET /api/v1/dashboards returning dashboards accessible to the user based on role
4. THE Dashboard_Service SHALL provide endpoint GET /api/v1/dashboards/{id}/data returning all widget data for the dashboard
5. THE Dashboard_Service SHALL cache widget data in Redis with TTL matching the dashboard refreshInterval
6. THE Dashboard_Service SHALL publish metric updates to WebSocket channel /ws/dashboards/{dashboardId}/metrics when data changes
7. THE Frontend SHALL subscribe to dashboard WebSocket channel and update widgets in real-time without full page reload
8. THE Dashboard_Service SHALL enforce RBAC scope: agents see only own metrics, supervisors see team metrics, admins see all metrics
9. THE Dashboard_Service SHALL support personal dashboard customization via PUT /api/v1/dashboards/{id}/personal endpoint
10. THE Dashboard_Service SHALL aggregate metrics from Interaction, Ticket, Agent, and Customer services with P99 latency less than 1 second


### Requirement 8: Dashboard Widget Data Sources

**User Story:** As a dashboard designer, I want to configure widget data sources with filters and aggregations, so that widgets display relevant metrics for different roles and contexts.

#### Acceptance Criteria

1. THE Dashboard_Service SHALL support data sources: interaction_metrics, ticket_metrics, agent_metrics, customer_metrics, sla_metrics, queue_status
2. WHEN configuring a widget, THE Admin SHALL specify dataSource, filters (field-operator-value), groupBy field, and timeRange
3. THE Dashboard_Service SHALL support time ranges: today, yesterday, last_7_days, last_30_days, this_month, last_month, custom
4. THE Dashboard_Service SHALL support metric aggregations: count, sum, avg, min, max, percentile
5. THE Dashboard_Service SHALL support threshold configuration for metric_card and sla_gauge widgets with warning and critical levels
6. THE Dashboard_Service SHALL query object services for raw data and perform aggregations in-memory or via Redis
7. THE Dashboard_Service SHALL support real-time data sources: queue_list (live interaction queue), agent_status_grid (live agent status)
8. THE Dashboard_Service SHALL provide endpoint GET /api/v1/admin/dashboards/data-sources listing available data sources with schema
9. THE Dashboard_Service SHALL validate widget configurations before saving and reject invalid data sources or filters
10. THE Dashboard_Service SHALL log all dashboard data queries to Audit Service with category dashboard-access


### Requirement 9: Dashboard Designer (Admin Module)

**User Story:** As a system administrator, I want to design dashboards using a grid-based drag-and-drop interface, so that I can create custom dashboards for different roles without coding.

#### Acceptance Criteria

1. THE Admin_Module SHALL provide a Dashboard Designer screen with dashboard list, grid canvas, and widget library
2. THE Admin SHALL drag widgets from the library onto a 12-column grid canvas with automatic snap-to-grid
3. THE Admin SHALL resize widgets by dragging corner handles with minimum size: 2 columns wide, 2 rows tall
4. THE Admin SHALL configure widget properties: title, dataSource, filters, groupBy, timeRange, thresholds, displayOptions
5. THE Admin SHALL preview the dashboard with live data before saving
6. THE Admin SHALL assign dashboards to roles with roleRestrictions array
7. THE Admin SHALL set dashboard type: personal (user-specific), team (team-specific), department (department-specific), system (all users)
8. THE Admin SHALL set dashboard refreshInterval: 5s, 10s, 30s, 1m, 5m, or manual
9. THE Dashboard_Service SHALL provide endpoint POST /api/v1/admin/dashboards for creating dashboards
10. THE Dashboard_Service SHALL validate dashboard configurations and reject dashboards with more than 20 widgets


### Requirement 10: Apache Superset Integration

**User Story:** As a system architect, I want to integrate Apache Superset for BI reporting with guest token authentication, so that agents can view reports within the CRM without accessing Superset directly.

#### Acceptance Criteria

1. THE Report_Service SHALL store report metadata in PostgreSQL with fields: id, name, description, supersetChartId, supersetDashboardId, roleRestrictions
2. THE Report_Service SHALL communicate with Apache Superset via REST API for chart/dashboard CRUD operations
3. THE Report_Service SHALL provide endpoint GET /api/v1/reports returning reports accessible to the user based on role
4. THE Report_Service SHALL provide endpoint GET /api/v1/reports/{id}/embed-token generating a Superset guest token
5. THE Superset guest token SHALL expire in 5 minutes and include RLS claims: tenantId, userId, roles
6. THE Frontend SHALL embed Superset reports using iframe with Superset Embedded SDK and guest token authentication
7. THE Report_Service SHALL enforce that agents never access Superset UI directly, only through CRM embedding
8. THE Report_Service SHALL configure Superset RLS policies per tenant to restrict data visibility
9. THE Report_Service SHALL log all report access to Audit Service with category report-access
10. THE Report_Service SHALL support scheduled report delivery via email configured by admins


### Requirement 11: Report Configuration (Admin Module)

**User Story:** As a system administrator, I want to configure BI reports in the CRM Admin Module, so that I can manage report permissions and scheduling without accessing Superset directly.

#### Acceptance Criteria

1. THE Admin_Module SHALL provide a Report Configuration screen with report list, permissions editor, and schedule editor
2. THE Admin SHALL create reports by selecting Superset charts or dashboards from a dropdown populated via Superset API
3. THE Admin SHALL assign report permissions to roles with roleRestrictions array
4. THE Admin SHALL configure report metadata: name, description, category, icon
5. THE Admin SHALL schedule reports for periodic delivery with cron expression, recipients, and format (PDF, Excel, CSV)
6. THE Report_Service SHALL provide endpoint POST /api/v1/admin/reports for creating report configurations
7. THE Report_Service SHALL provide endpoint PUT /api/v1/admin/reports/{id}/permissions for updating permissions
8. THE Report_Service SHALL provide endpoint POST /api/v1/admin/reports/{id}/schedule for configuring scheduled delivery
9. THE Report_Service SHALL validate that Superset chart/dashboard IDs exist before saving report configuration
10. THE Report_Service SHALL log all report configuration changes to Audit Service with category configuration-change


### Requirement 12: Data Warehouse and Materialized Views

**User Story:** As a database administrator, I want a data warehouse with materialized views for BI reporting, so that Superset queries do not impact production database performance.

#### Acceptance Criteria

1. THE System SHALL maintain a read replica or separate data warehouse database for BI reporting
2. THE Data Warehouse SHALL contain materialized views: mv_interactions_daily, mv_sla_compliance, mv_agent_performance, mv_ticket_metrics
3. THE Materialized views SHALL refresh at least every 15 minutes via scheduled jobs
4. THE Superset SHALL connect to the data warehouse database, not the production database
5. THE Materialized views SHALL aggregate data from Interaction, Ticket, Agent, and Customer tables
6. THE mv_interactions_daily view SHALL include columns: date, channel, status, count, avg_duration, sla_met_count, sla_breached_count
7. THE mv_agent_performance view SHALL include columns: agent_id, date, interactions_handled, avg_handle_time, satisfaction_rating, sla_compliance_rate
8. THE mv_ticket_metrics view SHALL include columns: date, category, priority, status, count, avg_resolution_time
9. THE Data Warehouse SHALL enforce RLS at the database level using PostgreSQL policies based on tenant_id
10. THE System SHALL document materialized view schemas in the database schema registry


### Requirement 13: Workflow Designer (Admin Module)

**User Story:** As a system administrator, I want to design workflows using a visual drag-and-drop canvas with React Flow, so that I can create complex automations without writing code.

#### Acceptance Criteria

1. THE Admin_Module SHALL provide a Workflow Designer screen with workflow list, React Flow canvas, and step palette
2. THE Admin SHALL drag workflow steps from the palette onto the canvas and connect them with edges
3. THE Admin SHALL configure step properties in a side panel: name, type, config, timeout, retryPolicy
4. THE Admin SHALL configure trigger properties: type (event, schedule, manual, webhook), eventType, conditions, schedule (cron)
5. THE Admin SHALL configure condition steps with visual condition builder: field, operator, value
6. THE Admin SHALL configure action steps with form inputs specific to each action type
7. THE Admin SHALL toggle between visual canvas mode and JSON editor mode for advanced editing
8. THE Admin SHALL test workflows with sample event data and view step-by-step execution trace
9. THE Admin SHALL export workflows as JSON and import workflows from JSON
10. THE Workflow_Service SHALL validate workflow definitions before saving and reject workflows with circular dependencies or invalid step configurations


### Requirement 14: Integration Points and Event Flows

**User Story:** As a system architect, I want well-defined integration points between Phase 3 services and existing services, so that the system maintains consistency and reliability.

#### Acceptance Criteria

1. WHEN a workflow execution completes, THE Workflow_Service SHALL publish workflow.execution.completed event to Kafka
2. WHEN an enrichment request completes, THE Data_Enrichment_Service SHALL publish enrichment.completed event to Kafka
3. WHEN a dashboard is accessed, THE Dashboard_Service SHALL log access to Audit Service with category dashboard-access
4. WHEN a report is viewed, THE Report_Service SHALL log access to Audit Service with category report-access
5. THE Workflow_Service SHALL consume events from all Kafka topics: agent-events, interaction-events, ticket-events, customer-events, sla-events
6. THE Data_Enrichment_Service SHALL call Customer Service, Ticket Service, Interaction Service, Knowledge Service, and BFSI Core Service webhooks with enriched data
7. THE Dashboard_Service SHALL query Interaction Service, Ticket Service, Agent Service, and Customer Service for metric data
8. THE Report_Service SHALL call Superset REST API for chart/dashboard CRUD and guest token generation
9. THE Workflow_Service SHALL call Notification Service, Email Gateway, SMS Gateway, and object services from Temporal activities
10. THE System SHALL enforce mTLS for all inter-service communication in Phase 3 services


### Requirement 15: Security and Compliance for Phase 3 Services

**User Story:** As a security officer, I want Phase 3 services to meet BFSI security standards, so that the platform maintains regulatory compliance.

#### Acceptance Criteria

1. THE Workflow_Service SHALL store workflow credentials (webhook auth, API keys) in HashiCorp Vault, never in the database
2. THE Data_Enrichment_Service SHALL encrypt enrichment source credentials at rest using AES-256-GCM
3. THE Report_Service SHALL generate Superset guest tokens with 5-minute expiration and single-use validation
4. THE Dashboard_Service SHALL enforce RBAC scope: agents see only own/team metrics based on role
5. THE Workflow_Service SHALL log all workflow executions to Audit Service with category workflow-execution and sensitivity high
6. THE Data_Enrichment_Service SHALL log all external API calls to Audit Service with category external-system-access
7. THE Report_Service SHALL enforce that Superset RLS policies match CRM tenant and role restrictions
8. THE System SHALL implement rate limiting on all Phase 3 API endpoints: 100 req/min default, 30 req/min for admin endpoints
9. THE System SHALL validate JWT tokens on every request to Phase 3 services with RS256 signature verification
10. THE System SHALL enforce mTLS for all inter-service communication in Phase 3 services


### Requirement 16: Performance and Scalability

**User Story:** As a platform engineer, I want Phase 3 services to meet performance targets under load, so that the system remains responsive for all users.

#### Acceptance Criteria

1. THE Workflow_Service SHALL execute individual workflow steps with P99 latency less than 500ms (excluding external API calls and wait steps)
2. THE Data_Enrichment_Service SHALL process enrichment requests with P99 latency less than 2 seconds from webhook response to WebSocket push
3. THE Dashboard_Service SHALL serve cached widget data with P99 latency less than 1 second
4. THE Report_Service SHALL generate Superset guest tokens with P99 latency less than 100ms
5. THE Dashboard_Service SHALL push real-time metric updates via WebSocket with latency less than 100ms
6. THE Workflow_Service SHALL support at least 100 concurrent workflow executions without degradation
7. THE Data_Enrichment_Service SHALL support at least 50 concurrent enrichment requests with parallel external API calls
8. THE Dashboard_Service SHALL support 500 concurrent dashboard viewers with real-time updates
9. THE Report_Service SHALL support 100 concurrent report viewers with Superset embedding
10. THE System SHALL complete progressive loading for all enrichment fields within 5 seconds


### Requirement 17: Testing and Quality Assurance

**User Story:** As a QA engineer, I want comprehensive test coverage for Phase 3 services, so that we can confidently deploy to production.

#### Acceptance Criteria

1. THE System SHALL achieve unit test coverage of at least 70% for all Phase 3 services
2. THE System SHALL include integration tests for all API endpoints in Phase 3 services
3. THE System SHALL include integration tests for Temporal workflow execution with mock activities
4. THE System SHALL include integration tests for Data Enrichment Service with mock external APIs
5. THE System SHALL include integration tests for Dashboard Service WebSocket metric updates
6. THE System SHALL include integration tests for Report Service Superset guest token generation
7. THE System SHALL include E2E tests for the complete progressive loading flow from customer lookup to enrichment completion
8. THE System SHALL include E2E tests for workflow creation, testing, and execution in the Admin Module
9. THE System SHALL include E2E tests for dashboard creation and real-time metric updates
10. THE System SHALL include E2E tests for report viewing with Superset embedding
11. THE System SHALL include load tests demonstrating 500 concurrent users with acceptable performance
12. THE System SHALL include security tests scanning for OWASP Top 10 vulnerabilities with zero critical findings


### Requirement 18: Database Schemas for Phase 3 Services

**User Story:** As a database administrator, I want well-designed database schemas for Phase 3 services, so that data integrity and performance are maintained.

#### Acceptance Criteria

1. THE Workflow_Service SHALL create workflow_db with tables: workflow_definitions, workflow_steps, workflow_executions, workflow_step_results, workflow_variables
2. THE Data_Enrichment_Service SHALL create enrichment_db with tables: enrichment_sources, field_mappings, enrichment_requests, enrichment_cache
3. THE Dashboard_Service SHALL create dashboard_db with tables: dashboards, dashboard_widgets, dashboard_assignments, widget_data_cache
4. THE Report_Service SHALL create report_db with tables: reports, report_permissions, report_schedules, report_access_log
5. THE System SHALL create appropriate indexes on all foreign keys and frequently queried columns
6. THE System SHALL implement database migrations using TypeORM for all Phase 3 services
7. THE Workflow_Service SHALL index workflow_executions by workflowId, status, and startedAt for efficient querying
8. THE Data_Enrichment_Service SHALL index enrichment_requests by objectType, objectId, and status for deduplication
9. THE Dashboard_Service SHALL use Redis for widget_data_cache with TTL matching dashboard refreshInterval
10. THE Report_Service SHALL index reports by roleRestrictions for efficient permission filtering
