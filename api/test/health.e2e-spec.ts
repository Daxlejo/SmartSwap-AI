import { createTestApp, TestApp } from './support/test-app';

describe('HealthController (e2e)', () => {
  let testApp: TestApp;

  beforeAll(async () => {
    // In-memory database: the suite never touches the DATABASE_URL from .env
    testApp = await createTestApp();
  }, 30000);

  afterAll(async () => {
    await testApp?.app.close();
  }, 10000);

  it('GET /api/v1/health returns 200 with health metadata envelope', async () => {
    const response = await testApp.http().get('/api/v1/health').expect(200);

    expect(response.body.status).toBe('ok');
    expect(response.body.db).toBe('connected');
    expect(typeof response.body.uptime).toBe('number');
    expect(typeof response.body.timestamp).toBe('string');
    expect(response.body.version).toBe('2.4.0');
  }, 15000);
});
