import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { GlobalHttpExceptionFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT', 4000);
  const corsOrigin = configService.get<string>(
    'CORS_ORIGIN',
    'http://localhost:3000',
  );

  // Global Routing Prefix
  app.setGlobalPrefix('api/v1', {
    exclude: ['health', 'api/health'],
  });

  // Enable CORS
  app.enableCors({
    origin: [corsOrigin, 'http://localhost:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Idempotency-Key'],
  });

  // Global Validation Pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Global Exception Filter
  app.useGlobalFilters(new GlobalHttpExceptionFilter());

  // Global Performance Logging Interceptor
  app.useGlobalInterceptors(new LoggingInterceptor());

  await app.listen(port);
  logger.log(`🚀 REST API Server running at: http://localhost:${port}/api/v1`);
  logger.log(`🩺 Health check accessible at: http://localhost:${port}/health`);
}

bootstrap();
