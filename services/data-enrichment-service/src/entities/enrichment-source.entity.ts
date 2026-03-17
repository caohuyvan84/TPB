import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('enrichment_sources')
export class EnrichmentSource {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  tenantId!: string;

  @Column()
  name!: string;

  @Column()
  type!: string;

  @Column()
  endpoint!: string;

  @Column('jsonb')
  authConfig!: object;

  @Column('jsonb')
  fieldMappings!: object;

  @Column({ default: 5000 })
  timeoutMs!: number;

  @Column({ default: 300 })
  cacheTtlSeconds!: number;

  @Column({ default: true })
  isActive!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
