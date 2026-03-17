import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from '../entities';
import * as crypto from 'crypto';

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditLog)
    private auditRepo: Repository<AuditLog>,
  ) {}

  async log(data: {
    tenantId: string;
    eventType: string;
    actorId?: string;
    actorRole?: string;
    resourceType?: string;
    resourceId?: string;
    action: string;
    oldValues?: Record<string, any>;
    newValues?: Record<string, any>;
    ipAddress?: string;
    userAgent?: string;
  }) {
    const occurredAt = new Date();

    // Get previous hash for chaining
    const prevLog = await this.auditRepo.findOne({
      where: { tenantId: data.tenantId },
      order: { sequence: 'DESC' },
    });

    const prevHash = prevLog?.eventHash || null;

    // Calculate event hash
    const eventData = JSON.stringify({
      ...data,
      occurredAt: occurredAt.toISOString(),
      prevHash,
    });
    const eventHash = crypto.createHash('sha256').update(eventData).digest('hex');

    const log = this.auditRepo.create({
      ...data,
      occurredAt,
      prevHash,
      eventHash,
    });

    return this.auditRepo.save(log);
  }

  async query(filters: {
    tenantId?: string;
    actorId?: string;
    resourceType?: string;
    resourceId?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
    offset?: number;
  }) {
    const qb = this.auditRepo.createQueryBuilder('log');

    if (filters.tenantId) {
      qb.andWhere('log.tenant_id = :tenantId', { tenantId: filters.tenantId });
    }

    if (filters.actorId) {
      qb.andWhere('log.actor_id = :actorId', { actorId: filters.actorId });
    }

    if (filters.resourceType) {
      qb.andWhere('log.resource_type = :resourceType', { resourceType: filters.resourceType });
    }

    if (filters.resourceId) {
      qb.andWhere('log.resource_id = :resourceId', { resourceId: filters.resourceId });
    }

    if (filters.startDate) {
      qb.andWhere('log.occurred_at >= :startDate', { startDate: filters.startDate });
    }

    if (filters.endDate) {
      qb.andWhere('log.occurred_at <= :endDate', { endDate: filters.endDate });
    }

    qb.orderBy('log.occurred_at', 'DESC');
    qb.skip(filters.offset || 0);
    qb.take(filters.limit || 100);

    const [logs, total] = await qb.getManyAndCount();

    return { logs, total };
  }

  async verifyChain(tenantId: string): Promise<{ valid: boolean; brokenAt?: number }> {
    const logs = await this.auditRepo.find({
      where: { tenantId },
      order: { sequence: 'ASC' },
    });

    for (let i = 1; i < logs.length; i++) {
      if (logs[i].prevHash !== logs[i - 1].eventHash) {
        return { valid: false, brokenAt: logs[i].sequence };
      }
    }

    return { valid: true };
  }
}
