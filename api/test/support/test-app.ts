import { Test } from '@nestjs/testing';
import { NestExpressApplication } from '@nestjs/platform-express';
import * as request from 'supertest';
import { PrismaService } from '../../src/prisma/prisma.service';
import { InMemoryPrisma } from './in-memory-prisma';

// Placeholder key: OpenAiClientService switches to its deterministic fallback, so no network calls.
// process.env takes precedence over the .env file loaded by ConfigModule.
process.env.OPENAI_API_KEY = 'sk-mock-e2e-openai-placeholder-key';
process.env.NODE_ENV = 'test';

// Imported after the env overrides so ConfigModule validates the test values.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { AppModule } =
  require('../../src/app.module') as typeof import('../../src/app.module');

export interface TestApp {
  app: NestExpressApplication;
  prisma: InMemoryPrisma;
  http: () => ReturnType<typeof request>;
}

/** Boots the real AppModule (guards, pipes, filters, services) over the in-memory database. */
export const createTestApp = async (): Promise<TestApp> => {
  const prisma = new InMemoryPrisma();
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(PrismaService)
    .useValue(prisma)
    .compile();

  const app = moduleRef.createNestApplication<NestExpressApplication>({
    logger: false,
  });
  app.useBodyParser('json', { limit: '10mb' });
  app.setGlobalPrefix('api/v1');
  await app.init();

  return { app, prisma, http: () => request(app.getHttpServer()) };
};

export interface RegisteredUser {
  id: string;
  token: string;
  email: string;
}

export const registerUser = async (
  testApp: TestApp,
  name: string,
  location = 'Bogotá, Colombia',
): Promise<RegisteredUser> => {
  const email = `${name.toLowerCase()}@e2e.smartswap.co`;
  const response = await testApp
    .http()
    .post('/api/v1/auth/register')
    .send({ email, password: 'E2eTestPass!2026', name, location })
    .expect(201);

  return { id: response.body.user.id, token: response.body.accessToken, email };
};

export const authed = (token: string) => ({ Authorization: `Bearer ${token}` });
