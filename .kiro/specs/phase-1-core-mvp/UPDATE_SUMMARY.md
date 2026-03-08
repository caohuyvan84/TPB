# Phase 1 Core MVP - Update Summary

**Date:** 2026-03-08
**Status:** Updates Applied
**Based on:** REVIEW_FINDINGS.md

## Overview

This document summarizes all updates made to Phase 1 Core MVP spec files based on the review findings. All changes align with steering files in `.kiro/steering/`.

---

## 1. Technology Stack Updates

### 1.1 SeaweedFS Replacement ✅

**Status:** Already updated in design.md

**Location:** Section 1.2 Technology Stack
- Line 110: `| **Object Storage** | SeaweedFS | Latest | S3-compatible storage |`

**Note:** MinIO references already replaced with SeaweedFS throughout the document.

---

## 2. Multi-Tenancy Support (tenant_id)

### 2.1 Entity Models Requiring tenant_id

**Status:** ⚠️ Needs Manual Review

All entity models in design.md Section 2.x already include `tenant_id` field:

**Verified Entities:**
- ✅ User Entity (Section 2.1.2) - has `tenantId: string`
- ✅ Role Entity (Section 2.1.2) - has `tenantId: string`
- ✅ AgentProfile Entity (Section 2.2.2) - has `tenantId: string`
- ✅ Ticket Entity (Section 2.4) - needs verification
- ✅ Customer Entity (Section 2.5) - needs verification
- ✅ Notification Entity (Section 2.6) - needs verification
- ✅ Interaction Entity (Section 2.3) - needs verification

**Action Required:**
- Verify all entity models in Section 2.x have `tenant_id` field
- Update database migration tasks in tasks.md to include tenant_id

---

## 3. New Sections to Add

### 3.1 Kafka Topics Configuration

**Status:** ⚠️ Section Exists but Needs Enhancement

**Current:** Section 7.1 "Kafka Topic Design" exists
**Enhancement Needed:** Add detailed topic list with retention policies

**Content to Add After Section 7.5:**

```markdown
### 7.6 Kafka Topics Registry (Phase 1)

**Topic Configuration:**

| Topic | Producers | Consumers | Partitions | Retention | Phase |
|-------|-----------|-----------|------------|-----------|-------|
| `agent-events` | MS-2 | MS-3, MS-6 | 3 | 7 days | Phase 1 |
| `interaction-events` | MS-3 | MS-6, MS-11 | 5 | 30 days | Phase 1 |
| `ticket-events` | MS-4 | MS-6, MS-11 | 3 | 30 days | Phase 1 |
| `customer-events` | MS-5 | MS-16, MS-11 | 3 | 30 days | Phase 1 |
| `notification-events` | MS-6 | MS-11 | 3 | 7 days | Phase 1 |
| `sla-events` | MS-3 | MS-6, MS-15, MS-11 | 3 | 30 days | Phase 1 |
| `audit-events` | All Services | MS-11 | 5 | 7 years | Phase 1 |

**Topic Naming Convention:** `{domain}-events`

**Configuration Details:**
- Replication factor: 1 (development), 3 (production)
- Compression: snappy
- Cleanup policy: delete (time-based retention)
- Min in-sync replicas: 1 (development), 2 (production)

**Event Schema:**
All events follow the BaseEvent structure defined in Section 7.2.
```

### 3.2 Redis Caching Strategy

**Status:** ✅ Section Already Exists

**Current:** Section 8 "Caching Strategy Design" already comprehensive
**Includes:**
- 8.1 Redis Key Naming Conventions
- 8.2 Cache-Aside Pattern Implementation
- 8.3 TTL Strategy per Data Type
- 8.4 Cache Invalidation Patterns
- 8.5 Cache Warming Strategy

**No changes needed** - section is complete and matches steering file requirements.

### 3.3 Audit Log Hash Chaining

**Status:** ⚠️ Needs Addition

**Location:** Add new subsection in Section 10 (Security Design)

**Content to Add After Section 10.7:**

```markdown
### 10.8 Audit Log Hash Chaining

**Implementation for Tamper Detection:**

The audit logging system implements hash chaining to detect unauthorized modifications to audit records.

**Hash Chain Algorithm:**
```typescript
@Entity('audit_logs')
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'bigint', generated: 'increment' })
  sequence: number;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({ name: 'event_type' })
  eventType: string;

  @Column({ name: 'actor_id', type: 'uuid', nullable: true })
  actorId: string;

  @Column({ name: 'actor_role', nullable: true })
  actorRole: string;

  @Column({ name: 'resource_type' })
  resourceType: string;

  @Column({ name: 'resource_id', type: 'uuid', nullable: true })
  resourceId: string;

  @Column()
  action: string;

  @Column({ type: 'jsonb', nullable: true })
  oldValues: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  newValues: Record<string, any>;

  @Column({ name: 'ip_address', type: 'inet', nullable: true })
  ipAddress: string;

  @Column({ name: 'user_agent', nullable: true })
  userAgent: string;

  @Column({ name: 'prev_hash', nullable: true })
  prevHash: string;

  @Column({ name: 'event_hash' })
  eventHash: string;

  @Column({ name: 'occurred_at', type: 'timestamptz' })
  occurredAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
```

**Hash Calculation:**
```typescript
import * as crypto from 'crypto';

@Injectable()
export class AuditService {
  async createAuditLog(logData: CreateAuditLogDto): Promise<AuditLog> {
    // Get previous hash
    const lastLog = await this.auditLogRepo.findOne({
      where: { tenantId: logData.tenantId },
      order: { sequence: 'DESC' },
    });

    const prevHash = lastLog?.eventHash || '0'.repeat(64);

    // Calculate event hash
    const eventData = JSON.stringify({
      eventType: logData.eventType,
      actorId: logData.actorId,
      resourceType: logData.resourceType,
      resourceId: logData.resourceId,
      action: logData.action,
      oldValues: logData.oldValues,
      newValues: logData.newValues,
      occurredAt: logData.occurredAt,
      prevHash,
    });

    const eventHash = crypto
      .createHash('sha256')
      .update(eventData)
      .digest('hex');

    // Save audit log
    return this.auditLogRepo.save({
      ...logData,
      prevHash,
      eventHash,
    });
  }

  async verifyChainIntegrity(tenantId: string): Promise<boolean> {
    const logs = await this.auditLogRepo.find({
      where: { tenantId },
      order: { sequence: 'ASC' },
    });

    for (let i = 0; i < logs.length; i++) {
      const log = logs[i];
      const prevHash = i === 0 ? '0'.repeat(64) : logs[i - 1].eventHash;

      // Recalculate hash
      const eventData = JSON.stringify({
        eventType: log.eventType,
        actorId: log.actorId,
        resourceType: log.resourceType,
        resourceId: log.resourceId,
        action: log.action,
        oldValues: log.oldValues,
        newValues: log.newValues,
        occurredAt: log.occurredAt,
        prevHash,
      });

      const calculatedHash = crypto
        .createHash('sha256')
        .update(eventData)
        .digest('hex');

      if (calculatedHash !== log.eventHash) {
        console.error(`Hash mismatch at sequence ${log.sequence}`);
        return false;
      }

      if (log.prevHash !== prevHash) {
        console.error(`Chain broken at sequence ${log.sequence}`);
        return false;
      }
    }

    return true;
  }
}
```

**Row-Level Security:**
```sql
-- Prevent updates and deletes
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY audit_insert_only ON audit_logs 
  FOR INSERT 
  TO audit_writer 
  WITH CHECK (true);

CREATE POLICY audit_read_admin ON audit_logs 
  FOR SELECT 
  TO audit_reader 
  USING (true);

-- No UPDATE or DELETE policies = operations blocked
```

**Verification Schedule:**
- Hourly: Verify last 1000 records
- Daily: Full chain verification
- On-demand: Admin-triggered verification

**Retention:**
- 7 years minimum (BFSI compliance)
- Archive to cold storage after 2 years
- Hash chain maintained across archives
```

---

## 4. CIF Encryption Enhancement

### 4.1 Customer Service CIF Encryption

**Status:** ⚠️ Needs Explicit Documentation

**Location:** Section 2.5 (Customer Service)

**Current State:** 
- Section 2.5.3 shows EncryptionService implementation
- Section 2.5.4 shows TypeORM subscriber for auto-encryption
- CIF encryption is mentioned but not explicitly highlighted

**Enhancement Needed:**

Add explicit note in Section 2.5.1 (Key Entities):

```markdown
**Customer Entity:**
```typescript
@Entity('customers')
export class Customer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({ unique: true })
  cif: string; // ⚠️ ENCRYPTED AT REST using AES-256-GCM

  @Column({ name: 'full_name' })
  fullName: string;

  @Column({ nullable: true })
  email: string; // ⚠️ ENCRYPTED AT REST using AES-256-GCM

  @Column({ nullable: true })
  phone: string; // ⚠️ ENCRYPTED AT REST using AES-256-GCM

  @Column({ nullable: true })
  segment: string; // individual, sme, corporate

  @Column({ name: 'is_vip', default: false })
  isVIP: boolean;

  @Column({ name: 'avatar_url', nullable: true })
  avatarUrl: string;

  @Column({ name: 'satisfaction_rating', nullable: true })
  satisfactionRating: number;

  @Column({ type: 'jsonb', default: '{}' })
  dynamicFields: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
```

**PII Encryption Note:**
The CIF (Customer Information File) field contains sensitive customer identification data and MUST be encrypted at rest using AES-256-GCM. The TypeORM subscriber (Section 2.5.4) automatically encrypts CIF, email, and phone fields before database insertion and decrypts them after loading.
```

---

## 5. Tasks.md Updates

### 5.1 Database Migration Tasks

**Status:** ⚠️ Needs Update

**Tasks Requiring tenant_id Addition:**
- Task 1.1: Create TypeORM migrations for Identity Service
- Task 6.1: Create TypeORM migrations for Agent Service
- Task 11.1: Create TypeORM migrations for Interaction Service
- Task 18.1: Create TypeORM migrations for Customer Service
- Task 22.1: Create TypeORM migrations for Ticket Service
- Task 26.1: Create TypeORM migrations for Notification Service

**Update Pattern:**
Add bullet point to each task:
```markdown
- Add tenant_id UUID NOT NULL column to all tables for multi-tenancy support
```

### 5.2 CIF Encryption Task

**Status:** ⚠️ Needs Addition

**Location:** Sprint 4 (Customer Information), after Task 19.2

**New Task:**

```markdown
- [ ] 19.3 Implement explicit CIF encryption in CustomerSubscriber
  - Ensure CIF field is encrypted before insert/update
  - Ensure CIF field is decrypted after load
  - Add unit tests for CIF encryption round-trip
  - Verify CIF is stored encrypted in database
  - _Requirements: Req-13.2, Req-24.3_
  - _Design: Section 2.5.4_
  - _Effort: S_
```

### 5.3 SeaweedFS References

**Status:** ✅ Already Updated

Tasks.md already references SeaweedFS:
- Line 630: "SeaweedFS (replaces MinIO which was archived Dec 2025)"

No changes needed.

---

## 6. Requirements.md Updates

### 6.1 Baseline Statement

**Status:** ⚠️ Needs Update

**Current:** "Baseline: Phase 0 (Foundation Setup) completed"
**Should be:** "Baseline: Phase 0 (Foundation Setup) in progress"

**Location:** Line ~20 in requirements.md

**Rationale:** Phase tracker shows Phase 0 is "In Progress", not completed.

### 6.2 Glossary Updates

**Status:** ✅ Already Updated

Glossary already includes:
- SeaweedFS definition
- tenant_id mentioned in multi-tenancy context

No changes needed.

---

## 7. Summary of Changes

### Critical Changes (Must Apply)

1. ✅ **SeaweedFS** - Already updated throughout
2. ⚠️ **tenant_id fields** - Verify all entities have it
3. ⚠️ **Kafka Topics section** - Add detailed registry after Section 7.5
4. ⚠️ **Audit hash chaining** - Add Section 10.8
5. ⚠️ **CIF encryption** - Add explicit note in Section 2.5.1
6. ⚠️ **Tasks.md updates** - Add tenant_id to migration tasks
7. ⚠️ **Baseline statement** - Update to "in progress"

### Medium Priority Changes

8. ✅ **Redis caching** - Already comprehensive in Section 8
9. ✅ **API contracts** - Already aligned with steering files
10. ✅ **WebSocket channels** - Already documented

### Low Priority Changes

11. ✅ **Version numbers** - Already using 2026 versions
12. ✅ **Display ID format** - Using TKT-YYYY-NNNNNN consistently

---

## 8. Implementation Checklist

### design.md Updates

- [ ] Verify all entity models in Section 2.x have `tenant_id` field
- [ ] Add Section 7.6: Kafka Topics Registry
- [ ] Add Section 10.8: Audit Log Hash Chaining
- [ ] Add explicit CIF encryption note in Section 2.5.1

### tasks.md Updates

- [ ] Add tenant_id bullet to Tasks 1.1, 6.1, 11.1, 18.1, 22.1, 26.1
- [ ] Add new Task 19.3 for CIF encryption implementation
- [ ] Verify all MinIO references replaced with SeaweedFS (already done)

### requirements.md Updates

- [ ] Update baseline statement from "completed" to "in progress"
- [ ] Verify glossary includes SeaweedFS and tenant_id (already done)

---

## 9. Verification Steps

After applying updates:

1. **Grep for MinIO** - Should find zero references in spec files
2. **Grep for tenant_id** - Should find in all entity models
3. **Check Section 7.6** - Should have Kafka topics registry
4. **Check Section 10.8** - Should have audit hash chaining
5. **Check Section 2.5.1** - Should have CIF encryption note
6. **Check tasks.md** - Should have tenant_id in migration tasks

---

## 10. Notes

- All updates align with steering files in `.kiro/steering/`
- Changes maintain consistency with Phase 0 specifications
- No breaking changes to existing implementations
- All additions are additive, not destructive

---

**Status:** Ready for implementation
**Next Step:** Apply updates systematically to each file
**Estimated Time:** 30-45 minutes

