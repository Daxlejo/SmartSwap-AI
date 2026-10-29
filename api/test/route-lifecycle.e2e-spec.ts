import {
  authed,
  createTestApp,
  registerUser,
  RegisteredUser,
  TestApp,
} from './support/test-app';
import { publishCycleItems, RouteBody } from './support/fixtures';

describe('Route cancellation and expiry (e2e)', () => {
  let testApp: TestApp;
  let alex: RegisteredUser;
  let valeria: RegisteredUser;
  let mateo: RegisteredUser;
  let itemIds: { bikeId: string; cameraId: string; guitarId: string };

  const proposeCycle = async (): Promise<RouteBody> => {
    const response = await testApp
      .http()
      .post('/api/v1/routes/propose')
      .set(authed(alex.token))
      .send({
        objectiveText: 'Cámara Fujifilm X-T30',
        matchScore: 90,
        steps: [
          {
            stepOrder: 0,
            userId: alex.id,
            givesItemId: itemIds.bikeId,
            receivesItemId: itemIds.cameraId,
          },
          {
            stepOrder: 1,
            userId: valeria.id,
            givesItemId: itemIds.cameraId,
            receivesItemId: itemIds.guitarId,
          },
          {
            stepOrder: 2,
            userId: mateo.id,
            givesItemId: itemIds.guitarId,
            receivesItemId: itemIds.bikeId,
          },
        ],
      })
      .expect(201);
    return response.body as RouteBody;
  };

  const itemStatuses = () =>
    testApp.prisma
      .rows('item')
      .filter((item) => Object.values(itemIds).includes(item.id as string))
      .map((item) => item.status);

  beforeAll(async () => {
    testApp = await createTestApp();
    alex = await registerUser(testApp, 'Alex');
    valeria = await registerUser(testApp, 'Valeria');
    mateo = await registerUser(testApp, 'Mateo');
    itemIds = await publishCycleItems(testApp, { alex, valeria, mateo });
  }, 30000);

  afterAll(async () => {
    await testApp?.app.close();
  });

  it('rejects steps that do not close a cycle', async () => {
    await testApp
      .http()
      .post('/api/v1/routes/propose')
      .set(authed(alex.token))
      .send({
        objectiveText: 'Cámara',
        matchScore: 80,
        steps: [
          {
            stepOrder: 0,
            userId: alex.id,
            givesItemId: itemIds.bikeId,
            receivesItemId: itemIds.cameraId,
          },
          {
            stepOrder: 1,
            userId: valeria.id,
            givesItemId: itemIds.cameraId,
            receivesItemId: itemIds.cameraId,
          },
        ],
      })
      .expect(400);
  });

  it('only lets the initiator cancel, then unlocks the items', async () => {
    const route = await proposeCycle();

    await testApp
      .http()
      .post(`/api/v1/routes/${route.id}/cancel`)
      .set(authed(valeria.token))
      .expect(403);

    const cancelled = await testApp
      .http()
      .post(`/api/v1/routes/${route.id}/cancel`)
      .set(authed(alex.token))
      .expect(200);
    expect(cancelled.body.status).toBe('CANCELLED');
    expect(itemStatuses()).toEqual(['AVAILABLE', 'AVAILABLE', 'AVAILABLE']);

    await testApp
      .http()
      .post(`/api/v1/routes/${route.id}/cancel`)
      .set(authed(alex.token))
      .expect(409);
  });

  it('persists expiry and unlocks items when a participant answers too late', async () => {
    const route = await proposeCycle();
    testApp.prisma.expireRoute(route.id);

    await testApp
      .http()
      .post(`/api/v1/routes/${route.id}/respond`)
      .set(authed(valeria.token))
      .send({ decision: 'ACCEPTED' })
      .expect(409);

    expect(
      testApp.prisma.rows('swapRoute').find((r) => r.id === route.id)?.status,
    ).toBe('EXPIRED');
    expect(itemStatuses()).toEqual(['AVAILABLE', 'AVAILABLE', 'AVAILABLE']);
  });

  it('expires overdue proposals when the participants list their routes', async () => {
    const route = await proposeCycle();
    testApp.prisma.expireRoute(route.id);

    const list = await testApp
      .http()
      .get('/api/v1/routes')
      .set(authed(mateo.token))
      .expect(200);
    const listed = (list.body as RouteBody[]).find((r) => r.id === route.id);

    expect(listed?.status).toBe('EXPIRED');
    expect(itemStatuses()).toEqual(['AVAILABLE', 'AVAILABLE', 'AVAILABLE']);

    const notifications = await testApp
      .http()
      .get('/api/v1/notifications')
      .set(authed(valeria.token))
      .expect(200);
    expect(notifications.body.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: 'ROUTE_EXPIRED', routeId: route.id }),
      ]),
    );
  });
});
