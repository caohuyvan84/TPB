import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index, ManyToOne, JoinColumn } from 'typeorm';
import { ObjectType } from './object-type.entity';

@Entity('field_definitions')
export class FieldDefinition {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'object_type_id', type: 'uuid' })
  @Index()
  objectTypeId!: string;

  @ManyToOne(() => ObjectType)
  @JoinColumn({ name: 'object_type_id' })
  objectType?: ObjectType;

  @Column()
  name!: string;

  @Column({ name: 'display_name' })
  displayName!: string;

  @Column({ name: 'field_type' })
  fieldType!: string;

  @Column({ name: 'data_source', default: 'local' })
  dataSource!: string;

  @Column({ name: 'enrichment_source_id', type: 'uuid', nullable: true })
  enrichmentSourceId?: string;

  @Column({ name: 'is_required', default: false })
  isRequired!: boolean;

  @Column({ name: 'is_read_only', default: false })
  isReadOnly!: boolean;

  @Column({ name: 'is_searchable', default: false })
  isSearchable!: boolean;

  @Column({ name: 'is_sortable', default: false })
  isSortable!: boolean;

  @Column({ name: 'is_filterable', default: false })
  isFilterable!: boolean;

  @Column({ name: 'is_sensitive', default: false })
  isSensitive!: boolean;

  @Column({ name: 'is_unique', default: false })
  isUnique!: boolean;

  @Column({ name: 'default_value', type: 'jsonb', nullable: true })
  defaultValue?: any;

  @Column({ name: 'validation_rules', type: 'jsonb', default: [] })
  validationRules!: any[];

  @Column({ name: 'display_config', type: 'jsonb', default: {} })
  displayConfig!: Record<string, any>;

  @Column({ name: 'sort_order', default: 0 })
  sortOrder!: number;

  @Column({ name: 'group_name', nullable: true })
  groupName?: string;

  @Column({ name: 'is_core', default: false })
  isCore!: boolean;

  @Column({ name: 'is_active', default: true })
  isActive!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
