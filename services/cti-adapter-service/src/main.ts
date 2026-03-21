import * as path from 'path';
import * as fs from 'fs';

// Selectively load VAPID keys from root .env (without dotenv auto-inject that overrides DB vars)
try {
  const envContent = fs.readFileSync(path.resolve(process.cwd(), '.env'), 'utf8');
  for (const line of envContent.split('\n')) {
    const match = line.match(/^(VAPID_\w+)=(.+)$/);
    if (match && !process.env[match[1]]) {
      process.env[match[1]] = match[2].trim();
    }
  }
} catch { /* .env not found — VAPID vars must be set in shell */ }

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api/v1');
  app.enableCors();
  await app.listen(process.env['PORT'] || 3019);
  console.log('CTI Adapter Service running on port 3019');
}

bootstrap();
