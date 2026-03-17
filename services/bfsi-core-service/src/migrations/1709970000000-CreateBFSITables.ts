import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateBFSITables1709970000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE bank_products (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        customer_id UUID NOT NULL,
        type TEXT NOT NULL,
        account_number TEXT,
        balance DECIMAL(20,2),
        status TEXT,
        currency TEXT DEFAULT 'VND',
        opened_at TIMESTAMPTZ,
        dynamic_fields JSONB DEFAULT '{}',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await queryRunner.query(`CREATE INDEX idx_bank_products_customer ON bank_products(customer_id)`);
    await queryRunner.query(`CREATE INDEX idx_bank_products_type ON bank_products(type)`);
    await queryRunner.query(`CREATE INDEX idx_bank_products_tenant ON bank_products(tenant_id)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE bank_products`);
  }
}
