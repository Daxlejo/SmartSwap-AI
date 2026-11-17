import {
  authed,
  createTestApp,
  registerUser,
  RegisteredUser,
  TestApp,
} from './support/test-app';
import { publishCycleItems, RouteBody } from './support/fixtures';

/**
 * The two ways to ask for one exact item: a 1-to-1 proposal to its owner, and a ring
 * of 3 or 4 people that must end with that item.
 */
describe('Direct proposal and rings toward a chosen item (e2e)', () => {
  let testApp: TestApp;
  let alex: RegisteredUser;
  let valeria: RegisteredUser;
  let mateo: RegisteredUser;
  let itemIds: { bikeId: string; cameraId: string; guitarId: string };

  beforeAll(async () => {
    testApp = await createTestApp();
    alex = await registerUser(testApp, 'Alex', 'Pasto, Colombia');
    valeria = await registerUser(testApp, 'Valeria', 'Medellín, Colombia');
    mateo = await registerUser(testApp, 'Mateo');
    itemIds = await publishCycleItems(testApp, { alex, valeria, mateo });
  }, 30000);

  afterAll(async () => {
    await testApp?.app.close();
  });

  it('returns only rings of 3 or more that give Alex the chosen camera', async () => {
    const response = await testApp
      .http()
      .post('/api/v1/routes/search')
      .set(authed(alex.token))
      .send({
        objectiveText: 'Cámara Fujifilm X-T30',
        offeredItemId: itemIds.bikeId,
        wantedItemId: itemIds.cameraId,
        minSteps: 3,
        maxSteps: 4,
      })
      .expect(200);

    const routes = response.body as RouteBody[];
    expect(routes.length).toBeGreaterThan(0);
    for (const route of routes) {
      expect(route.steps.length).toBeGreaterThanOrEqual(3);
      const alexStep = route.steps.find((step) => step.userId === alex.id);
      expect(alexStep?.receivesItemId).toBe(itemIds.cameraId);
    }
  });

  it('finds no ring when the chosen item is Alex own', async () => {
    const response = await testApp
      .http()
      .post('/api/v1/routes/search')
      .set(authed(alex.token))
      .send({
        objectiveText: 'Bicicleta',
        offeredItemId: itemIds.bikeId,
        wantedItemId: itemIds.bikeId,
      })
      .expect(200);
    expect(response.body).toEqual([]);
  });

  it('rejects a direct proposal for your own item or with an item that is not yours', async () => {
    await testApp
      .http()
      .post('/api/v1/routes/direct')
      .set(authed(alex.token))
      .send({ offeredItemId: itemIds.bikeId, wantedItemId: itemIds.bikeId })
      .expect(400);
    await testApp
      .http()
      .post('/api/v1/routes/direct')
      .set(authed(alex.token))
      .send({ offeredItemId: itemIds.guitarId, wantedItemId: itemIds.cameraId })
      .expect(403);
  });

  it('proposes the bike for the camera although Valeria wants a guitar, and tells her both items', async () => {
    const response = await testApp
      .http()
      .post('/api/v1/routes/direct')
      .set(authed(alex.token))
      .send({ offeredItemId: itemIds.bikeId, wantedItemId: itemIds.cameraId })
      .expect(201);
    const route = response.body as RouteBody;

    expect(route.status).toBe('PROPOSED');
    expect(route.steps).toEqual([
      expect.objectContaining({
        userId: alex.id,
        givesItemId: itemIds.bikeId,
        receivesItemId: itemIds.cameraId,
      }),
      expect.objectContaining({
        userId: valeria.id,
        givesItemId: itemIds.cameraId,
        receivesItemId: itemIds.bikeId,
      }),
    ]);

    const notifications = await testApp
      .http()
      .get('/api/v1/notifications')
      .set(authed(valeria.token))
      .expect(200);
    expect(notifications.body.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'ROUTE_PROPOSAL',
          routeId: route.id,
          badge: 'Propuesta directa',
        }),
      ]),
    );
  });

  it('refuses a second direct proposal over the locked bike', async () => {
    await testApp
      .http()
      .post('/api/v1/routes/direct')
      .set(authed(alex.token))
      .send({ offeredItemId: itemIds.bikeId, wantedItemId: itemIds.guitarId })
      .expect(409);
  });
});
