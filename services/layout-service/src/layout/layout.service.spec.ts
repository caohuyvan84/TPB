import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { LayoutService } from './layout.service';
import { Layout } from '../entities';

describe('LayoutService', () => {
  let service: LayoutService;
  let layoutRepo: any;

  beforeEach(async () => {
    layoutRepo = {
      find: jest.fn(),
      create: jest.fn((data) => data),
      save: jest.fn((data) => Promise.resolve({ id: 'layout-1', ...data })),
    };

    const module = await Test.createTestingModule({
      providers: [
        LayoutService,
        { provide: getRepositoryToken(Layout), useValue: layoutRepo },
      ],
    }).compile();

    service = module.get(LayoutService);
  });

  it('should get layout', async () => {
    layoutRepo.find.mockResolvedValue([
      {
        id: 'layout-1',
        objectType: 'customer',
        context: 'detail',
        isDefault: true,
        roleRestrictions: [],
        config: { sections: [] },
      },
    ]);

    const result = await service.getLayout('customer', 'detail', ['agent']);
    expect(result.id).toBe('layout-1');
  });

  it('should cache layout', async () => {
    layoutRepo.find.mockResolvedValue([
      { id: 'layout-1', objectType: 'customer', context: 'detail', roleRestrictions: [], config: {} },
    ]);

    await service.getLayout('customer', 'detail', ['agent']);
    await service.getLayout('customer', 'detail', ['agent']);

    expect(layoutRepo.find).toHaveBeenCalledTimes(1);
  });

  it('should create layout', async () => {
    const result = await service.createLayout('tenant-1', 'user-1', {
      objectType: 'customer',
      context: 'detail',
      name: 'Custom Layout',
      config: { sections: [] },
    });
    expect(result.id).toBe('layout-1');
  });

  it('should list layouts', async () => {
    layoutRepo.find.mockResolvedValue([
      { id: 'layout-1', objectType: 'customer' },
      { id: 'layout-2', objectType: 'ticket' },
    ]);

    const result = await service.listLayouts('tenant-1');
    expect(result).toHaveLength(2);
  });
});
