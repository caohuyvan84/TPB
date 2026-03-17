import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ObjectType, FieldDefinition } from '../entities';

@Injectable()
export class SchemaService {
  private cache = new Map<string, { data: any; expires: number }>();

  constructor(
    @InjectRepository(ObjectType)
    private objectTypeRepo: Repository<ObjectType>,
    @InjectRepository(FieldDefinition)
    private fieldRepo: Repository<FieldDefinition>,
  ) {}

  async getSchema(objectTypeName: string) {
    const cacheKey = `schema:${objectTypeName}`;
    const cached = this.cache.get(cacheKey);
    if (cached && cached.expires > Date.now()) {
      return cached.data;
    }

    const objectType = await this.objectTypeRepo.findOne({ where: { name: objectTypeName } });
    if (!objectType) throw new Error('Object type not found');

    const fields = await this.fieldRepo.find({
      where: { objectTypeId: objectType.id, isActive: true },
      order: { sortOrder: 'ASC' },
    });

    const schema = {
      id: objectType.id,
      name: objectType.name,
      displayName: objectType.displayName,
      version: objectType.version,
      fields: fields.map((f) => ({
        id: f.id,
        name: f.name,
        displayName: f.displayName,
        fieldType: f.fieldType,
        isRequired: f.isRequired,
        isReadOnly: f.isReadOnly,
        defaultValue: f.defaultValue,
        validationRules: f.validationRules,
        sortOrder: f.sortOrder,
      })),
    };

    this.cache.set(cacheKey, { data: schema, expires: Date.now() + 300000 });
    return schema;
  }

  async createObjectType(tenantId: string, data: any) {
    const objectType = this.objectTypeRepo.create({
      tenantId,
      name: data.name,
      displayName: data.displayName,
      displayNamePlural: data.displayNamePlural,
      icon: data.icon,
      version: 1,
    });
    return this.objectTypeRepo.save(objectType);
  }

  async addField(objectTypeId: string, data: any) {
    const field = this.fieldRepo.create({
      objectTypeId,
      name: data.name,
      displayName: data.displayName,
      fieldType: data.fieldType,
      isRequired: data.isRequired || false,
      defaultValue: data.defaultValue,
      validationRules: data.validationRules || [],
      sortOrder: data.sortOrder || 0,
    });
    const saved = await this.fieldRepo.save(field);

    // Invalidate cache
    const objectType = await this.objectTypeRepo.findOne({ where: { id: objectTypeId } });
    if (objectType) {
      this.cache.delete(`schema:${objectType.name}`);
    }

    return saved;
  }

  async listObjectTypes(tenantId: string) {
    return this.objectTypeRepo.find({ where: { tenantId } });
  }
}
