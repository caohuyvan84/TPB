import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Layout } from '../entities';

@Injectable()
export class LayoutService {
  private cache = new Map<string, { data: any; expires: number }>();

  constructor(
    @InjectRepository(Layout)
    private layoutRepo: Repository<Layout>,
  ) {}

  async getLayout(objectType: string, context: string, userRoles: string[]) {
    const cacheKey = `layout:${objectType}:${context}`;
    const cached = this.cache.get(cacheKey);
    if (cached && cached.expires > Date.now()) {
      return cached.data;
    }

    const layouts = await this.layoutRepo.find({
      where: { objectType, context, isActive: true },
      order: { isDefault: 'DESC' },
    });

    const layout = layouts.find(
      (l) => l.roleRestrictions.length === 0 || l.roleRestrictions.some((r) => userRoles.includes(r)),
    );

    if (!layout) throw new Error('No layout found');

    this.cache.set(cacheKey, { data: layout, expires: Date.now() + 300000 });
    return layout;
  }

  async createLayout(tenantId: string, createdBy: string, data: any) {
    const layout = this.layoutRepo.create({
      tenantId,
      objectType: data.objectType,
      context: data.context,
      name: data.name,
      description: data.description,
      isDefault: data.isDefault || false,
      config: data.config,
      createdBy,
    });
    return this.layoutRepo.save(layout);
  }

  async listLayouts(tenantId: string, objectType?: string) {
    const where: any = { tenantId };
    if (objectType) where.objectType = objectType;
    return this.layoutRepo.find({ where });
  }
}
