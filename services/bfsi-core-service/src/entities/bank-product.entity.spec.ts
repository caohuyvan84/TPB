import { Repository } from 'typeorm';
import { BankProduct } from './bank-product.entity';
import { testDataSource } from './test-data-source';

describe('BankProduct Entity', () => {
  let repo: Repository<BankProduct>;

  beforeAll(async () => {
    if (!testDataSource.isInitialized) {
      await testDataSource.initialize();
    }
    repo = testDataSource.getRepository(BankProduct);
  });

  afterAll(async () => {
    if (testDataSource.isInitialized) {
      await testDataSource.destroy();
    }
  });

  beforeEach(async () => {
    await repo.query('TRUNCATE TABLE bank_products RESTART IDENTITY CASCADE');
  });

  it('should create a bank product', async () => {
    const product = repo.create({
      tenantId: '123e4567-e89b-12d3-a456-426614174000',
      customerId: '123e4567-e89b-12d3-a456-426614174001',
      type: 'account',
      accountNumber: '1234567890',
      balance: 1000000.50,
      status: 'active',
    });

    const saved = await repo.save(product);

    expect(saved.id).toBeDefined();
    expect(saved.type).toBe('account');
    expect(saved.balance).toBe(1000000.50);
    expect(saved.currency).toBe('VND');
  });

  it('should store dynamic fields', async () => {
    const product = repo.create({
      tenantId: '123e4567-e89b-12d3-a456-426614174000',
      customerId: '123e4567-e89b-12d3-a456-426614174001',
      type: 'loan',
      dynamicFields: { loanType: 'personal', interestRate: 8.5 },
    });

    const saved = await repo.save(product);

    expect(saved.dynamicFields).toEqual({ loanType: 'personal', interestRate: 8.5 });
  });

  it('should support multiple product types', async () => {
    const types = ['account', 'savings', 'loan', 'card'];
    
    for (const type of types) {
      const product = repo.create({
        tenantId: '123e4567-e89b-12d3-a456-426614174000',
        customerId: '123e4567-e89b-12d3-a456-426614174001',
        type,
      });
      await repo.save(product);
    }

    const count = await repo.count();
    expect(count).toBe(4);
  });
});
