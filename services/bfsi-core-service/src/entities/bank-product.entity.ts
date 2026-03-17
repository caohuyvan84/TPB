import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('bank_products')
export class BankProduct {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string;

  @Column({ name: 'customer_id', type: 'uuid' })
  customerId!: string;

  @Column()
  type!: string; // account, savings, loan, card, digital_banking, payments, investments, merchant_services

  @Column({ name: 'account_number', type: 'text', nullable: true })
  accountNumber!: string | null; // Encrypted at rest

  @Column({ type: 'decimal', precision: 20, scale: 2, nullable: true })
  balance!: number | null; // Encrypted at rest

  @Column({ type: 'text', nullable: true })
  status!: string | null;

  @Column({ default: 'VND' })
  currency!: string;

  @Column({ name: 'opened_at', type: 'timestamptz', nullable: true })
  openedAt!: Date | null;

  @Column({ name: 'dynamic_fields', type: 'jsonb', default: '{}' })
  dynamicFields!: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
