# Design Document: Phase 3 - Automation & Analytics

## Overview

Phase 3 completes the TPB CRM Platform by implementing the final 4 microservices that enable Temporal-based workflow automation, progressive data enrichment from external sources, real-time analytics dashboards, and Apache Superset BI reporting integration.

**Services Implemented:**
- MS-15: Workflow Service (Temporal orchestration)
- MS-16: Data Enrichment Service (progressive loading)
- MS-17: Dashboard Service (real-time analytics)
- MS-18: Report Service (Superset integration)

**Key Capabilities:**
- Visual workflow designer with 18 step types and 4 trigger types
- Durable workflow execution via Temporal with retry and compensation
- Progressive data loading from external sources (CBS, Credit Bureau)
- Real-time dashboards with 12 widget types and WebSocket updates
- Embedded BI reports with guest token authentication
- Data warehouse with materialized views for analytics

**Integration Points:**
- Workflow Service consumes all Kafka topics and calls all object services
- Data Enrichment Service integrates with external APIs and webhooks back to object services
- Dashboard Service aggregates metrics from Interaction, Ticket, Agent, Customer services
- Report Service proxies to Apache Superset REST API


## Architecture

### High-Level Service Decomposition

```
┌─────────────────────────────────────────────────────────────────┐
│                    API Gateway (Kong)                            │
└────────────────────────┬────────────────────────────────────────┘
                         │
        ┌────────────────┼────────────────┬────────────────┐
        │                │                │                │
        ▼                ▼                ▼                ▼
   ┌─────────┐      ┌─────────┐    ┌─────────┐      ┌─────────┐
   │  MS-15  │      │  MS-16  │    │  MS-17  │      │  MS-18  │
   │Workflow │      │Enrichmt │    │Dashboard│      │ Report  │
   │ Service │      │ Service │    │ Service │      │ Service │
   └────┬────┘      └────┬────┘    └────┬────┘      └────┬────┘
        │                │              │                │
        │                │              │                │
        ▼                ▼              ▼                ▼
   ┌─────────────────────────────────────────────────────────┐
   │              Kafka Event Bus                             │
   │  Topics: workflow-events, enrichment-events              │
   └─────────────────────────────────────────────────────────┘
        │                │              │                │
        ▼                ▼              ▼                ▼
   ┌─────────┐      ┌─────────┐    ┌─────────┐      ┌─────────┐
   │Temporal │      │External │    │ Redis   │      │Superset │
   │ Server  │      │  APIs   │    │ Cache   │      │   API   │
   └─────────┘      └─────────┘    └─────────┘      └─────────┘
```

### Service Responsibilities

**MS-15: Workflow Service**
- Store and manage workflow definitions
- Listen to Kafka events and trigger matching workflows
- Execute workflows via Temporal with durable state
- Implement 18 activity types for workflow steps
- Provide workflow designer API for Admin Module
- Log all executions to Audit Service

**MS-16: Data Enrichment Service**
- Store enrichment source configurations with encrypted credentials
- Accept enrichment requests from object services
- Query external APIs in parallel with timeout and retry
- Map external response fields to CRM object fields
- Webhook enriched data back to object services
- Cache results in Redis with configurable TTL

**MS-17: Dashboard Service**
- Store dashboard configurations with widget layouts
- Aggregate metrics from Interaction, Ticket, Agent, Customer services
- Cache widget data in Redis with TTL
- Push real-time metric updates via WebSocket
- Enforce RBAC scope (agents see own, supervisors see team)
- Support 12 widget types with configurable data sources

**MS-18: Report Service**
- Store report metadata and permissions
- Generate Superset guest tokens with 5-minute expiration
- Proxy Superset API for chart/dashboard CRUD
- Configure Superset RLS policies per tenant
- Schedule report delivery via email
- Log all report access to Audit Service


### Integration Patterns

**Event-Driven Workflow Triggers**
```
Kafka Event → Workflow Service → Match Active Workflows → Start Temporal Execution
```

**Progressive Data Enrichment**
```
Agent Opens Profile → Object Service Returns Local Data (< 200ms)
                   ↓
                   Trigger Enrichment Request (async)
                   ↓
Enrichment Service → Query External APIs (parallel)
                   ↓
                   Webhook to Object Service
                   ↓
                   WebSocket Push to Frontend
```

**Real-Time Dashboard Updates**
```
Metric Change → Dashboard Service → Update Redis Cache
                                  ↓
                                  Publish to WebSocket Channel
                                  ↓
                                  Frontend Updates Widget
```

**Embedded BI Reports**
```
Agent Clicks Report → Report Service → Generate Guest Token
                                     ↓
                                     Return Token + Superset URL
                                     ↓
                                     Frontend Embeds iframe with Token
```


## Components and Interfaces

### MS-15: Workflow Service Components

**WorkflowDefinitionEntity**
- Stores workflow metadata and configuration
- Fields: id, tenantId, name, description, isActive, version, trigger, steps, variables, errorHandling
- Relationships: One-to-many with WorkflowExecution

**WorkflowExecutionEntity**
- Tracks workflow execution state
- Fields: id, workflowId, temporalWorkflowId, status, startedAt, completedAt, input, output, error
- Indexed by: workflowId, status, startedAt

**WorkflowTriggerMatcher**
- Matches Kafka events to workflow triggers
- Evaluates trigger conditions (field-operator-value)
- Deduplicates executions using Redis (eventId + workflowId)

**TemporalWorkflowClient**
- Starts workflow executions
- Queries workflow status
- Cancels running workflows

**TemporalActivityWorkers**
- 18 activity implementations (send_notification, send_email, update_object, etc.)
- Each activity is idempotent
- Timeout and retry policies per activity type

**WorkflowController**
- GET /api/v1/admin/workflows - List workflows
- POST /api/v1/admin/workflows - Create workflow
- PUT /api/v1/admin/workflows/{id} - Update workflow
- DELETE /api/v1/admin/workflows/{id} - Delete workflow
- POST /api/v1/admin/workflows/{id}/activate - Activate workflow
- POST /api/v1/admin/workflows/{id}/test - Test workflow with sample data
- POST /api/v1/workflows/webhook/{workflowId}/{token} - Webhook trigger


### MS-16: Data Enrichment Service Components

**EnrichmentSourceEntity**
- Stores external source configurations
- Fields: id, tenantId, name, type (rest/soap/graphql/database), connectionConfig, authType, credentials (encrypted), timeout, retryPolicy, isActive
- Credentials encrypted with AES-256-GCM

**FieldMappingEntity**
- Maps external fields to CRM fields
- Fields: id, sourceId, sourceField (JSONPath), targetObjectType, targetFieldName, transformExpression (JSONata)
- Validated against Object Schema Service

**EnrichmentRequestEntity**
- Tracks enrichment requests
- Fields: id, objectType, objectId, sourceIds, status, requestedAt, completedAt, result
- Indexed by: objectType, objectId, status

**EnrichmentOrchestrator**
- Accepts enrichment requests
- Deduplicates using Redis lock (enrich:{objectType}:{objectId}:{sourceId})
- Queries sources in parallel
- Applies field mappings
- Webhooks results to object services

**ExternalApiClient**
- HTTP client with timeout and retry
- Supports REST, SOAP, GraphQL
- OAuth2 token refresh
- Circuit breaker pattern

**EnrichmentController**
- POST /internal/enrichment/request - Trigger enrichment (internal only)
- GET /api/v1/admin/enrichment/sources - List sources
- POST /api/v1/admin/enrichment/sources - Create source
- PUT /api/v1/admin/enrichment/sources/{id} - Update source
- POST /api/v1/admin/enrichment/sources/{id}/test - Test connectivity


### MS-17: Dashboard Service Components

**DashboardEntity**
- Stores dashboard configurations
- Fields: id, tenantId, name, type (personal/team/department/system), layout, refreshInterval, roleRestrictions
- Relationships: One-to-many with DashboardWidget

**DashboardWidgetEntity**
- Stores widget configurations
- Fields: id, dashboardId, type (metric_card/line_chart/bar_chart/etc), title, dataSource, filters, groupBy, timeRange, thresholds, displayOptions, position, size
- 12 widget types supported

**MetricAggregator**
- Queries object services for raw data
- Performs aggregations (count, sum, avg, min, max, percentile)
- Applies filters and groupBy
- Caches results in Redis

**DashboardWebSocketGateway**
- Manages WebSocket connections per dashboard
- Pushes metric updates to subscribed clients
- Channel: /ws/dashboards/{dashboardId}/metrics

**DashboardController**
- GET /api/v1/dashboards - List accessible dashboards
- GET /api/v1/dashboards/{id} - Get dashboard config
- GET /api/v1/dashboards/{id}/data - Get all widget data
- PUT /api/v1/dashboards/{id}/personal - Customize personal dashboard
- GET /api/v1/admin/dashboards/data-sources - List available data sources
- POST /api/v1/admin/dashboards - Create dashboard
- PUT /api/v1/admin/dashboards/{id} - Update dashboard


### MS-18: Report Service Components

**ReportEntity**
- Stores report metadata
- Fields: id, tenantId, name, description, supersetChartId, supersetDashboardId, category, roleRestrictions
- Links to Superset charts/dashboards

**ReportScheduleEntity**
- Stores scheduled report delivery
- Fields: id, reportId, cronExpression, recipients, format (PDF/Excel/CSV), isActive
- Triggers email delivery

**SupersetApiClient**
- HTTP client for Superset REST API
- Generates guest tokens with RLS claims
- Queries charts and dashboards
- Configures RLS policies

**GuestTokenGenerator**
- Creates Superset guest tokens
- Expiration: 5 minutes
- Includes RLS claims: tenantId, userId, roles
- Single-use validation

**ReportController**
- GET /api/v1/reports - List accessible reports
- GET /api/v1/reports/{id} - Get report metadata
- GET /api/v1/reports/{id}/embed-token - Generate guest token
- POST /api/v1/admin/reports - Create report
- PUT /api/v1/admin/reports/{id} - Update report
- POST /api/v1/admin/reports/{id}/schedule - Configure scheduled delivery
- PUT /api/v1/admin/reports/{id}/permissions - Update permissions


## Data Models

### MS-15: Workflow Service Database (workflow_db)

#### workflow_definitions
```sql
CREATE TABLE workflow_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT false,
  version INTEGER DEFAULT 1,
  trigger JSONB NOT NULL,              -- {type, eventType, conditions, schedule}
  steps JSONB NOT NULL,                -- [{id, type, config, timeout, retryPolicy}]
  variables JSONB DEFAULT '[]',        -- [{name, type, defaultValue}]
  error_handling JSONB DEFAULT '{}',   -- {strategy, compensationSteps}
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_workflow_definitions_tenant ON workflow_definitions(tenant_id);
CREATE INDEX idx_workflow_definitions_active ON workflow_definitions(is_active) WHERE is_active = true;
```

#### workflow_executions
```sql
CREATE TABLE workflow_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID REFERENCES workflow_definitions(id) ON DELETE CASCADE,
  temporal_workflow_id TEXT UNIQUE NOT NULL,
  temporal_run_id TEXT NOT NULL,
  status TEXT NOT NULL,                -- running, completed, failed, timed_out, cancelled
  input JSONB,
  output JSONB,
  error TEXT,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_workflow_executions_workflow ON workflow_executions(workflow_id);
CREATE INDEX idx_workflow_executions_status ON workflow_executions(status);
CREATE INDEX idx_workflow_executions_started ON workflow_executions(started_at);
CREATE INDEX idx_workflow_executions_temporal ON workflow_executions(temporal_workflow_id);
```

#### workflow_step_results
```sql
CREATE TABLE workflow_step_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  execution_id UUID REFERENCES workflow_executions(id) ON DELETE CASCADE,
  step_id TEXT NOT NULL,
  step_type TEXT NOT NULL,
  status TEXT NOT NULL,                -- pending, running, completed, failed, skipped
  input JSONB,
  output JSONB,
  error TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_workflow_step_results_execution ON workflow_step_results(execution_id);
CREATE INDEX idx_workflow_step_results_status ON workflow_step_results(status);
```


### MS-16: Data Enrichment Service Database (enrichment_db)

#### enrichment_sources
```sql
CREATE TABLE enrichment_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL,                  -- rest, soap, graphql, database
  connection_config JSONB NOT NULL,    -- {baseUrl, headers, queryParams}
  auth_type TEXT NOT NULL,             -- api-key, oauth2, basic, mtls
  credentials TEXT NOT NULL,           -- encrypted with AES-256-GCM
  timeout INTEGER DEFAULT 5000,        -- milliseconds
  retry_policy JSONB DEFAULT '{"maxRetries": 3, "backoff": "exponential"}',
  cache_policy JSONB DEFAULT '{"enabled": true, "ttlSeconds": 300, "staleWhileRevalidate": true}',
  rate_limiting JSONB DEFAULT '{"maxRequestsPerMinute": 60, "maxConcurrent": 10}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_enrichment_sources_tenant ON enrichment_sources(tenant_id);
CREATE INDEX idx_enrichment_sources_active ON enrichment_sources(is_active) WHERE is_active = true;
```

#### field_mappings
```sql
CREATE TABLE field_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id UUID REFERENCES enrichment_sources(id) ON DELETE CASCADE,
  source_field TEXT NOT NULL,          -- JSONPath expression
  target_object_type TEXT NOT NULL,    -- customer, ticket, interaction, etc.
  target_field_name TEXT NOT NULL,
  transform_expression TEXT,           -- JSONata expression
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_field_mappings_source ON field_mappings(source_id);
CREATE INDEX idx_field_mappings_target ON field_mappings(target_object_type);
```

#### enrichment_requests
```sql
CREATE TABLE enrichment_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  object_type TEXT NOT NULL,
  object_id UUID NOT NULL,
  source_ids UUID[] NOT NULL,
  status TEXT NOT NULL,                -- pending, in_progress, completed, failed, partial
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  result JSONB,                        -- {sourceId: {status, data, error}}
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_enrichment_requests_object ON enrichment_requests(object_type, object_id);
CREATE INDEX idx_enrichment_requests_status ON enrichment_requests(status);
CREATE INDEX idx_enrichment_requests_requested ON enrichment_requests(requested_at);
```


### MS-17: Dashboard Service Database (dashboard_db)

#### dashboards
```sql
CREATE TABLE dashboards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL,                  -- personal, team, department, system
  layout JSONB NOT NULL,               -- {columns: 12, rows: auto}
  refresh_interval INTEGER DEFAULT 30, -- seconds
  role_restrictions TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_dashboards_tenant ON dashboards(tenant_id);
CREATE INDEX idx_dashboards_type ON dashboards(type);
CREATE INDEX idx_dashboards_active ON dashboards(is_active) WHERE is_active = true;
```

#### dashboard_widgets
```sql
CREATE TABLE dashboard_widgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dashboard_id UUID REFERENCES dashboards(id) ON DELETE CASCADE,
  type TEXT NOT NULL,                  -- metric_card, line_chart, bar_chart, pie_chart, etc.
  title TEXT NOT NULL,
  data_source TEXT NOT NULL,           -- interaction_metrics, ticket_metrics, agent_metrics, etc.
  filters JSONB DEFAULT '[]',          -- [{field, operator, value}]
  group_by TEXT,
  time_range TEXT DEFAULT 'today',     -- today, yesterday, last_7_days, last_30_days, custom
  thresholds JSONB,                    -- {warning: 80, critical: 95}
  display_options JSONB DEFAULT '{}',  -- {showLegend, colors, format}
  position JSONB NOT NULL,             -- {x, y, w, h}
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_dashboard_widgets_dashboard ON dashboard_widgets(dashboard_id);
CREATE INDEX idx_dashboard_widgets_type ON dashboard_widgets(type);
```

#### dashboard_assignments
```sql
CREATE TABLE dashboard_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dashboard_id UUID REFERENCES dashboards(id) ON DELETE CASCADE,
  user_id UUID,
  team_id UUID,
  department_id UUID,
  assigned_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_dashboard_assignments_dashboard ON dashboard_assignments(dashboard_id);
CREATE INDEX idx_dashboard_assignments_user ON dashboard_assignments(user_id);
CREATE INDEX idx_dashboard_assignments_team ON dashboard_assignments(team_id);
```


### MS-18: Report Service Database (report_db)

#### reports
```sql
CREATE TABLE reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  superset_chart_id INTEGER,
  superset_dashboard_id INTEGER,
  category TEXT,
  role_restrictions TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT check_superset_id CHECK (
    (superset_chart_id IS NOT NULL AND superset_dashboard_id IS NULL) OR
    (superset_chart_id IS NULL AND superset_dashboard_id IS NOT NULL)
  )
);

CREATE INDEX idx_reports_tenant ON reports(tenant_id);
CREATE INDEX idx_reports_category ON reports(category);
CREATE INDEX idx_reports_active ON reports(is_active) WHERE is_active = true;
```

#### report_schedules
```sql
CREATE TABLE report_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID REFERENCES reports(id) ON DELETE CASCADE,
  cron_expression TEXT NOT NULL,
  recipients TEXT[] NOT NULL,
  format TEXT NOT NULL,                -- pdf, excel, csv
  is_active BOOLEAN DEFAULT true,
  last_run_at TIMESTAMPTZ,
  next_run_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_report_schedules_report ON report_schedules(report_id);
CREATE INDEX idx_report_schedules_next_run ON report_schedules(next_run_at) WHERE is_active = true;
```

#### report_access_log
```sql
CREATE TABLE report_access_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID REFERENCES reports(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  guest_token_hash TEXT NOT NULL,
  accessed_at TIMESTAMPTZ DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT
);

CREATE INDEX idx_report_access_log_report ON report_access_log(report_id);
CREATE INDEX idx_report_access_log_user ON report_access_log(user_id);
CREATE INDEX idx_report_access_log_accessed ON report_access_log(accessed_at);
```


### Temporal Workflow Definitions

#### SLA Breach Escalation Workflow
```typescript
@WorkflowMethod()
async slaBreachEscalation(input: {
  interactionId: string;
  chatSessionId?: string;
  thresholdMinutes: number;
  actualSeconds: number;
}): Promise<void> {
  // Step 1: Notify assigned agent
  await this.sendNotification({
    agentId: input.assignedAgentId,
    type: 'sla',
    priority: 'high',
    title: 'SLA Breach',
    message: `Interaction ${input.interactionId} has breached SLA`
  });

  // Step 2: Wait 5 minutes
  await sleep('5 minutes');

  // Step 3: Check if still breached
  const interaction = await this.getInteraction(input.interactionId);
  if (interaction.status !== 'resolved') {
    // Step 4: Escalate to supervisor
    await this.escalateTicket({
      interactionId: input.interactionId,
      escalateTo: 'supervisor',
      reason: 'SLA breach not resolved'
    });

    // Step 5: Send SMS to supervisor
    await this.sendSms({
      to: interaction.supervisorPhone,
      message: `SLA breach: ${input.interactionId}`
    });
  }
}
```

#### Auto-Assignment Workflow
```typescript
@WorkflowMethod()
async autoAssignment(input: {
  objectType: 'ticket' | 'interaction';
  objectId: string;
  requiredSkills: string[];
  priority: string;
}): Promise<void> {
  // Step 1: Find available agents
  const agents = await this.findAvailableAgents({
    skills: input.requiredSkills,
    maxLoad: 5,
    strategy: 'round-robin'
  });

  if (agents.length === 0) {
    // Step 2: No agents available, create notification
    await this.sendNotification({
      type: 'system',
      priority: 'high',
      title: 'No Available Agents',
      message: `${input.objectType} ${input.objectId} waiting for assignment`
    });
    return;
  }

  // Step 3: Assign to first available agent
  const selectedAgent = agents[0];
  await this.assignObject({
    objectType: input.objectType,
    objectId: input.objectId,
    agentId: selectedAgent.id
  });

  // Step 4: Notify agent
  await this.sendNotification({
    agentId: selectedAgent.id,
    type: input.objectType === 'ticket' ? 'ticket' : 'call',
    priority: input.priority,
    title: `New ${input.objectType} assigned`,
    message: `You have been assigned ${input.objectType} ${input.objectId}`
  });
}
```


#### VIP Customer Routing Workflow
```typescript
@WorkflowMethod()
async vipCustomerRouting(input: {
  customerId: string;
  interactionId: string;
  channel: string;
}): Promise<void> {
  // Step 1: Find senior agents
  const seniorAgents = await this.findAvailableAgents({
    skills: ['vip-handling'],
    minExperience: 2,
    maxLoad: 3
  });

  if (seniorAgents.length === 0) {
    // Step 2: Notify manager
    await this.sendNotification({
      role: 'manager',
      type: 'system',
      priority: 'critical',
      title: 'VIP Customer Waiting',
      message: `VIP customer ${input.customerId} has no available senior agent`
    });

    // Step 3: Wait 2 minutes
    await sleep('2 minutes');

    // Step 4: Assign to any available agent
    const anyAgent = await this.findAvailableAgents({
      maxLoad: 5
    });
    if (anyAgent.length > 0) {
      await this.assignObject({
        objectType: 'interaction',
        objectId: input.interactionId,
        agentId: anyAgent[0].id
      });
    }
  } else {
    // Step 5: Assign to senior agent
    await this.assignObject({
      objectType: 'interaction',
      objectId: input.interactionId,
      agentId: seniorAgents[0].id
    });

    // Step 6: Notify agent with VIP flag
    await this.sendNotification({
      agentId: seniorAgents[0].id,
      type: 'call',
      priority: 'high',
      title: 'VIP Customer',
      message: `VIP customer ${input.customerId} assigned to you`
    });
  }
}
```


### API Specifications

#### MS-15: Workflow Service API

**POST /api/v1/admin/workflows**
```typescript
// Request
interface CreateWorkflowRequest {
  name: string;
  description?: string;
  trigger: {
    type: 'event' | 'schedule' | 'manual' | 'webhook';
    eventType?: string;              // For event triggers
    conditions?: Array<{             // For event triggers
      field: string;
      operator: 'equals' | 'not_equals' | 'contains' | 'gt' | 'lt' | 'in' | 'not_in' | 'matches';
      value: any;
    }>;
    schedule?: string;               // For schedule triggers (cron)
  };
  steps: Array<{
    id: string;
    type: 'condition' | 'switch' | 'send_notification' | 'send_email' | 'send_sms' | 
          'update_object' | 'assign_agent' | 'escalate_ticket' | 'create_ticket' | 
          'call_webhook' | 'call_api' | 'wait' | 'wait_for_event' | 'parallel' | 
          'loop' | 'ai_classify' | 'ai_generate' | 'custom';
    config: Record<string, any>;
    timeout?: number;                // milliseconds, default 30000
    retryPolicy?: {
      maxRetries: number;
      backoff: 'fixed' | 'exponential';
      initialInterval: number;
    };
    next?: string;                   // Next step ID
    onError?: 'retry' | 'skip' | 'fail_workflow' | 'compensate';
  }>;
  variables?: Array<{
    name: string;
    type: 'string' | 'number' | 'boolean' | 'object' | 'array';
    defaultValue?: any;
  }>;
  errorHandling?: {
    strategy: 'retry' | 'skip' | 'fail_workflow' | 'compensate';
    compensationSteps?: string[];    // Step IDs to execute on failure
  };
}

// Response 201
interface CreateWorkflowResponse {
  id: string;
  name: string;
  version: number;
  isActive: boolean;
  createdAt: string;
}
```

**GET /api/v1/admin/workflows**
```typescript
// Query params
interface ListWorkflowsQuery {
  page?: number;
  limit?: number;
  isActive?: boolean;
  triggerType?: 'event' | 'schedule' | 'manual' | 'webhook';
}

// Response 200
interface ListWorkflowsResponse {
  data: Array<{
    id: string;
    name: string;
    description?: string;
    isActive: boolean;
    version: number;
    trigger: {
      type: string;
      eventType?: string;
      schedule?: string;
    };
    stepCount: number;
    createdAt: string;
    updatedAt: string;
  }>;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
```


**POST /api/v1/admin/workflows/{id}/test**
```typescript
// Request
interface TestWorkflowRequest {
  sampleInput: Record<string, any>;
  sandboxMode: boolean;              // If true, don't trigger real side effects
}

// Response 200
interface TestWorkflowResponse {
  executionId: string;
  status: 'running' | 'completed' | 'failed';
  steps: Array<{
    stepId: string;
    stepType: string;
    status: 'completed' | 'failed' | 'skipped';
    input: Record<string, any>;
    output?: Record<string, any>;
    error?: string;
    duration: number;                // milliseconds
  }>;
  totalDuration: number;
  output?: Record<string, any>;
  error?: string;
}
```

**POST /api/v1/workflows/webhook/{workflowId}/{token}**
```typescript
// Request body: any JSON
// Response 202
interface WebhookTriggerResponse {
  executionId: string;
  status: 'accepted';
  message: string;
}
```

#### MS-16: Data Enrichment Service API

**POST /internal/enrichment/request**
```typescript
// Request (internal only, not exposed via Kong)
interface EnrichmentRequest {
  objectType: 'customer' | 'ticket' | 'interaction' | 'kb_article' | 'bank_product';
  objectId: string;
  sourceIds: string[];               // Enrichment source IDs to query
  priority?: 'low' | 'normal' | 'high';
}

// Response 202
interface EnrichmentResponse {
  requestId: string;
  status: 'accepted';
  estimatedCompletionTime: number;   // milliseconds
}
```

**GET /api/v1/admin/enrichment/sources**
```typescript
// Query params
interface ListEnrichmentSourcesQuery {
  page?: number;
  limit?: number;
  type?: 'rest' | 'soap' | 'graphql' | 'database';
  isActive?: boolean;
}

// Response 200
interface ListEnrichmentSourcesResponse {
  data: Array<{
    id: string;
    name: string;
    type: string;
    isActive: boolean;
    fieldMappingCount: number;
    lastUsedAt?: string;
    createdAt: string;
  }>;
  pagination: {
    page: number;
    limit: number;
    total: number;
  };
}
```


**POST /api/v1/admin/enrichment/sources**
```typescript
// Request
interface CreateEnrichmentSourceRequest {
  name: string;
  type: 'rest' | 'soap' | 'graphql' | 'database';
  connectionConfig: {
    baseUrl?: string;                // For REST/SOAP/GraphQL
    headers?: Record<string, string>;
    queryParams?: Record<string, string>;
    connectionString?: string;       // For database
  };
  authType: 'api-key' | 'oauth2' | 'basic' | 'mtls';
  credentials: {
    apiKey?: string;
    username?: string;
    password?: string;
    clientId?: string;
    clientSecret?: string;
    tokenUrl?: string;
    certificate?: string;
    privateKey?: string;
  };
  timeout?: number;                  // milliseconds, default 5000
  retryPolicy?: {
    maxRetries: number;
    backoff: 'fixed' | 'exponential';
  };
  cachePolicy?: {
    enabled: boolean;
    ttlSeconds: number;
    staleWhileRevalidate: boolean;
  };
  rateLimiting?: {
    maxRequestsPerMinute: number;
    maxConcurrent: number;
  };
  fieldMappings: Array<{
    sourceField: string;             // JSONPath expression
    targetObjectType: string;
    targetFieldName: string;
    transformExpression?: string;    // JSONata expression
  }>;
}

// Response 201
interface CreateEnrichmentSourceResponse {
  id: string;
  name: string;
  type: string;
  isActive: boolean;
  createdAt: string;
}
```

**POST /api/v1/admin/enrichment/sources/{id}/test**
```typescript
// Request
interface TestEnrichmentSourceRequest {
  sampleInput?: Record<string, any>;
}

// Response 200
interface TestEnrichmentSourceResponse {
  success: boolean;
  responseTime: number;              // milliseconds
  sampleData?: Record<string, any>;
  error?: string;
}
```


#### MS-17: Dashboard Service API

**GET /api/v1/dashboards**
```typescript
// Query params
interface ListDashboardsQuery {
  type?: 'personal' | 'team' | 'department' | 'system';
}

// Response 200
interface ListDashboardsResponse {
  data: Array<{
    id: string;
    name: string;
    type: string;
    widgetCount: number;
    refreshInterval: number;
    isActive: boolean;
    createdAt: string;
  }>;
}
```

**GET /api/v1/dashboards/{id}/data**
```typescript
// Response 200
interface GetDashboardDataResponse {
  dashboard: {
    id: string;
    name: string;
    type: string;
    layout: {
      columns: number;
      rows: string;
    };
    refreshInterval: number;
  };
  widgets: Array<{
    id: string;
    type: string;
    title: string;
    position: {
      x: number;
      y: number;
      w: number;
      h: number;
    };
    data: {
      value?: number | string;
      series?: Array<{
        name: string;
        data: number[];
        labels?: string[];
      }>;
      rows?: Array<Record<string, any>>;
      threshold?: {
        warning: number;
        critical: number;
      };
    };
    lastUpdated: string;
  }>;
}
```

**POST /api/v1/admin/dashboards**
```typescript
// Request
interface CreateDashboardRequest {
  name: string;
  type: 'personal' | 'team' | 'department' | 'system';
  layout: {
    columns: number;
    rows: string;
  };
  refreshInterval: number;           // seconds
  roleRestrictions?: string[];
  widgets: Array<{
    type: 'metric_card' | 'line_chart' | 'bar_chart' | 'pie_chart' | 'donut_chart' | 
          'table' | 'queue_list' | 'agent_status_grid' | 'sla_gauge' | 'heatmap' | 
          'leaderboard' | 'ticker';
    title: string;
    dataSource: 'interaction_metrics' | 'ticket_metrics' | 'agent_metrics' | 
                'customer_metrics' | 'sla_metrics' | 'queue_status';
    filters?: Array<{
      field: string;
      operator: string;
      value: any;
    }>;
    groupBy?: string;
    timeRange?: 'today' | 'yesterday' | 'last_7_days' | 'last_30_days' | 
                'this_month' | 'last_month' | 'custom';
    thresholds?: {
      warning: number;
      critical: number;
    };
    displayOptions?: Record<string, any>;
    position: {
      x: number;
      y: number;
      w: number;
      h: number;
    };
  }>;
}

// Response 201
interface CreateDashboardResponse {
  id: string;
  name: string;
  type: string;
  widgetCount: number;
  createdAt: string;
}
```


#### MS-18: Report Service API

**GET /api/v1/reports**
```typescript
// Query params
interface ListReportsQuery {
  category?: string;
}

// Response 200
interface ListReportsResponse {
  data: Array<{
    id: string;
    name: string;
    description?: string;
    category?: string;
    type: 'chart' | 'dashboard';
    createdAt: string;
  }>;
}
```

**GET /api/v1/reports/{id}/embed-token**
```typescript
// Response 200
interface GetEmbedTokenResponse {
  token: string;
  expiresAt: string;                 // ISO 8601, 5 minutes from now
  supersetUrl: string;
  embedUrl: string;                  // Full URL with token
  reportType: 'chart' | 'dashboard';
  reportId: number;
}
```

**POST /api/v1/admin/reports**
```typescript
// Request
interface CreateReportRequest {
  name: string;
  description?: string;
  supersetChartId?: number;          // Either chartId or dashboardId required
  supersetDashboardId?: number;
  category?: string;
  roleRestrictions?: string[];
}

// Response 201
interface CreateReportResponse {
  id: string;
  name: string;
  type: 'chart' | 'dashboard';
  createdAt: string;
}
```

**POST /api/v1/admin/reports/{id}/schedule**
```typescript
// Request
interface ScheduleReportRequest {
  cronExpression: string;            // e.g., "0 9 * * 1" (Every Monday at 9 AM)
  recipients: string[];              // Email addresses
  format: 'pdf' | 'excel' | 'csv';
  isActive: boolean;
}

// Response 200
interface ScheduleReportResponse {
  scheduleId: string;
  nextRunAt: string;                 // ISO 8601
}
```


## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Event-Triggered Workflow Execution

*For any* Kafka event and active workflow with matching trigger conditions, the Workflow Service should start a Temporal workflow execution with the event payload as input.

**Validates: Requirements 1.3**

### Property 2: Workflow Step Error Handling

*For any* workflow step that fails during execution, the Workflow Service should apply the configured error handling strategy (retry, skip, fail_workflow, or compensate) according to the step configuration.

**Validates: Requirements 1.6**

### Property 3: Workflow Execution Logging

*For any* workflow execution (regardless of status), the Workflow Service should create a workflow_executions record with status, input, output, and timestamps.

**Validates: Requirements 1.7**

### Property 4: Workflow Sandbox Mode

*For any* workflow tested in sandbox mode, no real side effects should occur (no actual notifications sent, no objects updated, no external APIs called).

**Validates: Requirements 1.9**

### Property 5: Workflow Import/Export Round Trip

*For any* valid workflow definition, exporting to JSON and then importing should produce an equivalent workflow with the same trigger, steps, and configuration.

**Validates: Requirements 1.10**

### Property 6: Activity Idempotency

*For any* Temporal activity execution, executing the same activity twice with the same input should produce the same result and side effects as executing it once.

**Validates: Requirements 2.1**

### Property 7: Step Timeout Enforcement

*For any* workflow step with a configured timeout, if the step execution exceeds the timeout duration, the Workflow Service should terminate the step and apply the error handling strategy.

**Validates: Requirements 2.9**

### Property 8: Activity Audit Logging

*For any* Temporal activity execution, the Workflow Service should log the execution to the Audit Service with category workflow-execution.

**Validates: Requirements 2.10**


### Property 9: Cron Expression Validation

*For any* schedule-based workflow trigger with an invalid cron expression, the Workflow Service should reject the workflow configuration and return a validation error.

**Validates: Requirements 3.3**

### Property 10: Multiple Workflow Execution

*For any* Kafka event that matches multiple active workflow triggers, the Workflow Service should execute all matching workflows independently without interference.

**Validates: Requirements 3.6**

### Property 11: Workflow Execution Deduplication

*For any* Kafka event with the same event ID, the Workflow Service should not trigger duplicate workflow executions for the same workflow (using eventId + workflowId as deduplication key).

**Validates: Requirements 3.7**

### Property 12: Trigger Configuration Validation

*For any* workflow trigger configuration with invalid event types or malformed conditions, the Workflow Service should reject the configuration before saving.

**Validates: Requirements 3.9**

### Property 13: Trigger Match Audit Logging

*For any* workflow trigger match (event matches trigger conditions), the Workflow Service should log the match to the Audit Service with category workflow-trigger.

**Validates: Requirements 3.10**

### Property 14: Enrichment Credential Encryption

*For any* enrichment source configuration with credentials, the Data Enrichment Service should encrypt the credentials using AES-256-GCM before storing in the database.

**Validates: Requirements 4.3**

### Property 15: Enrichment Request Deduplication

*For any* concurrent enrichment requests for the same object and source, the Data Enrichment Service should deduplicate using Redis lock and execute only one request.

**Validates: Requirements 4.5**

### Property 16: Parallel Source Querying

*For any* enrichment request with multiple source IDs, the Data Enrichment Service should query all sources in parallel rather than sequentially.

**Validates: Requirements 4.6**

### Property 17: Field Mapping Application

*For any* enrichment response from an external API, the Data Enrichment Service should apply the configured field mappings (JSONPath + JSONata transforms) to produce the enriched data.

**Validates: Requirements 4.7**


### Property 18: Enrichment Webhook Callback

*For any* completed enrichment request, the Data Enrichment Service should call the webhook endpoint on the object service with the enriched data.

**Validates: Requirements 4.8**

### Property 19: Enrichment Result Caching

*For any* enrichment request, if a cached result exists in Redis and is not expired, the Data Enrichment Service should return the cached result without querying external sources.

**Validates: Requirements 4.9**

### Property 20: Enrichment Audit Logging

*For any* enrichment request (successful or failed), the Data Enrichment Service should log the request and result to the Audit Service with category external-system-access.

**Validates: Requirements 4.10**

### Property 21: Progressive Loading Status Marking

*For any* object with enrichment fields, when returning the initial response, the object service should mark enrichment fields with status: loading.

**Validates: Requirements 5.2**

### Property 22: Asynchronous Enrichment Trigger

*For any* object retrieval that includes enrichment fields, the object service should trigger an enrichment request asynchronously after returning the local data response.

**Validates: Requirements 5.3**

### Property 23: Enrichment WebSocket Push

*For any* enrichment webhook callback received by an object service, the service should push an object.fields.updated event via WebSocket to subscribed clients.

**Validates: Requirements 5.5**

### Property 24: Enrichment Failure Communication

*For any* enrichment source that fails, the system should communicate the failure status to the frontend via WebSocket with an error indicator.

**Validates: Requirements 5.8**

### Property 25: Field Mapping Validation

*For any* field mapping configuration, the Data Enrichment Service should validate that the target object type and field name exist in the Object Schema Service before saving.

**Validates: Requirements 6.4**

### Property 26: OAuth2 Token Refresh

*For any* enrichment source with oauth2 authType and an expired access token, the Data Enrichment Service should automatically refresh the token before making the API request.

**Validates: Requirements 6.9**


### Property 27: Enrichment Configuration Audit Logging

*For any* enrichment source configuration change (create, update, delete), the Data Enrichment Service should log the change to the Audit Service with category configuration-change.

**Validates: Requirements 6.10**

### Property 28: Dashboard Widget Data Caching

*For any* dashboard widget data request, the Dashboard Service should cache the result in Redis with TTL matching the dashboard refreshInterval.

**Validates: Requirements 7.5**

### Property 29: Dashboard Metric WebSocket Push

*For any* metric update that affects a dashboard widget, the Dashboard Service should publish the update to the WebSocket channel /ws/dashboards/{dashboardId}/metrics.

**Validates: Requirements 7.6**

### Property 30: Dashboard RBAC Scope Enforcement

*For any* dashboard data request, the Dashboard Service should enforce RBAC scope such that agents see only their own metrics, supervisors see team metrics, and admins see all metrics.

**Validates: Requirements 7.8**

### Property 31: Dashboard Widget Aggregation

*For any* dashboard widget with configured filters and groupBy, the Dashboard Service should query object services for raw data and perform the specified aggregations (count, sum, avg, min, max, percentile).

**Validates: Requirements 8.6**

### Property 32: Dashboard Widget Configuration Validation

*For any* dashboard widget configuration with invalid data sources or filters, the Dashboard Service should reject the configuration before saving.

**Validates: Requirements 8.9**

### Property 33: Dashboard Query Audit Logging

*For any* dashboard data query, the Dashboard Service should log the access to the Audit Service with category dashboard-access.

**Validates: Requirements 8.10**

### Property 34: Superset Guest Token Expiration

*For any* Superset guest token generated by the Report Service, the token should expire exactly 5 minutes after generation.

**Validates: Requirements 10.5**

### Property 35: Report Access Audit Logging

*For any* report view (guest token generation), the Report Service should log the access to the Audit Service with category report-access.

**Validates: Requirements 10.9**


### Property 36: Workflow Completion Event Publishing

*For any* workflow execution that completes (successfully or with failure), the Workflow Service should publish a workflow.execution.completed event to Kafka.

**Validates: Requirements 14.1**

### Property 37: Enrichment Completion Event Publishing

*For any* enrichment request that completes, the Data Enrichment Service should publish an enrichment.completed event to Kafka.

**Validates: Requirements 14.2**

### Property 38: Dashboard Access Audit Logging

*For any* dashboard access (GET /api/v1/dashboards/{id}/data), the Dashboard Service should log the access to the Audit Service with category dashboard-access.

**Validates: Requirements 14.3**

### Property 39: Report View Audit Logging

*For any* report view (GET /api/v1/reports/{id}/embed-token), the Report Service should log the access to the Audit Service with category report-access.

**Validates: Requirements 14.4**

### Property 40: Enrichment Webhook Calls

*For any* completed enrichment request, the Data Enrichment Service should call the appropriate object service webhook endpoint (Customer, Ticket, Interaction, Knowledge, or BFSI Core Service) with the enriched data.

**Validates: Requirements 14.6**

### Property 41: Workflow Credentials in Vault

*For any* workflow configuration that includes credentials (webhook auth, API keys), the Workflow Service should store the credentials in HashiCorp Vault, not in the database.

**Validates: Requirements 15.1**

### Property 42: Enrichment Credentials Encryption

*For any* enrichment source credentials stored in the database, the Data Enrichment Service should encrypt them at rest using AES-256-GCM.

**Validates: Requirements 15.2**

### Property 43: Guest Token Expiration

*For any* Superset guest token generated by the Report Service, the token should have exactly 5 minutes expiration time and include RLS claims (tenantId, userId, roles).

**Validates: Requirements 15.3**

### Property 44: Dashboard RBAC Enforcement

*For any* dashboard data request, the Dashboard Service should enforce RBAC scope based on the user's role (agents see own/team metrics only).

**Validates: Requirements 15.4**


### Property 45: Workflow Execution Audit Logging

*For any* workflow execution, the Workflow Service should log the execution to the Audit Service with category workflow-execution and sensitivity high.

**Validates: Requirements 15.5**

### Property 46: External API Call Audit Logging

*For any* external API call made by the Data Enrichment Service, the service should log the call to the Audit Service with category external-system-access.

**Validates: Requirements 15.6**

### Property 47: Superset RLS Policy Consistency

*For any* report configuration, the Report Service should ensure that Superset RLS policies match the CRM tenant and role restrictions.

**Validates: Requirements 15.7**

### Property 48: API Rate Limiting

*For any* Phase 3 API endpoint, when a client exceeds the rate limit (100 req/min default, 30 req/min for admin endpoints), the service should reject subsequent requests with HTTP 429.

**Validates: Requirements 15.8**

### Property 49: JWT Token Validation

*For any* request to Phase 3 services, if the JWT token is invalid or expired, the service should reject the request with HTTP 401 Unauthorized.

**Validates: Requirements 15.9**


## Error Handling

### MS-15: Workflow Service Error Handling

**Temporal Workflow Failures**
- Workflow execution failures are logged to workflow_executions table with status: failed
- Error details stored in error field with stack trace
- Failed workflows can be retried manually via admin endpoint
- Compensation workflows can be triggered for failed transactions

**Activity Timeout Handling**
- Activities have configurable timeout (default 30s, max 5 minutes)
- On timeout, Temporal automatically retries based on retry policy
- After max retries, activity marked as failed
- Workflow applies configured error handling strategy (retry, skip, fail_workflow, compensate)

**Kafka Event Processing Errors**
- Failed event processing logged to Audit Service
- Event stored in dead letter queue for manual review
- Workflow Service continues processing other events
- Admin can replay failed events after fixing issues

**Validation Errors**
- Invalid workflow configurations rejected with HTTP 400
- Detailed validation messages returned to client
- Cron expression validation using cron-parser library
- Circular dependency detection in workflow steps

### MS-16: Data Enrichment Service Error Handling

**External API Failures**
- Circuit breaker pattern: open after 5 consecutive failures
- Fallback to cached data if available (stale-while-revalidate)
- Partial success: return successful sources, mark failed sources
- Retry with exponential backoff (max 3 retries)

**Timeout Handling**
- Default timeout: 5 seconds per source
- Parallel queries: wait for all or timeout
- Timeout errors logged with source ID and duration
- Webhook callback includes timeout status

**Field Mapping Errors**
- JSONPath evaluation errors caught and logged
- JSONata transform errors return original value
- Invalid mappings skipped, valid mappings applied
- Error details included in enrichment result

**OAuth2 Token Refresh Failures**
- Automatic retry on 401 Unauthorized
- Token refresh failure disables source temporarily
- Admin notification sent for manual intervention
- Source marked as inactive after 3 consecutive failures


### MS-17: Dashboard Service Error Handling

**Object Service Query Failures**
- Fallback to cached data if available
- Display error indicator on widget with retry button
- Partial dashboard load: show successful widgets, mark failed widgets
- Error logged to Audit Service with widget ID and data source

**WebSocket Connection Failures**
- Automatic reconnection with exponential backoff
- Missed updates fetched on reconnection
- Connection status indicator in UI
- Fallback to polling if WebSocket unavailable

**Aggregation Errors**
- Invalid filters logged and skipped
- Aggregation failures return empty dataset
- Error message displayed in widget
- Admin notified of persistent aggregation failures

**Cache Failures**
- Redis unavailable: query object services directly
- Cache write failures logged but don't block response
- Stale cache data served with warning indicator
- Cache invalidation failures logged for manual cleanup

### MS-18: Report Service Error Handling

**Superset API Failures**
- Retry with exponential backoff (max 3 retries)
- Fallback to cached report metadata if available
- Guest token generation failure returns HTTP 503
- Error logged to Audit Service with Superset response

**Guest Token Expiration**
- Frontend detects expired token (HTTP 401 from Superset)
- Automatic token refresh via Report Service
- Seamless re-embedding without user interaction
- Token refresh failures prompt user to reload

**RLS Policy Sync Failures**
- RLS policy creation failures logged
- Report marked as unavailable until policy created
- Admin notification sent for manual intervention
- Periodic sync job retries failed policies

**Scheduled Report Delivery Failures**
- Email delivery failures logged with recipient and error
- Retry with exponential backoff (max 3 retries)
- Admin notification after max retries
- Failed deliveries tracked in report_access_log


## Testing Strategy

### Dual Testing Approach

Phase 3 services will employ both unit testing and property-based testing to ensure comprehensive coverage:

**Unit Tests:**
- Specific examples and edge cases
- Integration points between components
- Error conditions and failure scenarios
- Mock external dependencies (Temporal, Superset, external APIs)

**Property Tests:**
- Universal properties across all inputs
- Comprehensive input coverage through randomization
- Minimum 100 iterations per property test
- Each property test references design document property

### MS-15: Workflow Service Testing

**Unit Tests:**
- Workflow CRUD operations with valid/invalid inputs
- Trigger matching logic with various event types
- Step execution with different step types
- Error handling strategies (retry, skip, fail, compensate)
- Workflow import/export with sample workflows
- Sandbox mode execution without side effects

**Property Tests:**
- Property 1: Event-triggered workflow execution (100 iterations)
  - Generate random events and workflows
  - Verify matching triggers start executions
  - Tag: **Feature: phase-3-automation-analytics, Property 1: Event-triggered workflow execution**

- Property 2: Workflow step error handling (100 iterations)
  - Generate random workflows with failing steps
  - Verify error handling strategy applied
  - Tag: **Feature: phase-3-automation-analytics, Property 2: Workflow step error handling**

- Property 5: Workflow import/export round trip (100 iterations)
  - Generate random workflow definitions
  - Export to JSON, import, verify equivalence
  - Tag: **Feature: phase-3-automation-analytics, Property 5: Workflow import/export round trip**

- Property 6: Activity idempotency (100 iterations)
  - Execute same activity twice with same input
  - Verify identical results and side effects
  - Tag: **Feature: phase-3-automation-analytics, Property 6: Activity idempotency**

**Integration Tests:**
- Temporal workflow execution with mock activities
- Kafka event consumption and workflow triggering
- Webhook trigger endpoint with authentication
- Workflow testing endpoint with sandbox mode


### MS-16: Data Enrichment Service Testing

**Unit Tests:**
- Enrichment source CRUD with encrypted credentials
- Field mapping validation against object schemas
- External API client with timeout and retry
- OAuth2 token refresh logic
- Cache hit/miss scenarios
- Webhook callback with enriched data

**Property Tests:**
- Property 14: Enrichment credential encryption (100 iterations)
  - Generate random credentials
  - Verify encrypted storage, decrypted retrieval
  - Tag: **Feature: phase-3-automation-analytics, Property 14: Enrichment credential encryption**

- Property 15: Enrichment request deduplication (100 iterations)
  - Generate concurrent requests for same object
  - Verify only one external API call made
  - Tag: **Feature: phase-3-automation-analytics, Property 15: Enrichment request deduplication**

- Property 17: Field mapping application (100 iterations)
  - Generate random API responses and mappings
  - Verify JSONPath + JSONata transforms applied
  - Tag: **Feature: phase-3-automation-analytics, Property 17: Field mapping application**

- Property 19: Enrichment result caching (100 iterations)
  - Generate random enrichment requests
  - Verify cached results returned without API calls
  - Tag: **Feature: phase-3-automation-analytics, Property 19: Enrichment result caching**

**Integration Tests:**
- Mock external API with various response formats
- Redis lock for deduplication
- Webhook callback to object services
- Parallel source querying with timeout

### MS-17: Dashboard Service Testing

**Unit Tests:**
- Dashboard CRUD operations with widget configurations
- Metric aggregation with filters and groupBy
- RBAC scope enforcement (agent, supervisor, admin)
- Widget data caching with TTL
- WebSocket metric push to subscribed clients
- Time range parsing (today, last_7_days, custom)

**Property Tests:**
- Property 28: Dashboard widget data caching (100 iterations)
  - Generate random widget data requests
  - Verify cached results returned within TTL
  - Tag: **Feature: phase-3-automation-analytics, Property 28: Dashboard widget data caching**

- Property 30: Dashboard RBAC scope enforcement (100 iterations)
  - Generate random users with different roles
  - Verify data filtered by role scope
  - Tag: **Feature: phase-3-automation-analytics, Property 30: Dashboard RBAC scope enforcement**

- Property 32: Dashboard widget configuration validation (100 iterations)
  - Generate random widget configurations
  - Verify invalid configurations rejected
  - Tag: **Feature: phase-3-automation-analytics, Property 32: Dashboard widget configuration validation**

**Integration Tests:**
- Query object services for metric data
- WebSocket connection and metric push
- Redis cache with TTL expiration
- Dashboard assignment by role


### MS-18: Report Service Testing

**Unit Tests:**
- Report CRUD operations with Superset IDs
- Guest token generation with RLS claims
- Token expiration validation (5 minutes)
- Report schedule CRUD with cron expressions
- Superset API client with retry logic
- RLS policy configuration per tenant

**Property Tests:**
- Property 34: Superset guest token expiration (100 iterations)
  - Generate random guest tokens
  - Verify expiration exactly 5 minutes after generation
  - Tag: **Feature: phase-3-automation-analytics, Property 34: Superset guest token expiration**

- Property 43: Guest token expiration with RLS claims (100 iterations)
  - Generate random tokens with RLS claims
  - Verify expiration and claims included
  - Tag: **Feature: phase-3-automation-analytics, Property 43: Guest token expiration with RLS claims**

- Property 48: API rate limiting (100 iterations)
  - Generate requests exceeding rate limit
  - Verify HTTP 429 returned after limit
  - Tag: **Feature: phase-3-automation-analytics, Property 48: API rate limiting**

**Integration Tests:**
- Mock Superset API for chart/dashboard queries
- Guest token generation and validation
- Report access logging to Audit Service
- Scheduled report delivery via email

### E2E Testing Scenarios

**Progressive Loading Flow:**
1. Agent opens customer profile
2. Verify local data loads < 200ms
3. Verify enrichment fields show loading status
4. Verify WebSocket connection established
5. Verify enriched data arrives within 5 seconds
6. Verify UI updates without page reload

**Workflow Creation and Execution:**
1. Admin creates workflow in Workflow Designer
2. Configure trigger (event-based)
3. Add steps (send_notification, update_object)
4. Test workflow with sample data
5. Activate workflow
6. Trigger workflow via Kafka event
7. Verify workflow execution in Temporal UI
8. Verify side effects (notification sent, object updated)

**Dashboard Real-Time Updates:**
1. Agent opens dashboard
2. Verify widgets load with cached data
3. Create new interaction
4. Verify dashboard widget updates via WebSocket
5. Verify metric count incremented
6. Verify update latency < 100ms

**Report Viewing:**
1. Agent clicks report in navigation
2. Verify guest token generated
3. Verify Superset iframe embedded
4. Verify report loads with RLS applied
5. Verify token expires after 5 minutes
6. Verify automatic token refresh


### Test Coverage Requirements

**Unit Test Coverage:**
- Minimum 70% code coverage for all Phase 3 services
- 100% coverage for critical paths (authentication, encryption, audit logging)
- All error handling paths tested
- All validation logic tested

**Property Test Configuration:**
- Minimum 100 iterations per property test
- Use fast-check library for TypeScript property testing
- Seed-based randomization for reproducibility
- Shrinking enabled for minimal failing examples

**Integration Test Coverage:**
- All API endpoints tested with valid/invalid inputs
- All Kafka event consumers tested
- All WebSocket channels tested
- All external integrations mocked and tested

**Load Testing:**
- 500 concurrent dashboard viewers with real-time updates
- 100 concurrent workflow executions
- 50 concurrent enrichment requests
- 100 concurrent report viewers
- P99 latency targets met under load

**Security Testing:**
- OWASP Top 10 vulnerability scanning
- Zero critical vulnerabilities allowed
- Penetration testing for authentication and authorization
- Encryption validation for sensitive data
- Rate limiting validation

### Test Data Management

**Test Fixtures:**
- Sample workflow definitions for all 18 step types
- Sample enrichment sources for all 4 types (REST, SOAP, GraphQL, database)
- Sample dashboard configurations with all 12 widget types
- Sample report configurations with Superset charts and dashboards

**Mock Services:**
- Mock Temporal server for workflow testing
- Mock external APIs for enrichment testing
- Mock Superset API for report testing
- Mock Kafka broker for event testing

**Database Seeding:**
- Seed workflow_db with sample workflows
- Seed enrichment_db with sample sources and mappings
- Seed dashboard_db with sample dashboards and widgets
- Seed report_db with sample reports and schedules


## Security Architecture

### Authentication and Authorization

**JWT Validation:**
- All Phase 3 services validate JWT tokens on every request
- RS256 signature verification using public key from Identity Service
- Token expiration checked (15-minute access token TTL)
- Invalid tokens rejected with HTTP 401 Unauthorized

**RBAC Enforcement:**
- Workflow Service: workflow:read, workflow:write permissions
- Enrichment Service: enrichment:read, enrichment:write permissions
- Dashboard Service: dashboard:read, dashboard:write permissions
- Report Service: report:read, report:write permissions
- Admin endpoints require admin role

**Role-Based Data Filtering:**
- Dashboard Service: Agents see own metrics, supervisors see team metrics, admins see all
- Report Service: RLS policies in Superset match CRM role restrictions
- Workflow Service: Users can only view/edit workflows they created or have permission for

### Credential Management

**HashiCorp Vault Integration (MS-15):**
- Workflow credentials (webhook auth, API keys) stored in Vault
- Vault path: secret/workflows/{workflowId}/credentials
- Dynamic secrets with TTL for external API access
- Automatic credential rotation supported

**AES-256-GCM Encryption (MS-16):**
- Enrichment source credentials encrypted at rest
- Encryption key stored in environment variable (rotated quarterly)
- Initialization vector (IV) generated per encryption
- Authentication tag verified on decryption

**Superset Guest Tokens (MS-18):**
- 5-minute expiration enforced
- Single-use validation (token invalidated after first use)
- RLS claims embedded: tenantId, userId, roles
- Token hash stored in report_access_log for audit

### Network Security

**mTLS Between Services:**
- All inter-service communication via Istio service mesh
- Mutual TLS with certificate rotation every 90 days
- Service-to-service authentication enforced
- Network policies restrict traffic to authorized services

**API Rate Limiting:**
- Kong API Gateway enforces rate limits
- Default: 100 requests/minute per user
- Admin endpoints: 30 requests/minute per user
- Burst allowance: 20 requests
- Rate limit headers included in responses

**CORS Configuration:**
- Allowed origins: Agent Desktop, Admin Module
- Allowed methods: GET, POST, PUT, PATCH, DELETE
- Allowed headers: Authorization, Content-Type
- Credentials allowed for authenticated requests


### Audit Logging

**Workflow Execution Logging:**
- All workflow executions logged to Audit Service
- Category: workflow-execution
- Sensitivity: high
- Includes: workflowId, executionId, status, input, output, duration

**Enrichment Request Logging:**
- All external API calls logged to Audit Service
- Category: external-system-access
- Includes: sourceId, objectType, objectId, responseTime, status

**Dashboard Access Logging:**
- All dashboard views logged to Audit Service
- Category: dashboard-access
- Includes: dashboardId, userId, timestamp, widgets viewed

**Report Access Logging:**
- All report views logged to Audit Service
- Category: report-access
- Includes: reportId, userId, guestTokenHash, timestamp

**Configuration Change Logging:**
- All workflow/enrichment/dashboard/report config changes logged
- Category: configuration-change
- Includes: objectType, objectId, oldValues, newValues, actorId

## Caching Strategy

### Redis Cache Keys

**Workflow Service:**
- `workflow:definition:{workflowId}` - TTL: 5 minutes
- `workflow:execution:dedup:{eventId}:{workflowId}` - TTL: 24 hours
- `workflow:trigger:match:{eventType}` - TTL: 5 minutes

**Data Enrichment Service:**
- `enrichment:result:{objectType}:{objectId}:{sourceId}` - TTL: configurable (default 5 minutes)
- `enrichment:lock:{objectType}:{objectId}:{sourceId}` - TTL: 10 seconds
- `enrichment:oauth:token:{sourceId}` - TTL: token expiration - 60 seconds

**Dashboard Service:**
- `dashboard:config:{dashboardId}` - TTL: 5 minutes
- `dashboard:widget:data:{widgetId}` - TTL: dashboard refreshInterval
- `dashboard:metric:{dataSource}:{filters}:{timeRange}` - TTL: 30 seconds

**Report Service:**
- `report:metadata:{reportId}` - TTL: 5 minutes
- `report:superset:chart:{chartId}` - TTL: 1 hour
- `report:superset:dashboard:{dashboardId}` - TTL: 1 hour

### Cache Invalidation

**Workflow Service:**
- Invalidate workflow:definition on workflow update/delete
- Invalidate workflow:trigger:match on workflow activation/deactivation

**Data Enrichment Service:**
- Invalidate enrichment:result on source configuration change
- Stale-while-revalidate: serve stale data while fetching fresh data

**Dashboard Service:**
- Invalidate dashboard:config on dashboard update/delete
- Invalidate dashboard:widget:data on widget configuration change
- Real-time updates bypass cache

**Report Service:**
- Invalidate report:metadata on report update/delete
- Invalidate Superset cache on RLS policy change


## Event Flows

### Kafka Topics and Events

**workflow-events Topic:**
- `workflow.execution.started` - Published when workflow starts
  - Payload: {workflowId, executionId, temporalWorkflowId, input, timestamp}
- `workflow.execution.completed` - Published when workflow completes
  - Payload: {workflowId, executionId, status, output, duration, timestamp}
- `workflow.step.completed` - Published when workflow step completes
  - Payload: {workflowId, executionId, stepId, stepType, status, output, timestamp}

**enrichment-events Topic:**
- `enrichment.request.created` - Published when enrichment requested
  - Payload: {requestId, objectType, objectId, sourceIds, timestamp}
- `enrichment.completed` - Published when enrichment completes
  - Payload: {requestId, objectType, objectId, status, duration, timestamp}
- `enrichment.source.failed` - Published when source fails
  - Payload: {requestId, sourceId, error, timestamp}

**Consumed Events:**

**Workflow Service consumes:**
- `agent-events` topic: agent.status.changed, agent.session.started, agent.session.ended
- `interaction-events` topic: interaction.created, interaction.assigned, interaction.completed
- `ticket-events` topic: ticket.created, ticket.assigned, ticket.commented
- `customer-events` topic: customer.vip.detected, customer.fields.updated
- `sla-events` topic: sla.warning, sla.breached

**Data Enrichment Service consumes:**
- No Kafka consumption (triggered via internal API)

**Dashboard Service consumes:**
- `interaction-events` topic: For real-time metric updates
- `ticket-events` topic: For real-time metric updates
- `agent-events` topic: For agent status grid widget

**Report Service consumes:**
- No Kafka consumption (pull-based via Superset API)


## Frontend Components

### Admin Module - Workflow Designer

**WorkflowDesignerPage Component:**
- React Flow canvas for visual workflow design
- Drag-and-drop step palette with 18 step types
- Step configuration side panel
- Trigger configuration modal
- Workflow testing panel with sample data input
- Export/import workflow JSON

**WorkflowListPage Component:**
- Table view of all workflows
- Filters: isActive, triggerType
- Actions: Edit, Test, Activate/Deactivate, Delete
- Workflow execution history modal

**Step Configuration Components:**
- ConditionStepConfig: Visual condition builder
- NotificationStepConfig: Notification template editor
- EmailStepConfig: Email template editor with variables
- UpdateObjectStepConfig: Field selector and value editor
- AssignAgentStepConfig: Agent selection criteria
- WebhookStepConfig: URL, method, headers, body editor

### Admin Module - Dashboard Designer

**DashboardDesignerPage Component:**
- 12-column grid canvas with drag-and-drop
- Widget library with 12 widget types
- Widget configuration side panel
- Dashboard preview with live data
- Role assignment modal
- Refresh interval selector

**DashboardListPage Component:**
- Card view of all dashboards
- Filters: type (personal/team/department/system)
- Actions: Edit, Preview, Duplicate, Delete
- Dashboard assignment management

**Widget Configuration Components:**
- MetricCardConfig: Data source, filters, thresholds
- ChartConfig: Chart type, data source, groupBy, timeRange
- TableConfig: Columns, filters, sorting
- GaugeConfig: Data source, min/max, thresholds


### Admin Module - Enrichment Source Configuration

**EnrichmentSourceListPage Component:**
- Table view of all enrichment sources
- Filters: type (REST/SOAP/GraphQL/database), isActive
- Actions: Edit, Test, Activate/Deactivate, Delete
- Test connectivity button with response time display

**EnrichmentSourceFormPage Component:**
- Source type selector (REST/SOAP/GraphQL/database)
- Connection configuration form (baseUrl, headers, queryParams)
- Authentication configuration (API key, OAuth2, Basic, mTLS)
- Field mapping editor with JSONPath and JSONata support
- Cache policy configuration
- Rate limiting configuration
- Test connectivity panel

**FieldMappingEditor Component:**
- Source field input with JSONPath syntax highlighting
- Target object type selector (from Object Schema Service)
- Target field name selector (from Object Schema Service)
- JSONata transform editor with syntax validation
- Preview panel showing sample transformation

### Admin Module - Report Configuration

**ReportListPage Component:**
- Card view of all reports
- Filters: category
- Actions: Edit, View, Schedule, Delete
- Report permissions editor

**ReportFormPage Component:**
- Superset chart/dashboard selector (from Superset API)
- Report metadata editor (name, description, category)
- Role restrictions selector
- Schedule configuration (cron expression, recipients, format)
- Preview button to generate guest token and view report

**ReportScheduleModal Component:**
- Cron expression builder with visual interface
- Recipient email list editor
- Format selector (PDF, Excel, CSV)
- Next run time preview
- Test delivery button


### Agent Desktop - Dashboard View

**DashboardPage Component:**
- Grid layout with responsive columns
- Widget rendering based on type
- WebSocket connection for real-time updates
- Auto-refresh based on dashboard refreshInterval
- Loading skeletons for widgets
- Error indicators with retry buttons

**Widget Components:**
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

**DashboardWebSocketHook:**
- useWebSocket hook for dashboard channel
- Automatic reconnection with exponential backoff
- Message parsing and widget data updates
- Connection status indicator

### Agent Desktop - Report View

**ReportPage Component:**
- Report list with category filters
- Report card with name, description, category
- Click to open report in modal

**ReportViewerModal Component:**
- Full-screen modal with Superset iframe
- Guest token generation on open
- Automatic token refresh before expiration
- Loading indicator while token generates
- Error handling for token generation failures
- Close button to exit report view

**useGuestToken Hook:**
- Fetches guest token from Report Service
- Monitors token expiration (5 minutes)
- Automatically refreshes token at 4 minutes
- Handles token refresh failures


### Agent Desktop - Progressive Loading

**CustomerProfilePage Enhancement:**
- Local fields render immediately (< 200ms)
- Enrichment fields show skeleton placeholders with shimmer animation
- WebSocket subscription to /ws/objects/customer/{customerId}/fields
- Field updates applied without page reload or layout shift
- Error indicators for failed enrichment sources with retry button
- Loading timeout indicator if enrichment exceeds 5 seconds

**useProgressiveLoading Hook:**
```typescript
interface UseProgressiveLoadingOptions {
  objectType: 'customer' | 'ticket' | 'interaction' | 'kb_article' | 'bank_product';
  objectId: string;
  enrichmentFields: string[];
}

interface UseProgressiveLoadingResult {
  data: Record<string, any>;
  enrichmentStatus: Record<string, 'loading' | 'loaded' | 'error'>;
  retryEnrichment: (fieldName: string) => void;
}

function useProgressiveLoading(options: UseProgressiveLoadingOptions): UseProgressiveLoadingResult {
  // 1. Fetch local data immediately
  // 2. Subscribe to WebSocket channel
  // 3. Update enrichment fields as they arrive
  // 4. Handle errors and retries
}
```

**EnrichmentFieldDisplay Component:**
- Renders field value or skeleton based on enrichmentStatus
- Shimmer animation for loading state
- Error indicator with retry button for error state
- Smooth transition from skeleton to value

## Data Warehouse and Materialized Views

### Materialized View Definitions

**mv_interactions_daily:**
```sql
CREATE MATERIALIZED VIEW mv_interactions_daily AS
SELECT
  DATE(created_at) as date,
  tenant_id,
  channel,
  status,
  COUNT(*) as count,
  AVG(EXTRACT(EPOCH FROM (closed_at - created_at))) as avg_duration_seconds,
  COUNT(*) FILTER (WHERE sla_breached = false) as sla_met_count,
  COUNT(*) FILTER (WHERE sla_breached = true) as sla_breached_count,
  AVG(CASE WHEN sla_breached = false THEN 1 ELSE 0 END) as sla_compliance_rate
FROM interactions
WHERE created_at >= CURRENT_DATE - INTERVAL '90 days'
GROUP BY DATE(created_at), tenant_id, channel, status;

CREATE INDEX idx_mv_interactions_daily_date ON mv_interactions_daily(date);
CREATE INDEX idx_mv_interactions_daily_tenant ON mv_interactions_daily(tenant_id);
```

**mv_agent_performance:**
```sql
CREATE MATERIALIZED VIEW mv_agent_performance AS
SELECT
  DATE(i.created_at) as date,
  i.tenant_id,
  i.assigned_agent_id as agent_id,
  i.assigned_agent_name as agent_name,
  COUNT(*) as interactions_handled,
  AVG(EXTRACT(EPOCH FROM (i.closed_at - i.created_at))) as avg_handle_time_seconds,
  AVG(c.satisfaction_rating) as avg_satisfaction_rating,
  AVG(CASE WHEN i.sla_breached = false THEN 1 ELSE 0 END) as sla_compliance_rate
FROM interactions i
LEFT JOIN customers c ON i.customer_id = c.id
WHERE i.created_at >= CURRENT_DATE - INTERVAL '90 days'
  AND i.assigned_agent_id IS NOT NULL
GROUP BY DATE(i.created_at), i.tenant_id, i.assigned_agent_id, i.assigned_agent_name;

CREATE INDEX idx_mv_agent_performance_date ON mv_agent_performance(date);
CREATE INDEX idx_mv_agent_performance_agent ON mv_agent_performance(agent_id);
```

**mv_ticket_metrics:**
```sql
CREATE MATERIALIZED VIEW mv_ticket_metrics AS
SELECT
  DATE(created_at) as date,
  tenant_id,
  category,
  priority,
  status,
  COUNT(*) as count,
  AVG(EXTRACT(EPOCH FROM (resolved_at - created_at))) as avg_resolution_time_seconds
FROM tickets
WHERE created_at >= CURRENT_DATE - INTERVAL '90 days'
GROUP BY DATE(created_at), tenant_id, category, priority, status;

CREATE INDEX idx_mv_ticket_metrics_date ON mv_ticket_metrics(date);
CREATE INDEX idx_mv_ticket_metrics_tenant ON mv_ticket_metrics(tenant_id);
```

**mv_sla_compliance:**
```sql
CREATE MATERIALIZED VIEW mv_sla_compliance AS
SELECT
  DATE(created_at) as date,
  tenant_id,
  channel,
  type,
  COUNT(*) as total_interactions,
  COUNT(*) FILTER (WHERE sla_breached = false) as sla_met,
  COUNT(*) FILTER (WHERE sla_breached = true) as sla_breached,
  AVG(CASE WHEN sla_breached = false THEN 1 ELSE 0 END) as compliance_rate
FROM interactions
WHERE created_at >= CURRENT_DATE - INTERVAL '90 days'
GROUP BY DATE(created_at), tenant_id, channel, type;

CREATE INDEX idx_mv_sla_compliance_date ON mv_sla_compliance(date);
CREATE INDEX idx_mv_sla_compliance_tenant ON mv_sla_compliance(tenant_id);
```

### Materialized View Refresh Strategy

**Scheduled Refresh:**
- Cron job runs every 15 minutes
- Refreshes all materialized views concurrently
- Logs refresh duration and row counts
- Alerts if refresh takes > 5 minutes

**Refresh Script:**
```sql
-- Refresh all materialized views
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_interactions_daily;
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_agent_performance;
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_ticket_metrics;
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_sla_compliance;
```

**Row-Level Security:**
```sql
-- Enable RLS on materialized views
ALTER TABLE mv_interactions_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE mv_agent_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE mv_ticket_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE mv_sla_compliance ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY tenant_isolation ON mv_interactions_daily
  USING (tenant_id = current_setting('app.current_tenant')::uuid);

CREATE POLICY tenant_isolation ON mv_agent_performance
  USING (tenant_id = current_setting('app.current_tenant')::uuid);

CREATE POLICY tenant_isolation ON mv_ticket_metrics
  USING (tenant_id = current_setting('app.current_tenant')::uuid);

CREATE POLICY tenant_isolation ON mv_sla_compliance
  USING (tenant_id = current_setting('app.current_tenant')::uuid);
```


## Implementation Summary

### Phase 3 Deliverables

**4 Microservices:**
1. MS-15: Workflow Service - Temporal-based automation with 18 step types
2. MS-16: Data Enrichment Service - Progressive loading from external sources
3. MS-17: Dashboard Service - Real-time analytics with 12 widget types
4. MS-18: Report Service - Apache Superset integration with guest tokens

**4 Databases:**
- workflow_db: 3 tables (workflow_definitions, workflow_executions, workflow_step_results)
- enrichment_db: 3 tables (enrichment_sources, field_mappings, enrichment_requests)
- dashboard_db: 3 tables (dashboards, dashboard_widgets, dashboard_assignments)
- report_db: 3 tables (reports, report_schedules, report_access_log)

**API Endpoints:**
- Workflow Service: 8 endpoints (CRUD, test, activate, webhook trigger)
- Data Enrichment Service: 6 endpoints (CRUD, test, internal request)
- Dashboard Service: 7 endpoints (list, data, personal customization, admin CRUD)
- Report Service: 6 endpoints (list, embed token, admin CRUD, schedule)

**Frontend Components:**
- Admin Module: Workflow Designer, Dashboard Designer, Enrichment Config, Report Config
- Agent Desktop: Dashboard View, Report Viewer, Progressive Loading enhancements

**External Integrations:**
- Temporal: Workflow orchestration with durable execution
- Apache Superset: BI reporting with guest token authentication
- External APIs: CBS, Credit Bureau via Data Enrichment Service
- HashiCorp Vault: Credential storage for workflows

### Key Technical Achievements

**Workflow Automation:**
- Visual workflow designer with React Flow
- 18 step types covering notifications, emails, object updates, AI operations
- 4 trigger types: event, schedule, manual, webhook
- Durable execution via Temporal with retry and compensation
- Sandbox mode for testing without side effects

**Progressive Data Enrichment:**
- Sub-200ms initial response with local data
- Asynchronous enrichment from external sources
- WebSocket push for seamless UI updates
- Field mapping with JSONPath and JSONata transforms
- OAuth2 token refresh and circuit breaker patterns

**Real-Time Dashboards:**
- 12 widget types with configurable data sources
- WebSocket updates with < 100ms latency
- RBAC scope enforcement (agent/supervisor/admin)
- Redis caching with configurable TTL
- Drag-and-drop dashboard designer

**Embedded BI Reporting:**
- Superset guest tokens with 5-minute expiration
- RLS policies matching CRM tenant and role restrictions
- Scheduled report delivery via email
- Seamless iframe embedding with automatic token refresh

### Performance Targets

- Workflow step execution: P99 < 500ms
- Enrichment request: P99 < 2s (webhook to WebSocket)
- Dashboard widget data: P99 < 1s
- Guest token generation: P99 < 100ms
- Progressive loading: Complete within 5s
- 500 concurrent dashboard viewers supported
- 100 concurrent workflow executions supported

### Security Compliance

- All credentials encrypted (AES-256-GCM or Vault)
- JWT validation on every request (RS256)
- mTLS between all services (Istio)
- Rate limiting: 100 req/min default, 30 req/min admin
- Audit logging for all executions and access
- RLS policies in PostgreSQL and Superset
- OWASP Top 10 compliance verified

### Testing Coverage

- Unit test coverage: ≥ 70% for all services
- Property-based tests: 49 properties with 100 iterations each
- Integration tests: All API endpoints and WebSocket channels
- E2E tests: Progressive loading, workflow execution, dashboard updates, report viewing
- Load tests: 500 concurrent users with acceptable performance
- Security tests: Zero critical vulnerabilities

### Deployment Readiness

**Infrastructure Requirements:**
- PostgreSQL 18.3: 4 new databases
- Redis 8.6: Caching and locking
- Kafka 4.2.0: Event streaming
- Temporal: Workflow orchestration
- Apache Superset: BI reporting
- HashiCorp Vault: Credential storage

**Configuration:**
- Environment variables for all services
- Kong API Gateway routes configured
- Istio service mesh policies applied
- Database migrations ready
- Seed data for testing

**Monitoring:**
- Prometheus metrics for all services
- Grafana dashboards for Phase 3 services
- Temporal UI for workflow monitoring
- Superset admin UI for report management
- Kafka UI for event monitoring

### Go-Live 3 Readiness Checklist

- [ ] All 4 services deployed and healthy
- [ ] All 4 databases created and migrated
- [ ] Temporal server configured and connected
- [ ] Apache Superset configured with RLS policies
- [ ] HashiCorp Vault configured with workflow credentials
- [ ] Kong routes configured for all endpoints
- [ ] Istio mTLS enabled for all services
- [ ] Materialized views created and refreshing
- [ ] Admin Module deployed with workflow/dashboard/report designers
- [ ] Agent Desktop updated with dashboard/report views
- [ ] All tests passing (unit, property, integration, E2E)
- [ ] Load testing completed with acceptable performance
- [ ] Security scanning completed with zero critical vulnerabilities
- [ ] Documentation updated (API docs, admin guides, user guides)
- [ ] Training materials prepared for admins and agents
- [ ] Runbook created for operations team

**Phase 3 completes the TPB CRM Platform with full automation, enrichment, analytics, and reporting capabilities, ready for enterprise production deployment.**

