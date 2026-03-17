import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCustomerTables1709951000000 implements MigrationInterface {
  name = 'CreateCustomerTables1709951000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE customers (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        cif TEXT UNIQUE NOT NULL,
        full_name TEXT NOT NULL,
        email TEXT,
        phone TEXT,
        segment TEXT,
        is_vip BOOLEAN DEFAULT false,
        avatar_url TEXT,
        satisfaction_rating INTEGER,
        dynamic_fields JSONB DEFAULT '{}',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await queryRunner.query(`CREATE INDEX idx_customers_cif ON customers(cif)`);
    await queryRunner.query(`CREATE INDEX idx_customers_tenant ON customers(tenant_id)`);

    await queryRunner.query(`
      CREATE TABLE customer_notes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
        agent_id UUID NOT NULL,
        agent_name TEXT NOT NULL,
        content TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await queryRunner.query(`CREATE INDEX idx_customer_notes_customer ON customer_notes(customer_id)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS customer_notes CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS customers CASCADE`);
  }
}
