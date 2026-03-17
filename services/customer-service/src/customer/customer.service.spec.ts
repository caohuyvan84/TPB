import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CustomerService } from './customer.service';
import { Customer, CustomerNote } from '../entities';

describe('CustomerService', () => {
  let service: CustomerService;
  let mockCustomerRepo: any;
  let mockNoteRepo: any;

  beforeEach(async () => {
    mockCustomerRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
    };

    mockNoteRepo = {
      find: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CustomerService,
        {
          provide: getRepositoryToken(Customer),
          useValue: mockCustomerRepo,
        },
        {
          provide: getRepositoryToken(CustomerNote),
          useValue: mockNoteRepo,
        },
      ],
    }).compile();

    service = module.get<CustomerService>(CustomerService);
  });

  describe('searchCustomers', () => {
    it('should return all customers when no query', async () => {
      const customers = [
        { id: '1', cif: 'CIF001', fullName: 'John Doe' },
        { id: '2', cif: 'CIF002', fullName: 'Jane Doe' },
      ];

      mockCustomerRepo.find.mockResolvedValue(customers);

      const result = await service.searchCustomers();

      expect(result).toHaveLength(2);
    });

    it('should search customers by query', async () => {
      mockCustomerRepo.find.mockResolvedValue([]);

      await service.searchCustomers('John');

      expect(mockCustomerRepo.find).toHaveBeenCalled();
    });
  });

  describe('getCustomer', () => {
    it('should return customer by id', async () => {
      const customer = { id: '1', cif: 'CIF001', fullName: 'John Doe' };

      mockCustomerRepo.findOne.mockResolvedValue(customer);

      const result = await service.getCustomer('1');

      expect(result).toEqual(customer);
    });

    it('should throw NotFoundException if not found', async () => {
      mockCustomerRepo.findOne.mockResolvedValue(null);

      await expect(service.getCustomer('1')).rejects.toThrow(
        'Customer not found',
      );
    });
  });

  describe('addNote', () => {
    it('should add note to customer', async () => {
      const note = {
        id: 'note-1',
        customerId: '1',
        content: 'Test note',
      };

      mockNoteRepo.create.mockReturnValue(note);
      mockNoteRepo.save.mockResolvedValue(note);

      const result = await service.addNote(
        '1',
        'agent-1',
        'John Doe',
        'Test note',
      );

      expect(result.content).toBe('Test note');
    });
  });
});
