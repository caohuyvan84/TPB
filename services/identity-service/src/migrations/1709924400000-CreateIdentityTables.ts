import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

export class CreateIdentityTables1709924400000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create users table
    await queryRunner.createTable(
      new Table({
        name: 'users',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'gen_random_uuid()',
          },
          {
            name: 'username',
            type: 'varchar',
            isUnique: true,
            isNullable: false,
          },
          {
            name: 'email',
            type: 'varchar',
            isUnique: true,
            isNullable: false,
          },
          {
            name: 'password_hash',
            type: 'varchar',
            isNullable: false,
          },
          {
            name: 'full_name',
            type: 'varchar',
            isNullable: false,
          },
          {
            name: 'agent_id',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'is_active',
            type: 'boolean',
            default: true,
          },
          {
            name: 'mfa_enabled',
            type: 'boolean',
            default: false,
          },
          {
            name: 'mfa_secret',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'last_login_at',
            type: 'timestamptz',
            isNullable: true,
          },
          {
            name: 'failed_login_attempts',
            type: 'integer',
            default: 0,
          },
          {
            name: 'locked_until',
            type: 'timestamptz',
            isNullable: true,
          },
          {
            name: 'tenant_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'created_at',
            type: 'timestamptz',
            default: 'NOW()',
          },
          {
            name: 'updated_at',
            type: 'timestamptz',
            default: 'NOW()',
          },
        ],
      }),
      true
    );

    // Create roles table
    await queryRunner.createTable(
      new Table({
        name: 'roles',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'gen_random_uuid()',
          },
          {
            name: 'name',
            type: 'varchar',
            isUnique: true,
            isNullable: false,
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'permissions',
            type: 'jsonb',
            default: "'[]'",
          },
          {
            name: 'tenant_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'created_at',
            type: 'timestamptz',
            default: 'NOW()',
          },
          {
            name: 'updated_at',
            type: 'timestamptz',
            default: 'NOW()',
          },
        ],
      }),
      true
    );

    // Create user_roles junction table
    await queryRunner.createTable(
      new Table({
        name: 'user_roles',
        columns: [
          {
            name: 'user_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'role_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'assigned_at',
            type: 'timestamptz',
            default: 'NOW()',
          },
        ],
      }),
      true
    );

    // Create refresh_tokens table
    await queryRunner.createTable(
      new Table({
        name: 'refresh_tokens',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'gen_random_uuid()',
          },
          {
            name: 'user_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'token_hash',
            type: 'varchar',
            isNullable: false,
          },
          {
            name: 'ip_address',
            type: 'inet',
            isNullable: true,
          },
          {
            name: 'user_agent',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'expires_at',
            type: 'timestamptz',
            isNullable: false,
          },
          {
            name: 'revoked',
            type: 'boolean',
            default: false,
          },
          {
            name: 'created_at',
            type: 'timestamptz',
            default: 'NOW()',
          },
        ],
      }),
      true
    );

    // Create login_attempts table
    await queryRunner.createTable(
      new Table({
        name: 'login_attempts',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'gen_random_uuid()',
          },
          {
            name: 'user_id',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'username',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'ip_address',
            type: 'inet',
            isNullable: true,
          },
          {
            name: 'user_agent',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'success',
            type: 'boolean',
            isNullable: false,
          },
          {
            name: 'failure_reason',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'attempted_at',
            type: 'timestamptz',
            default: 'NOW()',
          },
        ],
      }),
      true
    );

    // Create indexes
    await queryRunner.createIndex(
      'users',
      new TableIndex({
        name: 'idx_users_username',
        columnNames: ['username'],
      })
    );

    await queryRunner.createIndex(
      'users',
      new TableIndex({
        name: 'idx_users_email',
        columnNames: ['email'],
      })
    );

    await queryRunner.createIndex(
      'users',
      new TableIndex({
        name: 'idx_users_agent_id',
        columnNames: ['agent_id'],
      })
    );

    await queryRunner.createIndex(
      'users',
      new TableIndex({
        name: 'idx_users_tenant',
        columnNames: ['tenant_id'],
      })
    );

    await queryRunner.createIndex(
      'refresh_tokens',
      new TableIndex({
        name: 'idx_refresh_tokens_user',
        columnNames: ['user_id'],
      })
    );

    await queryRunner.createIndex(
      'refresh_tokens',
      new TableIndex({
        name: 'idx_refresh_tokens_hash',
        columnNames: ['token_hash'],
      })
    );

    await queryRunner.createIndex(
      'login_attempts',
      new TableIndex({
        name: 'idx_login_attempts_user',
        columnNames: ['user_id'],
      })
    );

    await queryRunner.createIndex(
      'login_attempts',
      new TableIndex({
        name: 'idx_login_attempts_time',
        columnNames: ['attempted_at'],
      })
    );

    // Create foreign keys
    await queryRunner.createForeignKey(
      'user_roles',
      new TableForeignKey({
        columnNames: ['user_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE',
      })
    );

    await queryRunner.createForeignKey(
      'user_roles',
      new TableForeignKey({
        columnNames: ['role_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'roles',
        onDelete: 'CASCADE',
      })
    );

    await queryRunner.createForeignKey(
      'refresh_tokens',
      new TableForeignKey({
        columnNames: ['user_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE',
      })
    );

    await queryRunner.createForeignKey(
      'login_attempts',
      new TableForeignKey({
        columnNames: ['user_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'CASCADE',
      })
    );

    // Add primary key constraint to user_roles
    await queryRunner.query(
      'ALTER TABLE user_roles ADD PRIMARY KEY (user_id, role_id)'
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('login_attempts');
    await queryRunner.dropTable('refresh_tokens');
    await queryRunner.dropTable('user_roles');
    await queryRunner.dropTable('roles');
    await queryRunner.dropTable('users');
  }
}
