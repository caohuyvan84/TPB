# Phase 1 Core MVP - Spec Review Findings

**Date:** 2026-03-08
**Reviewer:** AI Agent
**Baseline:** Steering files in `.kiro/steering/`

## Executive Summary

Sau khi review chi tiết spec hiện tại của phase-1-core-mvp và đối chiếu với các steering files, tôi đã xác định được các điểm cần update để đảm bảo tính nhất quán và chính xác với project context.

**Tổng quan:**
- ✅ **Cấu trúc tổng thể**: Tốt, đầy đủ requirements, design, tasks
- ⚠️ **Technology versions**: Cần update một số versions
- ⚠️ **Database schemas**: Cần đối chiếu với steering file
- ⚠️ **Infrastructure**: Cần update SeaweedFS thay vì MinIO
- ⚠️ **API contracts**: Cần verify endpoints với steering file

---

## 1. Technology Stack Updates

### 1.1 Infrastructure Components

**Current (in spec):**
- MinIO for object storage

**Should be (from steering):**
- **SeaweedFS** for object storage (MinIO archived December 2025)

**Impact:** Medium
**Files affected:** 
- `requirements.md` - Glossary, Requirement 8, 9, 10
- `design.md` - Section 1.2 Technology Stack
- `tasks.md` - Any tasks mentioning MinIO

**Rationale:** ADR-005 in `02-architecture-decisions.md` states MinIO was archived in December 2025, SeaweedFS is the chosen replacement.

---

### 1.2 Version Alignment

**Current versions in spec vs Steering files:**

| Component | Spec Version | Steering Version | Status |
|-----------|--------------|------------------|--------|
| Node.js | 24.13.x LTS | 24.13.x LTS | ✅ Match |
| PostgreSQL | 18.3 | 18.3 | ✅ Match |
| Redis | 8.x | 8.6 | ⚠️ Minor diff |
| Kafka | 4.2.0 | 4.2.0 (KRaft) | ✅ Match |
| Elasticsearch | 9.x | 9.3.0 | ⚠️ Minor diff |
| React | 19.2.x | 19.2.x | ✅ Match |
| NestJS | 10.x | Latest | ✅ Match |
| TypeScript | 5.7.x | 5.7 | ✅ Match |

**Recommendation:** Update to specific versions from steering files for consistency.

---

## 2. Database Schema Alignment

### 2.1 Ticket Service Schema

**Finding:** Cấu trúc bảng `tickets` trong spec cần verify với `04-database-schemas.md`

**Current schema in spec:**
```sql
CREATE TABLE tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  display_id TEXT UNIQUE NOT NULL,
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
```

**Steering file schema (04-database-schemas.md):**
```sql
CREATE TABLE tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  display_id TEXT UNIQUE NOT NULL,    -- TK-2026-000001
  tenant_id UUID NOT NULL,             -- ⚠️ MISSING in spec
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
```

**Issue:** Missing `tenant_id` column for multi-tenancy support

**Impact:** High - affects multi-tenancy architecture
**Action required:** Add `tenant_id UUID NOT NULL` to all entity schemas

---

### 2.2 Multi-Tenancy Support

**Finding:** Tất cả các entity cần có `tenant_id` field

**Entities cần update:**
- ✅ User (có tenant_id)
- ✅ Role (có tenant_id)
- ✅ AgentProfile (có tenant_id)
- ⚠️ Interaction (cần verify)
- ⚠️ Ticket (thiếu tenant_id)
- ⚠️ Customer (cần verify)
- ⚠️ Notification (cần verify)

**Recommendation:** Review tất cả entity definitions và đảm bảo có `tenant_id` field.

---

## 3. API Contracts Verification

### 3.1 Endpoint Alignment

**Cross-reference với `03-api-contracts.md`:**

| Service | Endpoints in Spec | Endpoints in Steering | Status |
|---------|-------------------|----------------------|--------|
| MS-1 Identity | 6 auth + 4 user endpoints | 6 auth + 4 user endpoints | ✅ Match |
| MS-2 Agent | 11 endpoints | 11 endpoints | ✅ Match |
| MS-3 Interaction | 16 endpoints | 16 endpoints | ✅ Match |
| MS-4 Ticket | 8 endpoints | 8 endpoints | ✅ Match |
| MS-5 Customer | 7 endpoints | 7 endpoints | ✅ Match |
| MS-6 Notification | 4 endpoints | 4 endpoints | ✅ Match |

**Status:** ✅ Good alignment

---

### 3.2 WebSocket Channels

**Verification với steering files:**

| Channel | Spec | Steering | Status |
|---------|------|----------|--------|
| `/ws/agent/{agentId}/status` | ✅ | ✅ | Match |
| `/ws/agent/{agentId}/presence` | ✅ | ✅ | Match |
| `/ws/interactions/{agentId}/queue` | ✅ | ✅ | Match |
| `/ws/interactions/{interactionId}/chat` | ✅ | ✅ | Match |
| `/ws/interactions/{interactionId}/sla` | ✅ | ✅ | Match |
| `/ws/notifications/{agentId}` | ✅ | ✅ | Match |

**Status:** ✅ All channels aligned

---

## 4. Integration Points

### 4.1 Kafka Topics

**Verification với `05-integration-points.md`:**

| Topic | Spec | Steering | Retention | Status |
|-------|------|----------|-----------|--------|
| `agent-events` | ✅ | ✅ | 7 days | Match |
| `interaction-events` | ✅ | ✅ | 30 days | Match |
| `ticket-events` | ✅ | ✅ | 30 days | Match |
| `customer-events` | ⚠️ | ✅ | 30 days | Not mentioned in spec |
| `notification-events` | ⚠️ | ✅ | 7 days | Not mentioned in spec |
| `sla-events` | ✅ | ✅ | 30 days | Match |
| `audit-events` | ✅ | ✅ | 7 years | Match |

**Issue:** Spec không mention rõ `customer-events` và `notification-events` topics

**Recommendation:** Add explicit Kafka topic configuration section in design.md

---

### 4.2 Redis Cache Keys

**Verification với steering files:**

| Key Pattern | Spec | Steering | TTL | Status |
|-------------|------|----------|-----|--------|
| `session:{userId}` | ✅ | ✅ | 15 min | Match |
| `refresh_token:{tokenHash}` | ✅ | ✅ | 7 days | Match |
| `agent_status:{agentId}` | ✅ | ✅ | 5 min | Match |
| `customer:profile:{id}` | ⚠️ | ✅ | 5 min | Not explicit in spec |

**Recommendation:** Add Redis caching strategy section with all key patterns

---

## 5. Security & Compliance

### 5.1 PII Encryption

**Current in spec:**
- ✅ AES-256-GCM mentioned
- ✅ Email, phone encryption mentioned
- ⚠️ CIF encryption not explicitly mentioned in Customer entity

**Steering file (04-database-schemas.md):**
```sql
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cif TEXT UNIQUE NOT NULL,           -- encrypted at rest ⚠️
  email TEXT,                         -- PII — encrypted
  phone TEXT,                         -- PII — encrypted
  ...
);
```

**Issue:** CIF field cần được encrypt nhưng không được mention rõ trong spec

**Recommendation:** Update Customer entity design to explicitly mention CIF encryption

---

### 5.2 Audit Logging

**Current in spec:**
- ✅ Audit Service mentioned
- ✅ Immutable logs mentioned
- ⚠️ Hash chaining implementation details not in design

**Steering file (04-database-schemas.md):**
```sql
CREATE TABLE audit_logs (
  ...
  prev_hash TEXT,                -- hash chaining
  event_hash TEXT,               -- SHA-256(event_data + prev_hash)
  ...
) WITH (fillfactor = 100);       -- no updates allowed
```

**Recommendation:** Add detailed audit log schema with hash chaining to design.md

---

## 6. Phase 0 Baseline Verification

### 6.1 Foundation Setup Status

**From `01-phase-tracker.md`:**

Current Phase 0 status: 🟡 In Progress (0/11 task groups completed)

**Assumption in Phase 1 spec:**
> "Baseline: Phase 0 (Foundation Setup) completed"

**Issue:** Spec assumes Phase 0 is complete, but phase tracker shows it's in progress

**Recommendation:** 
- Option 1: Update spec to reflect Phase 0 is prerequisite (not yet complete)
- Option 2: Update phase tracker if Phase 0 is actually complete

---

## 7. Display ID Format

### 7.1 Ticket Display ID

**Current in spec:**
- Format: `TKT-YYYY-NNNNNN`
- Example: `TKT-2026-000001`

**Steering file:**
- Format: `TK-2026-000001` (shorter prefix)

**Issue:** Inconsistency in display ID format

**Recommendation:** Clarify which format is correct:
- `TKT-YYYY-NNNNNN` (spec)
- `TK-YYYY-NNNNNN` (steering)

---

## 8. React Version

### 8.1 React Upgrade Status

**Current in spec:**
- React 19.2.x mentioned throughout

**Steering files:**
- `00-project-context.md`: "React 19.2.x (upgraded from React 18)"
- `01-phase-tracker.md`: Phase 0 includes React 19 upgrade task

**Status:** ✅ Consistent

**Note:** ADR-004 documents React 19.2.x upgrade decision with detailed checklist

---

## 9. Missing Sections

### 9.1 Sections Present in Steering but Missing in Spec

**From steering files that should be in spec:**

1. **Service Mesh (Istio) Configuration**
   - Location: Should be in design.md Section 1
   - Content: mTLS configuration, certificate management
   - Impact: Medium

2. **Observability Stack**
   - Location: Should be in design.md
   - Content: Jaeger, Prometheus, Grafana, ELK
   - Impact: Low (Phase 1 focus is functionality)

3. **Deployment Configuration**
   - Location: Should be in design.md or separate deployment doc
   - Content: Docker Compose setup, environment variables
   - Impact: Medium

---

## 10. Tasks Alignment

### 10.1 Task Count Verification

**Current tasks.md:**
- Total: 78 tasks (58 implementation + 20 optional testing)
- Organized by 6 sprints + cross-cutting

**Steering file (ImplementationPlan.md):**
- Sprint 1-2: Authentication & Identity (12 tasks)
- Sprint 2-3: Agent Management (11 tasks)
- Sprint 3-4: Interaction Queue (13 tasks)
- Sprint 4: Customer Information (10 tasks)
- Sprint 5: Ticket Management (12 tasks)
- Sprint 6: Notifications (10 tasks)
- Cross-cutting: 10 tasks

**Total from steering:** ~68 tasks

**Issue:** Task count mismatch (78 vs 68)

**Recommendation:** Review task breakdown to ensure alignment with ImplementationPlan.md

---

## 11. Priority Updates

### High Priority (Must Fix)

1. ✅ **Add `tenant_id` to all entities** - Critical for multi-tenancy
2. ✅ **Update MinIO → SeaweedFS** - Infrastructure change
3. ✅ **Add CIF encryption** - Security requirement
4. ✅ **Clarify Phase 0 baseline** - Dependency management

### Medium Priority (Should Fix)

5. ⚠️ **Add Kafka topics section** - Integration clarity
6. ⚠️ **Add Redis cache strategy** - Performance optimization
7. ⚠️ **Add audit log hash chaining** - Security compliance
8. ⚠️ **Verify display ID format** - Consistency

### Low Priority (Nice to Have)

9. ⚪ **Add Istio configuration** - Infrastructure detail
10. ⚪ **Add observability stack** - Monitoring setup
11. ⚪ **Update specific versions** - Minor version alignment

---

## 12. Recommended Actions

### Immediate Actions (Before Implementation)

1. **Update all entity schemas** to include `tenant_id`
2. **Replace MinIO with SeaweedFS** in all references
3. **Add explicit CIF encryption** in Customer Service design
4. **Clarify Phase 0 completion status**

### Short-term Actions (During Sprint 1)

5. **Add Kafka topics configuration** section to design.md
6. **Add Redis caching strategy** section to design.md
7. **Add audit log implementation** details with hash chaining
8. **Verify and standardize** display ID formats

### Long-term Actions (Throughout Phase 1)

9. **Add deployment configuration** documentation
10. **Add observability setup** guide
11. **Keep spec updated** as implementation progresses

---

## 13. Files Requiring Updates

### Requirements.md
- [ ] Update Glossary: MinIO → SeaweedFS
- [ ] Add tenant_id to all entity descriptions
- [ ] Clarify CIF encryption requirement
- [ ] Update Phase 0 baseline statement

### Design.md
- [ ] Section 1.2: Update technology stack (SeaweedFS)
- [ ] Section 2.x: Add tenant_id to all entity models
- [ ] Add new section: Kafka Topics Configuration
- [ ] Add new section: Redis Caching Strategy
- [ ] Add new section: Audit Log Implementation
- [ ] Update Customer Service: Add CIF encryption details

### Tasks.md
- [ ] Update any MinIO references to SeaweedFS
- [ ] Review task count alignment with ImplementationPlan.md
- [ ] Add tenant_id to database migration tasks
- [ ] Add CIF encryption implementation task

---

## 14. Conclusion

**Overall Assessment:** ⚠️ Good foundation, needs targeted updates

**Strengths:**
- ✅ Comprehensive requirements coverage (30 requirements)
- ✅ Detailed design with code examples
- ✅ Well-structured tasks (78 tasks)
- ✅ Good API contract alignment
- ✅ WebSocket channels properly defined

**Weaknesses:**
- ⚠️ Multi-tenancy support incomplete (missing tenant_id)
- ⚠️ Infrastructure references outdated (MinIO)
- ⚠️ Some security details missing (CIF encryption, hash chaining)
- ⚠️ Integration patterns not fully documented

**Recommendation:** Proceed with targeted updates before implementation starts. Priority should be on multi-tenancy and infrastructure updates.

---

## 15. Next Steps

1. **Review this document** with team/stakeholders
2. **Prioritize updates** based on impact and urgency
3. **Create update tasks** for each identified issue
4. **Update spec files** systematically
5. **Verify updates** against steering files
6. **Get approval** before starting implementation

---

**Document Status:** Draft for Review
**Last Updated:** 2026-03-08
**Next Review:** After updates are applied
