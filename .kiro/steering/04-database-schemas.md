---
inclusion: always
---

# Database Schemas Registry

**Project:** TPB CRM Platform
**Last Updated:** 2026-03-08
**Purpose:** Track database schemas across all 19 microservices

## 📋 Overview

**Total Databases:** 19 (one per microservice)
**DBMS:** PostgreSQL 18.3
**Implemented:** 0/19

---

## Database Naming Convention

```
{service_name}_db

Examples:
- identity_db
- agent_db
- interaction_db
- ticket_db
```

---

## MS-1: Identity Service Database

**Database Name:** `identity_db`
**Status:** ⚪ Not Started
**Phase:** Phase 1

### Tables

#### users
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  agent_id TEXT,
  is_active BOOLEAN DEFAULT true,
  mfa_enabled BOOLEAN DEFAULT false,
  mfa_secret TEXT,                    -- encrypted at rest
  last_login_at TIMESTAMPTZ,
  failed_login_attempts INTEGER DEFAULT 0,
  locked_until TIMESTAMPTZ,
  tenant_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_tenant ON users(tenant_id);
```

#### roles
```sql
CREATE TABLE roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  permissions JSONB DEFAULT '[]',
  tenant_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### user_roles
```sql
CREATE TABLE user_roles (
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, role_id)
);
```

#### refresh_tokens
```sql
CREATE TABLE refresh_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  ip_address INET,
  user_agent TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_refresh_tokens_user ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_hash ON refresh_tokens(token_hash);
```

#### login_attempts
```sql
CREATE TABLE login_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  username TEXT,
  ip_address INET,
  user_agent TEXT,
  success BOOLEAN NOT NULL,
  failure_reason TEXT,
  attempted_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_login_attempts_user ON login_attempts(user_id);
CREATE INDEX idx_login_attempts_time ON login_attempts(attempted_at);
```

---

## MS-2: Agent Service Database

**Database Name:** `agent_db`
**Status:** ⚪ Not Started
**Phase:** Phase 1

### Tables

#### agent_profiles
```sql
CREATE TABLE agent_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,              -- FK to Identity Service (logical)
  agent_id TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  department TEXT,
  team TEXT,
  skills JSONB DEFAULT '[]',
  max_concurrent_chats INTEGER DEFAULT 3,
  max_concurrent_emails INTEGER DEFAULT 5,
  tenant_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_agent_profiles_user ON agent_profiles(user_id);
CREATE INDEX idx_agent_profiles_agent_id ON agent_profiles(agent_id);
```

#### agent_channel_status
```sql
CREATE TABLE agent_channel_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES agent_profiles(id) ON DELETE CASCADE,
  channel TEXT NOT NULL,              -- voice, email, chat
  status TEXT NOT NULL,               -- ready, not-ready, disconnected
  reason TEXT,
  custom_reason TEXT,
  changed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (agent_id, channel)
);

CREATE INDEX idx_agent_status_agent ON agent_channel_status(agent_id);
```

#### agent_sessions
```sql
CREATE TABLE agent_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES agent_profiles(id) ON DELETE CASCADE,
  login_at TIMESTAMPTZ NOT NULL,
  logout_at TIMESTAMPTZ,
  connection_status TEXT DEFAULT 'connected',
  last_heartbeat_at TIMESTAMPTZ DEFAULT NOW(),
  ip_address INET,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_agent_sessions_agent ON agent_sessions(agent_id);
```

---

## MS-3: Interaction Service Database

**Database Name:** `interaction_db`
**Status:** ⚪ Not Started
**Phase:** Phase 1

### Tables

#### interactions
```sql
CREATE TABLE interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  display_id TEXT UNIQUE NOT NULL,
  tenant_id UUID NOT NULL,
  type TEXT NOT NULL,                 -- call, missed-call, email, chat
  channel TEXT NOT NULL,              -- voice, email, chat
  status TEXT NOT NULL,               -- new, in-progress, resolved, completed, closed
  priority TEXT NOT NULL DEFAULT 'medium',
  customer_id UUID NOT NULL,
  customer_name TEXT,                 -- denormalized
  assigned_agent_id UUID,
  assigned_agent_name TEXT,           -- denormalized
  subject TEXT,
  tags TEXT[] DEFAULT '{}',
  is_vip BOOLEAN DEFAULT false,
  direction TEXT,                     -- inbound, outbound
  source TEXT,
  metadata JSONB DEFAULT '{}',        -- channel-specific data
  dynamic_fields JSONB DEFAULT '{}',  -- for Phase 2+
  sla_due_at TIMESTAMPTZ,
  sla_breached BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  closed_at TIMESTAMPTZ
);

CREATE INDEX idx_interactions_customer ON interactions(customer_id);
CREATE INDEX idx_interactions_agent ON interactions(assigned_agent_id);
CREATE INDEX idx_interactions_status ON interactions(status);
CREATE INDEX idx_interactions_channel ON interactions(channel);
CREATE INDEX idx_interactions_created ON interactions(created_at);
```

#### interaction_notes
```sql
CREATE TABLE interaction_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  interaction_id UUID REFERENCES interactions(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL,
  agent_name TEXT NOT NULL,
  content TEXT NOT NULL,
  tag TEXT,
  is_pinned BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_interaction_notes_interaction ON interaction_notes(interaction_id);
```

#### interaction_events
```sql
CREATE TABLE interaction_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  interaction_id UUID REFERENCES interactions(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL,
  duration INTEGER,
  description TEXT,
  agent_id UUID,
  data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_interaction_events_interaction ON interaction_events(interaction_id);
CREATE INDEX idx_interaction_events_timestamp ON interaction_events(timestamp);
```

---

## MS-4: Ticket Service Database

**Database Name:** `ticket_db`
**Status:** ⚪ Not Started
**Phase:** Phase 1

### Tables

#### tickets
```sql
CREATE TABLE tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  display_id TEXT UNIQUE NOT NULL,    -- TK-2026-000001
  tenant_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  priority TEXT NOT NULL DEFAULT 'medium',
  category TEXT,
  department TEXT,
  assigned_agent_id UUID,
  customer_id UUID NOT NULL,
  interaction_id UUID,
  due_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  dynamic_fields JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_tickets_customer ON tickets(customer_id);
CREATE INDEX idx_tickets_agent ON tickets(assigned_agent_id);
CREATE INDEX idx_tickets_status ON tickets(status);
CREATE INDEX idx_tickets_created ON tickets(created_at);
```

#### ticket_comments
```sql
CREATE TABLE ticket_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID REFERENCES tickets(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL,
  agent_name TEXT NOT NULL,
  content TEXT NOT NULL,
  is_internal BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ticket_comments_ticket ON ticket_comments(ticket_id);
```

#### ticket_history
```sql
CREATE TABLE ticket_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID REFERENCES tickets(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL,
  agent_name TEXT NOT NULL,
  field_name TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  changed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ticket_history_ticket ON ticket_history(ticket_id);
```

---

## MS-5: Customer Service Database

**Database Name:** `customer_db`
**Status:** ⚪ Not Started
**Phase:** Phase 1

### Tables

#### customers
```sql
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  cif TEXT UNIQUE NOT NULL,           -- encrypted at rest
  full_name TEXT NOT NULL,
  email TEXT,                         -- encrypted at rest
  phone TEXT,                         -- encrypted at rest
  segment TEXT,                       -- individual, sme, corporate
  is_vip BOOLEAN DEFAULT false,
  avatar_url TEXT,
  satisfaction_rating INTEGER,
  dynamic_fields JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_customers_cif ON customers(cif);
CREATE INDEX idx_customers_tenant ON customers(tenant_id);
```

#### customer_notes
```sql
CREATE TABLE customer_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL,
  agent_name TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_customer_notes_customer ON customer_notes(customer_id);
```

---

## MS-6: Notification Service Database

**Database Name:** `notification_db`
**Status:** ⚪ Not Started
**Phase:** Phase 1

### Tables

#### notifications
```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  agent_id UUID NOT NULL,
  type TEXT NOT NULL,                 -- call, chat, ticket, sla, system
  priority TEXT NOT NULL DEFAULT 'medium',
  state TEXT NOT NULL DEFAULT 'new',  -- new, viewed, actioned, dismissed
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  action_url TEXT,
  action_label TEXT,
  metadata JSONB DEFAULT '{}',
  auto_hide_seconds INTEGER,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notifications_agent ON notifications(agent_id);
CREATE INDEX idx_notifications_state ON notifications(state);
CREATE INDEX idx_notifications_created ON notifications(created_at);
```

---

## MS-7: Knowledge Service Database

**Database Name:** `knowledge_db`
**Status:** ⚪ Not Started
**Phase:** Phase 2

### Tables

#### kb_articles
```sql
CREATE TABLE kb_articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  title TEXT NOT NULL,
  summary TEXT,
  content TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  category TEXT,
  folder_id UUID,
  view_count INTEGER DEFAULT 0,
  rating DECIMAL(3,2),
  dynamic_fields JSONB DEFAULT '{}',
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_kb_articles_folder ON kb_articles(folder_id);
CREATE INDEX idx_kb_articles_category ON kb_articles(category);
```

#### kb_folders
```sql
CREATE TABLE kb_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  name TEXT NOT NULL,
  parent_id UUID REFERENCES kb_folders(id) ON DELETE CASCADE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## MS-8: BFSI Core Banking Service Database

**Database Name:** `bfsi_db`
**Status:** ⚪ Not Started
**Phase:** Phase 2

### Tables

#### bank_products
```sql
CREATE TABLE bank_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  customer_id UUID NOT NULL,
  type TEXT NOT NULL,                 -- account, savings, loan, card
  account_number TEXT,                -- encrypted at rest
  balance DECIMAL(20,2),              -- encrypted at rest
  status TEXT,
  dynamic_fields JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_bank_products_customer ON bank_products(customer_id);
```

---

## MS-11: Audit Service Database

**Database Name:** `audit_db`
**Status:** ⚪ Not Started
**Phase:** Phase 2

### Tables

#### audit_logs
```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sequence BIGSERIAL,
  tenant_id UUID NOT NULL,
  event_type TEXT NOT NULL,
  actor_id UUID,
  actor_role TEXT,
  resource_type TEXT,
  resource_id UUID,
  action TEXT NOT NULL,
  old_values JSONB,
  new_values JSONB,
  ip_address INET,
  user_agent TEXT,
  prev_hash TEXT,                     -- hash chaining
  event_hash TEXT,                    -- SHA-256(event_data + prev_hash)
  occurred_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
) WITH (fillfactor = 100);            -- no updates allowed

CREATE INDEX idx_audit_logs_tenant ON audit_logs(tenant_id);
CREATE INDEX idx_audit_logs_actor ON audit_logs(actor_id);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX idx_audit_logs_occurred ON audit_logs(occurred_at);

-- Row-Level Security
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY audit_insert_only ON audit_logs FOR INSERT TO audit_writer WITH CHECK (true);
CREATE POLICY audit_read_admin ON audit_logs FOR SELECT TO audit_reader USING (true);
```

---

## MS-13: Object Schema Service Database

**Database Name:** `object_schema_db`
**Status:** ⚪ Not Started
**Phase:** Phase 2

### Tables

#### object_types
```sql
CREATE TABLE object_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  name TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  display_name_plural TEXT NOT NULL,
  icon TEXT,
  version INTEGER DEFAULT 1,
  is_system BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### field_definitions
```sql
CREATE TABLE field_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  object_type_id UUID REFERENCES object_types(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  display_name TEXT NOT NULL,
  field_type TEXT NOT NULL,
  data_source TEXT DEFAULT 'local',
  enrichment_source_id UUID,
  is_required BOOLEAN DEFAULT false,
  is_read_only BOOLEAN DEFAULT false,
  is_searchable BOOLEAN DEFAULT false,
  is_sortable BOOLEAN DEFAULT false,
  is_filterable BOOLEAN DEFAULT false,
  is_sensitive BOOLEAN DEFAULT false,
  is_unique BOOLEAN DEFAULT false,
  default_value JSONB,
  validation_rules JSONB DEFAULT '[]',
  display_config JSONB DEFAULT '{}',
  sort_order INTEGER DEFAULT 0,
  group_name TEXT,
  is_core BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (object_type_id, name)
);
```

---

## MS-14: Layout Service Database

**Database Name:** `layout_db`
**Status:** ⚪ Not Started
**Phase:** Phase 2

### Tables

#### layouts
```sql
CREATE TABLE layouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  object_type TEXT NOT NULL,
  context TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  role_restrictions TEXT[] DEFAULT '{}',
  config JSONB NOT NULL,
  version INTEGER DEFAULT 1,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_layouts_object_type ON layouts(object_type);
CREATE INDEX idx_layouts_context ON layouts(context);
```

---

## MS-15: Workflow Service Database

**Database Name:** `workflow_db`
**Status:** ⚪ Not Started
**Phase:** Phase 3

### Tables

#### workflow_definitions
```sql
CREATE TABLE workflow_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT false,
  version INTEGER DEFAULT 1,
  trigger JSONB NOT NULL,
  steps JSONB NOT NULL,
  variables JSONB DEFAULT '[]',
  error_handling JSONB DEFAULT '{}',
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 📝 Database Management Scripts

### Init Script Template

```bash
#!/bin/bash
# infra/scripts/init-db.sh

set -e

DATABASES=(
  "identity_db"
  "agent_db"
  "interaction_db"
  "ticket_db"
  "customer_db"
  "notification_db"
  "knowledge_db"
  "bfsi_db"
  "ai_db"
  "media_db"
  "audit_db"
  "object_schema_db"
  "layout_db"
  "workflow_db"
  "enrichment_db"
  "dashboard_db"
  "report_db"
  "cti_db"
  "gateway_db"
)

for db in "${DATABASES[@]}"; do
  echo "Creating database: $db"
  psql -U postgres -c "CREATE DATABASE $db;"
  psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE $db TO postgres;"
done

echo "All databases created successfully!"
```

---

## 📝 Update Instructions

**When implementing a database:**
1. Change status from ⚪ to 🟡 (in progress)
2. Create migration files
3. When complete, change to ✅
4. Document any deviations from spec
5. Update "Last Updated" date

**Status Legend:**
- ⚪ Not Started
- 🟡 In Progress
- ✅ Implemented
- 🔴 Deprecated

---

## 📚 References

- **FullStack-RequirementsV2.md** - Database schemas for MS-1 to MS-11
- **FullStack-RequirementsV3.md** - Database schemas for MS-13 to MS-19
- **TypeORM Migrations:** (to be created per service)
