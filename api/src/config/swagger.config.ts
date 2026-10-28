import { DocumentBuilder, OpenAPIObject } from '@nestjs/swagger';

export const API_VERSION = '2.4.0';

/** Shared by the runtime Swagger UI (main.ts) and the contract generator (scripts/openapi.ts). */
export const buildSwaggerConfig = (): Omit<OpenAPIObject, 'paths'> =>
  new DocumentBuilder()
    .setTitle('SmartSwap API')
    .setDescription('SmartSwap circular bartering platform backend API')
    .setVersion(API_VERSION)
    .addServer('http://localhost:3000', 'Local development')
    .addServer('https://smartswap-api.onrender.com', 'Production (Render)')
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
