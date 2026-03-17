import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BFSIModule } from './bfsi/bfsi.module';
import { BankProduct } from './entities';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env['POSTGRES_HOST'] || 'localhost',
      port: parseInt(process.env['POSTGRES_PORT'] || '5432'),
      username: process.env['POSTGRES_USER'] || 'postgres',
      password: process.env['POSTGRES_PASSWORD'] || 'postgres',
      database: process.env['DB_BFSI'] || 'bfsi_db',
      entities: [BankProduct],
      synchronize: false,
      logging: false,
    }),
    BFSIModule,
  ],
})
export class AppModule {}
