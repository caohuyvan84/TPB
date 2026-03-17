import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api/v1');
  
  app.useGlobalPipes(new ValidationPipe({ transform: true, transformOptions: { enableImplicitConversion: true } }));
  app.enableCors();

  const port = process.env['PORT'] || 3007;
  await app.listen(port);
  
  console.log(`Knowledge Service running on port ${port}`);
}

bootstrap();
