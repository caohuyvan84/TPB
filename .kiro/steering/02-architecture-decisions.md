---
inclusion: always
---

# Architecture Decision Records (ADR)

**Project:** TPB CRM Platform
**Last Updated:** 2026-03-08

## ADR Format

Each decision follows this structure:
- **Status:** Accepted | Proposed | Deprecated | Superseded
- **Context:** Why we need to make this decision
- **Decision:** What we decided
- **Consequences:** Positive and negative outcomes

---

## ADR-001: Nx Monorepo for Code Organization

**Date:** 2026-03-06
**Status:** ✅ Accepted

### Context
- Need to share TypeScript types between frontend and backend
- Multiple frontend apps (Agent Desktop, Admin Module)
- 19 microservices need consistent tooling
- Want to optimize CI/CD with affected builds

### Decision
Use Nx monorepo with the following structure:
- `apps/` - Frontend applications
- `services/` - Backend microservices
- `packages/` - Shared libraries (types, DTOs, utils)

### Consequences
**Positive:**
- Type safety across frontend/backend boundary
- Nx affected builds reduce CI time
- Consistent tooling and configuration
- Easy code sharing

**Negative:**
- Initial setup complexity
- Larger repository size
- Need to learn Nx tooling

---

## ADR-002: NestJS for Backend Microservices

**Date:** 2026-03-06
**Status:** ✅ Accepted

### Context
- Need TypeScript on backend to share types with frontend
- Require dependency injection for testability
- Want built-in support for microservices patterns
- Need decorator-based RBAC

### Decision
Use NestJS framework for all 19 microservices

### Consequences
**Positive:**
- Full TypeScript support
- Built-in DI container
- Decorator-based routing and validation
- Excellent documentation
- Active community

**Negative:**
- Opinionated framework structure
- Learning curve for team
- Some boilerplate code

---

## ADR-003: PostgreSQL 18.3 as Primary Database

**Date:** 2026-03-06
**Status:** ✅ Accepted

### Context
- Need ACID transactions for financial data
- Require JSONB for dynamic object fields
- Need Row-Level Security (RLS) for multi-tenancy
- Want strong consistency guarantees

### Decision
Use PostgreSQL 18.3 with one database per microservice

### Consequences
**Positive:**
- JSONB support for dynamic fields
- RLS for security
- Async I/O performance improvements (v18.3)
- Mature ecosystem
- Strong ACID guarantees

**Negative:**
- More complex than NoSQL for some use cases
- Need to manage 19 separate databases
- Requires careful schema design

---

## ADR-004: React 19.2.x Upgrade from React 18

**Date:** 2026-03-08
**Status:** ✅ Accepted

### Context
- Existing Agent Desktop built with React 18
- React 19 offers performance improvements
- Want to use latest features (use(), useOptimistic())
- Need to align with 2026 best practices

### Decision
Upgrade Agent Desktop from React 18 to React 19.2.x during Phase 0 monorepo migration

### Consequences
**Positive:**
- Access to React 19 features
- Better performance (automatic batching improvements)
- Future-proof codebase
- Ref as prop (simpler component APIs)

**Negative:**
- Breaking changes require testing
- forwardRef patterns need review
- useEffect timing changes
- Risk of UI breakage during migration

**Mitigation:**
- Detailed upgrade checklist created
- Component-by-component testing plan
- Backup and rollback strategy
- Preserve existing index.css to minimize changes

---

## ADR-005: SeaweedFS over MinIO for Object Storage

**Date:** 2026-03-08
**Status:** ✅ Accepted

### Context
- MinIO archived in December 2025
- Need S3-compatible object storage
- Want on-premise solution
- Require high performance for call recordings

### Decision
Use SeaweedFS as S3-compatible object storage

### Consequences
**Positive:**
- Active development (MinIO archived)
- S3-compatible API
- High performance
- Distributed architecture
- Good documentation

**Negative:**
- Less mature than MinIO
- Smaller community
- Team needs to learn new tool

---

## ADR-006: Apache Kafka 4.2.0 with KRaft Mode

**Date:** 2026-03-08
**Status:** ✅ Accepted

### Context
- Need event streaming for microservices
- ZooKeeper removed in Kafka 4.x
- Want simplified deployment
- Require high throughput for audit logs

### Decision
Use Apache Kafka 4.2.0 in KRaft mode (no ZooKeeper)

### Consequences
**Positive:**
- Simplified architecture (no ZooKeeper)
- Better performance
- Easier to operate
- Reduced infrastructure complexity

**Negative:**
- KRaft mode is newer (less battle-tested)
- Migration path from older Kafka versions more complex

---

## ADR-007: TanStack Query v5 for Server State

**Date:** 2026-03-06
**Status:** ✅ Accepted

### Context
- Need to replace mock data with API calls
- Want automatic caching and background sync
- Require optimistic updates for better UX
- Need to separate server state from UI state

### Decision
Use TanStack Query (React Query) v5 for all server state management

### Consequences
**Positive:**
- Automatic caching and invalidation
- Background refetching
- Optimistic updates
- Excellent DevTools
- Reduces boilerplate

**Negative:**
- Learning curve for team
- Need to design cache keys carefully
- Can be over-engineered for simple cases

---

## ADR-008: JWT with Refresh Token Rotation

**Date:** 2026-03-06
**Status:** ✅ Accepted

### Context
- BFSI security requirements
- Need stateless authentication
- Want short-lived access tokens
- Require MFA support

### Decision
- Access token: JWT (RS256), 15 minutes TTL
- Refresh token: 7 days TTL, rotation on use
- MFA required for sensitive operations
- Token blacklist in Redis

### Consequences
**Positive:**
- Stateless authentication
- Short-lived tokens reduce risk
- Refresh rotation prevents replay attacks
- MFA adds security layer

**Negative:**
- More complex than session-based auth
- Need to handle token refresh logic
- Redis dependency for blacklist

---

## ADR-009: Temporal for Workflow Orchestration

**Date:** 2026-03-06
**Status:** ✅ Accepted

### Context
- Need durable workflow execution
- Want to handle long-running processes (SLA escalation)
- Require retry and compensation logic
- Need visibility into workflow state

### Decision
Use Temporal (self-hosted) for workflow orchestration

### Consequences
**Positive:**
- Durable execution (survives crashes)
- Built-in retry and compensation
- Excellent visibility (Temporal UI)
- Code-as-workflow (TypeScript)

**Negative:**
- Additional infrastructure to manage
- Learning curve
- Operational complexity

---

## ADR-010: Field-Level Encryption for PII

**Date:** 2026-03-06
**Status:** ✅ Accepted

### Context
- BFSI compliance requires PII protection
- Need to encrypt sensitive fields at rest
- Want to minimize performance impact
- Require key rotation capability

### Decision
Use AES-256-GCM for field-level encryption of:
- Phone numbers
- Email addresses
- CIF (Customer ID)
- Account numbers
- Balances

### Consequences
**Positive:**
- Strong encryption (AES-256-GCM)
- Authenticated encryption (prevents tampering)
- Field-level granularity
- Compliance with BFSI standards

**Negative:**
- Performance overhead on read/write
- Cannot search encrypted fields directly
- Key management complexity
- Need to handle key rotation

---

## ADR-011: Istio Service Mesh for mTLS

**Date:** 2026-03-06
**Status:** ✅ Accepted

### Context
- Need mTLS between all microservices
- Want automatic certificate rotation
- Require traffic management and observability
- BFSI security requirement

### Decision
Use Istio service mesh for:
- Automatic mTLS between services
- Traffic management
- Observability (metrics, tracing)
- Policy enforcement

### Consequences
**Positive:**
- Automatic mTLS (no code changes)
- Certificate rotation handled
- Rich observability
- Traffic control (circuit breaker, retry)

**Negative:**
- Additional infrastructure complexity
- Resource overhead (sidecar proxies)
- Learning curve
- Debugging can be harder

---

## ADR-012: One Database Per Microservice

**Date:** 2026-03-06
**Status:** ✅ Accepted

### Context
- Microservices should be independently deployable
- Need to avoid tight coupling
- Want to scale services independently
- Each service owns its domain data

### Decision
Each of the 19 microservices has its own PostgreSQL database

### Consequences
**Positive:**
- True service independence
- Can scale databases independently
- No shared schema coupling
- Clear ownership boundaries

**Negative:**
- More databases to manage
- Cross-service queries require API calls
- Data consistency challenges
- Higher operational complexity

---

## ADR-013: Immutable Audit Logs with Hash Chaining

**Date:** 2026-03-06
**Status:** ✅ Accepted

### Context
- BFSI compliance requires tamper-proof audit logs
- Need to detect unauthorized modifications
- Want 7-year retention
- Require forensic capabilities

### Decision
Implement immutable audit logs with:
- Write-only PostgreSQL table
- Hash chaining (each log references previous hash)
- Row-Level Security (RLS)
- Separate audit_writer and audit_reader roles

### Consequences
**Positive:**
- Tamper detection via hash chain
- Compliance with regulations
- Forensic capabilities
- Clear audit trail

**Negative:**
- Cannot delete or modify logs
- Storage grows continuously
- Need archival strategy
- Hash verification overhead

---

## ADR-014: Dynamic Object Schema with JSONB

**Date:** 2026-03-06
**Status:** ✅ Accepted

### Context
- Need to support custom fields without schema changes
- Want to avoid ALTER TABLE for new fields
- Require flexibility for different customers
- Need to maintain type safety for core fields

### Decision
Hybrid approach:
- Core fields: Typed PostgreSQL columns
- Dynamic fields: JSONB column `dynamic_fields`
- Schema definitions in Object Schema Service (MS-13)
- Validation at application layer

### Consequences
**Positive:**
- No schema migrations for custom fields
- Flexibility for customization
- Core fields remain typed
- Fast iteration

**Negative:**
- JSONB queries slower than typed columns
- Cannot enforce constraints at DB level
- Need application-level validation
- More complex queries

---

## ADR-015: Apache Superset for BI Reporting

**Date:** 2026-03-06
**Status:** ✅ Accepted

### Context
- Need embedded BI reporting
- Want SQL-based report creation
- Require dashboard embedding in Agent Desktop
- Need role-based access control

### Decision
Use Apache Superset with:
- Embedded SDK for iframe integration
- Guest token authentication
- Report Service (MS-18) as proxy
- Agents never access Superset directly

### Consequences
**Positive:**
- Powerful SQL-based reporting
- Rich visualization library
- Embedded mode supported
- Open source

**Negative:**
- Complex setup
- Need to manage guest tokens
- UI not as modern as commercial tools
- Python dependency (different from Node.js stack)

---

## 📝 Decision Template

Use this template for new ADRs:

```markdown
## ADR-XXX: [Title]

**Date:** YYYY-MM-DD
**Status:** Proposed | Accepted | Deprecated | Superseded

### Context
[Why we need to make this decision]

### Decision
[What we decided]

### Consequences
**Positive:**
- [Benefit 1]
- [Benefit 2]

**Negative:**
- [Drawback 1]
- [Drawback 2]

**Mitigation:** (if applicable)
- [How we address drawbacks]
```

---

## 📚 References

- [ADR GitHub](https://adr.github.io/)
- [Documenting Architecture Decisions](https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions)
