import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { SchemaService } from './schema.service';
import { ObjectType, FieldDefinition } from '../entities';

describe('SchemaService', () => {
  let service: SchemaService;
  let objectTypeRepo: any;
  let fieldRepo: any;

  beforeEach(async () => {
    objectTypeRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn((data) => data),
      save: jest.fn((data) => Promise.resolve({ id: 'obj-1', ...data })),
    };

    fieldRepo = {
      find: jest.fn(),
      create: jest.fn((data) => data),
      save: jest.fn((data) => Promise.resolve({ id: 'field-1', ...data })),
    };

    const module = await Test.createTestingModule({
      providers: [
        SchemaService,
        { provide: getRepositoryToken(ObjectType), useValue: objectTypeRepo },
        { provide: getRepositoryToken(FieldDefinition), useValue: fieldRepo },
      ],
    }).compile();

    service = module.get(SchemaService);
  });

  it('should get schema', async () => {
    objectTypeRepo.findOne.mockResolvedValue({
      id: 'obj-1',
      name: 'customer',
      displayName: 'Customer',
      version: 1,
    });
    fieldRepo.find.mockResolvedValue([
      {
        id: 'field-1',
        name: 'email',
        displayName: 'Email',
        fieldType: 'email',
        isRequired: true,
        isReadOnly: false,
        sortOrder: 0,
        validationRules: [],
      },
    ]);

    const result = await service.getSchema('customer');
    expect(result.name).toBe('customer');
    expect(result.fields).toHaveLength(1);
  });

  it('should cache schema', async () => {
    objectTypeRepo.findOne.mockResolvedValue({
      id: 'obj-1',
      name: 'customer',
      displayName: 'Customer',
      version: 1,
    });
    fieldRepo.find.mockResolvedValue([]);

    await service.getSchema('customer');
    await service.getSchema('customer');

    expect(objectTypeRepo.findOne).toHaveBeenCalledTimes(1);
  });

  it('should create object type', async () => {
    const result = await service.createObjectType('tenant-1', {
      name: 'custom',
      displayName: 'Custom',
      displayNamePlural: 'Customs',
    });
    expect(result.id).toBe('obj-1');
  });

  it('should add field', async () => {
    objectTypeRepo.findOne.mockResolvedValue({ id: 'obj-1', name: 'customer' });

    const result = await service.addField('obj-1', {
      name: 'custom_field',
      displayName: 'Custom Field',
      fieldType: 'text',
    });
    expect(result.id).toBe('field-1');
  });

  it('should list object types', async () => {
    objectTypeRepo.find.mockResolvedValue([
      { id: 'obj-1', name: 'customer' },
      { id: 'obj-2', name: 'ticket' },
    ]);

    const result = await service.listObjectTypes('tenant-1');
    expect(result).toHaveLength(2);
  });
});
