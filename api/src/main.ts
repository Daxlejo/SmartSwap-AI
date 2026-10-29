import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { buildSwaggerConfig } from './config/swagger.config';

// Origins used by the Capacitor WebView; allowed even when CORS_ORIGIN is restricted.
const CAPACITOR_ORIGINS = ['https://localhost', 'capacitor://localhost', 'http://localhost'];

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
        : [
            ...corsOrigin.split(',').map((origin) => origin.trim()),
            // The Capacitor WebView of the Android/iOS app always sends one of these origins
            ...CAPACITOR_ORIGINS,
          ],
    credentials: true,
  });

  // Global Exception Envelope
  app.useGlobalFilters(new AllExceptionsFilter());

  // Global API Versioning Prefix
  app.setGlobalPrefix('api/v1');

  // OpenAPI / Swagger Documentation served at /api/docs
  const swaggerConfig = buildSwaggerConfig();

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
