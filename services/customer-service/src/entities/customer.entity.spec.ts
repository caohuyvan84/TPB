import { DataSource, Repository } from 'typeorm';
import { Customer } from './customer.entity';
import { testDataSource } from './test-data-source';

describe('Customer Entity', () => {
  let dataSource: DataSource;
  let repository: Repository<Customer>;

  beforeAll(async () => {
    dataSource = await testDataSource.initialize();
    repository = dataSource.getRepository(Customer);
  });

  afterAll(async () => {
    await dataSource.destroy();
  });

  beforeEach(async () => {
    await repository.query('TRUNCATE TABLE customers RESTART IDENTITY CASCADE');
  });

  it('should create customer', async () => {
    const customer = repository.create({
      tenantId: '123e4567-e89b-12d3-a456-426614174000',
      cif: 'CIF001',
      fullName: 'John Doe',
      email: 'john@example.com',
      phone: '0123456789',
    });

    const saved = await repository.save(customer);

    expect(saved.id).toBeDefined();
    expect(saved.cif).toBe('CIF001');
    expect(saved.fullName).toBe('John Doe');
  });

  it('should enforce unique cif', async () => {
    await repository.save({
      tenantId: '123e4567-e89b-12d3-a456-426614174000',
      cif: 'CIF001',
      fullName: 'John Doe',
    });

    const duplicate = repository.create({
      tenantId: '123e4567-e89b-12d3-a456-426614174000',
      cif: 'CIF001',
      fullName: 'Jane Doe',
    });

    await expect(repository.save(duplicate)).rejects.toThrow();
  });
});
