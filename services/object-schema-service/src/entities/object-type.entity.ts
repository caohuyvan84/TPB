import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('object_types')
export class ObjectType {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  @Index()
  tenantId!: string;

  @Column({ unique: true })
  name!: string;

  @Column({ name: 'display_name' })
  displayName!: string;

  @Column({ name: 'display_name_plural' })
  displayNamePlural!: string;

  @Column({ type: 'text', nullable: true })
  icon?: string;

  @Column({ type: 'integer', default: 1 })
  version!: number;

  @Column({ name: 'is_system', default: false })
  isSystem!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
