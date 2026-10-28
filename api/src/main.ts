import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Base64 photos (upload-image, analyze-photo) exceed Express's 100kb default body limit
  app.useBodyParser('json', { limit: '10mb' });

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT') ?? 3000;
  const corsOrigin = configService.get<string>('CORS_ORIGIN') ?? '*';

  // Security headers via Helmet
  app.use(helmet());

  // Configurable Cross-Origin Resource Sharing
  app.enableCors({
    origin:
      corsOrigin === '*'
        ? true
        : corsOrigin.split(',').map((origin) => origin.trim()),
    credentials: true,
  });

  // Global Exception Envelope
  app.useGlobalFilters(new AllExceptionsFilter());

  // Global API Versioning Prefix
  app.setGlobalPrefix('api/v1');

  // OpenAPI / Swagger Documentation served at /api/docs
  const swaggerConfig = new DocumentBuilder()
    .setTitle('SmartSwap API')
    .setDescription('SmartSwap circular bartering platform backend API')
    .setVersion('2.4.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'Authorization',
        description: 'Enter your JWT bearer token',
        in: 'header',
      },
      'bearerAuth',
    )
    .addTag('Health', 'Service health and readiness probes')
    .addTag('Auth', 'Authentication and authorization')
    .addTag('Users', 'User accounts and profile management')
    .addTag('Items', 'Catalog and inventory management')
    .addTag('Routes', 'Circular multi-step swap route engine')
    .addTag('AI', 'AI embeddings, matching, and explanations')
    .addTag('Notifications', 'User notification center')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document, {
    useGlobalPrefix: false,
  });

  await app.listen(port);
  logger.log(`SmartSwap API is running on: http://localhost:${port}/api/v1`);
  logger.log(
    `Swagger documentation available at: http://localhost:${port}/api/docs`,
  );
}

bootstrap();
